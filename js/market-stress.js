/**
 * Market Stress & Portfolio Timing Simulator
 * Analyzes mega-cap concentration risk, Treasury flight-to-safety,
 * and tests whether an active defensive shift beats staying the course (60/40 + Continuous DCA).
 */

import {
  safeParseFloat, safeParseInt, formatCurrency,
  createChartContext, rafThrottle, drawTooltip
} from "./chart-utils.js";

// ===================================================================
// HISTORICAL & FORWARD SCENARIO DATA
// ===================================================================

const SCENARIOS = [
  // --- BEAR REGIMES & CRASHES ---
  {
    id: "breadth-unwind",
    name: "2024–2026 Forward: Mega-Cap Tech Unwind",
    regime: "bear",
    durationMonths: 24,
    troughMonth: 14,
    descTitle: "Current Market: Top 10 Mega-Cap Multiple Contraction",
    descText: "The top 10 stocks drop -30% as elevated valuations compress. The broader S&P 490 holds up relatively well (-8%). 10-Year Treasuries rally strongly as yields fall from 4.5% to 3.2% in a flight to safety.",
    spShockTotal: "-22.5%",
    bondRallyTotal: "+9.5%",
    monthlyReturns: [
      // Month 1 - 14: Unwind to Trough
      { m: 1, phase: "Valuation Shock", sp: -0.045, rsp: -0.012, bond: 0.015, cash: 0.0037 },
      { m: 2, phase: "Tech Earnings Miss", sp: -0.052, rsp: -0.018, bond: 0.018, cash: 0.0037 },
      { m: 3, phase: "Rotation to Value", sp: -0.038, rsp: 0.005, bond: 0.012, cash: 0.0037 },
      { m: 4, phase: "Growth De-leveraging", sp: -0.025, rsp: -0.008, bond: 0.008, cash: 0.0037 },
      { m: 5, phase: "Yield Flight", sp: -0.015, rsp: 0.002, bond: 0.014, cash: 0.0037 },
      { m: 6, phase: "Recession Warning", sp: -0.032, rsp: -0.020, bond: 0.011, cash: 0.0037 },
      { m: 7, phase: "S&P Capitulation", sp: -0.040, rsp: -0.015, bond: 0.009, cash: 0.0037 },
      { m: 8, phase: "Treasury Surge", sp: -0.018, rsp: 0.004, bond: 0.016, cash: 0.0037 },
      { m: 9, phase: "Fed Pause Signal", sp: 0.012, rsp: 0.008, bond: 0.006, cash: 0.0035 },
      { m: 10, phase: "Second Wave Dip", sp: -0.035, rsp: -0.012, bond: 0.008, cash: 0.0035 },
      { m: 11, phase: "Credit Tightening", sp: -0.028, rsp: -0.015, bond: 0.007, cash: 0.0035 },
      { m: 12, phase: "Yield Inversion Eases", sp: -0.010, rsp: 0.003, bond: 0.005, cash: 0.0035 },
      { m: 13, phase: "Final Margin Selling", sp: -0.022, rsp: -0.010, bond: 0.004, cash: 0.0035 },
      { m: 14, phase: "Market Trough (Bottom)", sp: -0.015, rsp: -0.005, bond: 0.003, cash: 0.0035, isTrough: true },
      // Month 15 - 24: Rebound & Expansion
      { m: 15, phase: "Explosive Rebound", sp: 0.058, rsp: 0.042, bond: -0.005, cash: 0.0032 },
      { m: 16, phase: "Broad Market Breadth", sp: 0.042, rsp: 0.048, bond: -0.003, cash: 0.0032 },
      { m: 17, phase: "Earnings Recovery", sp: 0.035, rsp: 0.030, bond: 0.002, cash: 0.0032 },
      { m: 18, phase: "Rate Cut Cycle", sp: 0.028, rsp: 0.025, bond: 0.006, cash: 0.0030 },
      { m: 19, phase: "Bull Continuation", sp: 0.022, rsp: 0.018, bond: 0.003, cash: 0.0030 },
      { m: 20, phase: "New Highs Approach", sp: 0.025, rsp: 0.020, bond: 0.002, cash: 0.0030 },
      { m: 21, phase: "Consolidation", sp: 0.010, rsp: 0.012, bond: 0.003, cash: 0.0030 },
      { m: 22, phase: "Expansion Acceleration", sp: 0.024, rsp: 0.022, bond: 0.001, cash: 0.0028 },
      { m: 23, phase: "Tech Multiple Stabilizes", sp: 0.018, rsp: 0.015, bond: 0.002, cash: 0.0028 },
      { m: 24, phase: "Full Cycle Breakeven", sp: 0.020, rsp: 0.018, bond: 0.003, cash: 0.0028 },
    ],
  },
  {
    id: "dot-com-2000",
    name: "2000–2002: Dot-Com Tech Bubble Bust",
    regime: "bear",
    durationMonths: 36,
    troughMonth: 30,
    descTitle: "Extreme Concentration Collapse: Tech -80% vs Value +10%",
    descText: "The Nasdaq and speculative tech collapsed by ~80%, pulling the S&P down -49%. However, old-economy Value and Dividend stocks held positive returns (+10.5%), and 10-Year Treasuries surged +28.4% on flight to safety.",
    spShockTotal: "-49.1%",
    bondRallyTotal: "+28.4%",
    monthlyReturns: generateRegimeSeries(-0.491, 0.105, 0.284, 0.045, 36, 30),
  },
  {
    id: "gfc-2008",
    name: "2007–2009: Great Financial Crisis (GFC)",
    regime: "bear",
    durationMonths: 36,
    troughMonth: 17,
    descTitle: "Global Liquidity & Credit Contagion",
    descText: "S&P 500 plunged -56.8% over 17 months. Treasuries served as the premier hedge (+20.1%) as the Federal Reserve slashed rates from 5.25% to 0%. The subsequent rebound was one of the fastest in market history.",
    spShockTotal: "-56.8%",
    bondRallyTotal: "+20.1%",
    monthlyReturns: generateRegimeSeries(-0.568, -0.520, 0.201, 0.025, 36, 17),
  },
  {
    id: "rate-shock-2022",
    name: "2022: Simultaneous Stock/Bond Rate Shock",
    regime: "bear",
    durationMonths: 24,
    troughMonth: 10,
    descTitle: "Fastest Rate Hikes in 40 Years (Zero Bond Hedge)",
    descText: "Inflation forced aggressive Fed rate hikes. Both equities (-18.1%) and 10-Yr Treasuries (-17.0%) crashed together, destroying standard 60/40 diversification. Cash and T-Bills were the only safe haven.",
    spShockTotal: "-18.1%",
    bondRallyTotal: "-17.0%",
    monthlyReturns: generateRegimeSeries(-0.181, -0.125, -0.170, 0.028, 24, 10),
  },
  {
    id: "nifty-fifty-1973",
    name: "1973–1974: 'Nifty Fifty' Stagflation Crash",
    regime: "bear",
    durationMonths: 24,
    troughMonth: 21,
    descTitle: "Mega-Cap Glamour Stocks Collapse + Oil Shock",
    descText: "The 50 most popular mega-cap growth stocks collapsed by ~50% as inflation reached 12%. Bond prices fell as yields spiked, while high short-term T-Bill cash rates (7%) outperformed.",
    spShockTotal: "-48.2%",
    bondRallyTotal: "-5.0%",
    monthlyReturns: generateRegimeSeries(-0.482, -0.380, -0.050, 0.070, 24, 21),
  },
  {
    id: "covid-flash-2020",
    name: "2020: COVID Liquidity Shock & V-Recovery",
    regime: "bear",
    durationMonths: 14,
    troughMonth: 2,
    descTitle: "Shortest Bear Market in History (-34% in 5 Weeks)",
    descText: "Violent 34% drop followed by an explosive recovery powered by stimulus and zero rates. Market timers who panicked to cash missed the entire recovery.",
    spShockTotal: "-33.9%",
    bondRallyTotal: "+11.2%",
    monthlyReturns: generateRegimeSeries(-0.339, -0.350, 0.112, 0.015, 14, 2),
  },

  // --- BULL REGIMES & EXPANSIONS ---
  {
    id: "ai-boom-2023",
    name: "2023–2024: AI & Mega-Cap Tech Super-Rally",
    regime: "bull",
    durationMonths: 24,
    troughMonth: 1,
    descTitle: "Mega-Cap Tech Boom Powered by Generative AI",
    descText: "The top 10 mega-caps surged +50%+, driving the cap-weighted S&P 500 up +24%/yr. Equal-weight (RSP) lagged, and bond returns were subdued by 4.5% yields.",
    spShockTotal: "+52.0%",
    bondRallyTotal: "+3.5%",
    monthlyReturns: generateBullSeries(0.52, 0.24, 0.035, 0.050, 24),
  },
  {
    id: "golden-decade-2010",
    name: "2010–2014: Post-GFC Low-Rate Golden Era",
    regime: "bull",
    durationMonths: 36,
    troughMonth: 1,
    descTitle: "Zero-Rate Compounding & Steady 60/40 Expansion",
    descText: "Quantitative easing and disinflation allowed equities to compound at +15% CAGR while intermediate bonds produced steady coupon returns.",
    spShockTotal: "+58.5%",
    bondRallyTotal: "+14.8%",
    monthlyReturns: generateBullSeries(0.585, 0.540, 0.148, 0.005, 36),
  },
  {
    id: "dot-com-bull-1995",
    name: "1995–1999: Dot-Com Tech Mania",
    regime: "bull",
    durationMonths: 36,
    troughMonth: 1,
    descTitle: "Historic Multiple Expansion (+28% CAGR)",
    descText: "The strongest equity bull run of the 20th century. Cash and defensive allocations suffered immense opportunity cost penalties.",
    spShockTotal: "+85.0%",
    bondRallyTotal: "+22.0%",
    monthlyReturns: generateBullSeries(0.850, 0.650, 0.220, 0.052, 36),
  },

  // --- STAGFLATION & SECULAR "LOST DECADES" ---
  {
    id: "stagflation-1973-decade",
    name: "1973–1982: 10-Year Great Stagflation & Volcker Era (120 Mo)",
    regime: "stagflation",
    durationMonths: 120,
    troughMonth: 24,
    descTitle: "Double-Digit Inflation (14.8%) + Dual Oil Shocks",
    descText: "The S&P 500 had two separate 40%+ crashes and returned only +4.8%/yr nominal (-35% real). Bond yields spiked to 15%, destroying intermediate Treasuries (+3.2%/yr). Rolling T-Bills (+8.8%/yr) and Equal-Weight Value (+11.2%/yr) were the premier hedges.",
    spShockTotal: "-35.2% (Real)",
    bondRallyTotal: "-42.0% (Real)",
    generator: (months) => generate1973DecadeSeries(months),
    monthlyReturns: [],
  },
  {
    id: "secular-1966-1982",
    name: "1966–1982: 16-Year Secular Stagflation (The Bengen Crisis) (192 Mo)",
    regime: "stagflation",
    durationMonths: 192,
    troughMonth: 106,
    descTitle: "Worst Retirement Crisis in US History (CPI +232%)",
    descText: "The benchmark era that broke static withdrawal rules. The S&P was ~100 in 1966 and ~100 in 1982. Capital appreciation was 0.0% while cumulative inflation erased 65% of dollar purchasing power. Floating T-Bills (+7.2%/yr) and dividend-paying value (+8.9%/yr) protected capital.",
    spShockTotal: "-64.5% (Real)",
    bondRallyTotal: "-38.0% (Real)",
    generator: (months) => generate1966SecularSeries(months),
    monthlyReturns: [],
  },
  {
    id: "lost-decade-2000-2012",
    name: "2000–2012: 12-Year Post-Bubble 'Lost Decade' (144 Mo)",
    regime: "stagflation",
    durationMonths: 144,
    troughMonth: 111,
    descTitle: "Two Mega-Crashes (Dot-Com + GFC) in 10 Years",
    descText: "Cap-weighted S&P 500 compounded at just +0.4%/yr over 12 full years. Equal-weight value (RSP) outperformed by +70% (+5.8%/yr). Intermediate Treasuries rallied (+6.8%/yr) as the Fed slashed rates from 6.5% to zero.",
    spShockTotal: "+5.1%",
    bondRallyTotal: "+72.0%",
    generator: (months) => generateLostDecade2000Series(months),
    monthlyReturns: [],
  },
  {
    id: "custom-macro",
    name: "🛠️ Custom Macro Scenario Builder",
    regime: "stagflation",
    durationMonths: 60,
    troughMonth: 1,
    descTitle: "User-Defined Custom Macro Assumptions",
    descText: "Specify your own annual returns for S&P 500, Equal-Weight RSP, 10-Yr Treasuries, Cash Yield, and Inflation, and test any custom time horizon from 1 to 15 years.",
    spShockTotal: "Custom",
    bondRallyTotal: "Custom",
    generator: (months) => generateCustomMacroSeries(months),
    monthlyReturns: [],
  },
];

