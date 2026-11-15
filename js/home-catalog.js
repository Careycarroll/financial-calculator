// ===================================================================
// HOME TOOLS CATALOG
// Structured registry of all tools, suites, and workflow intents.
// Powers the homepage search, suite tiles, and workflow views.
// ===================================================================

export const BADGE_DEFINITIONS = {
  STUDIO: {
    name: "Studio Workspace",
    icon: "💼",
    desc: "Deep multi-tab analytical suite with interactive charts, multi-asset portfolio modeling, or stochastic simulation runs."
  },
  ENGINE: {
    name: "Algorithmic Engine",
    icon: "🛡️",
    desc: "Deterministic rule solver with complex financial policies, tax-aware logic, or dynamic guardrails."
  },
  SIMULATOR: {
    name: "Stress Simulator",
    icon: "⚡",
    desc: "Macro scenario testing environment for market shocks, crisis depth, and historical timing shifts."
  },
  LAB: {
    name: "Strategy Lab",
    icon: "🎯",
    desc: "Quantitative sandbox for exploring mathematical formulas, derivative payoffs, and theoretical models."
  },
  DASHBOARD: {
    name: "Planning Dashboard",
    icon: "🔥",
    desc: "High-level personal finance dashboard for milestone tracking, targets, and progressive metrics."
  },
  CALCULATOR: {
    name: "Financial Calculator",
    icon: "🏦",
    desc: "Rapid single-purpose mathematical solver for amortization, present value, compounding, or cash flows."
  },
  VALUATOR: {
    name: "Valuation Suite",
    icon: "🔍",
    desc: "Multi-method fundamental equity research combining DCF, Graham Number, and market multiples."
  },
  ANALYZER: {
    name: "Financial Statement Analyzer",
    icon: "📑",
    desc: "Automated SEC EDGAR 10-K filings parser with health scoring, DuPont ratios, and red flag audits."
  },
  TOOL: {
    name: "Managerial Tool",
    icon: "📊",
    desc: "Interactive corporate analysis for breakeven, operating leverage, and cost allocation structures."
  },
  ECON: {
    name: "Economics Model",
    icon: "📉",
    desc: "Interactive microeconomic solver for linear supply/demand equilibrium, elasticity, and utility theory."
  },
  NEWS: {
    name: "Curated Feed",
    icon: "📰",
    desc: "Live stream of curated financial news, macro developments, and market headlines."
  }
};

export const SUITES_CONFIG = [
  {
    id: "monte-carlo",
    title: "Monte Carlo Simulation Suite",
    icon: "🎲",
    desc: "Project long-term portfolio growth, sequence-of-returns stress testing, multi-stage retirement glide paths, and funded liability obligations across 10,000 randomized market paths."
  },
  {
    id: "portfolio",
    title: "Portfolio Construction & Backtesting",
    icon: "💼",
    desc: "Construct multi-asset allocation models, simulate monthly dollar-cost averaging with dividend reinvestment, test calendar rebalancing, and perform deep fund performance analytics."
  },
  {
    id: "quant",
    title: "Quantitative, Factors & Derivatives",
    icon: "📈",
    desc: "Run econometric factor regressions (CAPM, Dual-Beta), discover true Jensen's alpha, stress-test mega-cap market shocks, and model option Greeks."
  },
  {
    id: "retirement",
    title: "Retirement & Decumulation Planning",
    icon: "🛡️",
    desc: "Deterministic and tax-aware withdrawal engines with dynamic Guyton-Klinger guardrails, SECURE 2.0 RMD sweeps, FIRE targets, and long-range milestone projections."
  },
  {
    id: "valuation",
    title: "Valuation & Corporate Analysis",
    icon: "🔍",
    desc: "Multi-method fundamental DCF valuations, automated SEC 10-K filing health scoring, operational contribution margins, and fixed vs variable cost structures."
  },
  {
    id: "math-economics",
    title: "Core Financial Math & Economics",
    icon: "🏦",
    desc: "Institutional calculators for loan amortization schedules, accelerated debt payoff strategies, discounted cash flows (NPV/IRR), and interactive microeconomics."
  }
];

