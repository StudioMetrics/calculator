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

// Social Security wage base (SSA). Only the 12.4% SS portion is capped;
// the 2.9% Medicare portion applies to all earnings.
const SS_WAGE_BASE_2025 = 176100;
const SS_WAGE_BASE_2026 = 184500;
const SS_WAGE_BASE = SS_WAGE_BASE_2025;

const SE_SS_RATE = 0.124;
const SE_MEDICARE_RATE = 0.029;
const SE_TAXABLE_FACTOR = 0.9235; // 7.65% deduction for the "employer half"

function calculateSelfEmploymentTax(netEarnings) {
  if (netEarnings <= 0) return { seTax: 0, effectiveRate: 0, ssPortion: 0, medicarePortion: 0 };
  const taxableBase = netEarnings * SE_TAXABLE_FACTOR;
  const ssPortion = Math.min(taxableBase, SS_WAGE_BASE) * SE_SS_RATE;
  const medicarePortion = taxableBase * SE_MEDICARE_RATE;
  const seTax = ssPortion + medicarePortion;
  return { seTax, effectiveRate: seTax / netEarnings, ssPortion, medicarePortion };
}

// ── CA Income Tax (2025 FTB Schedule X, single) ─────────────────────

const CA_TAX_BRACKETS_2025_SINGLE = [
  { upTo: 11079, rate: 0.01 },
  { upTo: 26264, rate: 0.02 },
  { upTo: 41452, rate: 0.04 },
  { upTo: 57542, rate: 0.06 },
  { upTo: 72724, rate: 0.08 },
  { upTo: 371479, rate: 0.093 },
  { upTo: 445771, rate: 0.103 },
  { upTo: 742953, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

/**
 * Approximate CA state income tax via marginal brackets (2025 Schedule X, single).
 * Estimate only — no CA deductions/credits/SDI; applies to both sides of the
 * comparison, so it is informational and excluded from crossover math.
 */
function calculateCAIncomeTax(taxableIncome, filingStatus = 'single') {
  if (filingStatus !== 'single') filingStatus = 'single'; // only single brackets modeled
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of CA_TAX_BRACKETS_2025_SINGLE) {
    if (taxableIncome <= prev) break;
    const slice = Math.min(taxableIncome, bracket.upTo) - prev;
    tax += slice * bracket.rate;
    prev = bracket.upTo;
  }
  return tax;
}

// Commission-side payroll rate: employee FICA 7.65% + CA SDI 1.2% (no SDI
// wage cap since 2024). Employer-half FICA is paid by the salon.
const PAYROLL_TAX_RATE = 0.0885;

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
  const payrollTax = currentTakeHome * PAYROLL_TAX_RATE;
  const adjustedCurrentTakeHome = currentTakeHome - payrollTax;

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
    payrollTax,
    adjustedCurrentTakeHome,
    renterSelfEmploymentTax,
    adjustedScenarios,
    crossoverRetention,
    salonInvestmentsBreakdown: si.salonInvestmentsBreakdown,
    salonInvestmentsValue: si.salonInvestmentsValue,
  };
}

// ── After-Tax Reality (renter vs commission after employment + CA taxes) ──

/**
 * Assembles the "after-tax reality" comparison from the C2R inputs.
 *
 * Pre-tax "take-home" numbers are a tax illusion: booth-rent income also owes
 * SE tax (15.3% with the SS wage-base cap) and commission income owes the
 * 8.85% employee payroll share. Est. CA income tax is computed on pre-tax
 * income for both sides (same basis as the UI rows) and narrows the gap
 * further. Everything derives from the inputs — no fixed dollar figures.
 */
function calculateAfterTaxReality(inputs) {
  const c2r = calculateCommissionToRenter(inputs);

  // Renter side at full book (0% client loss)
  const renterPreTax = c2r.scenarios[0].takeHome;
  const renterSeTax = calculateSelfEmploymentTax(renterPreTax).seTax;
  const renterCaTax = calculateCAIncomeTax(renterPreTax);
  const renterAfterTax = renterPreTax - renterSeTax - renterCaTax;

  // Commission side: gross commission + tips, reduced by employee payroll tax
  const commissionComp = c2r.currentTakeHome;
  const commissionPayrollTax = commissionComp * PAYROLL_TAX_RATE;
  const commissionCaTax = calculateCAIncomeTax(commissionComp);
  const commissionAfterTax = commissionComp - commissionPayrollTax - commissionCaTax;

  const gapAfterTax = renterAfterTax - commissionAfterTax;
  const gapMonthly = gapAfterTax / 12;

  // How the after-tax gap moves as clients stay with the salon (0–50% loss).
  // Each level rescales renter pre-tax income, then reapplies both taxes.
  const retentionTable = c2r.scenarios.map(({ retention, takeHome }) => {
    const seTax = calculateSelfEmploymentTax(takeHome).seTax;
    const caTax = calculateCAIncomeTax(takeHome);
    const afterTax = takeHome - seTax - caTax;
    return {
      clientsLost: retention,
      renterAfterTax: afterTax,
      commissionAdvantage: commissionAfterTax - afterTax,
    };
  });

  // What the renter pays out of pocket that the salon covers on commission
  // (the totalCOGS components, as the "package value" list)
  const salonValue = {
    items: [
      { label: 'Booth Rent', amount: c2r.yearlyRent },
      { label: 'Color & Supplies', amount: c2r.colorSupplies },
      { label: 'Credit Card Processing', amount: c2r.ccFees },
      { label: 'Marketing', amount: c2r.marketing },
      { label: 'Assistant Support', amount: c2r.asstYearly },
    ],
    total: c2r.totalCOGS,
  };

  return {
    renterPreTax,
    renterSeTax,
    renterCaTax,
    renterAfterTax,
    commissionComp,
    commissionPayrollTax,
    commissionCaTax,
    commissionAfterTax,
    gapAfterTax,
    gapMonthly,
    retentionTable,
    salonValue,
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
  const ceiling = Math.max(startingRate, ...activeTiers.map(t => t.rate));
  let remaining = weeklySales;
  let grossCommission = 0;
  let prevCeiling = 0;
  const tierBreakdown = [];

  for (const tier of activeTiers) {
    const bracketSize = tier.upTo === Infinity ? Infinity : tier.upTo - prevCeiling;
    const amount = remaining > 0 ? Math.min(remaining, bracketSize) : 0;
    const adjustedRate = Math.min(tier.rate + delta, ceiling);
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

  // Commission-side payroll tax: employee FICA 7.65% + CA SDI 1.2%
  // (SDI has no wage cap since 2024); employer-half FICA is paid by the salon.
  const payrollTax = commissionIncome * PAYROLL_TAX_RATE;
  const adjustedCommissionIncome = commissionIncome - payrollTax;
  const adjustedDifference = adjustedCommissionIncome - adjustedRenterTakeHome;
  const seTaxPenalty = selfEmploymentTax - payrollTax;

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
    payrollTax,
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
    calculateCAIncomeTax,
    calculateCommissionToRenter,
    calculateAfterTaxReality,
    calculateRenterToCommission,
    calculateTieredCommission,
    calculateFlatCommission,
    DEFAULT_COMMISSION_TIERS,
    COMMISSION_TIERS,
    PAYROLL_TAX_RATE,
    SS_WAGE_BASE_2025,
    SS_WAGE_BASE_2026
  };
}
