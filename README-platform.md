# Salon Operating System — Implementation Plan

## Product architecture

Studio Metrics is **one product** — a configurable salon operations platform. Not separate tools. Salon owners go through an onboarding interview that activates the modules they need. Pricing scales with what's active.

### Modules

| Module | What it does | Revenue model |
|---|---|---|
| **Rental Management** | Lease tracking, ACH rent collection, chair availability, renter onboarding | Subscription |
| **Booking** | Unified calendar for rental + commission stylists. Starts as Square overlay, eventually replaces Square's booking stack | Subscription + platform fees on new client bookings |
| **KPI Reports** | Revenue per chair, stylist utilization, retention rates, service mix. Currently live as Square report exporter | Subscription |
| **HR / Management** | Onboarding, scheduling, commission tracking, performance reviews | Subscription |
| **Client CRM** | Visit history, preferences, spend patterns, stylist notes | Subscription |

### Onboarding interview (replaces rigid pricing tiers)

Instead of "Basic / Pro / Enterprise," new users answer:
- Do you have booth renters, commission stylists, or both?
- Do you need client booking?
- Do you want business reporting?
- How many stylists/chairs?
- Do you manage HR?

Answers activate modules, set price. Respects the diversity of salon business models while keeping UX simple. Salon professionals are low-tech — a complicated app will lose them.

### Core design principles

**API-first, interface-second.** Every capability should be accessible via a clean API endpoint. The web UI, SMS interface, and future agent integrations are all consumers of the same API. Never build a capability that only exists in the UI.

The salon industry's users are humans who chose a tactile, creative profession — they'll need human interfaces for a long time. But the *buyers* and *intermediaries* are increasingly agents: an owner's accountant AI recommending automation, a stylist's assistant finding chair rentals, an AI search engine surfacing our calculator. Build the infrastructure so agents can consume it at full speed, and layer human interfaces on top. The interface is a layer, not the product.

**Agent-optimized development.** This codebase is primarily authored by AI coding agents (Claude Code and similar). Architecture choices favor agent productivity: React over Hotwire (vastly more training data, better first-pass output), monorepo over polyrepo (full context in one place), explicit typing and clear conventions (less ambiguity for the agent to resolve). When choosing between two equivalent approaches, pick the one the agent will get right on the first try.

---

## Domain & brand architecture

See `STRATEGY.md` for the full go-to-market plan. Summary of properties:

| Property | Domain | Purpose |
|---|---|---|
| Studio Metrics (hub) | `studiometrics.com` | Marketing site, blog (`/blog/`), app (`app.studiometrics.com`) |
| Calculator (free tool) | `calculator.studiometrics.com` | Lead-gen: commission vs booth rent calculator |
| RentSalonChairs (marketplace) | `rentsalonchairs.com` | Two-sided chair rental marketplace + keyword capture |

---

## Monorepo structure

One repo for the platform. Scanner stays separate (different concern, no PII, different deployment cadence).

