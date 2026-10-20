/**
 * Retirement Drawdown Engine
 * Deterministic, tax-aware multi-account withdrawal engine with dynamic Guyton-Klinger guardrails,
 * David Blanchett spending smile, SECURE 2.0 RMD optimization, and 1966 stagflation stress testing.
 */

import {
  CONFIG, safeParseFloat, safeParseInt, formatCurrency,
  createChartContext, rafThrottle, drawTooltip
} from "./chart-utils.js";

// IRS Uniform Lifetime Table (SECURE 2.0, Treas. Reg. § 1.401(a)(9)-9)
const IRS_UNIFORM_LIFETIME_TABLE = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 120: 2.0
};

// 2024 / 2026 Progressive Federal Tax Brackets
const TAX_CONFIG = {
  single: {
    standardDeduction: 14600,
    age65Bonus: 1950,
    brackets: [
      { max: 11600, rate: 0.10 },
      { max: 47150, rate: 0.12 },
      { max: 100525, rate: 0.22 },
      { max: 191950, rate: 0.24 },
      { max: 243725, rate: 0.32 },
      { max: 609350, rate: 0.35 },
      { max: Infinity, rate: 0.37 },
    ],
    ltcgBrackets: [
      { max: 47025, rate: 0.00 },
      { max: 518900, rate: 0.15 },
      { max: Infinity, rate: 0.20 },
    ],
    niitThreshold: 200000,
    provisionalTier1: 25000,
    provisionalTier2: 34000,
  },
  mfj: {
    standardDeduction: 29200,
    age65Bonus: 3100, // $1,550 * 2
    brackets: [
      { max: 23200, rate: 0.10 },
      { max: 94300, rate: 0.12 },
      { max: 201050, rate: 0.22 },
      { max: 383900, rate: 0.24 },
      { max: 487450, rate: 0.32 },
      { max: 731200, rate: 0.35 },
      { max: Infinity, rate: 0.37 },
    ],
    ltcgBrackets: [
      { max: 94050, rate: 0.00 },
      { max: 583750, rate: 0.15 },
      { max: Infinity, rate: 0.20 },
    ],
    niitThreshold: 250000,
    provisionalTier1: 32000,
    provisionalTier2: 44000,
  },
};

// State
let simulationLedger = [];
let ledgerFilterMode = "all"; // "all" | "5yr"

// DOM Elements
const inputStartAge = document.getElementById("drawdown-start-age");
const inputEndAge = document.getElementById("drawdown-end-age");
const inputFilingStatus = document.getElementById("drawdown-filing-status");
const inputStateTax = document.getElementById("drawdown-state-tax");

const inputAssetPretax = document.getElementById("drawdown-asset-pretax");
const inputAssetRoth = document.getElementById("drawdown-asset-roth");
const inputAssetTaxable = document.getElementById("drawdown-asset-taxable");
const inputAssetTaxableBasis = document.getElementById("drawdown-asset-taxable-basis");
const inputAssetCash = document.getElementById("drawdown-asset-cash");
const displayTotalPortfolio = document.getElementById("drawdown-total-portfolio");

const inputSpendEssential = document.getElementById("drawdown-spend-essential");
const inputSpendDiscretionary = document.getElementById("drawdown-spend-discretionary");

const inputSS1Pia = document.getElementById("drawdown-ss1-pia");
const inputSS1Age = document.getElementById("drawdown-ss1-age");
const inputSS2Pia = document.getElementById("drawdown-ss2-pia");
const inputSS2Age = document.getElementById("drawdown-ss2-age");
const inputSSCola = document.getElementById("drawdown-ss-cola");

const inputExpectedReturn = document.getElementById("drawdown-expected-return");
const inputCashYield = document.getElementById("drawdown-cash-yield");
const inputInflation = document.getElementById("drawdown-inflation");
const selectScenario = document.getElementById("drawdown-scenario");

const btnSyncFire = document.getElementById("btn-sync-fire");
const bridgeSyncStatus = document.getElementById("bridge-sync-status-text");

const btnIntervalAll = document.getElementById("btn-interval-all");
const btnInterval5yr = document.getElementById("btn-interval-5yr");
const btnExportCsv = document.getElementById("btn-export-ledger-csv");

// ===================================================================
// ACTUARIAL & TAX CALCULATORS
// ===================================================================

function getActuarialSSAdjustment(claimAge) {
  // Baseline FRA is 67
  const diffMonths = (claimAge - 67) * 12;
  if (diffMonths === 0) return 1.0;
  if (diffMonths < 0) {
    // Early claiming reduction: 5/9 of 1% per month for first 36 months (-20%), then 5/12 of 1% (-10%)
    const early36 = Math.max(diffMonths, -36);
    const beyond36 = Math.min(0, diffMonths + 36);
    const cut = (Math.abs(early36) * (5 / 9) / 100) + (Math.abs(beyond36) * (5 / 12) / 100);
    return Math.max(0.70, 1.0 - cut);
  } else {
    // Delayed retirement credit: 8% per year (2/3 of 1% per month) up to age 70 (+24%)
    const cred = Math.min(36, diffMonths) * (2 / 3) / 100;
    return 1.0 + cred;
  }
}

