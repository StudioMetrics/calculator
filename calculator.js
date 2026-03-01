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

// ── Self-Employment Tax (1099 renters pay both halves of FICA) ──────

function calculateSelfEmploymentTax(netEarnings) {
  if (netEarnings <= 0) return { seTax: 0, effectiveRate: 0 };
  const taxableBase = netEarnings * 0.9235;
  const seTax = taxableBase * 0.153;
  return { seTax, effectiveRate: seTax / netEarnings };
}

// ── Commission → Renter ─────────────────────────────────────────────

function calculateCommissionToRenter(inputs) {
  const totalIncome = inputs.serviceIncome + inputs.tips;

  // Tiered commission calculation
  const avgWeeklySales = inputs.serviceIncome / 52;
  const tiered = calculateTieredCommission(avgWeeklySales, (inputs.startingRate || 40) / 100);
  const commissionGross = tiered.grossCommission * 52;

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
  const currentTakeHome = commissionGross + inputs.tips;
  const maxRentWeekly =
    (currentTakeHome + totalCOGS - totalIncome) / 52;

  // Salon benefits breakdown (what the salon currently provides)
  const salonBenefitsBreakdown = [
    { label: 'Booth Rent', amount: yearlyRent },
    { label: 'Color & Supplies', amount: stylistCogs },
    { label: 'Marketing', amount: stylistMarketing },
    { label: 'Credit Card Processing', amount: ccFees },
    { label: 'Support Staff', amount: asstYearly },
  ];
  const salonBenefitsValue = salonBenefitsBreakdown.reduce((sum, b) => sum + b.amount, 0);

  // Crossover retention %: the client-loss % where renting becomes worse
  const crossoverRetention = ((totalIncome - totalCOGS - currentTakeHome) / totalIncome) * 100;

  return {
    totalIncome,
    commissionGross,
    avgWeeklySales,
    effectiveRate: tiered.effectiveRate,
    tierBreakdown: tiered.tierBreakdown,
    usagePct,
    yearlyRent,
    asstYearly,
    stylistCogs,
    ccFees,
    stylistMarketing,
    totalCOGS,
    scenarios,
    currentTakeHome,
    maxRentWeekly,
    salonBenefitsValue,
    salonBenefitsBreakdown,
    crossoverRetention
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

function calculateTieredCommission(weeklySales, startingRate = 0.40) {
  const delta = startingRate - 0.40;
  let remaining = weeklySales;
  let grossCommission = 0;
  let prevCeiling = 0;
  const tierBreakdown = [];

  for (const tier of COMMISSION_TIERS) {
    if (remaining <= 0) break;
    const bracketSize = tier.upTo - prevCeiling;
    const amount = Math.min(remaining, bracketSize);
    const adjustedRate = Math.min(tier.rate + delta, 0.60);
    const commission = amount * adjustedRate;

    const lowerLabel = prevCeiling === 0 ? '$0' : formatCurrency(prevCeiling + 1);
    const rangeLabel = tier.upTo === Infinity
      ? `${formatCurrency(prevCeiling + 1)}+`
      : `${lowerLabel} – ${formatCurrency(tier.upTo)}`;

    tierBreakdown.push({ rangeLabel, amount, rate: adjustedRate, commission });
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
  const tiered = calculateTieredCommission(avgWeeklySales, (inputs.startingRate || 40) / 100);
  const annualCommission = tiered.grossCommission * 52;
  const commissionIncome = annualCommission + inputs.tips;
  const difference = commissionIncome - currentTakeHome;

  // Self-employment tax (renters are 1099 contractors)
  const se = calculateSelfEmploymentTax(currentTakeHome);
  const selfEmploymentTax = se.seTax;
  const adjustedRenterTakeHome = currentTakeHome - selfEmploymentTax;

  // Commission-side payroll tax (employer pays half, but employee share is 7.65%)
  const commissionFica = commissionIncome * 0.0765;
  const adjustedCommissionIncome = commissionIncome - commissionFica;
  const adjustedDifference = adjustedCommissionIncome - adjustedRenterTakeHome;
  const seTaxPenalty = selfEmploymentTax - commissionFica;

  // Salon benefits breakdown (costs the salon covers under commission)
  const salonBenefitsBreakdown = [
    { label: 'Booth Rent', amount: currentRent },
    { label: 'Color & Supplies', amount: stylistCogs },
    { label: 'Marketing', amount: stylistMarketing },
    { label: 'Credit Card Processing', amount: ccFees },
    { label: 'Support Staff', amount: asstYearly },
  ];
  const salonBenefitsValue = salonBenefitsBreakdown.reduce((sum, b) => sum + b.amount, 0);

  // Slow week comparison (70% volume)
  const slowPct = 0.70;
  const slowIncome = inputs.serviceIncome * slowPct + inputs.tips * slowPct;
  const slowRenterTakeHome = slowIncome - totalExpenses;
  const slowWeeklySales = inputs.serviceIncome * slowPct / 52;
  const slowTiered = calculateTieredCommission(slowWeeklySales, (inputs.startingRate || 40) / 100);
  const slowCommissionIncome = slowTiered.grossCommission * 52 + inputs.tips * slowPct;

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
    difference,
    selfEmploymentTax,
    commissionFica,
    adjustedCommissionIncome,
    adjustedRenterTakeHome,
    adjustedDifference,
    seTaxPenalty,
    salonBenefitsValue,
    salonBenefitsBreakdown,
    slowWeekComparison: {
      renterTakeHome: slowRenterTakeHome,
      commissionTakeHome: slowCommissionIncome,
    },
  };
}

// ── Exports (Node / ES-module) & browser global ─────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatPercent,
    calculateSelfEmploymentTax,
    calculateCommissionToRenter,
    calculateRenterToCommission,
    calculateTieredCommission,
    COMMISSION_TIERS
  };
}
