/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in browser tests: real shared UI, isolated transport fixtures, no Supabase writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
if (!process.env.CHAT_BROWSER_TOOLS) {
  console.log(
    "Chat browser checks skipped: set CHAT_BROWSER_TOOLS to a temporary node_modules containing playwright and esbuild.",
  );
  process.exit(0);
}
const { chromium } = require(
  path.join(process.env.CHAT_BROWSER_TOOLS, "playwright"),
);
const esbuild = require(path.join(process.env.CHAT_BROWSER_TOOLS, "esbuild"));
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const conversation = uid(900),
  customer = uid(901),
  provider = uid(902);
let sequence = 60,
  clock = Date.now(),
  lost = false;
let starts = 0;
const state = {
  customer: { archived: false, hidden: false, muted: false, read: 0 },
  provider: { archived: false, hidden: false, muted: false, read: 0 },
};
const messages = Array.from({ length: 60 }, (_, index) => ({
  id: uid(index + 1),
  seq: index + 1,
  conversation_id: conversation,
  sender_id: customer,
  client_id: uid(index + 1000),
  body: `Earlier message ${index + 1}`,
  created_at: new Date(clock - 3600000 + index).toISOString(),
  updated_at: new Date(clock - 3600000 + index).toISOString(),
  edited_at: null,
  deleted_at: null,
}));
const stamp = () =>
  new Date((clock = Math.max(Date.now(), clock + 1))).toISOString();