// Helper: 1973–1982 Historical 10-Year Stagflation Era
function generate1973DecadeSeries(totalMonths) {
  const series = [];
  const scale = totalMonths / 120;

  for (let m = 1; m <= totalMonths; m++) {
    const unscaledM = m / scale;
    let sp, rsp, bond, cash, phase;
    const wobble = 0.012 * Math.sin(m * 1.7) + 0.008 * Math.cos(m * 2.9);

    if (unscaledM <= 22) {
      phase = "1973–74 Oil Embargo & Nifty Fifty Crash";
      sp = -0.024 + wobble;
      rsp = -0.013 + wobble * 0.7;
      bond = -0.003 + wobble * 0.3;
      cash = 0.0062; // 7.4% annual
    } else if (unscaledM <= 48) {
      phase = "Mid-70s Explosive Value Rebound";
      sp = 0.020 + wobble;
      rsp = 0.025 + wobble * 0.8;
      bond = 0.005 + wobble * 0.3;
      cash = 0.0048; // 5.8% annual
    } else if (unscaledM <= 72) {
      phase = "Sticky Inflation Plateau (9% CPI)";
      sp = -0.001 + wobble;
      rsp = 0.008 + wobble;
      bond = 0.0015;
      cash = 0.0065; // 7.8% annual
    } else if (unscaledM <= 96) {
      phase = "Second Oil Shock & Energy Boom (14.8% CPI)";
      sp = 0.015 + wobble;
      rsp = 0.023 + wobble;
      bond = -0.004 + wobble;
      cash = 0.0098; // 11.8% annual
    } else if (unscaledM <= 114) {
      phase = "Volcker 20% Rate Crunch Recession";
      sp = -0.011 + wobble;
      rsp = -0.003 + wobble;
      bond = -0.007 + wobble;
      cash = 0.0128; // 15.4% annual floating yield
    } else {
      phase = "Volcker Pivot & Secular Bull Dawn";
      sp = 0.035 + wobble;
      rsp = 0.028 + wobble;
      bond = 0.018 + wobble;
      cash = 0.0075;
    }
    series.push({ m, phase, sp, rsp, bond, cash, isTrough: Math.round(22 * scale) === m });
  }
  return series;
}

