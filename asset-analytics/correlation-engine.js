/**
 * Asset Correlation Engine
 * Computes multi-asset date alignment, pairwise Pearson correlation matrix,
 * covariance matrix, asset volatility/return statistics, and rolling multi-year correlation regimes.
 */

import { computeMonthlyReturns } from './analytics-engine.js';

/**
 * Computes the Pearson correlation coefficient between two numeric series.
 * @param {Array<number>} x
 * @param {Array<number>} y
 * @returns {number} Correlation coefficient between -1.0 and 1.0
 */
export function calculatePearsonCorrelation(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let numer = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numer += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) return 0;

  const denom = Math.sqrt(varX * varY);
  const r = numer / denom;
  return Math.max(-1.0, Math.min(1.0, r));
}

/**
 * Computes sample covariance between two numeric series.
 */
export function calculateCovariance(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let sumProd = 0;
  for (let i = 0; i < n; i++) {
    sumProd += (x[i] - meanX) * (y[i] - meanY);
  }

  return sumProd / (n - 1);
}

/**
 * Aligns monthly return series across multiple funds to the common intersecting date range.
 * @param {Array<object>} funds - Array of fund objects with monthly data [{date, close, adjClose}, ...]
 * @param {boolean} [useDRIP=true]
 * @param {string} [horizon='all'] - 'all' | '10y' | '5y' | '3y' | '1y'
 * @returns {object} { commonDates, fundReturnsMap, minDate, maxDate }
 */
export function alignMultiAssetReturns(funds, useDRIP = true, horizon = 'all') {
  if (!Array.isArray(funds) || funds.length === 0) {
    return { commonDates: [], fundReturnsMap: new Map(), minDate: null, maxDate: null };
  }

  // 1. Compute monthly return series for each fund: Map(ticker -> Map(date -> return))
  const fundReturnDateMaps = funds.map(fund => {
    const rawReturns = computeMonthlyReturns(fund.data, useDRIP);
    const dateMap = new Map();
    rawReturns.forEach(r => dateMap.set(r.date, r.return));
    return {
      ticker: fund.ticker.toUpperCase(),
      dateMap
    };
  });

  // 2. Find intersecting date list across all funds
  let commonDates = null;
  fundReturnDateMaps.forEach(({ dateMap }) => {
    const currentDates = new Set(dateMap.keys());
    if (commonDates === null) {
      commonDates = currentDates;
    } else {
      const intersection = new Set();
      currentDates.forEach(d => {
        if (commonDates.has(d)) intersection.add(d);
      });
      commonDates = intersection;
    }
  });

  let sortedDates = commonDates ? Array.from(commonDates).sort() : [];

  // 3. Apply time horizon filter if specified
  const horizonMonths = {
    '10y': 120,
    '5y': 60,
    '3y': 36,
    '1y': 12
  };

  if (horizon && horizonMonths[horizon] && sortedDates.length > horizonMonths[horizon]) {
    sortedDates = sortedDates.slice(sortedDates.length - horizonMonths[horizon]);
  }

  // 4. Build aligned numeric arrays
  const fundReturnsMap = new Map();
  fundReturnDateMaps.forEach(({ ticker, dateMap }) => {
    const arr = sortedDates.map(d => dateMap.get(d) ?? 0);
    fundReturnsMap.set(ticker, arr);
  });

  return {
    commonDates: sortedDates,
    fundReturnsMap,
    minDate: sortedDates.length > 0 ? sortedDates[0] : null,
    maxDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null
  };
}

/**
 * Computes the full pairwise correlation and covariance matrix across selected funds.
 * @param {Array<object>} funds - Array of fund objects
 * @param {object} [options] - { useDRIP: true, horizon: 'all' }
 * @returns {object} { assets, matrix, covarianceMatrix, commonDates, minDate, maxDate }
 */