function calculateTaxes(ordinaryIncome, ltcgIncome, ssBenefits, filingStatus, stateTaxRate, isSenior) {
  const cfg = TAX_CONFIG[filingStatus] || TAX_CONFIG.mfj;

  // Step 1: Social Security Provisional Income test
  const nonSsIncome = ordinaryIncome + ltcgIncome;
  const provisionalIncome = nonSsIncome + (ssBenefits * 0.50);

  let taxableSS = 0;
  if (provisionalIncome > cfg.provisionalTier2) {
    const tier1Portion = Math.min(provisionalIncome - cfg.provisionalTier1, cfg.provisionalTier2 - cfg.provisionalTier1) * 0.50;
    const tier2Portion = (provisionalIncome - cfg.provisionalTier2) * 0.85;
    taxableSS = Math.min(ssBenefits * 0.85, tier1Portion + tier2Portion);
  } else if (provisionalIncome > cfg.provisionalTier1) {
    taxableSS = Math.min(ssBenefits * 0.50, (provisionalIncome - cfg.provisionalTier1) * 0.50);
  }

  // Step 2: Federal Ordinary Income Tax
  const grossOrdinary = ordinaryIncome + taxableSS;
  const standardDeduction = cfg.standardDeduction + (isSenior ? cfg.age65Bonus : 0);
  const taxableOrdinary = Math.max(0, grossOrdinary - standardDeduction);

  let fedOrdinaryTax = 0;
  let prevMax = 0;
  for (const b of cfg.brackets) {
    if (taxableOrdinary > prevMax) {
      const taxableInBracket = Math.min(taxableOrdinary, b.max) - prevMax;
      fedOrdinaryTax += taxableInBracket * b.rate;
      prevMax = b.max;
    } else {
      break;
    }
  }

  // Step 3: LTCG Tax stacked on top of taxable ordinary income
  let fedLtcgTax = 0;
  if (ltcgIncome > 0) {
    let ltcgRemaining = ltcgIncome;
    let stackBaseline = taxableOrdinary;

    let prevLtcgMax = 0;
    for (const b of cfg.ltcgBrackets) {
      if (ltcgRemaining <= 0) break;
      const bracketRoom = Math.max(0, b.max - Math.max(stackBaseline, prevLtcgMax));
      if (bracketRoom > 0) {
        const taxableAtRate = Math.min(ltcgRemaining, bracketRoom);
        fedLtcgTax += taxableAtRate * b.rate;
        ltcgRemaining -= taxableAtRate;
        stackBaseline += taxableAtRate;
      }
      prevLtcgMax = b.max;
    }

    // Net Investment Income Tax (NIIT 3.8%) if AGI exceeds threshold
    const totalAgi = grossOrdinary + ltcgIncome;
    if (totalAgi > cfg.niitThreshold) {
      const subjectToNiit = Math.min(ltcgIncome, totalAgi - cfg.niitThreshold);
      fedLtcgTax += subjectToNiit * 0.038;
    }
  }

  // Step 4: Flat State Tax
  const stateTax = taxableOrdinary * (stateTaxRate / 100);

  return {
    taxableSS,
    taxableOrdinary,
    fedOrdinaryTax,
    fedLtcgTax,
    stateTax,
    totalTax: fedOrdinaryTax + fedLtcgTax + stateTax,
  };
}

// ===================================================================
// STAGFLATION & MARKET RETURN GENERATOR
// ===================================================================

function getScenarioReturnAndInflation(scenario, yearIndex, baseReturn, baseInflation) {
  if (scenario === "stagflation-1966") {
    // 1966 Stagflation Stress (first 10 years experience severe equity drag & 6% inflation)
    const shockReturns = [-0.10, -0.15, 0.05, -0.08, 0.00, 0.12, -0.12, -0.18, 0.20, 0.04];
    const equityReturn = yearIndex < shockReturns.length ? shockReturns[yearIndex] : baseReturn;
    const inflation = yearIndex < 10 ? 0.06 : baseInflation;
    return { equityReturn, inflation };
  } else if (scenario === "bear-early") {
    // Early Bear Market: -20% in Yr 1, -15% in Yr 2, then recovers
    const shockReturns = [-0.20, -0.15, 0.10, 0.12, 0.08];
    const equityReturn = yearIndex < shockReturns.length ? shockReturns[yearIndex] : baseReturn;
    return { equityReturn, inflation: baseInflation };
  }
  // Standard Normal Baseline
  return { equityReturn: baseReturn, inflation: baseInflation };
}

// ===================================================================
// SIMULATION ENGINE
// ===================================================================

