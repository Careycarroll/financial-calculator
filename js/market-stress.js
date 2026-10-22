/**
 * Market Stress & Portfolio Timing Simulator
 * Analyzes mega-cap concentration risk, Treasury flight-to-safety,
 * empirical market history (1928-present), and tests whether an active
 * defensive shift beats staying the course (60/40 + Continuous DCA).
 */

import {
  safeParseFloat, safeParseInt, formatCurrency,
  createChartContext, rafThrottle, drawTooltip
} from "./chart-utils.js";

import {
  HISTORICAL_PRESETS,
  HISTORICAL_MARKET_DATA
} from "./market-history-data.js";

// ===================================================================
// HISTORICAL & FORWARD SCENARIO DATA
// ===================================================================

const SCENARIOS = [
  // --- 1. EMPIRICAL HISTORICAL ERAS (1928–PRESENT) ---
  {
    id: "hist-stagflation-1966",
    name: "1966–1982: 16-Yr Secular Stagflation (The Bengen Crisis)",
    regime: "historical",
    start: "1966-01",
    end: "1982-08",
    descTitle: "16-Year Equity Churn + 207% Cumulative Inflation",
    descText: "The empirical crisis that created the 4% Rule. The S&P 500 generated zero real capital appreciation for 16 years while inflation tripled consumer prices. Cash T-Bills (+7.0%/yr) and dividend-paying value (+6.6%/yr) outperformed long bonds (+3.7%/yr).",
    spShockTotal: "-63.4% (Real)",
    bondRallyTotal: "-40.1% (Real)",
  },
  {
    id: "hist-oil-shock-1973",
    name: "1973–1982: 10-Yr Oil Shock & Volcker Rate Peak",
    regime: "historical",
    start: "1973-01",
    end: "1982-12",
    descTitle: "Dual Oil Embargoes + Fed Funds Peak at 20%",
    descText: "Empirical record: 1973-74 Nifty-Fifty crash (-48%), mid-70s rebound, 1979 second oil shock (14.8% inflation), and Volcker's 20% interest rate hikes. S&P 500 CAGR was +6.1% nominal (-22% real); T-Bills compounded at +8.5% nominal.",
    spShockTotal: "-22.1% (Real)",
    bondRallyTotal: "-24.5% (Real)",
  },
  {
    id: "hist-lost-decade-2000",
    name: "2000–2012: 12-Yr Tech Bust & GFC 'Lost Decade'",
    regime: "historical",
    start: "2000-01",
    end: "2012-12",
    descTitle: "Two -50% Mega-Crashes in 10 Years",
    descText: "The empirical S&P 500 compounded at only +1.7%/yr over 12 full years. Equal-weight RSP (+4.7%/yr) and 10-Yr Treasuries (+6.7%/yr) massively outperformed cap-weighted tech.",
    spShockTotal: "+24.4% (1.7%/yr)",
    bondRallyTotal: "+132.3% (6.7%/yr)",
  },
  {
    id: "hist-great-depression-1929",
    name: "1929–1939: The Great Crash & 1930s Depression",
    regime: "historical",
    start: "1929-09",
    end: "1939-12",
    descTitle: "The -80%+ Stock Collapse & Bank Runs",
    descText: "The largest market crash in American history. Equities lost over 80% to the 1932 trough. Continuous DCA buying at 80% discounts allowed portfolios to break even years before nominal prices recovered.",
    spShockTotal: "-80.7% (Trough)",
    bondRallyTotal: "+42.5%",
  },
  {
    id: "hist-gfc-2007",
    name: "2007–2010: Lehman Collapse & Global Financial Crisis",
    regime: "historical",
    start: "2007-10",
    end: "2010-12",
    descTitle: "Subprime Contagion & Flight to Safety",
    descText: "S&P 500 crashed -50%+ to March 2009. 10-Year Treasuries surged +17.2% in 2008 as the global financial system froze. Rapid recovery followed zero-interest-rate policy.",
    spShockTotal: "-50.9% (Trough)",
    bondRallyTotal: "+21.4%",
  },
  {
    id: "hist-rate-shock-2022",
    name: "2022–2024: Modern Rate Shock & AI Super-Rally",
    regime: "historical",
    start: "2022-01",
    end: "2024-12",
    descTitle: "Simultaneous 60/40 Stock/Bond Crash → AI Boom",
    descText: "In 2022, S&P fell -18% and Treasuries crashed -17% in the worst 60/40 year since 1931. In 2023–2024, mega-cap tech surged +50%+, widening the gap over equal-weight value.",
    spShockTotal: "+29.7% (Full Era)",
    bondRallyTotal: "-11.1%",
  },
  {
    id: "hist-epic-bull-1982",
    name: "1982–2000: The 18-Yr Secular Mega-Bull",
    regime: "historical",
    start: "1982-08",
    end: "2000-03",
    descTitle: "The Greatest Golden Era in Modern History",
    descText: "Interest rates fell from 15% to 6% as inflation collapsed. S&P 500 delivered an astounding +18.5% annualized CAGR, proving the unmatched compounding power of staying the course.",
    spShockTotal: "+1,420%",
    bondRallyTotal: "+340%",
  },
  {
    id: "hist-full-century-1928",
    name: "1928–2026: Full 98-Year Modern Financial History",
    regime: "historical",
    start: "1928-01",
    end: "2026-08",
    descTitle: "1,184 Continuous Months of Market History",
    descText: "Spans the Great Depression, WWII, 1970s stagflation, 1980s-90s mega-bull, 2000 dot-com bust, 2008 GFC, and the 2020s AI revolution.",
    spShockTotal: "+10.2%/yr",
    bondRallyTotal: "+4.9%/yr",
  },
  {
    id: "hist-custom-range",
    name: "📅 Custom Date Range (Pick Start & End Below)",
    regime: "historical",
    start: "1973-01",
    end: "1982-12",
    descTitle: "User-Defined Historical Empirical Window",
    descText: "Choose any start and end month/year between 1928 and 2026 to evaluate real empirical returns, drawdowns, and DCA compounding.",
    spShockTotal: "Custom",
    bondRallyTotal: "Custom",
  },

  // --- 2. STAGFLATION & SECULAR "LOST DECADES" ---
  {
    id: "secular-1966-1982",
    name: "1966–1982: 16-Year Secular Stagflation (The Bengen Crisis) (192 Mo)",
    regime: "stagflation",
    start: "1966-01",
    end: "1982-08",
    durationMonths: 192,
    troughMonth: 106,
    descTitle: "Worst Retirement Crisis in US History (CPI +207%)",
    descText: "The benchmark era that broke static withdrawal rules. The S&P was ~100 in 1966 and ~100 in 1982. Capital appreciation was 0.0% while cumulative inflation erased 65% of dollar purchasing power. Floating T-Bills (+7.0%/yr) and dividend-paying value protected capital.",
    spShockTotal: "-63.4% (Real)",
    bondRallyTotal: "-40.1% (Real)",
  },
  {
    id: "stagflation-1973-decade",
    name: "1973–1982: 10-Year Great Stagflation & Volcker Era (120 Mo)",
    regime: "stagflation",
    start: "1973-01",
    end: "1982-12",
    durationMonths: 120,
    troughMonth: 24,
    descTitle: "Double-Digit Inflation (14.8%) + Dual Oil Shocks",
    descText: "The S&P 500 had two separate 40%+ crashes and returned only +6.1%/yr nominal (-22% real). Bond yields spiked to 15%, hurting long Treasuries (+5.7%/yr). Rolling T-Bills (+8.5%/yr) and Equal-Weight Value (+8.5%/yr) were the premier hedges.",
    spShockTotal: "-22.1% (Real)",
    bondRallyTotal: "-24.5% (Real)",
  },
  {
    id: "lost-decade-2000-2012",
    name: "2000–2012: 12-Year Post-Bubble 'Lost Decade' (144 Mo)",
    regime: "stagflation",
    start: "2000-01",
    end: "2012-12",
    durationMonths: 144,
    troughMonth: 111,
    descTitle: "Two Mega-Crashes (Dot-Com + GFC) in 10 Years",
    descText: "Cap-weighted S&P 500 compounded at just +1.7%/yr over 12 full years. Equal-weight value (RSP) outperformed (+4.7%/yr). Intermediate Treasuries rallied (+6.7%/yr) as the Fed slashed rates from 6.5% to zero.",
    spShockTotal: "+24.4%",
    bondRallyTotal: "+132.3%",
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

  // --- 3. BEAR REGIMES & CRASHES ---
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

  // --- 4. BULL REGIMES & EXPANSIONS ---
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
];

// Helper: Custom Macro Builder Generator
function generateCustomMacroSeries(totalMonths) {
  const spAnnual = safeParseFloat(document.getElementById("custom-sp-return")?.value, 4.0) / 100;
  const rspAnnual = safeParseFloat(document.getElementById("custom-rsp-return")?.value, 10.0) / 100;
  const bondAnnual = safeParseFloat(document.getElementById("custom-bond-return")?.value, 2.5) / 100;
  const cashAnnual = safeParseFloat(document.getElementById("custom-cash-yield")?.value, 8.0) / 100;
  const infAnnual = safeParseFloat(document.getElementById("custom-inflation-rate")?.value, 7.5) / 100;

  const spMonthly = Math.pow(1 + spAnnual, 1 / 12) - 1;
  const rspMonthly = Math.pow(1 + rspAnnual, 1 / 12) - 1;
  const bondMonthly = Math.pow(1 + bondAnnual, 1 / 12) - 1;
  const cashMonthly = Math.pow(1 + cashAnnual, 1 / 12) - 1;
  const infMonthly = Math.pow(1 + infAnnual, 1 / 12) - 1;

  const series = [];
  for (let m = 1; m <= totalMonths; m++) {
    const cycle = Math.sin((m / 24) * Math.PI) * 0.015;
    series.push({
      m,
      phase: `Mo ${m}: Custom Cycle (CPI ${(infMonthly * 100).toFixed(1)}%)`,
      sp: spMonthly + cycle,
      rsp: rspMonthly + cycle * 0.7,
      bond: bondMonthly - cycle * 0.3,
      cash: cashMonthly,
      cpi: infMonthly,
      isTrough: m === Math.floor(totalMonths / 2),
    });
  }
  return series;
}

// Helper: Synthetic Bear Series Generator
function generateRegimeSeries(targetSp, targetRsp, targetBond, cashYield, totalMonths, troughMonth) {
  const series = [];
  const downMonths = Math.max(1, troughMonth);
  const upMonths = Math.max(1, totalMonths - troughMonth);

  const spDownPerMonth = Math.pow(1 + targetSp, 1 / downMonths) - 1;
  const rspDownPerMonth = Math.pow(1 + targetRsp, 1 / downMonths) - 1;
  const bondDownPerMonth = Math.pow(1 + targetBond, 1 / downMonths) - 1;

  const reboundMult = 1.25;
  const spUpPerMonth = upMonths > 0 ? (Math.abs(targetSp) * reboundMult) / upMonths : 0.01;
  const rspUpPerMonth = upMonths > 0 ? (Math.abs(targetRsp) * reboundMult) / upMonths : 0.01;
  const bondUpPerMonth = 0.002;
  const cashPerMonth = cashYield / 12;

  for (let m = 1; m <= totalMonths; m++) {
    const isDown = m <= troughMonth;
    const isTrough = m === troughMonth;
    const noise = (Math.sin(m * 1.5) * 0.005);

    series.push({
      m,
      phase: isTrough ? "Crash Trough (Bottom)" : (isDown ? "Contraction Wave" : "Recovery Wave"),
      sp: (isDown ? spDownPerMonth : spUpPerMonth) + noise,
      rsp: (isDown ? rspDownPerMonth : rspUpPerMonth) + noise * 0.8,
      bond: (isDown ? bondDownPerMonth : bondUpPerMonth) - noise * 0.2,
      cash: cashPerMonth,
      cpi: 0.0025,
      isTrough,
    });
  }
  return series;
}

// Helper: Synthetic Bull Series Generator
function generateBullSeries(targetSp, targetRsp, targetBond, cashYield, totalMonths) {
  const series = [];
  const spPerMonth = Math.pow(1 + targetSp, 1 / totalMonths) - 1;
  const rspPerMonth = Math.pow(1 + targetRsp, 1 / totalMonths) - 1;
  const bondPerMonth = Math.pow(1 + targetBond, 1 / totalMonths) - 1;
  const cashPerMonth = cashYield / 12;

  for (let m = 1; m <= totalMonths; m++) {
    const wave = Math.sin(m * 0.8) * 0.008;
    series.push({
      m,
      phase: "Bull Expansion",
      sp: spPerMonth + wave,
      rsp: rspPerMonth + wave * 0.7,
      bond: bondPerMonth - wave * 0.3,
      cash: cashPerMonth,
      cpi: 0.002,
      isTrough: false,
    });
  }
  return series;
}

// ===================================================================
// STATE MANAGEMENT & DOM REFERENCES
// ===================================================================

let currentRegime = "historical";
let activeScenario = SCENARIOS[0]; // hist-stagflation-1966

let simulationResults = {
  baselineTrajectory: [],
  defensiveTrajectory: [],
  statsBaseline: {},
  statsDefensive: {},
  monthlyTableRows: [],
};

// DOM Elements: Inputs
const inputStartPortfolio = document.getElementById("stress-start-portfolio");
const inputMonthlyDca = document.getElementById("stress-monthly-dca");
const inputEmployerMatch = document.getElementById("stress-employer-match");
const selectDcaBehavior = document.getElementById("stress-dca-behavior");

// DOM Elements: Regimes & Scenarios
const btnRegimeHistorical = document.getElementById("btn-regime-historical");
const btnRegimeStagflation = document.getElementById("btn-regime-stagflation");
const btnRegimeBear = document.getElementById("btn-regime-bear");
const btnRegimeBull = document.getElementById("btn-regime-bull");
const selectScenario = document.getElementById("stress-scenario-select");

// Historical Range Drawer Elements
const historicalRangeDrawer = document.getElementById("historical-range-drawer");
const histStartMonth = document.getElementById("hist-start-month");
const histStartYear = document.getElementById("hist-start-year");
const histEndMonth = document.getElementById("hist-end-month");
const histEndYear = document.getElementById("hist-end-year");
const histDurationBadge = document.getElementById("hist-duration-badge");
const histStatSp = document.getElementById("hist-stat-sp");
const histStatCpi = document.getElementById("hist-stat-cpi");
const histStatBond = document.getElementById("hist-stat-bond");
const histStatCash = document.getElementById("hist-stat-cash");

// Custom Horizon & Custom Macro Drawer
const groupHorizonControl = document.getElementById("group-horizon-control");
const sliderHorizon = document.getElementById("slider-horizon-months");
const valHorizonDisplay = document.getElementById("val-horizon-display");
const customBuilderDrawer = document.getElementById("custom-builder-drawer");

// Sliders: Asset Allocation
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
// HISTORICAL DATA UTILITIES
// ===================================================================

function populateDateDropdowns() {
  const months = [
    { v: "01", label: "01 - Jan" },
    { v: "02", label: "02 - Feb" },
    { v: "03", label: "03 - Mar" },
    { v: "04", label: "04 - Apr" },
    { v: "05", label: "05 - May" },
    { v: "06", label: "06 - Jun" },
    { v: "07", label: "07 - Jul" },
    { v: "08", label: "08 - Aug" },
    { v: "09", label: "09 - Sep" },
    { v: "10", label: "10 - Oct" },
    { v: "11", label: "11 - Nov" },
    { v: "12", label: "12 - Dec" },
  ];

  const years = [];
  for (let y = 1928; y <= 2026; y++) years.push(y);

  if (histStartMonth) {
    histStartMonth.innerHTML = months.map((m) => `<option value="${m.v}">${m.label}</option>`).join("");
    histStartMonth.value = "01";
  }
  if (histStartYear) {
    histStartYear.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
    histStartYear.value = "1966";
  }
  if (histEndMonth) {
    histEndMonth.innerHTML = months.map((m) => `<option value="${m.v}">${m.label}</option>`).join("");
    histEndMonth.value = "08";
  }
  if (histEndYear) {
    histEndYear.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
    histEndYear.value = "1982";
  }
}

function getHistoricalSlice(startDt, endDt) {
  let startIndex = HISTORICAL_MARKET_DATA.findIndex((r) => r.d >= startDt);
  if (startIndex === -1) startIndex = 0;

  let endIndex = -1;
  for (let i = HISTORICAL_MARKET_DATA.length - 1; i >= 0; i--) {
    if (HISTORICAL_MARKET_DATA[i].d <= endDt) {
      endIndex = i;
      break;
    }
  }
  if (endIndex < startIndex) endIndex = startIndex;
  return HISTORICAL_MARKET_DATA.slice(startIndex, endIndex + 1);
}

function updateHistoricalMacroStats(slice) {
  const n = slice.length;
  const yrs = Math.max(0.0833, n / 12);

  if (histDurationBadge) {
    histDurationBadge.textContent = `${n} Mos (${yrs.toFixed(1)} Yrs)`;
  }
  if (n === 0) return;

  let spCum = 1, rspCum = 1, bondCum = 1, cashCum = 1, cpiCum = 1;
  for (const r of slice) {
    spCum *= (1 + r.sp);
    rspCum *= (1 + r.rsp);
    bondCum *= (1 + r.bond);
    cashCum *= (1 + r.cash);
    cpiCum *= (1 + r.cpi);
  }

  const spCagr = (Math.pow(Math.max(0.001, spCum), 1 / yrs) - 1) * 100;
  const cpiCagr = (Math.pow(Math.max(0.001, cpiCum), 1 / yrs) - 1) * 100;
  const bondCagr = (Math.pow(Math.max(0.001, bondCum), 1 / yrs) - 1) * 100;
  const cashCagr = (Math.pow(Math.max(0.001, cashCum), 1 / yrs) - 1) * 100;

  if (histStatSp) {
    histStatSp.textContent = `${spCagr >= 0 ? "+" : ""}${spCagr.toFixed(1)}%/yr`;
    histStatSp.className = `hist-macro-val ${spCagr >= 0 ? "green" : "red"}`;
  }
  if (histStatCpi) {
    histStatCpi.textContent = `+${cpiCagr.toFixed(1)}%/yr`;
  }
  if (histStatBond) {
    histStatBond.textContent = `${bondCagr >= 0 ? "+" : ""}${bondCagr.toFixed(1)}%/yr`;
    histStatBond.className = `hist-macro-val ${bondCagr >= 0 ? "green" : "red"}`;
  }
  if (histStatCash) {
    histStatCash.textContent = `+${cashCagr.toFixed(1)}%/yr`;
  }
}

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
  const isHistorical = scenario.regime === "historical" || !!scenario.start;

  let monthlySeries = [];
  let troughMonth = 1;

  if (isHistorical) {
    let startDt = `${histStartYear?.value || "1966"}-${histStartMonth?.value || "01"}`;
    let endDt = `${histEndYear?.value || "1982"}-${histEndMonth?.value || "08"}`;

    if (startDt > endDt) {
      endDt = startDt;
      if (histEndYear) histEndYear.value = histStartYear.value;
      if (histEndMonth) histEndMonth.value = histStartMonth.value;
    }

    const slice = getHistoricalSlice(startDt, endDt);
    updateHistoricalMacroStats(slice);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let lowestSpCum = 1.0;
    let cumSp = 1.0;

    monthlySeries = slice.map((r, idx) => {
      cumSp *= (1 + r.sp);
      if (cumSp < lowestSpCum) {
        lowestSpCum = cumSp;
        troughMonth = idx + 1;
      }
      const [yr, mo] = r.d.split("-");
      const monStr = monthNames[parseInt(mo, 10) - 1] || mo;
      const phaseStr = `${monStr} ${yr} (CPI ${r.cpi >= 0 ? "+" : ""}${(r.cpi * 100).toFixed(1)}%)`;

      return {
        m: idx + 1,
        d: r.d,
        phase: phaseStr,
        sp: r.sp,
        rsp: r.rsp,
        bond: r.bond,
        cash: r.cash,
        cpi: r.cpi,
        isTrough: false,
      };
    });

    if (monthlySeries[troughMonth - 1]) {
      monthlySeries[troughMonth - 1].isTrough = true;
    }
  } else if (scenario.id === "custom-macro") {
    const customHorizon = sliderHorizon ? parseInt(sliderHorizon.value, 10) : 60;
    monthlySeries = generateCustomMacroSeries(customHorizon);
    troughMonth = scenario.troughMonth || 1;
  } else if (scenario.generator) {
    const customHorizon = sliderHorizon ? parseInt(sliderHorizon.value, 10) : scenario.durationMonths;
    monthlySeries = scenario.generator(customHorizon);
    troughMonth = scenario.troughMonth || 1;
  } else {
    const customHorizon = sliderHorizon ? parseInt(sliderHorizon.value, 10) : scenario.durationMonths;
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
    troughMonth = scenario.troughMonth || 1;
  }

  // Calculate Re-entry Timing Month
  let rotationMonth = Infinity;
  if (scenario.regime === "bull" || scenario.regime === "stagflation" || scenario.regime === "historical") {
    // In multi-year secular regimes, preserve the custom allocation throughout
    rotationMonth = Infinity;
  } else {
    if (reentryMode === "perfect") rotationMonth = troughMonth;
    else if (reentryMode === "late-6mo") rotationMonth = Math.min(monthlySeries.length, troughMonth + 6);
    else if (reentryMode === "late-12mo") rotationMonth = Math.min(monthlySeries.length, troughMonth + 12);
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

  let cpiCumulative = 1.0;

  const baselineTrajectory = [{ m: 0, d: monthlySeries[0]?.d || "Start", val: startPortfolio, dd: 0, cpiCum: 1.0 }];
  const defensiveTrajectory = [{ m: 0, d: monthlySeries[0]?.d || "Start", val: startPortfolio, dd: 0, cpiCum: 1.0 }];
  const monthlyTableRows = [];

  for (let idx = 0; idx < monthlySeries.length; idx++) {
    const row = monthlySeries[idx];
    const m = row.m;
    const cpiMonth = row.cpi || 0.002;
    cpiCumulative *= (1 + cpiMonth);

    // Pure 100% S&P 500 comparison
    balPureSp = (balPureSp * (1 + row.sp)) + totalMonthlyDca;

    // 1. Baseline Strategy: Static 60/40 (60% S&P 500, 40% 10-Yr Treasuries)
    const returnBaseline = (0.60 * row.sp) + (0.40 * row.bond);
    balBaseline = (balBaseline * (1 + returnBaseline)) + totalMonthlyDca;

    if (balBaseline > peakBaseline) peakBaseline = balBaseline;
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
      returnDefensive = (0.60 * row.sp) + (0.40 * row.bond);
    } else {
      returnDefensive = (wSp * row.sp) + (wRsp * row.rsp) + (wTreasury * row.bond) + (wCash * row.cash);
    }

    let defContribution = totalMonthlyDca;
    if (dcaBehavior === "pause-cash" && m < rotationMonth) {
      defContribution = totalMonthlyDca * (1 + row.cash);
    }
    balDefensive = (balDefensive * (1 + returnDefensive)) + defContribution;

    if (balDefensive > peakDefensive) peakDefensive = balDefensive;
    const currentDdDef = (balDefensive - peakDefensive) / peakDefensive;
    if (currentDdDef < maxDdDefensive) maxDdDefensive = currentDdDef;
    if (balDefensive < troughValDefensive) troughValDefensive = balDefensive;

    if (recoveredMonthDefensive === null && idx >= troughMonth && balDefensive >= startPortfolio) {
      recoveredMonthDefensive = m;
    }

    baselineTrajectory.push({ m, d: row.d || `Mo ${m}`, val: balBaseline, dd: currentDdBase, cpiCum: cpiCumulative });
    defensiveTrajectory.push({ m, d: row.d || `Mo ${m}`, val: balDefensive, dd: currentDdDef, cpiCum: cpiCumulative });

    monthlyTableRows.push({
      m,
      d: row.d,
      phase: row.phase,
      spPct: row.sp * 100,
      rspPct: row.rsp * 100,
      bondPct: row.bond * 100,
      cashPct: row.cash * 100,
      cpiPct: (row.cpi || 0) * 100,
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
    cpiCumulative,
    statsBaseline: {
      maxDrawdown: maxDdBaseline,
      troughValue: troughValBaseline,
      recoveryMonths: recoveredMonthBaseline ? `${recoveredMonthBaseline} Mos` : `${monthlySeries.length}+ Mos`,
      terminalValue: balBaseline,
      terminalRealValue: balBaseline / cpiCumulative,
    },
    statsDefensive: {
      maxDrawdown: maxDdDefensive,
      troughValue: troughValDefensive,
      recoveryMonths: recoveredMonthDefensive ? `${recoveredMonthDefensive} Mos` : `${monthlySeries.length}+ Mos`,
      terminalValue: balDefensive,
      terminalRealValue: balDefensive / cpiCumulative,
    },
    statsPureSp: {
      terminalValue: balPureSp,
      terminalRealValue: balPureSp / cpiCumulative,
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
  const { statsBaseline, statsDefensive, cpiCumulative } = simulationResults;

  // 1. Max Drawdown
  const kpiDdBaseline = document.getElementById("kpi-dd-baseline");
  const kpiDdDefensive = document.getElementById("kpi-dd-defensive");
  const kpiDdSub = document.getElementById("kpi-dd-sub");

  if (kpiDdBaseline) kpiDdBaseline.textContent = `${(statsBaseline.maxDrawdown * 100).toFixed(1)}%`;
  if (kpiDdDefensive) kpiDdDefensive.textContent = `${(statsDefensive.maxDrawdown * 100).toFixed(1)}%`;
  if (kpiDdSub) {
    const diff = (statsBaseline.maxDrawdown - statsDefensive.maxDrawdown) * 100;
    if (diff > 0.1) {
      kpiDdSub.textContent = `Defensive hedge cushioned drawdown by +${diff.toFixed(1)}%`;
    } else if (diff < -0.1) {
      kpiDdSub.textContent = `Static 60/40 held lower drawdown by +${Math.abs(diff).toFixed(1)}%`;
    } else {
      kpiDdSub.textContent = "Drawdown identical between portfolios";
    }
  }

  // 2. Trough Portfolio Value
  const kpiTroughBaseline = document.getElementById("kpi-trough-baseline");
  const kpiTroughDefensive = document.getElementById("kpi-trough-defensive");
  const kpiTroughSub = document.getElementById("kpi-trough-sub");

  if (kpiTroughBaseline) kpiTroughBaseline.textContent = formatCurrency(statsBaseline.troughValue);
  if (kpiTroughDefensive) kpiTroughDefensive.textContent = formatCurrency(statsDefensive.troughValue);
  if (kpiTroughSub) {
    const diffVal = statsDefensive.troughValue - statsBaseline.troughValue;
    if (diffVal > 0) {
      kpiTroughSub.textContent = `Hedge preserved +${formatCurrency(diffVal)} more bottom equity`;
    } else {
      kpiTroughSub.textContent = `60/40 held +${formatCurrency(Math.abs(diffVal))} more at trough`;
    }
  }

  // 3. Recovery Time
  const kpiRecoveryBaseline = document.getElementById("kpi-recovery-baseline");
  const kpiRecoveryDefensive = document.getElementById("kpi-recovery-defensive");
  const kpiRecoverySub = document.getElementById("kpi-recovery-sub");

  if (kpiRecoveryBaseline) kpiRecoveryBaseline.textContent = statsBaseline.recoveryMonths;
  if (kpiRecoveryDefensive) kpiRecoveryDefensive.textContent = statsDefensive.recoveryMonths;
  if (kpiRecoverySub) {
    kpiRecoverySub.textContent = `Empirical cycle duration: ${simulationResults.monthlyTableRows.length} Months`;
  }

  // 4. Terminal Wealth & Real Purchasing Power
  const kpiTerminalBaseline = document.getElementById("kpi-terminal-baseline");
  const kpiTerminalDefensive = document.getElementById("kpi-terminal-defensive");
  const kpiTerminalSub = document.getElementById("kpi-terminal-sub");

  if (kpiTerminalBaseline) kpiTerminalBaseline.textContent = formatCurrency(statsBaseline.terminalValue);
  if (kpiTerminalDefensive) kpiTerminalDefensive.textContent = formatCurrency(statsDefensive.terminalValue);

  if (kpiTerminalSub) {
    const net = statsBaseline.terminalValue - statsDefensive.terminalValue;
    const cpiPct = ((cpiCumulative - 1) * 100).toFixed(1);
    if (net > 0) {
      kpiTerminalSub.textContent = `Stay the Course 60/40 leads by +${formatCurrency(net)} (Inflation: +${cpiPct}%)`;
    } else {
      kpiTerminalSub.textContent = `Defensive Rebalance leads by +${formatCurrency(Math.abs(net))} (Inflation: +${cpiPct}%)`;
    }
  }
}

function updateVerdictBanner() {
  const { statsBaseline, statsDefensive, cpiCumulative } = simulationResults;
  const banner = document.getElementById("verdict-banner");
  const icon = document.getElementById("verdict-icon");
  const tag = document.getElementById("verdict-tag");
  const headline = document.getElementById("verdict-headline");
  const explanation = document.getElementById("verdict-explanation");

  if (!banner) return;

  const netDiff = statsBaseline.terminalValue - statsDefensive.terminalValue;
  const troughDiff = statsDefensive.troughValue - statsBaseline.troughValue;
  const cpiPct = ((cpiCumulative - 1) * 100).toFixed(1);

  if (netDiff >= 0) {
    // 60/40 Wins
    banner.className = "verdict-banner dca-won";
    if (icon) icon.textContent = "🎯";
    if (tag) tag.textContent = "STAY THE COURSE WINS";
    if (headline) headline.textContent = `Continuous 60/40 DCA Wins by +${formatCurrency(netDiff)} Terminal Wealth`;
    if (explanation) {
      const bottomCushionText = troughDiff > 100
        ? `Even though shifting defensive cushioned the bottom by +${formatCurrency(troughDiff)}, continuing`
        : `Continuing`;
      explanation.textContent = `${bottomCushionText} to dump contributions into discounted equities paid off massively during the recovery. Cumulative inflation was +${cpiPct}%, and staying fully invested preserved real compounding power.`;
    }
  } else {
    // Defensive Shift Wins
    banner.className = "verdict-banner timing-won";
    if (icon) icon.textContent = "🛡️";
    if (tag) tag.textContent = "DEFENSIVE SHIFT WINS";
    if (headline) headline.textContent = `Defensive Rebalancing Wins by +${formatCurrency(Math.abs(netDiff))} Net Wealth`;
    if (explanation) {
      explanation.textContent = `In this secular regime, high cash T-Bill yields and Equal-Weight Value preserved massive capital (+${formatCurrency(Math.abs(netDiff))} lead) that beat static 60/40 while cumulative inflation rose +${cpiPct}%.`;
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

  // Horizontal Grid Lines & Y Ticks
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

  // X-axis Month / Calendar Year Ticks
  const xStep = totalMonths > 360 ? 60 : (totalMonths > 180 ? 24 : (totalMonths > 60 ? 12 : (totalMonths > 24 ? 6 : (totalMonths > 12 ? 3 : 1))));
  for (let m = 0; m <= totalMonths; m += xStep) {
    const x = toX(m);
    offCtx.beginPath();
    offCtx.moveTo(x, padding.top);
    offCtx.lineTo(x, padding.top + chartHeight);
    offCtx.stroke();

    offCtx.fillStyle = "#94a3b8";
    offCtx.font = window.CHART_FONTS.sm;
    offCtx.textAlign = "center";

    let label;
    if (basePoints[m]?.d && basePoints[m].d.includes("-")) {
      const yr = basePoints[m].d.split("-")[0];
      label = yr;
    } else {
      label = totalMonths >= 36 ? `Yr ${(m / 12).toFixed(0)}` : `Mo ${m}`;
    }
    offCtx.fillText(label, x, padding.top + chartHeight + 20);
  }

  // Draw Path 1: Baseline 60/40 (Teal)
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

  // Draw Path 2: Custom Defensive (Purple)
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

      const dateStr = pBase.d && pBase.d.includes("-") ? `📅 ${pBase.d} • ` : "";
      const cpiStr = pBase.cpiCum ? ` (CPI +${((pBase.cpiCum - 1) * 100).toFixed(1)}%)` : "";

      const lines = [
        `${dateStr}Month ${hoverM} of ${totalMonths}${cpiStr}`,
        `🟢 Stay Course (60/40): ${formatCurrency(pBase.val)} (${(pBase.dd * 100).toFixed(1)}% DD)`,
        `🟣 Defensive Shift: ${formatCurrency(pDef.val)} (${(pDef.dd * 100).toFixed(1)}% DD)`,
        `Net Lead: ${pBase.val >= pDef.val ? "60/40 +" : "Defensive +"}${formatCurrency(Math.abs(pBase.val - pDef.val))}`,
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

function syncHistoricalControlsWithScenario(scenario) {
  if (!scenario.start || !scenario.end) return;
  const [sYear, sMonth] = scenario.start.split("-");
  const [eYear, eMonth] = scenario.end.split("-");

  if (histStartYear) histStartYear.value = sYear;
  if (histStartMonth) histStartMonth.value = sMonth;
  if (histEndYear) histEndYear.value = eYear;
  if (histEndMonth) histEndMonth.value = eMonth;
}

function updateScenarioDropdown() {
  if (!selectScenario) return;
  const filtered = SCENARIOS.filter((s) => s.regime === currentRegime);
  selectScenario.innerHTML = filtered.map((s) => `
    <option value="${s.id}" ${s.id === activeScenario.id ? "selected" : ""}>
      ${s.name}
    </option>
  `).join("");

  const isHist = currentRegime === "historical";
  if (historicalRangeDrawer) {
    historicalRangeDrawer.style.display = isHist ? "block" : "none";
  }
  if (groupHorizonControl) {
    groupHorizonControl.style.display = isHist ? "none" : "block";
  }

  if (isHist) {
    syncHistoricalControlsWithScenario(activeScenario);
  } else {
    if (sliderHorizon && valHorizonDisplay) {
      sliderHorizon.value = activeScenario.durationMonths || 24;
      valHorizonDisplay.textContent = `${sliderHorizon.value} Mos (${(parseInt(sliderHorizon.value, 10) / 12).toFixed(1)} Yrs)`;
    }
  }

  if (customBuilderDrawer) {
    customBuilderDrawer.style.display = activeScenario.id === "custom-macro" ? "block" : "none";
  }

  updateScenarioDetailsCard();

  const labelReentry = document.getElementById("label-reentry-timing");
  const subtextReentry = document.getElementById("reentry-subtext");
  if (selectReentryTiming && subtextReentry) {
    if (currentRegime === "bull" || currentRegime === "stagflation" || currentRegime === "historical") {
      selectReentryTiming.disabled = true;
      selectReentryTiming.style.opacity = "0.55";
      selectReentryTiming.style.cursor = "not-allowed";
      if (labelReentry) {
        labelReentry.textContent = currentRegime === "historical"
          ? "Re-Entry Timing (Empirical Full Era)"
          : (currentRegime === "bull" ? "Re-Entry Timing (Bull Expansion Mode)" : "Re-Entry Timing (Secular Era Mode)");
      }
      subtextReentry.textContent = "In multi-year secular regimes and empirical history, your defensive allocation is maintained to test real compounding and inflation resistance.";
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

  if (elTitle) elTitle.textContent = activeScenario.descTitle;
  if (elText) elText.textContent = activeScenario.descText;

  if (currentRegime === "historical") {
    const sYr = histStartYear?.value || "1966";
    const eYr = histEndYear?.value || "1982";
    if (elDur) elDur.textContent = `${sYr} to ${eYr}`;
  } else {
    const horizonMonths = sliderHorizon ? parseInt(sliderHorizon.value, 10) : activeScenario.durationMonths;
    if (elDur) elDur.textContent = `${horizonMonths} Months (${(horizonMonths / 12).toFixed(1)} Yrs)`;
  }

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
  // Regime Switch Buttons
  const regimes = [
    { btn: btnRegimeHistorical, id: "historical" },
    { btn: btnRegimeStagflation, id: "stagflation" },
    { btn: btnRegimeBear, id: "bear" },
    { btn: btnRegimeBull, id: "bull" },
  ];

  regimes.forEach(({ btn, id }) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (currentRegime === id) return;
      currentRegime = id;
      regimes.forEach((r) => r.btn?.classList.toggle("active", r.id === id));
      const filtered = SCENARIOS.filter((s) => s.regime === id);
      activeScenario = filtered[0];
      updateScenarioDropdown();
      runStressSimulation();
    });
  });

  // Scenario Dropdown Change
  if (selectScenario) {
    selectScenario.addEventListener("change", (e) => {
      const match = SCENARIOS.find((s) => s.id === e.target.value);
      if (match) {
        activeScenario = match;
        if (currentRegime === "historical") {
          syncHistoricalControlsWithScenario(match);
        } else {
          if (sliderHorizon) {
            sliderHorizon.value = match.durationMonths || 24;
            if (valHorizonDisplay) {
              valHorizonDisplay.textContent = `${sliderHorizon.value} Mos (${(parseInt(sliderHorizon.value, 10) / 12).toFixed(1)} Yrs)`;
            }
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

  // Date Range Pickers (Start / End Month and Year)
  [histStartMonth, histStartYear, histEndMonth, histEndYear].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      if (currentRegime === "historical") {
        const customEntry = SCENARIOS.find((s) => s.id === "hist-custom-range");
        if (customEntry) {
          activeScenario = customEntry;
          if (selectScenario) selectScenario.value = "hist-custom-range";
        }
        updateScenarioDetailsCard();
        runStressSimulation();
      }
    });
  });

  // Horizon Slider
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

  // Allocation Sliders & DCA Inputs
  const inputsToListen = [
    inputStartPortfolio, inputMonthlyDca, inputEmployerMatch, selectDcaBehavior,
    sliderSp500, sliderRsp, sliderTreasury, sliderCash, selectReentryTiming,
  ];

  inputsToListen.forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => {
      updateAllocSlidersDisplay();
      runStressSimulation();
    });
    el.addEventListener("change", () => {
      updateAllocSlidersDisplay();
      runStressSimulation();
    });
  });

  window.addEventListener("resize", rafThrottle(() => {
    renderTrajectoryChart();
  }));
}

// Initial Setup & Execution
populateDateDropdowns();
initEventHandlers();
updateScenarioDropdown();
updateAllocSlidersDisplay();
runStressSimulation();
