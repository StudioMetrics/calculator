# Task 05: Automation & Monitoring

Turn the content and SEO work into repeatable automated workflows. These make scaling from 10 posts to 50 low-effort, and keep the strategy on track with monitoring.

## Context

- Read `../STRATEGY.md` for GTM/domain context and `../README.md` for the engineering plan
- Blog infrastructure and content pipeline are in place (Tasks 02–03)
- Press release system exists (Task 04)
- Calculator has SEO foundation (Task 01)
- Three domains in play: studiometrics.com, calculator.studiometrics.com, rentsalonchairs.com

## Tasks

### 1. SEO monitoring script (`scripts/seo-monitor.js`)

A Node script for weekly SEO health checks.

**On-site health (build this now):**
- All blog post URLs return 200 (fetch each URL from sitemap)
- Sitemap is valid and includes all published posts
- Structured data is parseable on each page (validate JSON-LD)
- No broken internal links between posts
- Meta tags present on all pages (title, description, canonical)

**Search Console integration (document setup, implement if straightforward):**
- Google Search Console API: impressions, clicks, average position for target keywords
- Week-over-week position changes
- New backlinks detected
- Top pages by traffic

**Output:** Markdown report at `reports/seo-{date}.md`:
- Health check results (pass/fail per page)
- Keyword position changes (if Search Console is connected)
- Issues found (broken links, missing meta, etc.)
- Suggested actions ("Post X ranking #15 for keyword Y — consider expanding")

If Search Console API is heavyweight to set up, implement the on-site health checks first and document the Search Console steps in `scripts/README.md` for manual setup later.

### 2. Social asset generator (`scripts/social-assets.js`)

For each blog post, generate:

**Open Graph image (1200x630):**
- Post title + one key stat on a branded template
- Use `canvas` (node-canvas) or SVG-to-PNG approach
- Studio Metrics branding, clean typography
- Save to `blog/dist/{slug}/og-image.png`
- Update the blog build template to reference the OG image in meta tags

**Social copy file (`blog/dist/{slug}/social.md`):**
- 3 short-form post variations (Twitter/X length)
- 1 longer post (LinkedIn/Facebook length)
- Each includes the post URL and a hook
- Written for salon professionals, not marketers
- Vary the hooks: question, stat, contrarian take, scenario teaser

Run as part of the blog build pipeline:
```json
{
  "scripts": {
    "generate:social": "node scripts/social-assets.js",
    "blog": "npm run generate:posts && npm run build:blog && npm run generate:social"
  }
}
```

### 3. Quarterly insights report generator (`scripts/quarterly-report.js`)

Aggregates data from all scenario posts and generates:

1. **Blog post draft** (industry-insights category): "Salon Income Report: What the Numbers Say About Commission vs Renting in [Quarter/Year]"
   - Aggregate findings across cities/revenue tiers
   - Which scenarios favor commission? Which favor renting?
   - Geographic trends
   - Breakeven analysis

2. **Press release draft** (using template from Task 04):
   - Lead with the most quotable finding
   - Include 2-3 supporting data points
   - Ready for review and distribution

**Input:** All `calculator-scenarios` posts in `blog/posts/` (reads frontmatter + generated numbers)
**Output:** `press/quarterly-{date}-draft.md` and `blog/posts/quarterly-{date}-insights.md`

### 4. Content calendar generator (`scripts/content-calendar.js`)

Reads `blog/scenarios.json` and existing posts, then generates:

- List of unpublished scenarios
- Suggested publishing schedule (2 posts/week)
- Social posting cadence per published post (publish day, +3 days, +7 days, +14 days)
- Upcoming quarterly report dates

**Output:** `blog/content-calendar.md` — a markdown file that serves as the editorial calendar.

### 5. Blog rebuild automation

**Option A — Git hook (preferred for simplicity):**
A pre-commit hook that runs `npm run build:blog` when files in `blog/posts/` change.

**Option B — File watcher:**
`npm run blog:watch` using chokidar for local dev.

Implement whichever is simpler. Document the choice.

### 6. Deployment script (`scripts/deploy.sh`)

Shell script that:

1. Runs `npm run blog` (full pipeline: generate + build + social assets)
2. Validates output (no broken links, all expected posts present)
3. Placeholder for actual deployment command (rsync, netlify deploy, vercel, gh-pages — depends on hosting)
4. Outputs summary: posts published, assets generated, any warnings

### 7. Document future automation (`scripts/FUTURE.md`)

Things to build later but document now:

- **Email capture integration**: Automated nurture sequences when email gating is added to the calculator. Segment by owner vs stylist, different content paths.
- **A/B title testing**: Track which title patterns rank better, adjust generation templates.
- **Competitor monitoring**: Track ranking changes for competitors on the same keywords.
- **AI search monitoring**: Check if calculator/blog posts appear in Perplexity, ChatGPT search, Google AI Overviews for target queries.
- **Marketplace data integration**: When RentSalonChairs has listing data, feed it into quarterly reports for richer insights.
- **Automated social posting**: Connect social copy generator to Buffer/Hootsuite/etc. for scheduled posting.

## Verification

1. `npm run blog` — full pipeline runs without errors
2. Social assets generated for each post (OG images + social copy)
3. SEO monitor produces a health report with no false positives
4. Content calendar shows unpublished scenarios and a schedule
5. Quarterly report generator produces both a blog draft and press release draft
6. Deployment script validates output before deploy step
7. `scripts/FUTURE.md` documents all planned-but-not-built automation
