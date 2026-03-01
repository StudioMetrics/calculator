import { describe, it, expect } from 'vitest';

const {
  formatCurrency,
  formatPercent,
  calculateCommissionToRenter,
  calculateRenterToCommission,
  calculateTieredCommission,
  calculateSelfEmploymentTax
} = require('./calculator');

// ── Default test inputs (Studio Los Gatos sample data) ──────────────

const defaultC2R = {
  serviceIncome: 100000,
  tips: 32099,
  startingRate: 40,
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
  serviceIncome: 100000,
  tips: 32099,
  startingRate: 40,
  weeklyRent: 525,
  otherExpenses: 15000,
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
    expect(result.totalIncome).toBe(100000 + 32099);
  });

  it('calculates commission gross using tiered brackets', () => {
    const tiered = calculateTieredCommission(100000 / 52);
    expect(result.commissionGross).toBeCloseTo(tiered.grossCommission * 52, 2);
  });

  it('returns avgWeeklySales and effectiveRate', () => {
    expect(result.avgWeeklySales).toBeCloseTo(100000 / 52, 2);
    expect(result.effectiveRate).toBeGreaterThan(0);
    expect(result.effectiveRate).toBeLessThanOrEqual(0.60);
  });

  it('returns tier breakdown', () => {
    expect(result.tierBreakdown.length).toBeGreaterThan(0);
    expect(result.tierBreakdown[0]).toHaveProperty('rangeLabel');
    expect(result.tierBreakdown[0]).toHaveProperty('rate');
    expect(result.tierBreakdown[0]).toHaveProperty('commission');
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
    expect(result.ccFees).toBeCloseTo(100000 * 0.029, 2);
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

  it('calculates current commission take-home without tip deduction', () => {
    // commissionGross + tips (no * 0.9)
    expect(result.currentTakeHome).toBeCloseTo(result.commissionGross + 32099, 2);
  });

  it('calculates break-even weekly rent without tip deduction', () => {
    // (currentTakeHome + totalCOGS - totalIncome) / 52
    const expected =
      (result.currentTakeHome + result.totalCOGS - result.totalIncome) / 52;
    expect(result.maxRentWeekly).toBeCloseTo(expected, 2);
    expect(typeof result.maxRentWeekly).toBe('number');
    expect(isFinite(result.maxRentWeekly)).toBe(true);
  });

  it('returns salon benefits value equal to total COGS', () => {
    expect(result.salonBenefitsValue).toBeCloseTo(result.totalCOGS, 2);
  });

  it('returns salon benefits breakdown with 5 items', () => {
    expect(result.salonBenefitsBreakdown).toHaveLength(5);
    const labels = result.salonBenefitsBreakdown.map(b => b.label);
    expect(labels).toContain('Booth Rent');
    expect(labels).toContain('Color & Supplies');
    expect(labels).toContain('Support Staff');
  });

  it('calculates crossover retention percentage', () => {
    const expected = ((result.totalIncome - result.totalCOGS - result.currentTakeHome) / result.totalIncome) * 100;
    expect(result.crossoverRetention).toBeCloseTo(expected, 2);
  });

  it('uses custom starting rate when provided', () => {
    const highRate = calculateCommissionToRenter({ ...defaultC2R, startingRate: 50 });
    expect(highRate.commissionGross).toBeGreaterThan(result.commissionGross);
  });
});

// ── Tiered Commission ───────────────────────────────────────────────