export function computeCorrelationMatrix(funds, options = {}) {
  const useDRIP = options.useDRIP !== false;
  const horizon = options.horizon || 'all';

  const { commonDates, fundReturnsMap, minDate, maxDate } = alignMultiAssetReturns(funds, useDRIP, horizon);

  if (commonDates.length < 3) {
    return {
      assets: [],
      matrix: [],
      covarianceMatrix: [],
      commonDates: [],
      minDate: null,
      maxDate: null,
      error: 'Insufficient common historical overlap between the selected assets.'
    };
  }

  const n = funds.length;
  const assets = [];

  // Summary stats per asset
  funds.forEach(fund => {
    const ticker = fund.ticker.toUpperCase();
    const rets = fundReturnsMap.get(ticker) || [];

    // Compounded CAGR over aligned period
    let product = 1;
    rets.forEach(r => { product *= (1 + r); });
    const cagr = rets.length > 0 ? Math.pow(product, 12 / rets.length) - 1 : 0;

    // Standard deviations
    const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
    const variance = rets.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / Math.max(1, rets.length - 1);
    const monthlyVol = Math.sqrt(variance);
    const annualVol = monthlyVol * Math.sqrt(12);

    assets.push({
      ticker,
      name: fund.name || ticker,
      color: fund.color || '#38bdf8',
      cagr,
      monthlyVol,
      annualVol,
      monthsCount: rets.length
    });
  });

  // Pairwise N x N correlation and covariance matrices
  const matrix = Array.from({ length: n }, () => Array(n).fill(1));
  const covarianceMatrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    const tickerI = assets[i].ticker;
    const retsI = fundReturnsMap.get(tickerI);

    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
        covarianceMatrix[i][j] = calculateCovariance(retsI, retsI);
      } else if (j > i) {
        const tickerJ = assets[j].ticker;
        const retsJ = fundReturnsMap.get(tickerJ);

        const corr = calculatePearsonCorrelation(retsI, retsJ);
        const cov = calculateCovariance(retsI, retsJ);

        matrix[i][j] = corr;
        matrix[j][i] = corr;

        covarianceMatrix[i][j] = cov;
        covarianceMatrix[j][i] = cov;
      }
    }
  }

  return {
    assets,
    matrix,
    covarianceMatrix,
    commonDates,
    fundReturnsMap,
    minDate,
    maxDate
  };
}

/**
 * Computes rolling correlation time series between two return series.
 * @param {Array<number>} xReturns - Monthly returns of fund A
 * @param {Array<number>} yReturns - Monthly returns of fund B
 * @param {Array<string>} dates - Array of corresponding date strings 'YYYY-MM'
 * @param {number} [windowMonths=36] - Rolling window size
 * @returns {object} { series: [{date, correlation}], meanCorrelation, minCorrelation, maxCorrelation, currentCorrelation }
 */
export function calculateRollingCorrelation(xReturns, yReturns, dates, windowMonths = 36) {
  if (!xReturns || !yReturns || xReturns.length !== yReturns.length || xReturns.length < windowMonths) {
    return {
      series: [],
      meanCorrelation: 0,
      minCorrelation: 0,
      maxCorrelation: 0,
      currentCorrelation: 0
    };
  }

  const series = [];
  let sumCorr = 0;
  let minCorr = 1.0;
  let maxCorr = -1.0;

  for (let i = windowMonths - 1; i < xReturns.length; i++) {
    const sliceX = xReturns.slice(i - windowMonths + 1, i + 1);
    const sliceY = yReturns.slice(i - windowMonths + 1, i + 1);

    const corr = calculatePearsonCorrelation(sliceX, sliceY);
    const date = dates[i];

    series.push({
      date,
      correlation: corr
    });

    sumCorr += corr;
    if (corr < minCorr) minCorr = corr;
    if (corr > maxCorr) maxCorr = corr;
  }

  const count = series.length;
  const meanCorr = count > 0 ? sumCorr / count : 0;
  const currentCorr = count > 0 ? series[series.length - 1].correlation : 0;

  return {
    series,
    meanCorrelation: meanCorr,
    minCorrelation: count > 0 ? minCorr : 0,
    maxCorrelation: count > 0 ? maxCorr : 0,
    currentCorrelation: currentCorr,
    windowMonths
  };
}

