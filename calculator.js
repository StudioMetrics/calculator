/**
 * Studio Metrics Calculator - Core Financial Logic
 *
 * Pure functions for Commission ↔ Renter calculations.
 * Used by both the browser UI (index.html) and unit tests.
 */

// ── Formatting helpers ──────────────────────────────────────────────

function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
}

function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return (val * 100).toFixed(2) + '%';
}

// ── Commission → Renter ─────────────────────────────────────────────

function calculateCommissionToRenter(inputs) {
  const totalIncome = inputs.serviceIncome + inputs.tips;
  const commissionGross = inputs.serviceIncome * (inputs.commissionPct / 100);

  // Stylist % of salon usage
  const usagePct = inputs.stylistHours / inputs.totalStylistHours;

  // COGS calculations
  const yearlyRent = inputs.weeklyRent * 52;
  const asstWeekly =
    inputs.assistantHourly *
    inputs.assistantHours *
    inputs.assistantDays *
    (1 + inputs.asstTaxPct / 100);
  const asstYearly = asstWeekly * 52;
  const stylistCogs = usagePct * inputs.salonCogs;
  const ccFees = inputs.serviceIncome * (inputs.ccFeePct / 100);
  const stylistMarketing = usagePct * inputs.salonMarketing;

  const totalCOGS =
    yearlyRent + stylistCogs + ccFees + stylistMarketing + asstYearly;

  // Take-home scenarios at various client-retention rates
  const scenarios = [0, 10, 20, 30, 40, 50].map((retention) => {
    const retainedIncome = totalIncome * (1 - retention / 100);
    const takeHome = retainedIncome - totalCOGS;
    return { retention, takeHome, retainedIncome };
  });

  // Break-even rent: max weekly rent that matches current commission income
  const currentTakeHome = commissionGross + inputs.tips * 0.9;
  const maxRentWeekly =
    (currentTakeHome + totalCOGS - totalIncome * 0.9) / 52;

  return {
    totalIncome,
    commissionGross,
    usagePct,
    yearlyRent,
    asstYearly,
    stylistCogs,
    ccFees,
    stylistMarketing,
    totalCOGS,
    scenarios,
    currentTakeHome,
    maxRentWeekly
  };
}

// ── Tiered Commission (weekly marginal brackets) ────────────────────

const COMMISSION_TIERS = [
  { upTo: 2000, rate: 0.40 },
  { upTo: 3500, rate: 0.45 },
  { upTo: 5000, rate: 0.50 },
  { upTo: 6500, rate: 0.55 },
  { upTo: Infinity, rate: 0.60 }
];

function calculateTieredCommission(weeklySales) {
  let remaining = weeklySales;
  let grossCommission = 0;
  let prevCeiling = 0;
  const tierBreakdown = [];

  for (const tier of COMMISSION_TIERS) {
    if (remaining <= 0) break;
    const bracketSize = tier.upTo - prevCeiling;
    const amount = Math.min(remaining, bracketSize);
    const commission = amount * tier.rate;

    const lowerLabel = prevCeiling === 0 ? '$0' : formatCurrency(prevCeiling + 1);
    const rangeLabel = tier.upTo === Infinity
      ? `${formatCurrency(prevCeiling + 1)}+`
      : `${lowerLabel} – ${formatCurrency(tier.upTo)}`;

    tierBreakdown.push({ rangeLabel, amount, rate: tier.rate, commission });
    grossCommission += commission;
    remaining -= amount;
    prevCeiling = tier.upTo;
  }

  const effectiveRate = weeklySales > 0 ? grossCommission / weeklySales : 0;
  return { grossCommission, effectiveRate, tierBreakdown };
}

// ── Renter → Commission ─────────────────────────────────────────────

function calculateRenterToCommission(inputs) {
  const totalIncome = inputs.serviceIncome + inputs.tips;
  const currentRent = inputs.weeklyRent * 52;
  const usagePct = inputs.stylistHours / inputs.totalStylistHours;

  // Current renter expenses
  const asstWeekly =
    inputs.assistantHourly *
    inputs.assistantHours *
    inputs.assistantDays *
    (1 + inputs.asstTaxPct / 100);
  const asstYearly = asstWeekly * 52;
  const stylistCogs = usagePct * inputs.salonCogs;
  const ccFees = inputs.serviceIncome * (inputs.ccFeePct / 100);
  const stylistMarketing = usagePct * inputs.salonMarketing;

  const totalExpenses =
    currentRent +
    asstYearly +
    stylistCogs +
    ccFees +
    stylistMarketing +
    inputs.otherExpenses;
  const currentTakeHome = totalIncome - totalExpenses;

  // Tiered commission calculation
  const avgWeeklySales = inputs.serviceIncome / 52;
  const tiered = calculateTieredCommission(avgWeeklySales);
  const annualCommission = tiered.grossCommission * 52;
  const commissionIncome = annualCommission + inputs.tips * 0.9;
  const difference = commissionIncome - currentTakeHome;

  return {
    totalIncome,
    currentRent,
    totalExpenses,
    currentTakeHome,
    avgWeeklySales,
    weeklyCommission: tiered.grossCommission,
    effectiveRate: tiered.effectiveRate,
    tierBreakdown: tiered.tierBreakdown,
    commissionIncome,
    difference
  };
}

// ── Exports (Node / ES-module) & browser global ─────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatPercent,
    calculateCommissionToRenter,
    calculateRenterToCommission,
    calculateTieredCommission,
    COMMISSION_TIERS
  };
}