```
studio-metrics/
├── api/                          # Rails 8 (API-mode)
│   ├── app/
│   │   ├── controllers/api/v1/   # Versioned JSON API
│   │   ├── models/               # ActiveRecord models, business logic
│   │   ├── jobs/                 # SolidQueue job chains (rent, notifications, etc.)
│   │   ├── mailers/
│   │   └── services/             # Service objects for complex operations
│   ├── config/
│   ├── db/
│   │   └── migrate/
│   └── spec/                     # API tests
│
├── web/                          # React frontend (Vite + React Router)
│   ├── src/
│   │   ├── apps/                 # Distinct interface contexts
│   │   │   ├── stylist/          # Stylist mobile portal (schedule, balance, time-off)
│   │   │   ├── frontdesk/        # Front desk kiosk (day view, check-in, conflicts)
│   │   │   ├── owner/            # Owner dashboard (KPIs, HR, settings, billing)
│   │   │   ├── booking/          # Public booking interface (client-facing)
│   │   │   └── onboarding/       # Configuration interview + signup
│   │   ├── components/           # Shared UI components
│   │   ├── hooks/                # Shared React hooks
│   │   ├── api/                  # API client (typed, auto-generated from OpenAPI spec)
│   │   └── types/                # Shared TypeScript types
│   ├── public/
│   └── tests/
│
├── marketplace/                  # RentSalonChairs frontend (React, same toolchain)
│   ├── src/
│   │   ├── listings/             # Salon listing pages (SEO-critical, SSR)
│   │   ├── search/               # City/zip search for available chairs
│   │   ├── claim/                # Owner claims their listing
│   │   └── landing/              # Phase 1 keyword landing page
│   └── tests/
│
├── calculator/                   # Free commission vs rent calculator (standalone)
│   ├── index.html                # CDN-based React, no build step
│   ├── calculator.js             # Pure financial math (Node-compatible)
│   └── blog/                     # Static blog generator + content pipeline
│
├── docs/                         # API documentation, OpenAPI spec, architecture decisions
│   ├── openapi.yaml              # Machine-readable API spec (agents consume this)
│   └── decisions/                # Architecture Decision Records (ADRs)
│
├── contracts/                    # JSON Schemas for cross-service events (scanner ↔ platform)
│   └── schemas/
│
├── infra/                        # Docker Compose, deployment configs
│   ├── docker-compose.yml        # Postgres, Redis, Mailhog, Stripe CLI
│   └── deploy/
│
├── STRATEGY.md                   # Go-to-market plan
├── README.md                     # This file
└── tasks/                        # Claude Code task files (SEO, content, automation)
```

### Why monorepo

- **Agent context:** An AI coding agent can see the API endpoint, the database migration, the React component, and the tests in one session. Crossing repo boundaries breaks context.
- **Shared types:** The API and React frontends share TypeScript types generated from the OpenAPI spec. One source of truth.
- **Atomic changes:** A feature that touches the API and the UI ships as one commit, one PR, one review.
- **Simpler CI:** One pipeline builds and tests everything. No cross-repo dependency coordination.

### What stays outside

| Repo | Why separate |
|---|---|
| `scanner` | Marketing/intelligence. No PII. Different deployment cadence. Produces events consumed by the platform via webhooks (later SQS/SNS). |

**Cross-repo coordination:** Webhooks + `contracts/` schemas now. SQS/SNS with DLQs when scale demands it.

---

## Technical decisions

### Backend: Rails 8 (API-mode)

- **API-only** — no server-rendered HTML. Every capability is a JSON endpoint first.
- **SolidQueue** for background jobs (rent collection chain, notifications, dunning)
- **ActiveRecord** for data modeling and business logic
- **OpenAPI spec** generated from the Rails API — serves as the contract between backend and all frontends, and as documentation for agent integrations

### Frontend: React + TypeScript + Vite

- **React** over Hotwire/Turbo. Rationale: AI coding agents produce dramatically better React on first pass (order of magnitude more training data). The calculator is already React. Multiple distinct interface contexts (stylist mobile, front desk kiosk, owner dashboard, public booking) map naturally to separate React apps sharing a component library.
- **TypeScript** for type safety and agent clarity. Explicit types reduce ambiguity for both human and AI developers.
- **Vite** for build tooling. Fast, minimal config, good React support.
- **React Router** for client-side routing within each app context.
- **API client auto-generated from OpenAPI spec** — typed, always in sync with the backend.

### Real-time

- **ActionCable** (WebSockets) via the Rails API for real-time updates (schedule changes, check-ins, notifications). React frontends connect via a thin WebSocket client.
- This replaces the earlier Turbo Streams plan. With a React frontend, ActionCable is the natural WebSocket layer and the agent already knows how to wire it up.

### Infrastructure

- **Database:** PostgreSQL + Redis (caching + ActionCable + SolidQueue)
- **Payments:** Stripe Connect (Express) for ACH. Stylists already used to ACH.
- **Auth:** Passwordless SMS magic link (or OTP) for stylists. 2FA on payment/bank changes only.
- **Contracts:** DocuSign PowerForms for rental + ACH agreements
- **SMS:** Twilio (default)
- **Hosting:** Heroku initially (API + Vite static builds), AWS when scaling
- **Monitoring:** Sentry for errors, Datadog for performance