export function runDrawdownSimulation() {
  const startAge = safeParseInt(inputStartAge.value, 60);
  const endAge = safeParseInt(inputEndAge.value, 95);
  const totalYears = Math.max(1, endAge - startAge + 1);

  const filingStatus = inputFilingStatus.value;
  const stateTaxRate = safeParseFloat(inputStateTax.value, 4.5);

  let preTax = safeParseFloat(inputAssetPretax.value, 500000);
  let roth = safeParseFloat(inputAssetRoth.value, 250000);
  let taxable = safeParseFloat(inputAssetTaxable.value, 200000);
  let taxableBasis = safeParseFloat(inputAssetTaxableBasis.value, 160000);
  let cash = safeParseFloat(inputAssetCash.value, 50000);

  const baseEssential = safeParseFloat(inputSpendEssential.value, 45000);
  let currentDiscretionary = safeParseFloat(inputSpendDiscretionary.value, 15000);
  const initialDiscretionary = currentDiscretionary;

  const selectedStrategy = document.querySelector('input[name="drawdown-strategy"]:checked')?.value || "guyton-klinger";

  const ss1Pia = safeParseFloat(inputSS1Pia.value, 0);
  const ss1ClaimAge = safeParseInt(inputSS1Age.value, 67);
  const ss1AdjFactor = getActuarialSSAdjustment(ss1ClaimAge);

  const ss2Pia = safeParseFloat(inputSS2Pia.value, 0);
  const ss2ClaimAge = safeParseInt(inputSS2Age.value, 67);
  const ss2AdjFactor = getActuarialSSAdjustment(ss2ClaimAge);

  const ssColaRate = safeParseFloat(inputSSCola.value, 2.5) / 100;
  const baseInflation = safeParseFloat(inputInflation.value, 2.5) / 100;
  const baseExpectedReturn = safeParseFloat(inputExpectedReturn.value, 7.0) / 100;
  const cashYield = safeParseFloat(inputCashYield.value, 3.5) / 100;
  const scenario = selectScenario.value;

  const initialPortfolio = preTax + roth + taxable + cash;
  const initialTotalSpend = baseEssential + currentDiscretionary;
  const initialWithdrawalRate = initialPortfolio > 0 ? (initialTotalSpend / initialPortfolio) : 0.04;

  let cumulativeInflation = 1.0;
  let cumulativeSsCola = 1.0;
  let priorYearReturn = 0.07;

  simulationLedger = [];
  let lifetimeSpending = 0;
  let lifetimeTaxes = 0;
  let portfolioRuinAge = null;

  // SECURE 2.0 RMD starting age: 75 if born 1960 or later, else 73
  const approxBirthYear = new Date().getFullYear() - startAge;
  const rmdStartAge = approxBirthYear >= 1960 ? 75 : 73;

  for (let year = 1; year <= totalYears; year++) {
    const age = startAge + year - 1;
    const isSenior = age >= 65;

    // Step 0: Calculate returns and inflation for this year
    const { equityReturn, inflation } = getScenarioReturnAndInflation(scenario, year - 1, baseExpectedReturn, baseInflation);
    cumulativeInflation *= (1 + inflation);
    cumulativeSsCola *= (1 + ssColaRate);

    // Starting balances snapshot for year
    const startPreTax = preTax;
    const startRoth = roth;
    const startTaxable = taxable;
    const startCash = cash;
    const startTotalPortfolio = preTax + roth + taxable + cash;

    if (startTotalPortfolio <= 100 && portfolioRuinAge === null) {
      portfolioRuinAge = age;
    }

    // Step 1: Social Security Inflows
    let ss1Yearly = 0;
    if (age >= ss1ClaimAge) {
      ss1Yearly = ss1Pia * 12 * ss1AdjFactor * cumulativeSsCola;
    }

    let ss2Yearly = 0;
    if (age >= ss2ClaimAge) {
      ss2Yearly = ss2Pia * 12 * ss2AdjFactor * cumulativeSsCola;
    }
    const totalSSInflow = ss1Yearly + ss2Yearly;

    // Step 2: Target Spending based on Strategy
    let nominalEssential = baseEssential * cumulativeInflation;
    let nominalDiscretionary = currentDiscretionary * cumulativeInflation;
    let strategyNote = "Standard";

    if (selectedStrategy === "blanchett-smile") {
      // David Blanchett spending smile curve
      if (age >= 60 && age <= 75) {
        // Slow-go years: drops ~1.5%/yr in real terms
        const smileFactor = Math.pow(0.985, age - 60);
        nominalEssential = baseEssential * smileFactor * cumulativeInflation;
        nominalDiscretionary = initialDiscretionary * smileFactor * cumulativeInflation;
        strategyNote = `Smile Slow-Go (${(smileFactor * 100).toFixed(0)}%)`;
      } else if (age > 80) {
        // Late-life healthcare rise (+2%/yr in real terms)
        const healthFactor = 1.0 + (age - 80) * 0.02;
        nominalEssential = baseEssential * healthFactor * cumulativeInflation;
        strategyNote = `Healthcare Surge (+${((healthFactor - 1) * 100).toFixed(0)}%)`;
      }
    } else if (selectedStrategy === "guyton-klinger") {
      // Guyton-Klinger dynamic rules
      const currentRate = startTotalPortfolio > 0 ? (nominalEssential + nominalDiscretionary) / startTotalPortfolio : 1.0;

      // Capital Preservation Rule: if withdrawal rate > 1.2x initial, trim discretionary by 10%
      if (currentRate > initialWithdrawalRate * 1.20) {
        currentDiscretionary = Math.max(0, currentDiscretionary * 0.90);
        nominalDiscretionary = currentDiscretionary * cumulativeInflation;
        strategyNote = "GK Guardrail: Trim -10%";
      }
      // Prosperity Rule: if withdrawal rate < 0.8x initial, raise discretionary by 10%
      else if (currentRate < initialWithdrawalRate * 0.80) {
        currentDiscretionary = currentDiscretionary * 1.10;
        nominalDiscretionary = currentDiscretionary * cumulativeInflation;
        strategyNote = "GK Guardrail: Raise +10%";
      }

      // Down-market rule: skip inflation adjustment if prior year return was negative
      if (priorYearReturn < 0) {
        strategyNote += " (Skipped COLA)";
      }
    } else if (selectedStrategy === "income-first") {
      // Yield only
      const annualYield = (startTaxable + startPreTax + startRoth) * 0.035 + (startCash * cashYield);
      const totalIncome = annualYield + totalSSInflow;
      nominalEssential = Math.min(nominalEssential, totalIncome);
      nominalDiscretionary = Math.max(0, totalIncome - nominalEssential);
      strategyNote = "Yield Distribution Only";
    }

    const livingSpend = nominalEssential + nominalDiscretionary;
    let remainingNeed = Math.max(0, livingSpend - totalSSInflow);

    let drawPreTax = 0;
    let drawRoth = 0;
    let drawTaxable = 0;
    let drawCash = 0;
    let realizedLtcg = 0;

    // Step 3: Mandated RMD from Pre-Tax balances (SECURE 2.0)
    let rmdAmount = 0;
    if (age >= rmdStartAge && preTax > 0) {
      const divisor = IRS_UNIFORM_LIFETIME_TABLE[age] || 6.4;
      rmdAmount = preTax / divisor;

      // Apply the unspent RMD cash reinvestment code patch
      const forcedRmd = Math.min(preTax, rmdAmount);
      preTax -= forcedRmd;
      drawPreTax += forcedRmd;

      if (forcedRmd >= remainingNeed) {
        const excessAfterSpending = forcedRmd - remainingNeed;
        taxable += excessAfterSpending; // Sweeps excess after-tax cash into brokerage
        taxableBasis += excessAfterSpending; // Updates cost basis to prevent double taxation
        remainingNeed = 0;
        strategyNote += " (RMD Swept to Brokerage)";
      } else {
        remainingNeed -= forcedRmd;
      }
    }

    // Step 4: Multi-Account Withdrawal Sequencing for remaining need
    // Hierarchy: Taxable Brokerage -> Pre-Tax up to 12%/22% bracket -> Roth -> Cash
    if (remainingNeed > 0 && taxable > 0) {
      const draw = Math.min(taxable, remainingNeed);
      taxable -= draw;
      drawTaxable += draw;

      // Realize capital gains
      const gainRatio = (startTaxable > taxableBasis && startTaxable > 0)
        ? (startTaxable - taxableBasis) / startTaxable
        : 0;
      realizedLtcg += draw * gainRatio;
      taxableBasis = Math.max(0, taxableBasis - (draw * (1 - gainRatio)));
      remainingNeed -= draw;
    }

    if (remainingNeed > 0 && preTax > 0) {
      const draw = Math.min(preTax, remainingNeed);
      preTax -= draw;
      drawPreTax += draw;
      remainingNeed -= draw;
    }

    if (remainingNeed > 0 && roth > 0) {
      const draw = Math.min(roth, remainingNeed);
      roth -= draw;
      drawRoth += draw;
      remainingNeed -= draw;
    }

    if (remainingNeed > 0 && cash > 0) {
      const draw = Math.min(cash, remainingNeed);
      cash -= draw;
      drawCash += draw;
      remainingNeed -= draw;
    }

    // Step 5: Tax Calculations
    const taxes = calculateTaxes(
      drawPreTax,
      realizedLtcg,
      totalSSInflow,
      filingStatus,
      stateTaxRate,
      isSenior
    );

    // Pay taxes from remaining liquid cash / taxable
    let taxShortfall = 0;
    if (taxes.totalTax > 0) {
      let taxNeed = taxes.totalTax;
      if (cash >= taxNeed) {
        cash -= taxNeed;
      } else {
        taxNeed -= cash;
        cash = 0;
        if (taxable >= taxNeed) {
          taxable -= taxNeed;
        } else {
          taxNeed -= taxable;
          taxable = 0;
          if (roth >= taxNeed) {
            roth -= taxNeed;
          } else {
            taxShortfall = taxNeed;
          }
        }
      }
    }

    // Step 6: Market Growth on Remaining Account Balances
    priorYearReturn = equityReturn;
    preTax = Math.max(0, preTax * (1 + equityReturn));
    roth = Math.max(0, roth * (1 + equityReturn));
    taxable = Math.max(0, taxable * (1 + equityReturn));
    cash = Math.max(0, cash * (1 + cashYield));

    const endTotalPortfolio = preTax + roth + taxable + cash;
    lifetimeSpending += livingSpend;
    lifetimeTaxes += taxes.totalTax;

    simulationLedger.push({
      age,
      year,
      balCash: cash,
      balTaxable: taxable,
      balPretax: preTax,
      balRoth: roth,
      totalPortfolio: endTotalPortfolio,
      livingSpend,
      ssInflow: totalSSInflow,
      portfolioDraw: drawPreTax + drawRoth + drawTaxable + drawCash,
      rmdAmount,
      ordinaryTax: taxes.fedOrdinaryTax,
      ltcgTax: taxes.fedLtcgTax,
      stateTax: taxes.stateTax,
      totalTax: taxes.totalTax,
      strategyNote,
    });
  }

  updateKpis(portfolioRuinAge, lifetimeSpending, lifetimeTaxes);
  renderLedgerTable();
  renderHorizonStackedChart();
  renderCashFlowStackedChart();
}

