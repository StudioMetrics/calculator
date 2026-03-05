# Studio Metrics — GTM Strategy

Internal planning doc. Not for public distribution.

---

## Product vision

Studio Metrics is **one product** — a salon business platform that salon owners configure to match how they run their shop. Not a suite of separate tools. Not a one-size-fits-all SaaS. Salon owners go through a configuration interview at signup that identifies what they need, and they pay for what they use.

Salon professionals are low-tech. They don't want to evaluate five tools and figure out how they connect. They want one place that understands their business.

### Product modules

Modules are activated based on the salon's needs, surfaced through the onboarding interview. Pricing scales with what's active.

- **Rental Management** (the capability formerly planned as "RentSalonChairs"): Lease tracking, payment collection, chair availability, renter onboarding. For salons that rent chairs/stations.
- **Booking**: Unifies rental and commission stylist books in Square (and eventually replaces Square's booking stack entirely). Better client-facing booking interface.
- **KPI Reports**: Specialized salon metrics — revenue per chair, stylist utilization, retention rates, service mix analysis. The numbers salon owners actually need, not generic POS reports. Currently live as a Square report exporter.
- **HR / Management**: Onboarding, scheduling, commission tracking, performance reviews. One place for the people side of running a salon.
- **Client CRM**: Visit history, preferences, spend patterns, stylist notes. The relationship story over time.

### Onboarding interview (configuration-based signup)

Instead of rigid pricing tiers, new users answer questions about how they run their salon:

- Do you have booth renters, commission stylists, or both?
- Do you need client booking?
- Do you want business reporting and KPIs?
- How many stylists/chairs?
- Do you manage HR (scheduling, onboarding, reviews)?

Their answers activate the relevant modules and set their price. This respects the diversity of salon business models while keeping the experience simple.

---

## Domain & brand architecture

Three properties, one ecosystem. Each has a distinct purpose and SEO surface area.

All properties are built from a single monorepo (`studio-metrics/`). See `README.md` for the full repo structure and technical architecture (Rails 8 API-mode + React + TypeScript).

### studiometrics.com — The hub

The main product and brand. Everything rolls up here.

- **studiometrics.com**: Marketing site, pricing, product pages, signup
- **studiometrics.com/blog/**: Content marketing hub. All blog content lives here to build domain authority for the parent brand. Covers commission vs renting analysis, salon business strategy, industry insights, product updates.
- **app.studiometrics.com**: The actual SaaS product (behind auth). Rails API + React frontends for each interface context (stylist mobile, front desk, owner dashboard, public booking).

This is where all long-term SEO authority accumulates. Every blog post, every backlink, every press mention strengthens studiometrics.com.

### calculator.studiometrics.com — The free tool

Lead-gen entry point. A genuinely useful commission vs renting calculator that salon owners can customize and share with their stylists. Free to use, no account required. Lives in `calculator/` within the monorepo but deploys independently.

- Clearly Studio Metrics branded ("Powered by Studio Metrics" or similar)
- Captures attention and email addresses
- Links to the blog for deeper analysis
- Links to the main site for product info
- SEO target: "commission vs booth rent calculator" and all variations

### rentsalonchairs.com — The marketplace (and keyword front door)

A two-sided marketplace where salon owners list available chairs/stations and stylists find rental opportunities. Also serves as a powerful keyword-capture property for "salon chair rental" queries.

**Phase 1 — Keyword landing page**: A single-page site that ranks for rental-related keywords and funnels visitors to Studio Metrics. Describes the rental management problem and positions SM as the solution.

**Phase 2 — Seeded marketplace**: Scrape publicly available data for salons that appear to offer chair rentals. Create listings on their behalf. Outreach: "We found your salon offers chair rentals. We created a free listing for you — claim it to manage leads, or we'll take it down." This is the Yelp/Zillow playbook for bootstrapping supply.

**Phase 3 — Active marketplace**: Owners post listings, stylists browse by city. Revenue model: percentage of rental fees via ACH. Every listing is a page that ranks for "{city} salon chair rental" — thousands of long-tail keywords.

**Strategic role**: The marketplace is the top-of-funnel for Studio Metrics SaaS. Owners who manage rental leads through RentSalonChairs are natural upsell candidates for the full operational toolkit.

---

## Go-to-market: Three entry points, one funnel

### Entry point 1: The calculator (awareness + education)

**Target keywords** (high-intent, low-competition):
- "commission vs booth rent calculator"
- "should I rent or do commission salon"
- "salon chair rental vs commission income"
- "booth rent vs commission stylist comparison"
- "how much do booth renters really make"

These are underserved queries with clear buyer intent. People searching this are actively making a career or business decision.

**Lead capture**: Email gate for saving results or getting a custom PDF report. Captures both stylists AND salon owners — they hit the same tool for different reasons.

- **Stylists**: Evaluating their options, comparing offers
- **Owners**: Running scenarios before making an offer to a stylist

Different nurture paths for each segment.

**Salon owner distribution**: Owners customize with Settings (their salon name, their commission tiers, their investments) → share the link with their stylists. Every owner who adopts it becomes an organic distribution partner. They're doing our marketing for us because the tool helps them make their case.

### Entry point 2: The blog (organic search + authority)

Lives at **studiometrics.com/blog/**. Serves the entire product ecosystem.

**Content flywheel**: Each calculator scenario is a content piece:
- Blog posts: "I ran the numbers on $100K in services — here's what commission vs renting really looks like"
- TikTok / Instagram Reels: Screen-record the calculator, narrate the results
- Carousel posts: Side-by-side comparison graphics pulled from calculator output

The calculator makes the content credible. The content drives traffic to the calculator. The blog builds domain authority for studiometrics.com.

**Content categories**:
- Commission vs renting analysis (links to calculator)
- Salon business operations (links to Studio Metrics product pages)
- Chair rental market insights (links to rentsalonchairs.com)
- Industry data and trends (press release fodder, builds thought leadership)

### Entry point 3: The marketplace (demand capture)

**RentSalonChairs.com** captures people who are already looking for chair rentals — both stylists searching for chairs and owners looking to fill them.

**Target keywords** (marketplace SEO):
- "salon chair rental {city}"
- "rent salon booth near me"
- "salon station for rent {city}"
- "chair rental salon {city}"

Every listing page is a keyword-targeted page. City index pages rank for geo-modified queries. This scales SEO surface area dramatically — from dozens of pages (blog) to thousands (listings).

### Conversion funnel

```
Free calculator ─────────────────────┐
  → Email capture (save results)     │
  → Nurture with salon content       │
                                     ├──→ Studio Metrics signup
Blog content ────────────────────────┤      (configuration interview)
  → SEO traffic                      │      → Activate relevant modules
  → Build authority + trust          │      → Price based on usage
                                     │
RentSalonChairs marketplace ─────────┘
  → Owners list chairs
  → Manage rental leads
  → Upsell to full platform
```

### Community seeding

- Facebook groups (salon owner communities, stylist career groups)
- Reddit: r/hairstylist, r/smallbusiness
- Salon owner forums and Slack communities

The tool is genuinely useful — share it as a resource, not a sales pitch. Let the value speak.

### Partnerships

- **Salon product distributors**: They already have relationships with every salon. Co-market the tool.
- **Beauty school career services**: Students choosing between commission and renting need exactly this.
- **Salon coaches / consultants**: They advise on business models. This tool supports their recommendations with data.

### Press & AI search strategy

Press releases serve two purposes: traditional media pickup and AI agent citation.

**Approach**: Quarterly "salon industry insights" releases using data from calculator scenarios and marketplace activity. Lead with specific, quotable numbers ("Stylists in the South are 40% more likely to prefer booth rental"). Data-driven PR gets pickup because publications love citing numbers.

**AI search optimization**: Structured data (FAQ schema, WebApplication schema), direct question-and-answer content formatting, and a citation trail from trade publications all improve visibility in Perplexity, ChatGPT search, and Google AI Overviews.

---

## Metrics to track

| Metric | What it tells us |
|---|---|
| Calculator visits | Top-of-funnel awareness |
| Time on page / scenarios run | Engagement quality |
| Email captures | Lead volume |
| Owner vs stylist segmentation | Funnel health |
| Salon owner adoption (custom Settings) | Calculator distribution network growth |
| Blog traffic by post | Content strategy effectiveness |
| Keyword rankings (calculator + blog) | SEO momentum |
| RentSalonChairs listings created | Marketplace supply |
| RentSalonChairs stylist inquiries | Marketplace demand |
| Conversion to SM signup | Revenue pipeline |
| Module activation by type | Product-market fit signal |
| Referral sources | Which channels actually work |
