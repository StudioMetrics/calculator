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

  // Required commission % to match current renter take-home
  const requiredCommission =
    ((currentTakeHome - inputs.tips * 0.9) / inputs.serviceIncome) * 100;

  // Income at desired commission rate
  const commissionIncome =
    inputs.serviceIncome * (inputs.desiredCommission / 100) +
    inputs.tips * 0.9;
  const difference = commissionIncome - currentTakeHome;

  return {
    totalIncome,
    currentRent,
    totalExpenses,
    currentTakeHome,
    requiredCommission,
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
    calculateRenterToCommission
  };
}