// Helper: 1966–1982 Historical 16-Year Secular Stagflation
function generate1966SecularSeries(totalMonths) {
  const series = [];
  const scale = totalMonths / 192;

  for (let m = 1; m <= totalMonths; m++) {
    const unscaledM = m / scale;
    let sp, rsp, bond, cash, phase;
    const wobble = 0.012 * Math.sin(m * 1.5) + 0.007 * Math.cos(m * 3.1);

    if (unscaledM <= 48) {
      phase = "Late 60s Churn & 1969 Credit Crunch";
      sp = -0.004 + wobble;
      rsp = 0.005 + wobble * 0.8;
      bond = 0.002;
      cash = 0.0045;
    } else if (unscaledM <= 84) {
      phase = "Nifty Fifty Glamour Stock Peak";
      sp = 0.014 + wobble;
      rsp = 0.010 + wobble;
      bond = 0.004;
      cash = 0.0042;
    } else if (unscaledM <= 106) {
      phase = "1973–74 Oil Shock & Valuation Collapse";
      sp = -0.025 + wobble;
      rsp = -0.014 + wobble * 0.7;
      bond = -0.003;
      cash = 0.0065;
    } else if (unscaledM <= 156) {
      phase = "Mid-70s Expansion & Value Outperformance";
      sp = 0.010 + wobble;
      rsp = 0.018 + wobble * 0.8;
      bond = 0.003;
      cash = 0.0055;
    } else if (unscaledM <= 180) {
      phase = "Second Oil Shock (14.8% Inflation Peak)";
      sp = 0.015 + wobble;
      rsp = 0.022 + wobble;
      bond = -0.005;
      cash = 0.0095;
    } else {
      phase = "Volcker Tightening & 1982 Secular Low";
      sp = -0.008 + wobble;
      rsp = 0.002 + wobble;
      bond = -0.006;
      cash = 0.0125;
    }
    series.push({ m, phase, sp, rsp, bond, cash, isTrough: Math.round(106 * scale) === m });
  }
  return series;
}

// Helper: 2000–2012 Historical 12-Year 'Lost Decade' (Double M-Bust)
function generateLostDecade2000Series(totalMonths) {
  const series = [];
  const scale = totalMonths / 144;

  for (let m = 1; m <= totalMonths; m++) {
    const unscaledM = m / scale;
    let sp, rsp, bond, cash, phase;
    const wobble = 0.012 * Math.sin(m * 1.8) + 0.007 * Math.cos(m * 2.7);

    if (unscaledM <= 34) {
      phase = "Dot-Com Bust (Tech -80% vs Value +10%)";
      sp = -0.018 + wobble;
      rsp = 0.003 + wobble * 0.7;
      bond = 0.007 + wobble * 0.4;
      cash = 0.0035;
    } else if (unscaledM <= 94) {
      phase = "Housing & Global Credit Expansion";
      sp = 0.012 + wobble;
      rsp = 0.015 + wobble * 0.8;
      bond = 0.0035;
      cash = 0.0028;
    } else if (unscaledM <= 111) {
      phase = "Great Financial Crisis (Credit Collapse)";
      sp = -0.038 + wobble;
      rsp = -0.035 + wobble;
      bond = 0.011 + wobble * 0.3;
      cash = 0.0020;
    } else {
      phase = "Zero-Rate Quantitative Easing Recovery";
      sp = 0.022 + wobble;
      rsp = 0.024 + wobble;
      bond = 0.005;
      cash = 0.0005;
    }
    series.push({ m, phase, sp, rsp, bond, cash, isTrough: Math.round(111 * scale) === m });
  }
  return series;
}

// Helper: Custom Macro Builder with 4-5 Year Business Cycles (Not a raw sine wave)
function generateCustomMacroSeries(totalMonths) {
  const spAnn = (safeParseFloat(document.getElementById("custom-sp-return")?.value, 4.0)) / 100;
  const rspAnn = (safeParseFloat(document.getElementById("custom-rsp-return")?.value, 10.0)) / 100;
  const bondAnn = (safeParseFloat(document.getElementById("custom-bond-return")?.value, 2.5)) / 100;
  const cashAnn = (safeParseFloat(document.getElementById("custom-cash-yield")?.value, 8.0)) / 100;

  const series = [];
  const monthlyCash = cashAnn / 12;
  const spBase = Math.pow(1 + spAnn, 1 / 12) - 1;
  const rspBase = Math.pow(1 + rspAnn, 1 / 12) - 1;
  const bondBase = Math.pow(1 + bondAnn, 1 / 12) - 1;

  for (let m = 1; m <= totalMonths; m++) {
    // 48-month organic business cycle with irregular market noise
    const businessCycle = Math.sin((m / 48) * 2 * Math.PI);
    const noise = 0.010 * Math.sin(m * 1.6) + 0.006 * Math.cos(m * 2.7);

    const sp = spBase + (businessCycle * 0.008) + noise;
    const rsp = rspBase + (businessCycle * 0.005) + noise * 0.8;
    const bond = bondBase - (businessCycle * 0.004) + noise * 0.3;
    const cash = monthlyCash * (1 + businessCycle * 0.15);

    let phase = businessCycle > 0.4 ? "Cyclical Expansion" : (businessCycle < -0.4 ? "Cyclical Contraction" : "Mid-Cycle Plateau");

    series.push({ m, phase, sp, rsp, bond, cash, isTrough: false });
  }
  return series;
}

// Helper to generate monthly return profiles matching historical peaks and troughs
function generateRegimeSeries(spCrash, rspCrash, bondRally, cashYieldAnnual, totalMonths, troughMonth) {
  const series = [];
  const monthlyCash = cashYieldAnnual / 12;

  // Down phase: waterfall acceleration towards capitulation trough
  const downPower = 1.35;
  let downWeights = [];
  let sumDown = 0;
  for (let m = 1; m <= troughMonth; m++) {
    const w = Math.pow(m, downPower);
    downWeights.push(w);
    sumDown += w;
  }

  const spDownLog = Math.log(1 + spCrash);
  const rspDownLog = Math.log(1 + rspCrash);
  const bondDownLog = Math.log(1 + bondRally);

  // Recovery phase: front-loaded explosive rebound tapering into steady trend
  const recMonths = totalMonths - troughMonth;
  const upPower = 1.45;
  let upWeights = [];
  let sumUp = 0;
  for (let m = 1; m <= recMonths; m++) {
    const w = Math.pow(recMonths - m + 1, upPower);
    upWeights.push(w);
    sumUp += w;
  }

  // Rebound target: recover back towards peak and post-crisis expansion
  const recSpTarget = Math.abs(spCrash) * (recMonths >= troughMonth ? 1.25 : 1.10);
  const recRspTarget = Math.abs(rspCrash) * (recMonths >= troughMonth ? 1.20 : 1.05);
  const spUpLog = Math.log(1 + recSpTarget);
  const rspUpLog = Math.log(1 + recRspTarget);

  for (let m = 1; m <= totalMonths; m++) {
    const isDownPhase = m <= troughMonth;
    let phase = isDownPhase ? "Downturn Cascade" : "Recovery Surge";
    if (m === troughMonth) phase = "Market Trough (Capitulation)";

    let sp, rsp, bond;
    const wobble = 0.12 * Math.sin(m * 1.4);

    if (isDownPhase) {
      const w = downWeights[m - 1] / sumDown;
      sp = (Math.exp(w * spDownLog) - 1) * (1 + wobble);
      rsp = (Math.exp(w * rspDownLog) - 1) * (1 + wobble * 0.8);
      bond = (Math.exp(w * bondDownLog) - 1) * (1 - wobble * 0.3);
    } else {
      const recIdx = m - troughMonth - 1;
      const w = upWeights[recIdx] / sumUp;
      sp = (Math.exp(w * spUpLog) - 1) * (1 + wobble);
      rsp = (Math.exp(w * rspUpLog) - 1) * (1 + wobble * 0.8);
      bond = 0.0035 * (1 - wobble * 0.2); // steady coupon yield
    }

    series.push({
      m,
      phase,
      sp,
      rsp,
      bond,
      cash: monthlyCash,
      isTrough: m === troughMonth,
    });
  }
  return series;
}