### API integrations

| Service | Purpose |
|---|---|
| Square | Appointments, inventory (existing). Thin overlay → gradual migration. |
| Stripe | Payments, ACH, card vault, platform fees |
| Gusto | Payroll automation (Phase 4) |
| Twilio | SMS: magic links, notifications, gap fill, running late |
| DocuSign | Rental agreements, ACH authorization |
| Instagram | Basic Display API for stylist portfolios (Phase 3) |

---

## Phase 0: 60-day cash plan

Get money flowing and save time before building anything fancy.

### Weeks 1–2: Rent automation MVP

- ACH via Stripe Connect (Express)
- Admin calendar for chair assignment; dynamic pricing at reservation time
- Stylist portal: SMS magic link login, balance/history, bank onboarding, 2FA on payment changes
- **KPI:** ≥90% auto-collection; ≤2 manual fixes/week

### Weeks 3–4: Client-led attendance + ops SMS

- Client check-in drives "stylist presence" truth; front desk fallback (kiosk or link)
- Auto-text stylist upon client arrival; late thresholds trigger fee/alert rules
- SMS templates: running late, gap fill, confirm tomorrow
- **KPI:** -10 hours/week ops; +5–10% chair utilization

### Weeks 5–8: Fee revenue beachhead

- New client intake + deposit (Stripe hosted checkout)
- Card-on-file no-show protection; fees limited to this flow
- **KPI:** $2–5k/month platform fees; <1 hour/day ops overhead

---

## Phase 1: Rental Management module (detailed)

### Auth

- Passwordless SMS magic link (or OTP)
- 2FA required only for payment/bank changes

### Reservations & Pricing

- Monthly calendar; primary chair assignment; request extra days
- Configurable pricing via `PricingRule` per `Location` and day-of-week:
  - Default base: $135/day (editable)
  - Optional: bulk discount, last-minute discount, surge
- Price materialized into each `ChairReservation` for auditability

### Automated Rent Collection

SolidQueue chain:

```
Rent::SnapshotWeekJob → Rent::GenerateInvoicesJob → Rent::SendInvoicesJob
→ Rent::InitiateAchJob → Rent::ReconcileSettlementsJob
```

Manual overrides via `LedgerEntry`; idempotent retries; dunning rules.

### Client-led Attendance

Client checks in (QR at desk, SMS link, or kiosk):

```
ClientCheckIn → Notify Stylist → Start grace timer
→ If stylist not present → alert front desk → charge rules applied if needed
```

"No-show to chair" logic bound to reservations; daily rate enforcement with manager override.

### Legal

- DocuSign PowerForms for Rental + ACH
- Agreements stored with envelope IDs, hash, executed_at
- Enforce ACH gating: no pulls until agreement executed

---

## Phase 2: Intelligent Calendar (Square migration)

### Square overlay → gradual migration

1. Start with thin layer: ingest Square appointments via webhooks; show unified availability; write-limited back to Square (notes/metadata only)
2. After 30 days: freeze new bookings in Square; route through Platform
3. Maintain read-only sync for 30 days before sunset

### Interfaces

Each is a separate React app in `web/src/apps/` consuming the same API:

- **Public (booking):** availability-only
- **Front desk:** day ops + booking; client check-in; conflict resolution
- **Owner (management):** analytics and utilization

### Self-service & Notifications

- Time off, add/swap days, recurring schedules with approvals
- Real-time updates via ActionCable → React WebSocket client

### Concurrency

- Unique `(chair_id, date)` constraint
- tsrange overlap constraints when appointments are added

---

## Phase 3: Unified Booking (defer heavy)

- Visual-first booking and Instagram ingestion after Phase 1–2 KPIs hold
- Payment routing: Employees → Square; Independents → Stripe Connect with `application_fee_amount`
- Two-location with location-specific pricing and floating stylists
- Compliance: lead-gen platform fee; no custody of service revenue

