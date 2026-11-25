/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated layout checks using real skeleton components and production Tailwind CSS.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

if (!process.env.SKELETON_BROWSER_TOOLS) {
  console.log(
    "Skeleton browser checks skipped: set SKELETON_BROWSER_TOOLS to a temporary node_modules with playwright and esbuild.",
  );
  process.exit(0);
}
const { chromium } = require(
  path.join(process.env.SKELETON_BROWSER_TOOLS, "playwright"),
);
const esbuild = require(
  path.join(process.env.SKELETON_BROWSER_TOOLS, "esbuild"),
);

(async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "aspen-skeleton-browser-"),
  );
  await esbuild.build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { flushSync } from 'react-dom';
        import { BusinessProfileSkeleton, CustomerProfileSkeleton, AppointmentSkeleton, CustomerListSkeleton, CalendarGridSkeleton } from './src/components/loading/skeletons';
        import { ChatPageSkeleton } from './src/components/loading/chat-skeletons';
        import { DashboardShellSkeleton, DashboardContentSkeleton, AdminApplicationsSkeleton } from './src/components/loading/dashboard-skeletons';
        import { LandingSkeleton, WishlistSkeleton, HelpSkeleton, AuthSkeleton, ListingSkeleton } from './src/components/loading/public-skeletons';
        const cases = {
          business: <BusinessProfileSkeleton />, profile: <CustomerProfileSkeleton />,
          chats: <ChatPageSkeleton customer />, dashboard: <DashboardShellSkeleton />,
          landing: <LandingSkeleton />, wishlist: <WishlistSkeleton />, help: <HelpSkeleton />,
          auth: <AuthSkeleton fields={3} />, listing: <ListingSkeleton />, admin: <AdminApplicationsSkeleton />,
          bookings: <CustomerListSkeleton kind="bookings" />, notifications: <CustomerListSkeleton kind="notifications" />,
        };
        for (const step of ['service','date-time','pet','details','confirmation']) cases['appointment-'+step] = <AppointmentSkeleton step={step} />;
        for (const kind of ['overview','profile','services','appointments','calendar']) cases['dashboard-'+kind] = <div className="p-5 sm:p-8"><DashboardContentSkeleton kind={kind} /></div>;
        for (const mode of ['month','week','day','agenda']) cases['calendar-'+mode] = <div className="p-4"><CalendarGridSkeleton mode={mode} /></div>;
        const root = createRoot(document.getElementById('root'));
        window.cases = Object.keys(cases);
        window.renderCase = (name) => flushSync(() => root.render(<div data-case={name}>{cases[name]}</div>));
        window.renderCase('business');`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    outfile: path.join(directory, "app.js"),
    bundle: true,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
  });
  const cssRoot = path.join(process.cwd(), ".next/static/css");
  assert.ok(fs.existsSync(cssRoot), "Run npm run build before browser checks.");
  const css = fs
    .readdirSync(cssRoot, { recursive: true })
    .filter((file) => file.endsWith(".css"))
    .map((file) => fs.readFileSync(path.join(cssRoot, file), "utf8"))
    .join("\n");
  const server = http.createServer((req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(fs.readFileSync(path.join(directory, "app.js")));
    } else if (req.url === "/app.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(css);
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
      );
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
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => !!window.renderCase);
    const cases = await page.evaluate(() => window.cases);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of cases) {
        await page.evaluate((name) => window.renderCase(name), name);
        const layout = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          announcements: document.querySelectorAll(
            '[role="status"][aria-label]',
          ).length,
          focusable: document.querySelectorAll(
            'button,a[href],input,select,textarea,[tabindex="0"]',
          ).length,
          bars: document.querySelectorAll('[data-slot="skeleton"]').length,
          collapsedBars: [
            ...document.querySelectorAll('[data-slot="skeleton"]'),
          ].filter(
            (bar) =>
              bar.getClientRects().length &&
              (!bar.getBoundingClientRect().width ||
                !bar.getBoundingClientRect().height),
          ).length,
          exposedBars: document.querySelectorAll(
            '[data-slot="skeleton"]:not([aria-hidden="true"])',
          ).length,
        }));
        assert.ok(
          layout.width <= width,
          `${name} overflows at ${width}: ${layout.width}`,
        );
        assert.ok(
          layout.announcements > 0,
          `${name} needs a named loading announcement`,
        );
        assert.ok(layout.bars > 0);
        assert.equal(
          layout.collapsedBars,
          0,
          `${name} has collapsed placeholders at ${width}`,
        );
        assert.equal(layout.exposedBars, 0);
        assert.equal(
          layout.focusable,
          0,
          "Placeholders must not behave like working controls",
        );
        if (
          (width === 390 || width === 1440) &&
          ["business", "profile", "chats", "appointment-service"].includes(name)
        ) {
          await page.screenshot({
            path: path.join(directory, `${name}-${width}.png`),
            fullPage: true,
          });
        }
      }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.renderCase("business"));
    assert.ok(
      await page
        .locator('[data-slot="skeleton"].rounded-full')
        .evaluateAll((bars) =>
          bars.every(
            (bar) =>
              parseFloat(getComputedStyle(bar).borderRadius) >=
              bar.getBoundingClientRect().height / 2,
          ),
        ),
    );
    assert.ok(
      await page
        .locator('[data-slot="skeleton"].rounded-none')
        .evaluateAll((bars) =>
          bars.every((bar) => getComputedStyle(bar).borderRadius === "0px"),
        ),
    );
    assert.ok(
      await page
        .locator('[data-slot="skeleton"]')
        .evaluateAll((bars) =>
          bars.every((bar) => getComputedStyle(bar).animationName === "none"),
        ),
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    assert.ok(
      await page
        .locator('[data-slot="skeleton"]')
        .evaluateAll((bars) =>
          bars.some((bar) => getComputedStyle(bar).animationName === "pulse"),
        ),
    );
    assert.deepEqual(errors, []);
    console.log(
      `Skeleton checks passed: ${cases.length} layouts at 320/390/768/1440px; accessible loading, no focus traps, reduced motion. Screenshots: ${directory}`,
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