function generateBullSeries(spTotal, rspTotal, bondTotal, cashYieldAnnual, totalMonths) {
  const series = [];
  const monthlyCash = cashYieldAnnual / 12;

  // Parabolic compounding momentum: accelerating weights
  const power = 1.55;
  let weights = [];
  let sumW = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const w = Math.pow(m, power);
    weights.push(w);
    sumW += w;
  }

  const spLog = Math.log(1 + spTotal);
  const rspLog = Math.log(1 + rspTotal);
  const bondLog = Math.log(1 + bondTotal);

  for (let m = 1; m <= totalMonths; m++) {
    const w = weights[m - 1] / sumW;
    const wobble = 0.15 * Math.sin(m * 1.1);

    const sp = (Math.exp(w * spLog) - 1) * (1 + wobble);
    const rsp = (Math.exp(w * rspLog) - 1) * (1 + wobble * 0.7);
    const bond = (Math.exp(w * bondLog) - 1) * (1 - wobble * 0.2);

    series.push({
      m,
      phase: m <= totalMonths / 3 ? "Early Accumulation" : (m <= (2 * totalMonths) / 3 ? "Expansion Surge" : "Parabolic Melt-Up"),
      sp,
      rsp,
      bond,
      cash: monthlyCash,
      isTrough: false,
    });
  }
  return series;
}

// ===================================================================
// STATE
// ===================================================================

let currentRegime = "bear"; // "bear" | "bull"
let activeScenario = SCENARIOS[0];
let simulationResults = {
  baselineTrajectory: [],
  defensiveTrajectory: [],
  statsBaseline: {},
  statsDefensive: {},
  monthlyTableRows: [],
};

// DOM Elements
const inputStartPortfolio = document.getElementById("stress-start-portfolio");
const inputMonthlyDca = document.getElementById("stress-monthly-dca");
const inputEmployerMatch = document.getElementById("stress-employer-match");
const selectDcaBehavior = document.getElementById("stress-dca-behavior");

const btnRegimeBear = document.getElementById("btn-regime-bear");
const btnRegimeBull = document.getElementById("btn-regime-bull");
const btnRegimeStagflation = document.getElementById("btn-regime-stagflation");
const selectScenario = document.getElementById("stress-scenario-select");
const sliderHorizon = document.getElementById("slider-horizon-months");
const valHorizonDisplay = document.getElementById("val-horizon-display");
const customBuilderDrawer = document.getElementById("custom-builder-drawer");

const sliderSp500 = document.getElementById("slider-alloc-sp500");
const sliderRsp = document.getElementById("slider-alloc-rsp");
const sliderTreasury = document.getElementById("slider-alloc-treasury");
const sliderCash = document.getElementById("slider-alloc-cash");

const valSp500 = document.getElementById("val-alloc-sp500");
const valRsp = document.getElementById("val-alloc-rsp");
const valTreasury = document.getElementById("val-alloc-treasury");
const valCash = document.getElementById("val-alloc-cash");
const allocSumText = document.getElementById("alloc-sum-text");
const allocSumPill = document.getElementById("alloc-sum-pill");

const selectReentryTiming = document.getElementById("stress-reentry-timing");

// ===================================================================
// SIMULATION ENGINE
// ===================================================================

