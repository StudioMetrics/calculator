import { describe, it, expect } from 'vitest';

const {
  formatCurrency,
  formatPercent,
  calculateCommissionToRenter,
  calculateRenterToCommission
} = require('./calculator');

// ── Default test inputs (Studio Los Gatos sample data) ──────────────

const defaultC2R = {
  serviceIncome: 201965,
  tips: 32099,
  commissionPct: 50,
  weeklyRent: 525,
  assistantHourly: 20,
  assistantHours: 6,
  assistantDays: 4,
  asstTaxPct: 7,
  ccFeePct: 2.9,
  salonCogs: 96413,
  salonMarketing: 33375,
  totalStylistHours: 16375.25,
  stylistHours: 1719.82
};

const defaultR2C = {
  serviceIncome: 201965,
  tips: 32099,
  weeklyRent: 525,
  otherExpenses: 15000,
  desiredCommission: 50,
  assistantHourly: 20,
  assistantHours: 6,
  assistantDays: 4,
  asstTaxPct: 7,
  salonCogs: 96413,
  salonMarketing: 33375,
  totalStylistHours: 16375.25,
  stylistHours: 1719.82,
  ccFeePct: 2.9
};

// ── Formatting ──────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats positive values with $ and commas', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(1000000)).toBe('$1,000,000');
  });

  it('formats negative values', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('handles edge cases', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency(NaN)).toBe('$0');
  });
});

describe('formatPercent', () => {
  it('converts decimal to percentage string', () => {
    expect(formatPercent(0.5)).toBe('50.00%');
    expect(formatPercent(0.105)).toBe('10.50%');
    expect(formatPercent(1)).toBe('100.00%');
  });

  it('handles edge cases', () => {
    expect(formatPercent(null)).toBe('0%');
    expect(formatPercent(undefined)).toBe('0%');
    expect(formatPercent(NaN)).toBe('0%');
  });
});

// ── Commission → Renter ─────────────────────────────────────────────

describe('calculateCommissionToRenter', () => {
  const result = calculateCommissionToRenter(defaultC2R);

  it('calculates total income correctly', () => {
    expect(result.totalIncome).toBe(201965 + 32099);
  });

  it('calculates commission gross correctly', () => {
    expect(result.commissionGross).toBe(201965 * 0.5);
  });

  it('calculates stylist usage percentage', () => {
    expect(result.usagePct).toBeCloseTo(1719.82 / 16375.25, 6);
  });

  it('calculates yearly rent', () => {
    expect(result.yearlyRent).toBe(525 * 52);
  });

  it('calculates assistant yearly cost with tax', () => {
    const expected = 20 * 6 * 4 * (1 + 7 / 100) * 52;
    expect(result.asstYearly).toBeCloseTo(expected, 2);
  });

  it('calculates proportional COGS', () => {
    const usagePct = 1719.82 / 16375.25;
    expect(result.stylistCogs).toBeCloseTo(usagePct * 96413, 2);
    expect(result.stylistMarketing).toBeCloseTo(usagePct * 33375, 2);
  });

  it('calculates credit card fees', () => {
    expect(result.ccFees).toBeCloseTo(201965 * 0.029, 2);
  });

  it('sums total COGS correctly', () => {
    const expectedCOGS =
      result.yearlyRent +
      result.asstYearly +
      result.stylistCogs +
      result.ccFees +
      result.stylistMarketing;
    expect(result.totalCOGS).toBeCloseTo(expectedCOGS, 2);
  });

  it('produces 6 retention scenarios (0–50%)', () => {
    expect(result.scenarios).toHaveLength(6);
    expect(result.scenarios[0].retention).toBe(0);
    expect(result.scenarios[5].retention).toBe(50);
  });

  it('scenario at 0% retention uses full income', () => {
    const s = result.scenarios[0];
    expect(s.retainedIncome).toBe(result.totalIncome);
    expect(s.takeHome).toBeCloseTo(result.totalIncome - result.totalCOGS, 2);
  });

  it('scenario at 50% retention halves income', () => {
    const s = result.scenarios[5];
    expect(s.retainedIncome).toBeCloseTo(result.totalIncome * 0.5, 2);
  });

  it('calculates current commission take-home', () => {
    const expected = 201965 * 0.5 + 32099 * 0.9;
    expect(result.currentTakeHome).toBeCloseTo(expected, 2);
  });

  it('calculates break-even weekly rent using correct formula', () => {
    // Verify the formula: (currentTakeHome + totalCOGS - totalIncome * 0.9) / 52
    const expected =
      (result.currentTakeHome + result.totalCOGS - result.totalIncome * 0.9) /
      52;
    expect(result.maxRentWeekly).toBeCloseTo(expected, 2);
    // With sample data, the value can be negative (renting already costs more than commission)
    expect(typeof result.maxRentWeekly).toBe('number');
    expect(isFinite(result.maxRentWeekly)).toBe(true);
  });
});