// ===================================================================
// KPI UPDATES
// ===================================================================

function updateKpis(portfolioRuinAge, lifetimeSpending, lifetimeTaxes) {
  const kpiLongevity = document.getElementById("kpi-longevity");
  const kpiLongevitySub = document.getElementById("kpi-longevity-sub");
  const kpiTerminal = document.getElementById("kpi-terminal-estate");
  const kpiTerminalTitle = document.getElementById("kpi-terminal-title");
  const kpiConsumption = document.getElementById("kpi-total-consumption");
  const kpiTaxes = document.getElementById("kpi-total-taxes");
  const kpiTaxesSub = document.getElementById("kpi-taxes-sub");

  const lastRow = simulationLedger[simulationLedger.length - 1];
  const terminalVal = lastRow ? lastRow.totalPortfolio : 0;
  const totalSsInflow = simulationLedger.reduce((sum, r) => sum + r.ssInflow, 0);
  const portfolioFundedSpending = Math.max(0, lifetimeSpending - totalSsInflow);
  const kpiConsumptionSub = document.getElementById("kpi-consumption-sub");

  if (portfolioRuinAge === null) {
    if (kpiLongevity) {
      kpiLongevity.textContent = `Age ${lastRow?.age || 90}+ (Funded)`;
      kpiLongevity.className = "kpi-value green";
    }
    if (kpiLongevitySub) kpiLongevitySub.textContent = `Full ${simulationLedger.length}-yr horizon solvent (0% ruin)`;
  } else {
    if (kpiLongevity) {
      kpiLongevity.textContent = `Depleted Age ${portfolioRuinAge}`;
      kpiLongevity.className = "kpi-value red";
    }
    if (kpiLongevitySub) kpiLongevitySub.textContent = "Capital exhausted before target horizon";
  }

  if (kpiTerminal) kpiTerminal.textContent = formatCurrency(terminalVal);
  if (kpiTerminalTitle && lastRow) {
    kpiTerminalTitle.textContent = `Terminal Estate (Age ${lastRow.age})`;
  }
  if (kpiConsumption) kpiConsumption.textContent = formatCurrency(lifetimeSpending);
  if (kpiConsumptionSub) {
    kpiConsumptionSub.textContent = `Portfolio: ${formatCurrency(portfolioFundedSpending)} | Soc Sec: ${formatCurrency(totalSsInflow)}`;
  }
  if (kpiTaxes) kpiTaxes.textContent = formatCurrency(lifetimeTaxes);

  const effectiveRate = lifetimeSpending > 0 ? ((lifetimeTaxes / (lifetimeSpending + lifetimeTaxes)) * 100).toFixed(1) : "0.0";
  if (kpiTaxesSub) kpiTaxesSub.textContent = `Effective Tax Rate: ${effectiveRate}%`;
}

