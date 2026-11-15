/**
 * DuPont 5-Stage ROE Decomposition Engine
 * 
 * References:
 * Bodie, Kane & Marcus, Investments (12th/13th Edition),
 * Chapter 19: Financial Statement Analysis, Section 19.4 (The DuPont System).
 * 
 * Multiplicative Decomposition:
 * ROE = (Net Income / EBT)     [Tax Burden]
 *     * (EBT / EBIT)            [Interest Burden]
 *     * (EBIT / Sales)          [Operating Margin]
 *     * (Sales / Assets)        [Asset Turnover]
 *     * (Assets / Equity)       [Financial Leverage]
 * 
 * Mathematical Identity:
 * Product(factor_1 .. factor_5) == Net Income / Equity == ROE
 */

/**
 * Calculates the complete 5-stage DuPont decomposition for a single period.
 * 
 * @param {Object} params
 * @param {number} params.netIncome - Bottom-line net income
 * @param {number} [params.ebt] - Pre-tax earnings (EBT). If omitted, inferred from taxes/operating income.
 * @param {number} [params.ebit] - Operating income / EBIT
 * @param {number} [params.operatingIncome] - Alias for ebit
 * @param {number} params.sales - Total revenue / sales
 * @param {number} [params.revenue] - Alias for sales
 * @param {number} params.totalAssets - Total assets (or average assets)
 * @param {number} params.totalEquity - Total shareholders' equity (or average equity)
 * @param {number} [params.totalDebt] - Total debt (optional, for leverage sanity checks)
 * @param {number} [params.interestExpense] - Total interest expense (optional)
 * @param {number} [params.incomeTaxExpense] - Total tax expense (optional)
 * @returns {Object} DuPont 5-stage decomposition result and quality assessment
 */
export function calculateDuPont5Stage(params = {}) {
  const netIncome = Number(params.netIncome) || 0;
  const sales = Number(params.sales || params.revenue) || 0;
  const totalAssets = Number(params.totalAssets) || 0;
  const totalEquity = Number(params.totalEquity) || 0;
  const totalDebt = Number(params.totalDebt) || 0;
  const interestExpense = Number(params.interestExpense) || 0;
  const incomeTaxExpense = Number(params.incomeTaxExpense) || 0;

  let ebit = params.ebit !== undefined ? Number(params.ebit) : (params.operatingIncome !== undefined ? Number(params.operatingIncome) : null);
  let ebt = params.ebt !== undefined ? Number(params.ebt) : (params.pretaxIncome !== undefined ? Number(params.pretaxIncome) : null);

  // Derive ebit if missing
  if (ebit === null) {
    if (ebt !== null && interestExpense > 0) {
      ebit = ebt + interestExpense;
    } else {
      ebit = netIncome + incomeTaxExpense + interestExpense;
    }
  }

  // Derive ebt if missing
  if (ebt === null) {
    if (incomeTaxExpense > 0) {
      ebt = netIncome + incomeTaxExpense;
    } else if (interestExpense > 0 && ebit !== null) {
      ebt = ebit - interestExpense;
    } else {
      // Standard corporate tax rate assumption ~21% if positive net income, else ebt = netIncome
      ebt = netIncome > 0 ? netIncome / (1 - 0.21) : netIncome;
    }
  }

  // Direct ROE and ROA
  const roe = totalEquity !== 0 ? netIncome / totalEquity : null;
  const netROA = totalAssets !== 0 ? netIncome / totalAssets : null;
  const compoundROA = totalAssets !== 0 ? ebit / totalAssets : null; // EBIT / Assets

  // 1. Tax Burden = Net Income / EBT
  let taxBurden = null;
  if (ebt !== 0) {
    taxBurden = netIncome / ebt;
  } else if (netIncome === 0) {
    taxBurden = 1.0;
  }

  // 2. Interest Burden = EBT / EBIT
  let interestBurden = null;
  if (ebit !== 0) {
    interestBurden = ebt / ebit;
  } else if (ebt === 0) {
    interestBurden = 1.0;
  }

  // 3. Operating Margin = EBIT / Sales
  let operatingMargin = null;
  if (sales !== 0) {
    operatingMargin = ebit / sales;
  }

  // 4. Asset Turnover = Sales / Assets
  let assetTurnover = null;
  if (totalAssets !== 0) {
    assetTurnover = sales / totalAssets;
  }

  // 5. Financial Leverage (Equity Multiplier) = Assets / Equity
  let financialLeverage = null;
  if (totalEquity !== 0) {
    financialLeverage = totalAssets / totalEquity;
  }

  // Multiplicative Reconstructed ROE = TB * IB * OM * ATO * FL
  let reconstructedROE = null;
  let identityResidual = 0;
  if (
    taxBurden !== null &&
    interestBurden !== null &&
    operatingMargin !== null &&
    assetTurnover !== null &&
    financialLeverage !== null
  ) {
    reconstructedROE = taxBurden * interestBurden * operatingMargin * assetTurnover * financialLeverage;
    if (roe !== null) {
      identityResidual = Math.abs(reconstructedROE - roe);
    }
  }

  // Supplementary Bodie Ratios
  const effectiveTaxRate = taxBurden !== null && taxBurden <= 1.0 ? 1 - taxBurden : null;
  const interestDrag = interestBurden !== null && interestBurden <= 1.0 ? 1 - interestBurden : null;
  const debtToEquity = totalEquity !== 0 ? totalDebt / totalEquity : null;

  // Quality of Earnings Diagnostics
  const quality = assessEarningsQuality({
    roe,
    netIncome,
    ebt,
    ebit,
    sales,
    totalAssets,
    totalEquity,
    taxBurden,
    interestBurden,
    operatingMargin,
    assetTurnover,
    financialLeverage,
    compoundROA,
    netROA,
    totalDebt
  });

  return {
    inputs: {
      netIncome,
      ebt,
      ebit,
      sales,
      totalAssets,
      totalEquity,
      totalDebt,
      interestExpense,
      incomeTaxExpense
    },
    stages: {
      taxBurden,         // Net Income / EBT
      interestBurden,    // EBT / EBIT
      operatingMargin,   // EBIT / Sales
      assetTurnover,     // Sales / Assets
      financialLeverage  // Assets / Equity
    },
    ratios: {
      roe,
      reconstructedROE,
      identityResidual,
      compoundROA,       // EBIT / Assets
      netROA,            // Net Income / Assets
      effectiveTaxRate,
      interestDrag,
      debtToEquity
    },
    quality
  };
}