const add = (body, sender_id, client_id) => {
  const now = stamp();
  const message = {
    id: uid(++sequence),
    seq: sequence,
    conversation_id: conversation,
    sender_id,
    client_id,
    body,
    created_at: now,
    updated_at: now,
    edited_at: null,
    deleted_at: null,
  };
  messages.push(message);
  for (const row of Object.values(state)) {
    row.hidden = false;
    row.archived = false;
  }
  return message;
};
(async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "aspen-chat-browser-"),
  );
  const controls = `import React from 'react';
    const router={replace(url){history.replaceState(null,'',url)},push(url){history.pushState(null,'',url)}};
    export const useRouter=()=>router;
    export default function Link({children,fill,unoptimized,...props}){return React.createElement(props.src?'img':'a',props,children)}
    export const chatAction=async(command)=>{const response=await fetch('/test-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});return response.json()};
    const channels=new Set();window.emitChat=(status)=>{for(const channel of channels){if(status)channel.status(status);else channel.callbacks.forEach(fn=>fn())}};
    export const getSupabaseBrowserClient=()=>({channel(){const channel={callbacks:[],on(type,filter,callback){this.callbacks.push(callback);return this},subscribe(callback){this.status=callback;channels.add(this);setTimeout(()=>callback('SUBSCRIBED'),0);return this}};return channel},removeChannel(channel){channels.delete(channel);return Promise.resolve()}});`;
  await esbuild.build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ChatView} from './src/features/chats/components/chat-view';const role=window.fixtureRole;const start=new URLSearchParams(location.search).has('start');createRoot(document.getElementById('root')).render(<React.StrictMode><div className="mx-auto max-w-6xl p-4"><ChatView role={role} userId={role==='customer'?'${customer}':'${provider}'} initialBusiness={start?'fixture-clinic':undefined} initialConversation={start?undefined:'${conversation}'} /></div></React.StrictMode>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    outfile: path.join(directory, "app.js"),
    bundle: true,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "transport-fixtures",
        setup(build) {
          build.onResolve(
            {
              filter:
                /^(next\/navigation|next\/link|next\/image|@\/lib\/supabase\/browser-client)$|\/api\/actions$/,
            },
            () => ({ path: "fixture-controls", namespace: "fixture" }),
          );
          build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: controls,
            loader: "js",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  const cssRoot = path.join(process.cwd(), ".next", "static", "css");
  const css = fs.existsSync(cssRoot)
    ? fs
        .readdirSync(cssRoot, { recursive: true })
        .filter((file) => file.endsWith(".css"))
        .map((file) => fs.readFileSync(path.join(cssRoot, file), "utf8"))
        .join("\n")
    : "";
  assert.ok(
    css.length,
    "Run npm run build before browser checks so production Tailwind styles are available.",
  );
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const role =
        req.headers["x-test-role"] === "provider" ? "provider" : "customer";
      const actor = role === "provider" ? provider : customer;
      const other = role === "provider" ? "customer" : "provider";
      const json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };
      if (url.pathname === "/app.js") {
        res.setHeader("Content-Type", "application/javascript");
        return res.end(fs.readFileSync(path.join(directory, "app.js")));
      }
      if (url.pathname === "/app.css") {
        res.setHeader("Content-Type", "text/css");
        return res.end(css);
      }
      if (url.pathname === "/test-actions") {
        let body = "";
        for await (const part of req) body += part;
        const command = JSON.parse(body);
        if (command.action === "start") {
          starts++;
          return json({ ok: true, conversation });
        }
        if (command.action === "send") {
          const message =
            messages.find((item) => item.client_id === command.clientId) ??
            add(command.body, actor, command.clientId);
          if (command.body === "Retry after interrupted response" && !lost) {
            lost = true;
            res.statusCode = 503;
            return res.end("Simulated lost action response after commit");
          }
          return json({ ok: true, message });
        }
        if (command.action === "read")
          state[role].read = Math.max(state[role].read, command.seq);
        if (command.action === "preferences")
          Object.assign(state[role], command);
        if (command.action === "edit" || command.action === "delete") {
          const message = messages.find((item) => item.id === command.message);
          message.updated_at = stamp();
          if (command.action === "edit") {
            message.body = command.body;
            message.edited_at = message.updated_at;
          } else {
            message.body = "";
            message.deleted_at = message.updated_at;
          }
          return json({ ok: true, message });
        }
        return json({ ok: true });
      }
      if (url.pathname === "/api/chats") {
        const q = url.searchParams;
        const detail = {
          id: conversation,
          business_id: uid(800),
          business_slug: "fixture-clinic",
          name: role === "customer" ? "Fixture Pet Clinic" : "Avery Chen",
          photo_id: null,
          preview: messages.at(-1).deleted_at
            ? "Message deleted"
            : messages.at(-1).body,
          last_activity_at: messages.at(-1).created_at,
          unread_count: messages.filter(
            (item) =>
              item.seq > state[role].read &&
              item.sender_id !== actor &&
              !item.deleted_at,
          ).length,
          muted: state[role].muted,
          archived: state[role].archived,
          participant_role: role,
        };
        if (q.get("op") === "detail") return json(detail);
        if (q.get("op") === "inbox")
          return json({
            items:
              !state[role].hidden &&
              state[role].archived === (q.get("archived") === "true")
                ? [detail]
                : [],
            next: null,
          });
        if (q.get("op") === "history") {
          const eligible = messages.filter(
              (item) => !q.get("before") || item.seq < Number(q.get("before")),
            ),
            page = eligible.slice(-50);
          return json({
            messages: page,
            before: eligible.length > 50 ? page[0].seq : null,
            watermark: stamp(),
            recipientRead: state[other].read,
          });
        }
        const page = messages
          .filter(
            (item) =>
              item.updated_at > q.get("at") ||
              (item.updated_at === q.get("at") &&
                item.seq > Number(q.get("seq"))),
          )
          .sort(
            (a, b) => a.updated_at.localeCompare(b.updated_at) || a.seq - b.seq,
          )
          .slice(0, 100);
        const last = page.at(-1);
        return json({
          messages: page,
          more: false,
          cursor: last
            ? { at: last.updated_at, seq: last.seq }
            : { at: q.get("at"), seq: Number(q.get("seq")) },
          recipientRead: state[other].read,
        });
      }
      res.setHeader("Content-Type", "text/html");
      res.end(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script>window.fixtureRole=${JSON.stringify(role)}</script><script src="/app.js"></script></body></html>`,
      );
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.CHAT_BROWSER_EXECUTABLE ||
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const customerContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: { "x-test-role": "customer" },
    });
    const providerContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: { "x-test-role": "provider" },
    });
    const page = await customerContext.newPage(),
      tenant = await providerContext.newPage();
    page.setDefaultTimeout(15000);
    tenant.setDefaultTimeout(15000);
    const errors = [];
    for (const view of [page, tenant])
      view.on("pageerror", (error) => errors.push(error.message));
    // Hold real UI requests so cold loading and refresh behavior are observable.
    let releaseInbox, releaseHistory;
    const inboxGate = new Promise((resolve) => {
      releaseInbox = resolve;
    });
    const historyGate = new Promise((resolve) => {
      releaseHistory = resolve;
    });
    await page.route("**/api/chats?*", async (route) => {
      const op = new URL(route.request().url()).searchParams.get("op");
      if (op === "inbox") await inboxGate;
      if (op === "history") await historyGate;
      await route.continue();
    });
    await page.goto(`${base}?start`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("status", { name: "Loading conversations", exact: true })
      .waitFor();
    await page
      .getByRole("status", { name: "Loading messages", exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("No conversations yet", { exact: true }).count(),
      0,
    );
    await page.screenshot({
      path: path.join(directory, "desktop-loading.png"),
      fullPage: true,
    });
    releaseInbox();
    releaseHistory();
    await page
      .getByLabel("Message history")
      .getByText("Earlier message 60", { exact: true })
      .waitFor();
    await page.unrouteAll({ behavior: "wait" });
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });
    let refreshStarted;
    const requested = new Promise((resolve) => {
      refreshStarted = resolve;
    });
    await page.route("**/api/chats?*", async (route) => {
      refreshStarted();
      await refreshGate;
      await route.continue();
    });
    await page.evaluate(() => window.emitChat());
    await requested;
    assert.equal(
      await page
        .getByRole("status", { name: /^Loading (messages|conversations)$/ })
        .count(),
      0,
    );
    assert.ok(
      await page
        .getByLabel("Message history")
        .getByText("Earlier message 60", { exact: true })
        .isVisible(),
    );
    releaseRefresh();
    await page.unrouteAll({ behavior: "wait" });
    assert.equal(
      starts,
      1,
      "Opening a business thread must not duplicate mutations under Strict Mode",
    );
    await page.getByRole("button", { name: "Load older messages" }).click();
    await page.getByText("Earlier message 1", { exact: true }).waitFor();
    const history = page.getByLabel("Message history");
    await history.evaluate((node) => {
      node.scrollTop = 80;
      node.dispatchEvent(new Event("scroll"));
    });
    add("A new provider reply", provider, uid(2000));
    await page.evaluate(() => window.emitChat());
    await page.getByRole("button", { name: "New messages" }).waitFor();
    assert.ok(await history.evaluate((node) => node.scrollTop < 200));
    await page.getByRole("button", { name: "New messages" }).click();
    await page
      .getByRole("textbox", { name: "Message Fixture Pet Clinic" })
      .fill("Retry after interrupted response");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page.getByRole("button", { name: "Retry message" }).click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector("form")
          ?.textContent.includes("Retry the pending"),
    );
    assert.equal(
      messages.filter(
        (item) => item.body === "Retry after interrupted response",
      ).length,
      1,
    );
    await tenant.goto(base);
    await tenant
      .getByLabel("Message history")
      .getByText("Retry after interrupted response", { exact: true })
      .waitFor();
    await tenant
      .getByRole("textbox", { name: "Message Avery Chen" })
      .fill("Your appointment questions are welcome.");
    await tenant
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await tenant
      .getByLabel("Message history")
      .getByText("Your appointment questions are welcome.", { exact: true })
      .waitFor();
    await page.evaluate(() => window.emitChat("CHANNEL_ERROR"));
    await page.evaluate(() => window.emitChat("SUBSCRIBED"));
    await page
      .getByLabel("Message history")
      .getByText("Your appointment questions are welcome.", { exact: true })
      .waitFor();
    await tenant
      .getByRole("button", { name: "Message options" })
      .last()
      .click();
    await tenant
      .getByRole("menuitem", { name: "Edit message", exact: true })
      .click();
    await tenant
      .getByRole("textbox", { name: "Message text" })
      .fill("Updated provider reply");
    await tenant.getByRole("button", { name: "Save changes" }).click();
    await tenant
      .getByLabel("Message history")
      .getByText("Updated provider reply", { exact: true })
      .waitFor();
    await page.evaluate(() => window.emitChat());
    await page
      .getByLabel("Message history")
      .getByText("Updated provider reply", { exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(directory, "desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page
        .getByRole("complementary", { name: "Conversations" })
        .isVisible(),
      false,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: path.join(directory, "mobile-thread.png"),
      fullPage: true,
    });
    await tenant
      .getByRole("button", { name: "Message options" })
      .last()
      .click();
    await tenant
      .getByRole("menuitem", { name: "Delete message", exact: true })
      .click();
    await tenant
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await tenant
      .getByLabel("Message history")
      .getByText("Message deleted", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Back to conversations" }).click();
    await page
      .getByRole("complementary", { name: "Conversations" })
      .waitFor({ state: "visible" });
    await page
      .getByRole("button")
      .filter({ hasText: "Fixture Pet Clinic" })
      .click();
    await page.getByRole("button", { name: "Conversation options" }).click();
    await page
      .getByRole("menuitem", { name: "Mute alerts", exact: true })
      .click();
    await page.getByRole("button", { name: "Conversation options" }).click();
    await page
      .getByRole("menuitem", { name: "Unmute alerts", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Conversation options" }).click();
    await page
      .getByRole("menuitem", { name: "Archive conversation", exact: true })
      .click();
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await page
      .getByRole("button")
      .filter({ hasText: "Fixture Pet Clinic" })
      .waitFor();
    await page.screenshot({
      path: path.join(directory, "mobile-inbox.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    const failed = await customerContext.newPage();
    await failed.route("**/api/chats?*", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fixture connection unavailable" }),
      }),
    );
    await failed.goto(base);
    await failed.getByRole("alert").first().waitFor();
    await failed.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]'),
    );
    assert.equal(
      await failed.getByText("No conversations yet", { exact: true }).count(),
      0,
    );
    await failed.close();
    const failedHistory = await customerContext.newPage();
    await failedHistory.setViewportSize({ width: 390, height: 844 });
    let releaseMobile;
    const mobileGate = new Promise((resolve) => {
      releaseMobile = resolve;
    });
    await failedHistory.route("**/api/chats?*", async (route) => {
      const op = new URL(route.request().url()).searchParams.get("op");
      if (op === "detail") await mobileGate;
      if (op === "history")
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Fixture history unavailable" }),
        });
      await route.continue();
    });
    await failedHistory.goto(base, { waitUntil: "domcontentloaded" });
    await failedHistory
      .getByRole("status", { name: "Loading messages", exact: true })
      .waitFor();
    assert.equal(
      await failedHistory
        .getByRole("complementary", { name: "Conversations" })
        .isVisible(),
      false,
    );
    assert.ok(
      await failedHistory.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    releaseMobile();
    await failedHistory
      .getByRole("alert")
      .filter({ hasText: "Fixture history unavailable" })
      .waitFor();
    assert.equal(
      await failedHistory
        .getByText(
          "Start the conversation. Ask about services or an upcoming visit.",
          { exact: true },
        )
        .count(),
      0,
    );
    await failedHistory.unrouteAll({ behavior: "wait" });
    await failedHistory
      .getByRole("alert")
      .getByRole("button", { name: "Retry", exact: true })
      .click();
    await failedHistory.getByLabel("Message history").waitFor();
    assert.equal(
      await failedHistory
        .getByRole("status", { name: "Loading messages", exact: true })
        .count(),
      0,
    );
    await failedHistory.close();
    console.log(
      `Chat browser checks passed: cold skeletons, retained refresh data, loading/error separation, desktop/mobile, older history scroll, retry idempotency, both roles, reconnect, editing, mute/archive. Screenshots: ${directory}`,
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