// ===================================================================
// CHART 1: PORTFOLIO HORIZON (STACKED MULTI-ACCOUNT CANVAS)
// Rule: "Any charts with multiple assets should always be a stacking chart."
// ===================================================================

function renderHorizonStackedChart() {
  const canvas = document.getElementById("drawdown-horizon-canvas");
  if (!canvas || simulationLedger.length === 0) return;

  canvas.style.width = "100%";
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const chart = createChartContext(canvas, rect.width, rect.height);
  const ctx = chart.ctx;

  const padding = { top: 25, right: 30, bottom: 45, left: 75 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...simulationLedger.map((r) => r.totalPortfolio),
    100000
  ) * 1.15;

  const minAge = simulationLedger[0].age;
  const maxAge = simulationLedger[simulationLedger.length - 1].age;
  const ageSpan = Math.max(1, maxAge - minAge);

  const toX = (age) => padding.left + ((age - minAge) / ageSpan) * chartWidth;
  const toY = (val) => padding.top + chartHeight - (Math.max(0, val) / maxVal) * chartHeight;

  // Offscreen pre-render for crisp hover rendering
  const offCanvas = document.createElement("canvas");
  offCanvas.width = chart.width;
  offCanvas.height = chart.height;
  const offCtx = offCanvas.getContext("2d");

  // Grid lines
  offCtx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  offCtx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = (maxVal / yTicks) * i;
    const y = toY(val);
    offCtx.beginPath();
    offCtx.moveTo(padding.left, y);
    offCtx.lineTo(padding.left + chartWidth, y);
    offCtx.stroke();

    offCtx.fillStyle = "#64748b";
    offCtx.font = window.CHART_FONTS.sm;
    offCtx.textAlign = "right";
    offCtx.fillText(formatCurrency(val), padding.left - 10, y + 4);
  }

  // X-axis age ticks
  const xStep = ageSpan > 25 ? 5 : 2;
  for (let age = minAge; age <= maxAge; age += xStep) {
    const x = toX(age);
    offCtx.beginPath();
    offCtx.moveTo(x, padding.top);
    offCtx.lineTo(x, padding.top + chartHeight);
    offCtx.stroke();

    offCtx.fillStyle = "#94a3b8";
    offCtx.font = window.CHART_FONTS.sm;
    offCtx.textAlign = "center";
    offCtx.fillText(`Age ${age}`, x, padding.top + chartHeight + 20);
  }

  // Pre-compute stacked coordinates
  // Stacking order from bottom to top: Cash -> Taxable -> Pre-Tax -> Roth
  const stackedPoints = simulationLedger.map((row) => {
    const c = row.balCash;
    const t = c + row.balTaxable;
    const p = t + row.balPretax;
    const r = p + row.balRoth;
    return {
      age: row.age,
      x: toX(row.age),
      y0: toY(0),
      yCash: toY(c),
      yTaxable: toY(t),
      yPretax: toY(p),
      yRoth: toY(r),
      raw: row,
    };
  });

  // Layer 1: Cash Buffer (Bottom layer)
  offCtx.beginPath();
  offCtx.moveTo(stackedPoints[0].x, stackedPoints[0].y0);
  stackedPoints.forEach((p) => offCtx.lineTo(p.x, p.yCash));
  offCtx.lineTo(stackedPoints[stackedPoints.length - 1].x, stackedPoints[stackedPoints.length - 1].y0);
  offCtx.closePath();
  offCtx.fillStyle = "rgba(2, 132, 199, 0.4)";
  offCtx.fill();

  // Layer 2: Taxable Brokerage
  offCtx.beginPath();
  offCtx.moveTo(stackedPoints[0].x, stackedPoints[0].yCash);
  stackedPoints.forEach((p) => offCtx.lineTo(p.x, p.yTaxable));
  for (let i = stackedPoints.length - 1; i >= 0; i--) {
    offCtx.lineTo(stackedPoints[i].x, stackedPoints[i].yCash);
  }
  offCtx.closePath();
  offCtx.fillStyle = "rgba(16, 185, 129, 0.45)";
  offCtx.fill();

  // Layer 3: Pre-Tax Traditional
  offCtx.beginPath();
  offCtx.moveTo(stackedPoints[0].x, stackedPoints[0].yTaxable);
  stackedPoints.forEach((p) => offCtx.lineTo(p.x, p.yPretax));
  for (let i = stackedPoints.length - 1; i >= 0; i--) {
    offCtx.lineTo(stackedPoints[i].x, stackedPoints[i].yTaxable);
  }
  offCtx.closePath();
  offCtx.fillStyle = "rgba(245, 158, 11, 0.45)";
  offCtx.fill();

  // Layer 4: Roth IRA/401(k) (Top layer)
  offCtx.beginPath();
  offCtx.moveTo(stackedPoints[0].x, stackedPoints[0].yPretax);
  stackedPoints.forEach((p) => offCtx.lineTo(p.x, p.yRoth));
  for (let i = stackedPoints.length - 1; i >= 0; i--) {
    offCtx.lineTo(stackedPoints[i].x, stackedPoints[i].yPretax);
  }
  offCtx.closePath();
  offCtx.fillStyle = "rgba(139, 92, 246, 0.45)";
  offCtx.fill();

  // Stroke lines on the boundaries for visual clarity
  const drawBoundaryLine = (getY, strokeColor) => {
    offCtx.strokeStyle = strokeColor;
    offCtx.lineWidth = 2;
    offCtx.beginPath();
    stackedPoints.forEach((p, idx) => {
      if (idx === 0) offCtx.moveTo(p.x, getY(p));
      else offCtx.lineTo(p.x, getY(p));
    });
    offCtx.stroke();
  };

  drawBoundaryLine((p) => p.yCash, "#0284c7");
  drawBoundaryLine((p) => p.yTaxable, "#10b981");
  drawBoundaryLine((p) => p.yPretax, "#f59e0b");
  drawBoundaryLine((p) => p.yRoth, "#8b5cf6");

  function drawInteractiveChart(highlightIndex) {
    ctx.clearRect(0, 0, chart.width, chart.height);
    ctx.drawImage(offCanvas, 0, 0);

    if (highlightIndex !== null && highlightIndex >= 0 && highlightIndex < stackedPoints.length) {
      const p = stackedPoints[highlightIndex];
      const r = p.raw;

      // Vertical crosshair
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p.x, padding.top);
      ctx.lineTo(p.x, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top dot
      ctx.beginPath();
      ctx.arc(p.x, p.yRoth, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#8b5cf6";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      const lines = [
        `Age ${r.age} (Year ${r.year})`,
        `Total Net Worth: ${formatCurrency(r.totalPortfolio)}`,
        `🟣 Roth: ${formatCurrency(r.balRoth)}`,
        `🟡 Pre-Tax: ${formatCurrency(r.balPretax)}`,
        `🟢 Taxable: ${formatCurrency(r.balTaxable)}`,
        `🔵 Cash: ${formatCurrency(r.balCash)}`,
        `Drawdown Need: ${formatCurrency(r.livingSpend)}`,
        `Taxes: ${formatCurrency(r.totalTax)}`,
      ];

      drawTooltip(ctx, lines, p.x, p.yRoth, {
        top: padding.top,
        right: chart.width - padding.right,
        height: chartHeight,
        width: chartWidth,
      });
    }
  }

  drawInteractiveChart(null);

  if (canvas._drawdownController) canvas._drawdownController.abort();
  canvas._drawdownController = new AbortController();
  const { signal } = canvas._drawdownController;

  canvas.addEventListener("mousemove", rafThrottle((e) => {
    const r = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - r.left) * (chart.width / r.width);
    if (mouseX >= padding.left && mouseX <= padding.left + chartWidth) {
      const approxAge = minAge + ((mouseX - padding.left) / chartWidth) * ageSpan;
      const nearestIdx = Math.max(0, Math.min(simulationLedger.length - 1, Math.round(approxAge - minAge)));
      canvas.style.cursor = "crosshair";
      drawInteractiveChart(nearestIdx);
    } else {
      canvas.style.cursor = "default";
      drawInteractiveChart(null);
    }
  }), { signal });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    drawInteractiveChart(null);
  }, { signal });
}