---

## Phase 4: Payroll Automation

- Square → ETL → commission calculator → Gusto
- Manager review; exception handling
- Real-time earnings dashboards for stylists (React component in owner app)

---

## Financial projections

### Development investment

- ~750 hours over 6 months
- Opportunity cost: ~$75,000 (at $100/hr)
- External costs: ~$5,000 (services, infrastructure)
- Total: ~$80,000

### Revenue impact (your salons)

| Source | Monthly | Annual |
|---|---|---|
| Chair optimization | $3,000 | $36,000 |
| Platform fees | $5,000 | $60,000 |
| Time savings (80 hrs/mo × $50) | $4,000 | $48,000 |
| Second location | $8,000 | $96,000 |
| **Total** | **$20,000** | **$240,000** |

**ROI: ~200% Year 1**

### SaaS opportunity

| Year | Salons | ARR |
|---|---|---|
| 1 (your salons only) | 2 | $144k value created |
| 2 (10 friendly salons) | 10 | $235k |
| 3 (scale) | 50 | $1.05M |
| 5 (market leader) | 500 | $5–10M |

### Competitive moat

Boulevard can't build this — they don't understand talent development. Summit can't — they're consultants, not technologists. Square can't — they're payment processors, not industry experts. You're not building software; you're codifying 10+ years of salon operations. Competitors can copy features. They can't copy experience.

---

## Security & Compliance

- **Contracts:** enforceable signatures; store envelope IDs/hashes; show agreement status in UI
- **Webhooks:** HMAC-signed; replay protection; idempotent upserts
- **Data boundaries:** Scanner has no PII; Platform owns ACH/PCI; audit every financial change
- **PCI:** Never store card data; use Stripe tokens
- **CCPA:** Compliance from day one

---

## KPIs & Gates

| Milestone | Metric | Gate |
|---|---|---|
| Week 2 | ≥90% rent auto-collected; ≤2 manual fixes/week | |
| Week 4 | -10 hours/week ops; +5–10% utilization | |
| Week 8 | $2–5k/month platform fees; churn <5% | |
| After Phase 2 | Is this saving enough time to continue? | Decide |
| After Phase 3 | Are platform fees worth the complexity? | Decide |
| After Phase 4 | Build for other salons or keep internal? | Decide |

Miss 2 consecutive gates → freeze features; fix leakage.

---

## Two-week execution plan

| Days | Work |
|---|---|
| 1–2 | Scaffold monorepo: Rails 8 API-mode in `api/`, Vite + React in `web/`, Docker Compose in `infra/`. Core tables: `Location`, `Chair`, `Stylist`, `PricingRule`, `ChairReservation`, `Agreement`, `Invoice`, `InvoiceLineItem`, `LedgerEntry`, `Notification`. |
| 3–4 | SMS magic link auth; Stripe Connect Express onboarding; 2FA on payment settings; DocuSign PowerForms (block ACH until executed). Stylist mobile app shell in `web/src/apps/stylist/`. |
| 5–6 | Rent job chain in dry-run; email/SMS invoice breakdowns; dunning templates. |
| 7–8 | Client check-in MVP (QR + SMS link) → stylist alert → grace timer → front desk escalation → rent rules. Front desk React app shell. |
| 9–10 | Pilot with 2–3 stylists; fix critical issues; enable ACH pulls in production. |
| 11–12 | Square read overlay (basic ingestion); unified day view in front desk app; no writes to Square yet. |

---

## Open decisions (non-blocking)

- **SMS vendor:** Twilio vs MessageBird (defaulting Twilio)
- **Magic link vs OTP:** Magic links smoother; OTP fallback if needed
- **Deposit policy:** Flat vs tiered; default $50–$100 for new clients
- **Square sunset:** 30–45 days after overlay stabilizes
- **Marketplace SSR:** RentSalonChairs listing pages need SSR for SEO. Next.js or Remix for the marketplace frontend, or pre-render at build time. Decide when Phase 2 of marketplace begins.