export function runStressSimulation() {
  const startPortfolio = safeParseFloat(inputStartPortfolio?.value, 2860000);
  const employeeDca = safeParseFloat(inputMonthlyDca?.value, 1916);
  const employerMatch = safeParseFloat(inputEmployerMatch?.value, 500);
  const totalMonthlyDca = employeeDca + employerMatch;
  const dcaBehavior = selectDcaBehavior?.value || "continuous";

  // Defensive Allocations (Normalized)
  const rawSp = safeParseFloat(sliderSp500?.value, 25);
  const rawRsp = safeParseFloat(sliderRsp?.value, 25);
  const rawTreasury = safeParseFloat(sliderTreasury?.value, 30);
  const rawCash = safeParseFloat(sliderCash?.value, 20);
  const rawSum = rawSp + rawRsp + rawTreasury + rawCash;

  const wSp = rawSum > 0 ? (rawSp / rawSum) : 0.25;
  const wRsp = rawSum > 0 ? (rawRsp / rawSum) : 0.25;
  const wTreasury = rawSum > 0 ? (rawTreasury / rawSum) : 0.30;
  const wCash = rawSum > 0 ? (rawCash / rawSum) : 0.20;

  const reentryMode = selectReentryTiming?.value || "late-6mo";
  const scenario = activeScenario;
  const customHorizon = sliderHorizon ? parseInt(sliderHorizon.value, 10) : scenario.durationMonths;

  let monthlySeries = [];
  if (scenario.id === "custom-macro") {
    monthlySeries = generateCustomMacroSeries(customHorizon);
  } else if (scenario.generator) {
    monthlySeries = scenario.generator(customHorizon);
  } else {
    // Sliced or extended series based on customHorizon
    const baseSeries = scenario.monthlyReturns || [];
    if (customHorizon <= baseSeries.length) {
      monthlySeries = baseSeries.slice(0, customHorizon);
    } else {
      const extended = [...baseSeries];
      while (extended.length < customHorizon && baseSeries.length > 0) {
        const nextM = extended.length + 1;
        const template = baseSeries[(nextM - 1) % baseSeries.length];
        extended.push({ ...template, m: nextM });
      }
      monthlySeries = extended;
    }
  }

  const troughMonth = scenario.troughMonth;

  // Calculate Re-entry Month
  let rotationMonth = Infinity;
  if (scenario.regime === "bull" || scenario.regime === "stagflation") {
    // In bull market and multi-year secular regimes, stay in custom allocation
    rotationMonth = Infinity;
  } else {
    if (reentryMode === "perfect") rotationMonth = troughMonth;
    else if (reentryMode === "late-6mo") rotationMonth = Math.min(customHorizon, troughMonth + 6);
    else if (reentryMode === "late-12mo") rotationMonth = Math.min(customHorizon, troughMonth + 12);
    else if (reentryMode === "never") rotationMonth = Infinity;
  }

  let balBaseline = startPortfolio;
  let balDefensive = startPortfolio;
  let balPureSp = startPortfolio;

  let peakBaseline = startPortfolio;
  let peakDefensive = startPortfolio;
  let maxDdBaseline = 0;
  let maxDdDefensive = 0;
  let troughValBaseline = startPortfolio;
  let troughValDefensive = startPortfolio;

  let recoveredMonthBaseline = null;
  let recoveredMonthDefensive = null;

  const baselineTrajectory = [{ m: 0, val: startPortfolio, dd: 0 }];
  const defensiveTrajectory = [{ m: 0, val: startPortfolio, dd: 0 }];
  const monthlyTableRows = [];

  for (let idx = 0; idx < monthlySeries.length; idx++) {
    const row = monthlySeries[idx];
    const m = row.m;

    // Benchmark: 100% S&P 500
    balPureSp = (balPureSp * (1 + row.sp)) + totalMonthlyDca;

    // 1. Baseline Strategy: Static 60/40 (60% S&P 500, 40% Treasuries)
    const returnBaseline = (0.60 * row.sp) + (0.40 * row.bond);
    balBaseline = (balBaseline * (1 + returnBaseline)) + totalMonthlyDca;

    if (balBaseline > peakBaseline) {
      peakBaseline = balBaseline;
    }
    const currentDdBase = (balBaseline - peakBaseline) / peakBaseline;
    if (currentDdBase < maxDdBaseline) maxDdBaseline = currentDdBase;
    if (balBaseline < troughValBaseline) troughValBaseline = balBaseline;

    if (recoveredMonthBaseline === null && idx >= troughMonth && balBaseline >= startPortfolio) {
      recoveredMonthBaseline = m;
    }

    // 2. Custom Defensive Strategy + Timing Re-entry
    const isRotatedBack = m >= rotationMonth;
    let returnDefensive = 0;

    if (isRotatedBack) {
      // Rotated back to standard 60/40
      returnDefensive = (0.60 * row.sp) + (0.40 * row.bond);
    } else {
      // Active Custom Defensive Mix
      returnDefensive = (wSp * row.sp) + (wRsp * row.rsp) + (wTreasury * row.bond) + (wCash * row.cash);
    }

    // Contribution Behavior
    let defContribution = totalMonthlyDca;
    if (dcaBehavior === "pause-cash" && m < rotationMonth) {
      // Panic paused to cash: earns cash yield rather than buying dip
      defContribution = totalMonthlyDca * (1 + row.cash);
    }
    balDefensive = (balDefensive * (1 + returnDefensive)) + defContribution;

    if (balDefensive > peakDefensive) {
      peakDefensive = balDefensive;
    }
    const currentDdDef = (balDefensive - peakDefensive) / peakDefensive;
    if (currentDdDef < maxDdDefensive) maxDdDefensive = currentDdDef;
    if (balDefensive < troughValDefensive) troughValDefensive = balDefensive;

    if (recoveredMonthDefensive === null && idx >= troughMonth && balDefensive >= startPortfolio) {
      recoveredMonthDefensive = m;
    }

    baselineTrajectory.push({ m, val: balBaseline, dd: currentDdBase });
    defensiveTrajectory.push({ m, val: balDefensive, dd: currentDdDef });

    monthlyTableRows.push({
      m,
      phase: row.phase,
      spPct: row.sp * 100,
      rspPct: row.rsp * 100,
      bondPct: row.bond * 100,
      cashPct: row.cash * 100,
      baseVal: balBaseline,
      baseReturn: returnBaseline * 100,
      defVal: balDefensive,
      defReturn: returnDefensive * 100,
      isTrough: row.isTrough,
    });
  }

  simulationResults = {
    baselineTrajectory,
    defensiveTrajectory,
    statsBaseline: {
      maxDrawdown: maxDdBaseline,
      troughValue: troughValBaseline,
      recoveryMonths: recoveredMonthBaseline || `${monthlySeries.length}+ Mos`,
      terminalValue: balBaseline,
    },
    statsDefensive: {
      maxDrawdown: maxDdDefensive,
      troughValue: troughValDefensive,
      recoveryMonths: recoveredMonthDefensive || `${monthlySeries.length}+ Mos`,
      terminalValue: balDefensive,
    },
    statsPureSp: {
      terminalValue: balPureSp,
    },
    monthlyTableRows,
    troughMonth,
  };

  updateKpiCards();
  updateVerdictBanner();
  renderTrajectoryChart();
  renderBreakdownTable();
}

// ===================================================================
// KPI UPDATES & VERDICT
// ===================================================================

function updateKpiCards() {
  const { statsBaseline, statsDefensive } = simulationResults;

  // Max Drawdown
  const elDdBase = document.getElementById("kpi-dd-baseline");
  const elDdDef = document.getElementById("kpi-dd-defensive");
  const elDdSub = document.getElementById("kpi-dd-sub");
  if (elDdBase) elDdBase.textContent = `${(statsBaseline.maxDrawdown * 100).toFixed(1)}%`;
  if (elDdDef) elDdDef.textContent = `${(statsDefensive.maxDrawdown * 100).toFixed(1)}%`;
  if (elDdSub) {
    const cushion = (statsBaseline.maxDrawdown - statsDefensive.maxDrawdown) * 100;
    elDdSub.textContent = cushion > 0
      ? `Defensive mix cushioned drop by +${cushion.toFixed(1)}%`
      : `Stay the course had ${Math.abs(cushion).toFixed(1)}% less drawdown`;
  }

  // Trough Lowest Point
  const elTroughBase = document.getElementById("kpi-trough-baseline");
  const elTroughDef = document.getElementById("kpi-trough-defensive");
  const elTroughSub = document.getElementById("kpi-trough-sub");
  if (elTroughBase) elTroughBase.textContent = formatCurrency(statsBaseline.troughValue);
  if (elTroughDef) elTroughDef.textContent = formatCurrency(statsDefensive.troughValue);
  if (elTroughSub) {
    const diff = statsDefensive.troughValue - statsBaseline.troughValue;
    if (Math.abs(diff) < 1) {
      elTroughSub.textContent = "Both strategies maintained identical trough floor";
    } else {
      elTroughSub.textContent = diff > 0
        ? `Preserved +${formatCurrency(diff)} more equity at bottom`
        : `Stay the course had +${formatCurrency(Math.abs(diff))} higher trough`;
    }
  }

  // Recovery Time
  const elRecBase = document.getElementById("kpi-recovery-baseline");
  const elRecDef = document.getElementById("kpi-recovery-defensive");
  const elRecSub = document.getElementById("kpi-recovery-sub");
  if (elRecBase) elRecBase.textContent = typeof statsBaseline.recoveryMonths === "number" ? `${statsBaseline.recoveryMonths} Mos` : statsBaseline.recoveryMonths;
  if (elRecDef) elRecDef.textContent = typeof statsDefensive.recoveryMonths === "number" ? `${statsDefensive.recoveryMonths} Mos` : statsDefensive.recoveryMonths;
  if (elRecSub) {
    if (typeof statsBaseline.recoveryMonths === "number" && typeof statsDefensive.recoveryMonths === "number") {
      const diff = statsDefensive.recoveryMonths - statsBaseline.recoveryMonths;
      elRecSub.textContent = diff <= 0
        ? `Defensive recovered ${Math.abs(diff)} mos faster`
        : `DCA at bottom accelerated 60/40 recovery by ${diff} mos`;
    } else {
      elRecSub.textContent = "Recovery beyond scenario horizon";
    }
  }

  // Terminal Wealth
  const elTermBase = document.getElementById("kpi-terminal-baseline");
  const elTermDef = document.getElementById("kpi-terminal-defensive");
  const elTermSub = document.getElementById("kpi-terminal-sub");
  if (elTermBase) elTermBase.textContent = formatCurrency(statsBaseline.terminalValue);
  if (elTermDef) elTermDef.textContent = formatCurrency(statsDefensive.terminalValue);
  if (elTermSub) {
    const netAdvantage = statsBaseline.terminalValue - statsDefensive.terminalValue;
    if (activeScenario.regime === "bull") {
      const pureDiff = simulationResults.statsPureSp.terminalValue - statsDefensive.terminalValue;
      elTermSub.textContent = `60/40 beat custom by +${formatCurrency(netAdvantage)} (100% S&P: +${formatCurrency(pureDiff)})`;
    } else if (activeScenario.regime === "stagflation") {
      elTermSub.textContent = netAdvantage <= 0
        ? `Defensive mix beat 60/40 by +${formatCurrency(Math.abs(netAdvantage))}`
        : `60/40 produced +${formatCurrency(netAdvantage)} higher nominal wealth`;
    } else {
      elTermSub.textContent = netAdvantage >= 0
        ? `Stay the course produced +${formatCurrency(netAdvantage)} more wealth`
        : `Defensive shift produced +${formatCurrency(Math.abs(netAdvantage))} more wealth`;
    }
  }
}

