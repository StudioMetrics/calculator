# Studio Metrics Calculator

A simple React-based calculator for salon stylists to evaluate Commission vs Renter compensation models.

## Architecture & Decisions

**Why a single HTML file?**
We built this as a single `index.html` file using React via CDN rather than a full toolchain (no npm, Vite, or Webpack). 
- **Absolute simplicity:** It can be hosted anywhere for free without a build process (currently on GitHub Pages).
- **Embedded ready:** The logic is contained entirely in one place, making it easy to drop into an iFrame or another marketing site later.
- **Immediate execution:** Perfect for rapid prototyping and validation of the math.

## Features

### Commission → Renter
- Calculate equivalent rent based on current commission earnings
- Account for proportional salon costs (color, supplies, marketing, CC fees)
- Model client retention scenarios (0-50% client loss)
- Find break-even weekly rent

### Renter → Commission  
- Calculate required commission percentage to match current renter income
- Compare against different commission splits
- See income difference at various rates

## Formula Reference

Based on Soulver worksheet logic from Studio Los Gatos. We used a **proportional COGS allocation model**:

- **Stylist % of Usage**: `stylist_hours / total_stylist_hours`
- **COGS Allocation**: proportional costs based on usage percentage
  - Rent: weekly × 52
  - Assistant: hourly × hours × days × (1 + tax%) × 52
  - Color/Supplies: usage% × salon_cogs
  - Marketing: usage% × salon_marketing
  - CC Fees: service_income × 2.9%

## Usage

Open `index.html` directly in a browser, or serve locally:

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

## License

Private - StudioMetrics
