/**
 * Core DCA Backtesting Engine
 * 
 * Provides:
 * 1. Client-side CSV ingestion and validation (Yahoo Finance, Stooq formats)
 * 2. Ascending chronological sorting and monthly resampling (first trading day of each month)
 * 3. Multi-series date alignment (Calendar intersection & Elapsed Time normalization)
 * 4. Monthly Dollar-Cost Averaging (DCA) simulation with DRIP support
 * 5. Comprehensive return analytics:
 *    - Total Invested vs Ending Portfolio Value
 *    - Total Return (%) and Net Dollar Gain ($)
 *    - Time-Weighted Annualized Return (CAGR)
 *    - Money-Weighted Rate of Return (IRR via Newton-Raphson & Bisection)
 *    - Peak-to-Trough Maximum Drawdown (%)
 */

/**
 * Parses raw CSV string from Yahoo Finance or Stooq.
 * @param {string} text - Raw CSV text
 * @param {string} filename - Source filename for ticker identification
 * @returns {{ ticker: string, rows: Array<{date: string, close: number, adjClose: number}>, warnings: string[] }}
 */
export function parseCSV(text, filename = 'data.csv') {
  if (!text || typeof text !== 'string') {
    throw new Error('CSV text is empty or invalid.');
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error(`File "${filename}" contains no data rows.`);
  }

  // Parse header line
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const normHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));

  const dateIdx = normHeaders.findIndex(h => h === 'date' || h === 'datetime' || h === 'timestamp');
  const adjIdx = normHeaders.findIndex(h => h === 'adjclose' || h === 'adjustedclose' || h === 'adj_close');
  const closeIdx = normHeaders.findIndex(h => h === 'close' || h === 'last');

  if (dateIdx === -1) {
    throw new Error(`Could not find a "Date" column in "${filename}". Found headers: ${rawHeaders.join(', ')}`);
  }

  if (adjIdx === -1 && closeIdx === -1) {
    throw new Error(`Could not find "Adj Close" or "Close" price columns in "${filename}".`);
  }

  const warnings = [];
  if (adjIdx === -1) {
    warnings.push(`"Adj Close" column missing in "${filename}". Using unadjusted "Close" as fallback (dividends will not be reinvested).`);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length <= dateIdx) continue;

    const rawDate = parts[dateIdx];
    const adjClose = adjIdx !== -1 ? parseFloat(parts[adjIdx]) : NaN;
    const rawClose = closeIdx !== -1 ? parseFloat(parts[closeIdx]) : NaN;

    const validAdj = Number.isFinite(adjClose) ? adjClose : rawClose;
    const validClose = Number.isFinite(rawClose) ? rawClose : validAdj;

    if (rawDate && Number.isFinite(validAdj) && validAdj > 0) {
      rows.push({
        date: rawDate,
        close: validClose,
        adjClose: validAdj
      });
    }
  }

  if (rows.length === 0) {
    throw new Error(`No valid numeric price rows could be parsed from "${filename}".`);
  }

  // Deduce ticker symbol from filename (e.g., "VOO.csv" -> "VOO")
  const ticker = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toUpperCase();

  return {
    ticker: ticker || 'CUSTOM',
    rows,
    warnings
  };
}

/**
 * Normalizes daily rows to monthly records using the first trading day of each month.
 * @param {Array<{date: string, close: number, adjClose: number}>} rows
 * @returns {Array<{date: string, firstTradingDate: string, close: number, adjClose: number}>}
 */