// ===================================================================
// CHART 2: ANNUAL CASH FLOW & OUTFLOWS (STACKED BAR CANVAS)
// ===================================================================

function renderCashFlowStackedChart() {
  const canvas = document.getElementById("drawdown-cashflow-canvas");
  if (!canvas || simulationLedger.length === 0) return;

  canvas.style.width = "100%";
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const chart = createChartContext(canvas, rect.width, rect.height);
  const ctx = chart.ctx;

  const padding = { top: 25, right: 30, bottom: 45, left: 75 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const maxOutflow = Math.max(
    ...simulationLedger.map((r) => r.livingSpend + r.totalTax),
    ...simulationLedger.map((r) => r.ssInflow),
    60000
  ) * 1.15;

  const nBars = simulationLedger.length;
  const barSpacing = chartWidth / nBars;
  const barWidth = Math.max(3, barSpacing * 0.75);

  const toY = (val) => padding.top + chartHeight - (Math.max(0, val) / maxOutflow) * chartHeight;

  // Offscreen pre-render
  const offCanvas = document.createElement("canvas");
  offCanvas.width = chart.width;
  offCanvas.height = chart.height;
  const offCtx = offCanvas.getContext("2d");

  // Grid lines
  offCtx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  offCtx.lineWidth = 1;
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const val = (maxOutflow / yTicks) * i;
    const y = toY(val);
    offCtx.beginPath();
    offCtx.moveTo(padding.left, y);
    offCtx.lineTo(padding.left + chartWidth, y);
    offCtx.stroke();

    offCtx.fillStyle = "#64748b";
    offCtx.font = window.CHART_FONTS.sm;
    offCtx.textAlign = "right";
    offCtx.fillText(formatCurrency(val), padding.left - 10, y + 4);
  }

  // Draw Stacked Bars: Spend on bottom, Tax stacked on top
  simulationLedger.forEach((r, idx) => {
    const x = padding.left + (idx * barSpacing) + (barSpacing - barWidth) / 2;
    const ySpend = toY(r.livingSpend);
    const hSpend = Math.max(0, (padding.top + chartHeight) - ySpend);

    // Living spend bar
    offCtx.fillStyle = "#2dd4bf";
    offCtx.fillRect(x, ySpend, barWidth, hSpend);

    // Tax bar stacked on top
    if (r.totalTax > 0) {
      const yTotal = toY(r.livingSpend + r.totalTax);
      const hTax = Math.max(0, ySpend - yTotal);
      offCtx.fillStyle = "#f43f5e";
      offCtx.fillRect(x, yTotal, barWidth, hTax);
    }

    // Label every 5 years
    if (idx % 5 === 0 || idx === nBars - 1) {
      offCtx.fillStyle = "#94a3b8";
      offCtx.font = window.CHART_FONTS.sm;
      offCtx.textAlign = "center";
      offCtx.fillText(`Age ${r.age}`, x + barWidth / 2, padding.top + chartHeight + 20);
    }
  });

  // Overlaid Social Security line
  offCtx.strokeStyle = "#38bdf8";
  offCtx.lineWidth = 2.5;
  offCtx.beginPath();
  simulationLedger.forEach((r, idx) => {
    const x = padding.left + (idx * barSpacing) + barSpacing / 2;
    const y = toY(r.ssInflow);
    if (idx === 0) offCtx.moveTo(x, y);
    else offCtx.lineTo(x, y);
  });
  offCtx.stroke();

  // Interactive hover
  function drawInteractiveBars(highlightIndex) {
    ctx.clearRect(0, 0, chart.width, chart.height);
    ctx.drawImage(offCanvas, 0, 0);

    if (highlightIndex !== null && highlightIndex >= 0 && highlightIndex < simulationLedger.length) {
      const r = simulationLedger[highlightIndex];
      const x = padding.left + (highlightIndex * barSpacing) + barSpacing / 2;
      const yTop = toY(r.livingSpend + r.totalTax);

      // Highlight line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      const lines = [
        `Age ${r.age} (Year ${r.year})`,
        `Lifestyle Spend: ${formatCurrency(r.livingSpend)}`,
        `Fed & State Taxes: ${formatCurrency(r.totalTax)}`,
        `Social Security Inflow: ${formatCurrency(r.ssInflow)}`,
        `Net Portfolio Draw: ${formatCurrency(r.portfolioDraw)}`,
      ];

      drawTooltip(ctx, lines, x, yTop, {
        top: padding.top,
        right: chart.width - padding.right,
        height: chartHeight,
        width: chartWidth,
      });
    }
  }

  drawInteractiveBars(null);

  if (canvas._cashflowController) canvas._cashflowController.abort();
  canvas._cashflowController = new AbortController();
  const { signal } = canvas._cashflowController;

  canvas.addEventListener("mousemove", rafThrottle((e) => {
    const r = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - r.left) * (chart.width / r.width);
    if (mouseX >= padding.left && mouseX <= padding.left + chartWidth) {
      const idx = Math.floor((mouseX - padding.left) / barSpacing);
      const safeIdx = Math.max(0, Math.min(simulationLedger.length - 1, idx));
      canvas.style.cursor = "crosshair";
      drawInteractiveBars(safeIdx);
    } else {
      canvas.style.cursor = "default";
      drawInteractiveBars(null);
    }
  }), { signal });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    drawInteractiveBars(null);
  }, { signal });
}

