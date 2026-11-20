/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiled = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === "server-only") return {};
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith("."))
      return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  new Function("require", "module", "exports", output)(
    localRequire,
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const schemas = load("src/features/chats/schemas.ts");
const model = load("src/features/chats/model.ts");
const message = (
  seq,
  body = `Message ${seq}`,
  time = "2026-11-20T01:00:00.123456Z",
) => ({
  id: uid(seq),
  seq,
  body,
  conversation_id: uid(900),
  sender_id: uid(901),
  client_id: uid(seq + 100),
  created_at: time,
  updated_at: time,
  edited_at: null,
  deleted_at: null,
});
test("Zod rejects empty, oversized, invalid identity and missing concurrency versions", () => {
  const valid = {
    action: "send",
    conversation: uid(900),
    clientId: uid(100),
    body: " hello ",
  };
  assert.equal(schemas.chatCommandSchema.parse(valid).body, "hello");
  for (const change of [
    { body: " \n\t " },
    { body: "x".repeat(4001) },
    { conversation: "anybody" },
    { clientId: undefined },
  ])
    assert.equal(
      schemas.chatCommandSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
  assert.equal(
    schemas.chatCommandSchema.safeParse({
      action: "edit",
      message: uid(1),
      body: "new",
    }).success,
    false,
  );
  assert.equal(
    schemas.chatCommandSchema.safeParse({
      action: "read",
      conversation: uid(1),
      seq: -1,
    }).success,
    false,
  );
  assert.equal(
    schemas.chatQuerySchema.safeParse({
      op: "history",
      conversation: uid(1),
      before: "1e30",
    }).success,
    false,
  );
});
test("synchronization deduplicates retries and preserves newer edits to microsecond precision", () => {
  const original = message(1, "original", "2026-11-20T01:00:00.123Z");
  const edited = message(1, "edited", "2026-11-20T01:00:00.123456+00:00");
  const result = model.mergeMessages(
    [edited],
    [original, edited, message(2), message(2)],
  );
  assert.deepEqual(
    result.map((m) => m.body),
    ["edited", "Message 2"],
  );
  assert.equal(model.mergeMessages([original], [edited])[0].body, "edited");
});
test("older edits do not insert unloaded history; explicit history pagination does", () => {
  assert.deepEqual(
    model
      .mergeMessages([message(50)], [message(1), message(51)])
      .map((m) => m.seq),
    [50, 51],
  );
  assert.deepEqual(
    model.mergeMessages([message(50)], [message(49)], true).map((m) => m.seq),
    [49, 50],
  );
  const tombstone = {
    ...message(50),
    body: "",
    deleted_at: "2026-11-20T02:00:00Z",
    updated_at: "2026-11-20T02:00:00Z",
  };
  assert.equal(
    model.mergeMessages([message(50)], [tombstone])[0].deleted_at,
    tombstone.deleted_at,
  );
});
function fixture({
  role = "customer",
  user = true,
  verified = true,
  data = message(1),
  error = null,
} = {}) {
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data, error };
    },
  };
  const mocks = {
    "@/lib/supabase/server-client": {
      createSupabaseServerClient: async () => client,
    },
    "@/server/auth/session": {
      getCurrentProfile: async () =>
        user
          ? {
              user: {
                id: uid(901),
                email_confirmed_at: verified ? "yes" : null,
              },
              profile: { role },
            }
          : null,
      isEmailVerified: (u) => !!u?.email_confirmed_at,
    },
  };
  return {
    calls,
    mocks,
    action: load("src/features/chats/api/actions.ts", mocks).chatAction,
  };
}
test("server actions deny unauthenticated, unverified and admin users before RPC access", async () => {
  for (const setup of [
    { user: false },
    { verified: false },
    { role: "admin" },
  ]) {
    const f = fixture(setup);
    const result = await f.action({
      action: "send",
      conversation: uid(900),
      clientId: uid(100),
      body: "Hello",
    });
    assert.equal(result.ok, false);
    assert.equal(f.calls.length, 0);
  }
});
test("send derives identity from session and forwards a stable retry key, never a client sender", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.action({
        action: "send",
        conversation: uid(900),
        clientId: uid(100),
        body: "Hello",
        sender_id: uid(999),
      })
    ).ok,
    true,
  );
  assert.deepEqual(f.calls, [
    {
      name: "send_chat_message",
      args: {
        p_conversation: uid(900),
        p_client_id: uid(100),
        p_body: "Hello",
      },
    },
  ]);
});
test("database authorization errors and migration failures are safe and meaningful", async () => {
  const command = { action: "start", slug: "clinic" };
  assert.match(
    (
      await fixture({
        error: { code: "42501", message: "private SQL" },
      }).action(command)
    ).error,
    /access/,
  );
  assert.match(
    (
      await fixture({
        error: { code: "PGRST202", message: "private SQL" },
      }).action(command)
    ).error,
    /0034/,
  );
  assert.equal(
    (
      await fixture({ error: { code: "XX000", message: "secret" } }).action(
        command,
      )
    ).error.includes("secret"),
    false,
  );
});
test("message actions normalize composite RPC rows and never acknowledge an invalid delivery record", async () => {
  const command = {
    action: "send",
    conversation: uid(900),
    clientId: uid(100),
    body: "Hello",
  };
  const array = await fixture({ data: [message(1)] }).action(command);
  assert.equal(array.ok, true);
  assert.equal(array.message.id, uid(1));
  for (const data of [null, [], [message(1), message(2)], { id: uid(1) }]) {
    const result = await fixture({ data }).action(command);
    assert.equal(result.ok, false);
    assert.match(result.error, /Retry this message/);
  }
});
test("history API caps the page, orders chronologically and retains the snapshot watermark", async () => {
  const rows = Array.from({ length: 51 }, (_, i) => message(100 - i));
  const f = fixture({
    data: {
      messages: rows,
      watermark: "2026-11-20T02:00:00.123456Z",
      recipientRead: 80,
    },
  });
  const { GET } = load("src/app/api/chats/route.ts", f.mocks);
  const { NextRequest } = require("next/server");
  const response = await GET(
    new NextRequest(
      `http://localhost/api/chats?op=history&conversation=${uid(900)}`,
    ),
  );
  const page = await response.json();
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(page.messages.length, 50);
  assert.equal(page.messages[0].seq, 51);
  assert.equal(page.messages.at(-1).seq, 100);
  assert.equal(page.before, 51);
  assert.equal(page.recipientRead, 80);
  assert.equal(page.watermark, "2026-11-20T02:00:00.123456Z");
});
test("API denies cross-account access and malformed cursors without exposing database messages", async () => {
  const { NextRequest } = require("next/server");
  const f = fixture({ error: { code: "42501", message: "private detail" } });
  const { GET } = load("src/app/api/chats/route.ts", f.mocks);
  const denied = await GET(
    new NextRequest(
      `http://localhost/api/chats?op=history&conversation=${uid(900)}`,
    ),
  );
  assert.equal(denied.status, 403);
  assert.equal(
    JSON.stringify(await denied.json()).includes("private detail"),
    false,
  );
  const invalid = await GET(
    new NextRequest(
      "http://localhost/api/chats?op=inbox&role=provider&at=2026-11-20T00:00:00Z",
    ),
  );
  assert.equal(invalid.status, 400);
  assert.equal(f.calls.length, 1);
});
test("Realtime subscribes to authorized conversation filters and cleans up channels", () => {
  const calls = [];
  let status;
  let changes;
  let refresh = 0;
  const channel = {
    on: (type, filter, callback) => {
      calls.push(filter);
      changes = callback;
      return channel;
    },
    subscribe: (callback) => {
      status = callback;
      return channel;
    },
  };
  const client = {
    channel: () => channel,
    removeChannel: () => {
      calls.push("removed");
      return Promise.resolve();
    },
  };
  const { subscribeToChat } = load("src/features/chats/api/realtime.ts", {
    "@/lib/supabase/browser-client": { getSupabaseBrowserClient: () => client },
  });
  const stop = subscribeToChat(
    uid(1),
    uid(900),
    () => refresh++,
    () => {},
  );
  assert.ok(
    calls.every((filter) => filter.filter === `conversation_id=eq.${uid(900)}`),
  );
  status("SUBSCRIBED");
  changes();
  status("CHANNEL_ERROR");
  status("SUBSCRIBED");
  assert.equal(refresh, 3);
  stop();
  assert.equal(calls.at(-1), "removed");
  status("SUBSCRIBED");
  assert.equal(refresh, 3);
});
test("message bodies render as plain escaped text, including disguised HTML", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const control = ({ children }) => React.createElement("div", null, children);
  const { MessageHistory } = load(
    "src/features/chats/components/chat-components.tsx",
    {
      "next/image": { default: control },
      "@/components/ui/button": { Button: control },
      "@/components/ui/dropdown-menu": {
        DropdownMenu: control,
        DropdownMenuContent: control,
        DropdownMenuItem: control,
        DropdownMenuTrigger: control,
      },
    },
  );
  const html = renderToStaticMarkup(
    React.createElement(MessageHistory, {
      messages: [message(1, "<img src=x onerror=alert(1)>")],
      userId: uid(99),
      recipientRead: 0,
      before: null,
      loadOlder: async () => {},
      onRead() {},
      onEdit() {},
      onDelete() {},
    }),
  );
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.equal(html.includes("<img src=x"), false);
});
