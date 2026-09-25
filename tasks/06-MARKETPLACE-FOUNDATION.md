# Task 06: RentSalonChairs Marketplace Foundation

Build Phase 1 of rentsalonchairs.com: a keyword-optimized landing page and the data infrastructure for seeding the marketplace with real salon listings.

This is the first step toward a two-sided marketplace. Phase 1 is about capturing SEO real estate and building the supply side. The full marketplace (search, browsing, lead management, ACH payments) is a separate project.

## Context

- Read `../STRATEGY.md` for the marketplace strategy and how it fits the ecosystem
- rentsalonchairs.com is owned and will be a separate property from studiometrics.com
- The marketplace eventually connects to Studio Metrics (owners who find renters through RSC become SM customers)
- Phase 1 goals: (1) rank for chair rental keywords, (2) build a database of rental salons, (3) start outreach

## Tasks

### 1. Create the Phase 1 landing page

A single-page static site at rentsalonchairs.com. This is a keyword front door — it needs to rank for "salon chair rental" and related queries while being genuinely useful to both sides of the marketplace.

**Structure:**

```
rentsalonchairs.com/
├── index.html          # Landing page
├── styles.css          # Minimal styles
├── robots.txt
├── sitemap.xml
└── og-image.png        # Social sharing image
```

**Page content:**

1. **Hero**: "Find salon chairs for rent — or list yours." Clear value prop for both sides. Email capture for early access / notifications.

2. **For stylists section**: Looking for a chair to rent? We're building the largest directory of salon chair rentals. Sign up to get notified when listings in your area go live. Include a city/zip input that captures demand-side interest.

3. **For salon owners section**: Have empty chairs? List them for free. We'll help you find qualified renters. Sign up to create a listing. Include a simple "I have chairs to rent" email capture form.

4. **FAQ section** (keyword-rich, structured data):
   - "How much does it cost to rent a salon chair?" (varies by city, $200-$400/week typical, links to calculator)
   - "What should I look for in a chair rental agreement?"
   - "Is booth rental better than commission?" (links to calculator)
   - "How do I find salon chairs for rent near me?"

5. **Footer**: Link to calculator.studiometrics.com, studiometrics.com. "Part of the Studio Metrics ecosystem."

**SEO requirements:**
- Title: "Rent Salon Chairs — Find Chair Rentals or List Your Salon"
- Meta description targeting "salon chair rental" + "rent salon booth"
- FAQ structured data (JSON-LD)
- LocalBusiness or Organization schema for Studio Metrics
- Open Graph tags
- Canonical: `https://rentsalonchairs.com`

**Design notes:** Clean, professional, trustworthy. Salon owners and stylists are the audience — not tech people. Use warm colors, clear typography, simple forms. Match the Studio Metrics visual language enough to feel like the same family without being identical.

### 2. Create the data scraping strategy document (`marketplace/scraping-strategy.md`)

Document the approach for finding rental salons. Do NOT build the scraper — document the strategy for review.

**Data sources to evaluate:**
- Google Maps / Google Business API: Search for salons, look for "booth rental" / "chair rental" in descriptions or reviews
- Yelp API: Similar approach — salon listings mentioning rentals
- Craigslist: "salon chair rental" postings by city
- Facebook Marketplace: salon chair/booth rental listings
- Instagram: #boothrentalavailable, #salonchairforrent hashtags
- Salon directories (SalonCentric, etc.)
- State cosmetology board registrations (public data, varies by state)

**For each source, document:**
- API availability and terms of service
- Rate limits and costs
- Data quality (how reliably does it identify rental salons?)
- Legal considerations (scraping ToS compliance, data usage rights)
- Recommended approach (API vs scraping vs manual)

**Data model for a salon listing:**
```
{
  "businessName": "",
  "address": { "street": "", "city": "", "state": "", "zip": "" },
  "phone": "",
  "email": "",
  "website": "",
  "source": "",          // Where we found them
  "sourceUrl": "",       // Link to the source listing
  "rentalIndicators": [],// What signals suggest they rent chairs
  "confidence": "",      // high/medium/low — how sure are we?
  "dateFound": "",
  "outreachStatus": "pending",
  "notes": ""
}
```

### 3. Create the outreach strategy document (`marketplace/outreach-strategy.md`)

**The approach:** Create a listing on their behalf, then contact them to claim it.

**Outreach email template (draft for review):**

Subject: "We created a free listing for [Salon Name] on RentSalonChairs"

```
Hi [Name / Salon Name team],

We're building RentSalonChairs.com — a directory that helps stylists find salon chair rentals in their area.

We noticed [Salon Name] offers chair/booth rentals [via your Google listing / Yelp page / website], so we created a free listing for you. You can see it at [listing URL].

If you'd like to claim and customize your listing (add photos, pricing, availability), just reply to this email. If you'd rather we remove it, let us know and we will immediately.

Either way, the listing is free — we're building this to help rental salons connect with qualified stylists.

[Name]
Studio Metrics
```

**Key principles:**
- Honest and respectful — they can opt out instantly
- The listing is genuinely free
- No hard sell for Studio Metrics in the first touch
- Follow up once after 7 days, then stop
- Track opt-out rate as a signal for how well this is received

**Legal considerations to document:**
- Using publicly available business information (name, address, phone) — generally permissible
- Need to provide clear opt-out mechanism
- Cannot imply endorsement or partnership
- Cannot use their trademarks/logos without permission
- GDPR/CCPA considerations if collecting email addresses
- CAN-SPAM compliance for outreach emails

### 4. Plan city-specific landing pages (`marketplace/city-pages-plan.md`)

When the marketplace has listings, each city gets its own page: `rentsalonchairs.com/{city}-salon-chair-rental/`

Document:
- **Top 30 cities by salon density** (prioritize where to seed first)
- **URL structure**: `/{city}-{state}-salon-chair-rental/` for clean, keyword-rich URLs
- **Page template**: listing count, average rent range, map, individual listings
- **Schema markup**: LocalBusiness for each listing, ItemList for the city page

Don't build these pages yet — document the plan so the full marketplace build has a spec.

### 5. Connect to the ecosystem

**On the RentSalonChairs landing page:**
- Link to the calculator: "Not sure if renting is right for you? Run the numbers →"
- Link to Studio Metrics: "Already managing renters? See how Studio Metrics can help →"

**On the calculator (update from Task 01):**
- Add a link in the renter tab: "Looking for chairs to rent? Check RentSalonChairs.com →"

**On the blog (update build template from Task 02):**
- `rental-market` category posts link to rentsalonchairs.com

## Verification

1. Landing page loads, is mobile-responsive, and looks professional
2. FAQ structured data validates in Rich Results Test
3. Email capture forms work (even if just mailto: links for Phase 1)
4. Scraping strategy document covers at least 4 data sources with legal analysis
5. Outreach email is respectful and includes clear opt-out
6. City pages plan identifies top 30 target cities
7. Cross-links to calculator and studiometrics.com are present
8. robots.txt and sitemap.xml are in place

## What Phase 2 looks like (for reference, do not build)

- Actual listing pages with salon details, photos, pricing
- Stylist search by city/zip
- Salon owner dashboard to manage their listing
- Lead routing (stylist inquires → salon owner gets notified)
- ACH payment integration (take a % of rental fees)
- Reviews/ratings
- Integration with Studio Metrics rental management module
