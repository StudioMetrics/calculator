# SEO & GTM Implementation Tasks — Overview

These task files are designed to be fed to Claude Code sequentially. Each file is a self-contained work unit with clear inputs, outputs, and acceptance criteria.

Read `../STRATEGY.md` for the go-to-market plan and `../README.md` for the engineering implementation plan. These tasks implement the GTM strategy; the README covers the platform build.

## Domain architecture (reference)

| Property | Domain | Purpose |
|---|---|---|
| Studio Metrics (hub) | `studiometrics.com` | Main product site, blog (`/blog/`), app (`app.studiometrics.com`) |
| Calculator (free tool) | `calculator.studiometrics.com` | Lead-gen calculator. This repo. |
| RentSalonChairs (marketplace) | `rentsalonchairs.com` | Chair rental marketplace + keyword landing page |

## Execution order

| # | File | What it does | Depends on |
|---|------|-------------|------------|
| 1 | `01-SEO-FOUNDATION.md` | Meta tags, structured data, sitemap, robots.txt on the calculator | Nothing |
| 2 | `02-BLOG-INFRASTRUCTURE.md` | Static blog pipeline (will deploy to studiometrics.com/blog/) | Task 1 |
| 3 | `03-CONTENT-PIPELINE.md` | Scenario-based content generation using calculator.js | Tasks 1–2 |
| 4 | `04-PRESS-RELEASE.md` | Press release templates and distribution plan | Tasks 1–2 |
| 5 | `05-AUTOMATION.md` | Monitoring, social assets, content scheduling | Tasks 1–3 |
| 6 | `06-MARKETPLACE-FOUNDATION.md` | RentSalonChairs Phase 1: keyword landing page + data scraping plan | Task 1 |

## Architecture decisions

- **No build toolchain for the calculator.** It's CDN-based React. Blog infrastructure is a separate concern that can use a simple Node-based static site generator.
- **Blog builds locally, deploys to studiometrics.com/blog/.** The blog source lives in the calculator repo for now (collocated with calculator code). Output deploys to the main domain. Deployment target is a placeholder until hosting is decided.
- **Content generation uses calculator.js directly.** The math functions are Node-compatible. Blog posts contain real numbers, not made-up examples.
- **Marketplace is Phase 1 only in these tasks.** A keyword landing page and a data-scraping strategy. The full marketplace build is a separate project.

## How to use with Claude Code

Feed one file at a time:

```bash
# From the calculator directory
claude "$(cat tasks/01-SEO-FOUNDATION.md)"
```

Or reference them in a session:

```
Read tasks/01-SEO-FOUNDATION.md and implement everything in it.
```

Review the output of each task before moving to the next. Each file includes verification steps.
