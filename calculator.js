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

  // Commission calculation (flat or tiered)
  const avgWeeklySales = inputs.serviceIncome / 52;
  const commissionType = inputs.commissionType || 'tiered';
  const tiered = commissionType === 'flat'
    ? calculateFlatCommission(avgWeeklySales, (inputs.startingRate || 40) / 100)
    : calculateTieredCommission(avgWeeklySales, (inputs.startingRate || 40) / 100, inputs.commissionTiers);
  const commissionGross = tiered.grossCommission * 52;

  // COGS calculations
  const yearlyRent = inputs.weeklyRent * 52;
  const asstWeekly =
    inputs.assistantHourly *
    inputs.assistantHours *
    inputs.assistantDays *
    (1 + inputs.asstTaxPct / 100);
  const asstYearly = asstWeekly * 52;
  const colorSupplies = inputs.colorSupplies || 0;
  const ccFees = (inputs.serviceIncome + inputs.tips) * (inputs.ccFeePct / 100);
  const marketing = inputs.marketing || 0;

  const totalCOGS =
    yearlyRent + colorSupplies + ccFees + marketing + asstYearly;

  // Take-home scenarios at various client-retention rates
  const scenarios = [0, 10, 20, 30, 40, 50].map((retention) => {
    const retainedIncome = totalIncome * (1 - retention / 100);
    const takeHome = retainedIncome - totalCOGS;
    return { retention, takeHome, retainedIncome };
  });

  // Break-even rent: max weekly rent that matches current commission income
  const currentTakeHome = commissionGross + inputs.tips;

  // Tax comparison (same logic as R2C)
  const commissionFica = currentTakeHome * 0.0765;
  const adjustedCurrentTakeHome = currentTakeHome - commissionFica;

  const renterSeTax0 = calculateSelfEmploymentTax(scenarios[0].takeHome);
  const renterSelfEmploymentTax = renterSeTax0.seTax;

  const adjustedScenarios = scenarios.map((s) => {
    const se = calculateSelfEmploymentTax(s.takeHome);
    return { ...s, adjustedTakeHome: s.takeHome - se.seTax };
  });

  // Tax-adjusted crossover retention
  // SE tax is proportional: after_tax = pre_tax * AFTER_SE_FACTOR
  const SE_FACTOR = 0.9235 * 0.153;   // ≈ 0.1413
  const AFTER_SE = 1 - SE_FACTOR;     // ≈ 0.8587

  // Crossover: solve totalIncome*(1-L/100) - totalCOGS - SE_tax(...) = adjustedCurrentTakeHome
  // → L = 100 * (totalIncome - adjustedCurrentTakeHome/AFTER_SE - totalCOGS) / totalIncome
  const crossoverRetention = 100 * (totalIncome - adjustedCurrentTakeHome / AFTER_SE - totalCOGS) / totalIncome;

  // Salon investments (configurable per-salon extras)
  const si = buildSalonInvestmentsBreakdown(inputs.salonInvestments);

  return {
    totalIncome,
    commissionGross,
    commissionType,
    avgWeeklySales,
    effectiveRate: tiered.effectiveRate,
    tierBreakdown: tiered.tierBreakdown,
    yearlyRent,
    asstYearly,
    colorSupplies,
    ccFees,
    marketing,
    totalCOGS,
    scenarios,
    currentTakeHome,
    commissionFica,
    adjustedCurrentTakeHome,
    renterSelfEmploymentTax,
    adjustedScenarios,
    crossoverRetention,
    salonInvestmentsBreakdown: si.salonInvestmentsBreakdown,
    salonInvestmentsValue: si.salonInvestmentsValue,
  };
}

// ── Tiered Commission (weekly marginal brackets) ────────────────────

const DEFAULT_COMMISSION_TIERS = [
  { upTo: 2000, rate: 0.40 },
  { upTo: 3500, rate: 0.45 },
  { upTo: 5000, rate: 0.50 },
  { upTo: 6500, rate: 0.55 },
  { upTo: Infinity, rate: 0.60 }
];

// Keep old name as alias for backwards compat in browser global scope
const COMMISSION_TIERS = DEFAULT_COMMISSION_TIERS;

