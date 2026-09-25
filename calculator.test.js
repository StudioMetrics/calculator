import { describe, it, expect } from 'vitest';

const {
  formatCurrency,
  formatPercent,
  calculateCommissionToRenter,
  calculateRenterToCommission,
  calculateTieredCommission,
  calculateFlatCommission,
  calculateSelfEmploymentTax,
  calculateCAIncomeTax,
  calculateAfterTaxReality,
  DEFAULT_COMMISSION_TIERS,
  PAYROLL_TAX_RATE,
  SS_WAGE_BASE_2025
} = require('./calculator');

// ── Default test inputs (Studio Los Gatos sample data) ──────────────

const defaultC2R = {
  serviceIncome: 100000,
  tips: 32099,
  startingRate: 40,
  weeklyRent: 525,
  colorSupplies: 10125,
  marketing: 3500,
  assistantHourly: 20,
  assistantHours: 6,
  assistantDays: 4,
  asstTaxPct: 7,
  ccFeePct: 2.9,
};

const defaultR2C = {
  serviceIncome: 100000,
  tips: 32099,
  startingRate: 40,
  weeklyRent: 525,
  colorSupplies: 10125,
  marketing: 3500,
  laundry: 0,
  ccFeePct: 2.9,
  otherExpenses: 1500,
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

  it('calculates yearly rent', () => {
    expect(result.yearlyRent).toBe(525 * 52);
  });

  it('calculates assistant yearly cost with tax', () => {
    const expected = 20 * 6 * 4 * (1 + 7 / 100) * 52;
    expect(result.asstYearly).toBeCloseTo(expected, 2);
  });

  it('uses direct color/supplies and marketing costs', () => {
    expect(result.colorSupplies).toBe(10125);
    expect(result.marketing).toBe(3500);
  });

  it('calculates credit card fees on income + tips', () => {
    expect(result.ccFees).toBeCloseTo((100000 + 32099) * 0.029, 2);
  });

  it('sums total COGS correctly', () => {
    const expectedCOGS =
      result.yearlyRent +
      result.asstYearly +
      result.colorSupplies +
      result.ccFees +
      result.marketing;
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

  it('does not return salonBenefitsBreakdown or salonBenefitsValue', () => {
    expect(result).not.toHaveProperty('salonBenefitsValue');
    expect(result).not.toHaveProperty('salonBenefitsBreakdown');
  });

  it('calculates crossover retention percentage using tax-adjusted numbers', () => {
    const AFTER_SE = 1 - 0.9235 * 0.153;
    const expected = 100 * (result.totalIncome - result.adjustedCurrentTakeHome / AFTER_SE - result.totalCOGS) / result.totalIncome;
    expect(result.crossoverRetention).toBeCloseTo(expected, 2);
  });

  it('applies 8.85% payroll tax (FICA + CA SDI) to currentTakeHome', () => {
    expect(result.payrollTax).toBeCloseTo(result.currentTakeHome * 0.0885, 2);
    expect(PAYROLL_TAX_RATE).toBe(0.0885);
  });

  it('calculates adjustedCurrentTakeHome as currentTakeHome minus payroll tax', () => {
    expect(result.adjustedCurrentTakeHome).toBeCloseTo(result.currentTakeHome - result.payrollTax, 2);
  });

  it('calculates renterSelfEmploymentTax via calculateSelfEmploymentTax', () => {
    expect(result.renterSelfEmploymentTax).toBeGreaterThan(0);
    const expected = calculateSelfEmploymentTax(result.scenarios[0].takeHome);
    expect(result.renterSelfEmploymentTax).toBeCloseTo(expected.seTax, 2);
  });

  it('produces 6 adjustedScenarios with adjustedTakeHome <= takeHome', () => {
    expect(result.adjustedScenarios).toHaveLength(6);
    result.adjustedScenarios.forEach((s, i) => {
      expect(s.adjustedTakeHome).toBeLessThanOrEqual(result.scenarios[i].takeHome);
      const expectedSE = calculateSelfEmploymentTax(result.scenarios[i].takeHome).seTax;
      expect(s.adjustedTakeHome).toBeCloseTo(result.scenarios[i].takeHome - expectedSE, 2);
    });
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
    expect(result.tierBreakdown).toHaveLength(5);
    expect(result.tierBreakdown[0].rate).toBe(0.40);
    expect(result.tierBreakdown[0].amount).toBe(1500);
  });

  it('calculates commission spanning 40% and 45% brackets', () => {
    const result = calculateTieredCommission(3000);
    // $2,000 * 0.40 + $1,000 * 0.45 = $800 + $450 = $1,250
    expect(result.grossCommission).toBe(1250);
    expect(result.effectiveRate).toBeCloseTo(1250 / 3000, 4);
    expect(result.tierBreakdown).toHaveLength(5);
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
    expect(result.tierBreakdown).toHaveLength(5);
  });

  it('handles exact bracket boundary ($2,000)', () => {
    const result = calculateTieredCommission(2000);
    expect(result.grossCommission).toBe(800);
    expect(result.tierBreakdown).toHaveLength(5);
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
    // 100000 * 0.9235 * 0.153 = 14,129.55 (below SS cap, so full 15.3% applies)
    expect(result.seTax).toBeCloseTo(14129.55, 2);
    expect(result.effectiveRate).toBeCloseTo(0.141296, 4);
  });

  it('exposes ssPortion and medicarePortion that sum to seTax', () => {
    const result = calculateSelfEmploymentTax(100000);
    // 100000 * 0.9235 = 92,350 taxable base
    expect(result.ssPortion).toBeCloseTo(92350 * 0.124, 2);
    expect(result.medicarePortion).toBeCloseTo(92350 * 0.029, 2);
    expect(result.ssPortion + result.medicarePortion).toBeCloseTo(result.seTax, 2);
  });

  it('caps the SS portion at the 2025 wage base while Medicare stays uncapped', () => {
    // 250000 * 0.9235 = 230,875 > 176,100 → SS base is capped
    const result = calculateSelfEmploymentTax(250000);
    expect(result.ssPortion).toBeCloseTo(SS_WAGE_BASE_2025 * 0.124, 2); // 21,836.40
    expect(result.medicarePortion).toBeCloseTo(250000 * 0.9235 * 0.029, 2);
    expect(result.seTax).toBeCloseTo(21836.40 + 6695.38, 1);
  });

  it('grows only at the flat 2.9% Medicare rate above the cap', () => {
    const lower = calculateSelfEmploymentTax(250000).seTax;
    const higher = calculateSelfEmploymentTax(260000).seTax;
    expect(higher - lower).toBeCloseTo(10000 * 0.9235 * 0.029, 2); // 267.82, not 10k * 0.1413
  });

  it('has a falling effective rate above the cap', () => {
    const atCapEarnings = SS_WAGE_BASE_2025 / 0.9235; // earnings where SS base exactly hits cap
    const peak = calculateSelfEmploymentTax(atCapEarnings).effectiveRate;
    const above = calculateSelfEmploymentTax(300000).effectiveRate;
    const further = calculateSelfEmploymentTax(500000).effectiveRate;
    expect(peak).toBeCloseTo(0.9235 * 0.153, 4); // max effective rate at the cap
    expect(above).toBeLessThan(peak);
    expect(further).toBeLessThan(above);
  });

  it('returns zero for zero earnings', () => {
    const result = calculateSelfEmploymentTax(0);
    expect(result.seTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.ssPortion).toBe(0);
    expect(result.medicarePortion).toBe(0);
  });

  it('returns zero for negative earnings', () => {
    const result = calculateSelfEmploymentTax(-5000);
    expect(result.seTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.ssPortion).toBe(0);
    expect(result.medicarePortion).toBe(0);
  });
});

// ── CA Income Tax ───────────────────────────────────────────────────

describe('calculateCAIncomeTax', () => {
  it('returns zero for zero and negative income', () => {
    expect(calculateCAIncomeTax(0)).toBe(0);
    expect(calculateCAIncomeTax(-1000)).toBe(0);
  });

  it('taxes the first bracket at 1% up to $11,079', () => {
    expect(calculateCAIncomeTax(11079)).toBeCloseTo(110.79, 2);
    expect(calculateCAIncomeTax(10000)).toBeCloseTo(100, 2);
  });

  it('computes exact marginal tax at each 2025 single bracket boundary', () => {
    const boundaries = [
      [11079, 110.79],
      [26264, 414.49],
      [41452, 1022.01],
      [57542, 1987.41],
      [72724, 3201.97],
      [371479, 30986.185],
      [445771, 38638.261],
      [742953, 72219.827],
    ];
    for (const [income, expected] of boundaries) {
      expect(calculateCAIncomeTax(income)).toBeCloseTo(expected, 2);
    }
  });

  it('steps up to the next marginal rate just past a boundary', () => {
    // $1 past the 2% bracket is taxed at the 4% rate
    expect(calculateCAIncomeTax(26265)).toBeCloseTo(414.49 + 0.04, 2);
    expect(calculateCAIncomeTax(26265) - calculateCAIncomeTax(26264)).toBeCloseTo(0.04, 6);
  });

  it('applies 12.3% to income in the top bracket', () => {
    expect(calculateCAIncomeTax(1000000)).toBeCloseTo(103836.608, 2);
    // $1 past the top boundary: previous exact tax + one dollar at 12.3%
    expect(calculateCAIncomeTax(742954)).toBeCloseTo(72219.827 + 0.123, 2);
  });

  it('is monotonically increasing in income', () => {
    let prev = 0;
    for (let income = 0; income <= 800000; income += 25000) {
      const tax = calculateCAIncomeTax(income);
      expect(tax).toBeGreaterThanOrEqual(prev);
      prev = tax;
    }
  });

  it('defaults to single brackets; filingStatus is accepted but single-only', () => {
    expect(calculateCAIncomeTax(100000)).toBe(calculateCAIncomeTax(100000, 'single'));
    expect(calculateCAIncomeTax(100000, 'married')).toBe(calculateCAIncomeTax(100000, 'single'));
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
    const expectedExpenses =
      525 * 52 +      // rent
      10125 +         // colorSupplies
      (100000 + 32099) * 0.029 + // ccFees (income + tips)
      3500 +          // marketing
      0 +             // laundry
      1500;           // otherExpenses
    expect(result.totalExpenses).toBeCloseTo(expectedExpenses, 2);
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

  it('applies 8.85% payroll tax (FICA + CA SDI) to commissionIncome', () => {
    expect(result.payrollTax).toBeCloseTo(result.commissionIncome * 0.0885, 2);
  });

  it('calculates adjusted commission income after payroll tax', () => {
    expect(result.adjustedCommissionIncome).toBeCloseTo(
      result.commissionIncome - result.payrollTax, 2
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

  it('calculates SE tax penalty (delta between SE tax and payroll tax)', () => {
    expect(result.seTaxPenalty).toBeCloseTo(
      result.selfEmploymentTax - result.payrollTax, 2
    );
    // SE tax is always more than employee-side payroll tax for same income
    expect(result.seTaxPenalty).toBeGreaterThan(0);
  });

  it('returns salon benefits value and breakdown', () => {
    expect(result.salonBenefitsValue).toBeGreaterThan(0);
    expect(result.salonBenefitsBreakdown).toHaveLength(5);
    const labels = result.salonBenefitsBreakdown.map(b => b.label);
    expect(labels).toContain('Booth Rent');
    expect(labels).toContain('Color & Supplies');
    expect(labels).toContain('Marketing');
    expect(labels).toContain('Laundry');
    expect(labels).toContain('Credit Card Processing');
    const sum = result.salonBenefitsBreakdown.reduce((s, b) => s + b.amount, 0);
    expect(sum).toBeCloseTo(result.salonBenefitsValue, 2);
  });


  it('handles zero service income gracefully', () => {
    const zeroInputs = { ...defaultR2C, serviceIncome: 0 };
    const r = calculateRenterToCommission(zeroInputs);
    expect(r.avgWeeklySales).toBe(0);
    expect(r.weeklyCommission).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(r.tierBreakdown).toHaveLength(5);
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

// ── Flat Commission ─────────────────────────────────────────────────

describe('calculateFlatCommission', () => {
  it('calculates gross as weeklySales * rate', () => {
    const result = calculateFlatCommission(2000, 0.45);
    expect(result.grossCommission).toBe(900);
  });

  it('effectiveRate equals the flat rate', () => {
    const result = calculateFlatCommission(2000, 0.45);
    expect(result.effectiveRate).toBe(0.45);
  });

  it('returns single-entry tierBreakdown', () => {
    const result = calculateFlatCommission(3000, 0.50);
    expect(result.tierBreakdown).toHaveLength(1);
    expect(result.tierBreakdown[0].rangeLabel).toBe('All Sales');
    expect(result.tierBreakdown[0].amount).toBe(3000);
    expect(result.tierBreakdown[0].rate).toBe(0.50);
    expect(result.tierBreakdown[0].commission).toBe(1500);
  });

  it('returns zero for zero sales', () => {
    const result = calculateFlatCommission(0, 0.40);
    expect(result.grossCommission).toBe(0);
    expect(result.effectiveRate).toBe(0.40);
  });
});

// ── Custom Tiers ────────────────────────────────────────────────────

describe('calculateTieredCommission with custom tiers', () => {
  const customTiers = [
    { upTo: 1000, rate: 0.30 },
    { upTo: 3000, rate: 0.40 },
    { upTo: Infinity, rate: 0.50 },
  ];

  it('uses custom tier brackets', () => {
    const result = calculateTieredCommission(2000, 0.30, customTiers);
    // $1,000 * 0.30 + $1,000 * 0.40 = $300 + $400 = $700
    expect(result.grossCommission).toBe(700);
    expect(result.tierBreakdown).toHaveLength(3);
  });

  it('spans all custom brackets', () => {
    const result = calculateTieredCommission(5000, 0.30, customTiers);
    // $1,000 * 0.30 + $2,000 * 0.40 + $2,000 * 0.50 = $300 + $800 + $1,000 = $2,100
    expect(result.grossCommission).toBe(2100);
  });

  it('applies startingRate delta to custom tiers', () => {
    // startingRate 0.35 vs base 0.30 → delta 0.05
    const result = calculateTieredCommission(1000, 0.35, customTiers);
    // $1,000 * min(0.30 + 0.05, 0.60) = $1,000 * 0.35 = $350
    expect(result.grossCommission).toBe(350);
    expect(result.tierBreakdown[0].rate).toBe(0.35);
  });

  it('DEFAULT_COMMISSION_TIERS is exported and has 5 tiers', () => {
    expect(DEFAULT_COMMISSION_TIERS).toHaveLength(5);
    expect(DEFAULT_COMMISSION_TIERS[0].rate).toBe(0.40);
  });
});

// ── Flat vs Tiered in both calculators ──────────────────────────────

describe('flat commission mode in calculators', () => {
  it('calculateRenterToCommission uses flat when commissionType is "flat"', () => {
    const result = calculateRenterToCommission({ ...defaultR2C, commissionType: 'flat' });
    expect(result.commissionType).toBe('flat');
    expect(result.tierBreakdown).toHaveLength(1);
    expect(result.tierBreakdown[0].rangeLabel).toBe('All Sales');
    expect(result.effectiveRate).toBe(0.40);
  });

  it('calculateCommissionToRenter uses flat when commissionType is "flat"', () => {
    const result = calculateCommissionToRenter({ ...defaultC2R, commissionType: 'flat' });
    expect(result.commissionType).toBe('flat');
    expect(result.tierBreakdown).toHaveLength(1);
    expect(result.effectiveRate).toBe(0.40);
  });

  it('defaults to tiered when commissionType is not set', () => {
    const result = calculateRenterToCommission(defaultR2C);
    expect(result.commissionType).toBe('tiered');
    expect(result.tierBreakdown).toHaveLength(5);
  });

  it('both calculators accept custom commissionTiers', () => {
    const customTiers = [
      { upTo: 1500, rate: 0.35 },
      { upTo: Infinity, rate: 0.45 },
    ];
    const r2c = calculateRenterToCommission({ ...defaultR2C, commissionTiers: customTiers, startingRate: 35 });
    expect(r2c.tierBreakdown).toHaveLength(2);

    const c2r = calculateCommissionToRenter({ ...defaultC2R, commissionTiers: customTiers, startingRate: 35 });
    expect(c2r.tierBreakdown).toHaveLength(2);
  });
});

// ── Salon Investments ───────────────────────────────────────────────

const salonInvestments = {
  marketingAnnual: 33375,
  marketingDescription: 'Google Ads, Yelp, Instagram, SEO',
  laundryAnnual: 6000,
  laundryDescription: 'Towels, capes, linens',
  frontDeskAnnual: 48000,
  frontDeskDescription: 'Booking, check-in, phone, retail',
  newClientsPerMonth: 100,
};

describe('salon investments in calculateRenterToCommission', () => {
  it('returns salonInvestmentsBreakdown when salonInvestments provided', () => {
    const result = calculateRenterToCommission({ ...defaultR2C, salonInvestments });
    expect(result.salonInvestmentsBreakdown).toHaveLength(3);
    const labels = result.salonInvestmentsBreakdown.map(i => i.label);
    expect(labels).toContain('Salon Marketing');
    expect(labels).toContain('Laundry Service');
    expect(labels).toContain('Front Desk & Support');
  });

  it('salonInvestmentsValue is sum of all amounts', () => {
    const result = calculateRenterToCommission({ ...defaultR2C, salonInvestments });
    expect(result.salonInvestmentsValue).toBe(33375 + 6000 + 48000);
  });

  it('includes description on each item', () => {
    const result = calculateRenterToCommission({ ...defaultR2C, salonInvestments });
    const marketing = result.salonInvestmentsBreakdown.find(i => i.label === 'Salon Marketing');
    expect(marketing.description).toBe('Google Ads, Yelp, Instagram, SEO');
  });

  it('returns empty array and zero value when salonInvestments not provided', () => {
    const result = calculateRenterToCommission(defaultR2C);
    expect(result.salonInvestmentsBreakdown).toEqual([]);
    expect(result.salonInvestmentsValue).toBe(0);
  });

  it('omits items with zero amounts', () => {
    const partial = { ...salonInvestments, laundryAnnual: 0, frontDeskAnnual: 0 };
    const result = calculateRenterToCommission({ ...defaultR2C, salonInvestments: partial });
    expect(result.salonInvestmentsBreakdown).toHaveLength(1);
    expect(result.salonInvestmentsBreakdown[0].label).toBe('Salon Marketing');
    expect(result.salonInvestmentsValue).toBe(33375);
  });
});

describe('salon investments in calculateCommissionToRenter', () => {
  it('returns salonInvestmentsBreakdown when salonInvestments provided', () => {
    const result = calculateCommissionToRenter({ ...defaultC2R, salonInvestments });
    expect(result.salonInvestmentsBreakdown).toHaveLength(3);
    expect(result.salonInvestmentsValue).toBe(33375 + 6000 + 48000);
  });

  it('returns empty when not provided (backwards compat)', () => {
    const result = calculateCommissionToRenter(defaultC2R);
    expect(result.salonInvestmentsBreakdown).toEqual([]);
    expect(result.salonInvestmentsValue).toBe(0);
  });
});

// ── After-Tax Reality ───────────────────────────────────────────────

describe('calculateAfterTaxReality', () => {
  const reality = calculateAfterTaxReality(defaultC2R);

  // Independent recomputation from raw inputs + the already-tested tax
  // primitives (SE tax, CA brackets, payroll rate) — no reuse of
  // calculateCommissionToRenter output.
  const totalIncome = 100000 + 32099;
  const cogs =
    525 * 52 +                        // booth rent
    10125 +                           // color & supplies
    (100000 + 32099) * 0.029 +        // cc fees (income + tips)
    3500 +                            // marketing
    20 * 6 * 4 * (1 + 7 / 100) * 52;  // assistant incl. tax load
  const renterPreTax = totalIncome - cogs;
  const expectedRenterSe = calculateSelfEmploymentTax(renterPreTax).seTax;
  const expectedRenterCa = calculateCAIncomeTax(renterPreTax);
  const expectedRenterAfterTax = renterPreTax - expectedRenterSe - expectedRenterCa;

  const commissionComp =
    calculateTieredCommission(100000 / 52).grossCommission * 52 + 32099;
  const expectedCommissionPayroll = commissionComp * PAYROLL_TAX_RATE;
  const expectedCommissionCa = calculateCAIncomeTax(commissionComp);
  const expectedCommissionAfterTax =
    commissionComp - expectedCommissionPayroll - expectedCommissionCa;

  it('computes the renter side at 0% client loss with SE + CA taxes', () => {
    expect(reality.renterPreTax).toBeCloseTo(renterPreTax, 2);
    expect(reality.renterSeTax).toBeCloseTo(expectedRenterSe, 2);
    expect(reality.renterCaTax).toBeCloseTo(expectedRenterCa, 2);
    expect(reality.renterAfterTax).toBeCloseTo(expectedRenterAfterTax, 2);
  });

  it('computes the commission side with 8.85% payroll + CA taxes', () => {
    expect(reality.commissionComp).toBeCloseTo(commissionComp, 2);
    expect(reality.commissionPayrollTax).toBeCloseTo(expectedCommissionPayroll, 2);
    expect(reality.commissionCaTax).toBeCloseTo(expectedCommissionCa, 2);
    expect(reality.commissionAfterTax).toBeCloseTo(expectedCommissionAfterTax, 2);
  });

  it('derives gapAfterTax (renter − commission after tax) and gapMonthly', () => {
    expect(reality.gapAfterTax).toBeCloseTo(
      expectedRenterAfterTax - expectedCommissionAfterTax, 2
    );
    expect(reality.gapMonthly).toBeCloseTo(reality.gapAfterTax / 12, 6);
  });

  it('builds a retention table for 0–50% client loss', () => {
    expect(reality.retentionTable).toHaveLength(6);
    expect(reality.retentionTable.map(r => r.clientsLost)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(reality.retentionTable[0].renterAfterTax).toBeCloseTo(reality.renterAfterTax, 2);
    expect(reality.retentionTable[0].commissionAdvantage).toBeCloseTo(
      reality.commissionAfterTax - reality.renterAfterTax, 2
    );
  });

  it('retention table is monotonic: renter after-tax falls, commission advantage rises', () => {
    for (let i = 1; i < reality.retentionTable.length; i++) {
      expect(reality.retentionTable[i].renterAfterTax)
        .toBeLessThan(reality.retentionTable[i - 1].renterAfterTax);
      expect(reality.retentionTable[i].commissionAdvantage)
        .toBeGreaterThan(reality.retentionTable[i - 1].commissionAdvantage);
    }
  });

  it('shows a commission-wins crossover for a mid-income book', () => {
    // Lighter-COGS variant: renter still ahead with a full book, but any
    // meaningful client loss flips the comparison to commission.
    const midIncome = calculateAfterTaxReality({
      ...defaultC2R, assistantHourly: 0, assistantHours: 0, assistantDays: 0,
    });
    expect(midIncome.retentionTable[0].commissionAdvantage).toBeLessThan(0);
    const winners = midIncome.retentionTable.filter(r => r.commissionAdvantage > 0);
    expect(winners.length).toBeGreaterThan(0);
    expect(winners[0].clientsLost).toBeGreaterThan(0);
  });

  it('salonValue itemizes exactly the totalCOGS components', () => {
    const labels = reality.salonValue.items.map(i => i.label);
    expect(labels).toEqual([
      'Booth Rent',
      'Color & Supplies',
      'Credit Card Processing',
      'Marketing',
      'Assistant Support',
    ]);
    expect(reality.salonValue.total).toBeCloseTo(cogs, 2);
    const sum = reality.salonValue.items.reduce((s, i) => s + i.amount, 0);
    expect(sum).toBeCloseTo(reality.salonValue.total, 2);
  });

  it('works with the assistant disabled and with flat commission', () => {
    const noAsst = calculateAfterTaxReality({
      ...defaultC2R, assistantHourly: 0, assistantHours: 0, assistantDays: 0,
    });
    expect(noAsst.salonValue.items.find(i => i.label === 'Assistant Support').amount).toBe(0);
    expect(noAsst.salonValue.total).toBeCloseTo(
      525 * 52 + 10125 + (100000 + 32099) * 0.029 + 3500, 2
    );

    const flat = calculateAfterTaxReality({
      ...defaultC2R, commissionType: 'flat', startingRate: 40,
    });
    expect(flat.commissionComp).toBeCloseTo(100000 * 0.40 + 32099, 2);
  });

  it('stays finite for zero income', () => {
    const zero = calculateAfterTaxReality({ ...defaultC2R, serviceIncome: 0, tips: 0 });
    [zero.renterAfterTax, zero.commissionAfterTax, zero.gapAfterTax, zero.gapMonthly].forEach(v => {
      expect(Number.isFinite(v)).toBe(true);
    });
    expect(zero.commissionComp).toBe(0);
  });
});
