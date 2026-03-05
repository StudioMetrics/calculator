# Task 01: SEO Foundation

Fix the calculator's on-page SEO infrastructure. This is the prerequisite for everything else.

## Context

- Read `../STRATEGY.md` for GTM/domain context and `../README.md` for the engineering plan
- `index.html` is a single-page React app (CDN-based, no build step)
- Currently uses hash-based routing (`#renter-to-commission`, `#commission-to-renter`, `#settings`)
- No meta tags beyond charset and viewport
- No sitemap, robots.txt, or structured data
- The calculator lives at `calculator.studiometrics.com`
- The blog will live at `studiometrics.com/blog/` (separate domain, built in Task 02)
- The parent brand site is `studiometrics.com`

## Tasks

### 1. Add comprehensive meta tags to `index.html`

Add these to the `<head>`:

```html
<!-- Primary Meta -->
<title>Commission vs Booth Rent Calculator — Studio Metrics</title>
<meta name="description" content="Free calculator for salon stylists and owners. Compare take-home pay between commission and booth rental. Accounts for SE tax, expenses, client retention, and real costs.">
<meta name="keywords" content="commission vs booth rent calculator, salon chair rental vs commission, booth rent vs commission stylist, should I rent or do commission salon">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="Commission vs Booth Rent Calculator — Studio Metrics">
<meta property="og:description" content="Free calculator for salon stylists and owners. Compare take-home pay between commission and booth rental.">
<meta property="og:url" content="https://calculator.studiometrics.com">
<meta property="og:site_name" content="Studio Metrics">
<!-- og:image — create a 1200x630 social card image later -->

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Commission vs Booth Rent Calculator — Studio Metrics">
<meta name="twitter:description" content="Compare take-home pay: commission vs booth rental. Free salon calculator with real math.">

<!-- Canonical -->
<link rel="canonical" href="https://calculator.studiometrics.com">
```

### 2. Add structured data (JSON-LD)

Add FAQ schema. These Q&A pairs map directly to target keywords:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Should I rent a salon chair or work on commission?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It depends on your service revenue, client base size, and local costs. Commission stylists earn a percentage of services but get marketing, supplies, and front desk support included. Booth renters keep more per dollar but pay rent, self-employment tax (15.3%), and all business expenses. Use our free calculator to compare your specific numbers."
      }
    },
    {
      "@type": "Question",
      "name": "How much do booth renters really make compared to commission stylists?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Booth renters often look like they keep more money (100% of service revenue minus rent), but after accounting for self-employment tax, supplies, credit card fees, marketing, and the cost of building a client base, the gap narrows significantly. For stylists doing under $5,000/month in services, commission often nets more take-home pay."
      }
    },
    {
      "@type": "Question",
      "name": "What is self-employment tax and how does it affect booth renters?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Self-employment tax is the 15.3% FICA tax that independent contractors (including booth renters) pay on net earnings. W-2 commission stylists only pay half (7.65%) because the salon covers the employer portion. This tax alone can represent thousands of dollars per year in additional cost for renters."
      }
    },
    {
      "@type": "Question",
      "name": "What expenses do booth renters have that commission stylists don't?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Booth renters typically pay for: chair/station rent, their own product and supplies, credit card processing fees (2.5-3.5%), marketing and advertising, booking software, liability insurance, and continuing education. Commission salons usually cover all of these as part of the commission split."
      }
    }
  ]
}
```

Also add WebApplication schema:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Commission vs Booth Rent Calculator",
  "description": "Free calculator for salon professionals to compare take-home pay between commission and booth rental models.",
  "url": "https://calculator.studiometrics.com",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "creator": {
    "@type": "Organization",
    "name": "Studio Metrics",
    "url": "https://studiometrics.com"
  }
}
```

### 3. Create `robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://calculator.studiometrics.com/sitemap.xml
```

### 4. Create `sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://calculator.studiometrics.com/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 5. Evaluate hash routing vs path routing

Currently the app uses `window.location.hash` for tab switching. Path-based routes are better for SEO. Evaluate the current routing implementation and recommend the lowest-effort approach:

- If simple: convert to path-based routing with appropriate server config notes
- If complex: keep hash routing, add `<link rel="alternate">` tags, and document what server config would be needed later

### 6. Add a `<noscript>` fallback

Search engines sometimes don't execute JavaScript. Add a `<noscript>` block with static content that includes target keywords:

```html
<noscript>
  <div style="max-width: 800px; margin: 40px auto; padding: 20px; font-family: sans-serif;">
    <h1>Commission vs Booth Rent Calculator — Studio Metrics</h1>
    <p>This free calculator helps salon stylists and owners compare take-home pay between working on commission and renting a booth (chair rental).</p>
    <h2>What this calculator does</h2>
    <p>Enter your service revenue, tip income, and expenses to see a side-by-side comparison. The calculator accounts for self-employment tax (15.3% for 1099 renters vs 7.65% FICA for W-2 commission), salon investments like marketing and front desk support, product costs, credit card fees, and client retention risk when switching models.</p>
    <h2>Who is this for?</h2>
    <p><strong>Stylists</strong> evaluating whether to stay on commission or go independent with booth rental.</p>
    <p><strong>Salon owners</strong> running scenarios to make competitive offers to stylists.</p>
    <p>Please enable JavaScript to use the interactive calculator.</p>
  </div>
</noscript>
```

### 7. Add cross-links to the ecosystem

Add subtle navigation/footer links:

- "Read the research →" linking to `https://studiometrics.com/blog/` (the blog, once it exists)
- "Find chair rentals →" linking to `https://rentsalonchairs.com` (once Phase 1 is live)
- "Studio Metrics" brand link to `https://studiometrics.com`

Implement these as a small footer or nav bar that doesn't disrupt the calculator UX. Use `rel="noopener"` on external links. Links to properties that aren't live yet should be added as commented-out HTML with a `TODO` note.

## Verification

1. View page source — confirm all meta tags are present and correct
2. Validate structured data with Google's Rich Results Test
3. Confirm `robots.txt` is accessible at the root
4. Confirm `sitemap.xml` is valid XML (use an XML validator)
5. Test Open Graph tags with Facebook Sharing Debugger or similar
6. Disable JavaScript in the browser — confirm `<noscript>` content renders
7. Check that cross-links point to correct domains
