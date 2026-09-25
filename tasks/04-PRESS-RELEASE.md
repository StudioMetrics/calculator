# Task 04: Press Release & Citation Strategy

Create a press release system. The goal isn't backlinks from the release itself — it's downstream pickup by beauty industry publications, which creates the citation trail that traditional and AI-powered search engines follow.

## Context

- Read `../STRATEGY.md` for GTM/domain context
- Studio Metrics is one product (configurable modules, not separate tools)
- The calculator is free and genuinely useful — that's the hook
- Target: beauty industry trade publications, salon business bloggers, beauty school newsletters
- This is a resource announcement, not a product launch

## Tasks

### 1. Draft the initial press release (`press/release-001-launch.md`)

Standard PR structure in markdown:

**Headline:** Focus on utility, not brand.
"Free Online Calculator Helps Salon Stylists Compare Commission vs Booth Rental Income"

**Subhead:** Add specificity.
"New tool accounts for self-employment tax, expenses, and client retention — factors most stylists overlook when choosing between commission and renting"

**Body:**

1. **Lead** (who/what/where/when/why): New free calculator at calculator.studiometrics.com helps salon professionals make data-driven career decisions.

2. **The problem**: Stylists making this decision rely on napkin math. They underestimate costs like SE tax (15.3% for 1099 vs 7.65% for W-2), marketing, and client retention risk.

3. **What the tool does**: Customizable inputs, side-by-side comparison, tiered commission support, full COGS breakdown. Salon owners configure it with their numbers and share with their team.

4. **Compelling data point**: Run one scenario from Task 03 and pull a specific, quotable stat. Example: "A stylist earning $80,000 in annual services in Denver would take home $X on commission vs $Y renting — a difference of $Z that most stylists don't see until it's too late."

5. **Quote**: From Studio Metrics founder. Keep it human: built this because you run a salon and watched stylists make this decision without real data.

6. **About Studio Metrics**: Salon business tools built by people who actually run salons. One platform, configured to how you run your shop.

7. **Contact + links**: calculator.studiometrics.com, studiometrics.com

**Tone:** Informational. Trade publications run useful resources; they don't run ads.

### 2. Create a reusable press release template (`press/template.md`)

For the quarterly "salon industry insights" releases:

```markdown
# [HEADLINE — lead with a data point]

## [SUBHEAD — context and significance]

**[CITY, STATE] — [DATE]** — [Lead paragraph: who, what, finding, significance]

### The Data

[2-3 key findings with specific numbers. Pull from calculator scenarios or aggregated blog data.]

### What This Means for Salon Professionals

[2-3 paragraphs interpreting the data. Who should care and why.]

### Methodology

[Brief: how the analysis was done. Reference the calculator, scenario parameters, cities covered.]

### About Studio Metrics

Studio Metrics is a salon business platform built by salon owners. It helps salons manage booking, reporting, HR, client relationships, and chair rentals — configured to how each salon actually runs. The free Commission vs Booth Rent Calculator is available at calculator.studiometrics.com.

### Contact

[Name, email, website]
```

### 3. Compile a media target list (`press/media-targets.md`)

**Beauty industry trade publications:**
- Modern Salon
- Behind the Chair
- American Salon
- Salon Today
- Beauty Launchpad

**Salon business / coaching:**
- Salon coaches with newsletters or blogs
- Beauty school career services departments
- Salon owner Facebook group admins

**Small business / freelancer press:**
- Outlets covering gig economy, 1099 vs W-2 decisions
- Small business finance blogs

**Format per entry:**
```markdown
### [Publication Name]
- **URL**: [publication URL]
- **Relevance**: Why they'd care
- **Submission**: How to submit (press page, editor email, tip line)
- **Angle**: What framing would resonate with their audience
- **Status**: [NEEDS RESEARCH] or [READY]
```

Do NOT fabricate contact info. Use publicly available submission pages only. Mark anything that needs manual research as `[NEEDS RESEARCH]`.

### 4. Create a distribution checklist (`press/distribution-checklist.md`)

Step-by-step for each release:

1. Publish on the blog at `studiometrics.com/blog/` (industry-insights category)
2. Submit to free distribution (PRLog, OpenPR)
3. Submit to paid distribution if budget allows (PRWeb, Newswire — note approximate costs)
4. Direct outreach to target list (personalized pitch per publication, not mass blast)
5. Share in communities (Reddit, Facebook groups) as a resource, not a press release
6. Social media (post the blog version, not the raw PR)
7. Follow up with any publications that showed interest

Include timing notes: best days for beauty industry press, lead times for trade publications.

### 5. Plan the quarterly cycle

Document in `press/quarterly-plan.md`:

- Q1: Launch release (this one — "free calculator helps stylists compare income models")
- Q2: First data release ("We analyzed commission vs rental scenarios across 15 US cities — here's what the numbers show")
- Q3: Marketplace angle (if RentSalonChairs is live: "Chair rental demand is rising — here's where and why")
- Q4: Year-in-review ("What salon income data told us about the commission vs rental debate in [year]")

Each quarter, the process is: run the quarterly report generator (Task 05), review output, publish blog post, distribute press release.

## Verification

1. Draft press release reads as informational, not salesy
2. At least one specific, quotable data point from the calculator
3. Media targets are real publications with real submission methods (or marked [NEEDS RESEARCH])
4. Distribution checklist covers free and paid channels
5. Template is reusable for quarterly releases
6. Quarterly plan has distinct angles for each quarter