describe('calculateTieredCommission', () => {
  it('calculates commission fully within 40% bracket', () => {
    const result = calculateTieredCommission(1500);
    expect(result.grossCommission).toBe(600); // 1500 * 0.40
    expect(result.effectiveRate).toBeCloseTo(0.40, 4);
    expect(result.tierBreakdown).toHaveLength(1);
    expect(result.tierBreakdown[0].rate).toBe(0.40);
    expect(result.tierBreakdown[0].amount).toBe(1500);
  });

  it('calculates commission spanning 40% and 45% brackets', () => {
    const result = calculateTieredCommission(3000);
    // $2,000 * 0.40 + $1,000 * 0.45 = $800 + $450 = $1,250
    expect(result.grossCommission).toBe(1250);
    expect(result.effectiveRate).toBeCloseTo(1250 / 3000, 4);
    expect(result.tierBreakdown).toHaveLength(2);
    expect(result.tierBreakdown[0].commission).toBe(800);
    expect(result.tierBreakdown[1].commission).toBe(450);
  });

  it('calculates commission spanning all 5 brackets', () => {
    const result = calculateTieredCommission(8000);
    // $2,000*0.40 + $1,500*0.45 + $1,500*0.50 + $1,500*0.55 + $1,500*0.60
    // = $800 + $675 + $750 + $825 + $900 = $3,950
    expect(result.grossCommission).toBe(3950);
    expect(result.effectiveRate).toBeCloseTo(3950 / 8000, 4);
    expect(result.tierBreakdown).toHaveLength(5);
  });

  it('returns zero for zero sales', () => {
    const result = calculateTieredCommission(0);
    expect(result.grossCommission).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.tierBreakdown).toHaveLength(0);
  });

  it('handles exact bracket boundary ($2,000)', () => {
    const result = calculateTieredCommission(2000);
    expect(result.grossCommission).toBe(800);
    expect(result.tierBreakdown).toHaveLength(1);
  });

  it('applies custom starting rate (45%)', () => {
    const result = calculateTieredCommission(1500, 0.45);
    // delta = 0.05, so first bracket rate = 0.45
    expect(result.grossCommission).toBe(1500 * 0.45);
    expect(result.tierBreakdown[0].rate).toBe(0.45);
  });

  it('applies custom starting rate (50%) with shifted tiers', () => {
    const result = calculateTieredCommission(3000, 0.50);
    // delta = 0.10: tiers become 50%, 55%, 60%, 60%, 60%
    // $2,000 * 0.50 + $1,000 * 0.55 = $1,000 + $550 = $1,550
    expect(result.grossCommission).toBe(1550);
    expect(result.tierBreakdown[0].rate).toBe(0.50);
    expect(result.tierBreakdown[1].rate).toBe(0.55);
  });

  it('caps all rates at 60% with high starting rate', () => {
    const result = calculateTieredCommission(8000, 0.50);
    // delta = 0.10: tiers become 50%, 55%, 60%, 60%, 60% (capped)
    expect(result.tierBreakdown[0].rate).toBe(0.50);
    expect(result.tierBreakdown[1].rate).toBe(0.55);
    expect(result.tierBreakdown[2].rate).toBe(0.60);
    expect(result.tierBreakdown[3].rate).toBe(0.60);
    expect(result.tierBreakdown[4].rate).toBe(0.60);
    // $2,000*0.50 + $1,500*0.55 + $1,500*0.60 + $1,500*0.60 + $1,500*0.60
    // = $1,000 + $825 + $900 + $900 + $900 = $4,525
    expect(result.grossCommission).toBe(4525);
  });

  it('default starting rate (0.40) matches no-argument behavior', () => {
    const withDefault = calculateTieredCommission(5000, 0.40);
    const withoutArg = calculateTieredCommission(5000);
    expect(withDefault.grossCommission).toBe(withoutArg.grossCommission);
  });
});

// ── Self-Employment Tax ─────────────────────────────────────────────

