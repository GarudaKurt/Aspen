# Loading states

Reusable placeholders live in `src/components/loading` and use the existing shadcn `Skeleton`. They reserve the page's header, image frames, forms, lists, and chat columns. A named status region announces loading while decorative bars remain hidden from assistive technology. Pulse animations respect reduced-motion preferences.

## Coverage

- Business Profile: route loading for navigation and refresh; individual gallery image loading within fixed frames.
- Request Appointment: both the generic and business-specific routes, with service, date/time, pet, details, and confirmation placeholders. Existing Back destinations and booking state are unchanged.
- My Profile, customer Chats, Bookings, Notifications, Wishlist, Help, and business registration: page-specific loading boundaries.
- Landing page: the existing server Suspense boundary now matches the header, discovery section, and business grid.
- Tenant dashboard: shell loading during authorization, plus profile, services, appointments, calendar, and chat content loaders. The existing sidebar stays mounted when navigating within the dashboard.
- Admin application review: loading while the existing role check and review query run.
- Account routes: replace blank Suspense fallbacks with form-shaped placeholders; no authentication changes.

Layouts that await authorization have their own Suspense boundary because a segment's `loading.tsx` does not wrap its layout. The existing guards still run before protected content is rendered. Loading fallbacks contain no account or business data.

## Fetching, caching, and errors

Chat conversation lists and message histories have separate initial-fetch skeletons. Opening a deep-linked conversation also reserves its panel on mobile. Refreshes keep already loaded messages and conversations visible. An initial request failure shows the existing retry notice without claiming the conversation is empty.

The calendar uses a layout matching the selected view while a new range loads. Same-range refreshes keep the last successful events visible. Existing error and empty states remain in place.

No artificial minimum delay, new persistent data cache, navigation interception, or forced cache invalidation is added. Next.js may immediately show a cached or prefetched page, including when returning from an appointment to its Business Profile. This is intentional: the skeleton only appears while content is unavailable. Fast responses may never visibly show a loader.

Static dashboard sections and unfinished legacy placeholder routes do not receive invented data-fetch delays. Existing save buttons, upload progress, and mutation errors keep their current behavior.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `node --test tests/*.test.cjs`.

Optional browser checks use isolated fixtures with the real components and compiled production Tailwind CSS. No live messages, accounts, or bookings are created. Set `SKELETON_BROWSER_TOOLS` and `CHAT_BROWSER_TOOLS` to a temporary `node_modules` containing Playwright and esbuild, then run `node tests/skeletons.browser.test.cjs` and `node tests/chats.browser.test.cjs`. Set `CHAT_BROWSER_EXECUTABLE` if Chrome is not at the default Windows path.

The layout checks cover 320, 390, 768, and 1440 pixel widths, horizontal overflow, noninteractive placeholders, named loading regions, and reduced motion. Chat checks hold network responses to verify cold loaders, preserved content during refresh, and error/empty separation alongside the existing messaging regression checks.

For a live deployment, use browser network throttling to check Business Profile → Request Appointment → Back, a hard refresh of each priority route, and signed-in dashboard navigation. Cached Back navigation should be immediate. Verify real provider/customer sessions separately; fixture tests do not validate hosted Supabase permissions or network latency.
