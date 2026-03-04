import { describe, it, expect } from 'vitest';

const {
  formatCurrency,
  formatPercent,
  calculateCommissionToRenter,
  calculateRenterToCommission,
  calculateTieredCommission,
  calculateFlatCommission,
  calculateSelfEmploymentTax,
  DEFAULT_COMMISSION_TIERS
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

  it('calculates break-even weekly rent using tax-adjusted numbers', () => {
    const AFTER_SE = 1 - 0.9235 * 0.153;
    const otherCOGS = result.totalCOGS - result.yearlyRent;
    const expected = (result.totalIncome - otherCOGS - result.adjustedCurrentTakeHome / AFTER_SE) / 52;
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

  it('calculates crossover retention percentage using tax-adjusted numbers', () => {
    const AFTER_SE = 1 - 0.9235 * 0.153;
    const expected = 100 * (result.totalIncome - result.adjustedCurrentTakeHome / AFTER_SE - result.totalCOGS) / result.totalIncome;
    expect(result.crossoverRetention).toBeCloseTo(expected, 2);
  });

  it('calculates commissionFica at 7.65% of currentTakeHome', () => {
    expect(result.commissionFica).toBeCloseTo(result.currentTakeHome * 0.0765, 2);
  });

  it('calculates adjustedCurrentTakeHome as currentTakeHome minus FICA', () => {
    expect(result.adjustedCurrentTakeHome).toBeCloseTo(result.currentTakeHome - result.commissionFica, 2);
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