describe('calculateSelfEmploymentTax', () => {
  it('calculates SE tax on positive earnings', () => {
    const result = calculateSelfEmploymentTax(100000);
    // 100000 * 0.9235 * 0.153 = 14,129.55
    expect(result.seTax).toBeCloseTo(14129.55, 2);
    expect(result.effectiveRate).toBeCloseTo(0.141296, 4);
  });

  it('returns zero for zero earnings', () => {
    const result = calculateSelfEmploymentTax(0);
    expect(result.seTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it('returns zero for negative earnings', () => {
    const result = calculateSelfEmploymentTax(-5000);
    expect(result.seTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });
});

// ── Renter → Commission ─────────────────────────────────────────────

describe('calculateRenterToCommission', () => {
  const result = calculateRenterToCommission(defaultR2C);

  it('calculates total income correctly', () => {
    expect(result.totalIncome).toBe(100000 + 32099);
  });

  it('calculates annual rent', () => {
    expect(result.currentRent).toBe(525 * 52);
  });

  it('sums total expenses correctly', () => {
    expect(result.totalExpenses).toBeGreaterThan(0);
    expect(result.totalExpenses).toBeGreaterThan(result.currentRent);
  });

  it('calculates current take-home as income minus expenses', () => {
    expect(result.currentTakeHome).toBeCloseTo(
      result.totalIncome - result.totalExpenses,
      2
    );
  });

  it('returns average weekly sales', () => {
    expect(result.avgWeeklySales).toBeCloseTo(100000 / 52, 2);
  });

  it('returns weekly commission from tiers', () => {
    const tiered = calculateTieredCommission(100000 / 52);
    expect(result.weeklyCommission).toBeCloseTo(tiered.grossCommission, 2);
  });

  it('returns effective commission rate', () => {
    // $100K/52 ≈ $1,923/week — falls within first bracket, so rate is exactly 40%
    expect(result.effectiveRate).toBeGreaterThanOrEqual(0.40);
    expect(result.effectiveRate).toBeLessThanOrEqual(0.60);
  });

  it('returns tier breakdown array', () => {
    expect(result.tierBreakdown.length).toBeGreaterThan(0);
  });

  it('calculates annual commission income without tip deduction', () => {
    // No * 0.9 on tips
    const expected = result.weeklyCommission * 52 + 32099;
    expect(result.commissionIncome).toBeCloseTo(expected, 2);
  });

  it('calculates difference vs current take-home', () => {
    expect(result.difference).toBeCloseTo(
      result.commissionIncome - result.currentTakeHome,
      2
    );
  });

  it('calculates self-employment tax on renter profit', () => {
    expect(result.selfEmploymentTax).toBeGreaterThan(0);
    const expectedSE = result.currentTakeHome * 0.9235 * 0.153;
    expect(result.selfEmploymentTax).toBeCloseTo(expectedSE, 2);
  });

  it('calculates commission FICA at 7.65%', () => {
    expect(result.commissionFica).toBeCloseTo(result.commissionIncome * 0.0765, 2);
  });

  it('calculates adjusted commission income after FICA', () => {
    expect(result.adjustedCommissionIncome).toBeCloseTo(
      result.commissionIncome - result.commissionFica, 2
    );
  });

  it('calculates adjusted renter take-home after SE tax', () => {
    expect(result.adjustedRenterTakeHome).toBeCloseTo(
      result.currentTakeHome - result.selfEmploymentTax, 2
    );
  });

  it('calculates adjusted difference with taxes on both sides', () => {
    expect(result.adjustedDifference).toBeCloseTo(
      result.adjustedCommissionIncome - result.adjustedRenterTakeHome, 2
    );
  });

  it('calculates SE tax penalty (delta between SE tax and FICA)', () => {
    expect(result.seTaxPenalty).toBeCloseTo(
      result.selfEmploymentTax - result.commissionFica, 2
    );
    // SE tax is always more than FICA for same income
    expect(result.seTaxPenalty).toBeGreaterThan(0);
  });

  it('returns salon benefits value and breakdown', () => {
    expect(result.salonBenefitsValue).toBeGreaterThan(0);
    expect(result.salonBenefitsBreakdown).toHaveLength(5);
    const sum = result.salonBenefitsBreakdown.reduce((s, b) => s + b.amount, 0);
    expect(sum).toBeCloseTo(result.salonBenefitsValue, 2);
  });

  it('calculates slow week comparison at 70% volume', () => {
    expect(result.slowWeekComparison.renterTakeHome).toBeLessThan(result.currentTakeHome);
    expect(result.slowWeekComparison.commissionTakeHome).toBeLessThan(result.commissionIncome);
  });

  it('handles zero service income gracefully', () => {
    const zeroInputs = { ...defaultR2C, serviceIncome: 0 };
    const r = calculateRenterToCommission(zeroInputs);
    expect(r.avgWeeklySales).toBe(0);
    expect(r.weeklyCommission).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(r.tierBreakdown).toHaveLength(0);
    expect(r.totalIncome).toBe(32099);
    expect(r.salonBenefitsBreakdown).toHaveLength(5);
  });

  it('uses custom starting rate', () => {
    const highRate = calculateRenterToCommission({ ...defaultR2C, startingRate: 50 });
    expect(highRate.commissionIncome).toBeGreaterThan(result.commissionIncome);
  });
});

// ── Cross-check: both calculators agree on shared math ──────────────

describe('cross-calculator consistency', () => {
  it('both calculators produce the same usage percentage', () => {
    const c2r = calculateCommissionToRenter(defaultC2R);
    expect(c2r.usagePct).toBeCloseTo(
      defaultR2C.stylistHours / defaultR2C.totalStylistHours,
      6
    );
  });

  it('both calculators use tiered commission (not flat rate)', () => {
    const c2r = calculateCommissionToRenter(defaultC2R);
    const r2c = calculateRenterToCommission(defaultR2C);
    // Both should produce the same commission for the same service income and starting rate
    expect(c2r.commissionGross).toBeCloseTo(r2c.weeklyCommission * 52, 2);
  });

  it('no flat commissionPct anywhere — both use tiered brackets', () => {
    const c2r = calculateCommissionToRenter(defaultC2R);
    const tiered = calculateTieredCommission(100000 / 52);
    expect(c2r.commissionGross).toBeCloseTo(tiered.grossCommission * 52, 2);
  });
});