function updateVerdictBanner() {
  const banner = document.getElementById("verdict-banner");
  const icon = document.getElementById("verdict-icon");
  const tag = document.getElementById("verdict-tag");
  const headline = document.getElementById("verdict-headline");
  const explanation = document.getElementById("verdict-explanation");
  if (!banner) return;

  const { statsBaseline, statsDefensive, statsPureSp } = simulationResults;
  const netDiff = statsBaseline.terminalValue - statsDefensive.terminalValue;
  const troughDiff = statsDefensive.troughValue - statsBaseline.troughValue;
  const pureSpGap = statsPureSp.terminalValue - statsDefensive.terminalValue;

  if (activeScenario.regime === "stagflation") {
    banner.className = "verdict-banner timing-won";
    if (icon) icon.textContent = "⏳";
    if (tag) tag.textContent = "STAGFLATION & LOST DECADE ANALYSIS";
    const horizonMonths = sliderHorizon ? parseInt(sliderHorizon.value, 10) : activeScenario.durationMonths;
    const years = (horizonMonths / 12).toFixed(1);

    const inflationRate = activeScenario.id === "custom-macro"
      ? (safeParseFloat(document.getElementById("custom-inflation-rate")?.value, 7.5))
      : (activeScenario.id === "stagflation-1973-decade" ? 8.7 : (activeScenario.id === "secular-1966-1982" ? 7.4 : 2.5));
    const inflationErosion = (1 - Math.pow(1 / (1 + inflationRate / 100), horizonMonths / 12)) * 100;

    if (headline) {
      if (netDiff < 0) {
        headline.textContent = `Defensive Value & Floating Cash Wins by +${formatCurrency(Math.abs(netDiff))} Net Equity`;
      } else {
        headline.textContent = `Static 60/40 Leads by +${formatCurrency(netDiff)} in Nominal Ending Wealth`;
      }
    }
    if (explanation) {
      if (netDiff < 0) {
        explanation.textContent = `Over this ${years}-year period, sticky ${inflationRate}% inflation destroyed purchasing power by -${inflationErosion.toFixed(0)}%. Rising yields inflicted heavy duration losses on intermediate bonds. Tilting toward Equal-Weight Value and rolling short-term T-Bills shielded capital, beating 60/40 by +${formatCurrency(Math.abs(netDiff))} while continuing monthly DCA.`;
      } else {
        explanation.textContent = `Over this ${years}-year period with ~${inflationRate}% inflation, continuous 401(k) DCA accumulated shares at depressed multiples, yielding ${formatCurrency(statsBaseline.terminalValue)} in 60/40 vs ${formatCurrency(statsDefensive.terminalValue)} in the defensive mix.`;
      }
    }
    return;
  }

  if (activeScenario.regime === "bull") {
    banner.className = "verdict-banner dca-won";
    if (icon) icon.textContent = "📈";
    if (tag) tag.textContent = "BULL RUN DRAG & EQUITY OPPORTUNITY COST";
    if (headline) {
      headline.textContent = `Custom Spread Trailed 60/40 by -${formatCurrency(Math.abs(netDiff))} (-${formatCurrency(pureSpGap)} vs. 100% S&P 500)`;
    }
    if (explanation) {
      explanation.textContent = `Holding 50% in fixed income & cash (30% Treasuries + 20% Cash) created substantial drag during this bull market. Your custom mix reached ${formatCurrency(statsDefensive.terminalValue)}, trailing the static 60/40 baseline (${formatCurrency(statsBaseline.terminalValue)}) by -${formatCurrency(Math.abs(netDiff))}, and trailing 100% S&P 500 (${formatCurrency(statsPureSp.terminalValue)}) by -${formatCurrency(pureSpGap)}.`;
    }
    return;
  }

  if (netDiff >= 0) {
    // Stay the Course Wins
    banner.className = "verdict-banner dca-won";
    if (icon) icon.textContent = "🎯";
    if (tag) tag.textContent = "STAY THE COURSE WINS";
    if (headline) headline.textContent = `Continuous 60/40 DCA Wins by +${formatCurrency(netDiff)} Terminal Wealth`;
    if (explanation) {
      const bottomCushionText = troughDiff > 100
        ? `Even though shifting defensive cushioned the bottom by +${formatCurrency(troughDiff)}, continuing`
        : `Continuing`;
      explanation.textContent = `${bottomCushionText} to dump contributions into discounted equities paid off massively during the recovery. Trying to time re-entry caused cash drag and missed the explosive initial rebound off the bottom.`;
    }
  } else {
    // Defensive Shift Wins
    banner.className = "verdict-banner timing-won";
    if (icon) icon.textContent = "🛡️";
    if (tag) tag.textContent = "DEFENSIVE SHIFT WINS";
    if (headline) headline.textContent = `Defensive Rebalancing Wins by +${formatCurrency(Math.abs(netDiff))} Net Equity`;
    if (explanation) {
      const bottomText = troughDiff > 100
        ? `In this severe concentration unwind, Treasuries and Equal-Weight Value preserved massive capital (+${formatCurrency(troughDiff)} at the bottom) that overwhelmed the dollar-cost averaging benefits of staying in cap-weighted S&P 500.`
        : `In this scenario, Treasuries and Equal-Weight Value limited equity concentration drag, allowing defensive rebalancing to beat staying in cap-weighted S&P 500 by +${formatCurrency(Math.abs(netDiff))} net wealth.`;
      explanation.textContent = bottomText;
    }
  }
}

// ===================================================================
// TRAJECTORY CHART (DUAL CANVAS LINE)
// ===================================================================

