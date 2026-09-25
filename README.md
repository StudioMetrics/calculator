# Studio Metrics Calculator

Free commission vs renting calculator for salon stylists and owners.

## Why this exists

I run a hybrid rental/commission salon. I built this to have honest, number-driven conversations with stylists who are evaluating commission vs renting a chair. Commission is better for the salon — you control quality, output, and client experience, and you make more money — but convincing a stylist used to the independence of renting isn't easy. This tool lets the numbers speak.

It's also offered free publicly as the first entry point into the Studio Metrics ecosystem. See [Product Vision](#product-vision) below and [STRATEGY.md](STRATEGY.md) for the full plan.

## What it does

Three views, accessible via tab navigation or direct hash links:

### Renter → Commission (default)

Shows renters what they'd actually gain by switching to commission. Highlights the hidden costs of renting that most stylists don't think about:
- **SE tax penalty**: 1099 renters pay 15.3% self-employment tax vs 7.65% FICA as a W-2 commission employee — that's real money
- **Self-marketing burden**: Renters pay for their own ads, social, Yelp — the salon covers all of this for commission stylists
- **Admin overhead**: Booking, front desk, supplies, CC processing — all handled by the salon

Shows a side-by-side comparison of take-home pay with full cost transparency.

### Commission → Renter

Shows commission stylists the real cost of going independent. The interactive **client retention slider** models the risk of losing clients when you leave — because not everyone follows you. Calculates true renter income accounting for lost clients, SE tax, and self-funded expenses.

### Settings

Fully configurable for any salon:
- Commission structure: flat rate or tiered brackets
- Salon investments: marketing spend, laundry, front desk costs, new clients/month
- Branding: salon name and tool name
- All settings persist in localStorage

## Architecture

**Single `index.html`** — React 18 + Tailwind CSS + Babel via CDN, no build step.

Why no build toolchain:
- **Deploy anywhere**: GitHub Pages, Netlify, any static host, embeddable via iframe
- **Zero config**: No npm install needed to run — just open the file or serve it
- **Rapid iteration**: Change the file, refresh the browser

Supporting files:
- **`calculator.js`** — Extracted pure financial logic (SE tax, commission calculations, COGS allocation). Testable and importable independently.
- **`calculator.test.js`** — Unit tests via Vitest covering both calculator directions
- **`package.json`** — Dev dependency on Vitest for testing only

Other details:
- **State persistence**: All inputs and settings survive refresh via localStorage
- **Hash routing**: Direct tab linking — `#renter-to-commission`, `#commission-to-renter`, `#settings`
- **Mobile responsive**: Designed for stylists on the salon floor using their phone

## Product vision

This calculator is the first free tool in a broader ecosystem. Two paid products follow:

- **RentSalonChairs** — A platform for salon owners to manage their renters (paid SaaS)
- **Studio Metrics** — A suite of salon business tools: booking, KPI reports, HR/management, and client CRM (paid SaaS)

See [STRATEGY.md](STRATEGY.md) for the full go-to-market plan.

## Running locally

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

Or just open `index.html` directly in a browser.

### Tests

```bash
npm install   # one-time: installs Vitest
npm test
```

## License

Private — StudioMetrics