function calculateTieredCommission(weeklySales, startingRate = 0.40, tiers) {
  const activeTiers = tiers || DEFAULT_COMMISSION_TIERS;
  const baseRate = activeTiers[0] ? activeTiers[0].rate : 0.40;
  const delta = startingRate - baseRate;
  let remaining = weeklySales;
  let grossCommission = 0;
  let prevCeiling = 0;
  const tierBreakdown = [];

  for (const tier of activeTiers) {
    const bracketSize = tier.upTo === Infinity ? Infinity : tier.upTo - prevCeiling;
    const amount = remaining > 0 ? Math.min(remaining, bracketSize) : 0;
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

// ── Flat Commission ─────────────────────────────────────────────────

function calculateFlatCommission(weeklySales, rate) {
  const grossCommission = weeklySales * rate;
  return {
    grossCommission,
    effectiveRate: rate,
    tierBreakdown: [{ rangeLabel: 'All Sales', amount: weeklySales, rate, commission: grossCommission }]
  };
}

// ── Salon Investments Breakdown ──────────────────────────────────────

function buildSalonInvestmentsBreakdown(salonInvestments) {
  if (!salonInvestments) return { salonInvestmentsBreakdown: [], salonInvestmentsValue: 0 };
  const items = [];
  if (salonInvestments.marketingAnnual > 0) {
    items.push({ label: 'Salon Marketing', amount: salonInvestments.marketingAnnual, description: salonInvestments.marketingDescription || '' });
  }
  if (salonInvestments.laundryAnnual > 0) {
    items.push({ label: 'Laundry Service', amount: salonInvestments.laundryAnnual, description: salonInvestments.laundryDescription || '' });
  }
  if (salonInvestments.frontDeskAnnual > 0) {
    items.push({ label: 'Front Desk & Support', amount: salonInvestments.frontDeskAnnual, description: salonInvestments.frontDeskDescription || '' });
  }
  const salonInvestmentsValue = items.reduce((sum, i) => sum + i.amount, 0);
  return { salonInvestmentsBreakdown: items, salonInvestmentsValue };
}

// ── Renter → Commission ─────────────────────────────────────────────

function calculateRenterToCommission(inputs) {
  const totalIncome = inputs.serviceIncome + inputs.tips;
  const currentRent = inputs.weeklyRent * 52;

  // Current renter expenses
  const colorSupplies = inputs.colorSupplies || 0;
  const ccFees = (inputs.serviceIncome + inputs.tips) * (inputs.ccFeePct / 100);
  const marketing = inputs.marketing || 0;
  const laundry = inputs.laundry || 0;

  const totalExpenses =
    currentRent +
    colorSupplies +
    ccFees +
    marketing +
    laundry +
    (inputs.otherExpenses || 0);
  const currentTakeHome = totalIncome - totalExpenses;

  // Commission calculation (flat or tiered)
  const avgWeeklySales = inputs.serviceIncome / 52;
  const commissionType = inputs.commissionType || 'tiered';
  const tiered = commissionType === 'flat'
    ? calculateFlatCommission(avgWeeklySales, (inputs.startingRate || 40) / 100)
    : calculateTieredCommission(avgWeeklySales, (inputs.startingRate || 40) / 100, inputs.commissionTiers);
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
    { label: 'Color & Supplies', amount: colorSupplies },
    { label: 'Marketing', amount: marketing },
    { label: 'Laundry', amount: laundry },
    { label: 'Credit Card Processing', amount: ccFees },
  ];
  const salonBenefitsValue = salonBenefitsBreakdown.reduce((sum, b) => sum + b.amount, 0);

  // Salon investments (configurable per-salon extras)
  const si = buildSalonInvestmentsBreakdown(inputs.salonInvestments);

  return {
    totalIncome,
    currentRent,
    totalExpenses,
    currentTakeHome,
    avgWeeklySales,
    commissionType,
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
    salonInvestmentsBreakdown: si.salonInvestmentsBreakdown,
    salonInvestmentsValue: si.salonInvestmentsValue,
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
    calculateFlatCommission,
    DEFAULT_COMMISSION_TIERS,
    COMMISSION_TIERS
  };
}