function renderTrajectoryChart() {
  const canvas = document.getElementById("stress-trajectory-canvas");
  if (!canvas || simulationResults.baselineTrajectory.length === 0) return;

  canvas.style.width = "100%";
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const chart = createChartContext(canvas, rect.width, rect.height);
  const ctx = chart.ctx;

  const padding = { top: 25, right: 35, bottom: 45, left: 80 };
  const chartWidth = chart.width - padding.left - padding.right;
  const chartHeight = chart.height - padding.top - padding.bottom;

  const basePoints = simulationResults.baselineTrajectory;
  const defPoints = simulationResults.defensiveTrajectory;
  const totalMonths = basePoints.length - 1;

  const allVals = [...basePoints.map((p) => p.val), ...defPoints.map((p) => p.val)];
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;
  const valSpan = Math.max(1, maxVal - minVal);

  const toX = (m) => padding.left + (m / totalMonths) * chartWidth;
  const toY = (val) => padding.top + chartHeight - ((val - minVal) / valSpan) * chartHeight;

  // Offscreen pre-render
  const offCanvas = document.createElement("canvas");
  offCanvas.width = chart.width;
  offCanvas.height = chart.height;
  const offCtx = offCanvas.getContext("2d");

  // Grid lines
  offCtx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  offCtx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = minVal + (valSpan / yTicks) * i;
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

  // X-axis Month / Year Ticks
  const xStep = totalMonths > 120 ? 24 : (totalMonths > 60 ? 12 : (totalMonths > 24 ? 6 : (totalMonths > 12 ? 3 : 1)));
  for (let m = 0; m <= totalMonths; m += xStep) {
    const x = toX(m);
    offCtx.beginPath();
    offCtx.moveTo(x, padding.top);
    offCtx.lineTo(x, padding.top + chartHeight);
    offCtx.stroke();

    offCtx.fillStyle = "#94a3b8";
    offCtx.font = window.CHART_FONTS.sm;
    offCtx.textAlign = "center";
    const label = totalMonths >= 36 ? `Yr ${(m / 12).toFixed(0)}` : `Mo ${m}`;
    offCtx.fillText(label, x, padding.top + chartHeight + 20);
  }

  // Trough marker line (Market Bottom) - Only for Bear Crashes
  const troughM = simulationResults.troughMonth;
  if (activeScenario.regime === "bear" && troughM > 0 && troughM < totalMonths) {
    const xTrough = toX(troughM);
    offCtx.strokeStyle = "rgba(244, 63, 94, 0.5)";
    offCtx.lineWidth = 1.5;
    offCtx.setLineDash([4, 4]);
    offCtx.beginPath();
    offCtx.moveTo(xTrough, padding.top);
    offCtx.lineTo(xTrough, padding.top + chartHeight);
    offCtx.stroke();
    offCtx.setLineDash([]);

    offCtx.fillStyle = "#fb7185";
    offCtx.font = window.CHART_FONTS.sm;
    offCtx.textAlign = "center";
    offCtx.fillText("Market Trough", xTrough, padding.top + 12);
  }

  // Line 1: Stay the Course 60/40 (Teal)
  offCtx.strokeStyle = "#2dd4bf";
  offCtx.lineWidth = 3;
  offCtx.beginPath();
  basePoints.forEach((p, idx) => {
    const x = toX(p.m);
    const y = toY(p.val);
    if (idx === 0) offCtx.moveTo(x, y);
    else offCtx.lineTo(x, y);
  });
  offCtx.stroke();

  // Line 2: Defensive Mix (Purple)
  offCtx.strokeStyle = "#a855f7";
  offCtx.lineWidth = 3;
  offCtx.beginPath();
  defPoints.forEach((p, idx) => {
    const x = toX(p.m);
    const y = toY(p.val);
    if (idx === 0) offCtx.moveTo(x, y);
    else offCtx.lineTo(x, y);
  });
  offCtx.stroke();

  // Interactive Hover
  function drawInteractive(hoverM) {
    ctx.clearRect(0, 0, chart.width, chart.height);
    ctx.drawImage(offCanvas, 0, 0);

    if (hoverM !== null && hoverM >= 0 && hoverM <= totalMonths) {
      const pBase = basePoints[hoverM];
      const pDef = defPoints[hoverM];
      const x = toX(hoverM);
      const yBase = toY(pBase.val);
      const yDef = toY(pDef.val);

      // Vertical cursor line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dots
      ctx.beginPath();
      ctx.arc(x, yBase, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#2dd4bf";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, yDef, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#a855f7";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      const lines = [
        `Month ${hoverM} of Scenario`,
        `🟢 Stay Course (60/40): ${formatCurrency(pBase.val)} (${(pBase.dd * 100).toFixed(1)}% DD)`,
        `🟣 Defensive Shift: ${formatCurrency(pDef.val)} (${(pDef.dd * 100).toFixed(1)}% DD)`,
        `Net Lead: ${pBase.val >= pDef.val ? "+" : "-"}${formatCurrency(Math.abs(pBase.val - pDef.val))}`,
      ];

      drawTooltip(ctx, lines, x, Math.min(yBase, yDef), {
        top: padding.top,
        right: chart.width - padding.right,
        height: chartHeight,
        width: chartWidth,
      });
    }
  }

  drawInteractive(null);

  if (canvas._stressController) canvas._stressController.abort();
  canvas._stressController = new AbortController();
  const { signal } = canvas._stressController;

  canvas.addEventListener("mousemove", rafThrottle((e) => {
    const r = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - r.left) * (chart.width / r.width);
    if (mouseX >= padding.left && mouseX <= padding.left + chartWidth) {
      const approxM = Math.round(((mouseX - padding.left) / chartWidth) * totalMonths);
      const safeM = Math.max(0, Math.min(totalMonths, approxM));
      canvas.style.cursor = "crosshair";
      drawInteractive(safeM);
    } else {
      canvas.style.cursor = "default";
      drawInteractive(null);
    }
  }), { signal });

  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
    drawInteractive(null);
  }, { signal });
}

// ===================================================================
// BREAKDOWN TABLE
// ===================================================================

function renderBreakdownTable() {
  const tbody = document.getElementById("stress-breakdown-body");
  const badge = document.getElementById("stress-table-badge");
  if (!tbody) return;

  const rows = simulationResults.monthlyTableRows;
  if (badge) badge.textContent = `${rows.length} Months`;

  tbody.innerHTML = rows.map((r) => {
    const advantage = r.baseVal >= r.defVal
      ? `<span class="tag-advantage-dca">60/40 +${formatCurrency(r.baseVal - r.defVal)}</span>`
      : `<span class="tag-advantage-defensive">Defensive +${formatCurrency(r.defVal - r.baseVal)}</span>`;

    const spColor = r.spPct >= 0 ? "style=\"color:#2dd4bf;\"" : "style=\"color:#fb7185;\"";
    const rspColor = r.rspPct >= 0 ? "style=\"color:#2dd4bf;\"" : "style=\"color:#fb7185;\"";
    const bondColor = r.bondPct >= 0 ? "style=\"color:#2dd4bf;\"" : "style=\"color:#fb7185;\"";

    return `
      <tr ${r.isTrough ? "style=\"background: rgba(244, 63, 94, 0.12); font-weight: 600;\"" : ""}>
        <td style="text-align: center; color: #f1f5f9;">Mo ${r.m}</td>
        <td style="text-align: left; color: #cbd5e1;">${r.isTrough ? "🚨 " : ""}${r.phase}</td>
        <td ${spColor}>${r.spPct >= 0 ? "+" : ""}${r.spPct.toFixed(1)}%</td>
        <td ${rspColor}>${r.rspPct >= 0 ? "+" : ""}${r.rspPct.toFixed(1)}%</td>
        <td ${bondColor}>${r.bondPct >= 0 ? "+" : ""}${r.bondPct.toFixed(1)}%</td>
        <td style="color: #38bdf8;">+${r.cashPct.toFixed(2)}%</td>
        <td style="color: #2dd4bf; font-weight: 600;">${formatCurrency(r.baseVal)}</td>
        <td style="color: #c084fc; font-weight: 600;">${formatCurrency(r.defVal)}</td>
        <td>${advantage}</td>
      </tr>
    `;
  }).join("");
}

// ===================================================================
// INITIALIZATION & EVENT HANDLERS
// ===================================================================