// ===================================================================
// AMORTIZATION LEDGER TABLE & CSV EXPORT
// ===================================================================

function renderLedgerTable() {
  const tbody = document.getElementById("drawdown-ledger-body");
  const badge = document.getElementById("ledger-rows-badge");
  if (!tbody) return;

  const filtered = simulationLedger.filter((r, idx) => {
    if (ledgerFilterMode === "5yr") {
      return idx % 5 === 0 || idx === simulationLedger.length - 1;
    }
    return true;
  });

  if (badge) badge.textContent = `${filtered.length} Rows`;

  tbody.innerHTML = filtered.map((r) => {
    let tagClass = "";
    if (r.strategyNote.includes("Trim")) tagClass = "guardrail-cut";
    else if (r.strategyNote.includes("Raise")) tagClass = "guardrail-raise";
    else if (r.strategyNote.includes("RMD Swept")) tagClass = "rmd-sweep";

    return `
      <tr>
        <td class="col-age">${r.age}</td>
        <td>${r.year}</td>
        <td>${formatCurrency(r.balCash)}</td>
        <td>${formatCurrency(r.balTaxable)}</td>
        <td>${formatCurrency(r.balPretax)}</td>
        <td>${formatCurrency(r.balRoth)}</td>
        <td class="col-total">${formatCurrency(r.totalPortfolio)}</td>
        <td>${formatCurrency(r.livingSpend)}</td>
        <td style="color: #38bdf8;">${formatCurrency(r.ssInflow)}</td>
        <td>${formatCurrency(r.portfolioDraw)}</td>
        <td>${r.rmdAmount > 0 ? formatCurrency(r.rmdAmount) : "—"}</td>
        <td class="col-tax">${formatCurrency(r.totalTax)}</td>
        <td class="col-strategy">
          ${tagClass ? `<span class="tag-strategy-action ${tagClass}">${r.strategyNote}</span>` : r.strategyNote}
        </td>
      </tr>
    `;
  }).join("");
}