/**
 * Synthesizes a plain-English executive takeaway from correlation matrix results and focus pair rolling stats.
 * @param {Array<{ticker: string, name?: string}>} assets - List of assets in matrix
 * @param {Array<Array<number>>} matrix - Pairwise correlation matrix
 * @param {Object} [focusPairInfo] - { pairA: string, pairB: string, current: number, mean: number, min: number, max: number, windowMonths: number }
 * @returns {string} Plain-English HTML narrative
 */
export function generateCorrelationTakeaway(assets, matrix, focusPairInfo = null) {
  if (!assets || assets.length < 2 || !matrix || matrix.length < 2) {
    return 'Select at least 2 assets to evaluate correlation and diversification benefits.';
  }

  const n = assets.length;
  let maxCorr = -2;
  let minCorr = 2;
  let highestPair = null;
  let lowestPair = null;

  // Track average correlation per asset
  const avgCorrs = assets.map((asset, i) => {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const val = matrix[i][j];
        sum += val;
        if (j > i) {
          if (val > maxCorr) {
            maxCorr = val;
            highestPair = [assets[i].ticker, assets[j].ticker, val];
          }
          if (val < minCorr) {
            minCorr = val;
            lowestPair = [assets[i].ticker, assets[j].ticker, val];
          }
        }
      }
    }
    return { ticker: asset.ticker, avg: sum / (n - 1) };
  });

  avgCorrs.sort((a, b) => a.avg - b.avg);
  const bestDiversifier = avgCorrs[0];

  let takeaway = `In this <strong>${n}-asset basket</strong>, `;

  if (bestDiversifier.avg < 0.3) {
    takeaway += `<strong>${bestDiversifier.ticker}</strong> provides the highest diversification benefit (average correlation: <strong>${bestDiversifier.avg.toFixed(2)}</strong>). `;
  } else {
    takeaway += `<strong>${bestDiversifier.ticker}</strong> exhibits the lowest relative correlation (avg: <strong>${bestDiversifier.avg.toFixed(2)}</strong>). `;
  }

  if (highestPair) {
    const isVeryHigh = highestPair[2] >= 0.85;
    takeaway += `Highest co-movement is between <strong>${highestPair[0]}</strong> and <strong>${highestPair[1]}</strong> (<strong>${highestPair[2].toFixed(2)}</strong>${isVeryHigh ? ' — near-duplicate sector exposure' : ''}). `;
  }

  if (lowestPair && (highestPair[0] !== lowestPair[0] || highestPair[1] !== lowestPair[1])) {
    takeaway += `Strongest counter-balance exists between <strong>${lowestPair[0]}</strong> and <strong>${lowestPair[1]}</strong> (<strong>${lowestPair[2].toFixed(2)}</strong>). `;
  }

  if (focusPairInfo && focusPairInfo.pairA && focusPairInfo.pairB) {
    const currStr = focusPairInfo.current != null ? focusPairInfo.current.toFixed(2) : '—';
    const minStr = focusPairInfo.min != null ? focusPairInfo.min.toFixed(2) : '—';
    const maxStr = focusPairInfo.max != null ? focusPairInfo.max.toFixed(2) : '—';
    takeaway += `Focus pair <strong>${focusPairInfo.pairA} vs ${focusPairInfo.pairB}</strong> currently sits at <strong>${currStr}</strong> (historical ${focusPairInfo.windowMonths || 36}M range: <strong>${minStr}</strong> to <strong>${maxStr}</strong>).`;
  }

  return takeaway;
}