function updateScenarioDropdown() {
  if (!selectScenario) return;
  const filtered = SCENARIOS.filter((s) => s.regime === currentRegime);
  selectScenario.innerHTML = filtered.map((s) => `
    <option value="${s.id}" ${s.id === activeScenario.id ? "selected" : ""}>
      ${s.name}
    </option>
  `).join("");

  // Sync Horizon Slider
  if (sliderHorizon && valHorizonDisplay) {
    sliderHorizon.value = activeScenario.durationMonths;
    valHorizonDisplay.textContent = `${activeScenario.durationMonths} Mos (${(activeScenario.durationMonths / 12).toFixed(1)} Yrs)`;
  }

  // Show/Hide custom builder drawer
  if (customBuilderDrawer) {
    customBuilderDrawer.style.display = activeScenario.id === "custom-macro" ? "block" : "none";
  }

  updateScenarioDetailsCard();

  const labelReentry = document.getElementById("label-reentry-timing");
  const subtextReentry = document.getElementById("reentry-subtext");
  if (selectReentryTiming && subtextReentry) {
    if (currentRegime === "bull" || currentRegime === "stagflation") {
      selectReentryTiming.disabled = true;
      selectReentryTiming.style.opacity = "0.55";
      selectReentryTiming.style.cursor = "not-allowed";
      if (labelReentry) {
        labelReentry.textContent = currentRegime === "bull"
          ? "Re-Entry Timing (Bull Expansion Mode)"
          : "Re-Entry Timing (Secular Era Mode)";
      }
      subtextReentry.textContent = currentRegime === "bull"
        ? "In a continuous bull expansion, your custom spread is maintained for the full cycle to model bull drag and equity opportunity cost."
        : "In a multi-year secular stagflation or lost decade, your custom spread is maintained throughout to model purchasing power and asset resilience.";
    } else {
      selectReentryTiming.disabled = false;
      selectReentryTiming.style.opacity = "1";
      selectReentryTiming.style.cursor = "default";
      if (labelReentry) labelReentry.textContent = "Re-Entry Timing (Rotating Back to Equities)";
      subtextReentry.textContent = "Most market-timers miss the violent initial +15% to +25% rebound off market bottoms.";
    }
  }
}

function updateScenarioDetailsCard() {
  const elTitle = document.getElementById("scenario-desc-title");
  const elText = document.getElementById("scenario-desc-text");
  const elDur = document.getElementById("scenario-stat-duration");
  const elSp = document.getElementById("scenario-stat-sp");
  const elBond = document.getElementById("scenario-stat-bond");
  const chartTitle = document.getElementById("trajectory-chart-title");

  const horizonMonths = sliderHorizon ? parseInt(sliderHorizon.value, 10) : activeScenario.durationMonths;

  if (elTitle) elTitle.textContent = activeScenario.descTitle;
  if (elText) elText.textContent = activeScenario.descText;
  if (elDur) elDur.textContent = `${horizonMonths} Months (${(horizonMonths / 12).toFixed(1)} Yrs)`;
  if (elSp) {
    elSp.textContent = activeScenario.spShockTotal;
    elSp.className = activeScenario.spShockTotal.startsWith("-") ? "red" : "green";
  }
  if (elBond) {
    elBond.textContent = activeScenario.bondRallyTotal;
    elBond.className = activeScenario.bondRallyTotal.startsWith("-") ? "red" : "green";
  }
  if (chartTitle) {
    chartTitle.textContent = `Portfolio Trajectory: ${activeScenario.name}`;
  }
}

function updateAllocSlidersDisplay() {
  const sp = safeParseFloat(sliderSp500?.value, 25);
  const rsp = safeParseFloat(sliderRsp?.value, 25);
  const tr = safeParseFloat(sliderTreasury?.value, 30);
  const cash = safeParseFloat(sliderCash?.value, 20);
  const total = sp + rsp + tr + cash;

  if (valSp500) valSp500.textContent = `${sp}%`;
  if (valRsp) valRsp.textContent = `${rsp}%`;
  if (valTreasury) valTreasury.textContent = `${tr}%`;
  if (valCash) valCash.textContent = `${cash}%`;

  if (allocSumText) allocSumText.textContent = `${total}%`;
  if (allocSumPill) {
    if (total === 100) {
      allocSumPill.className = "alloc-sum-pill";
    } else {
      allocSumPill.className = "alloc-sum-pill warning";
      allocSumText.textContent = `${total}% (Auto-normalizing to 100%)`;
    }
  }
}

function initEventHandlers() {
  // Regime Toggles (Bear / Bull / Stagflation)
  if (btnRegimeBear) {
    btnRegimeBear.addEventListener("click", () => {
      if (currentRegime === "bear") return;
      currentRegime = "bear";
      btnRegimeBear.classList.add("active");
      btnRegimeBull?.classList.remove("active");
      btnRegimeStagflation?.classList.remove("active");
      const bearScenarios = SCENARIOS.filter((s) => s.regime === "bear");
      activeScenario = bearScenarios[0];
      updateScenarioDropdown();
      runStressSimulation();
    });
  }

  if (btnRegimeBull) {
    btnRegimeBull.addEventListener("click", () => {
      if (currentRegime === "bull") return;
      currentRegime = "bull";
      btnRegimeBull.classList.add("active");
      btnRegimeBear?.classList.remove("active");
      btnRegimeStagflation?.classList.remove("active");
      const bullScenarios = SCENARIOS.filter((s) => s.regime === "bull");
      activeScenario = bullScenarios[0];
      updateScenarioDropdown();
      runStressSimulation();
    });
  }

  if (btnRegimeStagflation) {
    btnRegimeStagflation.addEventListener("click", () => {
      if (currentRegime === "stagflation") return;
      currentRegime = "stagflation";
      btnRegimeStagflation.classList.add("active");
      btnRegimeBear?.classList.remove("active");
      btnRegimeBull?.classList.remove("active");
      const stagScenarios = SCENARIOS.filter((s) => s.regime === "stagflation");
      activeScenario = stagScenarios[0];
      updateScenarioDropdown();
      runStressSimulation();
    });
  }

  if (selectScenario) {
    selectScenario.addEventListener("change", (e) => {
      const match = SCENARIOS.find((s) => s.id === e.target.value);
      if (match) {
        activeScenario = match;
        if (sliderHorizon) {
          sliderHorizon.value = match.durationMonths;
          if (valHorizonDisplay) {
            valHorizonDisplay.textContent = `${match.durationMonths} Mos (${(match.durationMonths / 12).toFixed(1)} Yrs)`;
          }
        }
        if (customBuilderDrawer) {
          customBuilderDrawer.style.display = match.id === "custom-macro" ? "block" : "none";
        }
        updateScenarioDetailsCard();
        runStressSimulation();
      }
    });
  }

  // Horizon / Time Period Slider
  if (sliderHorizon) {
    sliderHorizon.addEventListener("input", (e) => {
      const months = parseInt(e.target.value, 10);
      if (valHorizonDisplay) {
        valHorizonDisplay.textContent = `${months} Mos (${(months / 12).toFixed(1)} Yrs)`;
      }
      updateScenarioDetailsCard();
      runStressSimulation();
    });
  }

  // Custom Macro Inputs
  ["custom-sp-return", "custom-rsp-return", "custom-bond-return", "custom-cash-yield", "custom-inflation-rate"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        if (activeScenario.id === "custom-macro") {
          runStressSimulation();
        }
      });
    }
  });

  // Inputs & Sliders
  const inputsToListen = [
    inputStartPortfolio, inputMonthlyDca, inputEmployerMatch, selectDcaBehavior,
    sliderSp500, sliderRsp, sliderTreasury, sliderCash, selectReentryTiming
  ];

  inputsToListen.forEach((el) => {
    if (el) {
      el.addEventListener("input", () => {
        updateAllocSlidersDisplay();
        runStressSimulation();
      });
      el.addEventListener("change", () => {
        updateAllocSlidersDisplay();
        runStressSimulation();
      });
    }
  });

  window.addEventListener("resize", rafThrottle(() => {
    renderTrajectoryChart();
  }));
}

// Initial Run
initEventHandlers();
updateScenarioDropdown();
updateAllocSlidersDisplay();
runStressSimulation();