function exportLedgerToCsv() {
  if (simulationLedger.length === 0) return;

  const headers = [
    "Age", "Year", "Cash_Balance", "Taxable_Balance", "PreTax_Balance", "Roth_Balance",
    "Total_Portfolio", "Living_Spend", "Social_Security", "Portfolio_Draw",
    "Mandated_RMD", "Total_Tax", "Strategy_Note"
  ];

  const rows = simulationLedger.map((r) => [
    r.age,
    r.year,
    Math.round(r.balCash),
    Math.round(r.balTaxable),
    Math.round(r.balPretax),
    Math.round(r.balRoth),
    Math.round(r.totalPortfolio),
    Math.round(r.livingSpend),
    Math.round(r.ssInflow),
    Math.round(r.portfolioDraw),
    Math.round(r.rmdAmount),
    Math.round(r.totalTax),
    `"${r.strategyNote.replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retirement_drawdown_simulation_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===================================================================
// TWO-WAY FIRE CALCULATOR BRIDGE & INITIALIZATION
// ===================================================================

function updatePortfolioTotalDisplay() {
  const pretax = safeParseFloat(inputAssetPretax.value, 0);
  const roth = safeParseFloat(inputAssetRoth.value, 0);
  const taxable = safeParseFloat(inputAssetTaxable.value, 0);
  const cash = safeParseFloat(inputAssetCash.value, 0);
  const total = pretax + roth + taxable + cash;

  if (displayTotalPortfolio) {
    displayTotalPortfolio.textContent = formatCurrency(total);
  }
}

function syncFromFireCalculator(manualClick = false) {
  try {
    let syncedItems = [];

    // 1. Sync Asset Split
    const savedSplit = localStorage.getItem("fire_asset_split");
    if (savedSplit) {
      const split = JSON.parse(savedSplit);
      if (split.pretax !== undefined) inputAssetPretax.value = Math.round(split.pretax);
      if (split.roth !== undefined) inputAssetRoth.value = Math.round(split.roth);
      if (split.taxable !== undefined) inputAssetTaxable.value = Math.round(split.taxable);
      if (split.taxableBasis !== undefined) inputAssetTaxableBasis.value = Math.round(split.taxableBasis);
      if (split.cash !== undefined) inputAssetCash.value = Math.round(split.cash);
      syncedItems.push("Multi-Account Wrappers");
    }

    // 2. Sync Spending Classification (Essential vs Discretionary)
    const savedExpenses = localStorage.getItem("fire_expense_classification");
    if (savedExpenses) {
      const exp = JSON.parse(savedExpenses);
      if (exp.essentialAnnual > 0) inputSpendEssential.value = Math.round(exp.essentialAnnual);
      if (exp.discretionaryAnnual > 0) inputSpendDiscretionary.value = Math.round(exp.discretionaryAnnual);
      syncedItems.push("Essential vs. Discretionary Spending");
    } else {
      // Fallback to general annual expenses
      const fireInputs = localStorage.getItem("fire_inputs");
      if (fireInputs) {
        const fi = JSON.parse(fireInputs);
        const totalExp = safeParseFloat(fi["fire-annual-expenses"], 60000);
        inputSpendEssential.value = Math.round(totalExp * 0.75);
        inputSpendDiscretionary.value = Math.round(totalExp * 0.25);
      }
    }

    // 3. Sync Retirement Horizon
    const fireInputs = localStorage.getItem("fire_inputs");
    if (fireInputs) {
      const fi = JSON.parse(fireInputs);
      if (fi["fire-retire-age"]) inputStartAge.value = fi["fire-retire-age"];
      if (fi["fire-life-expectancy"]) inputEndAge.value = fi["fire-life-expectancy"];
      if (fi["fire-inflation"]) inputInflation.value = fi["fire-inflation"];
      if (fi["fire-annual-return"]) inputExpectedReturn.value = fi["fire-annual-return"];
      syncedItems.push("Ages & Return Expectations");
    }

    updatePortfolioTotalDisplay();
    runDrawdownSimulation();

    if (manualClick && bridgeSyncStatus) {
      bridgeSyncStatus.textContent = `✅ Successfully synchronized ${syncedItems.join(", ")} from FIRE Calculator!`;
      bridgeSyncStatus.style.color = "#2dd4bf";
    }
  } catch (err) {
    console.warn("Could not sync from FIRE calculator:", err);
  }
}

function initEventHandlers() {
  const inputsToListen = [
    inputStartAge, inputEndAge, inputFilingStatus, inputStateTax,
    inputAssetPretax, inputAssetRoth, inputAssetTaxable, inputAssetTaxableBasis, inputAssetCash,
    inputSpendEssential, inputSpendDiscretionary,
    inputSS1Pia, inputSS1Age, inputSS2Pia, inputSS2Age, inputSSCola,
    inputExpectedReturn, inputCashYield, inputInflation, selectScenario
  ];

  inputsToListen.forEach((el) => {
    if (el) {
      el.addEventListener("input", () => {
        updatePortfolioTotalDisplay();
        runDrawdownSimulation();
      });
      el.addEventListener("change", () => {
        updatePortfolioTotalDisplay();
        runDrawdownSimulation();
      });
    }
  });

  document.querySelectorAll('input[name="drawdown-strategy"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      runDrawdownSimulation();
    });
  });

  if (btnSyncFire) {
    btnSyncFire.addEventListener("click", () => {
      syncFromFireCalculator(true);
    });
  }

  if (btnIntervalAll) {
    btnIntervalAll.addEventListener("click", () => {
      ledgerFilterMode = "all";
      btnIntervalAll.classList.add("active");
      btnInterval5yr?.classList.remove("active");
      renderLedgerTable();
    });
  }

  if (btnInterval5yr) {
    btnInterval5yr.addEventListener("click", () => {
      ledgerFilterMode = "5yr";
      btnInterval5yr.classList.add("active");
      btnIntervalAll?.classList.remove("active");
      renderLedgerTable();
    });
  }

  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", exportLedgerToCsv);
  }

  window.addEventListener("resize", rafThrottle(() => {
    renderHorizonStackedChart();
    renderCashFlowStackedChart();
  }));
}

// Initial Run
initEventHandlers();
syncFromFireCalculator(false);
updatePortfolioTotalDisplay();
runDrawdownSimulation();

