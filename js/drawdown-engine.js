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
let viewMode = "nominal"; // "nominal" | "real"
let lastSimulationRuinAge = null;
let lastLifetimeSpending = 0;
let lastLifetimeTaxes = 0;

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

// Asset Allocation & Returns
const inputEquityPct = document.getElementById("drawdown-equity-pct");
const inputStockReturn = document.getElementById("drawdown-stock-return");
const inputBondReturn = document.getElementById("drawdown-bond-return");
const displayBlendedReturn = document.getElementById("drawdown-blended-return");
const displayAllocRatio = document.getElementById("alloc-ratio-badge");
const inputCashYield = document.getElementById("drawdown-cash-yield");
const inputInflation = document.getElementById("drawdown-inflation");
const selectScenario = document.getElementById("drawdown-scenario");

// 3-Bucket Strategy Configuration
const selectBucketYears = document.getElementById("drawdown-bucket-target-years");
const bucketDrawer = document.getElementById("bucket-config-drawer");
const bucketTargetAmount = document.getElementById("bucket-target-amount");
const btnBucketRebalance = document.getElementById("btn-bucket-rebalance");
const cashBucketTargetTag = document.getElementById("cash-bucket-target-tag");
const cashBufferSubtext = document.getElementById("cash-buffer-subtext");

// View Mode Toggle (Nominal vs Real)
const btnViewNominal = document.getElementById("btn-view-nominal");
const btnViewReal = document.getElementById("btn-view-real");
const viewModeDesc = document.getElementById("view-mode-desc");

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
// ASSET ALLOCATION & SCENARIO RETURN GENERATOR
// ===================================================================

export function updateBlendedReturnDisplay() {
  const equityPct = inputEquityPct ? safeParseFloat(inputEquityPct.value, 60) : 60;
  const bondPct = Math.max(0, 100 - equityPct);
  const stockReturn = inputStockReturn ? safeParseFloat(inputStockReturn.value, 8.5) : 8.5;
  const bondReturn = inputBondReturn ? safeParseFloat(inputBondReturn.value, 4.5) : 4.5;
  const blended = (equityPct * stockReturn + bondPct * bondReturn) / 100;

  if (displayBlendedReturn) {
    displayBlendedReturn.value = `${blended.toFixed(2)}%`;
  }
  if (displayAllocRatio) {
    displayAllocRatio.textContent = `${equityPct}% Stocks / ${bondPct}% Bonds`;
  }

  return { equityPct, bondPct, stockReturn, bondReturn, blended };
}

