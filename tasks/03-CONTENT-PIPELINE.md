# Task 03: Content Pipeline

Build a system that generates blog post drafts from calculator scenarios. Each post contains real numbers from `calculator.js`. The goal: make scaling from 5 posts to 50 low-effort while keeping content quality high.

## Context

- Read `../STRATEGY.md` for GTM/domain context and `../README.md` for the engineering plan
- `calculator.js` exports: `calculateCommissionToRenter()` and `calculateRenterToCommission()`
- Blog infrastructure from Task 02 is in place at `blog/`
- Blog serves the whole ecosystem — posts span multiple categories
- All blog URLs are `studiometrics.com/blog/{slug}/`

## Tasks

### 1. Create scenario definitions (`blog/scenarios.json`)

An array of scenario objects. Each defines calculator inputs plus blog post metadata. Start with 10–15 scenarios covering the keyword strategy:

```json
[
  {
    "id": "denver-80k",
    "city": "Denver, CO",
    "region": "Mountain West",
    "serviceIncome": 80000,
    "tips": 14400,
    "monthlyRent": 1200,
    "commissionType": "tiered",
    "commissionTiers": [
      { "upTo": 2000, "rate": 0.40 },
      { "upTo": 3500, "rate": 0.45 },
      { "upTo": 5000, "rate": 0.50 },
      { "upTo": Infinity, "rate": 0.55 }
    ],
    "suppliesCostPercent": 0.08,
    "ccFeePercent": 0.03,
    "marketingMonthly": 200,
    "clientRetentionPercent": 0.75,
    "keywords": ["Denver salon income", "booth rent Denver", "commission vs rent Colorado"],
    "angle": "mid-career stylist weighing options in a competitive market",
    "category": "calculator-scenarios"
  }
]
```

Design scenarios that cover:

- **Revenue tiers**: $40K, $60K, $80K, $100K, $120K+ annual services
- **Cities/regions**: Vary rent realistically (LA/NYC expensive, midwest cheaper, southern mid-range)
- **Career stages**: New stylist with small book, mid-career, established with full book
- **Commission structures**: Flat 50/50, tiered, high-commission boutique
- **Angles**: Each scenario should have a distinct editorial angle so posts don't read as clones

Research realistic rent ranges for each city. Don't guess — use plausible numbers. If you're unsure, note it in the scenario and flag for review.

### 2. Build the content generator (`blog/generate.js`)

A Node script that:

1. Reads `blog/scenarios.json`
2. For each scenario, runs inputs through `calculator.js` (require it directly)
3. Generates a markdown blog post using the template structure below
4. Writes to `blog/posts/{id}.md` with proper frontmatter

**Post structure:**

```markdown
---
title: "{Generated — use varied title patterns}"
date: {today's date}
description: "{Generated meta description with city + key finding}"
keywords: {from scenario}
slug: {scenario id}
category: calculator-scenarios
calculator_scenario: {inputs for deep-linking}
links_to:
  - calculator
  - studiometrics
generated: true
---

## The scenario

{1-2 paragraphs: who this person is, what city, what their situation is. Use the `angle` field.}

## The numbers

### As a commission stylist

{Key figures from calculateRenterToCommission:}
- Gross services: {X}
- Commission earned: {X} (effective rate: {X}%)
- Tips kept: {X}
- Total take-home: {X}

### As a booth renter

{Key figures from calculateCommissionToRenter:}
- Gross services: {X} (adjusted for {X}% client retention)
- Minus rent: {X}/year
- Minus supplies: {X}
- Minus CC fees: {X}
- Minus marketing: {X}
- Minus self-employment tax: {X}
- Net take-home: {X}

## The bottom line

{2-3 paragraphs interpreting the numbers. When does renting make sense here? What's the breakeven? What surprised you?}

## What the numbers don't capture

{Brief honest caveat — schedule flexibility, being your own boss, creative control. Builds trust by not being one-sided.}

## Run your own numbers

Every salon is different. Your commission structure, your rent, your expenses — they all change the math.

[Use the free calculator →](https://calculator.studiometrics.com)
```

**Critical:** Narrative sections (scenario setup, bottom line, caveats) must be meaningfully varied across posts. Don't just swap city names. Use the `angle` field. Include multiple template variants or parameterized blocks. Google penalizes thin/duplicate content.

### 3. Generate varied titles

Cycle through title patterns:

- "I Ran the Numbers on ${income} in Services in ${city} — Commission vs Renting"
- "Booth Rent vs Commission in ${city}: What a ${income}/Year Stylist Actually Takes Home"
- "The Real Cost of Booth Renting in ${city} (It's Not Just the Rent)"
- "${income} in Salon Services: Should You Rent or Stay on Commission?"
- "What ${career_stage} Stylists Take Home: A ${city} Comparison"

### 4. Add non-scenario content templates

Not all blog content is calculator-driven. Create template stubs for:

- **`salon-business` category**: "How to evaluate a commission offer" / "What to look for in a rental salon" — these are evergreen guides that link to Studio Metrics
- **`rental-market` category**: "Chair rental rates in ${city}: What to expect in ${year}" — these are keyword-targeted pages that will link to RentSalonChairs once the marketplace exists
- **`industry-insights` category**: Template for quarterly data roundups (used in Task 04 press releases)

These templates don't need to auto-generate full posts — just provide the markdown scaffolding with frontmatter, section structure, and CTA placeholders that a human fills in.

### 5. Add npm scripts and CLI options

```json
{
  "scripts": {
    "generate:posts": "node blog/generate.js",
    "build:blog": "node blog/build.js",
    "blog": "npm run generate:posts && npm run build:blog"
  }
}
```

CLI options:
- `node blog/generate.js --dry-run` — list what would be created, don't write files
- `node blog/generate.js --scenario denver-80k` — generate a single post
- `node blog/generate.js --category calculator-scenarios` — generate all posts in a category

### 6. Add internal linking

Enhance the blog build (Task 02's `build.js`) to:

- Add "Related scenarios" links at the bottom of each calculator-scenario post (2-3 related posts by revenue tier or region)
- Add "Related reading" for cross-category links (a calculator post might link to a salon-business guide)
- This creates an internal link mesh that search engines value

## Verification

1. `npm run generate:posts -- --dry-run` lists all scenarios and filenames
2. `npm run generate:posts -- --scenario denver-80k` creates one post
3. Open the generated markdown — numbers are real (cross-check one calculation against calculator.js manually)
4. `npm run blog` generates all posts and builds the blog
5. Spot-check 3 posts: are titles different? Narrative sections varied? Numbers match inputs?
6. Internal links work: each post links to 2-3 related posts
7. Sitemap includes all new posts
8. Category assignments are correct in frontmatter
