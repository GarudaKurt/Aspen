# Customer and provider messaging

## Deployment

Apply `supabase/migrations/0034_customer_provider_chat.sql` in the Supabase SQL Editor as the database owner, after the existing migrations. It uses the existing profile, business, media and approval schema. It is transactional and safe to rerun. Do not disable RLS or security triggers.

The migration registers `chat_messages` and `chat_participants` with the existing `supabase_realtime` publication. If that publication is absent in a self-hosted installation, enable Postgres Changes and add those two tables before testing live updates. See [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Client subscriptions use the existing signed-in Supabase session, and delivery is subject to each subscriber's SELECT policies.

Deploy the application after the migration. No new secrets, service-role keys, R2 configuration or production dependencies are needed. Existing authentication and uploads are unchanged. This migration does not create demo conversations or messages.

## Data and access

| Table | Purpose |
| --- | --- |
| `chat_conversations` | One conversation per customer/business pair; database uniqueness prevents duplicate threads. |
| `chat_participants` | Customer/provider membership, read sequence, archive/hide/mute preferences. |
| `chat_messages` | Plain text, authenticated sender, server timestamps, unique retry identifier, soft deletion. |
| `chat_rate_limits` | Private, bounded per-user operation counters. No client access. |

All four tables have RLS enabled. Authenticated clients have SELECT access to their own conversations, participants and messages only. Direct INSERT/UPDATE/DELETE is denied. Writes go through restricted database functions that independently verify identity, email confirmation, profile role and membership. Functions have fixed search paths and explicit execute grants; internal helpers cannot be called by clients. See [Supabase database function security](https://supabase.com/docs/guides/database/functions).

Providers can read/respond only as the current owner of the relevant business. A provider can separately act as a customer when messaging another business from its public profile. Admins do not automatically receive access to private customer/provider messages. Business ownership transfer would require an explicit participant-transfer workflow; old owners immediately lose access.

New conversations require a published business, an approved application, and a verified provider owner. Self-messaging is rejected. Sending in existing conversations requires an approved, active business (`pending` or `published`); archived/rejected/draft businesses cannot send or receive new messages. Existing authorized participants can still read past messages.

## Operations and limits

Server mutations: `chatAction` in `src/features/chats/api/actions.ts`. Inputs use a Zod discriminated union. Identity and timestamps are never accepted from the browser.

| Command | Database function | Behavior |
| --- | --- | --- |
| `start` | `start_business_chat` | Create/resume one thread; restore the customer's personal inbox visibility. |
| `send` | `send_chat_message` | Save one message using a stable client UUID. Repeated delivery attempts return the existing row. |
| `edit` / `delete` | `change_chat_message` | Sender only, optimistic version check; edits within 15 minutes, deletion within 24 hours. |
| `read` | `read_chat_conversation` | Advance the caller's watermark only, never beyond the conversation's committed messages. |
| `preferences` | `set_chat_preferences` | Archive, mute, restore or hide only the caller's conversation entry. |

- Plain text only, 1–4,000 characters. React renders text without HTML interpretation.
- Sending: 30 new messages/minute and 2,000/day per account. Idempotent retries do not consume another send allowance.
- Starting/resuming: 10/minute. Editing/deleting: 30/minute. Preference updates: 60/minute. Limits are enforced in PostgreSQL across application instances and direct RPC calls.
- Deletion clears message text and leaves a timestamped tombstone. Hiding a conversation is personal; it does not erase the other participant's history. A new message restores hidden/archived conversations to both inboxes.
- Mute suppresses in-app new-message alerts while Chats is open. Messages and unread counters still update. This implementation does not send push/email notifications or claim online presence.
- “Sent” means persisted by Supabase; “Read” means the recipient viewed through that message. No unsupported device-delivery status is claimed.
- Failed sends retain their retry UUID while the conversation stays mounted. After navigation/refresh, history is authoritative: check it before retyping an uncertain send. Drafts and message bodies are not persisted to browser storage.

## Read API and synchronization

`GET /api/chats` validates the authenticated account, returns `Cache-Control: private, no-store`, and supports:

- `op=inbox&role=customer|provider&archived=true|false`, optional paired `at`/`id` cursor: 30 conversations ordered by activity and ID.
- `op=detail&role=customer|provider&conversation=<uuid>`: authorized header information for deep links.
- `op=history&conversation=<uuid>`, optional `before=<sequence>`: 50 messages in chronological order, an older-page cursor and snapshot watermark.
- `op=sync&conversation=<uuid>&at=<timestamp>&seq=<sequence>`: up to 100 changes per request, including missed edits/deletions and the recipient's latest read watermark.

History and synchronization use a conversation lock to avoid cursor gaps around concurrent writes. Timestamps retain PostgreSQL microseconds; the client reconciles by message ID/version rather than appending every Realtime event. Older, unloaded edits do not insert disjoint pages into visible history.

Realtime subscriptions listen to the current user's participant rows and the selected conversation's messages/participants. Events are debounced into authenticated reads. Reconnection, returning to a visible tab and browser online events trigger catch-up; visible pages also poll every 15 seconds. Subscriptions, timers and pending reads are cleaned up on navigation. Catch-up is bounded to five batches per pass. Inbox refreshes preserve the number of loaded pages, and message history loads only requested pages.

For a much larger installation, measure Realtime authorization cost and loaded-inbox refresh traffic; consider private Broadcast and incremental inbox updates based on measured load. The current MVP uses indexed Postgres Changes with RLS rather than an additional messaging service.

## Shared UI and routes

- Customer: `/chats`.
- Provider: `/tenant-dashboard/chat`, protected by the existing exact provider-role guard.
- Business Profile → Message: reuses the existing auth modal if necessary, then `/chats?business=<slug>` creates/resumes the thread and replaces the URL with its conversation ID. Unverified signups retain the destination through the standard verification/login flow.
- Both routes share `ChatView`, conversation controls, history, composer and synchronization hooks.
- Desktop: inbox and conversation panels. Mobile: one panel with an explicit back button. Business photos use the existing authorized public-photo endpoint; customer avatars use initials.
- Search filters loaded conversations; the UI identifies this scope and supports loading more.
- Incoming messages do not move readers away from older history. A “New messages” control returns to the bottom. Older-page insertion preserves scroll position.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `node --test tests/chats.test.cjs`.

The isolated SQL tests use an optional temporary PGlite installation, never the hosted project:

```powershell
$env:PGLITE_MODULE = '<temporary node_modules path>/@electric-sql/pglite'
node tests/chats.sql.test.cjs
```

They apply the real prerequisite migrations/approval functions and check duplicate threads/sends, RLS, spoofed writes, unverified/admin/cross-tenant denial, history/read receipts, edits/deletion, catch-up, preferences, rate limits and inactive businesses.

The optional browser tests bundle the actual shared UI with isolated HTTP/Realtime fixtures. They do not authenticate to Supabase or send real messages:

```powershell
$env:CHAT_BROWSER_TOOLS = '<temporary node_modules with playwright and esbuild>'
$env:CHAT_BROWSER_EXECUTABLE = '<Chrome or Chromium executable>'
node tests/chats.browser.test.cjs
```

Run the production build first to provide compiled Tailwind styles. Test tooling is not added to the application's dependencies. SQL/browser scripts explicitly print a skip notice if their optional tooling is unavailable.

After deployment, verify with separate customer/provider browser sessions: open a published approved business, send/reply, refresh, check unread/read indicators, disconnect/reconnect, edit/delete, archive/unarchive and mute. Test a third unrelated account and an unverified account for denial. These hosted checks are still necessary to verify the project's actual migration state, Realtime configuration and session behavior; local tests do not establish those conditions.