function getScenarioReturnAndInflation(scenario, yearIndex, equityPct, stockReturnRate, bondReturnRate, baseInflation) {
  const equityWeight = equityPct / 100;
  const bondWeight = (100 - equityPct) / 100;
  const stockReturnDec = stockReturnRate / 100;
  const bondReturnDec = bondReturnRate / 100;

  if (scenario === "stagflation-1966") {
    // 1966 Stagflation Stress (first 10 years experience severe equity drag & 6% inflation)
    const shockStockReturns = [-0.10, -0.15, 0.05, -0.08, 0.00, 0.12, -0.12, -0.18, 0.20, 0.04];
    const stockReturnYear = yearIndex < shockStockReturns.length ? shockStockReturns[yearIndex] : stockReturnDec;
    const bondReturnYear = bondReturnDec;
    const blendedReturn = (equityWeight * stockReturnYear) + (bondWeight * bondReturnYear);
    const inflation = yearIndex < 10 ? 0.06 : baseInflation;
    return { blendedReturn, stockReturnYear, inflation };
  } else if (scenario === "bear-early") {
    // Early Bear Market: -20% in Yr 1, -15% in Yr 2, then recovers
    const shockStockReturns = [-0.20, -0.15, 0.10, 0.12, 0.08];
    const stockReturnYear = yearIndex < shockStockReturns.length ? shockStockReturns[yearIndex] : stockReturnDec;
    const bondReturnYear = bondReturnDec;
    const blendedReturn = (equityWeight * stockReturnYear) + (bondWeight * bondReturnYear);
    return { blendedReturn, stockReturnYear, inflation: baseInflation };
  }

  // Standard Normal Baseline
  const blendedReturn = (equityWeight * stockReturnDec) + (bondWeight * bondReturnDec);
  return { blendedReturn, stockReturnYear: stockReturnDec, inflation: baseInflation };
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

  let preTax = safeParseFloat(inputAssetPretax.value, 2860000);
  let roth = safeParseFloat(inputAssetRoth.value, 0);
  let taxable = safeParseFloat(inputAssetTaxable.value, 0);
  let taxableBasis = safeParseFloat(inputAssetTaxableBasis.value, 0);
  let cash = safeParseFloat(inputAssetCash.value, 0);

  const baseEssential = safeParseFloat(inputSpendEssential.value, 45000);
  let currentDiscretionary = safeParseFloat(inputSpendDiscretionary.value, 11400);
  const initialDiscretionary = currentDiscretionary;

  const selectedStrategy = document.querySelector('input[name="drawdown-strategy"]:checked')?.value || "guardrailed-buckets";
  const bucketTargetYears = selectBucketYears ? safeParseInt(selectBucketYears.value, 2) : 2;

  const ss1Pia = safeParseFloat(inputSS1Pia.value, 0);
  const ss1ClaimAge = safeParseInt(inputSS1Age.value, 67);
  const ss1AdjFactor = getActuarialSSAdjustment(ss1ClaimAge);

  const ss2Pia = safeParseFloat(inputSS2Pia.value, 0);
  const ss2ClaimAge = safeParseInt(inputSS2Age.value, 67);
  const ss2AdjFactor = getActuarialSSAdjustment(ss2ClaimAge);

  const ssColaRate = safeParseFloat(inputSSCola.value, 2.5) / 100;
  const baseInflation = safeParseFloat(inputInflation.value, 2.5) / 100;

  const alloc = updateBlendedReturnDisplay();
  const equityPct = alloc.equityPct;
  const stockReturnRate = alloc.stockReturn;
  const bondReturnRate = alloc.bondReturn;
  const cashYield = safeParseFloat(inputCashYield.value, 3.5) / 100;
  const scenario = selectScenario.value;

  const initialPortfolio = preTax + roth + taxable + cash;
  const initialTotalSpend = baseEssential + currentDiscretionary;
  const initialWithdrawalRate = initialPortfolio > 0 ? (initialTotalSpend / initialPortfolio) : 0.04;

  let cumulativeInflation = 1.0;
  let cumulativeSsCola = 1.0;
  let priorYearReturn = (alloc.blended / 100);
  let priorYearStockReturn = (stockReturnRate / 100);
  let gkEssential = baseEssential;
  let gkDiscretionary = currentDiscretionary;

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
    const { blendedReturn, stockReturnYear, inflation } = getScenarioReturnAndInflation(
      scenario, year - 1, equityPct, stockReturnRate, bondReturnRate, baseInflation
    );
    if (year > 1) {
      cumulativeInflation *= (1 + inflation);
      cumulativeSsCola *= (1 + ssColaRate);
    }

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
    let nominalDiscretionary = initialDiscretionary * cumulativeInflation;
    let strategyNote = "Standard";

    if (selectedStrategy === "blanchett-smile") {
      // David Blanchett spending smile curve
      if (age >= 60 && age <= 75) {
        const smileFactor = Math.pow(0.985, age - 60);
        nominalEssential = baseEssential * smileFactor * cumulativeInflation;
        nominalDiscretionary = initialDiscretionary * smileFactor * cumulativeInflation;
        strategyNote = `Smile Slow-Go (${(smileFactor * 100).toFixed(0)}%)`;
      } else if (age > 80) {
        const healthFactor = 1.0 + (age - 80) * 0.02;
        nominalEssential = baseEssential * healthFactor * cumulativeInflation;
        strategyNote = `Healthcare Surge (+${((healthFactor - 1) * 100).toFixed(0)}%)`;
      }
    } else if (selectedStrategy === "guyton-klinger" || selectedStrategy === "guardrailed-buckets") {
      // Guyton-Klinger dynamic rules (powers both pure GK and Hybrid Guardrailed Buckets)
      if (year > 1) {
        // Withdrawal Rule: Skip inflation step-up if prior year return was negative
        if (priorYearStockReturn < 0 || priorYearReturn < 0) {
          strategyNote = "Skipped COLA (Down Market)";
        } else {
          gkEssential *= (1 + inflation);
          gkDiscretionary *= (1 + inflation);
        }

        const totalGkSpend = gkEssential + gkDiscretionary;
        const currentRate = startTotalPortfolio > 0 ? (totalGkSpend / startTotalPortfolio) : 1.0;

        // Capital Preservation Rule: if withdrawal rate > 1.2x initial rate, cut spending by 10%
        if (currentRate > initialWithdrawalRate * 1.20) {
          if (gkDiscretionary > 0) {
            gkDiscretionary *= 0.90;
            strategyNote = strategyNote.includes("Skipped") ? "GK: Trim Disc -10% & Skipped COLA" : "GK Guardrail: Trim Disc -10%";
          } else {
            gkEssential *= 0.90;
            strategyNote = strategyNote.includes("Skipped") ? "GK: Trim Spend -10% & Skipped COLA" : "GK Guardrail: Trim Spend -10%";
          }
        }
        // Prosperity Rule: if withdrawal rate < 0.8x initial rate, raise spending by 10%
        else if (currentRate < initialWithdrawalRate * 0.80) {
          if (initialDiscretionary > 0) {
            gkDiscretionary *= 1.10;
            strategyNote = "GK Guardrail: Raise Disc +10%";
          } else {
            gkEssential *= 1.10;
            strategyNote = "GK Guardrail: Raise Spend +10%";
          }
        }
      }
      nominalEssential = gkEssential;
      nominalDiscretionary = gkDiscretionary;
    } else if (selectedStrategy === "bucket-strategy") {
      // 3-Bucket Strategy: maintains baseline purchasing power adjusted for inflation
      nominalEssential = baseEssential * cumulativeInflation;
      nominalDiscretionary = initialDiscretionary * cumulativeInflation;
      strategyNote = "3-Bucket Active";
    } else if (selectedStrategy === "constant-dollar") {
      nominalEssential = baseEssential * cumulativeInflation;
      nominalDiscretionary = initialDiscretionary * cumulativeInflation;
      strategyNote = "Constant Purchasing Power";
    } else if (selectedStrategy === "income-first") {
      // Yield-driven withdrawal: spend dividends and interest, but never exceed requested budget
      const equityWeight = equityPct / 100;
      const bondWeight = (100 - equityPct) / 100;

      // Realistic dividend sensitivity during market shocks
      let equityYieldRate = 0.020; // 2.0% baseline equity dividend yield
      if (scenario === "bear-early" && year <= 3) {
        equityYieldRate = 0.013; // Dividend cuts during crash
      } else if (scenario === "stagflation-1966" && year <= 8) {
        equityYieldRate = 0.016; // Dividend growth lagging inflation
      }
      const bondYieldRate = bondReturnRate / 100;
      const blendedPortYield = (equityWeight * equityYieldRate) + (bondWeight * bondYieldRate);
      const annualInvestedYield = (startTaxable + startPreTax + startRoth) * blendedPortYield;
      const annualCashYield = startCash * cashYield;
      const totalIncome = annualInvestedYield + annualCashYield + totalSSInflow;

      const targetEssential = baseEssential * cumulativeInflation;
      const targetDiscretionary = initialDiscretionary * cumulativeInflation;
      const targetTotalSpend = targetEssential + targetDiscretionary;

      if (totalIncome >= targetTotalSpend) {
        // Yield covers requested lifestyle budget. Excess yield remains invested!
        nominalEssential = targetEssential;
        nominalDiscretionary = targetDiscretionary;
        strategyNote = "Yield Covers Budget";
      } else if (totalIncome >= targetEssential) {
        // Yield covers essential overhead, but forces cuts to discretionary spending
        nominalEssential = targetEssential;
        nominalDiscretionary = totalIncome - targetEssential;
        const cutPct = Math.round((1 - (nominalDiscretionary / targetDiscretionary)) * 100);
        strategyNote = `Yield Squeeze: Trim Disc -${cutPct}%`;
      } else {
        // Severe income shortfall: forces cuts into essential overhead
        nominalEssential = Math.max(0, totalIncome);
        nominalDiscretionary = 0;
        const cutPct = Math.round((1 - (nominalEssential / targetEssential)) * 100);
        strategyNote = `Severe Yield Shock: Essential Cut -${cutPct}%`;
      }
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

    // Step 4: Multi-Account Withdrawal Sequencing
    const isDownMarket = stockReturnYear < 0 || blendedReturn < 0;
    const isBucketModel = selectedStrategy === "bucket-strategy" || selectedStrategy === "guardrailed-buckets";

    if (isBucketModel && isDownMarket) {
      // Bucket 1 Defense: Draw from liquid cash first during down markets
      if (remainingNeed > 0 && cash > 0) {
        const draw = Math.min(cash, remainingNeed);
        cash -= draw;
        drawCash += draw;
        remainingNeed -= draw;
        strategyNote = (strategyNote === "Standard" || strategyNote === "3-Bucket Active")
          ? "Bucket Defense: Cash Draw (Zero Equity Sales)"
          : `${strategyNote} + Bucket Defense`;
      }

      // If cash is depleted, fallback to Taxable -> Pre-Tax -> Roth
      if (remainingNeed > 0) {
        strategyNote += " (Cash Depleted, Portfolio Fallback)";
        if (remainingNeed > 0 && taxable > 0) {
          const draw = Math.min(taxable, remainingNeed);
          taxable -= draw;
          drawTaxable += draw;
          const gainRatio = (startTaxable > taxableBasis && startTaxable > 0)
            ? (startTaxable - taxableBasis) / startTaxable : 0;
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
      }
    } else {
      // Standard Sequencing: Taxable -> Pre-Tax -> Roth -> Cash
      if (remainingNeed > 0 && taxable > 0) {
        const draw = Math.min(taxable, remainingNeed);
        taxable -= draw;
        drawTaxable += draw;

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

    // Pay taxes from remaining liquid cash / taxable / roth
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

    // Step 5b: Bucket Refill Policy in Up/Normal Markets
    if (isBucketModel && !isDownMarket) {
      const targetCash = livingSpend * bucketTargetYears;
      const cashDeficit = Math.max(0, targetCash - cash);
      if (cashDeficit > 0 && (taxable + preTax + roth) > 0) {
        const maxSweep = (taxable + preTax + roth) * 0.40;
        const refillAmount = Math.min(cashDeficit, maxSweep);
        let remainingRefill = refillAmount;

        if (remainingRefill > 0 && taxable > 0) {
          const fromTaxable = Math.min(taxable, remainingRefill);
          taxable -= fromTaxable;
          remainingRefill -= fromTaxable;
        }
        if (remainingRefill > 0 && preTax > 0) {
          const fromPreTax = Math.min(preTax, remainingRefill);
          preTax -= fromPreTax;
          drawPreTax += fromPreTax;
          remainingRefill -= fromPreTax;
        }
        if (remainingRefill > 0 && roth > 0) {
          const fromRoth = Math.min(roth, remainingRefill);
          roth -= fromRoth;
          remainingRefill -= fromRoth;
        }

        const swept = refillAmount - remainingRefill;
        cash += swept;
        if (swept > 0) {
          strategyNote = strategyNote.includes("Raise")
            ? `${strategyNote} & Bucket Refilled (+${formatCurrency(swept)})`
            : `Bucket Refilled (+${formatCurrency(swept)} into Cash)`;
        }
      }
    }

    // Step 6: Market Growth on Remaining Account Balances
    priorYearReturn = blendedReturn;
    priorYearStockReturn = stockReturnYear;
    preTax = Math.max(0, preTax * (1 + blendedReturn));
    roth = Math.max(0, roth * (1 + blendedReturn));
    taxable = Math.max(0, taxable * (1 + blendedReturn));
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
      cumulativeInflation,
    });
  }

  lastSimulationRuinAge = portfolioRuinAge;
  lastLifetimeSpending = lifetimeSpending;
  lastLifetimeTaxes = lifetimeTaxes;

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
  const kpiTerminalSub = document.getElementById("kpi-terminal-sub");
  const kpiConsumption = document.getElementById("kpi-total-consumption");
  const kpiConsumptionSub = document.getElementById("kpi-consumption-sub");
  const kpiTaxes = document.getElementById("kpi-total-taxes");
  const kpiTaxesSub = document.getElementById("kpi-taxes-sub");

  const lastRow = simulationLedger[simulationLedger.length - 1];
  const isReal = viewMode === "real";

  // Terminal value
  const rawTerminalVal = lastRow ? lastRow.totalPortfolio : 0;
  const terminalVal = isReal && lastRow ? (rawTerminalVal / lastRow.cumulativeInflation) : rawTerminalVal;

  // Lifetime spending & SS
  const totalSsInflow = simulationLedger.reduce(
    (sum, r) => sum + (isReal ? r.ssInflow / r.cumulativeInflation : r.ssInflow),
    0
  );
  const displaySpending = simulationLedger.reduce(
    (sum, r) => sum + (isReal ? r.livingSpend / r.cumulativeInflation : r.livingSpend),
    0
  );
  const portfolioFundedSpending = Math.max(0, displaySpending - totalSsInflow);

  // Lifetime taxes
  const displayTaxes = simulationLedger.reduce(
    (sum, r) => sum + (isReal ? r.totalTax / r.cumulativeInflation : r.totalTax),
    0
  );

  if (portfolioRuinAge === null) {
    if (kpiLongevity) {
      kpiLongevity.textContent = `Age ${lastRow?.age || 90}+ (Funded)`;
      kpiLongevity.className = "kpi-value green";
    }
    if (kpiLongevitySub) {
      kpiLongevitySub.textContent = `Full ${simulationLedger.length}-yr horizon solvent (0% ruin)`;
    }
  } else {
    if (kpiLongevity) {
      kpiLongevity.textContent = `Depleted Age ${portfolioRuinAge}`;
      kpiLongevity.className = "kpi-value red";
    }
    if (kpiLongevitySub) {
      kpiLongevitySub.textContent = "Capital exhausted before target horizon";
    }
  }

  if (kpiTerminal) kpiTerminal.textContent = formatCurrency(terminalVal);
  if (kpiTerminalTitle && lastRow) {
    kpiTerminalTitle.textContent = isReal
      ? `Terminal Estate (Real Age ${lastRow.age})`
      : `Terminal Estate (Age ${lastRow.age})`;
  }
  if (kpiTerminalSub) {
    kpiTerminalSub.textContent = isReal
      ? "Purchasing power in Year 1 dollars"
      : "Stepped-up basis for heirs (Nominal)";
  }

  if (kpiConsumption) kpiConsumption.textContent = formatCurrency(displaySpending);
  if (kpiConsumptionSub) {
    kpiConsumptionSub.textContent = `Portfolio: ${formatCurrency(portfolioFundedSpending)} | Soc Sec: ${formatCurrency(totalSsInflow)}`;
  }
  if (kpiTaxes) kpiTaxes.textContent = formatCurrency(displayTaxes);

  const effectiveRate = displaySpending > 0
    ? ((displayTaxes / (displaySpending + displayTaxes)) * 100).toFixed(1)
    : "0.0";
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

  const isReal = viewMode === "real";
  const getBal = (val, r) => isReal ? (val / r.cumulativeInflation) : val;

  const padding = { top: 25, right: 30, bottom: 45, left: 75 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...simulationLedger.map((r) => getBal(r.totalPortfolio, r)),
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
    const c = getBal(row.balCash, row);
    const t = c + getBal(row.balTaxable, row);
    const p = t + getBal(row.balPretax, row);
    const r = p + getBal(row.balRoth, row);
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

      const pBalCash = getBal(r.balCash, r);
      const pBalTaxable = getBal(r.balTaxable, r);
      const pBalPretax = getBal(r.balPretax, r);
      const pBalRoth = getBal(r.balRoth, r);
      const pTotal = getBal(r.totalPortfolio, r);
      const pSpend = getBal(r.livingSpend, r);
      const pTax = getBal(r.totalTax, r);

      const lines = [
        `Age ${r.age} (Year ${r.year}) ${isReal ? "(Real $)" : ""}`,
        `Total Net Worth: ${formatCurrency(pTotal)}`,
        `🟣 Roth: ${formatCurrency(pBalRoth)}`,
        `🟡 Pre-Tax: ${formatCurrency(pBalPretax)}`,
        `🟢 Taxable: ${formatCurrency(pBalTaxable)}`,
        `🔵 Cash: ${formatCurrency(pBalCash)}`,
        `Drawdown Need: ${formatCurrency(pSpend)}`,
        `Taxes: ${formatCurrency(pTax)}`,
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

  const isReal = viewMode === "real";
  const getVal = (v, r) => isReal ? (v / r.cumulativeInflation) : v;

  const padding = { top: 25, right: 30, bottom: 45, left: 75 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const maxOutflow = Math.max(
    ...simulationLedger.map((r) => getVal(r.livingSpend, r) + getVal(r.totalTax, r)),
    ...simulationLedger.map((r) => getVal(r.ssInflow, r)),
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
    const realSpend = getVal(r.livingSpend, r);
    const realTax = getVal(r.totalTax, r);
    const ySpend = toY(realSpend);
    const hSpend = Math.max(0, (padding.top + chartHeight) - ySpend);

    // Living spend bar
    offCtx.fillStyle = "#2dd4bf";
    offCtx.fillRect(x, ySpend, barWidth, hSpend);

    // Tax bar stacked on top
    if (realTax > 0) {
      const yTotal = toY(realSpend + realTax);
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
    const y = toY(getVal(r.ssInflow, r));
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
      const realSpend = getVal(r.livingSpend, r);
      const realTax = getVal(r.totalTax, r);
      const yTop = toY(realSpend + realTax);

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
        `Age ${r.age} (Year ${r.year}) ${isReal ? "(Real $)" : ""}`,
        `Lifestyle Spend: ${formatCurrency(realSpend)}`,
        `Fed & State Taxes: ${formatCurrency(realTax)}`,
        `Social Security Inflow: ${formatCurrency(getVal(r.ssInflow, r))}`,
        `Net Portfolio Draw: ${formatCurrency(getVal(r.portfolioDraw, r))}`,
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

  const isReal = viewMode === "real";

  const filtered = simulationLedger.filter((r, idx) => {
    if (ledgerFilterMode === "5yr") {
      return idx % 5 === 0 || idx === simulationLedger.length - 1;
    }
    return true;
  });

  if (badge) badge.textContent = `${filtered.length} Rows ${isReal ? "(Real $)" : ""}`;

  tbody.innerHTML = filtered.map((r) => {
    const infl = isReal ? r.cumulativeInflation : 1.0;
    let tagClass = "";
    if (r.strategyNote.includes("Trim") || r.strategyNote.includes("Squeeze") || r.strategyNote.includes("Shock")) tagClass = "guardrail-cut";
    else if (r.strategyNote.includes("Raise") || r.strategyNote.includes("Covers")) tagClass = "guardrail-raise";
    else if (r.strategyNote.includes("RMD Swept")) tagClass = "rmd-sweep";
    else if (r.strategyNote.includes("Defense")) tagClass = "bucket-defense";
    else if (r.strategyNote.includes("Refilled")) tagClass = "bucket-refill";

    return `
      <tr>
        <td class="col-age">${r.age}</td>
        <td>${r.year}</td>
        <td>${formatCurrency(r.balCash / infl)}</td>
        <td>${formatCurrency(r.balTaxable / infl)}</td>
        <td>${formatCurrency(r.balPretax / infl)}</td>
        <td>${formatCurrency(r.balRoth / infl)}</td>
        <td class="col-total">${formatCurrency(r.totalPortfolio / infl)}</td>
        <td>${formatCurrency(r.livingSpend / infl)}</td>
        <td style="color: #38bdf8;">${formatCurrency(r.ssInflow / infl)}</td>
        <td>${formatCurrency(r.portfolioDraw / infl)}</td>
        <td>${r.rmdAmount > 0 ? formatCurrency(r.rmdAmount / infl) : "—"}</td>
        <td class="col-tax">${formatCurrency(r.totalTax / infl)}</td>
        <td class="col-strategy">
          ${tagClass ? `<span class="tag-strategy-action ${tagClass}">${r.strategyNote}</span>` : r.strategyNote}
        </td>
      </tr>
    `;
  }).join("");
}

function exportLedgerToCsv() {
  if (simulationLedger.length === 0) return;
  const isReal = viewMode === "real";

  const headers = [
    "Age", "Year", "Display_Mode", "Cumulative_Inflation",
    "Cash_Balance", "Taxable_Balance", "PreTax_Balance", "Roth_Balance",
    "Total_Portfolio", "Living_Spend", "Social_Security", "Portfolio_Draw",
    "Mandated_RMD", "Total_Tax", "Strategy_Note"
  ];

  const rows = simulationLedger.map((r) => {
    const infl = isReal ? r.cumulativeInflation : 1.0;
    return [
      r.age,
      r.year,
      isReal ? "Real_Purchasing_Power" : "Nominal_Checkbook",
      r.cumulativeInflation.toFixed(4),
      Math.round(r.balCash / infl),
      Math.round(r.balTaxable / infl),
      Math.round(r.balPretax / infl),
      Math.round(r.balRoth / infl),
      Math.round(r.totalPortfolio / infl),
      Math.round(r.livingSpend / infl),
      Math.round(r.ssInflow / infl),
      Math.round(r.portfolioDraw / infl),
      Math.round(r.rmdAmount / infl),
      Math.round(r.totalTax / infl),
      `"${r.strategyNote.replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retirement_drawdown_${viewMode}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===================================================================
// TWO-WAY FIRE CALCULATOR BRIDGE & INITIALIZATION
// ===================================================================

export function syncBucketTargetAndCash(autoRebalance = false) {
  const selectedStrategy = document.querySelector('input[name="drawdown-strategy"]:checked')?.value || "guardrailed-buckets";
  const isBucket = selectedStrategy === "bucket-strategy" || selectedStrategy === "guardrailed-buckets";

  const essential = safeParseFloat(inputSpendEssential?.value, 45000);
  const discretionary = safeParseFloat(inputSpendDiscretionary?.value, 11400);
  const annualSpend = essential + discretionary;
  const targetYears = selectBucketYears ? safeParseInt(selectBucketYears.value, 2) : 2;
  const targetCash = Math.round(annualSpend * targetYears);

  if (bucketTargetAmount) {
    bucketTargetAmount.textContent = formatCurrency(targetCash);
  }

  if (cashBucketTargetTag) {
    if (isBucket) {
      cashBucketTargetTag.style.display = "inline-block";
      cashBucketTargetTag.textContent = `Bucket 1 Target: ${formatCurrency(targetCash)} (${targetYears} Yrs)`;
    } else {
      cashBucketTargetTag.style.display = "none";
    }
  }

  if (cashBufferSubtext) {
    if (isBucket) {
      cashBufferSubtext.textContent = `Bucket 1 maintains ${targetYears} yr${targetYears > 1 ? "s" : ""} of living expenses (${formatCurrency(targetCash)}) to shield equities during bear markets.`;
    } else {
      cashBufferSubtext.textContent = "Safe liquidity buffer protecting equities against early sequence risk.";
    }
  }

  if (autoRebalance && isBucket) {
    rebalanceCashToTarget(targetCash);
  }
}

function rebalanceCashToTarget(targetCash) {
  const currentCash = safeParseFloat(inputAssetCash?.value, 0);
  const diff = targetCash - currentCash;
  if (diff === 0) return;

  let taxable = safeParseFloat(inputAssetTaxable?.value, 0);
  let taxableBasis = safeParseFloat(inputAssetTaxableBasis?.value, 0);
  let preTax = safeParseFloat(inputAssetPretax?.value, 0);
  let roth = safeParseFloat(inputAssetRoth?.value, 0);

  if (diff > 0) {
    // Need more cash: rebalance from Taxable first, then Pre-Tax, then Roth
    let remainingToMove = diff;
    if (taxable > 0) {
      const moveTaxable = Math.min(taxable, remainingToMove);
      const basisRatio = taxable > 0 ? (taxableBasis / taxable) : 1;
      taxable -= moveTaxable;
      taxableBasis = Math.max(0, taxableBasis - (moveTaxable * basisRatio));
      remainingToMove -= moveTaxable;
    }
    if (remainingToMove > 0 && preTax > 0) {
      const movePreTax = Math.min(preTax, remainingToMove);
      preTax -= movePreTax;
      remainingToMove -= movePreTax;
    }
    if (remainingToMove > 0 && roth > 0) {
      const moveRoth = Math.min(roth, remainingToMove);
      roth -= moveRoth;
      remainingToMove -= moveRoth;
    }

    const actualMoved = diff - remainingToMove;
    const newCash = currentCash + actualMoved;

    if (inputAssetTaxable) inputAssetTaxable.value = Math.round(taxable);
    if (inputAssetTaxableBasis) inputAssetTaxableBasis.value = Math.round(taxableBasis);
    if (inputAssetPretax) inputAssetPretax.value = Math.round(preTax);
    if (inputAssetRoth) inputAssetRoth.value = Math.round(roth);
    if (inputAssetCash) inputAssetCash.value = Math.round(newCash);
  } else {
    // Current cash is higher than target: return surplus to Taxable if taxable exists, else Pre-Tax
    const surplus = Math.abs(diff);
    if (taxable > 0 || (taxable === 0 && preTax === 0 && roth === 0)) {
      taxable += surplus;
      taxableBasis += surplus;
      if (inputAssetTaxable) inputAssetTaxable.value = Math.round(taxable);
      if (inputAssetTaxableBasis) inputAssetTaxableBasis.value = Math.round(taxableBasis);
    } else if (preTax > 0) {
      preTax += surplus;
      if (inputAssetPretax) inputAssetPretax.value = Math.round(preTax);
    } else {
      roth += surplus;
      if (inputAssetRoth) inputAssetRoth.value = Math.round(roth);
    }
    if (inputAssetCash) inputAssetCash.value = Math.round(targetCash);
  }

  updatePortfolioTotalDisplay();
}

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
  if (!manualClick) return;
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
      if (fi["fire-annual-return"] && inputStockReturn) {
        inputStockReturn.value = fi["fire-annual-return"];
      }
      syncedItems.push("Ages & Return Expectations");
    }

    updatePortfolioTotalDisplay();
    updateBlendedReturnDisplay();
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
    inputEquityPct, inputStockReturn, inputBondReturn, inputCashYield, inputInflation, selectScenario,
    selectBucketYears
  ];

  inputsToListen.forEach((el) => {
    if (el) {
      el.addEventListener("input", () => {
        const isBucket = document.querySelector('input[name="drawdown-strategy"]:checked')?.value === "bucket-strategy" ||
                         document.querySelector('input[name="drawdown-strategy"]:checked')?.value === "guardrailed-buckets";
        if (isBucket && (el === inputSpendEssential || el === inputSpendDiscretionary)) {
          syncBucketTargetAndCash(true);
        } else {
          syncBucketTargetAndCash(false);
        }
        updatePortfolioTotalDisplay();
        updateBlendedReturnDisplay();
        runDrawdownSimulation();
      });
      el.addEventListener("change", () => {
        const isBucket = document.querySelector('input[name="drawdown-strategy"]:checked')?.value === "bucket-strategy" ||
                         document.querySelector('input[name="drawdown-strategy"]:checked')?.value === "guardrailed-buckets";
        if (isBucket && (el === inputSpendEssential || el === inputSpendDiscretionary)) {
          syncBucketTargetAndCash(true);
        } else {
          syncBucketTargetAndCash(false);
        }
        updatePortfolioTotalDisplay();
        updateBlendedReturnDisplay();
        runDrawdownSimulation();
      });
    }
  });

  document.querySelectorAll('input[name="drawdown-strategy"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isBucket = (radio.value === "bucket-strategy" || radio.value === "guardrailed-buckets") && radio.checked;
      if (bucketDrawer) {
        bucketDrawer.style.display = isBucket ? "block" : "none";
      }
      syncBucketTargetAndCash(isBucket);
      runDrawdownSimulation();
    });
  });

  if (selectBucketYears) {
    selectBucketYears.addEventListener("change", () => {
      syncBucketTargetAndCash(true);
      runDrawdownSimulation();
    });
  }

  if (btnBucketRebalance) {
    btnBucketRebalance.addEventListener("click", () => {
      syncBucketTargetAndCash(true);
      runDrawdownSimulation();
    });
  }

  // Real vs Nominal View Toggle
  if (btnViewNominal) {
    btnViewNominal.addEventListener("click", () => {
      if (viewMode === "nominal") return;
      viewMode = "nominal";
      btnViewNominal.classList.add("active");
      btnViewReal?.classList.remove("active");
      if (viewModeDesc) viewModeDesc.textContent = "Nominal future checkbook dollars";
      updateKpis(lastSimulationRuinAge, lastLifetimeSpending, lastLifetimeTaxes);
      renderLedgerTable();
      renderHorizonStackedChart();
      renderCashFlowStackedChart();
    });
  }

  if (btnViewReal) {
    btnViewReal.addEventListener("click", () => {
      if (viewMode === "real") return;
      viewMode = "real";
      btnViewReal.classList.add("active");
      btnViewNominal?.classList.remove("active");
      if (viewModeDesc) viewModeDesc.textContent = "Real purchasing power in Year 1 dollars";
      updateKpis(lastSimulationRuinAge, lastLifetimeSpending, lastLifetimeTaxes);
      renderLedgerTable();
      renderHorizonStackedChart();
      renderCashFlowStackedChart();
    });
  }

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
syncBucketTargetAndCash(true);
updatePortfolioTotalDisplay();
updateBlendedReturnDisplay();
runDrawdownSimulation();

