# Aspen

Aspen represents connection, community, and a living ecosystem. Like an Aspen grove, where individual trees are connected through a shared root system, Aspen brings pet owners, veterinary clinics, and pet-service businesses together through one connected platform. Each business can grow independently while becoming part of a larger ecosystem that makes discovery, care, and digital growth easier.

- **Pet owners** find trusted pet services near them, compare listings, and contact or book.
- **Pet businesses** get a digital storefront, appointment tools, promotions, and analytics.
- **The platform** connects demand and supply and earns recurring subscription revenue.

| | |
|---|---|
| **Business model** | Marketplace discovery + Subscription SaaS |
| **Brand concept** | Aspen: a connected ecosystem where pet businesses grow and pet owners find care |
| **Launch focus** | Veterinary clinics and animal hospitals, then the wider pet-service ecosystem |
| **Status** | Planning, working toward Phase 1 (MVP) |

---

## About Aspen

### Why Aspen?

The name Aspen reflects the core idea behind this platform: many individual businesses connected as one ecosystem.

An Aspen grove is a useful metaphor for the system because the trees may appear separate above the ground while being connected through a shared root network. This mirrors the platform architecture and business model: veterinary clinics, groomers, pet shops, trainers, boarding providers, and other pet-service businesses remain independent businesses, while Aspen provides the shared digital ecosystem that helps them become discoverable, manage their presence, and connect with pet owners.

### The Aspen concept

| Aspen meaning | How it relates to the platform |
|---|---|
| **Connection** | Connects pet owners with veterinary clinics and pet-service businesses. |
| **Community** | Builds a growing network of businesses and customers around pet care. |
| **Growth** | Businesses can start with a basic presence and grow through SaaS tools and subscriptions. |
| **Shared ecosystem** | Each business operates independently while benefiting from the same marketplace network. |
| **Trust and discovery** | Profiles, reviews, services, promotions, and verification help customers discover providers. |
| **Scalability** | The ecosystem can expand from veterinary clinics to the wider pet-service industry. |

### Brand vision

Aspen is the digital ecosystem for pet care.

The platform starts with veterinary clinics and animal hospitals, then grows into a broader network of pet-service providers. Aspen is designed to give pet owners one place to discover services while giving businesses the tools they need to build and manage their digital presence.

### Brand idea in one line

> Aspen connects the pet-care ecosystem so businesses can grow and pet owners can find the care they need.

---

## Table of contents

