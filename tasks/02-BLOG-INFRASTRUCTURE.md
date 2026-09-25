# Task 02: Blog Infrastructure

Stand up a lightweight static blog. The source lives in this repo. The output deploys to `studiometrics.com/blog/` — the parent brand domain where all content authority accumulates.

## Context

- Read `../STRATEGY.md` for GTM/domain context and `../README.md` for the engineering plan
- The calculator is a single `index.html` with no build toolchain
- The blog serves the entire Studio Metrics ecosystem, not just the calculator
- Posts link to the calculator, to future product pages, and eventually to RentSalonChairs
- Blog URL structure: `studiometrics.com/blog/{slug}/`
- Keep it dead simple — no CMS, no database, no JS framework for the blog itself
- Salon professionals are low-tech; if they somehow end up reading the blog source, it shouldn't be intimidating

## Architecture

Use a **minimal custom Node static site generator** (~100 lines). Reasoning: the project has no build toolchain and we don't want to add one. A script that reads markdown and wraps it in HTML is sufficient. No new binary dependencies.

If you believe Hugo or another SSG is significantly better for this use case, explain why before proceeding. Otherwise, build the minimal generator.

## Tasks

### 1. Create the blog directory structure

```
blog/
├── build.js              # Static site generator
├── templates/
│   ├── post.html         # Single post template
│   └── index.html        # Blog index template
├── posts/                # Markdown source files
│   └── .gitkeep
├── dist/                 # Generated HTML output (gitignored)
│   └── .gitkeep
└── assets/
    └── blog.css          # Blog styles
```

### 2. Build the static site generator (`blog/build.js`)

A Node script that:

1. Reads all `.md` files from `blog/posts/`
2. Parses YAML frontmatter (title, date, description, keywords, slug, category)
3. Converts markdown body to HTML (use `marked` — add as devDependency)
4. Wraps each post in `templates/post.html`
5. Generates `blog/dist/index.html` — list of all posts, newest first
6. Generates `blog/dist/{slug}/index.html` for each post (clean URLs)
7. Outputs a count of posts built

Frontmatter format:

```yaml
---
title: "I Ran the Numbers on $80K in Services — Here's What Commission vs Renting Really Looks Like"
date: 2026-03-01
description: "A real scenario comparison using Denver salon costs."
keywords:
  - commission vs booth rent
  - salon income comparison
slug: 80k-services-commission-vs-renting
category: calculator-scenarios  # One of: calculator-scenarios, salon-business, industry-insights, rental-market
calculator_scenario:            # Optional — links back to calculator with pre-filled values
  tab: commission-to-renter
  serviceIncome: 80000
  tips: 14400
links_to:                       # Which ecosystem properties this post connects to
  - calculator
  - studiometrics
---
```

The `category` field enables the blog to serve the whole ecosystem:
- `calculator-scenarios` — commission vs rent analysis, links to calculator
- `salon-business` — operations, management, HR topics, links to Studio Metrics product
- `industry-insights` — data-driven trends, press release content
- `rental-market` — chair rental market analysis, links to rentsalonchairs.com

### 3. Create the blog post template (`templates/post.html`)

Requirements:

- Clean, readable typography (Inter font stack to match calculator)
- Tailwind via CDN (consistency with calculator) or simple custom CSS
- Dynamic `<head>` with meta tags from frontmatter:
  - `<title>`, `<meta name="description">`, `<meta name="keywords">`
  - Open Graph tags with `og:url` pointing to `https://studiometrics.com/blog/{slug}/`
  - Canonical URL: `https://studiometrics.com/blog/{slug}/`
- Article structured data (JSON-LD `Article` schema) with publisher as Studio Metrics
- CTA block that varies by category:
  - `calculator-scenarios`: "Run your own numbers →" linking to `calculator.studiometrics.com`
  - `salon-business`: "See how Studio Metrics helps →" linking to `studiometrics.com`
  - `rental-market`: "Find chair rentals →" linking to `rentsalonchairs.com`
- If the post has `calculator_scenario` in frontmatter, build a deep link to the calculator with pre-filled values
- Navigation: blog index link, calculator link, Studio Metrics link
- Footer: "Built by Studio Metrics" with links to the ecosystem

### 4. Create the blog index template (`templates/index.html`)

Requirements:

- Lists all posts with title, date, description, category badge, and link
- Sorted newest-first
- Filterable by category (simple CSS/JS toggle, nothing heavy)
- Title: "Salon Business Insights — Studio Metrics"
- Description: "Data-driven articles on commission vs booth rental, salon operations, and the chair rental market."
- Meta tags and structured data matching the post template approach
- Hero section: this isn't generic salon advice — it's backed by real calculator data and industry analysis

### 5. Add npm scripts to `package.json`

```json
{
  "scripts": {
    "build:blog": "node blog/build.js",
    "test": "vitest"
  }
}
```

### 6. Create one seed post

Write a real blog post targeting "commission vs booth rent calculator." This is the foundational post:

- Explain what the calculator does and why it exists
- Walk through a specific scenario (e.g., $6,000/month stylist in a mid-cost city)
- Show actual numbers generated by `calculator.js` functions
- Link to the calculator with a clear CTA
- 800–1200 words
- Written for stylists, not techies or marketers
- Direct and useful, no fluff

Category: `calculator-scenarios`
Slug: `commission-vs-booth-rent-the-real-math`

### 7. Update sitemap generation

The blog build script should generate a `sitemap-blog.xml` alongside the blog output, containing:

- The blog index (`https://studiometrics.com/blog/`)
- Each blog post (`https://studiometrics.com/blog/{slug}/`)

Note: The calculator's `sitemap.xml` (from Task 01) stays separate. When deployed, these can be combined into a sitemap index, or the studiometrics.com site can reference both.

### 8. Cross-link calculator and blog

Add a subtle link in the calculator's `index.html` footer pointing to `https://studiometrics.com/blog/`. Something like "Read the research →" or "See real scenarios →". Don't disrupt the calculator UX.

## Deployment notes

The blog builds to `blog/dist/`. This directory should be deployed to `studiometrics.com/blog/`. The deployment mechanism depends on how studiometrics.com is hosted:

- If static hosting (Netlify, Vercel, GitHub Pages): copy `blog/dist/` contents to the `/blog/` directory
- If behind a server: configure routing to serve `blog/dist/` at `/blog/`

Leave deployment as a manual step for now. Task 05 adds automation.

## Verification

1. `npm run build:blog` completes without errors, outputs post count
2. `blog/dist/index.html` renders in browser, shows the seed post
3. Click through to seed post — renders cleanly with all meta tags
4. Validate structured data with Rich Results Test
5. `sitemap-blog.xml` includes all blog URLs
6. Calculator-to-blog link works
7. Seed post CTA links to the calculator
8. Category badge appears on the index page