/**
 * Assesses the quality of earnings based on DuPont component drivers.
 * Flags artificial ROE inflation resulting from high leverage or declining tax rates
 * vs expanding core operating margins.
 */
export function assessEarningsQuality(data) {
  const {
    roe,
    netIncome,
    taxBurden,
    interestBurden,
    operatingMargin,
    assetTurnover,
    financialLeverage,
    compoundROA,
    netROA
  } = data;

  const flags = [];
  let score = 50; // Base score (0 to 100)
  let primaryDriver = 'Balanced';
  let qualityRating = 'Moderate Quality';

  if (roe === null || !Number.isFinite(roe)) {
    return {
      qualityScore: 0,
      qualityRating: 'Insufficient Data',
      primaryDriver: 'Unknown',
      flags: ['Insufficient balance sheet or income statement data to evaluate ROE.']
    };
  }

  // 1. Operating Profitability Contribution (Max 30 pts)
  if (operatingMargin !== null) {
    if (operatingMargin >= 0.25) {
      score += 25;
      flags.push({
        type: 'positive',
        title: 'Exceptional Operating Margin',
        detail: `Core operating margin is ${(operatingMargin * 100).toFixed(1)}%, indicating strong pricing power and competitive moat.`
      });
    } else if (operatingMargin >= 0.15) {
      score += 18;
      flags.push({
        type: 'positive',
        title: 'Robust Operating Margin',
        detail: `Healthy operating margin of ${(operatingMargin * 100).toFixed(1)}% supports high-quality organic returns.`
      });
    } else if (operatingMargin >= 0.08) {
      score += 10;
    } else if (operatingMargin > 0) {
      score += 2;
      flags.push({
        type: 'warning',
        title: 'Thin Operating Margin',
        detail: `Operating margin is modest at ${(operatingMargin * 100).toFixed(1)}%, leaving little cushion against cost inflation.`
      });
    } else {
      score -= 25;
      flags.push({
        type: 'danger',
        title: 'Negative Operating Profitability',
        detail: `Operating margin is negative (${(operatingMargin * 100).toFixed(1)}%). Core business operations are losing money.`
      });
    }
  }

  // 2. Asset Efficiency (Capital Turnover) Contribution (Max 20 pts)
  if (assetTurnover !== null) {
    if (assetTurnover >= 1.5) {
      score += 18;
      flags.push({
        type: 'positive',
        title: 'Superior Capital Turnover',
        detail: `Asset turnover of ${assetTurnover.toFixed(2)}x indicates exceptional capital efficiency and rapid inventory velocity.`
      });
    } else if (assetTurnover >= 0.8) {
      score += 12;
    } else if (assetTurnover >= 0.4) {
      score += 5;
    } else {
      score -= 8;
      flags.push({
        type: 'warning',
        title: 'Low Asset Turnover',
        detail: `Asset turnover is sluggish at ${assetTurnover.toFixed(2)}x, indicating a capital-intensive asset base.`
      });
    }
  }

  // 3. Financial Leverage Evaluation (Risk & Artificial Inflation)
  let isLeverageInflated = false;
  if (financialLeverage !== null) {
    if (financialLeverage > 4.5) {
      if (operatingMargin !== null && operatingMargin >= 0.20 && interestBurden !== null && interestBurden >= 0.85) {
        // High margin + low interest drag + high leverage = Equity compressed by heavy share buybacks (e.g. Apple)
        score += 10;
        flags.push({
          type: 'info',
          title: 'Buyback-Driven Equity Multiplier',
          detail: `Financial leverage is high at ${financialLeverage.toFixed(2)}x, resulting from equity compression via shareholder repurchases, supported by strong operating profitability.`
        });
      } else {
        score -= 25;
        isLeverageInflated = true;
        flags.push({
          type: 'danger',
          title: 'Severe Financial Gearing (Artificial ROE)',
          detail: `Financial leverage is high at ${financialLeverage.toFixed(2)}x (Assets/Equity). ROE is heavily engineered through debt rather than operational excellence.`
        });
      }
    } else if (financialLeverage > 3.0) {
      score -= 12;
      if (operatingMargin !== null && operatingMargin < 0.08) {
        isLeverageInflated = true;
        flags.push({
          type: 'warning',
          title: 'Leverage-Dependent ROE',
          detail: `Financial leverage of ${financialLeverage.toFixed(2)}x masks modest core operating margins (${(operatingMargin * 100).toFixed(1)}%).`
        });
      } else {
        flags.push({
          type: 'info',
          title: 'Moderate Financial Leverage',
          detail: `Financial leverage is elevated at ${financialLeverage.toFixed(2)}x but supported by sufficient cash generation.`
        });
      }
    } else if (financialLeverage >= 1.2 && financialLeverage <= 2.2) {
      score += 15;
      flags.push({
        type: 'positive',
        title: 'Prudent Balance Sheet Gearing',
        detail: `Conservative leverage of ${financialLeverage.toFixed(2)}x provides solvency stability across economic downcycles.`
      });
    } else if (financialLeverage < 1.1 && financialLeverage > 0) {
      score += 10;
      flags.push({
        type: 'info',
        title: 'Unleveraged / Cash-Rich Capital Structure',
        detail: `Virtually unleveraged capital structure (${financialLeverage.toFixed(2)}x) with minimal debt obligations.`
      });
    }
  }

  // 4. Interest Burden & Debt Service Drain
  if (interestBurden !== null) {
    if (interestBurden >= 0.90) {
      score += 10;
    } else if (interestBurden >= 0.75) {
      score += 4;
    } else if (interestBurden < 0.50 && interestBurden > 0) {
      score -= 15;
      flags.push({
        type: 'danger',
        title: 'Heavy Interest Expense Burden',
        detail: `Interest burden of ${interestBurden.toFixed(2)} indicates that over ${((1 - interestBurden) * 100).toFixed(0)}% of EBIT is consumed by interest payments.`
      });
    }
  }

  // 5. Tax Burden Windfall Check
  let isTaxInflated = false;
  if (taxBurden !== null) {
    if (taxBurden > 0.95 && roe > 0.15) {
      isTaxInflated = true;
      score -= 8;
      flags.push({
        type: 'warning',
        title: 'Transitory Tax Burden Advantage',
        detail: `Tax burden ratio is ${(taxBurden * 100).toFixed(1)}% (effective tax rate is low or negative), which temporarily inflates ROE via non-operating tax credits.`
      });
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine Primary Driver
  if (operatingMargin !== null && assetTurnover !== null && financialLeverage !== null) {
    const marginStrength = operatingMargin / 0.15; // normalized to 15% benchmark
    const turnoverStrength = assetTurnover / 1.0;  // normalized to 1.0x benchmark
    const leverageStrength = financialLeverage / 2.0; // normalized to 2.0x benchmark

    if (isLeverageInflated) {
      primaryDriver = 'Financial Gearing (High Leverage)';
    } else if (isTaxInflated && marginStrength < 1.0) {
      primaryDriver = 'Tax Arbitrage / Windfalls';
    } else if (marginStrength >= turnoverStrength && marginStrength >= 1.2) {
      primaryDriver = 'Operational Profitability (Pricing Power)';
    } else if (turnoverStrength > marginStrength && turnoverStrength >= 1.2) {
      primaryDriver = 'Capital Efficiency (Asset Velocity)';
    } else {
      primaryDriver = 'Balanced Multi-Factor Execution';
    }
  }

  // Quality Rating Classification
  if (operatingMargin !== null && operatingMargin < 0 || (netIncome !== null && netIncome < 0)) {
    qualityRating = 'Low Quality / Distressed';
    score = Math.min(score, 35);
  } else if (score >= 80) {
    qualityRating = 'High Quality (Organic Alpha)';
  } else if (score >= 60) {
    qualityRating = 'Solid Quality (Sustainable)';
  } else if (score >= 40) {
    qualityRating = 'Moderate Quality (Mixed Drivers)';
  } else if (isLeverageInflated || score >= 25) {
    qualityRating = 'Vulnerable (Debt-Engineered)';
  } else {
    qualityRating = 'Low Quality / Distressed';
  }

  return {
    qualityScore: score,
    qualityRating,
    primaryDriver,
    isLeverageInflated,
    isTaxInflated,
    flags
  };
}

/**
 * Computes multi-year DuPont decomposition and logarithmic factor attribution of ROE delta.
 * 
 * In Bodie Chapter 19:
 * ln(ROE_t / ROE_0) = ln(TB_t / TB_0) + ln(IB_t / IB_0) + ln(OM_t / OM_0) + ln(ATO_t / ATO_0) + ln(FL_t / FL_0)
 * 
 * @param {Array<Object>} incomeHistory - Array of annual income statements (newest to oldest or chronological)
 * @param {Array<Object>} balanceHistory - Array of annual balance sheets
 * @returns {Object} Multi-year trajectory and driver contribution attribution
 */
export function calculateMultiYearDuPont(incomeHistory = [], balanceHistory = []) {
  if (!Array.isArray(incomeHistory) || incomeHistory.length === 0) {
    return { periods: [], attribution: null };
  }

  // Normalize chronological order: sort oldest to newest if needed
  const count = Math.min(incomeHistory.length, balanceHistory.length);
  const periods = [];

  for (let i = 0; i < count; i++) {
    const inc = incomeHistory[i];
    const bal = balanceHistory[i] || {};
    const yearLabel = inc.calendarYear || inc.year || inc.date || `T-${i}`;

    const decomp = calculateDuPont5Stage({
      netIncome: inc.netIncome,
      ebt: inc.ebt !== undefined ? inc.ebt : inc.pretaxIncome,
      ebit: inc.ebit !== undefined ? inc.ebit : inc.operatingIncome,
      sales: inc.revenue || inc.sales,
      totalAssets: bal.totalAssets,
      totalEquity: bal.totalEquity || bal.totalStockholdersEquity,
      totalDebt: bal.totalDebt,
      interestExpense: inc.interestExpense,
      incomeTaxExpense: inc.incomeTaxExpense
    });

    periods.push({
      year: yearLabel,
      ...decomp
    });
  }

  // Chronological order for attribution (oldest to newest)
  // Check if first period is newer than last period
  const sortedPeriods = [...periods];
  const firstYear = parseInt(sortedPeriods[0].year, 10);
  const lastYear = parseInt(sortedPeriods[sortedPeriods.length - 1].year, 10);
  if (Number.isFinite(firstYear) && Number.isFinite(lastYear) && firstYear > lastYear) {
    sortedPeriods.reverse();
  }

  // Logarithmic Delta Attribution between oldest and newest periods
  let attribution = null;
  if (sortedPeriods.length >= 2) {
    const base = sortedPeriods[0];
    const latest = sortedPeriods[sortedPeriods.length - 1];

    const roe0 = base.ratios.roe;
    const roeT = latest.ratios.roe;

    if (roe0 > 0 && roeT > 0) {
      const dLogROE = Math.log(roeT / roe0);
      const dLogTB = base.stages.taxBurden > 0 && latest.stages.taxBurden > 0 ? Math.log(latest.stages.taxBurden / base.stages.taxBurden) : 0;
      const dLogIB = base.stages.interestBurden > 0 && latest.stages.interestBurden > 0 ? Math.log(latest.stages.interestBurden / base.stages.interestBurden) : 0;
      const dLogOM = base.stages.operatingMargin > 0 && latest.stages.operatingMargin > 0 ? Math.log(latest.stages.operatingMargin / base.stages.operatingMargin) : 0;
      const dLogATO = base.stages.assetTurnover > 0 && latest.stages.assetTurnover > 0 ? Math.log(latest.stages.assetTurnover / base.stages.assetTurnover) : 0;
      const dLogFL = base.stages.financialLeverage > 0 && latest.stages.financialLeverage > 0 ? Math.log(latest.stages.financialLeverage / base.stages.financialLeverage) : 0;

      // Percentage contributions: dLogFactor / dLogROE
      const totalDelta = Math.abs(dLogROE) > 1e-9 ? dLogROE : 1;
      attribution = {
        baseYear: base.year,
        latestYear: latest.year,
        roeDelta: roeT - roe0,
        roeGrowthPct: (roeT - roe0) / roe0,
        logDecomposition: {
          dLogROE,
          dLogTB,
          dLogIB,
          dLogOM,
          dLogATO,
          dLogFL,
          residual: Math.abs(dLogROE - (dLogTB + dLogIB + dLogOM + dLogATO + dLogFL))
        },
        percentageContributions: {
          taxBurden: (dLogTB / totalDelta) * 100,
          interestBurden: (dLogIB / totalDelta) * 100,
          operatingMargin: (dLogOM / totalDelta) * 100,
          assetTurnover: (dLogATO / totalDelta) * 100,
          financialLeverage: (dLogFL / totalDelta) * 100
        }
      };
    }
  }

  return {
    periods: sortedPeriods,
    attribution
  };
}

/**
 * Returns corporate archetypes and sector presets for DuPont ROE analysis.
 */
export function getDuPontPresets() {
  return [
    {
      id: 'aapl',
      name: 'Apple Inc. (High Operating Margin & Buyback Leverage)',
      ticker: 'AAPL',
      sector: 'Technology',
      description: 'Massive cash generation and pricing power, paired with continuous share repurchases that compress equity and produce an extraordinary ROE (>140%).',
      data: {
        price: 225.00,
        marketCap: 3450000000000,
        sharesOutstanding: 15300000000,
        sales: 383285000000,
        ebit: 114301000000,
        ebt: 113736000000,
        netIncome: 96995000000,
        totalAssets: 352583000000,
        totalEquity: 62146000000,
        totalDebt: 106000000000,
        interestExpense: 3933000000,
        incomeTaxExpense: 16741000000
      },
      history: [
        { year: '2021', sales: 365817000000, ebit: 108949000000, ebt: 109207000000, netIncome: 94680000000, totalAssets: 351002000000, totalEquity: 63090000000 },
        { year: '2022', sales: 394328000000, ebit: 119437000000, ebt: 119103000000, netIncome: 99803000000, totalAssets: 352755000000, totalEquity: 50672000000 },
        { year: '2023', sales: 383285000000, ebit: 114301000000, ebt: 113736000000, netIncome: 96995000000, totalAssets: 352583000000, totalEquity: 62146000000 }
      ]
    },
    {
      id: 'cost',
      name: 'Costco Wholesale (Capital Velocity & High Asset Turnover)',
      ticker: 'COST',
      sector: 'Consumer Staples',
      description: 'Archetypal high-turnover / low-margin retailer. High ROE (~28%) achieved through warehouse asset velocity (ATO ~3.5x) with minimal debt.',
      data: {
        price: 900.00,
        marketCap: 400000000000,
        sharesOutstanding: 443000000,
        sales: 249625000000,
        ebit: 9161000000,
        ebt: 9466000000,
        netIncome: 7367000000,
        totalAssets: 71200000000,
        totalEquity: 26500000000,
        totalDebt: 7000000000,
        interestExpense: 160000000,
        incomeTaxExpense: 2099000000
      },
      history: [
        { year: '2021', sales: 195929000000, ebit: 6708000000, ebt: 6680000000, netIncome: 5007000000, totalAssets: 59268000000, totalEquity: 18078000000 },
        { year: '2022', sales: 226954000000, ebit: 7793000000, ebt: 7840000000, netIncome: 5844000000, totalAssets: 64166000000, totalEquity: 20644000000 },
        { year: '2023', sales: 249625000000, ebit: 9161000000, ebt: 9466000000, netIncome: 7367000000, totalAssets: 71200000000, totalEquity: 26500000000 }
      ]
    },
    {
      id: 'nee',
      name: 'NextEra Energy (Capital Intensive & Leveraged Utility)',
      ticker: 'NEE',
      sector: 'Utilities',
      description: 'Heavy capital investments in renewable infrastructure. Low asset turnover (~0.18x) and high financial leverage (~3.4x) with long-dated regulated earnings.',
      data: {
        price: 80.00,
        marketCap: 165000000000,
        sharesOutstanding: 2060000000,
        sales: 28114000000,
        ebit: 10420000000,
        ebt: 8780000000,
        netIncome: 7310000000,
        totalAssets: 172000000000,
        totalEquity: 50600000000,
        totalDebt: 75000000000,
        interestExpense: 2350000000,
        incomeTaxExpense: 1470000000
      },
      history: [
        { year: '2021', sales: 17069000000, ebit: 5200000000, ebt: 4100000000, netIncome: 3573000000, totalAssets: 135000000000, totalEquity: 39000000000 },
        { year: '2022', sales: 20956000000, ebit: 6150000000, ebt: 4800000000, netIncome: 4147000000, totalAssets: 153000000000, totalEquity: 44000000000 },
        { year: '2023', sales: 28114000000, ebit: 10420000000, ebt: 8780000000, netIncome: 7310000000, totalAssets: 172000000000, totalEquity: 50600000000 }
      ]
    },
    {
      id: 'leveraged-distress',
      name: 'Synthetic High-Debt Retailer (Artificial ROE Inflation Warning)',
      ticker: 'DEBT',
      sector: 'Consumer Discretionary',
      description: 'Thin operating margins (3.5%) and high debt load (Leverage 6.0x) produce an ostensibly high 22% ROE, triggering severe artificial gearing warnings.',
      data: {
        price: 25.00,
        marketCap: 2500000000,
        sharesOutstanding: 100000000,
        sales: 20000000000,
        ebit: 700000000,
        ebt: 260000000,
        netIncome: 205000000,
        totalAssets: 5500000000,
        totalEquity: 920000000,
        totalDebt: 4200000000,
        interestExpense: 440000000,
        incomeTaxExpense: 55000000
      },
      history: [
        { year: '2021', sales: 18000000000, ebit: 900000000, ebt: 550000000, netIncome: 430000000, totalAssets: 4800000000, totalEquity: 1400000000 },
        { year: '2022', sales: 19200000000, ebit: 810000000, ebt: 410000000, netIncome: 320000000, totalAssets: 5200000000, totalEquity: 1150000000 },
        { year: '2023', sales: 20000000000, ebit: 700000000, ebt: 260000000, netIncome: 205000000, totalAssets: 5500000000, totalEquity: 920000000 }
      ]
    }
  ];
}