export function resampleToMonthly(rows) {
  if (!rows || rows.length === 0) return [];

  // Sort ascending by date string
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const monthMap = new Map();
  for (const r of sorted) {
    let yyyymm = null;
    const match = r.date.match(/^(\d{4})[-/.](\d{1,2})/);
    if (match) {
      const yr = match[1];
      const mo = match[2].padStart(2, '0');
      yyyymm = `${yr}-${mo}`;
    } else {
      // Direct YYYY-MM check
      if (/^\d{4}-\d{2}$/.test(r.date)) {
        yyyymm = r.date;
      }
    }

    if (!yyyymm) continue;

    // Pick first available trading day of each month
    if (!monthMap.has(yyyymm)) {
      monthMap.set(yyyymm, {
        date: yyyymm,
        firstTradingDate: r.date,
        close: r.close,
        adjClose: r.adjClose
      });
    }
  }

  return Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculates the common overlapping date window across multiple fund monthly series.
 * @param {Array<{data: Array<{date: string}>, name?: string, ticker?: string}>} funds
 * @returns {{ start: string, end: string, limitingFund: string|null, totalMonths: number }}
 */
export function findCommonDateRange(funds) {
  if (!funds || funds.length === 0) {
    return { start: null, end: null, limitingFund: null, totalMonths: 0 };
  }

  let maxStart = funds[0].data[0]?.date || '';
  let minEnd = funds[0].data[funds[0].data.length - 1]?.date || '';
  let limitingFund = funds[0].ticker || funds[0].name || 'Fund 1';

  for (let i = 1; i < funds.length; i++) {
    const f = funds[i];
    if (!f.data || f.data.length === 0) continue;
    const fStart = f.data[0].date;
    const fEnd = f.data[f.data.length - 1].date;

    if (fStart > maxStart) {
      maxStart = fStart;
      limitingFund = f.ticker || f.name || `Fund ${i + 1}`;
    }
    if (fEnd < minEnd) {
      minEnd = fEnd;
    }
  }

  // Count months in common range
  let totalMonths = 0;
  if (maxStart && minEnd && maxStart <= minEnd) {
    const refData = funds[0].data.filter(d => d.date >= maxStart && d.date <= minEnd);
    totalMonths = refData.length;
  }

  return {
    start: maxStart,
    end: minEnd,
    limitingFund,
    totalMonths
  };
}

/**
 * Aligns series across all funds for either Calendar Dates or Elapsed Time mode.
 * @param {Array<{id: string, ticker: string, name: string, color: string, data: Array<{date: string, close: number, adjClose: number}>}>} funds
 * @param {Object} options
 * @param {string} [options.mode='calendar'] - 'calendar' | 'elapsed'
 * @param {string} [options.customStart] - Custom start date override YYYY-MM
 * @param {string} [options.customEnd] - Custom end date override YYYY-MM
 * @returns {{ dates: string[], series: Array<{fund: any, data: Array<{date: string, close: number, adjClose: number}>}> }}
 */
export function alignSeries(funds, options = {}) {
  const mode = options.mode || 'calendar';
  if (!funds || funds.length === 0) {
    return { dates: [], series: [] };
  }

  if (mode === 'elapsed') {
    // Elapsed Time Mode: Align by Month 0, Month 1... up to the shortest fund duration
    const minLen = Math.min(...funds.map(f => f.data.length));
    const labels = [];
    for (let i = 0; i < minLen; i++) {
      const yr = Math.floor(i / 12);
      const mo = i % 12;
      labels.push(mo === 0 ? `Yr ${yr}` : `M${i}`);
    }

    const series = funds.map(f => {
      const sliced = f.data.slice(0, minLen).map((d, idx) => ({
        date: labels[idx],
        calendarDate: d.date,
        close: d.close,
        adjClose: d.adjClose
      }));
      return { fund: f, data: sliced };
    });

    return { dates: labels, series };
  }

  // Calendar Mode: Intersect on identical calendar month keys
  const common = findCommonDateRange(funds);
  const start = options.customStart && options.customStart >= common.start ? options.customStart : common.start;
  const end = options.customEnd && options.customEnd <= common.end ? options.customEnd : common.end;

  if (!start || !end || start > end) {
    return { dates: [], series: [] };
  }

  // Create date intersection set
  const dateSets = funds.map(f => new Set(f.data.map(d => d.date)));
  const masterDates = funds[0].data
    .map(d => d.date)
    .filter(d => d >= start && d <= end && dateSets.every(set => set.has(d)));

  const series = funds.map(f => {
    const dataMap = new Map(f.data.map(d => [d.date, d]));
    const alignedData = masterDates.map(date => {
      const row = dataMap.get(date);
      return {
        date,
        close: row.close,
        adjClose: row.adjClose
      };
    });
    return { fund: f, data: alignedData };
  });

  return { dates: masterDates, series };
}

/**
 * Executes recurring Dollar-Cost Averaging simulation for a single fund series.
 * 
 * @param {Array<{date: string, close: number, adjClose: number}>} alignedData
 * @param {Object} config
 * @param {number} config.initialBalance - Starting balance ($)
 * @param {number} config.monthlyDeposit - Monthly deposit amount ($)
 * @param {boolean} [config.useDRIP=true] - Reinvest dividends (true = adjClose, false = close)
 * @returns {{ trajectory: Array<{date: string, totalContributed: number, portfolioValue: number, shares: number, price: number}>, metrics: Object }}
 */
export function simulateDCA(alignedData, config) {
  const initialBalance = Math.max(0, parseFloat(config.initialBalance) || 0);
  const monthlyDeposit = Math.max(0, parseFloat(config.monthlyDeposit) || 0);
  const useDRIP = config.useDRIP !== false;

  if (!alignedData || alignedData.length === 0) {
    return { trajectory: [], metrics: getZeroMetrics() };
  }

  const trajectory = [];
  const cashFlows = []; // For IRR calculation: { tYears: number, amount: number }

  let totalContributed = 0;
  let shares = 0;

  for (let t = 0; t < alignedData.length; t++) {
    const row = alignedData[t];
    const price = useDRIP ? row.adjClose : row.close;

    if (t === 0) {
      // Month 0: buy initial shares
      totalContributed = initialBalance;
      if (initialBalance > 0 && price > 0) {
        shares = initialBalance / price;
        cashFlows.push({ tYears: 0, amount: -initialBalance });
      }
    } else {
      // Month t: add recurring monthly contribution
      totalContributed += monthlyDeposit;
      if (monthlyDeposit > 0 && price > 0) {
        shares += monthlyDeposit / price;
        cashFlows.push({ tYears: t / 12, amount: -monthlyDeposit });
      }
    }

    const portfolioValue = shares * price;
    trajectory.push({
      date: row.date,
      totalContributed: round2(totalContributed),
      portfolioValue: round2(portfolioValue),
      shares: round4(shares),
      price: round2(price)
    });
  }

  const finalValue = trajectory[trajectory.length - 1].portfolioValue;
  // Terminal cash flow for IRR
  cashFlows.push({ tYears: (alignedData.length - 1) / 12, amount: finalValue });

  const metrics = calculateMetrics(trajectory, cashFlows, initialBalance, monthlyDeposit);

  return { trajectory, metrics };
}

/**
 * Solves for Internal Rate of Return (IRR) using Newton-Raphson with Bisection fallback.
 * @param {Array<{tYears: number, amount: number}>} cashFlows
 * @returns {number} Annualized rate (decimal, e.g. 0.105 for 10.5%)
 */
export function solveIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return 0;

  // Verify non-zero flows
  const hasNegative = cashFlows.some(cf => cf.amount < 0);
  const hasPositive = cashFlows.some(cf => cf.amount > 0);
  if (!hasNegative || !hasPositive) return 0;

  // Newton-Raphson method
  let r = 0.08; // initial guess 8%
  for (let iter = 0; iter < 100; iter++) {
    let f = 0;
    let df = 0;
    for (const cf of cashFlows) {
      if (cf.amount === 0) continue;
      const discount = Math.pow(1 + r, -cf.tYears);
      f += cf.amount * discount;
      df += -cf.tYears * cf.amount * discount / (1 + r);
    }

    if (Math.abs(f) < 1e-6) return r;
    if (Math.abs(df) < 1e-12) break;

    const nextR = r - f / df;
    if (nextR <= -0.99) {
      r = (r - 0.99) / 2;
    } else if (nextR > 10.0) {
      r = 5.0;
    } else {
      r = nextR;
    }
  }

  // Robust Bisection search fallback
  let low = -0.95;
  let high = 5.0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    let f = 0;
    for (const cf of cashFlows) {
      f += cf.amount * Math.pow(1 + mid, -cf.tYears);
    }
    if (Math.abs(f) < 1e-5) return mid;

    let fLow = 0;
    for (const cf of cashFlows) {
      fLow += cf.amount * Math.pow(1 + low, -cf.tYears);
    }

    if ((fLow > 0 && f > 0) || (fLow < 0 && f < 0)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculates financial performance metrics from a completed DCA trajectory.
 */
function calculateMetrics(trajectory, cashFlows, initialBalance, monthlyDeposit) {
  if (!trajectory || trajectory.length === 0) return getZeroMetrics();

  const totalMonths = trajectory.length;
  const totalYears = totalMonths > 1 ? (totalMonths - 1) / 12 : 0;
  const startPrice = trajectory[0].price;
  const endPrice = trajectory[trajectory.length - 1].price;
  const finalBalance = trajectory[trajectory.length - 1].portfolioValue;
  const totalInvested = trajectory[trajectory.length - 1].totalContributed;
  const netProfit = finalBalance - totalInvested;

  // Total Return (%)
  const totalReturnPct = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  // Time-Weighted Buy-and-Hold CAGR of the underlying asset
  let cagrPct = 0;
  if (totalYears > 0 && startPrice > 0 && endPrice > 0) {
    cagrPct = (Math.pow(endPrice / startPrice, 1 / totalYears) - 1) * 100;
  }

  // Money-Weighted Rate of Return (IRR)
  const irrDecimal = solveIRR(cashFlows);
  const irrPct = irrDecimal * 100;

  // Peak-to-Trough Maximum Drawdown (%)
  let peakValue = 0;
  let maxDrawdown = 0;
  for (const step of trajectory) {
    if (step.portfolioValue > peakValue) {
      peakValue = step.portfolioValue;
    } else if (peakValue > 0) {
      const dd = ((step.portfolioValue - peakValue) / peakValue) * 100;
      if (dd < maxDrawdown) {
        maxDrawdown = dd;
      }
    }
  }

  return {
    totalMonths,
    totalYears: round2(totalYears),
    totalInvested: round2(totalInvested),
    finalBalance: round2(finalBalance),
    netProfit: round2(netProfit),
    totalReturnPct: round2(totalReturnPct),
    cagrPct: round2(cagrPct),
    irrPct: round2(irrPct),
    maxDrawdownPct: round2(maxDrawdown),
    finalShares: trajectory[trajectory.length - 1].shares
  };
}

function getZeroMetrics() {
  return {
    totalMonths: 0,
    totalYears: 0,
    totalInvested: 0,
    finalBalance: 0,
    netProfit: 0,
    totalReturnPct: 0,
    cagrPct: 0,
    irrPct: 0,
    maxDrawdownPct: 0,
    finalShares: 0
  };
}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function round4(num) {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

export default {
  parseCSV,
  resampleToMonthly,
  findCommonDateRange,
  alignSeries,
  simulateDCA,
  solveIRR
};