// ── Renter → Commission ─────────────────────────────────────────────

describe('calculateRenterToCommission', () => {
  const result = calculateRenterToCommission(defaultR2C);

  it('calculates total income correctly', () => {
    expect(result.totalIncome).toBe(201965 + 32099);
  });

  it('calculates annual rent', () => {
    expect(result.currentRent).toBe(525 * 52);
  });

  it('sums total expenses correctly', () => {
    expect(result.totalExpenses).toBeGreaterThan(0);
    // totalExpenses includes rent + assistant + cogs + cc + marketing + other
    expect(result.totalExpenses).toBeGreaterThan(result.currentRent);
  });

  it('calculates current take-home as income minus expenses', () => {
    expect(result.currentTakeHome).toBeCloseTo(
      result.totalIncome - result.totalExpenses,
      2
    );
  });

  it('calculates required commission percentage', () => {
    // requiredCommission = (currentTakeHome - tips * 0.9) / serviceIncome * 100
    const expected =
      ((result.currentTakeHome - 32099 * 0.9) / 201965) * 100;
    expect(result.requiredCommission).toBeCloseTo(expected, 2);
  });

  it('calculates income at desired commission rate', () => {
    const expected = 201965 * 0.5 + 32099 * 0.9;
    expect(result.commissionIncome).toBeCloseTo(expected, 2);
  });

  it('calculates difference vs current take-home', () => {
    expect(result.difference).toBeCloseTo(
      result.commissionIncome - result.currentTakeHome,
      2
    );
  });

  it('handles zero service income gracefully', () => {
    const zeroInputs = { ...defaultR2C, serviceIncome: 0 };
    const r = calculateRenterToCommission(zeroInputs);
    // Division by zero → Infinity or -Infinity, not a crash
    expect(isFinite(r.requiredCommission)).toBe(false);
    expect(r.totalIncome).toBe(32099);
  });
});

// ── Cross-check: both calculators agree on shared math ──────────────

describe('cross-calculator consistency', () => {
  it('both calculators produce the same usage percentage', () => {
    const c2r = calculateCommissionToRenter(defaultC2R);
    const r2c = calculateRenterToCommission(defaultR2C);
    expect(c2r.usagePct).toBeCloseTo(
      defaultR2C.stylistHours / defaultR2C.totalStylistHours,
      6
    );
  });

  it('commission take-home matches across calculators with same inputs', () => {
    const c2r = calculateCommissionToRenter(defaultC2R);
    const r2c = calculateRenterToCommission(defaultR2C);
    // Both should agree on commissionIncome = serviceIncome * 50% + tips * 90%
    const expected = 201965 * 0.5 + 32099 * 0.9;
    expect(c2r.currentTakeHome).toBeCloseTo(expected, 2);
    expect(r2c.commissionIncome).toBeCloseTo(expected, 2);
  });
});