export const WORKFLOWS_CONFIG = [
  {
    id: "plan-retirement",
    title: "Plan Retirement & Long-Term Goals",
    icon: "🎯",
    desc: "Simulate portfolio survival, optimize retirement withdrawals, model career glide paths, and track FIRE targets."
  },
  {
    id: "build-portfolio",
    title: "Construct, Rebalance & Backtest Portfolios",
    icon: "💼",
    desc: "Allocate capital across asset classes, test recurring dollar-cost averaging, and simulate periodic rebalancing."
  },
  {
    id: "quant-risk",
    title: "Analyze Factors, Volatility & Options",
    icon: "📈",
    desc: "Decompose risk factors with regressions, calculate Jensen's alpha, stress-test crashes, and price options."
  },
  {
    id: "research-equities",
    title: "Research Equities & Corporate Economics",
    icon: "🔍",
    desc: "Perform DCF valuation, inspect SEC 10-K filings, analyze operational leverage, and solve market equilibrium."
  },
  {
    id: "loans-cashflow",
    title: "Borrowing, Debt Payoff & Cash Flow Math",
    icon: "🏦",
    desc: "Calculate amortization schedules, compare debt payoff strategies, evaluate NPV/IRR, and discount cash flows."
  }
];

export const TOOLS_CATALOG = [
  // --- Monte Carlo Suite ---
  {
    id: "monte-carlo",
    title: "Monte Carlo Simulation Studio",
    shortTitle: "Monte Carlo Simulation",
    path: "monte-carlo/index.html",
    icon: "🎲",
    badge: "STUDIO",
    desc: "Project long-term expected portfolio growth, sequence-of-returns stress testing, crash recovery depth, and retirement survival curves across 10,000 randomized market paths.",
    suiteId: "monte-carlo",
    workflowId: "plan-retirement",
    keywords: ["monte carlo", "simulation", "stochastic", "survival rate", "sequence of returns", "safe withdrawal", "bootstrap", "percentile", "cones", "retirement"]
  },
  {
    id: "financial-goals",
    title: "Financial Goals & Glide Path Studio",
    shortTitle: "Financial Goals & Glide Path",
    path: "monte-carlo/financial-goals.html",
    icon: "🎯",
    badge: "STUDIO",
    desc: "Model multi-stage career-to-retirement linear glide paths with dynamic savings, college tuition withdrawals, and inflation-compounded retirement spending cashflows.",
    suiteId: "monte-carlo",
    workflowId: "plan-retirement",
    keywords: ["glide path", "financial goals", "career", "retirement", "tuition", "cashflow", "savings", "multistage", "transition", "allocation"]
  },
  {
    id: "asset-liability",
    title: "Asset Liability Modeling (ALM)",
    shortTitle: "Asset Liability Modeling",
    path: "monte-carlo/asset-liability.html",
    icon: "⚖️",
    badge: "STUDIO",
    desc: "Stress-test institutional asset allocations against defined benefit obligations, debt maturity schedules, and remaining discounted liabilities with funded ratio cones.",
    suiteId: "monte-carlo",
    workflowId: "quant-risk",
    keywords: ["alm", "asset liability", "funded ratio", "deficit", "discount rate", "pension", "obligation", "liabilities", "cashflow matching"]
  },

  // --- Portfolio Construction & Backtesting ---
  {
    id: "efficient-frontier",
    title: "Efficient Frontier Studio",
    shortTitle: "Efficient Frontier",
    path: "portfolio-optimization/index.html",
    icon: "📈",
    badge: "STUDIO",
    desc: "Calculate and chart Markowitz efficient frontier curves, Capital Allocation Line (CAL), Tangency Portfolio, and asset weight transition maps.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["efficient frontier", "portfolio optimization", "markowitz", "mvo", "tangency", "cal", "gmv", "sharpe", "covariance", "transition map", "asset allocation", "weights"]
  },
  {
    id: "portfolio-optimization",
    title: "Portfolio Optimization Studio",
    shortTitle: "Portfolio Optimization",
    path: "portfolio-optimization/portfolio-optimization.html",
    icon: "⚖️",
    badge: "STUDIO",
    desc: "Optimize portfolio allocations for specific targets: Maximize Sharpe, Minimize Volatility (GMV), Equal Risk Contribution (Risk Parity), or Minimize Tail Risk (CVaR).",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["portfolio optimization", "risk parity", "erc", "cvar", "sortino", "sharpe", "asset allocation", "weights", "minimum variance", "risk contribution", "diversification"]
  },
  {
    id: "black-litterman",
    title: "Black-Litterman Model Studio",
    shortTitle: "Black-Litterman",
    path: "portfolio-optimization/black-litterman.html",
    icon: "🧠",
    badge: "STUDIO",
    desc: "Combine CAPM market equilibrium returns (prior) with subjective investor views to derive optimal Bayesian asset allocations and active tilts.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["black-litterman", "bayesian", "market equilibrium", "prior", "posterior", "views", "active tilt", "tau", "omega", "reverse optimization", "asset allocation"]
  },
  {
    id: "rolling-optimization",
    title: "Rolling Portfolio Optimization Studio",
    shortTitle: "Rolling Optimization",
    path: "portfolio-optimization/rolling-optimization.html",
    icon: "🔄",
    badge: "STUDIO",
    desc: "Evaluate dynamic out-of-sample walk-forward portfolio optimization strategies over rolling lookback windows with drift, turnover, and benchmark tracking.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["rolling optimization", "walk forward", "out of sample", "turnover", "lookback", "drift", "rebalancing", "backtest", "sharpe", "risk parity", "cvar"]
  },
  {
    id: "portfolio-backtest",
    title: "Portfolio Backtest Studio",
    shortTitle: "Portfolio Studio",
    path: "portfolio-backtest/index.html",
    icon: "💼",
    badge: "STUDIO",
    desc: "Construct multi-asset portfolio models, test periodic calendar rebalancing (annual, quarterly, monthly), and compare side-by-side models against market benchmarks.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["portfolio", "backtest", "rebalance", "asset allocation", "60/40", "voo", "bnd", "qqq", "schd", "benchmark", "weights", "cagr", "volatility", "sharpe", "drawdown"]
  },
  {
    id: "asset-class-allocation",
    title: "Backtest Asset Class Allocation Studio",
    shortTitle: "Asset Class Backtest",
    path: "portfolio-backtest/asset-class-allocation.html",
    icon: "🏛️",
    badge: "STUDIO",
    desc: "Backtest multi-asset portfolios over 54+ years (1972–present) across 28 canonical asset classes. Test through 1970s stagflation, 1987 crash, 2008 GFC, and 2022 rate shock.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["asset class", "backtest", "1972", "asset class allocation", "historical returns", "stagflation", "rebalancing", "all-weather", "60/40", "treasury", "commodities", "gold", "reit", "cagr"]
  },
  {
    id: "dynamic-allocation",
    title: "Backtest Dynamic Allocation Studio",
    shortTitle: "Dynamic Allocation",
    path: "portfolio-backtest/dynamic-allocation.html",
    icon: "🔄",
    badge: "STUDIO",
    desc: "Simulate lifecycle glidepaths (target-date retirement models) and tactical trend-following signals (10M SMA & Dual Momentum) to avoid bear markets.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["dynamic allocation", "glidepath", "target date", "lifecycle", "tactical", "trend following", "sma", "moving average", "dual momentum", "crash protection", "rebalance"]
  },
  {
    id: "tactical-allocation",
    title: "Tactical Asset Allocation Studio",
    shortTitle: "Tactical Allocation",
    path: "tactical-allocation/index.html",
    icon: "⚡",
    badge: "STUDIO",
    desc: "Backtest quantitative timing models across 54 years: Dual Momentum (GEM), Moving Averages, Momentum Rotation, Adaptive Asset Allocation, and Volatility Targeting.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["tactical asset allocation", "dual momentum", "gem", "moving average", "sma", "gtaa", "adaptive allocation", "target volatility", "trend following", "market valuation"]
  },
  {
    id: "market-valuation",
    title: "Market Valuation Model",
    shortTitle: "Market Valuation",
    path: "tactical-allocation/market-valuation.html",
    icon: "🏛️",
    badge: "LAB",
    desc: "Counter-cyclical equity tilt based on Shiller CAPE and valuation multiples to buy low and avoid peak bubbles.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["market valuation", "cape", "shiller", "valuation tilt", "pe ratio", "counter cyclical", "equity tilt", "bear defense"]
  },
  {
    id: "moving-averages",
    title: "Moving Averages Model",
    shortTitle: "Moving Averages",
    path: "tactical-allocation/moving-averages.html",
    icon: "📈",
    badge: "LAB",
    desc: "Meb Faber 10-month & 200-day trend-following filters to systematically dodge catastrophic bear market drawdowns.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["moving averages", "sma", "ema", "trend following", "meb faber", "200 day", "10 month", "trend shield", "crash defense"]
  },
  {
    id: "momentum-rotation",
    title: "Momentum Rotation Model",
    shortTitle: "Momentum Rotation",
    path: "tactical-allocation/momentum-rotation.html",
    icon: "🔄",
    badge: "LAB",
    desc: "Cross-sectional relative strength rotation (IVY 5) holding the top performing asset classes with positive absolute trend.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["momentum rotation", "relative strength", "ivy 5", "cross sectional", "sector rotation", "top n", "meb faber", "trend filter"]
  },
  {
    id: "dual-momentum",
    title: "Dual Momentum Model",
    shortTitle: "Dual Momentum",
    path: "tactical-allocation/dual-momentum.html",
    icon: "🚀",
    badge: "LAB",
    desc: "Gary Antonacci GEM combining Relative Momentum (US vs Intl) with Absolute Momentum (Cash hurdle) for maximum Sharpe.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["dual momentum", "gem", "gary antonacci", "relative momentum", "absolute momentum", "cash hurdle", "spy", "veu", "bnd"]
  },
  {
    id: "adaptive-allocation",
    title: "Adaptive Asset Allocation",
    shortTitle: "Adaptive Allocation",
    path: "tactical-allocation/adaptive-allocation.html",
    icon: "⚖️",
    badge: "LAB",
    desc: "ReSolve Asset Management model pairing cross-sectional momentum ranking with Inverse Volatility / Risk Parity weighting.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["adaptive allocation", "resolve", "risk parity", "inverse volatility", "minimum variance", "momentum", "all weather", "tail risk"]
  },
  {
    id: "target-volatility",
    title: "Target Volatility Model",
    shortTitle: "Target Volatility",
    path: "tactical-allocation/target-volatility.html",
    icon: "🎯",
    badge: "LAB",
    desc: "Constant risk budgeting (e.g. 10% target vol) that automatically de-levers into Cash during market shocks.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["target volatility", "volatility targeting", "risk budget", "constant risk", "cash buffer", "deleverage", "tail risk", "crisis shield"]
  },
  {
    id: "dca-comparator",
    title: "Historical Fund DCA Backtester",
    shortTitle: "DCA Backtest",
    path: "dca-comparator/index.html",
    icon: "📊",
    badge: "STUDIO",
    desc: "Compare recurring monthly investments across VOO, SPY, QQQ, SCHD, BND, or your own CSV files with DRIP dividend reinvestment, IRR, and CAGR.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["dca", "dollar cost average", "drip", "dividends", "recurring", "spy", "voo", "qqq", "schd", "bnd", "irr", "cagr", "csv"]
  },
  {
    id: "asset-analytics",
    title: "Asset Analytics Studio",
    shortTitle: "Asset Analytics",
    path: "asset-analytics/index.html",
    icon: "📊",
    badge: "STUDIO",
    desc: "Deep-dive fund performance, cumulative $10k growth, underwater crash recovery, monthly calendar heatmaps, and rolling risk bands.",
    suiteId: "portfolio",
    workflowId: "build-portfolio",
    keywords: ["analytics", "growth of 10k", "underwater", "drawdown", "recovery", "heatmap", "rolling", "volatility", "etf", "returns"]
  },

  // --- Quantitative, Factors & Derivatives ---
  {
    id: "fund-regression",
    title: "Fund Regression & Factor Analysis",
    shortTitle: "Regression Lab",
    path: "fund-regression/index.html",
    icon: "📈",
    badge: "STUDIO",
    desc: "Run CAPM, Dual-Beta, and rolling factor regressions across ETFs and mutual funds. Discover true Jensen's Alpha, market Beta, Sharpe, Sortino, and Up/Down capture ratios.",
    suiteId: "quant",
    workflowId: "quant-risk",
    keywords: ["regression", "capm", "factor", "alpha", "beta", "dual-beta", "up capture", "down capture", "sharpe", "sortino", "jensen", "r-squared", "econometrics"]
  },
  {
    id: "manager-performance",
    title: "Manager Performance Analysis Studio",
    shortTitle: "Manager Performance",
    path: "fund-regression/manager-performance.html",
    icon: "🏆",
    badge: "STUDIO",
    desc: "Evaluate active manager edge against a benchmark: tracking error, Information Ratio, rolling excess return, trailing horizons, and statistical skill confidence.",
    suiteId: "quant",
    workflowId: "quant-risk",
    keywords: ["manager performance", "tracking error", "information ratio", "excess return", "active risk", "relative drawdown", "skill", "t-test", "benchmark", "alpha", "up capture"]
  },
  {
    id: "factor-analysis",
    title: "Factor Analysis Studio",
    shortTitle: "Factor Analysis",
    path: "fund-regression/factor-analysis.html",
    icon: "🔬",
    badge: "STUDIO",
    desc: "Multivariate econometric factor regression using Fama-French 3-Factor, Carhart 4-Factor, FF 5-Factor, and 6-Factor models. Analyze style exposures, 36-month rolling loadings, and return attribution.",
    suiteId: "quant",
    workflowId: "quant-risk",
    keywords: ["factor analysis", "fama french", "carhart", "factor regression", "rolling loadings", "style drift", "smb", "hml", "momentum", "attribution"]
  },
  {
    id: "pca",
    title: "Principal Component Analysis (PCA)",
    shortTitle: "Factor PCA",
    path: "fund-regression/pca.html",
    icon: "🧠",
    badge: "STUDIO",
    desc: "Decompose multi-asset return covariance into orthogonal statistical factors. Analyze Scree plot eigenvalues, variance explained, and asset loadings.",
    suiteId: "quant",
    workflowId: "quant-risk",
    keywords: ["pca", "principal component", "eigenvalue", "eigenvector", "scree plot", "factor loadings", "dimensionality", "orthogonal"]
  },
  {
    id: "factor-matching",
    title: "Match Factor Exposures & Risk Parity",
    shortTitle: "Factor Matching",
    path: "fund-regression/factor-matching.html",
    icon: "🎯",
    badge: "STUDIO",
    desc: "Replicate target factor exposures with low-cost liquid ETFs via quadratic optimization, or solve Equal Risk Contribution across factors.",
    suiteId: "quant",
    workflowId: "quant-risk",
    keywords: ["match factor", "factor matching", "synthetic replication", "risk parity", "erc", "equal risk", "factor allocation", "hedge fund replication"]
  },
  {
    id: "options",
    title: "Options Strategy Lab",
    shortTitle: "Options Lab",
    path: "pages/options.html",
    icon: "🎯",
    badge: "LAB",
    desc: "Visualize payoff diagrams, calculate Black-Scholes pricing, explore the Greeks (Delta, Gamma, Theta, Vega, Rho), and learn 40+ options strategies.",
    suiteId: "quant",
    workflowId: "quant-risk",
    keywords: ["options", "black-scholes", "greeks", "delta", "gamma", "theta", "vega", "call", "put", "spread", "straddle", "iron condor", "payoff"]
  },
  {
    id: "market-stress",
    title: "Market Stress & Timing Simulator",
    shortTitle: "Market Stress",
    path: "pages/market-stress.html",
    icon: "⚡",
    badge: "SIMULATOR",
    desc: "Analyze mega-cap concentration risk and high Treasury yields. Compare staying the course with continuous 401(k) DCA vs an active defensive shift.",
    suiteId: "quant",
    workflowId: "build-portfolio",
    keywords: ["market stress", "timing", "concentration", "crash", "treasury yields", "defensive", "recession", "stagflation", "401k"]
  },

  // --- Retirement & Decumulation Planning ---
  {
    id: "drawdown-engine",
    title: "Retirement Drawdown Engine",
    shortTitle: "Drawdown Engine",
    path: "pages/drawdown-engine.html",
    icon: "🛡️",
    badge: "ENGINE",
    desc: "Deterministic, tax-aware multi-account withdrawal engine with dynamic Guyton-Klinger guardrails, SECURE 2.0 RMD sweeps, and stagflation stress testing.",
    suiteId: "retirement",
    workflowId: "plan-retirement",
    keywords: ["drawdown", "retirement", "guyton-klinger", "guardrails", "rmd", "secure 2.0", "taxes", "roth", "traditional", "401k", "safe withdrawal", "swr"]
  },
  {
    id: "fire",
    title: "FIRE Dashboard",
    shortTitle: "FIRE Dashboard",
    path: "pages/fire.html",
    icon: "🔥",
    badge: "DASHBOARD",
    desc: "Calculate your Financial Independence number, track progress, project lean/fat FIRE milestones, and find your Coast FIRE target.",
    suiteId: "retirement",
    workflowId: "plan-retirement",
    keywords: ["fire", "financial independence", "retire early", "coast fire", "lean fire", "fat fire", "savings rate", "safe withdrawal"]
  },
  {
    id: "projections",
    title: "Investment Projections",
    shortTitle: "Projections",
    path: "pages/projections.html",
    icon: "📈",
    badge: "CALCULATOR",
    desc: "Project portfolio growth across multiple scenarios with S&P 500 benchmarking and milestone tracking.",
    suiteId: "retirement",
    workflowId: "plan-retirement",
    keywords: ["projections", "compound interest", "milestones", "future value", "growth", "benchmarking", "savings"]
  },

  // --- Valuation & Corporate Analysis ---
  {
    id: "valuator",
    title: "Stock Evaluator",
    shortTitle: "Stock Evaluator",
    path: "pages/valuator.html",
    icon: "🔍",
    badge: "VALUATOR",
    desc: "Multi-method fundamental analysis using DCF, Graham Number, liquidation value, market multiples, enterprise value, and more.",
    suiteId: "valuation",
    workflowId: "research-equities",
    keywords: ["stock", "valuation", "dcf", "discounted cash flow", "graham number", "multiples", "pe ratio", "enterprise value", "intrinsic value"]
  },
  {
    id: "analyzer",
    title: "10-K Analyzer",
    shortTitle: "10-K Analyzer",
    path: "pages/analyzer.html",
    icon: "📑",
    badge: "ANALYZER",
    desc: "Pull SEC filings and get consolidated financial summaries with automated health scoring and red flag detection.",
    suiteId: "valuation",
    workflowId: "research-equities",
    keywords: ["10-k", "sec", "edgar", "filings", "financial statements", "health score", "red flags", "balance sheet", "income statement"]
  },
  {
    id: "cm-analysis",
    title: "Contribution Margin Analysis",
    shortTitle: "Contribution Margin",
    path: "pages/cm-analysis.html",
    icon: "📊",
    badge: "TOOL",
    desc: "Analyze contribution margin vs gross profit, breakeven analysis, multi-product mix, capacity constraints, and operating leverage.",
    suiteId: "valuation",
    workflowId: "research-equities",
    keywords: ["contribution margin", "breakeven", "operating leverage", "fixed cost", "variable cost", "product mix", "capacity"]
  },
  {
    id: "cost-structure",
    title: "Cost Structure & Allocation",
    shortTitle: "Cost Structure",
    path: "pages/cost-structure.html",
    icon: "🏗️",
    badge: "TOOL",
    desc: "Compare fixed vs variable cost structures, allocate overhead (death spiral demo), classify costs, and avoid the unit cost trap.",
    suiteId: "valuation",
    workflowId: "research-equities",
    keywords: ["cost structure", "overhead", "allocation", "fixed cost", "variable cost", "death spiral", "unit cost"]
  },

  // --- Core Financial Math & Economics ---
  {
    id: "loan-advanced",
    title: "Advanced Loan Calculator",
    shortTitle: "Advanced Loan",
    path: "pages/loan-advanced.html",
    icon: "🏦",
    badge: "CALCULATOR",
    desc: "Track existing loans, add extra payments, compare payoff strategies (snowball vs avalanche), and calculate total interest savings.",
    suiteId: "math-economics",
    workflowId: "loans-cashflow",
    keywords: ["loan", "advanced loan", "amortization", "extra payments", "snowball", "avalanche", "interest savings", "mortgage", "payoff"]
  },
  {
    id: "loan",
    title: "Standard Loan Calculator",
    shortTitle: "Loan Calculator",
    path: "pages/loan.html",
    icon: "🏦",
    badge: "CALCULATOR",
    desc: "Quick calculator for monthly payments, total interest, and full annual/monthly amortization schedules.",
    suiteId: "math-economics",
    workflowId: "loans-cashflow",
    keywords: ["loan", "mortgage", "interest", "monthly payment", "principal", "amortization"]
  },
  {
    id: "npv-irr",
    title: "NPV & IRR Calculator",
    shortTitle: "NPV & IRR",
    path: "pages/npv-irr.html",
    icon: "📊",
    badge: "CALCULATOR",
    desc: "Analyze investments with net present value, internal rate of return, sensitivity analysis, and side-by-side project comparison.",
    suiteId: "math-economics",
    workflowId: "loans-cashflow",
    keywords: ["npv", "irr", "net present value", "internal rate of return", "cash flow", "discount rate", "hurdle rate", "capital budgeting"]
  },
  {
    id: "pv",
    title: "Present Value (PV) Calculator",
    shortTitle: "PV Calculator",
    path: "pages/pv.html",
    icon: "💰",
    badge: "CALCULATOR",
    desc: "Find the present value of a future lump sum or annuity stream based on compounding frequencies and discount rates.",
    suiteId: "math-economics",
    workflowId: "loans-cashflow",
    keywords: ["pv", "present value", "future value", "discount rate", "compounding", "annuity", "time value of money"]
  },
  {
    id: "micro-econ",
    title: "Supply & Demand",
    shortTitle: "Supply & Demand",
    path: "pages/micro-econ.html",
    icon: "📉",
    badge: "ECON",
    desc: "Define linear supply and demand curves by equation or two points, solve for market equilibrium with step-by-step algebra, and explore curve shifts interactively.",
    suiteId: "math-economics",
    workflowId: "research-equities",
    keywords: ["supply", "demand", "equilibrium", "microeconomics", "price", "quantity", "shifts", "surplus", "shortage"]
  },
  {
    id: "consumer-theory",
    title: "Consumer Theory",
    shortTitle: "Consumer Theory",
    path: "pages/consumer-theory.html",
    icon: "📐",
    badge: "ECON",
    desc: "Price elasticity, cross-price effects, expected utility, and risk premium — interactive tools for economics.",
    suiteId: "math-economics",
    workflowId: "research-equities",
    keywords: ["consumer theory", "elasticity", "cross-price", "utility", "risk premium", "economics", "indifference"]
  },
  {
    id: "news",
    title: "Market News Feed",
    shortTitle: "News Feed",
    path: "pages/news.html",
    icon: "📰",
    badge: "NEWS",
    desc: "Live curated market headlines, macro economic trends, earnings reports, and financial news updates.",
    suiteId: "quant",
    workflowId: "research-equities",
    keywords: ["news", "market", "headlines", "macro", "earnings", "feed", "updates"]
  }
];