1. [Why this project exists](#1-why-this-project-exists)
2. [How the marketplace works](#2-how-the-marketplace-works)
3. [Features](#3-features)
4. [Revenue plan](#4-revenue-plan)
5. [Product roadmap](#5-product-roadmap)
6. [Technical phases: MVP now, backend framework later](#6-technical-phases-mvp-now-backend-framework-later)
7. [Tech stack](#7-tech-stack)
8. [Architecture and design patterns](#8-architecture-and-design-patterns)
9. [Folder structure](#9-folder-structure)
10. [Subscription billing (Stripe)](#10-subscription-billing-stripe)
11. [Getting started](#11-getting-started)
12. [Deployment](#12-deployment)
13. [Conventions and rules](#13-conventions-and-rules)
14. [Design tokens](#14-design-tokens)
15. [Open decisions](#15-open-decisions)

---

## 1. Why this project exists

### The problem

- Pet owners search across Google, Facebook, word of mouth, and many separate pages to find a clinic or service.
- Service information and prices are fragmented and hard to compare.
- Small clinics often lack a professional website, appointment tools, analytics, and digital marketing.
- Businesses need better online visibility and a way to acquire customers.

### The solution

One platform for discovering trusted pet services:

- Location-based search and map results.
- Airbnb-style business profiles with photos, services, prices, offers, and reviews.
- Optional appointment requests and booking.
- A business dashboard where clinics manage their online presence.

### Target market

| | |
|---|---|
| **Primary** | Veterinary clinics and animal hospitals |
| **Future expansion** | Pet grooming, pet boarding and hotels, trainers and sitters, pet shops, other pet-related services |
| **Long-term vision** | A complete digital ecosystem for pet services |

### Competitive advantage

- **Not just a directory.** It combines customer discovery with SaaS tools for pet businesses.
- **Measurable value for businesses:** visibility, appointments, promotions, and analytics.
- **Subscription-first**, which reduces dependence on transaction commissions.
- **Network effects:** the platform becomes more valuable as more customers and businesses join.

### Long-term vision

| Audience | Promise |
|---|---|
| Pet owners | Find trusted pet services near you in one place. |
| Businesses | Get discovered, promote services, and manage your digital presence. |
| Platform | Build scalable recurring SaaS revenue plus marketplace income. |

### Strategy in one line

Start focused on veterinary clinic discovery, build supply first with free listings, convert businesses through valuable premium SaaS features, use subscriptions as the foundation of recurring revenue, and add featured listings, promotions, and payment fees as the marketplace grows.

---

## 2. How the marketplace works

```
PET OWNER  →  Search nearby vet / pet services  →  Compare listings  →  View profile  →  Contact or book
BUSINESS   →  Create profile  →  Showcase services  →  Upgrade subscription  →  Gain visibility + SaaS tools
PLATFORM   →  Connects demand and supply while generating recurring revenue
```

---

## 3. Features

### Customer features

- Find pet services near the customer, with map and location-based discovery
- Detailed business profiles
- Service and price information
- Promotions and special offers
- Reviews and ratings
- Appointment requests or online booking
- Favorites and pet profiles (later versions)

### Business features

- Digital business storefront
- Service and pricing management
- Photo gallery and promotions
- Appointment calendar
- Customer inquiry management
- Business analytics
- Multiple staff accounts and branch support for larger businesses
- Featured placement and advertising tools

---

## 4. Revenue plan

### Why subscription is the main revenue model

- Commission-only marketplaces suffer from **platform leakage**: customers may discover a clinic on the platform, then talk through Facebook, Messenger, or phone.
- Subscription revenue is earned **regardless of where the final conversation happens**.
- Recurring revenue is more predictable and easier to forecast.

### Subscription plans

| Plan | Example price | What businesses get |
|---|---|---|
| **Free** | ₱0 / month | Basic listing, address, contact details, limited photos and services |
| **Basic** | ₱499 / month | Complete profile, more services, promotions, basic appointment requests |
| **Professional** | ₱999 / month | Appointment management, analytics, improved visibility, more staff tools |
| **Enterprise** | ₱1,999+ / month | Multiple branches, advanced analytics, multiple schedules, priority support |

> Pricing should be validated with real clinic owners before launch. Prices live in Stripe, not in code, so they can change without a deploy.

**Draft entitlement matrix** (source of truth: `src/features/billing/entitlements/plans.ts`; each tier includes the tiers below it; numbers are placeholders to confirm):

| | Free | Basic | Professional | Enterprise |
|---|---|---|---|---|
| Services / photos | 3 / 3 | 15 / 15 | 50 / 50 | Unlimited |
| Profile | Basic | Complete | Complete | Complete |
| Promotions | No | Yes | Yes | Yes |
| Appointments | None | Requests | Management | Management |
| Analytics | None | None | Standard | Advanced |
| Staff accounts | 1 | 1 | 5 | Unlimited |
| Branches | 1 | 1 | 1 | Unlimited |
| Multiple schedules | No | No | No | Yes |
| Improved visibility | No | No | Yes | Yes |
| Priority support | No | No | No | Yes |

### Revenue streams

| # | Stream | Priority | How it works |
|---|---|---|---|
| 1 | **Subscriptions** | Primary | Monthly SaaS plans (above) |
| 2 | **Featured listings** | Secondary | Businesses pay for higher visibility in search or category pages (city, category, or homepage placement) |
| 3 | **Promotions and sponsored offers** | Third | Vaccination campaigns, grooming discounts, packages, and seasonal offers, sold as per-promotion boosts, monthly packages, or premium placement. Earns ad revenue without depending on bookings |
| 4 | **Booking and payment fees** | Future | Transaction fee only when booking and payment happen through the platform (for example an online deposit). Not the primary model, since customers can book outside the platform |

### Example: subscription revenue with 300 clinics

| Segment | Calculation | Monthly |
|---|---|---|
| Free clinics | 150 × ₱0 | ₱0 |
| Basic | 100 × ₱499 | ₱49,900 |
| Professional | 50 × ₱999 | ₱49,950 |
| **Total** | | **₱99,850 / month** |
| **Annual recurring revenue** | | **₱1,198,200 / year** |

Featured listings example: 50 businesses × ₱1,000 = ₱50,000 / month.

### Example: mature scenario

| Source | Calculation | Monthly |
|---|---|---|
| Subscriptions | 500 paying businesses × ₱800 average | ₱400,000 |
| Featured listings | 100 × ₱1,000 | ₱100,000 |
| Sponsored campaigns | 50 × ₱1,000 | ₱50,000 |
| Booking / payment revenue | Example | ₱50,000 |
| **Total gross revenue** | | **₱600,000 / month** |
| **Annual gross revenue** | | **₱7,200,000 / year** |

> These figures are illustrative, not guaranteed.

---

## 5. Product roadmap

The business roadmap has four milestones. They describe **what** ships. Section 6 describes **how** it is built, in two technical phases.

| Milestone | Name | Scope |
|---|---|---|
| **M1** | Marketplace Directory | Search, maps, profiles, services, contact details, reviews |
| **M2** | SaaS Dashboard | Business profiles, promotions, analytics, appointment management, subscription billing |
| **M3** | Customer Ecosystem | Pet profiles, favorites, notifications, booking history |
| **M4** | Payments and Expansion | Deposits, payments, more pet-service categories |

Folder comments in this README use **M1–M4** for these milestones, and **Phase 1 / Phase 2** only for the technical plan below.

---

## 6. Technical phases: MVP now, backend framework later

The system is built as a **modular monolith** first. Business logic sits behind interfaces (ports), so the data layer can move from Supabase to a dedicated backend without rewriting the UI.

### Phase 1: MVP (Supabase-first)

**Goal:** ship M1 and M2 fast with the smallest operational footprint.

| Concern | Phase 1 approach |
|---|---|
| Frontend + server | Next.js App Router on Vercel (Server Components, Server Actions, Route Handlers) |
| Database, auth, files | Supabase: Postgres, Auth, Storage, Realtime |
| Multi-tenancy | Every tenant row carries `business_id`; **Row Level Security** enforces isolation |
| Business logic | `features/*/services`, server-only, calling **ports** |
| Data access | `server/adapters/supabase/*` implements the ports |
| Search | Postgres functions (nearby search, featured ranking, open-now) |
| Chat | Supabase Realtime, isolated in `features/chat/api/realtime.ts` |
| Subscription billing | Stripe hosted Checkout + Customer Portal, synced by webhook (Section 10) |
| Background work | Vercel cron via `app/api/cron/*` |
| Local dev | Next.js on the host; Supabase in Docker (`supabase start`) |

**Scope:** M1 plus the M2 essentials (business profile, services, availability, appointment requests, promotions, analytics, billing). M3 items (pets, favorites, notification polish) are added as time allows.

**Exit criteria for Phase 1**
- Businesses can onboard, publish a profile, and manage services.
- Customers can search, view profiles, and send appointment requests.
- Paid plans work end to end, and entitlements are enforced server-side.
- RLS is covered by pgTAP tests.

### Phase 2: Backend framework (future)

**Goal:** move business logic into a dedicated backend when the MVP outgrows serverless functions and Supabase-only logic.

**Signals it is time**
- Background jobs, queues, or scheduled workflows become complex (reminders, campaigns, reconciliation).
- Booking and availability rules get too complex for Server Actions and SQL functions.
- Payment flows expand (M4: deposits, payouts, fees).
- Parts of the system need to scale or deploy independently.
- The team grows and needs independent ownership of areas.
- Third-party integrations multiply.

**Migration approach (strangler pattern, one feature at a time)**

1. Create `apps/api` with your chosen backend framework. Staying in TypeScript (for example NestJS or Fastify) lets you reuse `domain/` types and `services/` almost unchanged. Another language works too, with an OpenAPI contract.
2. Move `server/ports`, adapters, and each feature's `services/` into the API, starting with **billing and webhooks**, the most natural first extraction.
3. In each `features/*/api/`, swap the service call for `lib/http/client.ts`. Components, hooks, and pages do not change.
4. Move `domain/` to `packages/domain` so both apps share the contracts.
5. Replace the in-process event bus with a message broker.
6. Keep Supabase Auth and Postgres (or migrate later). Keep RLS as defense in depth.

**What changes**

| Concern | Phase 1 | Phase 2 |
|---|---|---|
| Business logic | `features/*/services` inside Next.js | `apps/api` |
| Data access | Supabase adapters called from Next.js | HTTP adapters call the API; the API owns repositories |
| Webhooks | Next.js route handlers | API service |
| Events | In-process event bus | Message broker |
| Realtime | Supabase Realtime | Supabase Realtime or websocket/SSE from the API |
| Migrations | `supabase/migrations` | Owned by the API (or kept in Supabase) |
| Deployment | Vercel | Vercel (web) + container host (API) |
| Containers | Docker only for local Supabase | Dockerfile per service and `docker-compose` for local dev |

**Target layout**

```
apps/
├── web/            # this Next.js app (UI only)
└── api/            # backend framework
packages/
├── domain/         # from src/domain: entities, zod contracts, event payloads
├── ui/             # optional: shared/ui + shared/components
└── config/         # eslint, tsconfig, tailwind presets
```

---

## 7. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Styling / UI | Tailwind CSS v4, shadcn/ui, class-variance-authority |
| State | Zustand (client UI state only); server data via Server Components |
| Validation | Zod |
| Backend (Phase 1) | Supabase: Postgres, Auth, Storage, Realtime, RLS |
| Payments | Stripe (tenant subscriptions) |
| Hosting | Vercel (app), Cloudflare (DNS; see Deployment) |
| Testing | Unit tests colocated (`*.test.ts`), Playwright e2e, pgTAP for RLS |
| Quality | ESLint (with boundary rules), Prettier, Husky, strict TypeScript |
| Component catalog | Storybook (optional) |
| Package manager | pnpm |

---

## 8. Architecture and design patterns

**In one sentence:** a feature-based modular monolith with a hexagonal (ports and adapters) data layer.

### Dependency direction

```
components → hooks → api → services → ports ← adapters
                                         (wired only in server/container.ts)
domain/ is importable by every layer and imports nothing.
```

### Architecture patterns

| Pattern | Where | Benefit |
|---|---|---|
| Feature-based modules (vertical slices) | `features/*` | Each feature owns its UI, logic, state, and API calls |
| Layered architecture | components → hooks → api → services → ports | One-way dependencies; UI never touches the database |
| Hexagonal (ports and adapters) | `server/ports` and `server/adapters` | Swap Supabase for an HTTP backend by adding an adapter |
| Repository pattern | `*.repository.ts` ports | One place per entity for data access, returning domain objects |
| Dependency inversion / composition root | `server/container.ts` | The only place that chooses adapters |
| Bounded contexts (DDD-lite) | Each feature plus its `domain/*.ts` file | Clear boundaries; the future microservice cut lines |
| Facade / public API | `features/x/index.ts` | Other code imports a feature only through its index |
| Mapper / DTO | `mappers.ts`, `adapters/supabase/mappers/` | DB row → domain entity → view model; Supabase types never reach the UI |
| Command/query separation (CQRS-lite) | `api/actions.ts` (writes), `api/queries.ts` (reads) | Reads can be cached independently |
| Event-driven / observer | `server/events/` | Features react to each other without importing each other |
| Strangler fig (migration) | `features/*/api/` → `lib/http/client.ts` | Move to a backend one feature at a time |
| Entitlements / feature gating | `features/billing/entitlements` | Plan limits enforced server-side, with UI hints |

### UI patterns

| Pattern | Where |
|---|---|
| Three component tiers | `shared/ui` (primitives) → `shared/components` (reusable composed) → `features/*/components` (domain) |
| Composition and slots | `EntityCard`, `SectionCard`, `WizardLayout`; features fill the slots |
| Variants (`cva`) | `Button`, `Pill`, `ChoiceChip`, `CheckCard`, `StatCard` |
| Smart vs dumb components | Pages and `api/*` fetch; `components/*` and `sections/*` are props-only |
| Design tokens | `styles/tokens.css`, `shared/constants/colors.ts` |

### State and framework patterns

- **Server-first data.** Server Components fetch; Zustand holds only client UI state.
- **Feature-scoped stores.** Each store lives in the feature that owns it.
- **Thin routes.** `app/` only composes features; route groups `(public)`, `(customer)`, `(auth)` separate concerns.
- **Plan checks target the business,** not the visitor, and always run server-side.

---

## 9. Folder structure

```
pet-marketplace/
├── .github/workflows/
│   ├── ci.yml                                     # lint, typecheck, unit tests, boundary check
│   └── db-migrate.yml
├── .husky/                                        # pre-commit: lint-staged + typecheck
├── .storybook/                                    # stories: shared/components/**/*.stories.tsx
├── docs/
│   ├── architecture.md
│   └── adr/                                       # decision records
│
├── src/
│   ├── app/                                       # ROUTING ONLY: thin pages composing features
│   │   ├── (public)/                              # customer side, SEO pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # home: hero, search, chips, featured, browse by service
│   │   │   ├── search/page.tsx
│   │   │   ├── featured/page.tsx
│   │   │   ├── how-it-works/page.tsx
│   │   │   ├── pricing/page.tsx                   # plans for providers (prices from Stripe, cached)
│   │   │   ├── [category]/[city]/page.tsx
│   │   │   └── b/[slug]/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx                       # overview
│   │   │       ├── loading.tsx
│   │   │       ├── not-found.tsx
│   │   │       ├── opengraph-image.tsx            # uses COLORS from shared/constants (no CSS vars here)
│   │   │       ├── photos/page.tsx
│   │   │       ├── services/page.tsx
│   │   │       ├── reviews/page.tsx
│   │   │       └── book/                          # only reachable if the BUSINESS's plan allows requests
│   │   │           ├── layout.tsx                 # WizardLayout + Stepper + BusinessCard (compact)
│   │   │           ├── page.tsx
│   │   │           └── success/page.tsx           # "Request sent" (SuccessState)
│   │   ├── (customer)/                            # logged-in customer area
│   │   │   ├── layout.tsx
│   │   │   ├── favorites/
│   │   │   ├── bookings/
│   │   │   ├── messages/
│   │   │   ├── notifications/
│   │   │   └── pets/                              # M3
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/route.ts
│   │   ├── onboarding/                            # "List your business" wizard
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── submitted/page.tsx                 # "Submitted for review" (SuccessState)
│   │   ├── dashboard/[businessId]/                # tenant side
│   │   │   ├── layout.tsx                         # membership guard + shell
│   │   │   ├── page.tsx                           # workspace
│   │   │   ├── profile/{page.tsx, preview/page.tsx}
│   │   │   ├── services/
│   │   │   ├── chat/
│   │   │   ├── notifications/
│   │   │   ├── calendar/availability/             # Professional+ (management)
│   │   │   ├── reviews/
│   │   │   ├── analytics/                         # Professional+ (standard), Enterprise (advanced)
│   │   │   ├── promotions/                        # Basic+
│   │   │   ├── team/                              # Professional+ (staff tools)
│   │   │   ├── branches/                          # Enterprise
│   │   │   └── billing/
│   │   │       ├── page.tsx                       # current plan, payment method, invoices
│   │   │       ├── plans/page.tsx                 # PlanComparison → start checkout
│   │   │       ├── success/page.tsx               # Checkout return; polls DB, not the URL
│   │   │       └── canceled/page.tsx
│   │   ├── admin/                                 # later
│   │   ├── api/
│   │   │   ├── webhooks/stripe/route.ts           # raw body → verify → billing service (runtime "nodejs")
│   │   │   └── cron/billing-reconcile/route.ts    # optional nightly subscription resync
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   │
│   ├── features/                                  # CORE: one folder per bounded context
│   │   │                                          # (each is a future microservice candidate)
│   │   ├── business-profile/
│   │   │   ├── components/
│   │   │   │   ├── cards/                         # business-card (default|compact|horizontal|featured) + skeleton
│   │   │   │   ├── profile/                       # profile-header, stats-strip, profile-tabs,
│   │   │   │   │                                  # availability-card, cover-gallery
│   │   │   │   ├── sections/                      # about, amenities, hours, location, photos (props-only)
│   │   │   │   ├── onboarding/                    # provider-type-picker, step-business,
│   │   │   │   │                                  # step-services, step-review
│   │   │   │   └── manage/                        # profile-form, profile-summary-card, business-info-card,
│   │   │   │                                      # coverage-card, social-card, slug-field,
│   │   │   │                                      # cover-uploader, photo-manager
│   │   │   ├── hooks/
│   │   │   ├── store/onboarding.store.ts
│   │   │   ├── services/                          # get-business-profile, resolve-business-by-slug,
│   │   │   │                                      # update-business-profile, check-slug-availability
│   │   │   ├── api/{actions.ts, queries.ts}       # the swap point for Phase 2
│   │   │   ├── mappers.ts
│   │   │   ├── schemas.ts                         # form schemas (UI-level zod)
│   │   │   ├── types.ts                           # view models (ProfileViewModel includes `capabilities`)
│   │   │   └── index.ts                           # PUBLIC API of the feature
│   │   │
│   │   ├── catalog/                               # services, categories, amenities; enforces maxServices
│   │   │   ├── components/{display/, select/, manage/}
│   │   │   ├── services/
│   │   │   ├── api/{actions.ts, queries.ts}
│   │   │   └── mappers.ts, schemas.ts, types.ts, index.ts
│   │   │
│   │   ├── discovery/                             # search, map, featured; ranking reads businesses.plan_key
│   │   │   ├── components/                        # hero-search, city-select, featured-carousel,
│   │   │   │                                      # filter-sheet, results-map
│   │   │   ├── hooks/
│   │   │   ├── store/{map.store.ts, map-store-provider.tsx, location.store.ts}
│   │   │   ├── services/
│   │   │   ├── api/queries.ts
│   │   │   └── schemas.ts, types.ts, index.ts
│   │   │
│   │   ├── appointments/
│   │   │   ├── components/
│   │   │   │   ├── request/                       # customer flow: step-service, step-datetime,
│   │   │   │   │                                  # step-pet, step-details, booking-success
│   │   │   │   ├── inbox/                         # Basic+: request inbox, accept/decline
│   │   │   │   ├── management/                    # Professional+: calendar, reschedule, staff assign
│   │   │   │   └── appointment-card.tsx
│   │   │   ├── hooks/
│   │   │   ├── store/booking-draft.store.ts
│   │   │   ├── services/                          # request-appointment (checks the business's plan),
│   │   │   │                                      # list-requests, respond-to-request,
│   │   │   │                                      # reschedule, assign-staff
│   │   │   ├── api/{actions.ts, queries.ts}
│   │   │   └── schemas.ts, types.ts, index.ts
│   │   │
│   │   ├── availability/                          # time-slot-picker, time-of-day-toggle, weekly-hours-editor
│   │   │                                          # (multiple schedules = Enterprise)
│   │   ├── verification/                          # step-identity, verification-card, document-row
│   │   ├── workspace/                             # setup-checklist (plan-aware), workspace-stats,
│   │   │                                          # activity-feed, tips-card
│   │   ├── analytics/                             # components/{standard/, advanced/}
│   │   ├── promotions/                            # Basic+
│   │   ├── chat/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── store/chat.store.ts
│   │   │   ├── services/
│   │   │   ├── api/{actions.ts, queries.ts, realtime.ts}   # realtime.ts: only file that knows Supabase Realtime
│   │   │   └── schemas.ts, types.ts, index.ts
│   │   │
│   │   ├── tenancy/                               # memberships, roles, invites, staff tools, branches
│   │   │   ├── components/                        # membership guard UI, invite-form, team-table
│   │   │   ├── store/tenant.store.ts              # carries `planKey` for UI hints
│   │   │   ├── services/
│   │   │   ├── api/
│   │   │   └── schemas.ts, types.ts, index.ts
│   │   │
│   │   ├── billing/                               # tenant pays the platform, via Stripe
│   │   │   ├── components/
│   │   │   │   ├── plan-comparison.tsx            # on shared FeatureList
│   │   │   │   ├── plan-card.tsx
│   │   │   │   ├── current-plan-card.tsx          # SectionCard + KeyValueList
│   │   │   │   ├── payment-method-card.tsx        # brand + last4 only
│   │   │   │   ├── invoice-table.tsx              # shared DataTable
│   │   │   │   ├── manage-billing-button.tsx      # → Stripe Customer Portal
│   │   │   │   ├── billing-status-banner.tsx      # past_due / canceled
│   │   │   │   ├── feature-gate.tsx
│   │   │   │   └── upgrade-prompt.tsx
│   │   │   ├── entitlements/
│   │   │   │   ├── plans.ts                       # Free / Basic / Professional / Enterprise matrix
│   │   │   │   └── can.ts                         # effectivePlan, hasFeature, withinLimit, ...
│   │   │   ├── hooks/                             # use-subscription-status, use-entitlements (UI hints only)
│   │   │   ├── services/                          # start-checkout, open-billing-portal, get-subscription,
│   │   │   │                                      # list-invoices, list-plan-prices, sync-subscription,
│   │   │   │                                      # handle-billing-webhook
│   │   │   ├── api/{actions.ts, queries.ts}
│   │   │   ├── mappers.ts
│   │   │   ├── schemas.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── reviews/
│   │   ├── notifications/
│   │   ├── favorites/                             # favorite-button (injected into cards via slots)
│   │   ├── pets/                                  # M3
│   │   └── auth/
│   │   #  Collapsed folders follow the same template:
│   │   #  components/ hooks/ (store/) services/ api/{actions,queries}.ts
│   │   #  (mappers.ts) schemas.ts types.ts index.ts
│   │
│   ├── shared/                                    # domain-free; imports nothing from features/core/server
│   │   ├── ui/                                    # shadcn primitives (button, input, checkbox, card, tabs, ...)
│   │   ├── components/
│   │   │   ├── actions/                           # loading-button, submit-button, icon-button, button-link
│   │   │   ├── selection/                         # check-card (checkbox|radio), check-indicator,
│   │   │   │                                      # choice-chip (pill|rect), choice-chip-group,
│   │   │   │                                      # checklist(-item), feature-list
│   │   │   ├── forms/                             # form-field, form-actions, search-input, price-input,
│   │   │   │                                      # phone-input, password-input, number-input,
│   │   │   │                                      # textarea-with-count, date-field, combobox-field,
│   │   │   │                                      # image-uploader
│   │   │   ├── overlays/                          # responsive-sheet, form-sheet, confirm-dialog
│   │   │   ├── data-display/                      # data-table/, key-value-list, stat-item, stat-card (tone),
│   │   │   │                                      # list-item, avatar-with-fallback, relative-time
│   │   │   ├── navigation/                        # nav-tabs, stepper, back-link, breadcrumbs
│   │   │   ├── page/                              # page-container, page-header, section, wizard-layout,
│   │   │   │                                      # detail-layout, sticky-aside
│   │   │   ├── feedback/                          # empty-state, error-state, success-state, progress-card
│   │   │   ├── indicators/                        # rating-stars, rating-input, verified-badge, status-badge,
│   │   │   │                                      # pill (tone), tag-list, price-tag
│   │   │   ├── media/                             # smart-image, image-gallery, gallery-lightbox
│   │   │   ├── cards/                             # entity-card (+skeleton), section-card,
│   │   │   │                                      # card-grid, card-carousel
│   │   │   └── map/                               # map-container, marker
│   │   ├── hooks/                                 # use-mobile, use-media-query, use-debounce,
│   │   │                                          # use-copy-to-clipboard
│   │   ├── store/{create-store.ts, ui.store.ts}
│   │   ├── utils/                                 # cn.ts, format.ts (formatPHP, dates), slug.ts, geo.ts,
│   │   │                                          # money.ts (toMinorUnits / fromMinorUnits)
│   │   ├── validators/                            # phone.ts (PH mobile), money.ts, slug.ts
│   │   └── constants/
│   │       └── colors.ts                          # COLORS (hex mirror) + TONES map
│   │
│   ├── core/                                      # app-level wiring
│   │   ├── config/                                # env.ts, routes.ts, cities.ts, category-icons.ts,
│   │   │                                          # reserved-slugs.ts, feature-flags.ts,
│   │   │                                          # dashboard-nav.ts (items declare required plan)
│   │   ├── providers/{index.tsx, tenant-provider.tsx}
│   │   ├── middleware/{compose.ts, auth.ts, tenant.ts}
│   │   └── layouts/                               # public-header, mobile-nav-sheet, dashboard-shell,
│   │                                              # dashboard-sidebar, business-switcher
│   │
│   ├── domain/                                    # pure TS: entities + zod contracts; no Supabase/Stripe types
│   │   ├── business.ts, catalog.ts, availability.ts, appointment.ts, review.ts, chat.ts,
│   │   ├── notification.ts, verification.ts
│   │   ├── billing.ts                             # PlanKey, SubscriptionStatus, Subscription
│   │   └── events.ts                              # event payloads (SubscriptionChanged, PaymentFailed, ...)
│   │
│   ├── server/                                    # server-only ("server-only" package); the swap point
│   │   ├── ports/                                 # interfaces returning domain types, never DB rows
│   │   │   ├── business, catalog, tenancy, favorite, promotion, search, availability,
│   │   │   ├── appointment, chat, notification, review, verification, storage, analytics
│   │   │   ├── billing.gateway.ts                 # createCheckoutSession, createPortalSession,
│   │   │   │                                      # listInvoices, listPlanPrices, parseWebhook
│   │   │   ├── subscription.repository.ts
│   │   │   └── billing-event.repository.ts        # webhook idempotency log
│   │   ├── adapters/
│   │   │   ├── supabase/                          # client, admin-client, database.types.ts, mappers/,
│   │   │   │                                      # one adapter per port
│   │   │   ├── stripe/
│   │   │   │   ├── client.ts                      # SDK instance, server-only
│   │   │   │   ├── billing.gateway.ts
│   │   │   │   ├── webhook.ts                     # verify signature, Stripe event → domain event
│   │   │   │   ├── plan-catalog.ts                # planKey ↔ Price lookup_key (+ metadata.plan_key)
│   │   │   │   └── mappers/
│   │   │   ├── memory/                            # in-memory fakes for unit tests
│   │   │   └── http/                              # Phase 2: clients for the backend API
│   │   ├── auth/{session.ts, guards.ts}           # requireUser(), requireMember(businessId, role)
│   │   ├── events/
│   │   │   ├── event-bus.ts                       # in-process now; message broker in Phase 2
│   │   │   └── handlers/                          # on-payment-failed, on-subscription-changed, ...
│   │   ├── container.ts                           # the ONLY place adapters are chosen
│   │   └── index.ts
│   │
│   ├── lib/                                       # low-level infra, no business logic
│   │   ├── supabase/browser-client.ts             # Auth + Realtime only
│   │   ├── http/client.ts                         # typed fetch wrapper; unused in Phase 1
│   │   ├── logger.ts
│   │   └── errors.ts
│   │
│   ├── styles/
│   │   ├── tokens.css                             # brand + calendar/chat/star/money + shadcn vars
│   │   └── globals.css                            # imports tailwind + tokens.css
│   │
│   └── middleware.ts                              # thin re-export of core/middleware (proxy.ts on Next 16+)
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_extensions.sql
│   │   ├── 0002_profiles_and_auth.sql
│   │   ├── 0003_tenancy.sql                       # businesses, branches, members, unique slug, slug history
│   │   ├── 0004_catalog.sql                       # categories, amenities, services, add-ons
│   │   ├── 0005_discovery.sql                     # cities, geo, business hours, search views
│   │   ├── 0006_verification.sql
│   │   ├── 0007_reviews.sql
│   │   ├── 0008_appointments.sql
│   │   ├── 0009_chat.sql
│   │   ├── 0010_favorites.sql
│   │   ├── 0011_notifications.sql
│   │   ├── 0012_promotions.sql
│   │   ├── 0013_billing.sql                       # billing_customers, subscriptions, billing_events
│   │   │                                          # (unique provider_event_id), businesses.plan_key
│   │   ├── 0014_analytics_events.sql
│   │   └── 0015_storage_buckets.sql
│   ├── policies/                                  # tenancy, catalog, reviews, appointments, chat,
│   │                                              # notifications, billing (members read; service role writes)
│   ├── functions/                                 # nearby search, featured ranking (reads plan_key), open-now
│   ├── seed.sql
│   └── tests/                                     # pgTAP tests for RLS
│
├── tests/
│   ├── e2e/                                       # Playwright
│   └── fixtures/stripe-events/                    # sample webhook payloads
│
├── public/
├── components.json                                # shadcn: css → src/styles/globals.css; aliases → @/shared/*
├── vercel.json
├── next.config.ts
├── .env.example
├── .prettierrc
├── eslint.config.mjs                              # includes boundary rules
├── tsconfig.json
├── pnpm-lock.yaml
└── package.json
```

---

## 10. Subscription billing (Stripe)

Only **businesses** pay (tenant subscriptions). Customers never see Stripe, and there is no Stripe Connect or payout flow in Phase 1.

> **Before building:** confirm that you can open and activate a Stripe account for a Philippine business entity. Availability and account features for the Philippines vary, so verify directly with Stripe. The `BillingGateway` port keeps the provider swappable (for example, a local processor such as PayMongo) without touching the UI.

### Flow

1. **Upgrade.** The owner clicks Upgrade. A Server Action calls `requireMember(businessId, "owner")`, then the gateway creates a hosted Stripe Checkout session with `businessId` in its metadata.
2. **Webhook.** Stripe calls `/api/webhooks/stripe`. The route reads the raw body, verifies the signature, skips events already in `billing_events`, updates `subscriptions` (using the service-role client), sets `businesses.plan_key`, and emits a domain event.
3. **Read and enforce.** The UI and `can()` read the `subscriptions` row, never the Stripe API, so requests do not wait on Stripe.
4. **Return page.** The success page polls the database. The redirect only means the user came back; the webhook may arrive seconds later.

Webhook events handled: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

### Rules

- Use hosted Checkout and the Customer Portal, so card data never touches your server.
- Subscriptions belong to a **business**, not a user.
- Webhooks are idempotent and tolerate out-of-order delivery; re-fetch from the provider when in doubt.
- The webhook route runs on the **Node.js runtime** and reads `await req.text()` (raw body) for signature verification.
- Store only provider IDs and status, never card details. Use provider-neutral columns (`provider`, `provider_customer_id`).
- Amounts are integers in minor units (₱500 = `50000`); convert only through `shared/utils/money.ts`.
- **Free has no Stripe object.** No subscription row means the free plan.
- Use Stripe Price `lookup_key`s (`basic_monthly`, `professional_monthly`, `enterprise_monthly`) and set `metadata.plan_key` on each Price, so prices can change without a deploy and custom Enterprise prices still resolve to `enterprise`.
- Failed payments: keep access while the provider retries (`past_due`), then fall back to Free. Data is never deleted.

---

## 11. Getting started

### Prerequisites

- Node.js (current LTS) and **pnpm**
- **Docker** (Docker Desktop, or OrbStack, Colima, or Rancher Desktop) for the local Supabase stack
- **Supabase CLI**
- **Stripe CLI** (only when working on billing)

### Setup

```bash
pnpm install
cp .env.example .env.local        # fill in values (see below)

supabase start                    # local Postgres, Auth, Storage, Realtime in Docker
supabase db reset                 # apply migrations + seed.sql
pnpm dev                          # Next.js on http://localhost:3000
```

### Useful commands

```bash
supabase test db                                              # pgTAP tests (RLS)
stripe listen --forward-to localhost:3000/api/webhooks/stripe  # local webhooks
pnpm lint && pnpm typecheck                                   # quality checks
```

### Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Base URL for links and redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase client key (or the publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Admin client used by webhooks and jobs |
| `STRIPE_SECRET_KEY` | **server only** | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | **server only** | Webhook signature verification |

Never commit `.env.local`. Server-only variables are validated in `core/config/env.ts`.

---

## 12. Deployment

| Environment | Web | Database |
|---|---|---|
| Local | `pnpm dev` | Supabase in Docker |
| Preview | Vercel preview deployments | Separate Supabase staging project |
| Production | Vercel | Production Supabase project; migrations applied by `db-migrate.yml` |

**Cloudflare with Vercel:** use Cloudflare for DNS and your registrar, with the Vercel domain records set to **DNS only** (grey cloud). Vercel advises against putting a reverse proxy in front of it, since it limits Vercel's traffic visibility, adds latency, and can cause cache and certificate issues. Cloudflare remains useful for Turnstile (bot protection on signup and booking forms), email routing, and optionally R2 for file storage later.

**Docker:** in Phase 1 it is only for local Supabase. Vercel builds the Next.js app itself, so no Dockerfile is needed. Dockerfiles arrive with the Phase 2 backend.

---

## 13. Conventions and rules

### Dependency rules

Enforced with ESLint boundary rules (`eslint-plugin-boundaries` or `no-restricted-imports`):

- Direction: `components → hooks → api → services → ports ← adapters`. Adapters are wired only in `server/container.ts`.
- `app/` and `core/` import features **only through** `features/x/index.ts`.
- Features never import another feature's internals. Cross-feature needs use the public index or the event bus.
- `shared/` imports nothing from `features/`, `core/`, or `server/`.
- `domain/` imports nothing.
- Only `server/adapters/supabase/` may use server-side `@supabase/*` clients. `lib/supabase/browser-client.ts` is the one browser exception (auth and realtime).
- Server-only modules import `"server-only"`.

### Where does a new component go?

- No domain knowledge and usable in any app: `shared/components/`.
- Knows about businesses, services, or bookings: that feature's `components/`.
- Used by only one feature today: start in the feature, and promote to `shared/` when a second feature needs it.
- Shared components take props and never fetch data.
- Prefer `cva` variants over duplicate components, and import shared components directly (no barrel files inside `shared/`).

### Adding a feature (checklist)

1. Add entities and zod contracts to `domain/<context>.ts`.
2. Add a port in `server/ports/` and an adapter in `server/adapters/supabase/`; register it in `container.ts`.
3. Write use cases in `features/<name>/services/` (validate → authorize → call ports → map).
4. Expose them via `features/<name>/api/{actions,queries}.ts`.
5. Build components, hooks, and store; export the public surface from `index.ts`.
6. Add a thin route in `app/`.
7. Add a migration, RLS policy, and a pgTAP test.
8. If the feature is plan-gated, add the entitlement and enforce it in the service, not just in the UI.

### Plan gating

Every entitlement check runs server-side in a feature `services/` file against the **business's** plan. The UI (`FeatureGate`, `UpgradePrompt`, locked nav items) only explains the limit.

---

## 14. Design tokens

Colors are defined once in `src/styles/tokens.css` and exposed as Tailwind utilities (`bg-primary`, `text-calendar`, `bg-chat-soft`, ...). `shared/constants/colors.ts` mirrors them as hex for places that cannot use CSS variables (OG images, emails, map pins, chart libraries).

| Token | Hex | Soft tint | Used for |
|---|---|---|---|
| Primary | `#3C6355` | `#EAF0ED` | Buttons, active nav, brand |
| Secondary | `#C5714E` | | Active tab underline, highlights |
| Calendar | `#8B5CF6` | `#F5F3FF` | Calendar / date icons |
| Chat | `#10B981` | `#ECFDF5` | Chat / messages icons |
| Star | `#F97316` | `#FFF7ED` | Ratings |
| Money | `#EF4444` | `#FEF2F2` | Prices and earnings |

Accessibility note: the four accent colors are meant for **icons**. On their soft tints their text contrast is below 4.5:1, so use `text-foreground` for small text beside a colored icon.

---

## 15. Open decisions

| # | Decision | Notes |
|---|---|---|
| 1 | Plan limits | Numbers in the entitlement matrix are placeholders |
| 2 | Chat access | The Message button and chat feature are not assigned to any plan |
| 3 | Free listings and booking | What does a customer see on a Free profile (contact details only, no Request Appointment card)? |
| 4 | Basic vs. Professional appointments | What can Basic do with a request (inbox, accept/decline) versus Professional (calendar, reschedule, staff assignment)? |
| 5 | "Complete profile" | Which profile sections are locked on Free? |
| 6 | Featured listings | How are they purchased and billed (Stripe add-on or manual)? Boosted listings must be labeled clearly |
| 7 | Sponsored promotions billing | Per-boost, monthly package, or premium placement? |
| 8 | Free tier vs. free trial | Permanent Free plan (current assumption) or trial periods on paid plans? |
| 9 | Billing intervals | Monthly only at launch, or monthly and yearly? |
| 10 | VAT and receipts | What do Philippine tenants need? Check with an accountant |
| 11 | Stripe eligibility | Confirm a Philippine entity can activate a live account; otherwise choose another provider |
| 12 | Phase 2 framework | Backend framework and language are chosen when the Phase 2 signals appear |

---

## Disclaimer

Revenue figures in this document are illustrative examples from the business proposal, not forecasts or guarantees. Pricing should be validated with real clinic owners before launch.

## License

To be decided.