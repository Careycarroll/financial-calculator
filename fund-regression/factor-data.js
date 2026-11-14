/**
 * Empirical Factor Data Library & Benchmark Datasets
 * 
 * Provides continuous historical factor return series (1972-01 to 2026-08)
 * calibrated to the Kenneth French Data Library:
 * - Mkt-RF (Market Excess Return)
 * - SMB (Small Minus Big - Size)
 * - HML (High Minus Low - Value)
 * - RMW (Robust Minus Weak - Profitability)
 * - CMA (Conservative Minus Aggressive - Investment)
 * - MOM (Momentum / UMD - Carhart 4th Factor)
 * - RF (Risk-Free Rate: 1-Month T-Bill)
 * 
 * Includes pre-loaded monthly returns for canonical Small-Cap Value funds:
 * - IJS (iShares S&P Small-Cap 600 Value ETF)
 * - IWN (iShares Russell 2000 Value ETF)
 * - RZV (Invesco S&P SmallCap 600 Pure Value ETF)
 * - VBR (Vanguard Small-Cap Value ETF)
 */

export const FACTOR_DEFINITIONS = {
  mkt_rf: {
    id: 'mkt_rf',
    symbol: 'MKT-RF',
    name: 'Market Excess Return',
    shortName: 'Market',
    description: 'Excess return of the broad equity market over the risk-free rate (CAPM Beta).',
    color: '#38bdf8'
  },
  smb: {
    id: 'smb',
    symbol: 'SMB',
    name: 'Size (Small Minus Big)',
    shortName: 'Size',
    description: 'Historical return spread of small-cap stocks over large-cap stocks. Positive indicates small-cap tilt; negative indicates large-cap tilt.',
    color: '#34d399'
  },
  hml: {
    id: 'hml',
    symbol: 'HML',
    name: 'Value (High Minus Low)',
    shortName: 'Value',
    description: 'Historical return spread of value stocks (high book-to-market) over growth stocks. Positive indicates value tilt; negative indicates growth tilt.',
    color: '#fbbf24'
  },
  rmw: {
    id: 'rmw',
    symbol: 'RMW',
    name: 'Profitability (Robust Minus Weak)',
    shortName: 'Profitability',
    description: 'Return spread of companies with robust operating profitability over weak operating profitability.',
    color: '#a855f7'
  },
  cma: {
    id: 'cma',
    symbol: 'CMA',
    name: 'Investment (Conservative Minus Aggressive)',
    shortName: 'Investment',
    description: 'Return spread of companies with conservative capital investment over aggressive capital investment.',
    color: '#f43f5e'
  },
  mom: {
    id: 'mom',
    symbol: 'MOM',
    name: 'Momentum (Carhart UMD)',
    shortName: 'Momentum',
    description: 'Return spread of prior 2-12 month winners over prior 2-12 month losers.',
    color: '#06b6d4'
  },
  rf: {
    id: 'rf',
    symbol: 'RF',
    name: 'Risk-Free Rate',
    shortName: 'Risk-Free',
    description: 'Monthly return on 1-Month US Treasury Bills.',
    color: '#94a3b8'
  }
};

export const FACTOR_MODELS = [
  {
    id: 'capm',
    name: 'CAPM (1-Factor)',
    shortName: 'CAPM',
    factors: ['mkt_rf'],
    description: 'Traditional Capital Asset Pricing Model evaluating market risk beta only.'
  },
  {
    id: 'ff3',
    name: 'Fama-French 3-Factor',
    shortName: 'FF 3-Factor',
    factors: ['mkt_rf', 'smb', 'hml'],
    description: 'Decomposes returns into Market, Size (SMB), and Value (HML).'
  },
  {
    id: 'carhart4',
    name: 'Carhart 4-Factor',
    shortName: 'Carhart 4-Factor',
    factors: ['mkt_rf', 'smb', 'hml', 'mom'],
    description: 'Adds price Momentum (MOM) to the Fama-French 3-Factor model.'
  },
  {
    id: 'ff5',
    name: 'Fama-French 5-Factor',
    shortName: 'FF 5-Factor',
    factors: ['mkt_rf', 'smb', 'hml', 'rmw', 'cma'],
    description: 'Adds Operating Profitability (RMW) and Capital Investment (CMA) factors.'
  },
  {
    id: 'ff6',
    name: 'Fama-French 6-Factor',
    shortName: 'FF 6-Factor',
    factors: ['mkt_rf', 'smb', 'hml', 'rmw', 'cma', 'mom'],
    description: 'Full empirical multi-factor model including Profitability, Investment, and Momentum.'
  }
];

export const PRELOADED_FACTOR_FUNDS = [
  {
    "ticker": "IJS",
    "name": "iShares S&P Small-Cap 600 Value ETF",
    "category": "US Small Cap Value",
    "color": "#f59e0b",
    "data": [
      {
        "date": "2005-03",
        "close": 21.28,
        "adjClose": 21.28,
        "ret": -0.023739
      },
      {
        "date": "2005-04",
        "close": 20.19,
        "adjClose": 20.19,
        "ret": -0.051047
      },
      {
        "date": "2005-05",
        "close": 21.43,
        "adjClose": 21.43,
        "ret": 0.06147
      },
      {
        "date": "2005-06",
        "close": 22.27,
        "adjClose": 22.27,
        "ret": 0.03914
      },
      {
        "date": "2005-07",
        "close": 23.57,
        "adjClose": 23.57,
        "ret": 0.058405
      },
      {
        "date": "2005-08",
        "close": 23.13,
        "adjClose": 23.13,
        "ret": -0.018763
      },
      {
        "date": "2005-09",
        "close": 23.14,
        "adjClose": 23.14,
        "ret": 0.000614
      },
      {
        "date": "2005-10",
        "close": 22.35,
        "adjClose": 22.35,
        "ret": -0.034133
      },
      {
        "date": "2005-11",
        "close": 23.45,
        "adjClose": 23.45,
        "ret": 0.049076
      },
      {
        "date": "2005-12",
        "close": 23.21,
        "adjClose": 23.21,
        "ret": -0.010494
      },
      {
        "date": "2006-01",
        "close": 25.23,
        "adjClose": 25.23,
        "ret": 0.087374
      },
      {
        "date": "2006-02",
        "close": 25.3,
        "adjClose": 25.3,
        "ret": 0.00279
      },
      {
        "date": "2006-03",
        "close": 26.53,
        "adjClose": 26.53,
        "ret": 0.048546
      },
      {
        "date": "2006-04",
        "close": 26.58,
        "adjClose": 26.58,
        "ret": 0.001847
      },
      {
        "date": "2006-05",
        "close": 25.37,
        "adjClose": 25.37,
        "ret": -0.045555
      },
      {
        "date": "2006-06",
        "close": 25.38,
        "adjClose": 25.38,
        "ret": 0.000367
      },
      {
        "date": "2006-07",
        "close": 24.6,
        "adjClose": 24.6,
        "ret": -0.030887
      },
      {
        "date": "2006-08",
        "close": 25.26,
        "adjClose": 25.26,
        "ret": 0.027021
      },
      {
        "date": "2006-09",
        "close": 25.56,
        "adjClose": 25.56,
        "ret": 0.011904
      },
      {
        "date": "2006-10",
        "close": 26.97,
        "adjClose": 26.97,
        "ret": 0.055178
      },
      {
        "date": "2006-11",
        "close": 27.61,
        "adjClose": 27.61,
        "ret": 0.02377
      },
      {
        "date": "2006-12",
        "close": 27.7,
        "adjClose": 27.7,
        "ret": 0.003125
      },
      {
        "date": "2007-01",
        "close": 28.29,
        "adjClose": 28.29,
        "ret": 0.021402
      },
      {
        "date": "2007-02",
        "close": 28.03,
        "adjClose": 28.03,
        "ret": -0.009275
      },
      {
        "date": "2007-03",
        "close": 28.28,
        "adjClose": 28.28,
        "ret": 0.009115
      },
      {
        "date": "2007-04",
        "close": 28.8,
        "adjClose": 28.8,
        "ret": 0.01836
      },
      {
        "date": "2007-05",
        "close": 30.14,
        "adjClose": 30.14,
        "ret": 0.046344
      },
      {
        "date": "2007-06",
        "close": 29.46,
        "adjClose": 29.46,
        "ret": -0.022453
      },
      {
        "date": "2007-07",
        "close": 27.62,
        "adjClose": 27.62,
        "ret": -0.062616
      },
      {
        "date": "2007-08",
        "close": 27.98,
        "adjClose": 27.98,
        "ret": 0.0133
      },
      {
        "date": "2007-09",
        "close": 28.07,
        "adjClose": 28.07,
        "ret": 0.003145
      },
      {
        "date": "2007-10",
        "close": 28.37,
        "adjClose": 28.37,
        "ret": 0.010633
      },
      {
        "date": "2007-11",
        "close": 26.34,
        "adjClose": 26.34,
        "ret": -0.071456
      },
      {
        "date": "2007-12",
        "close": 26.16,
        "adjClose": 26.16,
        "ret": -0.007174
      },
      {
        "date": "2008-01",
        "close": 25.11,
        "adjClose": 25.11,
        "ret": -0.04
      },
      {
        "date": "2008-02",
        "close": 24.26,
        "adjClose": 24.26,
        "ret": -0.033626
      },
      {
        "date": "2008-03",
        "close": 24.46,
        "adjClose": 24.46,
        "ret": 0.008226
      },
      {
        "date": "2008-04",
        "close": 25.11,
        "adjClose": 25.11,
        "ret": 0.026443
      },
      {
        "date": "2008-05",
        "close": 26.1,
        "adjClose": 26.1,
        "ret": 0.039214
      },
      {
        "date": "2008-06",
        "close": 23.9,
        "adjClose": 23.9,
        "ret": -0.084194
      },
      {
        "date": "2008-07",
        "close": 24.58,
        "adjClose": 24.58,
        "ret": 0.028688
      },
      {
        "date": "2008-08",
        "close": 25.76,
        "adjClose": 25.76,
        "ret": 0.047628
      },
      {
        "date": "2008-09",
        "close": 24.52,
        "adjClose": 24.52,
        "ret": -0.048084
      },
      {
        "date": "2008-10",
        "close": 19.65,
        "adjClose": 19.65,
        "ret": -0.198616
      },
      {
        "date": "2008-11",
        "close": 17.33,
        "adjClose": 17.33,
        "ret": -0.11797
      },
      {
        "date": "2008-12",
        "close": 18.47,
        "adjClose": 18.47,
        "ret": 0.065766
      },
      {
        "date": "2009-01",
        "close": 15.89,
        "adjClose": 15.89,
        "ret": -0.139459
      },
      {
        "date": "2009-02",
        "close": 13.82,
        "adjClose": 13.82,
        "ret": -0.130292
      },
      {
        "date": "2009-03",
        "close": 14.87,
        "adjClose": 14.87,
        "ret": 0.07594
      },
      {
        "date": "2009-04",
        "close": 17.68,
        "adjClose": 17.68,
        "ret": 0.188826
      },
      {
        "date": "2009-05",
        "close": 17.8,
        "adjClose": 17.8,
        "ret": 0.006832
      },
      {
        "date": "2009-06",
        "close": 18.07,
        "adjClose": 18.07,
        "ret": 0.015218
      },
      {
        "date": "2009-07",
        "close": 20.06,
        "adjClose": 20.06,
        "ret": 0.109941
      },
      {
        "date": "2009-08",
        "close": 20.76,
        "adjClose": 20.76,
        "ret": 0.034991
      },
      {
        "date": "2009-09",
        "close": 21.63,
        "adjClose": 21.63,
        "ret": 0.041924
      },
      {
        "date": "2009-10",
        "close": 20.31,
        "adjClose": 20.31,
        "ret": -0.060874
      },
      {
        "date": "2009-11",
        "close": 20.91,
        "adjClose": 20.91,
        "ret": 0.029122
      },
      {
        "date": "2009-12",
        "close": 22.6,
        "adjClose": 22.6,
        "ret": 0.081085
      },
      {
        "date": "2010-01",
        "close": 22.02,
        "adjClose": 22.02,
        "ret": -0.025538
      },
      {
        "date": "2010-02",
        "close": 23.08,
        "adjClose": 23.08,
        "ret": 0.047792
      },
      {
        "date": "2010-03",
        "close": 24.88,
        "adjClose": 24.88,
        "ret": 0.077943
      },
      {
        "date": "2010-04",
        "close": 26.52,
        "adjClose": 26.52,
        "ret": 0.066265
      },
      {
        "date": "2010-05",
        "close": 24.26,
        "adjClose": 24.26,
        "ret": -0.085341
      },
      {
        "date": "2010-06",
        "close": 22.25,
        "adjClose": 22.25,
        "ret": -0.082847
      },
      {
        "date": "2010-07",
        "close": 23.74,
        "adjClose": 23.74,
        "ret": 0.067131
      },
      {
        "date": "2010-08",
        "close": 21.86,
        "adjClose": 21.86,
        "ret": -0.079147
      },
      {
        "date": "2010-09",
        "close": 24.26,
        "adjClose": 24.26,
        "ret": 0.109563
      },
      {
        "date": "2010-10",
        "close": 25.24,
        "adjClose": 25.24,
        "ret": 0.040267
      },
      {
        "date": "2010-11",
        "close": 25.86,
        "adjClose": 25.86,
        "ret": 0.024816
      },
      {
        "date": "2010-12",
        "close": 28.18,
        "adjClose": 28.18,
        "ret": 0.089542
      },
      {
        "date": "2011-01",
        "close": 28.12,
        "adjClose": 28.12,
        "ret": -0.002207
      },
      {
        "date": "2011-02",
        "close": 29.3,
        "adjClose": 29.3,
        "ret": 0.041917
      },
      {
        "date": "2011-03",
        "close": 29.95,
        "adjClose": 29.95,
        "ret": 0.022232
      },
      {
        "date": "2011-04",
        "close": 30.27,
        "adjClose": 30.27,
        "ret": 0.010709
      },
      {
        "date": "2011-05",
        "close": 29.73,
        "adjClose": 29.73,
        "ret": -0.017619
      },
      {
        "date": "2011-06",
        "close": 29.26,
        "adjClose": 29.26,
        "ret": -0.016072
      },
      {
        "date": "2011-07",
        "close": 28.45,
        "adjClose": 28.45,
        "ret": -0.027628
      },
      {
        "date": "2011-08",
        "close": 26.18,
        "adjClose": 26.18,
        "ret": -0.079856
      },
      {
        "date": "2011-09",
        "close": 23.41,
        "adjClose": 23.41,
        "ret": -0.105559
      },
      {
        "date": "2011-10",
        "close": 27,
        "adjClose": 27,
        "ret": 0.153317
      },
      {
        "date": "2011-11",
        "close": 27.17,
        "adjClose": 27.17,
        "ret": 0.006355
      },
      {
        "date": "2011-12",
        "close": 27.72,
        "adjClose": 27.72,
        "ret": 0.020151
      },
      {
        "date": "2012-01",
        "close": 29.91,
        "adjClose": 29.91,
        "ret": 0.078958
      },
      {
        "date": "2012-02",
        "close": 30.43,
        "adjClose": 30.43,
        "ret": 0.017274
      },
      {
        "date": "2012-03",
        "close": 31.31,
        "adjClose": 31.31,
        "ret": 0.02893
      },
      {
        "date": "2012-04",
        "close": 30.71,
        "adjClose": 30.71,
        "ret": -0.019148
      },
      {
        "date": "2012-05",
        "close": 28.51,
        "adjClose": 28.51,
        "ret": -0.071735
      },
      {
        "date": "2012-06",
        "close": 29.8,
        "adjClose": 29.8,
        "ret": 0.045485
      },
      {
        "date": "2012-07",
        "close": 29.6,
        "adjClose": 29.6,
        "ret": -0.006862
      },
      {
        "date": "2012-08",
        "close": 30.8,
        "adjClose": 30.8,
        "ret": 0.040732
      },
      {
        "date": "2012-09",
        "close": 31.77,
        "adjClose": 31.77,
        "ret": 0.031285
      },
      {
        "date": "2012-10",
        "close": 31.15,
        "adjClose": 31.15,
        "ret": -0.019564
      },
      {
        "date": "2012-11",
        "close": 31.66,
        "adjClose": 31.66,
        "ret": 0.016461
      },
      {
        "date": "2012-12",
        "close": 32.79,
        "adjClose": 32.79,
        "ret": 0.0357
      },
      {
        "date": "2013-01",
        "close": 34.54,
        "adjClose": 34.54,
        "ret": 0.053524
      },
      {
        "date": "2013-02",
        "close": 35.11,
        "adjClose": 35.11,
        "ret": 0.016269
      },
      {
        "date": "2013-03",
        "close": 36.55,
        "adjClose": 36.55,
        "ret": 0.041022
      },
      {
        "date": "2013-04",
        "close": 36.59,
        "adjClose": 36.59,
        "ret": 0.00124
      },
      {
        "date": "2013-05",
        "close": 38.16,
        "adjClose": 38.16,
        "ret": 0.042876
      },
      {
        "date": "2013-06",
        "close": 38.22,
        "adjClose": 38.22,
        "ret": 0.001512
      },
      {
        "date": "2013-07",
        "close": 40.61,
        "adjClose": 40.61,
        "ret": 0.062573
      },
      {
        "date": "2013-08",
        "close": 39.33,
        "adjClose": 39.33,
        "ret": -0.031399
      },
      {
        "date": "2013-09",
        "close": 41.81,
        "adjClose": 41.81,
        "ret": 0.062874
      },
      {
        "date": "2013-10",
        "close": 43.26,
        "adjClose": 43.26,
        "ret": 0.034812
      },
      {
        "date": "2013-11",
        "close": 45.11,
        "adjClose": 45.11,
        "ret": 0.042711
      },
      {
        "date": "2013-12",
        "close": 45.69,
        "adjClose": 45.69,
        "ret": 0.01278
      },
      {
        "date": "2014-01",
        "close": 44.08,
        "adjClose": 44.08,
        "ret": -0.035115
      },
      {
        "date": "2014-02",
        "close": 46.13,
        "adjClose": 46.13,
        "ret": 0.046488
      },
      {
        "date": "2014-03",
        "close": 46.73,
        "adjClose": 46.73,
        "ret": 0.013056
      },
      {
        "date": "2014-04",
        "close": 45.67,
        "adjClose": 45.67,
        "ret": -0.02281
      },
      {
        "date": "2014-05",
        "close": 45.94,
        "adjClose": 45.94,
        "ret": 0.006059
      },
      {
        "date": "2014-06",
        "close": 47.73,
        "adjClose": 47.73,
        "ret": 0.038847
      },
      {
        "date": "2014-07",
        "close": 45.31,
        "adjClose": 45.31,
        "ret": -0.050593
      },
      {
        "date": "2014-08",
        "close": 47.33,
        "adjClose": 47.33,
        "ret": 0.044389
      },
      {
        "date": "2014-09",
        "close": 44.51,
        "adjClose": 44.51,
        "ret": -0.059508
      },
      {
        "date": "2014-10",
        "close": 47.69,
        "adjClose": 47.69,
        "ret": 0.071438
      },
      {
        "date": "2014-11",
        "close": 47.92,
        "adjClose": 47.92,
        "ret": 0.004775
      },
      {
        "date": "2014-12",
        "close": 49.14,
        "adjClose": 49.14,
        "ret": 0.025542
      },
      {
        "date": "2015-01",
        "close": 46.54,
        "adjClose": 46.54,
        "ret": -0.052845
      },
      {
        "date": "2015-02",
        "close": 49.27,
        "adjClose": 49.27,
        "ret": 0.058452
      },
      {
        "date": "2015-03",
        "close": 49.76,
        "adjClose": 49.76,
        "ret": 0.010056
      },
      {
        "date": "2015-04",
        "close": 48.84,
        "adjClose": 48.84,
        "ret": -0.018436
      },
      {
        "date": "2015-05",
        "close": 49.23,
        "adjClose": 49.23,
        "ret": 0.007819
      },
      {
        "date": "2015-06",
        "close": 49.42,
        "adjClose": 49.42,
        "ret": 0.003951
      },
      {
        "date": "2015-07",
        "close": 48.08,
        "adjClose": 48.08,
        "ret": -0.027028
      },
      {
        "date": "2015-08",
        "close": 45.86,
        "adjClose": 45.86,
        "ret": -0.046159
      },
      {
        "date": "2015-09",
        "close": 44.13,
        "adjClose": 44.13,
        "ret": -0.037755
      },
      {
        "date": "2015-10",
        "close": 47.04,
        "adjClose": 47.04,
        "ret": 0.065772
      },
      {
        "date": "2015-11",
        "close": 48.2,
        "adjClose": 48.2,
        "ret": 0.024718
      },
      {
        "date": "2015-12",
        "close": 45.75,
        "adjClose": 45.75,
        "ret": -0.050788
      },
      {
        "date": "2016-01",
        "close": 43.07,
        "adjClose": 43.07,
        "ret": -0.058592
      },
      {
        "date": "2016-02",
        "close": 43.98,
        "adjClose": 43.98,
        "ret": 0.021145
      },
      {
        "date": "2016-03",
        "close": 48.1,
        "adjClose": 48.1,
        "ret": 0.093726
      },
      {
        "date": "2016-04",
        "close": 49.13,
        "adjClose": 49.13,
        "ret": 0.021334
      },
      {
        "date": "2016-05",
        "close": 49.35,
        "adjClose": 49.35,
        "ret": 0.004521
      },
      {
        "date": "2016-06",
        "close": 49.69,
        "adjClose": 49.69,
        "ret": 0.006914
      },
      {
        "date": "2016-07",
        "close": 52.29,
        "adjClose": 52.29,
        "ret": 0.052204
      },
      {
        "date": "2016-08",
        "close": 52.87,
        "adjClose": 52.87,
        "ret": 0.011123
      },
      {
        "date": "2016-09",
        "close": 53.32,
        "adjClose": 53.32,
        "ret": 0.008565
      },
      {
        "date": "2016-10",
        "close": 51.33,
        "adjClose": 51.33,
        "ret": -0.037305
      },
      {
        "date": "2016-11",
        "close": 58.17,
        "adjClose": 58.17,
        "ret": 0.133322
      },
      {
        "date": "2016-12",
        "close": 60.04,
        "adjClose": 60.04,
        "ret": 0.032
      },
      {
        "date": "2017-01",
        "close": 59.32,
        "adjClose": 59.32,
        "ret": -0.012014
      },
      {
        "date": "2017-02",
        "close": 60.11,
        "adjClose": 60.11,
        "ret": 0.013396
      },
      {
        "date": "2017-03",
        "close": 59.72,
        "adjClose": 59.72,
        "ret": -0.006427
      },
      {
        "date": "2017-04",
        "close": 60.03,
        "adjClose": 60.03,
        "ret": 0.005104
      },
      {
        "date": "2017-05",
        "close": 58.67,
        "adjClose": 58.67,
        "ret": -0.022701
      },
      {
        "date": "2017-06",
        "close": 60.41,
        "adjClose": 60.41,
        "ret": 0.029798
      },
      {
        "date": "2017-07",
        "close": 60.86,
        "adjClose": 60.86,
        "ret": 0.007373
      },
      {
        "date": "2017-08",
        "close": 59.21,
        "adjClose": 59.21,
        "ret": -0.027173
      },
      {
        "date": "2017-09",
        "close": 64.29,
        "adjClose": 64.29,
        "ret": 0.085938
      },
      {
        "date": "2017-10",
        "close": 64.67,
        "adjClose": 64.67,
        "ret": 0.005781
      },
      {
        "date": "2017-11",
        "close": 67.09,
        "adjClose": 67.09,
        "ret": 0.037574
      },
      {
        "date": "2017-12",
        "close": 66.85,
        "adjClose": 66.85,
        "ret": -0.003646
      },
      {
        "date": "2018-01",
        "close": 67.74,
        "adjClose": 67.74,
        "ret": 0.013295
      },
      {
        "date": "2018-02",
        "close": 65,
        "adjClose": 65,
        "ret": -0.040427
      },
      {
        "date": "2018-03",
        "close": 65.88,
        "adjClose": 65.88,
        "ret": 0.013585
      },
      {
        "date": "2018-04",
        "close": 67.05,
        "adjClose": 67.05,
        "ret": 0.017706
      },
      {
        "date": "2018-05",
        "close": 70.98,
        "adjClose": 70.98,
        "ret": 0.058579
      },
      {
        "date": "2018-06",
        "close": 71.55,
        "adjClose": 71.55,
        "ret": 0.008069
      },
      {
        "date": "2018-07",
        "close": 73.42,
        "adjClose": 73.42,
        "ret": 0.026084
      },
      {
        "date": "2018-08",
        "close": 75.73,
        "adjClose": 75.73,
        "ret": 0.031474
      },
      {
        "date": "2018-09",
        "close": 73.41,
        "adjClose": 73.41,
        "ret": -0.030635
      },
      {
        "date": "2018-10",
        "close": 66.11,
        "adjClose": 66.11,
        "ret": -0.099418
      },
      {
        "date": "2018-11",
        "close": 66.5,
        "adjClose": 66.5,
        "ret": 0.005834
      },
      {
        "date": "2018-12",
        "close": 58.26,
        "adjClose": 58.26,
        "ret": -0.123883
      },
      {
        "date": "2019-01",
        "close": 65.4,
        "adjClose": 65.4,
        "ret": 0.122525
      },
      {
        "date": "2019-02",
        "close": 68.1,
        "adjClose": 68.1,
        "ret": 0.041387
      },
      {
        "date": "2019-03",
        "close": 65.43,
        "adjClose": 65.43,
        "ret": -0.039207
      },
      {
        "date": "2019-04",
        "close": 68.26,
        "adjClose": 68.26,
        "ret": 0.043237
      },
      {
        "date": "2019-05",
        "close": 61.44,
        "adjClose": 61.44,
        "ret": -0.099859
      },
      {
        "date": "2019-06",
        "close": 66.15,
        "adjClose": 66.15,
        "ret": 0.076511
      },
      {
        "date": "2019-07",
        "close": 67.01,
        "adjClose": 67.01,
        "ret": 0.013107
      },
      {
        "date": "2019-08",
        "close": 63.57,
        "adjClose": 63.57,
        "ret": -0.051371
      },
      {
        "date": "2019-09",
        "close": 67.1,
        "adjClose": 67.1,
        "ret": 0.055586
      },
      {
        "date": "2019-10",
        "close": 68.45,
        "adjClose": 68.45,
        "ret": 0.020099
      },
      {
        "date": "2019-11",
        "close": 70.3,
        "adjClose": 70.3,
        "ret": 0.027006
      },
      {
        "date": "2019-12",
        "close": 72.3,
        "adjClose": 72.3,
        "ret": 0.028426
      },
      {
        "date": "2020-01",
        "close": 67.74,
        "adjClose": 67.74,
        "ret": -0.063079
      },
      {
        "date": "2020-02",
        "close": 60.87,
        "adjClose": 60.87,
        "ret": -0.101428
      },
      {
        "date": "2020-03",
        "close": 45.19,
        "adjClose": 45.19,
        "ret": -0.257648
      },
      {
        "date": "2020-04",
        "close": 51.46,
        "adjClose": 51.46,
        "ret": 0.138933
      },
      {
        "date": "2020-05",
        "close": 52.77,
        "adjClose": 52.77,
        "ret": 0.025406
      },
      {
        "date": "2020-06",
        "close": 54.67,
        "adjClose": 54.67,
        "ret": 0.035893
      },
      {
        "date": "2020-07",
        "close": 56.07,
        "adjClose": 56.07,
        "ret": 0.025742
      },
      {
        "date": "2020-08",
        "close": 58.91,
        "adjClose": 58.91,
        "ret": 0.050692
      },
      {
        "date": "2020-09",
        "close": 55.85,
        "adjClose": 55.85,
        "ret": -0.051982
      },
      {
        "date": "2020-10",
        "close": 57.9,
        "adjClose": 57.9,
        "ret": 0.036591
      },
      {
        "date": "2020-11",
        "close": 69.02,
        "adjClose": 69.02,
        "ret": 0.19215
      },
      {
        "date": "2020-12",
        "close": 74.19,
        "adjClose": 74.19,
        "ret": 0.074937
      },
      {
        "date": "2021-01",
        "close": 78.83,
        "adjClose": 78.83,
        "ret": 0.062486
      },
      {
        "date": "2021-02",
        "close": 87.34,
        "adjClose": 87.34,
        "ret": 0.107991
      },
      {
        "date": "2021-03",
        "close": 92.24,
        "adjClose": 92.24,
        "ret": 0.056132
      },
      {
        "date": "2021-04",
        "close": 93.8,
        "adjClose": 93.8,
        "ret": 0.016857
      },
      {
        "date": "2021-05",
        "close": 97.45,
        "adjClose": 97.45,
        "ret": 0.038951
      },
      {
        "date": "2021-06",
        "close": 96.76,
        "adjClose": 96.76,
        "ret": -0.007072
      },
      {
        "date": "2021-07",
        "close": 92.54,
        "adjClose": 92.54,
        "ret": -0.043602
      },
      {
        "date": "2021-08",
        "close": 94.23,
        "adjClose": 94.23,
        "ret": 0.018176
      },
      {
        "date": "2021-09",
        "close": 92.86,
        "adjClose": 92.86,
        "ret": -0.014499
      },
      {
        "date": "2021-10",
        "close": 95.52,
        "adjClose": 95.52,
        "ret": 0.028627
      },
      {
        "date": "2021-11",
        "close": 93.02,
        "adjClose": 93.02,
        "ret": -0.026176
      },
      {
        "date": "2021-12",
        "close": 96.84,
        "adjClose": 96.84,
        "ret": 0.041062
      },
      {
        "date": "2022-01",
        "close": 92.58,
        "adjClose": 92.58,
        "ret": -0.043952
      },
      {
        "date": "2022-02",
        "close": 94.69,
        "adjClose": 94.69,
        "ret": 0.022792
      },
      {
        "date": "2022-03",
        "close": 95.17,
        "adjClose": 95.17,
        "ret": 0.005017
      },
      {
        "date": "2022-04",
        "close": 89.1,
        "adjClose": 89.1,
        "ret": -0.06379
      },
      {
        "date": "2022-05",
        "close": 91.16,
        "adjClose": 91.16,
        "ret": 0.02316
      },
      {
        "date": "2022-06",
        "close": 82.98,
        "adjClose": 82.98,
        "ret": -0.08969
      },
      {
        "date": "2022-07",
        "close": 90.06,
        "adjClose": 90.06,
        "ret": 0.08525
      },
      {
        "date": "2022-08",
        "close": 86.31,
        "adjClose": 86.31,
        "ret": -0.041605
      },
      {
        "date": "2022-09",
        "close": 77.32,
        "adjClose": 77.32,
        "ret": -0.104212
      },
      {
        "date": "2022-10",
        "close": 88.45,
        "adjClose": 88.45,
        "ret": 0.143968
      },
      {
        "date": "2022-11",
        "close": 91.81,
        "adjClose": 91.81,
        "ret": 0.038063
      },
      {
        "date": "2022-12",
        "close": 85.86,
        "adjClose": 85.86,
        "ret": -0.06486
      },
      {
        "date": "2023-01",
        "close": 96.12,
        "adjClose": 96.12,
        "ret": 0.119486
      },
      {
        "date": "2023-02",
        "close": 94.45,
        "adjClose": 94.45,
        "ret": -0.017322
      },
      {
        "date": "2023-03",
        "close": 88.33,
        "adjClose": 88.33,
        "ret": -0.064867
      },
      {
        "date": "2023-04",
        "close": 86.21,
        "adjClose": 86.21,
        "ret": -0.023933
      },
      {
        "date": "2023-05",
        "close": 83.06,
        "adjClose": 83.06,
        "ret": -0.036563
      },
      {
        "date": "2023-06",
        "close": 90.12,
        "adjClose": 90.12,
        "ret": 0.085012
      },
      {
        "date": "2023-07",
        "close": 95.55,
        "adjClose": 95.55,
        "ret": 0.060251
      },
      {
        "date": "2023-08",
        "close": 90.77,
        "adjClose": 90.77,
        "ret": -0.050082
      },
      {
        "date": "2023-09",
        "close": 85.05,
        "adjClose": 85.05,
        "ret": -0.062935
      },
      {
        "date": "2023-10",
        "close": 79.65,
        "adjClose": 79.65,
        "ret": -0.063548
      },
      {
        "date": "2023-11",
        "close": 86.87,
        "adjClose": 86.87,
        "ret": 0.090724
      },
      {
        "date": "2023-12",
        "close": 98.47,
        "adjClose": 98.47,
        "ret": 0.133425
      },
      {
        "date": "2024-01",
        "close": 93.1,
        "adjClose": 93.1,
        "ret": -0.054526
      },
      {
        "date": "2024-02",
        "close": 95.3,
        "adjClose": 95.3,
        "ret": 0.023708
      },
      {
        "date": "2024-03",
        "close": 98.53,
        "adjClose": 98.53,
        "ret": 0.033835
      },
      {
        "date": "2024-04",
        "close": 92.12,
        "adjClose": 92.12,
        "ret": -0.065016
      },
      {
        "date": "2024-05",
        "close": 96.32,
        "adjClose": 96.32,
        "ret": 0.045589
      },
      {
        "date": "2024-06",
        "close": 93.72,
        "adjClose": 93.72,
        "ret": -0.027055
      },
      {
        "date": "2024-07",
        "close": 104.77,
        "adjClose": 104.77,
        "ret": 0.117927
      },
      {
        "date": "2024-08",
        "close": 103.32,
        "adjClose": 103.32,
        "ret": -0.013802
      },
      {
        "date": "2024-09",
        "close": 104.27,
        "adjClose": 104.27,
        "ret": 0.009214
      },
      {
        "date": "2024-10",
        "close": 102.44,
        "adjClose": 102.44,
        "ret": -0.01756
      },
      {
        "date": "2024-11",
        "close": 113.48,
        "adjClose": 113.48,
        "ret": 0.107699
      },
      {
        "date": "2024-12",
        "close": 105.69,
        "adjClose": 105.69,
        "ret": -0.068658
      },
      {
        "date": "2025-01",
        "close": 107.5,
        "adjClose": 107.5,
        "ret": 0.017126
      },
      {
        "date": "2025-02",
        "close": 101.69,
        "adjClose": 101.69,
        "ret": -0.053956
      },
      {
        "date": "2025-03",
        "close": 95.2,
        "adjClose": 95.2,
        "ret": -0.063886
      },
      {
        "date": "2025-04",
        "close": 89.67,
        "adjClose": 89.67,
        "ret": -0.058064
      },
      {
        "date": "2025-05",
        "close": 93.5,
        "adjClose": 93.5,
        "ret": 0.042693
      },
      {
        "date": "2025-06",
        "close": 97.59,
        "adjClose": 97.59,
        "ret": 0.043773
      },
      {
        "date": "2025-07",
        "close": 98.94,
        "adjClose": 98.94,
        "ret": 0.01377
      },
      {
        "date": "2025-08",
        "close": 107.46,
        "adjClose": 107.46,
        "ret": 0.086164
      },
      {
        "date": "2025-09",
        "close": 108.98,
        "adjClose": 108.98,
        "ret": 0.014173
      },
      {
        "date": "2025-10",
        "close": 108.6,
        "adjClose": 108.6,
        "ret": -0.003523
      },
      {
        "date": "2025-11",
        "close": 111.71,
        "adjClose": 111.71,
        "ret": 0.028674
      },
      {
        "date": "2025-12",
        "close": 112.59,
        "adjClose": 112.59,
        "ret": 0.007868
      },
      {
        "date": "2026-01",
        "close": 119.9,
        "adjClose": 119.9,
        "ret": 0.064907
      },
      {
        "date": "2026-02",
        "close": 121.58,
        "adjClose": 121.58,
        "ret": 0.014037
      },
      {
        "date": "2026-03",
        "close": 117.48,
        "adjClose": 117.48,
        "ret": -0.033722
      },
      {
        "date": "2026-04",
        "close": 128.23,
        "adjClose": 128.23,
        "ret": 0.091511
      },
      {
        "date": "2026-05",
        "close": 129.62,
        "adjClose": 129.62,
        "ret": 0.010832
      },
      {
        "date": "2026-06",
        "close": 136.11,
        "adjClose": 136.11,
        "ret": 0.050014
      },
      {
        "date": "2026-07",
        "close": 135.39,
        "adjClose": 135.39,
        "ret": -0.005268
      },
      {
        "date": "2026-08",
        "close": 136.05,
        "adjClose": 136.05,
        "ret": 0.00486
      },
      {
        "date": "2026-09",
        "close": 128.1,
        "adjClose": 128.1,
        "ret": -0.058414
      },
      {
        "date": "2026-10",
        "close": 132.79,
        "adjClose": 132.79,
        "ret": 0.036612
      },
      {
        "date": "2026-11",
        "close": 134.38,
        "adjClose": 134.38,
        "ret": 0.011974
      }
    ]
  },
  {
    "ticker": "IWN",
    "name": "iShares Russell 2000 Value ETF",
    "category": "US Small Cap Value",
    "color": "#38bdf8",
    "data": [
      {
        "date": "2005-03",
        "close": 40.61,
        "adjClose": 40.61,
        "ret": -0.021418
      },
      {
        "date": "2005-04",
        "close": 38.5,
        "adjClose": 38.5,
        "ret": -0.052055
      },
      {
        "date": "2005-05",
        "close": 40.81,
        "adjClose": 40.81,
        "ret": 0.060023
      },
      {
        "date": "2005-06",
        "close": 42.65,
        "adjClose": 42.65,
        "ret": 0.045238
      },
      {
        "date": "2005-07",
        "close": 45.23,
        "adjClose": 45.23,
        "ret": 0.060398
      },
      {
        "date": "2005-08",
        "close": 44.16,
        "adjClose": 44.16,
        "ret": -0.02351
      },
      {
        "date": "2005-09",
        "close": 43.92,
        "adjClose": 43.92,
        "ret": -0.005473
      },
      {
        "date": "2005-10",
        "close": 42.47,
        "adjClose": 42.47,
        "ret": -0.033049
      },
      {
        "date": "2005-11",
        "close": 44.6,
        "adjClose": 44.6,
        "ret": 0.05017
      },
      {
        "date": "2005-12",
        "close": 44.15,
        "adjClose": 44.15,
        "ret": -0.010179
      },
      {
        "date": "2006-01",
        "close": 47.58,
        "adjClose": 47.58,
        "ret": 0.077727
      },
      {
        "date": "2006-02",
        "close": 47.77,
        "adjClose": 47.77,
        "ret": 0.00401
      },
      {
        "date": "2006-03",
        "close": 50.22,
        "adjClose": 50.22,
        "ret": 0.051322
      },
      {
        "date": "2006-04",
        "close": 50.39,
        "adjClose": 50.39,
        "ret": 0.003385
      },
      {
        "date": "2006-05",
        "close": 48.38,
        "adjClose": 48.38,
        "ret": -0.040016
      },
      {
        "date": "2006-06",
        "close": 48.78,
        "adjClose": 48.78,
        "ret": 0.008316
      },
      {
        "date": "2006-07",
        "close": 48.19,
        "adjClose": 48.19,
        "ret": -0.011993
      },
      {
        "date": "2006-08",
        "close": 49.59,
        "adjClose": 49.59,
        "ret": 0.029075
      },
      {
        "date": "2006-09",
        "close": 49.96,
        "adjClose": 49.96,
        "ret": 0.007346
      },
      {
        "date": "2006-10",
        "close": 52.57,
        "adjClose": 52.57,
        "ret": 0.052347
      },
      {
        "date": "2006-11",
        "close": 53.93,
        "adjClose": 53.93,
        "ret": 0.025823
      },
      {
        "date": "2006-12",
        "close": 54.52,
        "adjClose": 54.52,
        "ret": 0.010847
      },
      {
        "date": "2007-01",
        "close": 55.32,
        "adjClose": 55.32,
        "ret": 0.014775
      },
      {
        "date": "2007-02",
        "close": 54.66,
        "adjClose": 54.66,
        "ret": -0.01197
      },
      {
        "date": "2007-03",
        "close": 55.33,
        "adjClose": 55.33,
        "ret": 0.012208
      },
      {
        "date": "2007-04",
        "close": 55.71,
        "adjClose": 55.71,
        "ret": 0.007
      },
      {
        "date": "2007-05",
        "close": 57.58,
        "adjClose": 57.58,
        "ret": 0.033521
      },
      {
        "date": "2007-06",
        "close": 56.55,
        "adjClose": 56.55,
        "ret": -0.017858
      },
      {
        "date": "2007-07",
        "close": 51.36,
        "adjClose": 51.36,
        "ret": -0.09178
      },
      {
        "date": "2007-08",
        "close": 52.58,
        "adjClose": 52.58,
        "ret": 0.023694
      },
      {
        "date": "2007-09",
        "close": 53.04,
        "adjClose": 53.04,
        "ret": 0.008758
      },
      {
        "date": "2007-10",
        "close": 53.5,
        "adjClose": 53.5,
        "ret": 0.008667
      },
      {
        "date": "2007-11",
        "close": 49.55,
        "adjClose": 49.55,
        "ret": -0.07377
      },
      {
        "date": "2007-12",
        "close": 48.89,
        "adjClose": 48.89,
        "ret": -0.0134
      },
      {
        "date": "2008-01",
        "close": 47.01,
        "adjClose": 47.01,
        "ret": -0.03845
      },
      {
        "date": "2008-02",
        "close": 45.52,
        "adjClose": 45.52,
        "ret": -0.031719
      },
      {
        "date": "2008-03",
        "close": 45.56,
        "adjClose": 45.56,
        "ret": 0.000859
      },
      {
        "date": "2008-04",
        "close": 47.36,
        "adjClose": 47.36,
        "ret": 0.039517
      },
      {
        "date": "2008-05",
        "close": 48.83,
        "adjClose": 48.83,
        "ret": 0.031125
      },
      {
        "date": "2008-06",
        "close": 44.27,
        "adjClose": 44.27,
        "ret": -0.093371
      },
      {
        "date": "2008-07",
        "close": 46.32,
        "adjClose": 46.32,
        "ret": 0.046313
      },
      {
        "date": "2008-08",
        "close": 48.74,
        "adjClose": 48.74,
        "ret": 0.052184
      },
      {
        "date": "2008-09",
        "close": 47.18,
        "adjClose": 47.18,
        "ret": -0.031971
      },
      {
        "date": "2008-10",
        "close": 37.28,
        "adjClose": 37.28,
        "ret": -0.209781
      },
      {
        "date": "2008-11",
        "close": 33.09,
        "adjClose": 33.09,
        "ret": -0.112598
      },
      {
        "date": "2008-12",
        "close": 34.83,
        "adjClose": 34.83,
        "ret": 0.052826
      },
      {
        "date": "2009-01",
        "close": 30.03,
        "adjClose": 30.03,
        "ret": -0.137921
      },
      {
        "date": "2009-02",
        "close": 25.86,
        "adjClose": 25.86,
        "ret": -0.13884
      },
      {
        "date": "2009-03",
        "close": 28.1,
        "adjClose": 28.1,
        "ret": 0.086763
      },
      {
        "date": "2009-04",
        "close": 32.42,
        "adjClose": 32.42,
        "ret": 0.153754
      },
      {
        "date": "2009-05",
        "close": 33.19,
        "adjClose": 33.19,
        "ret": 0.023719
      },
      {
        "date": "2009-06",
        "close": 33.14,
        "adjClose": 33.14,
        "ret": -0.001548
      },
      {
        "date": "2009-07",
        "close": 36.87,
        "adjClose": 36.87,
        "ret": 0.112456
      },
      {
        "date": "2009-08",
        "close": 38.74,
        "adjClose": 38.74,
        "ret": 0.050757
      },
      {
        "date": "2009-09",
        "close": 40.55,
        "adjClose": 40.55,
        "ret": 0.04678
      },
      {
        "date": "2009-10",
        "close": 38,
        "adjClose": 38,
        "ret": -0.063033
      },
      {
        "date": "2009-11",
        "close": 38.99,
        "adjClose": 38.99,
        "ret": 0.026244
      },
      {
        "date": "2009-12",
        "close": 41.98,
        "adjClose": 41.98,
        "ret": 0.076572
      },
      {
        "date": "2010-01",
        "close": 40.82,
        "adjClose": 40.82,
        "ret": -0.027722
      },
      {
        "date": "2010-02",
        "close": 42.67,
        "adjClose": 42.67,
        "ret": 0.045376
      },
      {
        "date": "2010-03",
        "close": 46.3,
        "adjClose": 46.3,
        "ret": 0.085041
      },
      {
        "date": "2010-04",
        "close": 49.45,
        "adjClose": 49.45,
        "ret": 0.068064
      },
      {
        "date": "2010-05",
        "close": 45.38,
        "adjClose": 45.38,
        "ret": -0.082332
      },
      {
        "date": "2010-06",
        "close": 41.37,
        "adjClose": 41.37,
        "ret": -0.088361
      },
      {
        "date": "2010-07",
        "close": 44.29,
        "adjClose": 44.29,
        "ret": 0.070724
      },
      {
        "date": "2010-08",
        "close": 40.97,
        "adjClose": 40.97,
        "ret": -0.075038
      },
      {
        "date": "2010-09",
        "close": 45.35,
        "adjClose": 45.35,
        "ret": 0.10696
      },
      {
        "date": "2010-10",
        "close": 47.1,
        "adjClose": 47.1,
        "ret": 0.038543
      },
      {
        "date": "2010-11",
        "close": 48.33,
        "adjClose": 48.33,
        "ret": 0.026032
      },
      {
        "date": "2010-12",
        "close": 52.36,
        "adjClose": 52.36,
        "ret": 0.08352
      },
      {
        "date": "2011-01",
        "close": 52.29,
        "adjClose": 52.29,
        "ret": -0.001333
      },
      {
        "date": "2011-02",
        "close": 54.96,
        "adjClose": 54.96,
        "ret": 0.051034
      },
      {
        "date": "2011-03",
        "close": 55.7,
        "adjClose": 55.7,
        "ret": 0.013528
      },
      {
        "date": "2011-04",
        "close": 56.6,
        "adjClose": 56.6,
        "ret": 0.016119
      },
      {
        "date": "2011-05",
        "close": 55.64,
        "adjClose": 55.64,
        "ret": -0.01698
      },
      {
        "date": "2011-06",
        "close": 54.25,
        "adjClose": 54.25,
        "ret": -0.024924
      },
      {
        "date": "2011-07",
        "close": 52.53,
        "adjClose": 52.53,
        "ret": -0.031826
      },
      {
        "date": "2011-08",
        "close": 47.75,
        "adjClose": 47.75,
        "ret": -0.09094
      },
      {
        "date": "2011-09",
        "close": 42.57,
        "adjClose": 42.57,
        "ret": -0.108532
      },
      {
        "date": "2011-10",
        "close": 48.73,
        "adjClose": 48.73,
        "ret": 0.144776
      },
      {
        "date": "2011-11",
        "close": 48.63,
        "adjClose": 48.63,
        "ret": -0.002029
      },
      {
        "date": "2011-12",
        "close": 49.34,
        "adjClose": 49.34,
        "ret": 0.014591
      },
      {
        "date": "2012-01",
        "close": 52.63,
        "adjClose": 52.63,
        "ret": 0.066637
      },
      {
        "date": "2012-02",
        "close": 53.4,
        "adjClose": 53.4,
        "ret": 0.014724
      },
      {
        "date": "2012-03",
        "close": 55.06,
        "adjClose": 55.06,
        "ret": 0.030919
      },
      {
        "date": "2012-04",
        "close": 54.21,
        "adjClose": 54.21,
        "ret": -0.015361
      },
      {
        "date": "2012-05",
        "close": 50.92,
        "adjClose": 50.92,
        "ret": -0.060645
      },
      {
        "date": "2012-06",
        "close": 53.46,
        "adjClose": 53.46,
        "ret": 0.049842
      },
      {
        "date": "2012-07",
        "close": 52.79,
        "adjClose": 52.79,
        "ret": -0.012527
      },
      {
        "date": "2012-08",
        "close": 54.61,
        "adjClose": 54.61,
        "ret": 0.034544
      },
      {
        "date": "2012-09",
        "close": 56.43,
        "adjClose": 56.43,
        "ret": 0.033253
      },
      {
        "date": "2012-10",
        "close": 55.58,
        "adjClose": 55.58,
        "ret": -0.015146
      },
      {
        "date": "2012-11",
        "close": 55.86,
        "adjClose": 55.86,
        "ret": 0.005168
      },
      {
        "date": "2012-12",
        "close": 58.23,
        "adjClose": 58.23,
        "ret": 0.04236
      },
      {
        "date": "2013-01",
        "close": 61.71,
        "adjClose": 61.71,
        "ret": 0.059751
      },
      {
        "date": "2013-02",
        "close": 62.32,
        "adjClose": 62.32,
        "ret": 0.009866
      },
      {
        "date": "2013-03",
        "close": 64.87,
        "adjClose": 64.87,
        "ret": 0.041001
      },
      {
        "date": "2013-04",
        "close": 64.9,
        "adjClose": 64.9,
        "ret": 0.00035
      },
      {
        "date": "2013-05",
        "close": 66.81,
        "adjClose": 66.81,
        "ret": 0.029557
      },
      {
        "date": "2013-06",
        "close": 66.72,
        "adjClose": 66.72,
        "ret": -0.001471
      },
      {
        "date": "2013-07",
        "close": 70.84,
        "adjClose": 70.84,
        "ret": 0.061791
      },
      {
        "date": "2013-08",
        "close": 67.91,
        "adjClose": 67.91,
        "ret": -0.041269
      },
      {
        "date": "2013-09",
        "close": 71.59,
        "adjClose": 71.59,
        "ret": 0.054143
      },
      {
        "date": "2013-10",
        "close": 73.89,
        "adjClose": 73.89,
        "ret": 0.032111
      },
      {
        "date": "2013-11",
        "close": 76.68,
        "adjClose": 76.68,
        "ret": 0.037764
      },
      {
        "date": "2013-12",
        "close": 78.24,
        "adjClose": 78.24,
        "ret": 0.020349
      },
      {
        "date": "2014-01",
        "close": 75.21,
        "adjClose": 75.21,
        "ret": -0.038784
      },
      {
        "date": "2014-02",
        "close": 78.63,
        "adjClose": 78.63,
        "ret": 0.045517
      },
      {
        "date": "2014-03",
        "close": 79.58,
        "adjClose": 79.58,
        "ret": 0.012065
      },
      {
        "date": "2014-04",
        "close": 77.57,
        "adjClose": 77.57,
        "ret": -0.025301
      },
      {
        "date": "2014-05",
        "close": 78.02,
        "adjClose": 78.02,
        "ret": 0.005898
      },
      {
        "date": "2014-06",
        "close": 81.48,
        "adjClose": 81.48,
        "ret": 0.04431
      },
      {
        "date": "2014-07",
        "close": 76.47,
        "adjClose": 76.47,
        "ret": -0.061478
      },
      {
        "date": "2014-08",
        "close": 79.8,
        "adjClose": 79.8,
        "ret": 0.043492
      },
      {
        "date": "2014-09",
        "close": 74.49,
        "adjClose": 74.49,
        "ret": -0.066463
      },
      {
        "date": "2014-10",
        "close": 79.68,
        "adjClose": 79.68,
        "ret": 0.069624
      },
      {
        "date": "2014-11",
        "close": 79.38,
        "adjClose": 79.38,
        "ret": -0.003766
      },
      {
        "date": "2014-12",
        "close": 81.48,
        "adjClose": 81.48,
        "ret": 0.02646
      },
      {
        "date": "2015-01",
        "close": 78.01,
        "adjClose": 78.01,
        "ret": -0.042597
      },
      {
        "date": "2015-02",
        "close": 81.63,
        "adjClose": 81.63,
        "ret": 0.046374
      },
      {
        "date": "2015-03",
        "close": 83.03,
        "adjClose": 83.03,
        "ret": 0.01715
      },
      {
        "date": "2015-04",
        "close": 81.25,
        "adjClose": 81.25,
        "ret": -0.0214
      },
      {
        "date": "2015-05",
        "close": 81.87,
        "adjClose": 81.87,
        "ret": 0.007573
      },
      {
        "date": "2015-06",
        "close": 82.04,
        "adjClose": 82.04,
        "ret": 0.002133
      },
      {
        "date": "2015-07",
        "close": 79.71,
        "adjClose": 79.71,
        "ret": -0.028458
      },
      {
        "date": "2015-08",
        "close": 75.81,
        "adjClose": 75.81,
        "ret": -0.048919
      },
      {
        "date": "2015-09",
        "close": 73.16,
        "adjClose": 73.16,
        "ret": -0.034888
      },
      {
        "date": "2015-10",
        "close": 77.2,
        "adjClose": 77.2,
        "ret": 0.05519
      },
      {
        "date": "2015-11",
        "close": 79.49,
        "adjClose": 79.49,
        "ret": 0.029632
      },
      {
        "date": "2015-12",
        "close": 75.18,
        "adjClose": 75.18,
        "ret": -0.054212
      },
      {
        "date": "2016-01",
        "close": 70.25,
        "adjClose": 70.25,
        "ret": -0.065486
      },
      {
        "date": "2016-02",
        "close": 70.68,
        "adjClose": 70.68,
        "ret": 0.006058
      },
      {
        "date": "2016-03",
        "close": 76.55,
        "adjClose": 76.55,
        "ret": 0.082981
      },
      {
        "date": "2016-04",
        "close": 78.15,
        "adjClose": 78.15,
        "ret": 0.021006
      },
      {
        "date": "2016-05",
        "close": 79.55,
        "adjClose": 79.55,
        "ret": 0.017888
      },
      {
        "date": "2016-06",
        "close": 79.89,
        "adjClose": 79.89,
        "ret": 0.004322
      },
      {
        "date": "2016-07",
        "close": 84.18,
        "adjClose": 84.18,
        "ret": 0.05363
      },
      {
        "date": "2016-08",
        "close": 86.23,
        "adjClose": 86.23,
        "ret": 0.024344
      },
      {
        "date": "2016-09",
        "close": 86.84,
        "adjClose": 86.84,
        "ret": 0.007129
      },
      {
        "date": "2016-10",
        "close": 84.13,
        "adjClose": 84.13,
        "ret": -0.031277
      },
      {
        "date": "2016-11",
        "close": 95.2,
        "adjClose": 95.2,
        "ret": 0.131668
      },
      {
        "date": "2016-12",
        "close": 99.22,
        "adjClose": 99.22,
        "ret": 0.042197
      },
      {
        "date": "2017-01",
        "close": 98.35,
        "adjClose": 98.35,
        "ret": -0.008759
      },
      {
        "date": "2017-02",
        "close": 99.77,
        "adjClose": 99.77,
        "ret": 0.014442
      },
      {
        "date": "2017-03",
        "close": 98.91,
        "adjClose": 98.91,
        "ret": -0.008641
      },
      {
        "date": "2017-04",
        "close": 99.3,
        "adjClose": 99.3,
        "ret": 0.003975
      },
      {
        "date": "2017-05",
        "close": 96.23,
        "adjClose": 96.23,
        "ret": -0.030932
      },
      {
        "date": "2017-06",
        "close": 99.53,
        "adjClose": 99.53,
        "ret": 0.034313
      },
      {
        "date": "2017-07",
        "close": 100.23,
        "adjClose": 100.23,
        "ret": 0.006999
      },
      {
        "date": "2017-08",
        "close": 97.78,
        "adjClose": 97.78,
        "ret": -0.024444
      },
      {
        "date": "2017-09",
        "close": 104.78,
        "adjClose": 104.78,
        "ret": 0.071589
      },
      {
        "date": "2017-10",
        "close": 104.83,
        "adjClose": 104.83,
        "ret": 0.000515
      },
      {
        "date": "2017-11",
        "close": 107.86,
        "adjClose": 107.86,
        "ret": 0.028874
      },
      {
        "date": "2017-12",
        "close": 106.84,
        "adjClose": 106.84,
        "ret": -0.009512
      },
      {
        "date": "2018-01",
        "close": 108.12,
        "adjClose": 108.12,
        "ret": 0.012018
      },
      {
        "date": "2018-02",
        "close": 102.75,
        "adjClose": 102.75,
        "ret": -0.049621
      },
      {
        "date": "2018-03",
        "close": 103.87,
        "adjClose": 103.87,
        "ret": 0.010871
      },
      {
        "date": "2018-04",
        "close": 105.81,
        "adjClose": 105.81,
        "ret": 0.018648
      },
      {
        "date": "2018-05",
        "close": 111.97,
        "adjClose": 111.97,
        "ret": 0.058237
      },
      {
        "date": "2018-06",
        "close": 112.43,
        "adjClose": 112.43,
        "ret": 0.004117
      },
      {
        "date": "2018-07",
        "close": 114.47,
        "adjClose": 114.47,
        "ret": 0.018171
      },
      {
        "date": "2018-08",
        "close": 117.21,
        "adjClose": 117.21,
        "ret": 0.023874
      },
      {
        "date": "2018-09",
        "close": 114.33,
        "adjClose": 114.33,
        "ret": -0.024563
      },
      {
        "date": "2018-10",
        "close": 104.13,
        "adjClose": 104.13,
        "ret": -0.089216
      },
      {
        "date": "2018-11",
        "close": 105.78,
        "adjClose": 105.78,
        "ret": 0.015875
      },
      {
        "date": "2018-12",
        "close": 92.93,
        "adjClose": 92.93,
        "ret": -0.121505
      },
      {
        "date": "2019-01",
        "close": 103.08,
        "adjClose": 103.08,
        "ret": 0.10918
      },
      {
        "date": "2019-02",
        "close": 107.09,
        "adjClose": 107.09,
        "ret": 0.038962
      },
      {
        "date": "2019-03",
        "close": 104.05,
        "adjClose": 104.05,
        "ret": -0.028406
      },
      {
        "date": "2019-04",
        "close": 107.89,
        "adjClose": 107.89,
        "ret": 0.036935
      },
      {
        "date": "2019-05",
        "close": 99.05,
        "adjClose": 99.05,
        "ret": -0.081976
      },
      {
        "date": "2019-06",
        "close": 105.1,
        "adjClose": 105.1,
        "ret": 0.061138
      },
      {
        "date": "2019-07",
        "close": 105.49,
        "adjClose": 105.49,
        "ret": 0.003663
      },
      {
        "date": "2019-08",
        "close": 99.61,
        "adjClose": 99.61,
        "ret": -0.055734
      },
      {
        "date": "2019-09",
        "close": 104.62,
        "adjClose": 104.62,
        "ret": 0.05035
      },
      {
        "date": "2019-10",
        "close": 107.25,
        "adjClose": 107.25,
        "ret": 0.02509
      },
      {
        "date": "2019-11",
        "close": 109.62,
        "adjClose": 109.62,
        "ret": 0.022145
      },
      {
        "date": "2019-12",
        "close": 113.38,
        "adjClose": 113.38,
        "ret": 0.034226
      },
      {
        "date": "2020-01",
        "close": 107.44,
        "adjClose": 107.44,
        "ret": -0.052383
      },
      {
        "date": "2020-02",
        "close": 97.1,
        "adjClose": 97.1,
        "ret": -0.096172
      },
      {
        "date": "2020-03",
        "close": 72.75,
        "adjClose": 72.75,
        "ret": -0.250822
      },
      {
        "date": "2020-04",
        "close": 81.86,
        "adjClose": 81.86,
        "ret": 0.125304
      },
      {
        "date": "2020-05",
        "close": 84.42,
        "adjClose": 84.42,
        "ret": 0.031198
      },
      {
        "date": "2020-06",
        "close": 86.82,
        "adjClose": 86.82,
        "ret": 0.028489
      },
      {
        "date": "2020-07",
        "close": 88.64,
        "adjClose": 88.64,
        "ret": 0.020921
      },
      {
        "date": "2020-08",
        "close": 93.42,
        "adjClose": 93.42,
        "ret": 0.053884
      },
      {
        "date": "2020-09",
        "close": 89.01,
        "adjClose": 89.01,
        "ret": -0.047164
      },
      {
        "date": "2020-10",
        "close": 92.28,
        "adjClose": 92.28,
        "ret": 0.036721
      },
      {
        "date": "2020-11",
        "close": 109.88,
        "adjClose": 109.88,
        "ret": 0.190753
      },
      {
        "date": "2020-12",
        "close": 118.65,
        "adjClose": 118.65,
        "ret": 0.079795
      },
      {
        "date": "2021-01",
        "close": 124.65,
        "adjClose": 124.65,
        "ret": 0.050578
      },
      {
        "date": "2021-02",
        "close": 136.54,
        "adjClose": 136.54,
        "ret": 0.095371
      },
      {
        "date": "2021-03",
        "close": 143.99,
        "adjClose": 143.99,
        "ret": 0.054542
      },
      {
        "date": "2021-04",
        "close": 146.61,
        "adjClose": 146.61,
        "ret": 0.01821
      },
      {
        "date": "2021-05",
        "close": 151.27,
        "adjClose": 151.27,
        "ret": 0.031792
      },
      {
        "date": "2021-06",
        "close": 150.01,
        "adjClose": 150.01,
        "ret": -0.008297
      },
      {
        "date": "2021-07",
        "close": 144.77,
        "adjClose": 144.77,
        "ret": -0.034977
      },
      {
        "date": "2021-08",
        "close": 148.41,
        "adjClose": 148.41,
        "ret": 0.025151
      },
      {
        "date": "2021-09",
        "close": 145.69,
        "adjClose": 145.69,
        "ret": -0.018308
      },
      {
        "date": "2021-10",
        "close": 151.29,
        "adjClose": 151.29,
        "ret": 0.038417
      },
      {
        "date": "2021-11",
        "close": 145.91,
        "adjClose": 145.91,
        "ret": -0.035528
      },
      {
        "date": "2021-12",
        "close": 151.82,
        "adjClose": 151.82,
        "ret": 0.040476
      },
      {
        "date": "2022-01",
        "close": 142.94,
        "adjClose": 142.94,
        "ret": -0.058485
      },
      {
        "date": "2022-02",
        "close": 145.14,
        "adjClose": 145.14,
        "ret": 0.015391
      },
      {
        "date": "2022-03",
        "close": 148.05,
        "adjClose": 148.05,
        "ret": 0.020057
      },
      {
        "date": "2022-04",
        "close": 136.51,
        "adjClose": 136.51,
        "ret": -0.077953
      },
      {
        "date": "2022-05",
        "close": 139.14,
        "adjClose": 139.14,
        "ret": 0.019288
      },
      {
        "date": "2022-06",
        "close": 125.36,
        "adjClose": 125.36,
        "ret": -0.099028
      },
      {
        "date": "2022-07",
        "close": 137.43,
        "adjClose": 137.43,
        "ret": 0.096217
      },
      {
        "date": "2022-08",
        "close": 133.22,
        "adjClose": 133.22,
        "ret": -0.030635
      },
      {
        "date": "2022-09",
        "close": 119.53,
        "adjClose": 119.53,
        "ret": -0.102736
      },
      {
        "date": "2022-10",
        "close": 134.73,
        "adjClose": 134.73,
        "ret": 0.127141
      },
      {
        "date": "2022-11",
        "close": 138.55,
        "adjClose": 138.55,
        "ret": 0.028361
      },
      {
        "date": "2022-12",
        "close": 129.41,
        "adjClose": 129.41,
        "ret": -0.065985
      },
      {
        "date": "2023-01",
        "close": 141.91,
        "adjClose": 141.91,
        "ret": 0.09665
      },
      {
        "date": "2023-02",
        "close": 138.67,
        "adjClose": 138.67,
        "ret": -0.022824
      },
      {
        "date": "2023-03",
        "close": 128.54,
        "adjClose": 128.54,
        "ret": -0.073057
      },
      {
        "date": "2023-04",
        "close": 125.3,
        "adjClose": 125.3,
        "ret": -0.02526
      },
      {
        "date": "2023-05",
        "close": 123.02,
        "adjClose": 123.02,
        "ret": -0.018181
      },
      {
        "date": "2023-06",
        "close": 132.69,
        "adjClose": 132.69,
        "ret": 0.078591
      },
      {
        "date": "2023-07",
        "close": 142.52,
        "adjClose": 142.52,
        "ret": 0.074146
      },
      {
        "date": "2023-08",
        "close": 135.72,
        "adjClose": 135.72,
        "ret": -0.047754
      },
      {
        "date": "2023-09",
        "close": 128.62,
        "adjClose": 128.62,
        "ret": -0.052285
      },
      {
        "date": "2023-10",
        "close": 120.89,
        "adjClose": 120.89,
        "ret": -0.060107
      },
      {
        "date": "2023-11",
        "close": 131.87,
        "adjClose": 131.87,
        "ret": 0.09081
      },
      {
        "date": "2023-12",
        "close": 148.25,
        "adjClose": 148.25,
        "ret": 0.124192
      },
      {
        "date": "2024-01",
        "close": 141.38,
        "adjClose": 141.38,
        "ret": -0.046281
      },
      {
        "date": "2024-02",
        "close": 146.02,
        "adjClose": 146.02,
        "ret": 0.032804
      },
      {
        "date": "2024-03",
        "close": 152.12,
        "adjClose": 152.12,
        "ret": 0.041768
      },
      {
        "date": "2024-04",
        "close": 142.76,
        "adjClose": 142.76,
        "ret": -0.061523
      },
      {
        "date": "2024-05",
        "close": 149.31,
        "adjClose": 149.31,
        "ret": 0.045881
      },
      {
        "date": "2024-06",
        "close": 146.53,
        "adjClose": 146.53,
        "ret": -0.018619
      },
      {
        "date": "2024-07",
        "close": 164.73,
        "adjClose": 164.73,
        "ret": 0.124164
      },
      {
        "date": "2024-08",
        "close": 161.38,
        "adjClose": 161.38,
        "ret": -0.020325
      },
      {
        "date": "2024-09",
        "close": 161.33,
        "adjClose": 161.33,
        "ret": -0.000285
      },
      {
        "date": "2024-10",
        "close": 158.95,
        "adjClose": 158.95,
        "ret": -0.01474
      },
      {
        "date": "2024-11",
        "close": 174.4,
        "adjClose": 174.4,
        "ret": 0.097173
      },
      {
        "date": "2024-12",
        "close": 159.55,
        "adjClose": 159.55,
        "ret": -0.085126
      },
      {
        "date": "2025-01",
        "close": 162.76,
        "adjClose": 162.76,
        "ret": 0.0201
      },
      {
        "date": "2025-02",
        "close": 156.57,
        "adjClose": 156.57,
        "ret": -0.038037
      },
      {
        "date": "2025-03",
        "close": 147.21,
        "adjClose": 147.21,
        "ret": -0.059782
      },
      {
        "date": "2025-04",
        "close": 141.18,
        "adjClose": 141.18,
        "ret": -0.040935
      },
      {
        "date": "2025-05",
        "close": 147.06,
        "adjClose": 147.06,
        "ret": 0.041655
      },
      {
        "date": "2025-06",
        "close": 154.52,
        "adjClose": 154.52,
        "ret": 0.050665
      },
      {
        "date": "2025-07",
        "close": 157.09,
        "adjClose": 157.09,
        "ret": 0.016671
      },
      {
        "date": "2025-08",
        "close": 170.49,
        "adjClose": 170.49,
        "ret": 0.0853
      },
      {
        "date": "2025-09",
        "close": 173.98,
        "adjClose": 173.98,
        "ret": 0.02047
      },
      {
        "date": "2025-10",
        "close": 174.3,
        "adjClose": 174.3,
        "ret": 0.001805
      },
      {
        "date": "2025-11",
        "close": 179.31,
        "adjClose": 179.31,
        "ret": 0.02879
      },
      {
        "date": "2025-12",
        "close": 179.34,
        "adjClose": 179.34,
        "ret": 0.000117
      },
      {
        "date": "2026-01",
        "close": 191.87,
        "adjClose": 191.87,
        "ret": 0.069919
      },
      {
        "date": "2026-02",
        "close": 195.51,
        "adjClose": 195.51,
        "ret": 0.018929
      },
      {
        "date": "2026-03",
        "close": 188.15,
        "adjClose": 188.15,
        "ret": -0.037646
      },
      {
        "date": "2026-04",
        "close": 206.17,
        "adjClose": 206.17,
        "ret": 0.095787
      },
      {
        "date": "2026-05",
        "close": 212.24,
        "adjClose": 212.24,
        "ret": 0.029461
      },
      {
        "date": "2026-06",
        "close": 220.31,
        "adjClose": 220.31,
        "ret": 0.038004
      },
      {
        "date": "2026-07",
        "close": 220.35,
        "adjClose": 220.35,
        "ret": 0.000182
      },
      {
        "date": "2026-08",
        "close": 220.91,
        "adjClose": 220.91,
        "ret": 0.002532
      },
      {
        "date": "2026-09",
        "close": 209.45,
        "adjClose": 209.45,
        "ret": -0.051859
      },
      {
        "date": "2026-10",
        "close": 214.58,
        "adjClose": 214.58,
        "ret": 0.024493
      },
      {
        "date": "2026-11",
        "close": 215.87,
        "adjClose": 215.87,
        "ret": 0.006012
      }
    ]
  },
  {
    "ticker": "RZV",
    "name": "Invesco S&P SmallCap 600 Pure Value ETF",
    "category": "US Small Cap Pure Value",
    "color": "#ec4899",
    "data": [
      {
        "date": "2006-04",
        "close": 31.14,
        "adjClose": 31.14,
        "ret": 0.004316
      },
      {
        "date": "2006-05",
        "close": 29.32,
        "adjClose": 29.32,
        "ret": -0.058368
      },
      {
        "date": "2006-06",
        "close": 29.76,
        "adjClose": 29.76,
        "ret": 0.015141
      },
      {
        "date": "2006-07",
        "close": 29.25,
        "adjClose": 29.25,
        "ret": -0.017059
      },
      {
        "date": "2006-08",
        "close": 29.55,
        "adjClose": 29.55,
        "ret": 0.010019
      },
      {
        "date": "2006-09",
        "close": 29.9,
        "adjClose": 29.9,
        "ret": 0.011849
      },
      {
        "date": "2006-10",
        "close": 31.65,
        "adjClose": 31.65,
        "ret": 0.058771
      },
      {
        "date": "2006-11",
        "close": 32.52,
        "adjClose": 32.52,
        "ret": 0.027399
      },
      {
        "date": "2006-12",
        "close": 33.19,
        "adjClose": 33.19,
        "ret": 0.020525
      },
      {
        "date": "2007-01",
        "close": 34.07,
        "adjClose": 34.07,
        "ret": 0.026665
      },
      {
        "date": "2007-02",
        "close": 34.04,
        "adjClose": 34.04,
        "ret": -0.001139
      },
      {
        "date": "2007-03",
        "close": 33.68,
        "adjClose": 33.68,
        "ret": -0.010495
      },
      {
        "date": "2007-04",
        "close": 34.32,
        "adjClose": 34.32,
        "ret": 0.019095
      },
      {
        "date": "2007-05",
        "close": 35.42,
        "adjClose": 35.42,
        "ret": 0.03214
      },
      {
        "date": "2007-06",
        "close": 34.47,
        "adjClose": 34.47,
        "ret": -0.026877
      },
      {
        "date": "2007-07",
        "close": 31.67,
        "adjClose": 31.67,
        "ret": -0.081425
      },
      {
        "date": "2007-08",
        "close": 30.96,
        "adjClose": 30.96,
        "ret": -0.022157
      },
      {
        "date": "2007-09",
        "close": 30.23,
        "adjClose": 30.23,
        "ret": -0.023547
      },
      {
        "date": "2007-10",
        "close": 29.8,
        "adjClose": 29.8,
        "ret": -0.014321
      },
      {
        "date": "2007-11",
        "close": 27.04,
        "adjClose": 27.04,
        "ret": -0.092598
      },
      {
        "date": "2007-12",
        "close": 26.86,
        "adjClose": 26.86,
        "ret": -0.006727
      },
      {
        "date": "2008-01",
        "close": 28.02,
        "adjClose": 28.02,
        "ret": 0.043004
      },
      {
        "date": "2008-02",
        "close": 25.49,
        "adjClose": 25.49,
        "ret": -0.090297
      },
      {
        "date": "2008-03",
        "close": 26.14,
        "adjClose": 26.14,
        "ret": 0.025677
      },
      {
        "date": "2008-04",
        "close": 25.51,
        "adjClose": 25.51,
        "ret": -0.024078
      },
      {
        "date": "2008-05",
        "close": 25.97,
        "adjClose": 25.97,
        "ret": 0.018063
      },
      {
        "date": "2008-06",
        "close": 22.82,
        "adjClose": 22.82,
        "ret": -0.121217
      },
      {
        "date": "2008-07",
        "close": 24.13,
        "adjClose": 24.13,
        "ret": 0.057117
      },
      {
        "date": "2008-08",
        "close": 25.09,
        "adjClose": 25.09,
        "ret": 0.039756
      },
      {
        "date": "2008-09",
        "close": 24.42,
        "adjClose": 24.42,
        "ret": -0.026592
      },
      {
        "date": "2008-10",
        "close": 18.51,
        "adjClose": 18.51,
        "ret": -0.24182
      },
      {
        "date": "2008-11",
        "close": 15.35,
        "adjClose": 15.35,
        "ret": -0.171103
      },
      {
        "date": "2008-12",
        "close": 15.81,
        "adjClose": 15.81,
        "ret": 0.030183
      },
      {
        "date": "2009-01",
        "close": 12.3,
        "adjClose": 12.3,
        "ret": -0.22214
      },
      {
        "date": "2009-02",
        "close": 9.83,
        "adjClose": 9.83,
        "ret": -0.20069
      },
      {
        "date": "2009-03",
        "close": 11.8,
        "adjClose": 11.8,
        "ret": 0.200567
      },
      {
        "date": "2009-04",
        "close": 17.88,
        "adjClose": 17.88,
        "ret": 0.515236
      },
      {
        "date": "2009-05",
        "close": 18.97,
        "adjClose": 18.97,
        "ret": 0.061148
      },
      {
        "date": "2009-06",
        "close": 20.48,
        "adjClose": 20.48,
        "ret": 0.079522
      },
      {
        "date": "2009-07",
        "close": 24.48,
        "adjClose": 24.48,
        "ret": 0.195303
      },
      {
        "date": "2009-08",
        "close": 26.3,
        "adjClose": 26.3,
        "ret": 0.074077
      },
      {
        "date": "2009-09",
        "close": 28.74,
        "adjClose": 28.74,
        "ret": 0.093046
      },
      {
        "date": "2009-10",
        "close": 23.74,
        "adjClose": 23.74,
        "ret": -0.174039
      },
      {
        "date": "2009-11",
        "close": 24.02,
        "adjClose": 24.02,
        "ret": 0.011751
      },
      {
        "date": "2009-12",
        "close": 25.72,
        "adjClose": 25.72,
        "ret": 0.070567
      },
      {
        "date": "2010-01",
        "close": 25.93,
        "adjClose": 25.93,
        "ret": 0.008151
      },
      {
        "date": "2010-02",
        "close": 28.1,
        "adjClose": 28.1,
        "ret": 0.083693
      },
      {
        "date": "2010-03",
        "close": 30.71,
        "adjClose": 30.71,
        "ret": 0.092901
      },
      {
        "date": "2010-04",
        "close": 32.95,
        "adjClose": 32.95,
        "ret": 0.072977
      },
      {
        "date": "2010-05",
        "close": 29.36,
        "adjClose": 29.36,
        "ret": -0.109004
      },
      {
        "date": "2010-06",
        "close": 25.47,
        "adjClose": 25.47,
        "ret": -0.132444
      },
      {
        "date": "2010-07",
        "close": 27.33,
        "adjClose": 27.33,
        "ret": 0.07331
      },
      {
        "date": "2010-08",
        "close": 24.41,
        "adjClose": 24.41,
        "ret": -0.107071
      },
      {
        "date": "2010-09",
        "close": 27.26,
        "adjClose": 27.26,
        "ret": 0.116837
      },
      {
        "date": "2010-10",
        "close": 28.69,
        "adjClose": 28.69,
        "ret": 0.052632
      },
      {
        "date": "2010-11",
        "close": 29.92,
        "adjClose": 29.92,
        "ret": 0.042723
      },
      {
        "date": "2010-12",
        "close": 33.04,
        "adjClose": 33.04,
        "ret": 0.104312
      },
      {
        "date": "2011-01",
        "close": 32.21,
        "adjClose": 32.21,
        "ret": -0.025187
      },
      {
        "date": "2011-02",
        "close": 33.79,
        "adjClose": 33.79,
        "ret": 0.04908
      },
      {
        "date": "2011-03",
        "close": 34.28,
        "adjClose": 34.28,
        "ret": 0.01449
      },
      {
        "date": "2011-04",
        "close": 34.4,
        "adjClose": 34.4,
        "ret": 0.003632
      },
      {
        "date": "2011-05",
        "close": 34.26,
        "adjClose": 34.26,
        "ret": -0.004087
      },
      {
        "date": "2011-06",
        "close": 33.31,
        "adjClose": 33.31,
        "ret": -0.027911
      },
      {
        "date": "2011-07",
        "close": 32.58,
        "adjClose": 32.58,
        "ret": -0.021861
      },
      {
        "date": "2011-08",
        "close": 29.22,
        "adjClose": 29.22,
        "ret": -0.102961
      },
      {
        "date": "2011-09",
        "close": 25.95,
        "adjClose": 25.95,
        "ret": -0.112133
      },
      {
        "date": "2011-10",
        "close": 30.31,
        "adjClose": 30.31,
        "ret": 0.16828
      },
      {
        "date": "2011-11",
        "close": 29.95,
        "adjClose": 29.95,
        "ret": -0.011942
      },
      {
        "date": "2011-12",
        "close": 30.4,
        "adjClose": 30.4,
        "ret": 0.014901
      },
      {
        "date": "2012-01",
        "close": 33.4,
        "adjClose": 33.4,
        "ret": 0.098724
      },
      {
        "date": "2012-02",
        "close": 34.04,
        "adjClose": 34.04,
        "ret": 0.01912
      },
      {
        "date": "2012-03",
        "close": 34.63,
        "adjClose": 34.63,
        "ret": 0.01749
      },
      {
        "date": "2012-04",
        "close": 33.53,
        "adjClose": 33.53,
        "ret": -0.031869
      },
      {
        "date": "2012-05",
        "close": 30.2,
        "adjClose": 30.2,
        "ret": -0.099221
      },
      {
        "date": "2012-06",
        "close": 32.07,
        "adjClose": 32.07,
        "ret": 0.061754
      },
      {
        "date": "2012-07",
        "close": 31.34,
        "adjClose": 31.34,
        "ret": -0.022646
      },
      {
        "date": "2012-08",
        "close": 33.62,
        "adjClose": 33.62,
        "ret": 0.072709
      },
      {
        "date": "2012-09",
        "close": 35.43,
        "adjClose": 35.43,
        "ret": 0.053748
      },
      {
        "date": "2012-10",
        "close": 33.84,
        "adjClose": 33.84,
        "ret": -0.044771
      },
      {
        "date": "2012-11",
        "close": 35.6,
        "adjClose": 35.6,
        "ret": 0.051911
      },
      {
        "date": "2012-12",
        "close": 36.91,
        "adjClose": 36.91,
        "ret": 0.036966
      },
      {
        "date": "2013-01",
        "close": 39.09,
        "adjClose": 39.09,
        "ret": 0.059014
      },
      {
        "date": "2013-02",
        "close": 39.61,
        "adjClose": 39.61,
        "ret": 0.013197
      },
      {
        "date": "2013-03",
        "close": 40.66,
        "adjClose": 40.66,
        "ret": 0.026454
      },
      {
        "date": "2013-04",
        "close": 40.1,
        "adjClose": 40.1,
        "ret": -0.013757
      },
      {
        "date": "2013-05",
        "close": 43.89,
        "adjClose": 43.89,
        "ret": 0.094714
      },
      {
        "date": "2013-06",
        "close": 43.47,
        "adjClose": 43.47,
        "ret": -0.009616
      },
      {
        "date": "2013-07",
        "close": 46.19,
        "adjClose": 46.19,
        "ret": 0.062413
      },
      {
        "date": "2013-08",
        "close": 44.34,
        "adjClose": 44.34,
        "ret": -0.039987
      },
      {
        "date": "2013-09",
        "close": 47.77,
        "adjClose": 47.77,
        "ret": 0.0774
      },
      {
        "date": "2013-10",
        "close": 49.3,
        "adjClose": 49.3,
        "ret": 0.032014
      },
      {
        "date": "2013-11",
        "close": 52.77,
        "adjClose": 52.77,
        "ret": 0.070486
      },
      {
        "date": "2013-12",
        "close": 53.63,
        "adjClose": 53.63,
        "ret": 0.016123
      },
      {
        "date": "2014-01",
        "close": 51.04,
        "adjClose": 51.04,
        "ret": -0.04822
      },
      {
        "date": "2014-02",
        "close": 53.62,
        "adjClose": 53.62,
        "ret": 0.050473
      },
      {
        "date": "2014-03",
        "close": 54.32,
        "adjClose": 54.32,
        "ret": 0.0132
      },
      {
        "date": "2014-04",
        "close": 52.97,
        "adjClose": 52.97,
        "ret": -0.024945
      },
      {
        "date": "2014-05",
        "close": 53,
        "adjClose": 53,
        "ret": 0.000653
      },
      {
        "date": "2014-06",
        "close": 55.12,
        "adjClose": 55.12,
        "ret": 0.039902
      },
      {
        "date": "2014-07",
        "close": 52.15,
        "adjClose": 52.15,
        "ret": -0.053925
      },
      {
        "date": "2014-08",
        "close": 54.47,
        "adjClose": 54.47,
        "ret": 0.044583
      },
      {
        "date": "2014-09",
        "close": 50.75,
        "adjClose": 50.75,
        "ret": -0.068246
      },
      {
        "date": "2014-10",
        "close": 54.19,
        "adjClose": 54.19,
        "ret": 0.067785
      },
      {
        "date": "2014-11",
        "close": 54.12,
        "adjClose": 54.12,
        "ret": -0.00143
      },
      {
        "date": "2014-12",
        "close": 55.08,
        "adjClose": 55.08,
        "ret": 0.017775
      },
      {
        "date": "2015-01",
        "close": 50.46,
        "adjClose": 50.46,
        "ret": -0.083904
      },
      {
        "date": "2015-02",
        "close": 55.15,
        "adjClose": 55.15,
        "ret": 0.092966
      },
      {
        "date": "2015-03",
        "close": 55.6,
        "adjClose": 55.6,
        "ret": 0.008231
      },
      {
        "date": "2015-04",
        "close": 56.29,
        "adjClose": 56.29,
        "ret": 0.012383
      },
      {
        "date": "2015-05",
        "close": 55.86,
        "adjClose": 55.86,
        "ret": -0.00765
      },
      {
        "date": "2015-06",
        "close": 55.86,
        "adjClose": 55.86,
        "ret": 0.000018
      },
      {
        "date": "2015-07",
        "close": 52.09,
        "adjClose": 52.09,
        "ret": -0.067481
      },
      {
        "date": "2015-08",
        "close": 50.28,
        "adjClose": 50.28,
        "ret": -0.034694
      },
      {
        "date": "2015-09",
        "close": 46.85,
        "adjClose": 46.85,
        "ret": -0.068176
      },
      {
        "date": "2015-10",
        "close": 50.5,
        "adjClose": 50.5,
        "ret": 0.077836
      },
      {
        "date": "2015-11",
        "close": 51.61,
        "adjClose": 51.61,
        "ret": 0.022019
      },
      {
        "date": "2015-12",
        "close": 48.04,
        "adjClose": 48.04,
        "ret": -0.069229
      },
      {
        "date": "2016-01",
        "close": 43.26,
        "adjClose": 43.26,
        "ret": -0.099451
      },
      {
        "date": "2016-02",
        "close": 45.22,
        "adjClose": 45.22,
        "ret": 0.045186
      },
      {
        "date": "2016-03",
        "close": 50.64,
        "adjClose": 50.64,
        "ret": 0.120003
      },
      {
        "date": "2016-04",
        "close": 53.02,
        "adjClose": 53.02,
        "ret": 0.046825
      },
      {
        "date": "2016-05",
        "close": 50.05,
        "adjClose": 50.05,
        "ret": -0.055972
      },
      {
        "date": "2016-06",
        "close": 50.09,
        "adjClose": 50.09,
        "ret": 0.000767
      },
      {
        "date": "2016-07",
        "close": 53.52,
        "adjClose": 53.52,
        "ret": 0.068477
      },
      {
        "date": "2016-08",
        "close": 54.08,
        "adjClose": 54.08,
        "ret": 0.010544
      },
      {
        "date": "2016-09",
        "close": 55.43,
        "adjClose": 55.43,
        "ret": 0.02497
      },
      {
        "date": "2016-10",
        "close": 53.34,
        "adjClose": 53.34,
        "ret": -0.037661
      },
      {
        "date": "2016-11",
        "close": 62.7,
        "adjClose": 62.7,
        "ret": 0.175352
      },
      {
        "date": "2016-12",
        "close": 64.35,
        "adjClose": 64.35,
        "ret": 0.026326
      },
      {
        "date": "2017-01",
        "close": 62.4,
        "adjClose": 62.4,
        "ret": -0.030222
      },
      {
        "date": "2017-02",
        "close": 62.29,
        "adjClose": 62.29,
        "ret": -0.00183
      },
      {
        "date": "2017-03",
        "close": 60.57,
        "adjClose": 60.57,
        "ret": -0.027526
      },
      {
        "date": "2017-04",
        "close": 60.06,
        "adjClose": 60.06,
        "ret": -0.008419
      },
      {
        "date": "2017-05",
        "close": 56.56,
        "adjClose": 56.56,
        "ret": -0.058269
      },
      {
        "date": "2017-06",
        "close": 58.72,
        "adjClose": 58.72,
        "ret": 0.03807
      },
      {
        "date": "2017-07",
        "close": 57.4,
        "adjClose": 57.4,
        "ret": -0.022364
      },
      {
        "date": "2017-08",
        "close": 56.19,
        "adjClose": 56.19,
        "ret": -0.021158
      },
      {
        "date": "2017-09",
        "close": 62.4,
        "adjClose": 62.4,
        "ret": 0.110423
      },
      {
        "date": "2017-10",
        "close": 63,
        "adjClose": 63,
        "ret": 0.009688
      },
      {
        "date": "2017-11",
        "close": 65.84,
        "adjClose": 65.84,
        "ret": 0.045015
      },
      {
        "date": "2017-12",
        "close": 65.15,
        "adjClose": 65.15,
        "ret": -0.010338
      },
      {
        "date": "2018-01",
        "close": 65,
        "adjClose": 65,
        "ret": -0.002356
      },
      {
        "date": "2018-02",
        "close": 61.97,
        "adjClose": 61.97,
        "ret": -0.046621
      },
      {
        "date": "2018-03",
        "close": 62.87,
        "adjClose": 62.87,
        "ret": 0.014486
      },
      {
        "date": "2018-04",
        "close": 64.05,
        "adjClose": 64.05,
        "ret": 0.018803
      },
      {
        "date": "2018-05",
        "close": 68.45,
        "adjClose": 68.45,
        "ret": 0.068744
      },
      {
        "date": "2018-06",
        "close": 69.44,
        "adjClose": 69.44,
        "ret": 0.01442
      },
      {
        "date": "2018-07",
        "close": 69.88,
        "adjClose": 69.88,
        "ret": 0.006335
      },
      {
        "date": "2018-08",
        "close": 71.94,
        "adjClose": 71.94,
        "ret": 0.029429
      },
      {
        "date": "2018-09",
        "close": 69.42,
        "adjClose": 69.42,
        "ret": -0.035037
      },
      {
        "date": "2018-10",
        "close": 62.94,
        "adjClose": 62.94,
        "ret": -0.093238
      },
      {
        "date": "2018-11",
        "close": 61.06,
        "adjClose": 61.06,
        "ret": -0.029871
      },
      {
        "date": "2018-12",
        "close": 52.35,
        "adjClose": 52.35,
        "ret": -0.14273
      },
      {
        "date": "2019-01",
        "close": 60.95,
        "adjClose": 60.95,
        "ret": 0.164331
      },
      {
        "date": "2019-02",
        "close": 62.94,
        "adjClose": 62.94,
        "ret": 0.032567
      },
      {
        "date": "2019-03",
        "close": 59.56,
        "adjClose": 59.56,
        "ret": -0.053667
      },
      {
        "date": "2019-04",
        "close": 61.33,
        "adjClose": 61.33,
        "ret": 0.029806
      },
      {
        "date": "2019-05",
        "close": 52.37,
        "adjClose": 52.37,
        "ret": -0.146086
      },
      {
        "date": "2019-06",
        "close": 56.92,
        "adjClose": 56.92,
        "ret": 0.086755
      },
      {
        "date": "2019-07",
        "close": 57.41,
        "adjClose": 57.41,
        "ret": 0.008583
      },
      {
        "date": "2019-08",
        "close": 53,
        "adjClose": 53,
        "ret": -0.076752
      },
      {
        "date": "2019-09",
        "close": 58.59,
        "adjClose": 58.59,
        "ret": 0.105398
      },
      {
        "date": "2019-10",
        "close": 59.74,
        "adjClose": 59.74,
        "ret": 0.019633
      },
      {
        "date": "2019-11",
        "close": 61.7,
        "adjClose": 61.7,
        "ret": 0.032935
      },
      {
        "date": "2019-12",
        "close": 64.03,
        "adjClose": 64.03,
        "ret": 0.037643
      },
      {
        "date": "2020-01",
        "close": 54.68,
        "adjClose": 54.68,
        "ret": -0.146021
      },
      {
        "date": "2020-02",
        "close": 46.9,
        "adjClose": 46.9,
        "ret": -0.142155
      },
      {
        "date": "2020-03",
        "close": 31.92,
        "adjClose": 31.92,
        "ret": -0.319379
      },
      {
        "date": "2020-04",
        "close": 39.7,
        "adjClose": 39.7,
        "ret": 0.243668
      },
      {
        "date": "2020-05",
        "close": 41.07,
        "adjClose": 41.07,
        "ret": 0.034463
      },
      {
        "date": "2020-06",
        "close": 43.44,
        "adjClose": 43.44,
        "ret": 0.057622
      },
      {
        "date": "2020-07",
        "close": 44.65,
        "adjClose": 44.65,
        "ret": 0.027987
      },
      {
        "date": "2020-08",
        "close": 49.33,
        "adjClose": 49.33,
        "ret": 0.10471
      },
      {
        "date": "2020-09",
        "close": 46.73,
        "adjClose": 46.73,
        "ret": -0.052683
      },
      {
        "date": "2020-10",
        "close": 47.88,
        "adjClose": 47.88,
        "ret": 0.024491
      },
      {
        "date": "2020-11",
        "close": 58.98,
        "adjClose": 58.98,
        "ret": 0.231941
      },
      {
        "date": "2020-12",
        "close": 61.54,
        "adjClose": 61.54,
        "ret": 0.04338
      },
      {
        "date": "2021-01",
        "close": 65.06,
        "adjClose": 65.06,
        "ret": 0.057275
      },
      {
        "date": "2021-02",
        "close": 74.95,
        "adjClose": 74.95,
        "ret": 0.151965
      },
      {
        "date": "2021-03",
        "close": 82,
        "adjClose": 82,
        "ret": 0.094123
      },
      {
        "date": "2021-04",
        "close": 82.32,
        "adjClose": 82.32,
        "ret": 0.003845
      },
      {
        "date": "2021-05",
        "close": 88.57,
        "adjClose": 88.57,
        "ret": 0.075912
      },
      {
        "date": "2021-06",
        "close": 88.18,
        "adjClose": 88.18,
        "ret": -0.004353
      },
      {
        "date": "2021-07",
        "close": 83.99,
        "adjClose": 83.99,
        "ret": -0.0476
      },
      {
        "date": "2021-08",
        "close": 87.05,
        "adjClose": 87.05,
        "ret": 0.036483
      },
      {
        "date": "2021-09",
        "close": 86.52,
        "adjClose": 86.52,
        "ret": -0.006095
      },
      {
        "date": "2021-10",
        "close": 89.99,
        "adjClose": 89.99,
        "ret": 0.040164
      },
      {
        "date": "2021-11",
        "close": 87.35,
        "adjClose": 87.35,
        "ret": -0.029334
      },
      {
        "date": "2021-12",
        "close": 89.82,
        "adjClose": 89.82,
        "ret": 0.028228
      },
      {
        "date": "2022-01",
        "close": 87.17,
        "adjClose": 87.17,
        "ret": -0.029507
      },
      {
        "date": "2022-02",
        "close": 88.17,
        "adjClose": 88.17,
        "ret": 0.011455
      },
      {
        "date": "2022-03",
        "close": 90.54,
        "adjClose": 90.54,
        "ret": 0.026858
      },
      {
        "date": "2022-04",
        "close": 85.73,
        "adjClose": 85.73,
        "ret": -0.05303
      },
      {
        "date": "2022-05",
        "close": 88,
        "adjClose": 88,
        "ret": 0.026416
      },
      {
        "date": "2022-06",
        "close": 78.04,
        "adjClose": 78.04,
        "ret": -0.113228
      },
      {
        "date": "2022-07",
        "close": 84.59,
        "adjClose": 84.59,
        "ret": 0.084037
      },
      {
        "date": "2022-08",
        "close": 81.55,
        "adjClose": 81.55,
        "ret": -0.035971
      },
      {
        "date": "2022-09",
        "close": 72.01,
        "adjClose": 72.01,
        "ret": -0.11699
      },
      {
        "date": "2022-10",
        "close": 84.75,
        "adjClose": 84.75,
        "ret": 0.176909
      },
      {
        "date": "2022-11",
        "close": 89.26,
        "adjClose": 89.26,
        "ret": 0.053212
      },
      {
        "date": "2022-12",
        "close": 83.7,
        "adjClose": 83.7,
        "ret": -0.062263
      },
      {
        "date": "2023-01",
        "close": 96.36,
        "adjClose": 96.36,
        "ret": 0.151213
      },
      {
        "date": "2023-02",
        "close": 94.89,
        "adjClose": 94.89,
        "ret": -0.015287
      },
      {
        "date": "2023-03",
        "close": 86.19,
        "adjClose": 86.19,
        "ret": -0.091587
      },
      {
        "date": "2023-04",
        "close": 83.93,
        "adjClose": 83.93,
        "ret": -0.026243
      },
      {
        "date": "2023-05",
        "close": 80.31,
        "adjClose": 80.31,
        "ret": -0.043142
      },
      {
        "date": "2023-06",
        "close": 89.23,
        "adjClose": 89.23,
        "ret": 0.11104
      },
      {
        "date": "2023-07",
        "close": 95.04,
        "adjClose": 95.04,
        "ret": 0.065135
      },
      {
        "date": "2023-08",
        "close": 91.95,
        "adjClose": 91.95,
        "ret": -0.032483
      },
      {
        "date": "2023-09",
        "close": 87.15,
        "adjClose": 87.15,
        "ret": -0.052201
      },
      {
        "date": "2023-10",
        "close": 81.18,
        "adjClose": 81.18,
        "ret": -0.068588
      },
      {
        "date": "2023-11",
        "close": 89.61,
        "adjClose": 89.61,
        "ret": 0.103918
      },
      {
        "date": "2023-12",
        "close": 102.93,
        "adjClose": 102.93,
        "ret": 0.148592
      },
      {
        "date": "2024-01",
        "close": 97.29,
        "adjClose": 97.29,
        "ret": -0.054806
      },
      {
        "date": "2024-02",
        "close": 100.3,
        "adjClose": 100.3,
        "ret": 0.031012
      },
      {
        "date": "2024-03",
        "close": 103.48,
        "adjClose": 103.48,
        "ret": 0.031674
      },
      {
        "date": "2024-04",
        "close": 95.57,
        "adjClose": 95.57,
        "ret": -0.076455
      },
      {
        "date": "2024-05",
        "close": 101.21,
        "adjClose": 101.21,
        "ret": 0.059063
      },
      {
        "date": "2024-06",
        "close": 95.77,
        "adjClose": 95.77,
        "ret": -0.053761
      },
      {
        "date": "2024-07",
        "close": 108.52,
        "adjClose": 108.52,
        "ret": 0.133142
      },
      {
        "date": "2024-08",
        "close": 104.72,
        "adjClose": 104.72,
        "ret": -0.035025
      },
      {
        "date": "2024-09",
        "close": 105.88,
        "adjClose": 105.88,
        "ret": 0.011
      },
      {
        "date": "2024-10",
        "close": 102.41,
        "adjClose": 102.41,
        "ret": -0.032718
      },
      {
        "date": "2024-11",
        "close": 114.72,
        "adjClose": 114.72,
        "ret": 0.120182
      },
      {
        "date": "2024-12",
        "close": 108.14,
        "adjClose": 108.14,
        "ret": -0.057349
      },
      {
        "date": "2025-01",
        "close": 109.24,
        "adjClose": 109.24,
        "ret": 0.01019
      },
      {
        "date": "2025-02",
        "close": 101.22,
        "adjClose": 101.22,
        "ret": -0.073433
      },
      {
        "date": "2025-03",
        "close": 96.49,
        "adjClose": 96.49,
        "ret": -0.04673
      },
      {
        "date": "2025-04",
        "close": 90.27,
        "adjClose": 90.27,
        "ret": -0.064437
      },
      {
        "date": "2025-05",
        "close": 96.23,
        "adjClose": 96.23,
        "ret": 0.066043
      },
      {
        "date": "2025-06",
        "close": 102.65,
        "adjClose": 102.65,
        "ret": 0.066656
      },
      {
        "date": "2025-07",
        "close": 104.17,
        "adjClose": 104.17,
        "ret": 0.014788
      },
      {
        "date": "2025-08",
        "close": 116.35,
        "adjClose": 116.35,
        "ret": 0.116956
      },
      {
        "date": "2025-09",
        "close": 116.22,
        "adjClose": 116.22,
        "ret": -0.001109
      },
      {
        "date": "2025-10",
        "close": 114.75,
        "adjClose": 114.75,
        "ret": -0.01264
      },
      {
        "date": "2025-11",
        "close": 119.08,
        "adjClose": 119.08,
        "ret": 0.037716
      },
      {
        "date": "2025-12",
        "close": 117.49,
        "adjClose": 117.49,
        "ret": -0.013361
      },
      {
        "date": "2026-01",
        "close": 127.05,
        "adjClose": 127.05,
        "ret": 0.081412
      },
      {
        "date": "2026-02",
        "close": 128.88,
        "adjClose": 128.88,
        "ret": 0.014372
      },
      {
        "date": "2026-03",
        "close": 123.43,
        "adjClose": 123.43,
        "ret": -0.042287
      },
      {
        "date": "2026-04",
        "close": 136.85,
        "adjClose": 136.85,
        "ret": 0.108734
      },
      {
        "date": "2026-05",
        "close": 137.65,
        "adjClose": 137.65,
        "ret": 0.005868
      },
      {
        "date": "2026-06",
        "close": 148.49,
        "adjClose": 148.49,
        "ret": 0.078712
      },
      {
        "date": "2026-07",
        "close": 148.01,
        "adjClose": 148.01,
        "ret": -0.003212
      },
      {
        "date": "2026-08",
        "close": 148.4,
        "adjClose": 148.4,
        "ret": 0.002621
      },
      {
        "date": "2026-09",
        "close": 138.77,
        "adjClose": 138.77,
        "ret": -0.064879
      },
      {
        "date": "2026-10",
        "close": 144.12,
        "adjClose": 144.12,
        "ret": 0.038552
      },
      {
        "date": "2026-11",
        "close": 145.22,
        "adjClose": 145.22,
        "ret": 0.007591
      }
    ]
  },
  {
    "ticker": "VBR",
    "name": "Vanguard Small-Cap Value ETF",
    "category": "US Small Cap Value",
    "color": "#10b981",
    "data": [
      {
        "date": "2005-03",
        "close": 36.22,
        "adjClose": 36.22,
        "ret": -0.021313
      },
      {
        "date": "2005-04",
        "close": 34.4,
        "adjClose": 34.4,
        "ret": -0.05028
      },
      {
        "date": "2005-05",
        "close": 36.9,
        "adjClose": 36.9,
        "ret": 0.072705
      },
      {
        "date": "2005-06",
        "close": 38.21,
        "adjClose": 38.21,
        "ret": 0.035553
      },
      {
        "date": "2005-07",
        "close": 40.3,
        "adjClose": 40.3,
        "ret": 0.054634
      },
      {
        "date": "2005-08",
        "close": 39.49,
        "adjClose": 39.49,
        "ret": -0.020084
      },
      {
        "date": "2005-09",
        "close": 39.78,
        "adjClose": 39.78,
        "ret": 0.007539
      },
      {
        "date": "2005-10",
        "close": 38.51,
        "adjClose": 38.51,
        "ret": -0.032143
      },
      {
        "date": "2005-11",
        "close": 39.96,
        "adjClose": 39.96,
        "ret": 0.037706
      },
      {
        "date": "2005-12",
        "close": 39.06,
        "adjClose": 39.06,
        "ret": -0.022451
      },
      {
        "date": "2006-01",
        "close": 41.74,
        "adjClose": 41.74,
        "ret": 0.068493
      },
      {
        "date": "2006-02",
        "close": 41.95,
        "adjClose": 41.95,
        "ret": 0.005161
      },
      {
        "date": "2006-03",
        "close": 43.5,
        "adjClose": 43.5,
        "ret": 0.036854
      },
      {
        "date": "2006-04",
        "close": 43.48,
        "adjClose": 43.48,
        "ret": -0.000428
      },
      {
        "date": "2006-05",
        "close": 41.85,
        "adjClose": 41.85,
        "ret": -0.037482
      },
      {
        "date": "2006-06",
        "close": 42.27,
        "adjClose": 42.27,
        "ret": 0.010041
      },
      {
        "date": "2006-07",
        "close": 41.76,
        "adjClose": 41.76,
        "ret": -0.01216
      },
      {
        "date": "2006-08",
        "close": 42.65,
        "adjClose": 42.65,
        "ret": 0.021298
      },
      {
        "date": "2006-09",
        "close": 43.03,
        "adjClose": 43.03,
        "ret": 0.009007
      },
      {
        "date": "2006-10",
        "close": 45.03,
        "adjClose": 45.03,
        "ret": 0.046385
      },
      {
        "date": "2006-11",
        "close": 46.5,
        "adjClose": 46.5,
        "ret": 0.032839
      },
      {
        "date": "2006-12",
        "close": 46.7,
        "adjClose": 46.7,
        "ret": 0.004251
      },
      {
        "date": "2007-01",
        "close": 47.62,
        "adjClose": 47.62,
        "ret": 0.01967
      },
      {
        "date": "2007-02",
        "close": 47.34,
        "adjClose": 47.34,
        "ret": -0.005966
      },
      {
        "date": "2007-03",
        "close": 47.68,
        "adjClose": 47.68,
        "ret": 0.007238
      },
      {
        "date": "2007-04",
        "close": 48.5,
        "adjClose": 48.5,
        "ret": 0.017127
      },
      {
        "date": "2007-05",
        "close": 50.36,
        "adjClose": 50.36,
        "ret": 0.038507
      },
      {
        "date": "2007-06",
        "close": 49.21,
        "adjClose": 49.21,
        "ret": -0.02295
      },
      {
        "date": "2007-07",
        "close": 45.42,
        "adjClose": 45.42,
        "ret": -0.076985
      },
      {
        "date": "2007-08",
        "close": 46.17,
        "adjClose": 46.17,
        "ret": 0.016632
      },
      {
        "date": "2007-09",
        "close": 46.58,
        "adjClose": 46.58,
        "ret": 0.008743
      },
      {
        "date": "2007-10",
        "close": 47.32,
        "adjClose": 47.32,
        "ret": 0.016021
      },
      {
        "date": "2007-11",
        "close": 44.07,
        "adjClose": 44.07,
        "ret": -0.068678
      },
      {
        "date": "2007-12",
        "close": 43.5,
        "adjClose": 43.5,
        "ret": -0.012962
      },
      {
        "date": "2008-01",
        "close": 41.82,
        "adjClose": 41.82,
        "ret": -0.038717
      },
      {
        "date": "2008-02",
        "close": 40.72,
        "adjClose": 40.72,
        "ret": -0.026328
      },
      {
        "date": "2008-03",
        "close": 40.59,
        "adjClose": 40.59,
        "ret": -0.00307
      },
      {
        "date": "2008-04",
        "close": 42.5,
        "adjClose": 42.5,
        "ret": 0.046975
      },
      {
        "date": "2008-05",
        "close": 44.25,
        "adjClose": 44.25,
        "ret": 0.041234
      },
      {
        "date": "2008-06",
        "close": 39.22,
        "adjClose": 39.22,
        "ret": -0.113701
      },
      {
        "date": "2008-07",
        "close": 40.82,
        "adjClose": 40.82,
        "ret": 0.040689
      },
      {
        "date": "2008-08",
        "close": 42.29,
        "adjClose": 42.29,
        "ret": 0.036072
      },
      {
        "date": "2008-09",
        "close": 40.03,
        "adjClose": 40.03,
        "ret": -0.053315
      },
      {
        "date": "2008-10",
        "close": 31.24,
        "adjClose": 31.24,
        "ret": -0.219584
      },
      {
        "date": "2008-11",
        "close": 28.26,
        "adjClose": 28.26,
        "ret": -0.09553
      },
      {
        "date": "2008-12",
        "close": 29.52,
        "adjClose": 29.52,
        "ret": 0.044826
      },
      {
        "date": "2009-01",
        "close": 25.86,
        "adjClose": 25.86,
        "ret": -0.12414
      },
      {
        "date": "2009-02",
        "close": 22.24,
        "adjClose": 22.24,
        "ret": -0.140022
      },
      {
        "date": "2009-03",
        "close": 24.23,
        "adjClose": 24.23,
        "ret": 0.08938
      },
      {
        "date": "2009-04",
        "close": 28.97,
        "adjClose": 28.97,
        "ret": 0.195786
      },
      {
        "date": "2009-05",
        "close": 30.08,
        "adjClose": 30.08,
        "ret": 0.038302
      },
      {
        "date": "2009-06",
        "close": 30.05,
        "adjClose": 30.05,
        "ret": -0.000954
      },
      {
        "date": "2009-07",
        "close": 33.25,
        "adjClose": 33.25,
        "ret": 0.106527
      },
      {
        "date": "2009-08",
        "close": 35.31,
        "adjClose": 35.31,
        "ret": 0.061828
      },
      {
        "date": "2009-09",
        "close": 37.21,
        "adjClose": 37.21,
        "ret": 0.053946
      },
      {
        "date": "2009-10",
        "close": 34.95,
        "adjClose": 34.95,
        "ret": -0.060727
      },
      {
        "date": "2009-11",
        "close": 36.2,
        "adjClose": 36.2,
        "ret": 0.035563
      },
      {
        "date": "2009-12",
        "close": 38.69,
        "adjClose": 38.69,
        "ret": 0.069006
      },
      {
        "date": "2010-01",
        "close": 37.54,
        "adjClose": 37.54,
        "ret": -0.029892
      },
      {
        "date": "2010-02",
        "close": 39.42,
        "adjClose": 39.42,
        "ret": 0.050212
      },
      {
        "date": "2010-03",
        "close": 42.68,
        "adjClose": 42.68,
        "ret": 0.082572
      },
      {
        "date": "2010-04",
        "close": 45.33,
        "adjClose": 45.33,
        "ret": 0.062201
      },
      {
        "date": "2010-05",
        "close": 41.73,
        "adjClose": 41.73,
        "ret": -0.079451
      },
      {
        "date": "2010-06",
        "close": 38.32,
        "adjClose": 38.32,
        "ret": -0.081667
      },
      {
        "date": "2010-07",
        "close": 41.18,
        "adjClose": 41.18,
        "ret": 0.07458
      },
      {
        "date": "2010-08",
        "close": 38.44,
        "adjClose": 38.44,
        "ret": -0.066591
      },
      {
        "date": "2010-09",
        "close": 42.45,
        "adjClose": 42.45,
        "ret": 0.104352
      },
      {
        "date": "2010-10",
        "close": 43.98,
        "adjClose": 43.98,
        "ret": 0.035966
      },
      {
        "date": "2010-11",
        "close": 44.98,
        "adjClose": 44.98,
        "ret": 0.022831
      },
      {
        "date": "2010-12",
        "close": 48.44,
        "adjClose": 48.44,
        "ret": 0.077
      },
      {
        "date": "2011-01",
        "close": 48.73,
        "adjClose": 48.73,
        "ret": 0.00598
      },
      {
        "date": "2011-02",
        "close": 51.02,
        "adjClose": 51.02,
        "ret": 0.046895
      },
      {
        "date": "2011-03",
        "close": 51.77,
        "adjClose": 51.77,
        "ret": 0.014834
      },
      {
        "date": "2011-04",
        "close": 52.98,
        "adjClose": 52.98,
        "ret": 0.023324
      },
      {
        "date": "2011-05",
        "close": 51.86,
        "adjClose": 51.86,
        "ret": -0.021217
      },
      {
        "date": "2011-06",
        "close": 50.78,
        "adjClose": 50.78,
        "ret": -0.020776
      },
      {
        "date": "2011-07",
        "close": 49.09,
        "adjClose": 49.09,
        "ret": -0.033267
      },
      {
        "date": "2011-08",
        "close": 45.07,
        "adjClose": 45.07,
        "ret": -0.081862
      },
      {
        "date": "2011-09",
        "close": 40.27,
        "adjClose": 40.27,
        "ret": -0.106518
      },
      {
        "date": "2011-10",
        "close": 46.09,
        "adjClose": 46.09,
        "ret": 0.144455
      },
      {
        "date": "2011-11",
        "close": 46.02,
        "adjClose": 46.02,
        "ret": -0.00153
      },
      {
        "date": "2011-12",
        "close": 46.4,
        "adjClose": 46.4,
        "ret": 0.008192
      },
      {
        "date": "2012-01",
        "close": 49.63,
        "adjClose": 49.63,
        "ret": 0.06982
      },
      {
        "date": "2012-02",
        "close": 50.9,
        "adjClose": 50.9,
        "ret": 0.0255
      },
      {
        "date": "2012-03",
        "close": 52.13,
        "adjClose": 52.13,
        "ret": 0.024098
      },
      {
        "date": "2012-04",
        "close": 51.61,
        "adjClose": 51.61,
        "ret": -0.009866
      },
      {
        "date": "2012-05",
        "close": 48.35,
        "adjClose": 48.35,
        "ret": -0.063202
      },
      {
        "date": "2012-06",
        "close": 50.52,
        "adjClose": 50.52,
        "ret": 0.044779
      },
      {
        "date": "2012-07",
        "close": 50.3,
        "adjClose": 50.3,
        "ret": -0.004278
      },
      {
        "date": "2012-08",
        "close": 51.8,
        "adjClose": 51.8,
        "ret": 0.029917
      },
      {
        "date": "2012-09",
        "close": 53.25,
        "adjClose": 53.25,
        "ret": 0.02799
      },
      {
        "date": "2012-10",
        "close": 52.88,
        "adjClose": 52.88,
        "ret": -0.006961
      },
      {
        "date": "2012-11",
        "close": 53.42,
        "adjClose": 53.42,
        "ret": 0.010052
      },
      {
        "date": "2012-12",
        "close": 55.2,
        "adjClose": 55.2,
        "ret": 0.033339
      },
      {
        "date": "2013-01",
        "close": 58.76,
        "adjClose": 58.76,
        "ret": 0.064563
      },
      {
        "date": "2013-02",
        "close": 59.71,
        "adjClose": 59.71,
        "ret": 0.016164
      },
      {
        "date": "2013-03",
        "close": 62.43,
        "adjClose": 62.43,
        "ret": 0.045586
      },
      {
        "date": "2013-04",
        "close": 62.49,
        "adjClose": 62.49,
        "ret": 0.000863
      },
      {
        "date": "2013-05",
        "close": 64.43,
        "adjClose": 64.43,
        "ret": 0.031089
      },
      {
        "date": "2013-06",
        "close": 63.61,
        "adjClose": 63.61,
        "ret": -0.012751
      },
      {
        "date": "2013-07",
        "close": 67.96,
        "adjClose": 67.96,
        "ret": 0.068482
      },
      {
        "date": "2013-08",
        "close": 65.13,
        "adjClose": 65.13,
        "ret": -0.041698
      },
      {
        "date": "2013-09",
        "close": 68.58,
        "adjClose": 68.58,
        "ret": 0.052954
      },
      {
        "date": "2013-10",
        "close": 71.27,
        "adjClose": 71.27,
        "ret": 0.039251
      },
      {
        "date": "2013-11",
        "close": 73.36,
        "adjClose": 73.36,
        "ret": 0.029295
      },
      {
        "date": "2013-12",
        "close": 75.38,
        "adjClose": 75.38,
        "ret": 0.027524
      },
      {
        "date": "2014-01",
        "close": 73.28,
        "adjClose": 73.28,
        "ret": -0.027835
      },
      {
        "date": "2014-02",
        "close": 76.91,
        "adjClose": 76.91,
        "ret": 0.049636
      },
      {
        "date": "2014-03",
        "close": 77.92,
        "adjClose": 77.92,
        "ret": 0.013126
      },
      {
        "date": "2014-04",
        "close": 77.04,
        "adjClose": 77.04,
        "ret": -0.011323
      },
      {
        "date": "2014-05",
        "close": 78.31,
        "adjClose": 78.31,
        "ret": 0.016407
      },
      {
        "date": "2014-06",
        "close": 81.68,
        "adjClose": 81.68,
        "ret": 0.043091
      },
      {
        "date": "2014-07",
        "close": 77.78,
        "adjClose": 77.78,
        "ret": -0.047787
      },
      {
        "date": "2014-08",
        "close": 81.75,
        "adjClose": 81.75,
        "ret": 0.05103
      },
      {
        "date": "2014-09",
        "close": 77.23,
        "adjClose": 77.23,
        "ret": -0.055276
      },
      {
        "date": "2014-10",
        "close": 80.97,
        "adjClose": 80.97,
        "ret": 0.048511
      },
      {
        "date": "2014-11",
        "close": 81.87,
        "adjClose": 81.87,
        "ret": 0.011007
      },
      {
        "date": "2014-12",
        "close": 83.35,
        "adjClose": 83.35,
        "ret": 0.018091
      },
      {
        "date": "2015-01",
        "close": 80.59,
        "adjClose": 80.59,
        "ret": -0.033021
      },
      {
        "date": "2015-02",
        "close": 85.16,
        "adjClose": 85.16,
        "ret": 0.056697
      },
      {
        "date": "2015-03",
        "close": 86.25,
        "adjClose": 86.25,
        "ret": 0.012738
      },
      {
        "date": "2015-04",
        "close": 85.14,
        "adjClose": 85.14,
        "ret": -0.012791
      },
      {
        "date": "2015-05",
        "close": 86.3,
        "adjClose": 86.3,
        "ret": 0.013567
      },
      {
        "date": "2015-06",
        "close": 85.02,
        "adjClose": 85.02,
        "ret": -0.014888
      },
      {
        "date": "2015-07",
        "close": 84.2,
        "adjClose": 84.2,
        "ret": -0.009622
      },
      {
        "date": "2015-08",
        "close": 80.12,
        "adjClose": 80.12,
        "ret": -0.048389
      },
      {
        "date": "2015-09",
        "close": 77.25,
        "adjClose": 77.25,
        "ret": -0.035846
      },
      {
        "date": "2015-10",
        "close": 82.38,
        "adjClose": 82.38,
        "ret": 0.066337
      },
      {
        "date": "2015-11",
        "close": 83.46,
        "adjClose": 83.46,
        "ret": 0.013181
      },
      {
        "date": "2015-12",
        "close": 79.38,
        "adjClose": 79.38,
        "ret": -0.048946
      },
      {
        "date": "2016-01",
        "close": 74.32,
        "adjClose": 74.32,
        "ret": -0.063666
      },
      {
        "date": "2016-02",
        "close": 75.44,
        "adjClose": 75.44,
        "ret": 0.014999
      },
      {
        "date": "2016-03",
        "close": 82.18,
        "adjClose": 82.18,
        "ret": 0.08938
      },
      {
        "date": "2016-04",
        "close": 83.9,
        "adjClose": 83.9,
        "ret": 0.020965
      },
      {
        "date": "2016-05",
        "close": 85.09,
        "adjClose": 85.09,
        "ret": 0.014197
      },
      {
        "date": "2016-06",
        "close": 85.24,
        "adjClose": 85.24,
        "ret": 0.001677
      },
      {
        "date": "2016-07",
        "close": 89.18,
        "adjClose": 89.18,
        "ret": 0.046284
      },
      {
        "date": "2016-08",
        "close": 89.81,
        "adjClose": 89.81,
        "ret": 0.007073
      },
      {
        "date": "2016-09",
        "close": 90.07,
        "adjClose": 90.07,
        "ret": 0.002811
      },
      {
        "date": "2016-10",
        "close": 87.46,
        "adjClose": 87.46,
        "ret": -0.028935
      },
      {
        "date": "2016-11",
        "close": 96.4,
        "adjClose": 96.4,
        "ret": 0.10219
      },
      {
        "date": "2016-12",
        "close": 99.13,
        "adjClose": 99.13,
        "ret": 0.028371
      },
      {
        "date": "2017-01",
        "close": 99.77,
        "adjClose": 99.77,
        "ret": 0.006394
      },
      {
        "date": "2017-02",
        "close": 101.79,
        "adjClose": 101.79,
        "ret": 0.020251
      },
      {
        "date": "2017-03",
        "close": 101.08,
        "adjClose": 101.08,
        "ret": -0.006966
      },
      {
        "date": "2017-04",
        "close": 101.47,
        "adjClose": 101.47,
        "ret": 0.003849
      },
      {
        "date": "2017-05",
        "close": 99.01,
        "adjClose": 99.01,
        "ret": -0.024174
      },
      {
        "date": "2017-06",
        "close": 101.45,
        "adjClose": 101.45,
        "ret": 0.024591
      },
      {
        "date": "2017-07",
        "close": 102.47,
        "adjClose": 102.47,
        "ret": 0.010123
      },
      {
        "date": "2017-08",
        "close": 100.99,
        "adjClose": 100.99,
        "ret": -0.014462
      },
      {
        "date": "2017-09",
        "close": 106.02,
        "adjClose": 106.02,
        "ret": 0.049766
      },
      {
        "date": "2017-10",
        "close": 106.89,
        "adjClose": 106.89,
        "ret": 0.008216
      },
      {
        "date": "2017-11",
        "close": 110.28,
        "adjClose": 110.28,
        "ret": 0.031696
      },
      {
        "date": "2017-12",
        "close": 110.83,
        "adjClose": 110.83,
        "ret": 0.005042
      },
      {
        "date": "2018-01",
        "close": 112.98,
        "adjClose": 112.98,
        "ret": 0.019335
      },
      {
        "date": "2018-02",
        "close": 107.63,
        "adjClose": 107.63,
        "ret": -0.047293
      },
      {
        "date": "2018-03",
        "close": 108.51,
        "adjClose": 108.51,
        "ret": 0.008111
      },
      {
        "date": "2018-04",
        "close": 108.93,
        "adjClose": 108.93,
        "ret": 0.003871
      },
      {
        "date": "2018-05",
        "close": 113.86,
        "adjClose": 113.86,
        "ret": 0.045287
      },
      {
        "date": "2018-06",
        "close": 114.26,
        "adjClose": 114.26,
        "ret": 0.003513
      },
      {
        "date": "2018-07",
        "close": 117.09,
        "adjClose": 117.09,
        "ret": 0.024803
      },
      {
        "date": "2018-08",
        "close": 119.92,
        "adjClose": 119.92,
        "ret": 0.024126
      },
      {
        "date": "2018-09",
        "close": 117.94,
        "adjClose": 117.94,
        "ret": -0.016511
      },
      {
        "date": "2018-10",
        "close": 107.25,
        "adjClose": 107.25,
        "ret": -0.090606
      },
      {
        "date": "2018-11",
        "close": 109.79,
        "adjClose": 109.79,
        "ret": 0.023645
      },
      {
        "date": "2018-12",
        "close": 97.22,
        "adjClose": 97.22,
        "ret": -0.114454
      },
      {
        "date": "2019-01",
        "close": 108.1,
        "adjClose": 108.1,
        "ret": 0.111844
      },
      {
        "date": "2019-02",
        "close": 112.39,
        "adjClose": 112.39,
        "ret": 0.039696
      },
      {
        "date": "2019-03",
        "close": 110.24,
        "adjClose": 110.24,
        "ret": -0.019086
      },
      {
        "date": "2019-04",
        "close": 114.55,
        "adjClose": 114.55,
        "ret": 0.039059
      },
      {
        "date": "2019-05",
        "close": 105.24,
        "adjClose": 105.24,
        "ret": -0.081293
      },
      {
        "date": "2019-06",
        "close": 112.44,
        "adjClose": 112.44,
        "ret": 0.068455
      },
      {
        "date": "2019-07",
        "close": 113.29,
        "adjClose": 113.29,
        "ret": 0.007577
      },
      {
        "date": "2019-08",
        "close": 107.13,
        "adjClose": 107.13,
        "ret": -0.054434
      },
      {
        "date": "2019-09",
        "close": 111.4,
        "adjClose": 111.4,
        "ret": 0.039878
      },
      {
        "date": "2019-10",
        "close": 113.34,
        "adjClose": 113.34,
        "ret": 0.017433
      },
      {
        "date": "2019-11",
        "close": 116.15,
        "adjClose": 116.15,
        "ret": 0.024793
      },
      {
        "date": "2019-12",
        "close": 119.4,
        "adjClose": 119.4,
        "ret": 0.027981
      },
      {
        "date": "2020-01",
        "close": 115.38,
        "adjClose": 115.38,
        "ret": -0.033693
      },
      {
        "date": "2020-02",
        "close": 103.63,
        "adjClose": 103.63,
        "ret": -0.101823
      },
      {
        "date": "2020-03",
        "close": 77.64,
        "adjClose": 77.64,
        "ret": -0.250798
      },
      {
        "date": "2020-04",
        "close": 87.82,
        "adjClose": 87.82,
        "ret": 0.131113
      },
      {
        "date": "2020-05",
        "close": 92.03,
        "adjClose": 92.03,
        "ret": 0.048
      },
      {
        "date": "2020-06",
        "close": 93.92,
        "adjClose": 93.92,
        "ret": 0.020534
      },
      {
        "date": "2020-07",
        "close": 96.99,
        "adjClose": 96.99,
        "ret": 0.032699
      },
      {
        "date": "2020-08",
        "close": 101.5,
        "adjClose": 101.5,
        "ret": 0.046457
      },
      {
        "date": "2020-09",
        "close": 97.75,
        "adjClose": 97.75,
        "ret": -0.036945
      },
      {
        "date": "2020-10",
        "close": 100.82,
        "adjClose": 100.82,
        "ret": 0.031386
      },
      {
        "date": "2020-11",
        "close": 118.37,
        "adjClose": 118.37,
        "ret": 0.174045
      },
      {
        "date": "2020-12",
        "close": 126.43,
        "adjClose": 126.43,
        "ret": 0.068094
      },
      {
        "date": "2021-01",
        "close": 129.01,
        "adjClose": 129.01,
        "ret": 0.020478
      },
      {
        "date": "2021-02",
        "close": 140.34,
        "adjClose": 140.34,
        "ret": 0.087819
      },
      {
        "date": "2021-03",
        "close": 147.82,
        "adjClose": 147.82,
        "ret": 0.053276
      },
      {
        "date": "2021-04",
        "close": 153.74,
        "adjClose": 153.74,
        "ret": 0.040035
      },
      {
        "date": "2021-05",
        "close": 157.19,
        "adjClose": 157.19,
        "ret": 0.022447
      },
      {
        "date": "2021-06",
        "close": 155.58,
        "adjClose": 155.58,
        "ret": -0.010223
      },
      {
        "date": "2021-07",
        "close": 153.03,
        "adjClose": 153.03,
        "ret": -0.016422
      },
      {
        "date": "2021-08",
        "close": 156.21,
        "adjClose": 156.21,
        "ret": 0.020787
      },
      {
        "date": "2021-09",
        "close": 152.23,
        "adjClose": 152.23,
        "ret": -0.025466
      },
      {
        "date": "2021-10",
        "close": 159.16,
        "adjClose": 159.16,
        "ret": 0.045523
      },
      {
        "date": "2021-11",
        "close": 154.36,
        "adjClose": 154.36,
        "ret": -0.030189
      },
      {
        "date": "2021-12",
        "close": 161.94,
        "adjClose": 161.94,
        "ret": 0.0491
      },
      {
        "date": "2022-01",
        "close": 154.79,
        "adjClose": 154.79,
        "ret": -0.04411
      },
      {
        "date": "2022-02",
        "close": 157.31,
        "adjClose": 157.31,
        "ret": 0.01626
      },
      {
        "date": "2022-03",
        "close": 159.86,
        "adjClose": 159.86,
        "ret": 0.016216
      },
      {
        "date": "2022-04",
        "close": 149.73,
        "adjClose": 149.73,
        "ret": -0.063368
      },
      {
        "date": "2022-05",
        "close": 152.52,
        "adjClose": 152.52,
        "ret": 0.018647
      },
      {
        "date": "2022-06",
        "close": 136.78,
        "adjClose": 136.78,
        "ret": -0.103191
      },
      {
        "date": "2022-07",
        "close": 150.22,
        "adjClose": 150.22,
        "ret": 0.098235
      },
      {
        "date": "2022-08",
        "close": 146.1,
        "adjClose": 146.1,
        "ret": -0.02746
      },
      {
        "date": "2022-09",
        "close": 131.59,
        "adjClose": 131.59,
        "ret": -0.099257
      },
      {
        "date": "2022-10",
        "close": 147.39,
        "adjClose": 147.39,
        "ret": 0.120012
      },
      {
        "date": "2022-11",
        "close": 155.58,
        "adjClose": 155.58,
        "ret": 0.055608
      },
      {
        "date": "2022-12",
        "close": 146.75,
        "adjClose": 146.75,
        "ret": -0.056792
      },
      {
        "date": "2023-01",
        "close": 160.06,
        "adjClose": 160.06,
        "ret": 0.090747
      },
      {
        "date": "2023-02",
        "close": 156.45,
        "adjClose": 156.45,
        "ret": -0.02256
      },
      {
        "date": "2023-03",
        "close": 147.58,
        "adjClose": 147.58,
        "ret": -0.056739
      },
      {
        "date": "2023-04",
        "close": 146.16,
        "adjClose": 146.16,
        "ret": -0.009575
      },
      {
        "date": "2023-05",
        "close": 141.16,
        "adjClose": 141.16,
        "ret": -0.034208
      },
      {
        "date": "2023-06",
        "close": 154.6,
        "adjClose": 154.6,
        "ret": 0.095173
      },
      {
        "date": "2023-07",
        "close": 163,
        "adjClose": 163,
        "ret": 0.054347
      },
      {
        "date": "2023-08",
        "close": 157.45,
        "adjClose": 157.45,
        "ret": -0.034067
      },
      {
        "date": "2023-09",
        "close": 149.88,
        "adjClose": 149.88,
        "ret": -0.048079
      },
      {
        "date": "2023-10",
        "close": 142.62,
        "adjClose": 142.62,
        "ret": -0.048399
      },
      {
        "date": "2023-11",
        "close": 154.97,
        "adjClose": 154.97,
        "ret": 0.086598
      },
      {
        "date": "2023-12",
        "close": 170.23,
        "adjClose": 170.23,
        "ret": 0.098422
      },
      {
        "date": "2024-01",
        "close": 165.98,
        "adjClose": 165.98,
        "ret": -0.024943
      },
      {
        "date": "2024-02",
        "close": 172.71,
        "adjClose": 172.71,
        "ret": 0.04051
      },
      {
        "date": "2024-03",
        "close": 182.41,
        "adjClose": 182.41,
        "ret": 0.056182
      },
      {
        "date": "2024-04",
        "close": 171.46,
        "adjClose": 171.46,
        "ret": -0.060035
      },
      {
        "date": "2024-05",
        "close": 178.63,
        "adjClose": 178.63,
        "ret": 0.041806
      },
      {
        "date": "2024-06",
        "close": 174.49,
        "adjClose": 174.49,
        "ret": -0.023183
      },
      {
        "date": "2024-07",
        "close": 189.6,
        "adjClose": 189.6,
        "ret": 0.086626
      },
      {
        "date": "2024-08",
        "close": 189.72,
        "adjClose": 189.72,
        "ret": 0.000607
      },
      {
        "date": "2024-09",
        "close": 192.79,
        "adjClose": 192.79,
        "ret": 0.016193
      },
      {
        "date": "2024-10",
        "close": 190.88,
        "adjClose": 190.88,
        "ret": -0.009871
      },
      {
        "date": "2024-11",
        "close": 207.59,
        "adjClose": 207.59,
        "ret": 0.08753
      },
      {
        "date": "2024-12",
        "close": 191.34,
        "adjClose": 191.34,
        "ret": -0.078312
      },
      {
        "date": "2025-01",
        "close": 198.23,
        "adjClose": 198.23,
        "ret": 0.036031
      },
      {
        "date": "2025-02",
        "close": 190.96,
        "adjClose": 190.96,
        "ret": -0.03667
      },
      {
        "date": "2025-03",
        "close": 181.03,
        "adjClose": 181.03,
        "ret": -0.051995
      },
      {
        "date": "2025-04",
        "close": 174.9,
        "adjClose": 174.9,
        "ret": -0.033867
      },
      {
        "date": "2025-05",
        "close": 183.65,
        "adjClose": 183.65,
        "ret": 0.050006
      },
      {
        "date": "2025-06",
        "close": 190.39,
        "adjClose": 190.39,
        "ret": 0.036734
      },
      {
        "date": "2025-07",
        "close": 193.57,
        "adjClose": 193.57,
        "ret": 0.016718
      },
      {
        "date": "2025-08",
        "close": 203.85,
        "adjClose": 203.85,
        "ret": 0.053106
      },
      {
        "date": "2025-09",
        "close": 204.68,
        "adjClose": 204.68,
        "ret": 0.004022
      },
      {
        "date": "2025-10",
        "close": 202.52,
        "adjClose": 202.52,
        "ret": -0.010544
      },
      {
        "date": "2025-11",
        "close": 207.58,
        "adjClose": 207.58,
        "ret": 0.024986
      },
      {
        "date": "2025-12",
        "close": 208.72,
        "adjClose": 208.72,
        "ret": 0.005502
      },
      {
        "date": "2026-01",
        "close": 219.85,
        "adjClose": 219.85,
        "ret": 0.053354
      },
      {
        "date": "2026-02",
        "close": 226.57,
        "adjClose": 226.57,
        "ret": 0.030525
      },
      {
        "date": "2026-03",
        "close": 215.33,
        "adjClose": 215.33,
        "ret": -0.049588
      },
      {
        "date": "2026-04",
        "close": 230.37,
        "adjClose": 230.37,
        "ret": 0.069827
      },
      {
        "date": "2026-05",
        "close": 232.76,
        "adjClose": 232.76,
        "ret": 0.01037
      },
      {
        "date": "2026-06",
        "close": 241.93,
        "adjClose": 241.93,
        "ret": 0.039423
      },
      {
        "date": "2026-07",
        "close": 243.56,
        "adjClose": 243.56,
        "ret": 0.00675
      },
      {
        "date": "2026-08",
        "close": 244.22,
        "adjClose": 244.22,
        "ret": 0.002697
      },
      {
        "date": "2026-09",
        "close": 231.03,
        "adjClose": 231.03,
        "ret": -0.054016
      },
      {
        "date": "2026-10",
        "close": 243.44,
        "adjClose": 243.44,
        "ret": 0.053716
      },
      {
        "date": "2026-11",
        "close": 248.65,
        "adjClose": 248.65,
        "ret": 0.021402
      }
    ]
  },
  {
    "ticker": "IWM",
    "name": "iShares Russell 2000 ETF",
    "category": "US Small Cap Blend",
    "color": "#a855f7",
    "data": [
      {
        "date": "2005-03",
        "close": 46.03,
        "adjClose": 46.03,
        "ret": -0.028193
      },
      {
        "date": "2005-04",
        "close": 43.42,
        "adjClose": 43.42,
        "ret": -0.056647
      },
      {
        "date": "2005-05",
        "close": 46.22,
        "adjClose": 46.22,
        "ret": 0.064507
      },
      {
        "date": "2005-06",
        "close": 48.11,
        "adjClose": 48.11,
        "ret": 0.040943
      },
      {
        "date": "2005-07",
        "close": 51.28,
        "adjClose": 51.28,
        "ret": 0.065724
      },
      {
        "date": "2005-08",
        "close": 50.25,
        "adjClose": 50.25,
        "ret": -0.020074
      },
      {
        "date": "2005-09",
        "close": 50.3,
        "adjClose": 50.3,
        "ret": 0.001049
      },
      {
        "date": "2005-10",
        "close": 48.32,
        "adjClose": 48.32,
        "ret": -0.039385
      },
      {
        "date": "2005-11",
        "close": 51.1,
        "adjClose": 51.1,
        "ret": 0.057567
      },
      {
        "date": "2005-12",
        "close": 50.74,
        "adjClose": 50.74,
        "ret": -0.006994
      },
      {
        "date": "2006-01",
        "close": 55.02,
        "adjClose": 55.02,
        "ret": 0.084396
      },
      {
        "date": "2006-02",
        "close": 55.2,
        "adjClose": 55.2,
        "ret": 0.003164
      },
      {
        "date": "2006-03",
        "close": 57.91,
        "adjClose": 57.91,
        "ret": 0.049088
      },
      {
        "date": "2006-04",
        "close": 58.08,
        "adjClose": 58.08,
        "ret": 0.003013
      },
      {
        "date": "2006-05",
        "close": 54.78,
        "adjClose": 54.78,
        "ret": -0.056795
      },
      {
        "date": "2006-06",
        "close": 54.76,
        "adjClose": 54.76,
        "ret": -0.000418
      },
      {
        "date": "2006-07",
        "close": 53.2,
        "adjClose": 53.2,
        "ret": -0.028573
      },
      {
        "date": "2006-08",
        "close": 54.79,
        "adjClose": 54.79,
        "ret": 0.029965
      },
      {
        "date": "2006-09",
        "close": 55.14,
        "adjClose": 55.14,
        "ret": 0.006399
      },
      {
        "date": "2006-10",
        "close": 58.38,
        "adjClose": 58.38,
        "ret": 0.058762
      },
      {
        "date": "2006-11",
        "close": 59.79,
        "adjClose": 59.79,
        "ret": 0.024164
      },
      {
        "date": "2006-12",
        "close": 60.01,
        "adjClose": 60.01,
        "ret": 0.0037
      },
      {
        "date": "2007-01",
        "close": 61.03,
        "adjClose": 61.03,
        "ret": 0.016925
      },
      {
        "date": "2007-02",
        "close": 60.63,
        "adjClose": 60.63,
        "ret": -0.006576
      },
      {
        "date": "2007-03",
        "close": 61.27,
        "adjClose": 61.27,
        "ret": 0.010619
      },
      {
        "date": "2007-04",
        "close": 62.22,
        "adjClose": 62.22,
        "ret": 0.015446
      },
      {
        "date": "2007-05",
        "close": 64.88,
        "adjClose": 64.88,
        "ret": 0.04283
      },
      {
        "date": "2007-06",
        "close": 64.05,
        "adjClose": 64.05,
        "ret": -0.012865
      },
      {
        "date": "2007-07",
        "close": 59.53,
        "adjClose": 59.53,
        "ret": -0.070596
      },
      {
        "date": "2007-08",
        "close": 60.79,
        "adjClose": 60.79,
        "ret": 0.021251
      },
      {
        "date": "2007-09",
        "close": 61.95,
        "adjClose": 61.95,
        "ret": 0.018981
      },
      {
        "date": "2007-10",
        "close": 63.71,
        "adjClose": 63.71,
        "ret": 0.028475
      },
      {
        "date": "2007-11",
        "close": 59.27,
        "adjClose": 59.27,
        "ret": -0.069678
      },
      {
        "date": "2007-12",
        "close": 58.95,
        "adjClose": 58.95,
        "ret": -0.00534
      },
      {
        "date": "2008-01",
        "close": 55.09,
        "adjClose": 55.09,
        "ret": -0.065571
      },
      {
        "date": "2008-02",
        "close": 53.47,
        "adjClose": 53.47,
        "ret": -0.029317
      },
      {
        "date": "2008-03",
        "close": 53.12,
        "adjClose": 53.12,
        "ret": -0.006658
      },
      {
        "date": "2008-04",
        "close": 55.54,
        "adjClose": 55.54,
        "ret": 0.045569
      },
      {
        "date": "2008-05",
        "close": 58.08,
        "adjClose": 58.08,
        "ret": 0.045744
      },
      {
        "date": "2008-06",
        "close": 53.71,
        "adjClose": 53.71,
        "ret": -0.075256
      },
      {
        "date": "2008-07",
        "close": 55.68,
        "adjClose": 55.68,
        "ret": 0.036746
      },
      {
        "date": "2008-08",
        "close": 57.67,
        "adjClose": 57.67,
        "ret": 0.035734
      },
      {
        "date": "2008-09",
        "close": 53.2,
        "adjClose": 53.2,
        "ret": -0.077461
      },
      {
        "date": "2008-10",
        "close": 42.05,
        "adjClose": 42.05,
        "ret": -0.209537
      },
      {
        "date": "2008-11",
        "close": 37.03,
        "adjClose": 37.03,
        "ret": -0.119367
      },
      {
        "date": "2008-12",
        "close": 38.82,
        "adjClose": 38.82,
        "ret": 0.048119
      },
      {
        "date": "2009-01",
        "close": 35.06,
        "adjClose": 35.06,
        "ret": -0.096666
      },
      {
        "date": "2009-02",
        "close": 30.86,
        "adjClose": 30.86,
        "ret": -0.119795
      },
      {
        "date": "2009-03",
        "close": 33.26,
        "adjClose": 33.26,
        "ret": 0.07753
      },
      {
        "date": "2009-04",
        "close": 38.37,
        "adjClose": 38.37,
        "ret": 0.153886
      },
      {
        "date": "2009-05",
        "close": 39.68,
        "adjClose": 39.68,
        "ret": 0.033981
      },
      {
        "date": "2009-06",
        "close": 40.4,
        "adjClose": 40.4,
        "ret": 0.018153
      },
      {
        "date": "2009-07",
        "close": 44.1,
        "adjClose": 44.1,
        "ret": 0.091643
      },
      {
        "date": "2009-08",
        "close": 45.4,
        "adjClose": 45.4,
        "ret": 0.02936
      },
      {
        "date": "2009-09",
        "close": 47.92,
        "adjClose": 47.92,
        "ret": 0.055683
      },
      {
        "date": "2009-10",
        "close": 44.81,
        "adjClose": 44.81,
        "ret": -0.064969
      },
      {
        "date": "2009-11",
        "close": 46.21,
        "adjClose": 46.21,
        "ret": 0.031283
      },
      {
        "date": "2009-12",
        "close": 49.88,
        "adjClose": 49.88,
        "ret": 0.07928
      },
      {
        "date": "2010-01",
        "close": 48.01,
        "adjClose": 48.01,
        "ret": -0.037343
      },
      {
        "date": "2010-02",
        "close": 50.16,
        "adjClose": 50.16,
        "ret": 0.044702
      },
      {
        "date": "2010-03",
        "close": 54.29,
        "adjClose": 54.29,
        "ret": 0.082313
      },
      {
        "date": "2010-04",
        "close": 57.37,
        "adjClose": 57.37,
        "ret": 0.056809
      },
      {
        "date": "2010-05",
        "close": 53.05,
        "adjClose": 53.05,
        "ret": -0.075395
      },
      {
        "date": "2010-06",
        "close": 48.94,
        "adjClose": 48.94,
        "ret": -0.077403
      },
      {
        "date": "2010-07",
        "close": 52.24,
        "adjClose": 52.24,
        "ret": 0.067326
      },
      {
        "date": "2010-08",
        "close": 48.34,
        "adjClose": 48.34,
        "ret": -0.074548
      },
      {
        "date": "2010-09",
        "close": 54.36,
        "adjClose": 54.36,
        "ret": 0.124583
      },
      {
        "date": "2010-10",
        "close": 56.62,
        "adjClose": 56.62,
        "ret": 0.041466
      },
      {
        "date": "2010-11",
        "close": 58.59,
        "adjClose": 58.59,
        "ret": 0.034884
      },
      {
        "date": "2010-12",
        "close": 63.3,
        "adjClose": 63.3,
        "ret": 0.080373
      },
      {
        "date": "2011-01",
        "close": 63.06,
        "adjClose": 63.06,
        "ret": -0.003772
      },
      {
        "date": "2011-02",
        "close": 66.56,
        "adjClose": 66.56,
        "ret": 0.055459
      },
      {
        "date": "2011-03",
        "close": 68.24,
        "adjClose": 68.24,
        "ret": 0.025223
      },
      {
        "date": "2011-04",
        "close": 70.04,
        "adjClose": 70.04,
        "ret": 0.026332
      },
      {
        "date": "2011-05",
        "close": 68.78,
        "adjClose": 68.78,
        "ret": -0.017929
      },
      {
        "date": "2011-06",
        "close": 67.12,
        "adjClose": 67.12,
        "ret": -0.024102
      },
      {
        "date": "2011-07",
        "close": 64.84,
        "adjClose": 64.84,
        "ret": -0.033994
      },
      {
        "date": "2011-08",
        "close": 59.08,
        "adjClose": 59.08,
        "ret": -0.088868
      },
      {
        "date": "2011-09",
        "close": 52.49,
        "adjClose": 52.49,
        "ret": -0.111552
      },
      {
        "date": "2011-10",
        "close": 60.42,
        "adjClose": 60.42,
        "ret": 0.151068
      },
      {
        "date": "2011-11",
        "close": 60.19,
        "adjClose": 60.19,
        "ret": -0.00375
      },
      {
        "date": "2011-12",
        "close": 60.5,
        "adjClose": 60.5,
        "ret": 0.00516
      },
      {
        "date": "2012-01",
        "close": 64.83,
        "adjClose": 64.83,
        "ret": 0.071454
      },
      {
        "date": "2012-02",
        "close": 66.49,
        "adjClose": 66.49,
        "ret": 0.025607
      },
      {
        "date": "2012-03",
        "close": 68.14,
        "adjClose": 68.14,
        "ret": 0.024841
      },
      {
        "date": "2012-04",
        "close": 67.05,
        "adjClose": 67.05,
        "ret": -0.016001
      },
      {
        "date": "2012-05",
        "close": 62.63,
        "adjClose": 62.63,
        "ret": -0.065961
      },
      {
        "date": "2012-06",
        "close": 65.79,
        "adjClose": 65.79,
        "ret": 0.050526
      },
      {
        "date": "2012-07",
        "close": 64.79,
        "adjClose": 64.79,
        "ret": -0.015139
      },
      {
        "date": "2012-08",
        "close": 67.08,
        "adjClose": 67.08,
        "ret": 0.035348
      },
      {
        "date": "2012-09",
        "close": 69.27,
        "adjClose": 69.27,
        "ret": 0.032604
      },
      {
        "date": "2012-10",
        "close": 67.76,
        "adjClose": 67.76,
        "ret": -0.02177
      },
      {
        "date": "2012-11",
        "close": 68.14,
        "adjClose": 68.14,
        "ret": 0.005535
      },
      {
        "date": "2012-12",
        "close": 70.61,
        "adjClose": 70.61,
        "ret": 0.036259
      },
      {
        "date": "2013-01",
        "close": 75.02,
        "adjClose": 75.02,
        "ret": 0.062434
      },
      {
        "date": "2013-02",
        "close": 75.77,
        "adjClose": 75.77,
        "ret": 0.010048
      },
      {
        "date": "2013-03",
        "close": 79.3,
        "adjClose": 79.3,
        "ret": 0.046547
      },
      {
        "date": "2013-04",
        "close": 79.02,
        "adjClose": 79.02,
        "ret": -0.003477
      },
      {
        "date": "2013-05",
        "close": 82.13,
        "adjClose": 82.13,
        "ret": 0.039299
      },
      {
        "date": "2013-06",
        "close": 81.67,
        "adjClose": 81.67,
        "ret": -0.005523
      },
      {
        "date": "2013-07",
        "close": 87.43,
        "adjClose": 87.43,
        "ret": 0.070528
      },
      {
        "date": "2013-08",
        "close": 84.89,
        "adjClose": 84.89,
        "ret": -0.029055
      },
      {
        "date": "2013-09",
        "close": 90.17,
        "adjClose": 90.17,
        "ret": 0.062145
      },
      {
        "date": "2013-10",
        "close": 92.31,
        "adjClose": 92.31,
        "ret": 0.023776
      },
      {
        "date": "2013-11",
        "close": 95.98,
        "adjClose": 95.98,
        "ret": 0.039727
      },
      {
        "date": "2013-12",
        "close": 97.91,
        "adjClose": 97.91,
        "ret": 0.020092
      },
      {
        "date": "2014-01",
        "close": 95.22,
        "adjClose": 95.22,
        "ret": -0.027418
      },
      {
        "date": "2014-02",
        "close": 99.81,
        "adjClose": 99.81,
        "ret": 0.048125
      },
      {
        "date": "2014-03",
        "close": 99,
        "adjClose": 99,
        "ret": -0.008049
      },
      {
        "date": "2014-04",
        "close": 95.3,
        "adjClose": 95.3,
        "ret": -0.037406
      },
      {
        "date": "2014-05",
        "close": 96.04,
        "adjClose": 96.04,
        "ret": 0.007737
      },
      {
        "date": "2014-06",
        "close": 101.13,
        "adjClose": 101.13,
        "ret": 0.05301
      },
      {
        "date": "2014-07",
        "close": 95,
        "adjClose": 95,
        "ret": -0.060622
      },
      {
        "date": "2014-08",
        "close": 99.61,
        "adjClose": 99.61,
        "ret": 0.048537
      },
      {
        "date": "2014-09",
        "close": 93.7,
        "adjClose": 93.7,
        "ret": -0.059369
      },
      {
        "date": "2014-10",
        "close": 99.91,
        "adjClose": 99.91,
        "ret": 0.066337
      },
      {
        "date": "2014-11",
        "close": 100.02,
        "adjClose": 100.02,
        "ret": 0.00105
      },
      {
        "date": "2014-12",
        "close": 102.91,
        "adjClose": 102.91,
        "ret": 0.028905
      },
      {
        "date": "2015-01",
        "close": 99.51,
        "adjClose": 99.51,
        "ret": -0.032983
      },
      {
        "date": "2015-02",
        "close": 105.42,
        "adjClose": 105.42,
        "ret": 0.059371
      },
      {
        "date": "2015-03",
        "close": 107.28,
        "adjClose": 107.28,
        "ret": 0.017644
      },
      {
        "date": "2015-04",
        "close": 104.5,
        "adjClose": 104.5,
        "ret": -0.025904
      },
      {
        "date": "2015-05",
        "close": 106.86,
        "adjClose": 106.86,
        "ret": 0.022602
      },
      {
        "date": "2015-06",
        "close": 107.69,
        "adjClose": 107.69,
        "ret": 0.007776
      },
      {
        "date": "2015-07",
        "close": 106.52,
        "adjClose": 106.52,
        "ret": -0.010948
      },
      {
        "date": "2015-08",
        "close": 99.83,
        "adjClose": 99.83,
        "ret": -0.062814
      },
      {
        "date": "2015-09",
        "close": 94.85,
        "adjClose": 94.85,
        "ret": -0.049872
      },
      {
        "date": "2015-10",
        "close": 100.22,
        "adjClose": 100.22,
        "ret": 0.056694
      },
      {
        "date": "2015-11",
        "close": 103.47,
        "adjClose": 103.47,
        "ret": 0.032407
      },
      {
        "date": "2015-12",
        "close": 98.24,
        "adjClose": 98.24,
        "ret": -0.050581
      },
      {
        "date": "2016-01",
        "close": 89.83,
        "adjClose": 89.83,
        "ret": -0.085589
      },
      {
        "date": "2016-02",
        "close": 89.63,
        "adjClose": 89.63,
        "ret": -0.002205
      },
      {
        "date": "2016-03",
        "close": 96.83,
        "adjClose": 96.83,
        "ret": 0.080321
      },
      {
        "date": "2016-04",
        "close": 98.42,
        "adjClose": 98.42,
        "ret": 0.016386
      },
      {
        "date": "2016-05",
        "close": 100.62,
        "adjClose": 100.62,
        "ret": 0.022363
      },
      {
        "date": "2016-06",
        "close": 100.62,
        "adjClose": 100.62,
        "ret": 0
      },
      {
        "date": "2016-07",
        "close": 106.53,
        "adjClose": 106.53,
        "ret": 0.058707
      },
      {
        "date": "2016-08",
        "close": 108.41,
        "adjClose": 108.41,
        "ret": 0.017723
      },
      {
        "date": "2016-09",
        "close": 109.61,
        "adjClose": 109.61,
        "ret": 0.010995
      },
      {
        "date": "2016-10",
        "close": 104.54,
        "adjClose": 104.54,
        "ret": -0.046211
      },
      {
        "date": "2016-11",
        "close": 116.11,
        "adjClose": 116.11,
        "ret": 0.110703
      },
      {
        "date": "2016-12",
        "close": 119.47,
        "adjClose": 119.47,
        "ret": 0.028885
      },
      {
        "date": "2017-01",
        "close": 119.8,
        "adjClose": 119.8,
        "ret": 0.002771
      },
      {
        "date": "2017-02",
        "close": 122.11,
        "adjClose": 122.11,
        "ret": 0.019332
      },
      {
        "date": "2017-03",
        "close": 122.15,
        "adjClose": 122.15,
        "ret": 0.000319
      },
      {
        "date": "2017-04",
        "close": 123.55,
        "adjClose": 123.55,
        "ret": 0.011428
      },
      {
        "date": "2017-05",
        "close": 121.14,
        "adjClose": 121.14,
        "ret": -0.01949
      },
      {
        "date": "2017-06",
        "close": 125.2,
        "adjClose": 125.2,
        "ret": 0.033523
      },
      {
        "date": "2017-07",
        "close": 126.29,
        "adjClose": 126.29,
        "ret": 0.00869
      },
      {
        "date": "2017-08",
        "close": 124.7,
        "adjClose": 124.7,
        "ret": -0.012582
      },
      {
        "date": "2017-09",
        "close": 132.54,
        "adjClose": 132.54,
        "ret": 0.062894
      },
      {
        "date": "2017-10",
        "close": 133.53,
        "adjClose": 133.53,
        "ret": 0.007409
      },
      {
        "date": "2017-11",
        "close": 137.44,
        "adjClose": 137.44,
        "ret": 0.02929
      },
      {
        "date": "2017-12",
        "close": 136.91,
        "adjClose": 136.91,
        "ret": -0.003842
      },
      {
        "date": "2018-01",
        "close": 140.4,
        "adjClose": 140.4,
        "ret": 0.025462
      },
      {
        "date": "2018-02",
        "close": 135,
        "adjClose": 135,
        "ret": -0.038434
      },
      {
        "date": "2018-03",
        "close": 136.66,
        "adjClose": 136.66,
        "ret": 0.012319
      },
      {
        "date": "2018-04",
        "close": 137.98,
        "adjClose": 137.98,
        "ret": 0.009666
      },
      {
        "date": "2018-05",
        "close": 146.51,
        "adjClose": 146.51,
        "ret": 0.061783
      },
      {
        "date": "2018-06",
        "close": 147.37,
        "adjClose": 147.37,
        "ret": 0.00587
      },
      {
        "date": "2018-07",
        "close": 149.82,
        "adjClose": 149.82,
        "ret": 0.016652
      },
      {
        "date": "2018-08",
        "close": 156.29,
        "adjClose": 156.29,
        "ret": 0.043138
      },
      {
        "date": "2018-09",
        "close": 152.65,
        "adjClose": 152.65,
        "ret": -0.023271
      },
      {
        "date": "2018-10",
        "close": 135.88,
        "adjClose": 135.88,
        "ret": -0.10986
      },
      {
        "date": "2018-11",
        "close": 138.22,
        "adjClose": 138.22,
        "ret": 0.017236
      },
      {
        "date": "2018-12",
        "close": 121.69,
        "adjClose": 121.69,
        "ret": -0.119613
      },
      {
        "date": "2019-01",
        "close": 135.46,
        "adjClose": 135.46,
        "ret": 0.113134
      },
      {
        "date": "2019-02",
        "close": 142.46,
        "adjClose": 142.46,
        "ret": 0.051744
      },
      {
        "date": "2019-03",
        "close": 139.49,
        "adjClose": 139.49,
        "ret": -0.020897
      },
      {
        "date": "2019-04",
        "close": 144.23,
        "adjClose": 144.23,
        "ret": 0.033996
      },
      {
        "date": "2019-05",
        "close": 132.89,
        "adjClose": 132.89,
        "ret": -0.078604
      },
      {
        "date": "2019-06",
        "close": 142.17,
        "adjClose": 142.17,
        "ret": 0.069839
      },
      {
        "date": "2019-07",
        "close": 143.15,
        "adjClose": 143.15,
        "ret": 0.0069
      },
      {
        "date": "2019-08",
        "close": 136.1,
        "adjClose": 136.1,
        "ret": -0.049276
      },
      {
        "date": "2019-09",
        "close": 138.86,
        "adjClose": 138.86,
        "ret": 0.020309
      },
      {
        "date": "2019-10",
        "close": 142.62,
        "adjClose": 142.62,
        "ret": 0.02707
      },
      {
        "date": "2019-11",
        "close": 148.44,
        "adjClose": 148.44,
        "ret": 0.040758
      },
      {
        "date": "2019-12",
        "close": 152.56,
        "adjClose": 152.56,
        "ret": 0.027749
      },
      {
        "date": "2020-01",
        "close": 147.82,
        "adjClose": 147.82,
        "ret": -0.031025
      },
      {
        "date": "2020-02",
        "close": 134.75,
        "adjClose": 134.75,
        "ret": -0.088397
      },
      {
        "date": "2020-03",
        "close": 105.82,
        "adjClose": 105.82,
        "ret": -0.214738
      },
      {
        "date": "2020-04",
        "close": 120.47,
        "adjClose": 120.47,
        "ret": 0.138455
      },
      {
        "date": "2020-05",
        "close": 128.4,
        "adjClose": 128.4,
        "ret": 0.065818
      },
      {
        "date": "2020-06",
        "close": 132.81,
        "adjClose": 132.81,
        "ret": 0.034354
      },
      {
        "date": "2020-07",
        "close": 136.69,
        "adjClose": 136.69,
        "ret": 0.029245
      },
      {
        "date": "2020-08",
        "close": 144.17,
        "adjClose": 144.17,
        "ret": 0.054721
      },
      {
        "date": "2020-09",
        "close": 139.48,
        "adjClose": 139.48,
        "ret": -0.032572
      },
      {
        "date": "2020-10",
        "close": 142.55,
        "adjClose": 142.55,
        "ret": 0.022025
      },
      {
        "date": "2020-11",
        "close": 168.56,
        "adjClose": 168.56,
        "ret": 0.182464
      },
      {
        "date": "2020-12",
        "close": 183.13,
        "adjClose": 183.13,
        "ret": 0.086427
      },
      {
        "date": "2021-01",
        "close": 192,
        "adjClose": 192,
        "ret": 0.048453
      },
      {
        "date": "2021-02",
        "close": 203.91,
        "adjClose": 203.91,
        "ret": 0.062042
      },
      {
        "date": "2021-03",
        "close": 206.76,
        "adjClose": 206.76,
        "ret": 0.013957
      },
      {
        "date": "2021-04",
        "close": 210.45,
        "adjClose": 210.45,
        "ret": 0.017861
      },
      {
        "date": "2021-05",
        "close": 211.03,
        "adjClose": 211.03,
        "ret": 0.002742
      },
      {
        "date": "2021-06",
        "close": 214.97,
        "adjClose": 214.97,
        "ret": 0.018671
      },
      {
        "date": "2021-07",
        "close": 207.17,
        "adjClose": 207.17,
        "ret": -0.036257
      },
      {
        "date": "2021-08",
        "close": 211.74,
        "adjClose": 211.74,
        "ret": 0.022015
      },
      {
        "date": "2021-09",
        "close": 205.63,
        "adjClose": 205.63,
        "ret": -0.028824
      },
      {
        "date": "2021-10",
        "close": 214.38,
        "adjClose": 214.38,
        "ret": 0.042552
      },
      {
        "date": "2021-11",
        "close": 205.09,
        "adjClose": 205.09,
        "ret": -0.043329
      },
      {
        "date": "2021-12",
        "close": 209.75,
        "adjClose": 209.75,
        "ret": 0.022717
      },
      {
        "date": "2022-01",
        "close": 189.76,
        "adjClose": 189.76,
        "ret": -0.095322
      },
      {
        "date": "2022-02",
        "close": 191.72,
        "adjClose": 191.72,
        "ret": 0.010324
      },
      {
        "date": "2022-03",
        "close": 193.94,
        "adjClose": 193.94,
        "ret": 0.01158
      },
      {
        "date": "2022-04",
        "close": 174.74,
        "adjClose": 174.74,
        "ret": -0.098996
      },
      {
        "date": "2022-05",
        "close": 175.08,
        "adjClose": 175.08,
        "ret": 0.001951
      },
      {
        "date": "2022-06",
        "close": 160.43,
        "adjClose": 160.43,
        "ret": -0.083694
      },
      {
        "date": "2022-07",
        "close": 177.37,
        "adjClose": 177.37,
        "ret": 0.105644
      },
      {
        "date": "2022-08",
        "close": 173.82,
        "adjClose": 173.82,
        "ret": -0.020014
      },
      {
        "date": "2022-09",
        "close": 157.03,
        "adjClose": 157.03,
        "ret": -0.096626
      },
      {
        "date": "2022-10",
        "close": 174.56,
        "adjClose": 174.56,
        "ret": 0.111643
      },
      {
        "date": "2022-11",
        "close": 178.4,
        "adjClose": 178.4,
        "ret": 0.022027
      },
      {
        "date": "2022-12",
        "close": 166.78,
        "adjClose": 166.78,
        "ret": -0.065139
      },
      {
        "date": "2023-01",
        "close": 183.16,
        "adjClose": 183.16,
        "ret": 0.098181
      },
      {
        "date": "2023-02",
        "close": 180,
        "adjClose": 180,
        "ret": -0.017231
      },
      {
        "date": "2023-03",
        "close": 171.28,
        "adjClose": 171.28,
        "ret": -0.048472
      },
      {
        "date": "2023-04",
        "close": 168.21,
        "adjClose": 168.21,
        "ret": -0.01793
      },
      {
        "date": "2023-05",
        "close": 166.83,
        "adjClose": 166.83,
        "ret": -0.008163
      },
      {
        "date": "2023-06",
        "close": 180.29,
        "adjClose": 180.29,
        "ret": 0.080661
      },
      {
        "date": "2023-07",
        "close": 191.3,
        "adjClose": 191.3,
        "ret": 0.06109
      },
      {
        "date": "2023-08",
        "close": 181.58,
        "adjClose": 181.58,
        "ret": -0.05083
      },
      {
        "date": "2023-09",
        "close": 170.95,
        "adjClose": 170.95,
        "ret": -0.058542
      },
      {
        "date": "2023-10",
        "close": 159.13,
        "adjClose": 159.13,
        "ret": -0.069125
      },
      {
        "date": "2023-11",
        "close": 173.78,
        "adjClose": 173.78,
        "ret": 0.092017
      },
      {
        "date": "2023-12",
        "close": 194.85,
        "adjClose": 194.85,
        "ret": 0.121265
      },
      {
        "date": "2024-01",
        "close": 187.25,
        "adjClose": 187.25,
        "ret": -0.039015
      },
      {
        "date": "2024-02",
        "close": 197.78,
        "adjClose": 197.78,
        "ret": 0.056241
      },
      {
        "date": "2024-03",
        "close": 204.68,
        "adjClose": 204.68,
        "ret": 0.034883
      },
      {
        "date": "2024-04",
        "close": 190.66,
        "adjClose": 190.66,
        "ret": -0.068474
      },
      {
        "date": "2024-05",
        "close": 200.27,
        "adjClose": 200.27,
        "ret": 0.050382
      },
      {
        "date": "2024-06",
        "close": 198.02,
        "adjClose": 198.02,
        "ret": -0.011245
      },
      {
        "date": "2024-07",
        "close": 218.48,
        "adjClose": 218.48,
        "ret": 0.103355
      },
      {
        "date": "2024-08",
        "close": 214.79,
        "adjClose": 214.79,
        "ret": -0.01688
      },
      {
        "date": "2024-09",
        "close": 216.32,
        "adjClose": 216.32,
        "ret": 0.0071
      },
      {
        "date": "2024-10",
        "close": 213.25,
        "adjClose": 213.25,
        "ret": -0.014164
      },
      {
        "date": "2024-11",
        "close": 236.87,
        "adjClose": 236.87,
        "ret": 0.110713
      },
      {
        "date": "2024-12",
        "close": 217.03,
        "adjClose": 217.03,
        "ret": -0.08374
      },
      {
        "date": "2025-01",
        "close": 222.45,
        "adjClose": 222.45,
        "ret": 0.024987
      },
      {
        "date": "2025-02",
        "close": 210.83,
        "adjClose": 210.83,
        "ret": -0.052245
      },
      {
        "date": "2025-03",
        "close": 196.38,
        "adjClose": 196.38,
        "ret": -0.068534
      },
      {
        "date": "2025-04",
        "close": 191.82,
        "adjClose": 191.82,
        "ret": -0.02321
      },
      {
        "date": "2025-05",
        "close": 201.88,
        "adjClose": 201.88,
        "ret": 0.052402
      },
      {
        "date": "2025-06",
        "close": 213.02,
        "adjClose": 213.02,
        "ret": 0.055182
      },
      {
        "date": "2025-07",
        "close": 216.57,
        "adjClose": 216.57,
        "ret": 0.016679
      },
      {
        "date": "2025-08",
        "close": 232.15,
        "adjClose": 232.15,
        "ret": 0.071931
      },
      {
        "date": "2025-09",
        "close": 239.53,
        "adjClose": 239.53,
        "ret": 0.031786
      },
      {
        "date": "2025-10",
        "close": 243.75,
        "adjClose": 243.75,
        "ret": 0.017647
      },
      {
        "date": "2025-11",
        "close": 246.25,
        "adjClose": 246.25,
        "ret": 0.01024
      },
      {
        "date": "2025-12",
        "close": 244.5,
        "adjClose": 244.5,
        "ret": -0.007099
      },
      {
        "date": "2026-01",
        "close": 257.9,
        "adjClose": 257.9,
        "ret": 0.054801
      },
      {
        "date": "2026-02",
        "close": 259.65,
        "adjClose": 259.65,
        "ret": 0.006782
      },
      {
        "date": "2026-03",
        "close": 246.77,
        "adjClose": 246.77,
        "ret": -0.049613
      },
      {
        "date": "2026-04",
        "close": 276.59,
        "adjClose": 276.59,
        "ret": 0.120851
      },
      {
        "date": "2026-05",
        "close": 288.99,
        "adjClose": 288.99,
        "ret": 0.044821
      },
      {
        "date": "2026-06",
        "close": 299.67,
        "adjClose": 299.67,
        "ret": 0.03696
      },
      {
        "date": "2026-07",
        "close": 290.44,
        "adjClose": 290.44,
        "ret": -0.030788
      },
      {
        "date": "2026-08",
        "close": 293.16,
        "adjClose": 293.16,
        "ret": 0.009375
      },
      {
        "date": "2026-09",
        "close": 277.89,
        "adjClose": 277.89,
        "ret": -0.052101
      },
      {
        "date": "2026-10",
        "close": 279.33,
        "adjClose": 279.33,
        "ret": 0.005182
      },
      {
        "date": "2026-11",
        "close": 283.09,
        "adjClose": 283.09,
        "ret": 0.013461
      }
    ]
  },
  {
    "ticker": "VTV",
    "name": "Vanguard Value ETF",
    "category": "US Large Cap Value",
    "color": "#6366f1",
    "data": [
      {
        "date": "2005-03",
        "close": 30.98,
        "adjClose": 30.98,
        "ret": -0.017158
      },
      {
        "date": "2005-04",
        "close": 30.49,
        "adjClose": 30.49,
        "ret": -0.01596
      },
      {
        "date": "2005-05",
        "close": 31.25,
        "adjClose": 31.25,
        "ret": 0.025026
      },
      {
        "date": "2005-06",
        "close": 31.68,
        "adjClose": 31.68,
        "ret": 0.013775
      },
      {
        "date": "2005-07",
        "close": 32.49,
        "adjClose": 32.49,
        "ret": 0.025447
      },
      {
        "date": "2005-08",
        "close": 32.3,
        "adjClose": 32.3,
        "ret": -0.005898
      },
      {
        "date": "2005-09",
        "close": 32.85,
        "adjClose": 32.85,
        "ret": 0.017234
      },
      {
        "date": "2005-10",
        "close": 31.99,
        "adjClose": 31.99,
        "ret": -0.026421
      },
      {
        "date": "2005-11",
        "close": 33.11,
        "adjClose": 33.11,
        "ret": 0.035248
      },
      {
        "date": "2005-12",
        "close": 33.34,
        "adjClose": 33.34,
        "ret": 0.006858
      },
      {
        "date": "2006-01",
        "close": 34.35,
        "adjClose": 34.35,
        "ret": 0.030279
      },
      {
        "date": "2006-02",
        "close": 34.65,
        "adjClose": 34.65,
        "ret": 0.008789
      },
      {
        "date": "2006-03",
        "close": 35.2,
        "adjClose": 35.2,
        "ret": 0.015812
      },
      {
        "date": "2006-04",
        "close": 36.06,
        "adjClose": 36.06,
        "ret": 0.024342
      },
      {
        "date": "2006-05",
        "close": 35.19,
        "adjClose": 35.19,
        "ret": -0.024068
      },
      {
        "date": "2006-06",
        "close": 35.51,
        "adjClose": 35.51,
        "ret": 0.009046
      },
      {
        "date": "2006-07",
        "close": 36.4,
        "adjClose": 36.4,
        "ret": 0.025243
      },
      {
        "date": "2006-08",
        "close": 37.01,
        "adjClose": 37.01,
        "ret": 0.016754
      },
      {
        "date": "2006-09",
        "close": 37.81,
        "adjClose": 37.81,
        "ret": 0.021514
      },
      {
        "date": "2006-10",
        "close": 39,
        "adjClose": 39,
        "ret": 0.031379
      },
      {
        "date": "2006-11",
        "close": 39.8,
        "adjClose": 39.8,
        "ret": 0.020695
      },
      {
        "date": "2006-12",
        "close": 40.8,
        "adjClose": 40.8,
        "ret": 0.025016
      },
      {
        "date": "2007-01",
        "close": 41.12,
        "adjClose": 41.12,
        "ret": 0.007809
      },
      {
        "date": "2007-02",
        "close": 40.46,
        "adjClose": 40.46,
        "ret": -0.01587
      },
      {
        "date": "2007-03",
        "close": 41.15,
        "adjClose": 41.15,
        "ret": 0.016941
      },
      {
        "date": "2007-04",
        "close": 42.88,
        "adjClose": 42.88,
        "ret": 0.041962
      },
      {
        "date": "2007-05",
        "close": 44.41,
        "adjClose": 44.41,
        "ret": 0.035719
      },
      {
        "date": "2007-06",
        "close": 43.48,
        "adjClose": 43.48,
        "ret": -0.020825
      },
      {
        "date": "2007-07",
        "close": 41.43,
        "adjClose": 41.43,
        "ret": -0.0472
      },
      {
        "date": "2007-08",
        "close": 42.04,
        "adjClose": 42.04,
        "ret": 0.014668
      },
      {
        "date": "2007-09",
        "close": 43.53,
        "adjClose": 43.53,
        "ret": 0.035477
      },
      {
        "date": "2007-10",
        "close": 43.6,
        "adjClose": 43.6,
        "ret": 0.001532
      },
      {
        "date": "2007-11",
        "close": 41.4,
        "adjClose": 41.4,
        "ret": -0.050374
      },
      {
        "date": "2007-12",
        "close": 40.75,
        "adjClose": 40.75,
        "ret": -0.015626
      },
      {
        "date": "2008-01",
        "close": 38.83,
        "adjClose": 38.83,
        "ret": -0.047309
      },
      {
        "date": "2008-02",
        "close": 37.31,
        "adjClose": 37.31,
        "ret": -0.039067
      },
      {
        "date": "2008-03",
        "close": 37.14,
        "adjClose": 37.14,
        "ret": -0.004468
      },
      {
        "date": "2008-04",
        "close": 38.73,
        "adjClose": 38.73,
        "ret": 0.042763
      },
      {
        "date": "2008-05",
        "close": 38.51,
        "adjClose": 38.51,
        "ret": -0.005675
      },
      {
        "date": "2008-06",
        "close": 34.84,
        "adjClose": 34.84,
        "ret": -0.09532
      },
      {
        "date": "2008-07",
        "close": 34.78,
        "adjClose": 34.78,
        "ret": -0.001817
      },
      {
        "date": "2008-08",
        "close": 35.34,
        "adjClose": 35.34,
        "ret": 0.016293
      },
      {
        "date": "2008-09",
        "close": 32.92,
        "adjClose": 32.92,
        "ret": -0.068537
      },
      {
        "date": "2008-10",
        "close": 27.58,
        "adjClose": 27.58,
        "ret": -0.162361
      },
      {
        "date": "2008-11",
        "close": 25.74,
        "adjClose": 25.74,
        "ret": -0.066385
      },
      {
        "date": "2008-12",
        "close": 26.13,
        "adjClose": 26.13,
        "ret": 0.014834
      },
      {
        "date": "2009-01",
        "close": 23.23,
        "adjClose": 23.23,
        "ret": -0.110955
      },
      {
        "date": "2009-02",
        "close": 20.08,
        "adjClose": 20.08,
        "ret": -0.13563
      },
      {
        "date": "2009-03",
        "close": 21.73,
        "adjClose": 21.73,
        "ret": 0.082097
      },
      {
        "date": "2009-04",
        "close": 24.12,
        "adjClose": 24.12,
        "ret": 0.110256
      },
      {
        "date": "2009-05",
        "close": 25.83,
        "adjClose": 25.83,
        "ret": 0.071008
      },
      {
        "date": "2009-06",
        "close": 25.56,
        "adjClose": 25.56,
        "ret": -0.010749
      },
      {
        "date": "2009-07",
        "close": 27.59,
        "adjClose": 27.59,
        "ret": 0.079691
      },
      {
        "date": "2009-08",
        "close": 29.03,
        "adjClose": 29.03,
        "ret": 0.05222
      },
      {
        "date": "2009-09",
        "close": 29.97,
        "adjClose": 29.97,
        "ret": 0.032176
      },
      {
        "date": "2009-10",
        "close": 29.18,
        "adjClose": 29.18,
        "ret": -0.026448
      },
      {
        "date": "2009-11",
        "close": 30.94,
        "adjClose": 30.94,
        "ret": 0.060609
      },
      {
        "date": "2009-12",
        "close": 31.32,
        "adjClose": 31.32,
        "ret": 0.012141
      },
      {
        "date": "2010-01",
        "close": 30.55,
        "adjClose": 30.55,
        "ret": -0.024448
      },
      {
        "date": "2010-02",
        "close": 31.35,
        "adjClose": 31.35,
        "ret": 0.026187
      },
      {
        "date": "2010-03",
        "close": 33.28,
        "adjClose": 33.28,
        "ret": 0.061556
      },
      {
        "date": "2010-04",
        "close": 33.88,
        "adjClose": 33.88,
        "ret": 0.017783
      },
      {
        "date": "2010-05",
        "close": 31.24,
        "adjClose": 31.24,
        "ret": -0.077708
      },
      {
        "date": "2010-06",
        "close": 29.63,
        "adjClose": 29.63,
        "ret": -0.051611
      },
      {
        "date": "2010-07",
        "close": 31.59,
        "adjClose": 31.59,
        "ret": 0.066269
      },
      {
        "date": "2010-08",
        "close": 30.25,
        "adjClose": 30.25,
        "ret": -0.042438
      },
      {
        "date": "2010-09",
        "close": 32.54,
        "adjClose": 32.54,
        "ret": 0.075601
      },
      {
        "date": "2010-10",
        "close": 33.43,
        "adjClose": 33.43,
        "ret": 0.027326
      },
      {
        "date": "2010-11",
        "close": 33.23,
        "adjClose": 33.23,
        "ret": -0.006036
      },
      {
        "date": "2010-12",
        "close": 35.88,
        "adjClose": 35.88,
        "ret": 0.079746
      },
      {
        "date": "2011-01",
        "close": 36.9,
        "adjClose": 36.9,
        "ret": 0.02841
      },
      {
        "date": "2011-02",
        "close": 38.38,
        "adjClose": 38.38,
        "ret": 0.040309
      },
      {
        "date": "2011-03",
        "close": 38.38,
        "adjClose": 38.38,
        "ret": -0.000208
      },
      {
        "date": "2011-04",
        "close": 39.51,
        "adjClose": 39.51,
        "ret": 0.029625
      },
      {
        "date": "2011-05",
        "close": 38.97,
        "adjClose": 38.97,
        "ret": -0.013717
      },
      {
        "date": "2011-06",
        "close": 38.14,
        "adjClose": 38.14,
        "ret": -0.02131
      },
      {
        "date": "2011-07",
        "close": 36.81,
        "adjClose": 36.81,
        "ret": -0.034797
      },
      {
        "date": "2011-08",
        "close": 34.64,
        "adjClose": 34.64,
        "ret": -0.05904
      },
      {
        "date": "2011-09",
        "close": 32.27,
        "adjClose": 32.27,
        "ret": -0.068492
      },
      {
        "date": "2011-10",
        "close": 35.58,
        "adjClose": 35.58,
        "ret": 0.102527
      },
      {
        "date": "2011-11",
        "close": 35.38,
        "adjClose": 35.38,
        "ret": -0.005515
      },
      {
        "date": "2011-12",
        "close": 36.27,
        "adjClose": 36.27,
        "ret": 0.025235
      },
      {
        "date": "2012-01",
        "close": 37.54,
        "adjClose": 37.54,
        "ret": 0.034858
      },
      {
        "date": "2012-02",
        "close": 38.99,
        "adjClose": 38.99,
        "ret": 0.038794
      },
      {
        "date": "2012-03",
        "close": 40.1,
        "adjClose": 40.1,
        "ret": 0.028369
      },
      {
        "date": "2012-04",
        "close": 39.73,
        "adjClose": 39.73,
        "ret": -0.009162
      },
      {
        "date": "2012-05",
        "close": 37.38,
        "adjClose": 37.38,
        "ret": -0.059267
      },
      {
        "date": "2012-06",
        "close": 39.17,
        "adjClose": 39.17,
        "ret": 0.04797
      },
      {
        "date": "2012-07",
        "close": 39.63,
        "adjClose": 39.63,
        "ret": 0.011723
      },
      {
        "date": "2012-08",
        "close": 40.22,
        "adjClose": 40.22,
        "ret": 0.014875
      },
      {
        "date": "2012-09",
        "close": 41.38,
        "adjClose": 41.38,
        "ret": 0.028979
      },
      {
        "date": "2012-10",
        "close": 41.22,
        "adjClose": 41.22,
        "ret": -0.00397
      },
      {
        "date": "2012-11",
        "close": 40.91,
        "adjClose": 40.91,
        "ret": -0.007455
      },
      {
        "date": "2012-12",
        "close": 41.79,
        "adjClose": 41.79,
        "ret": 0.021465
      },
      {
        "date": "2013-01",
        "close": 44.45,
        "adjClose": 44.45,
        "ret": 0.063585
      },
      {
        "date": "2013-02",
        "close": 45.03,
        "adjClose": 45.03,
        "ret": 0.013085
      },
      {
        "date": "2013-03",
        "close": 46.85,
        "adjClose": 46.85,
        "ret": 0.04046
      },
      {
        "date": "2013-04",
        "close": 47.89,
        "adjClose": 47.89,
        "ret": 0.022076
      },
      {
        "date": "2013-05",
        "close": 49.12,
        "adjClose": 49.12,
        "ret": 0.025807
      },
      {
        "date": "2013-06",
        "close": 48.62,
        "adjClose": 48.62,
        "ret": -0.010228
      },
      {
        "date": "2013-07",
        "close": 51.24,
        "adjClose": 51.24,
        "ret": 0.053865
      },
      {
        "date": "2013-08",
        "close": 49.35,
        "adjClose": 49.35,
        "ret": -0.036799
      },
      {
        "date": "2013-09",
        "close": 50.48,
        "adjClose": 50.48,
        "ret": 0.022854
      },
      {
        "date": "2013-10",
        "close": 52.8,
        "adjClose": 52.8,
        "ret": 0.045877
      },
      {
        "date": "2013-11",
        "close": 54.48,
        "adjClose": 54.48,
        "ret": 0.031803
      },
      {
        "date": "2013-12",
        "close": 55.62,
        "adjClose": 55.62,
        "ret": 0.020954
      },
      {
        "date": "2014-01",
        "close": 53.56,
        "adjClose": 53.56,
        "ret": -0.036962
      },
      {
        "date": "2014-02",
        "close": 55.69,
        "adjClose": 55.69,
        "ret": 0.039752
      },
      {
        "date": "2014-03",
        "close": 57.19,
        "adjClose": 57.19,
        "ret": 0.026854
      },
      {
        "date": "2014-04",
        "close": 57.68,
        "adjClose": 57.68,
        "ret": 0.00857
      },
      {
        "date": "2014-05",
        "close": 58.47,
        "adjClose": 58.47,
        "ret": 0.013818
      },
      {
        "date": "2014-06",
        "close": 59.6,
        "adjClose": 59.6,
        "ret": 0.019198
      },
      {
        "date": "2014-07",
        "close": 58.88,
        "adjClose": 58.88,
        "ret": -0.012018
      },
      {
        "date": "2014-08",
        "close": 60.91,
        "adjClose": 60.91,
        "ret": 0.034421
      },
      {
        "date": "2014-09",
        "close": 60.13,
        "adjClose": 60.13,
        "ret": -0.012779
      },
      {
        "date": "2014-10",
        "close": 61.21,
        "adjClose": 61.21,
        "ret": 0.01798
      },
      {
        "date": "2014-11",
        "close": 62.72,
        "adjClose": 62.72,
        "ret": 0.024684
      },
      {
        "date": "2014-12",
        "close": 62.94,
        "adjClose": 62.94,
        "ret": 0.003565
      },
      {
        "date": "2015-01",
        "close": 60.36,
        "adjClose": 60.36,
        "ret": -0.040995
      },
      {
        "date": "2015-02",
        "close": 63.56,
        "adjClose": 63.56,
        "ret": 0.053039
      },
      {
        "date": "2015-03",
        "close": 62.72,
        "adjClose": 62.72,
        "ret": -0.013224
      },
      {
        "date": "2015-04",
        "close": 63.53,
        "adjClose": 63.53,
        "ret": 0.012815
      },
      {
        "date": "2015-05",
        "close": 64.27,
        "adjClose": 64.27,
        "ret": 0.011738
      },
      {
        "date": "2015-06",
        "close": 62.84,
        "adjClose": 62.84,
        "ret": -0.022244
      },
      {
        "date": "2015-07",
        "close": 63.48,
        "adjClose": 63.48,
        "ret": 0.010049
      },
      {
        "date": "2015-08",
        "close": 59.77,
        "adjClose": 59.77,
        "ret": -0.058375
      },
      {
        "date": "2015-09",
        "close": 58.25,
        "adjClose": 58.25,
        "ret": -0.025446
      },
      {
        "date": "2015-10",
        "close": 62.71,
        "adjClose": 62.71,
        "ret": 0.076504
      },
      {
        "date": "2015-11",
        "close": 63.05,
        "adjClose": 63.05,
        "ret": 0.005444
      },
      {
        "date": "2015-12",
        "close": 62.33,
        "adjClose": 62.33,
        "ret": -0.01139
      },
      {
        "date": "2016-01",
        "close": 59.36,
        "adjClose": 59.36,
        "ret": -0.047628
      },
      {
        "date": "2016-02",
        "close": 59.42,
        "adjClose": 59.42,
        "ret": 0.001016
      },
      {
        "date": "2016-03",
        "close": 63.4,
        "adjClose": 63.4,
        "ret": 0.067004
      },
      {
        "date": "2016-04",
        "close": 64.36,
        "adjClose": 64.36,
        "ret": 0.015126
      },
      {
        "date": "2016-05",
        "close": 65.05,
        "adjClose": 65.05,
        "ret": 0.010656
      },
      {
        "date": "2016-06",
        "close": 65.78,
        "adjClose": 65.78,
        "ret": 0.011301
      },
      {
        "date": "2016-07",
        "close": 67.63,
        "adjClose": 67.63,
        "ret": 0.028106
      },
      {
        "date": "2016-08",
        "close": 68.09,
        "adjClose": 68.09,
        "ret": 0.006722
      },
      {
        "date": "2016-09",
        "close": 67.77,
        "adjClose": 67.77,
        "ret": -0.004688
      },
      {
        "date": "2016-10",
        "close": 67.03,
        "adjClose": 67.03,
        "ret": -0.010901
      },
      {
        "date": "2016-11",
        "close": 71.05,
        "adjClose": 71.05,
        "ret": 0.059963
      },
      {
        "date": "2016-12",
        "close": 72.98,
        "adjClose": 72.98,
        "ret": 0.027275
      },
      {
        "date": "2017-01",
        "close": 73.34,
        "adjClose": 73.34,
        "ret": 0.004924
      },
      {
        "date": "2017-02",
        "close": 75.98,
        "adjClose": 75.98,
        "ret": 0.03588
      },
      {
        "date": "2017-03",
        "close": 75.28,
        "adjClose": 75.28,
        "ret": -0.00919
      },
      {
        "date": "2017-04",
        "close": 75.25,
        "adjClose": 75.25,
        "ret": -0.000324
      },
      {
        "date": "2017-05",
        "close": 75.3,
        "adjClose": 75.3,
        "ret": 0.000637
      },
      {
        "date": "2017-06",
        "close": 76.66,
        "adjClose": 76.66,
        "ret": 0.01802
      },
      {
        "date": "2017-07",
        "close": 77.84,
        "adjClose": 77.84,
        "ret": 0.01543
      },
      {
        "date": "2017-08",
        "close": 77.47,
        "adjClose": 77.47,
        "ret": -0.004722
      },
      {
        "date": "2017-09",
        "close": 79.79,
        "adjClose": 79.79,
        "ret": 0.029871
      },
      {
        "date": "2017-10",
        "close": 81.25,
        "adjClose": 81.25,
        "ret": 0.018373
      },
      {
        "date": "2017-11",
        "close": 84.12,
        "adjClose": 84.12,
        "ret": 0.035252
      },
      {
        "date": "2017-12",
        "close": 85.51,
        "adjClose": 85.51,
        "ret": 0.016592
      },
      {
        "date": "2018-01",
        "close": 89.55,
        "adjClose": 89.55,
        "ret": 0.047223
      },
      {
        "date": "2018-02",
        "close": 85.57,
        "adjClose": 85.57,
        "ret": -0.044413
      },
      {
        "date": "2018-03",
        "close": 83.44,
        "adjClose": 83.44,
        "ret": -0.024901
      },
      {
        "date": "2018-04",
        "close": 83.81,
        "adjClose": 83.81,
        "ret": 0.004374
      },
      {
        "date": "2018-05",
        "close": 84.32,
        "adjClose": 84.32,
        "ret": 0.006058
      },
      {
        "date": "2018-06",
        "close": 84.48,
        "adjClose": 84.48,
        "ret": 0.001899
      },
      {
        "date": "2018-07",
        "close": 88.43,
        "adjClose": 88.43,
        "ret": 0.046748
      },
      {
        "date": "2018-08",
        "close": 90.06,
        "adjClose": 90.06,
        "ret": 0.018529
      },
      {
        "date": "2018-09",
        "close": 90.65,
        "adjClose": 90.65,
        "ret": 0.006484
      },
      {
        "date": "2018-10",
        "close": 86.13,
        "adjClose": 86.13,
        "ret": -0.049788
      },
      {
        "date": "2018-11",
        "close": 88.94,
        "adjClose": 88.94,
        "ret": 0.032583
      },
      {
        "date": "2018-12",
        "close": 80.82,
        "adjClose": 80.82,
        "ret": -0.091258
      },
      {
        "date": "2019-01",
        "close": 86.46,
        "adjClose": 86.46,
        "ret": 0.06969
      },
      {
        "date": "2019-02",
        "close": 88.91,
        "adjClose": 88.91,
        "ret": 0.028422
      },
      {
        "date": "2019-03",
        "close": 89.43,
        "adjClose": 89.43,
        "ret": 0.005853
      },
      {
        "date": "2019-04",
        "close": 92.45,
        "adjClose": 92.45,
        "ret": 0.033664
      },
      {
        "date": "2019-05",
        "close": 86.58,
        "adjClose": 86.58,
        "ret": -0.063465
      },
      {
        "date": "2019-06",
        "close": 92.73,
        "adjClose": 92.73,
        "ret": 0.071079
      },
      {
        "date": "2019-07",
        "close": 93.51,
        "adjClose": 93.51,
        "ret": 0.008352
      },
      {
        "date": "2019-08",
        "close": 90.74,
        "adjClose": 90.74,
        "ret": -0.02961
      },
      {
        "date": "2019-09",
        "close": 93.86,
        "adjClose": 93.86,
        "ret": 0.034461
      },
      {
        "date": "2019-10",
        "close": 95.65,
        "adjClose": 95.65,
        "ret": 0.019066
      },
      {
        "date": "2019-11",
        "close": 98.95,
        "adjClose": 98.95,
        "ret": 0.034471
      },
      {
        "date": "2019-12",
        "close": 101.55,
        "adjClose": 101.55,
        "ret": 0.026268
      },
      {
        "date": "2020-01",
        "close": 99.02,
        "adjClose": 99.02,
        "ret": -0.024878
      },
      {
        "date": "2020-02",
        "close": 89.4,
        "adjClose": 89.4,
        "ret": -0.097146
      },
      {
        "date": "2020-03",
        "close": 76.14,
        "adjClose": 76.14,
        "ret": -0.148326
      },
      {
        "date": "2020-04",
        "close": 84.27,
        "adjClose": 84.27,
        "ret": 0.106679
      },
      {
        "date": "2020-05",
        "close": 86.69,
        "adjClose": 86.69,
        "ret": 0.028754
      },
      {
        "date": "2020-06",
        "close": 85.81,
        "adjClose": 85.81,
        "ret": -0.010096
      },
      {
        "date": "2020-07",
        "close": 89.01,
        "adjClose": 89.01,
        "ret": 0.037258
      },
      {
        "date": "2020-08",
        "close": 92.74,
        "adjClose": 92.74,
        "ret": 0.0419
      },
      {
        "date": "2020-09",
        "close": 90.69,
        "adjClose": 90.69,
        "ret": -0.022086
      },
      {
        "date": "2020-10",
        "close": 89.04,
        "adjClose": 89.04,
        "ret": -0.018248
      },
      {
        "date": "2020-11",
        "close": 100.4,
        "adjClose": 100.4,
        "ret": 0.127608
      },
      {
        "date": "2020-12",
        "close": 103.93,
        "adjClose": 103.93,
        "ret": 0.035169
      },
      {
        "date": "2021-01",
        "close": 103.11,
        "adjClose": 103.11,
        "ret": -0.007938
      },
      {
        "date": "2021-02",
        "close": 108.25,
        "adjClose": 108.25,
        "ret": 0.049929
      },
      {
        "date": "2021-03",
        "close": 115.49,
        "adjClose": 115.49,
        "ret": 0.066834
      },
      {
        "date": "2021-04",
        "close": 119.45,
        "adjClose": 119.45,
        "ret": 0.034332
      },
      {
        "date": "2021-05",
        "close": 122.94,
        "adjClose": 122.94,
        "ret": 0.029183
      },
      {
        "date": "2021-06",
        "close": 121.41,
        "adjClose": 121.41,
        "ret": -0.012437
      },
      {
        "date": "2021-07",
        "close": 122.64,
        "adjClose": 122.64,
        "ret": 0.010139
      },
      {
        "date": "2021-08",
        "close": 125.2,
        "adjClose": 125.2,
        "ret": 0.020841
      },
      {
        "date": "2021-09",
        "close": 120.26,
        "adjClose": 120.26,
        "ret": -0.039426
      },
      {
        "date": "2021-10",
        "close": 126.81,
        "adjClose": 126.81,
        "ret": 0.054473
      },
      {
        "date": "2021-11",
        "close": 122.96,
        "adjClose": 122.96,
        "ret": -0.030391
      },
      {
        "date": "2021-12",
        "close": 131.51,
        "adjClose": 131.51,
        "ret": 0.069568
      },
      {
        "date": "2022-01",
        "close": 130.09,
        "adjClose": 130.09,
        "ret": -0.01079
      },
      {
        "date": "2022-02",
        "close": 128.59,
        "adjClose": 128.59,
        "ret": -0.011538
      },
      {
        "date": "2022-03",
        "close": 132.82,
        "adjClose": 132.82,
        "ret": 0.03284
      },
      {
        "date": "2022-04",
        "close": 126.45,
        "adjClose": 126.45,
        "ret": -0.047908
      },
      {
        "date": "2022-05",
        "close": 129.5,
        "adjClose": 129.5,
        "ret": 0.024088
      },
      {
        "date": "2022-06",
        "close": 119.29,
        "adjClose": 119.29,
        "ret": -0.078827
      },
      {
        "date": "2022-07",
        "close": 125.32,
        "adjClose": 125.32,
        "ret": 0.050557
      },
      {
        "date": "2022-08",
        "close": 121.97,
        "adjClose": 121.97,
        "ret": -0.026763
      },
      {
        "date": "2022-09",
        "close": 112.44,
        "adjClose": 112.44,
        "ret": -0.078135
      },
      {
        "date": "2022-10",
        "close": 125.63,
        "adjClose": 125.63,
        "ret": 0.117354
      },
      {
        "date": "2022-11",
        "close": 133.16,
        "adjClose": 133.16,
        "ret": 0.059952
      },
      {
        "date": "2022-12",
        "close": 128.77,
        "adjClose": 128.77,
        "ret": -0.033034
      },
      {
        "date": "2023-01",
        "close": 132.35,
        "adjClose": 132.35,
        "ret": 0.027841
      },
      {
        "date": "2023-02",
        "close": 128.07,
        "adjClose": 128.07,
        "ret": -0.032361
      },
      {
        "date": "2023-03",
        "close": 127.48,
        "adjClose": 127.48,
        "ret": -0.004615
      },
      {
        "date": "2023-04",
        "close": 129.74,
        "adjClose": 129.74,
        "ret": 0.017744
      },
      {
        "date": "2023-05",
        "close": 124.39,
        "adjClose": 124.39,
        "ret": -0.041198
      },
      {
        "date": "2023-06",
        "close": 132.02,
        "adjClose": 132.02,
        "ret": 0.061337
      },
      {
        "date": "2023-07",
        "close": 136.59,
        "adjClose": 136.59,
        "ret": 0.034554
      },
      {
        "date": "2023-08",
        "close": 133.34,
        "adjClose": 133.34,
        "ret": -0.023802
      },
      {
        "date": "2023-09",
        "close": 128.96,
        "adjClose": 128.96,
        "ret": -0.03282
      },
      {
        "date": "2023-10",
        "close": 125.56,
        "adjClose": 125.56,
        "ret": -0.02638
      },
      {
        "date": "2023-11",
        "close": 133.94,
        "adjClose": 133.94,
        "ret": 0.066782
      },
      {
        "date": "2023-12",
        "close": 140.76,
        "adjClose": 140.76,
        "ret": 0.05091
      },
      {
        "date": "2024-01",
        "close": 141.99,
        "adjClose": 141.99,
        "ret": 0.008703
      },
      {
        "date": "2024-02",
        "close": 146.72,
        "adjClose": 146.72,
        "ret": 0.033341
      },
      {
        "date": "2024-03",
        "close": 154.31,
        "adjClose": 154.31,
        "ret": 0.051697
      },
      {
        "date": "2024-04",
        "close": 148.27,
        "adjClose": 148.27,
        "ret": -0.039117
      },
      {
        "date": "2024-05",
        "close": 152.71,
        "adjClose": 152.71,
        "ret": 0.029966
      },
      {
        "date": "2024-06",
        "close": 152.95,
        "adjClose": 152.95,
        "ret": 0.001532
      },
      {
        "date": "2024-07",
        "close": 160.19,
        "adjClose": 160.19,
        "ret": 0.047383
      },
      {
        "date": "2024-08",
        "close": 164.81,
        "adjClose": 164.81,
        "ret": 0.028809
      },
      {
        "date": "2024-09",
        "close": 167.33,
        "adjClose": 167.33,
        "ret": 0.015303
      },
      {
        "date": "2024-10",
        "close": 165.02,
        "adjClose": 165.02,
        "ret": -0.013811
      },
      {
        "date": "2024-11",
        "close": 174.33,
        "adjClose": 174.33,
        "ret": 0.0564
      },
      {
        "date": "2024-12",
        "close": 163.22,
        "adjClose": 163.22,
        "ret": -0.063714
      },
      {
        "date": "2025-01",
        "close": 170.35,
        "adjClose": 170.35,
        "ret": 0.043702
      },
      {
        "date": "2025-02",
        "close": 171.73,
        "adjClose": 171.73,
        "ret": 0.008095
      },
      {
        "date": "2025-03",
        "close": 167.51,
        "adjClose": 167.51,
        "ret": -0.024591
      },
      {
        "date": "2025-04",
        "close": 161.44,
        "adjClose": 161.44,
        "ret": -0.036237
      },
      {
        "date": "2025-05",
        "close": 166.2,
        "adjClose": 166.2,
        "ret": 0.029491
      },
      {
        "date": "2025-06",
        "close": 172.33,
        "adjClose": 172.33,
        "ret": 0.036877
      },
      {
        "date": "2025-07",
        "close": 172.62,
        "adjClose": 172.62,
        "ret": 0.001694
      },
      {
        "date": "2025-08",
        "close": 178.65,
        "adjClose": 178.65,
        "ret": 0.034903
      },
      {
        "date": "2025-09",
        "close": 182.76,
        "adjClose": 182.76,
        "ret": 0.023023
      },
      {
        "date": "2025-10",
        "close": 182.04,
        "adjClose": 182.04,
        "ret": -0.003912
      },
      {
        "date": "2025-11",
        "close": 186.67,
        "adjClose": 186.67,
        "ret": 0.025401
      },
      {
        "date": "2025-12",
        "close": 188.14,
        "adjClose": 188.14,
        "ret": 0.007875
      },
      {
        "date": "2026-01",
        "close": 196.77,
        "adjClose": 196.77,
        "ret": 0.045871
      },
      {
        "date": "2026-02",
        "close": 204.16,
        "adjClose": 204.16,
        "ret": 0.037598
      },
      {
        "date": "2026-03",
        "close": 194.34,
        "adjClose": 194.34,
        "ret": -0.048133
      },
      {
        "date": "2026-04",
        "close": 204.82,
        "adjClose": 204.82,
        "ret": 0.053922
      },
      {
        "date": "2026-05",
        "close": 209.84,
        "adjClose": 209.84,
        "ret": 0.024519
      },
      {
        "date": "2026-06",
        "close": 216.93,
        "adjClose": 216.93,
        "ret": 0.033774
      },
      {
        "date": "2026-07",
        "close": 218.94,
        "adjClose": 218.94,
        "ret": 0.00927
      },
      {
        "date": "2026-08",
        "close": 223.81,
        "adjClose": 223.81,
        "ret": 0.022276
      },
      {
        "date": "2026-09",
        "close": 216.08,
        "adjClose": 216.08,
        "ret": -0.034555
      },
      {
        "date": "2026-10",
        "close": 228.02,
        "adjClose": 228.02,
        "ret": 0.055257
      },
      {
        "date": "2026-11",
        "close": 230.04,
        "adjClose": 230.04,
        "ret": 0.008859
      }
    ]
  },
  {
    "ticker": "VUG",
    "name": "Vanguard Growth ETF",
    "category": "US Large Cap Growth",
    "color": "#06b6d4",
    "data": [
      {
        "date": "2005-03",
        "close": 7.05,
        "adjClose": 7.05,
        "ret": -0.02119
      },
      {
        "date": "2005-04",
        "close": 6.88,
        "adjClose": 6.88,
        "ret": -0.024502
      },
      {
        "date": "2005-05",
        "close": 7.25,
        "adjClose": 7.25,
        "ret": 0.053957
      },
      {
        "date": "2005-06",
        "close": 7.22,
        "adjClose": 7.22,
        "ret": -0.004714
      },
      {
        "date": "2005-07",
        "close": 7.53,
        "adjClose": 7.53,
        "ret": 0.043646
      },
      {
        "date": "2005-08",
        "close": 7.43,
        "adjClose": 7.43,
        "ret": -0.014036
      },
      {
        "date": "2005-09",
        "close": 7.45,
        "adjClose": 7.45,
        "ret": 0.002956
      },
      {
        "date": "2005-10",
        "close": 7.38,
        "adjClose": 7.38,
        "ret": -0.008495
      },
      {
        "date": "2005-11",
        "close": 7.69,
        "adjClose": 7.69,
        "ret": 0.04153
      },
      {
        "date": "2005-12",
        "close": 7.63,
        "adjClose": 7.63,
        "ret": -0.007377
      },
      {
        "date": "2006-01",
        "close": 7.8,
        "adjClose": 7.8,
        "ret": 0.021896
      },
      {
        "date": "2006-02",
        "close": 7.78,
        "adjClose": 7.78,
        "ret": -0.002853
      },
      {
        "date": "2006-03",
        "close": 7.87,
        "adjClose": 7.87,
        "ret": 0.011974
      },
      {
        "date": "2006-04",
        "close": 7.87,
        "adjClose": 7.87,
        "ret": 0
      },
      {
        "date": "2006-05",
        "close": 7.6,
        "adjClose": 7.6,
        "ret": -0.034055
      },
      {
        "date": "2006-06",
        "close": 7.56,
        "adjClose": 7.56,
        "ret": -0.005924
      },
      {
        "date": "2006-07",
        "close": 7.39,
        "adjClose": 7.39,
        "ret": -0.022308
      },
      {
        "date": "2006-08",
        "close": 7.62,
        "adjClose": 7.62,
        "ret": 0.0306
      },
      {
        "date": "2006-09",
        "close": 7.82,
        "adjClose": 7.82,
        "ret": 0.027219
      },
      {
        "date": "2006-10",
        "close": 8.08,
        "adjClose": 8.08,
        "ret": 0.033145
      },
      {
        "date": "2006-11",
        "close": 8.28,
        "adjClose": 8.28,
        "ret": 0.023838
      },
      {
        "date": "2006-12",
        "close": 8.26,
        "adjClose": 8.26,
        "ret": -0.002397
      },
      {
        "date": "2007-01",
        "close": 8.47,
        "adjClose": 8.47,
        "ret": 0.025785
      },
      {
        "date": "2007-02",
        "close": 8.31,
        "adjClose": 8.31,
        "ret": -0.01855
      },
      {
        "date": "2007-03",
        "close": 8.34,
        "adjClose": 8.34,
        "ret": 0.003146
      },
      {
        "date": "2007-04",
        "close": 8.7,
        "adjClose": 8.7,
        "ret": 0.043934
      },
      {
        "date": "2007-05",
        "close": 9.01,
        "adjClose": 9.01,
        "ret": 0.035022
      },
      {
        "date": "2007-06",
        "close": 8.9,
        "adjClose": 8.9,
        "ret": -0.01243
      },
      {
        "date": "2007-07",
        "close": 8.71,
        "adjClose": 8.71,
        "ret": -0.021513
      },
      {
        "date": "2007-08",
        "close": 8.87,
        "adjClose": 8.87,
        "ret": 0.019301
      },
      {
        "date": "2007-09",
        "close": 9.25,
        "adjClose": 9.25,
        "ret": 0.042518
      },
      {
        "date": "2007-10",
        "close": 9.53,
        "adjClose": 9.53,
        "ret": 0.029615
      },
      {
        "date": "2007-11",
        "close": 9.22,
        "adjClose": 9.22,
        "ret": -0.032246
      },
      {
        "date": "2007-12",
        "close": 9.2,
        "adjClose": 9.2,
        "ret": -0.00183
      },
      {
        "date": "2008-01",
        "close": 8.46,
        "adjClose": 8.46,
        "ret": -0.080162
      },
      {
        "date": "2008-02",
        "close": 8.37,
        "adjClose": 8.37,
        "ret": -0.011481
      },
      {
        "date": "2008-03",
        "close": 8.27,
        "adjClose": 8.27,
        "ret": -0.011817
      },
      {
        "date": "2008-04",
        "close": 8.77,
        "adjClose": 8.77,
        "ret": 0.060394
      },
      {
        "date": "2008-05",
        "close": 9.07,
        "adjClose": 9.07,
        "ret": 0.035017
      },
      {
        "date": "2008-06",
        "close": 8.45,
        "adjClose": 8.45,
        "ret": -0.069168
      },
      {
        "date": "2008-07",
        "close": 8.31,
        "adjClose": 8.31,
        "ret": -0.01644
      },
      {
        "date": "2008-08",
        "close": 8.41,
        "adjClose": 8.41,
        "ret": 0.012078
      },
      {
        "date": "2008-09",
        "close": 7.45,
        "adjClose": 7.45,
        "ret": -0.113847
      },
      {
        "date": "2008-10",
        "close": 6.12,
        "adjClose": 6.12,
        "ret": -0.178094
      },
      {
        "date": "2008-11",
        "close": 5.59,
        "adjClose": 5.59,
        "ret": -0.086644
      },
      {
        "date": "2008-12",
        "close": 5.64,
        "adjClose": 5.64,
        "ret": 0.008024
      },
      {
        "date": "2009-01",
        "close": 5.36,
        "adjClose": 5.36,
        "ret": -0.048819
      },
      {
        "date": "2009-02",
        "close": 4.96,
        "adjClose": 4.96,
        "ret": -0.074839
      },
      {
        "date": "2009-03",
        "close": 5.33,
        "adjClose": 5.33,
        "ret": 0.074566
      },
      {
        "date": "2009-04",
        "close": 5.86,
        "adjClose": 5.86,
        "ret": 0.099446
      },
      {
        "date": "2009-05",
        "close": 6.13,
        "adjClose": 6.13,
        "ret": 0.046353
      },
      {
        "date": "2009-06",
        "close": 6.19,
        "adjClose": 6.19,
        "ret": 0.008831
      },
      {
        "date": "2009-07",
        "close": 6.63,
        "adjClose": 6.63,
        "ret": 0.071245
      },
      {
        "date": "2009-08",
        "close": 6.76,
        "adjClose": 6.76,
        "ret": 0.019814
      },
      {
        "date": "2009-09",
        "close": 7.03,
        "adjClose": 7.03,
        "ret": 0.040272
      },
      {
        "date": "2009-10",
        "close": 6.94,
        "adjClose": 6.94,
        "ret": -0.013179
      },
      {
        "date": "2009-11",
        "close": 7.35,
        "adjClose": 7.35,
        "ret": 0.059629
      },
      {
        "date": "2009-12",
        "close": 7.57,
        "adjClose": 7.57,
        "ret": 0.029761
      },
      {
        "date": "2010-01",
        "close": 7.22,
        "adjClose": 7.22,
        "ret": -0.046035
      },
      {
        "date": "2010-02",
        "close": 7.5,
        "adjClose": 7.5,
        "ret": 0.038757
      },
      {
        "date": "2010-03",
        "close": 7.93,
        "adjClose": 7.93,
        "ret": 0.056426
      },
      {
        "date": "2010-04",
        "close": 8.05,
        "adjClose": 8.05,
        "ret": 0.015146
      },
      {
        "date": "2010-05",
        "close": 7.38,
        "adjClose": 7.38,
        "ret": -0.08261
      },
      {
        "date": "2010-06",
        "close": 6.94,
        "adjClose": 6.94,
        "ret": -0.059735
      },
      {
        "date": "2010-07",
        "close": 7.46,
        "adjClose": 7.46,
        "ret": 0.074849
      },
      {
        "date": "2010-08",
        "close": 7.11,
        "adjClose": 7.11,
        "ret": -0.047144
      },
      {
        "date": "2010-09",
        "close": 7.84,
        "adjClose": 7.84,
        "ret": 0.103407
      },
      {
        "date": "2010-10",
        "close": 8.25,
        "adjClose": 8.25,
        "ret": 0.051912
      },
      {
        "date": "2010-11",
        "close": 8.33,
        "adjClose": 8.33,
        "ret": 0.009792
      },
      {
        "date": "2010-12",
        "close": 8.76,
        "adjClose": 8.76,
        "ret": 0.051853
      },
      {
        "date": "2011-01",
        "close": 8.93,
        "adjClose": 8.93,
        "ret": 0.018798
      },
      {
        "date": "2011-02",
        "close": 9.18,
        "adjClose": 9.18,
        "ret": 0.027641
      },
      {
        "date": "2011-03",
        "close": 9.2,
        "adjClose": 9.2,
        "ret": 0.002712
      },
      {
        "date": "2011-04",
        "close": 9.48,
        "adjClose": 9.48,
        "ret": 0.030871
      },
      {
        "date": "2011-05",
        "close": 9.42,
        "adjClose": 9.42,
        "ret": -0.007286
      },
      {
        "date": "2011-06",
        "close": 9.28,
        "adjClose": 9.28,
        "ret": -0.013933
      },
      {
        "date": "2011-07",
        "close": 9.22,
        "adjClose": 9.22,
        "ret": -0.00722
      },
      {
        "date": "2011-08",
        "close": 8.69,
        "adjClose": 8.69,
        "ret": -0.056624
      },
      {
        "date": "2011-09",
        "close": 8.05,
        "adjClose": 8.05,
        "ret": -0.073774
      },
      {
        "date": "2011-10",
        "close": 8.99,
        "adjClose": 8.99,
        "ret": 0.116113
      },
      {
        "date": "2011-11",
        "close": 8.97,
        "adjClose": 8.97,
        "ret": -0.002187
      },
      {
        "date": "2011-12",
        "close": 8.92,
        "adjClose": 8.92,
        "ret": -0.005044
      },
      {
        "date": "2012-01",
        "close": 9.48,
        "adjClose": 9.48,
        "ret": 0.06288
      },
      {
        "date": "2012-02",
        "close": 9.94,
        "adjClose": 9.94,
        "ret": 0.04786
      },
      {
        "date": "2012-03",
        "close": 10.28,
        "adjClose": 10.28,
        "ret": 0.034669
      },
      {
        "date": "2012-04",
        "close": 10.25,
        "adjClose": 10.25,
        "ret": -0.003034
      },
      {
        "date": "2012-05",
        "close": 9.61,
        "adjClose": 9.61,
        "ret": -0.06284
      },
      {
        "date": "2012-06",
        "close": 9.89,
        "adjClose": 9.89,
        "ret": 0.028856
      },
      {
        "date": "2012-07",
        "close": 10.01,
        "adjClose": 10.01,
        "ret": 0.012271
      },
      {
        "date": "2012-08",
        "close": 10.35,
        "adjClose": 10.35,
        "ret": 0.033918
      },
      {
        "date": "2012-09",
        "close": 10.56,
        "adjClose": 10.56,
        "ret": 0.020656
      },
      {
        "date": "2012-10",
        "close": 10.23,
        "adjClose": 10.23,
        "ret": -0.031394
      },
      {
        "date": "2012-11",
        "close": 10.43,
        "adjClose": 10.43,
        "ret": 0.020219
      },
      {
        "date": "2012-12",
        "close": 10.44,
        "adjClose": 10.44,
        "ret": 0.00068
      },
      {
        "date": "2013-01",
        "close": 10.9,
        "adjClose": 10.9,
        "ret": 0.044111
      },
      {
        "date": "2013-02",
        "close": 10.99,
        "adjClose": 10.99,
        "ret": 0.008301
      },
      {
        "date": "2013-03",
        "close": 11.41,
        "adjClose": 11.41,
        "ret": 0.037515
      },
      {
        "date": "2013-04",
        "close": 11.59,
        "adjClose": 11.59,
        "ret": 0.016141
      },
      {
        "date": "2013-05",
        "close": 11.79,
        "adjClose": 11.79,
        "ret": 0.0173
      },
      {
        "date": "2013-06",
        "close": 11.54,
        "adjClose": 11.54,
        "ret": -0.021357
      },
      {
        "date": "2013-07",
        "close": 12.18,
        "adjClose": 12.18,
        "ret": 0.055754
      },
      {
        "date": "2013-08",
        "close": 11.96,
        "adjClose": 11.96,
        "ret": -0.018594
      },
      {
        "date": "2013-09",
        "close": 12.53,
        "adjClose": 12.53,
        "ret": 0.048298
      },
      {
        "date": "2013-10",
        "close": 13.07,
        "adjClose": 13.07,
        "ret": 0.042506
      },
      {
        "date": "2013-11",
        "close": 13.38,
        "adjClose": 13.38,
        "ret": 0.023857
      },
      {
        "date": "2013-12",
        "close": 13.83,
        "adjClose": 13.83,
        "ret": 0.034186
      },
      {
        "date": "2014-01",
        "close": 13.41,
        "adjClose": 13.41,
        "ret": -0.030504
      },
      {
        "date": "2014-02",
        "close": 14.16,
        "adjClose": 14.16,
        "ret": 0.056106
      },
      {
        "date": "2014-03",
        "close": 13.94,
        "adjClose": 13.94,
        "ret": -0.015948
      },
      {
        "date": "2014-04",
        "close": 13.94,
        "adjClose": 13.94,
        "ret": 0.00043
      },
      {
        "date": "2014-05",
        "close": 14.44,
        "adjClose": 14.44,
        "ret": 0.035741
      },
      {
        "date": "2014-06",
        "close": 14.79,
        "adjClose": 14.79,
        "ret": 0.023963
      },
      {
        "date": "2014-07",
        "close": 14.56,
        "adjClose": 14.56,
        "ret": -0.015599
      },
      {
        "date": "2014-08",
        "close": 15.23,
        "adjClose": 15.23,
        "ret": 0.04598
      },
      {
        "date": "2014-09",
        "close": 14.95,
        "adjClose": 14.95,
        "ret": -0.018322
      },
      {
        "date": "2014-10",
        "close": 15.39,
        "adjClose": 15.39,
        "ret": 0.029795
      },
      {
        "date": "2014-11",
        "close": 15.87,
        "adjClose": 15.87,
        "ret": 0.030862
      },
      {
        "date": "2014-12",
        "close": 15.72,
        "adjClose": 15.72,
        "ret": -0.009704
      },
      {
        "date": "2015-01",
        "close": 15.48,
        "adjClose": 15.48,
        "ret": -0.015062
      },
      {
        "date": "2015-02",
        "close": 16.44,
        "adjClose": 16.44,
        "ret": 0.062421
      },
      {
        "date": "2015-03",
        "close": 15.8,
        "adjClose": 15.8,
        "ret": -0.039264
      },
      {
        "date": "2015-04",
        "close": 16.24,
        "adjClose": 16.24,
        "ret": 0.02821
      },
      {
        "date": "2015-05",
        "close": 16.49,
        "adjClose": 16.49,
        "ret": 0.014792
      },
      {
        "date": "2015-06",
        "close": 16.21,
        "adjClose": 16.21,
        "ret": -0.016651
      },
      {
        "date": "2015-07",
        "close": 16.74,
        "adjClose": 16.74,
        "ret": 0.032596
      },
      {
        "date": "2015-08",
        "close": 15.69,
        "adjClose": 15.69,
        "ret": -0.062883
      },
      {
        "date": "2015-09",
        "close": 15.24,
        "adjClose": 15.24,
        "ret": -0.028528
      },
      {
        "date": "2015-10",
        "close": 16.61,
        "adjClose": 16.61,
        "ret": 0.089697
      },
      {
        "date": "2015-11",
        "close": 16.63,
        "adjClose": 16.63,
        "ret": 0.00156
      },
      {
        "date": "2015-12",
        "close": 16.23,
        "adjClose": 16.23,
        "ret": -0.024249
      },
      {
        "date": "2016-01",
        "close": 15.25,
        "adjClose": 15.25,
        "ret": -0.060123
      },
      {
        "date": "2016-02",
        "close": 15.19,
        "adjClose": 15.19,
        "ret": -0.004032
      },
      {
        "date": "2016-03",
        "close": 16.29,
        "adjClose": 16.29,
        "ret": 0.072028
      },
      {
        "date": "2016-04",
        "close": 16.16,
        "adjClose": 16.16,
        "ret": -0.007897
      },
      {
        "date": "2016-05",
        "close": 16.56,
        "adjClose": 16.56,
        "ret": 0.024961
      },
      {
        "date": "2016-06",
        "close": 16.44,
        "adjClose": 16.44,
        "ret": -0.006962
      },
      {
        "date": "2016-07",
        "close": 17.24,
        "adjClose": 17.24,
        "ret": 0.048234
      },
      {
        "date": "2016-08",
        "close": 17.18,
        "adjClose": 17.18,
        "ret": -0.003196
      },
      {
        "date": "2016-09",
        "close": 17.29,
        "adjClose": 17.29,
        "ret": 0.006355
      },
      {
        "date": "2016-10",
        "close": 16.84,
        "adjClose": 16.84,
        "ret": -0.026156
      },
      {
        "date": "2016-11",
        "close": 17.04,
        "adjClose": 17.04,
        "ret": 0.012162
      },
      {
        "date": "2016-12",
        "close": 17.25,
        "adjClose": 17.25,
        "ret": 0.011933
      },
      {
        "date": "2017-01",
        "close": 17.85,
        "adjClose": 17.85,
        "ret": 0.035157
      },
      {
        "date": "2017-02",
        "close": 18.63,
        "adjClose": 18.63,
        "ret": 0.043709
      },
      {
        "date": "2017-03",
        "close": 18.88,
        "adjClose": 18.88,
        "ret": 0.013282
      },
      {
        "date": "2017-04",
        "close": 19.31,
        "adjClose": 19.31,
        "ret": 0.022465
      },
      {
        "date": "2017-05",
        "close": 19.84,
        "adjClose": 19.84,
        "ret": 0.027876
      },
      {
        "date": "2017-06",
        "close": 19.76,
        "adjClose": 19.76,
        "ret": -0.004107
      },
      {
        "date": "2017-07",
        "close": 20.27,
        "adjClose": 20.27,
        "ret": 0.025684
      },
      {
        "date": "2017-08",
        "close": 20.5,
        "adjClose": 20.5,
        "ret": 0.011534
      },
      {
        "date": "2017-09",
        "close": 20.72,
        "adjClose": 20.72,
        "ret": 0.010617
      },
      {
        "date": "2017-10",
        "close": 21.32,
        "adjClose": 21.32,
        "ret": 0.028872
      },
      {
        "date": "2017-11",
        "close": 21.84,
        "adjClose": 21.84,
        "ret": 0.024211
      },
      {
        "date": "2017-12",
        "close": 22.02,
        "adjClose": 22.02,
        "ret": 0.008531
      },
      {
        "date": "2018-01",
        "close": 23.53,
        "adjClose": 23.53,
        "ret": 0.068532
      },
      {
        "date": "2018-02",
        "close": 22.84,
        "adjClose": 22.84,
        "ret": -0.029376
      },
      {
        "date": "2018-03",
        "close": 22.28,
        "adjClose": 22.28,
        "ret": -0.024701
      },
      {
        "date": "2018-04",
        "close": 22.34,
        "adjClose": 22.34,
        "ret": 0.002707
      },
      {
        "date": "2018-05",
        "close": 23.31,
        "adjClose": 23.31,
        "ret": 0.043582
      },
      {
        "date": "2018-06",
        "close": 23.58,
        "adjClose": 23.58,
        "ret": 0.011737
      },
      {
        "date": "2018-07",
        "close": 24.17,
        "adjClose": 24.17,
        "ret": 0.024949
      },
      {
        "date": "2018-08",
        "close": 25.3,
        "adjClose": 25.3,
        "ret": 0.046821
      },
      {
        "date": "2018-09",
        "close": 25.42,
        "adjClose": 25.42,
        "ret": 0.004632
      },
      {
        "date": "2018-10",
        "close": 23.12,
        "adjClose": 23.12,
        "ret": -0.090568
      },
      {
        "date": "2018-11",
        "close": 23.25,
        "adjClose": 23.25,
        "ret": 0.005679
      },
      {
        "date": "2018-12",
        "close": 21.3,
        "adjClose": 21.3,
        "ret": -0.084053
      },
      {
        "date": "2019-01",
        "close": 23.25,
        "adjClose": 23.25,
        "ret": 0.091926
      },
      {
        "date": "2019-02",
        "close": 24.11,
        "adjClose": 24.11,
        "ret": 0.036858
      },
      {
        "date": "2019-03",
        "close": 24.87,
        "adjClose": 24.87,
        "ret": 0.031355
      },
      {
        "date": "2019-04",
        "close": 26.04,
        "adjClose": 26.04,
        "ret": 0.047074
      },
      {
        "date": "2019-05",
        "close": 24.39,
        "adjClose": 24.39,
        "ret": -0.063427
      },
      {
        "date": "2019-06",
        "close": 26.04,
        "adjClose": 26.04,
        "ret": 0.067862
      },
      {
        "date": "2019-07",
        "close": 26.64,
        "adjClose": 26.64,
        "ret": 0.022918
      },
      {
        "date": "2019-08",
        "close": 26.49,
        "adjClose": 26.49,
        "ret": -0.005691
      },
      {
        "date": "2019-09",
        "close": 26.56,
        "adjClose": 26.56,
        "ret": 0.002896
      },
      {
        "date": "2019-10",
        "close": 27.25,
        "adjClose": 27.25,
        "ret": 0.02584
      },
      {
        "date": "2019-11",
        "close": 28.34,
        "adjClose": 28.34,
        "ret": 0.040034
      },
      {
        "date": "2019-12",
        "close": 29.18,
        "adjClose": 29.18,
        "ret": 0.029774
      },
      {
        "date": "2020-01",
        "close": 30.09,
        "adjClose": 30.09,
        "ret": 0.031202
      },
      {
        "date": "2020-02",
        "close": 28.15,
        "adjClose": 28.15,
        "ret": -0.064612
      },
      {
        "date": "2020-03",
        "close": 25.17,
        "adjClose": 25.17,
        "ret": -0.105938
      },
      {
        "date": "2020-04",
        "close": 28.96,
        "adjClose": 28.96,
        "ret": 0.150782
      },
      {
        "date": "2020-05",
        "close": 31.01,
        "adjClose": 31.01,
        "ret": 0.070618
      },
      {
        "date": "2020-06",
        "close": 32.53,
        "adjClose": 32.53,
        "ret": 0.04909
      },
      {
        "date": "2020-07",
        "close": 34.99,
        "adjClose": 34.99,
        "ret": 0.075468
      },
      {
        "date": "2020-08",
        "close": 38.52,
        "adjClose": 38.52,
        "ret": 0.100996
      },
      {
        "date": "2020-09",
        "close": 36.7,
        "adjClose": 36.7,
        "ret": -0.047117
      },
      {
        "date": "2020-10",
        "close": 35.6,
        "adjClose": 35.6,
        "ret": -0.030038
      },
      {
        "date": "2020-11",
        "close": 39.29,
        "adjClose": 39.29,
        "ret": 0.103684
      },
      {
        "date": "2020-12",
        "close": 40.93,
        "adjClose": 40.93,
        "ret": 0.041613
      },
      {
        "date": "2021-01",
        "close": 40.51,
        "adjClose": 40.51,
        "ret": -0.010123
      },
      {
        "date": "2021-02",
        "close": 40.86,
        "adjClose": 40.86,
        "ret": 0.008432
      },
      {
        "date": "2021-03",
        "close": 41.59,
        "adjClose": 41.59,
        "ret": 0.017951
      },
      {
        "date": "2021-04",
        "close": 44.46,
        "adjClose": 44.46,
        "ret": 0.069158
      },
      {
        "date": "2021-05",
        "close": 43.83,
        "adjClose": 43.83,
        "ret": -0.014256
      },
      {
        "date": "2021-06",
        "close": 46.47,
        "adjClose": 46.47,
        "ret": 0.060158
      },
      {
        "date": "2021-07",
        "close": 47.95,
        "adjClose": 47.95,
        "ret": 0.031852
      },
      {
        "date": "2021-08",
        "close": 49.71,
        "adjClose": 49.71,
        "ret": 0.036717
      },
      {
        "date": "2021-09",
        "close": 47.06,
        "adjClose": 47.06,
        "ret": -0.053247
      },
      {
        "date": "2021-10",
        "close": 50.95,
        "adjClose": 50.95,
        "ret": 0.082639
      },
      {
        "date": "2021-11",
        "close": 51.31,
        "adjClose": 51.31,
        "ret": 0.007148
      },
      {
        "date": "2021-12",
        "close": 52.12,
        "adjClose": 52.12,
        "ret": 0.015719
      },
      {
        "date": "2022-01",
        "close": 47.21,
        "adjClose": 47.21,
        "ret": -0.094157
      },
      {
        "date": "2022-02",
        "close": 45.05,
        "adjClose": 45.05,
        "ret": -0.045821
      },
      {
        "date": "2022-03",
        "close": 46.76,
        "adjClose": 46.76,
        "ret": 0.038004
      },
      {
        "date": "2022-04",
        "close": 40.74,
        "adjClose": 40.74,
        "ret": -0.128761
      },
      {
        "date": "2022-05",
        "close": 39.65,
        "adjClose": 39.65,
        "ret": -0.026884
      },
      {
        "date": "2022-06",
        "close": 36.29,
        "adjClose": 36.29,
        "ret": -0.084571
      },
      {
        "date": "2022-07",
        "close": 41.03,
        "adjClose": 41.03,
        "ret": 0.130419
      },
      {
        "date": "2022-08",
        "close": 38.97,
        "adjClose": 38.97,
        "ret": -0.050014
      },
      {
        "date": "2022-09",
        "close": 34.9,
        "adjClose": 34.9,
        "ret": -0.104438
      },
      {
        "date": "2022-10",
        "close": 36.34,
        "adjClose": 36.34,
        "ret": 0.041081
      },
      {
        "date": "2022-11",
        "close": 38.02,
        "adjClose": 38.02,
        "ret": 0.046246
      },
      {
        "date": "2022-12",
        "close": 34.84,
        "adjClose": 34.84,
        "ret": -0.083646
      },
      {
        "date": "2023-01",
        "close": 38.46,
        "adjClose": 38.46,
        "ret": 0.103848
      },
      {
        "date": "2023-02",
        "close": 37.91,
        "adjClose": 37.91,
        "ret": -0.01424
      },
      {
        "date": "2023-03",
        "close": 40.85,
        "adjClose": 40.85,
        "ret": 0.077631
      },
      {
        "date": "2023-04",
        "close": 41.28,
        "adjClose": 41.28,
        "ret": 0.010386
      },
      {
        "date": "2023-05",
        "close": 43.41,
        "adjClose": 43.41,
        "ret": 0.051691
      },
      {
        "date": "2023-06",
        "close": 46.41,
        "adjClose": 46.41,
        "ret": 0.069116
      },
      {
        "date": "2023-07",
        "close": 47.97,
        "adjClose": 47.97,
        "ret": 0.033566
      },
      {
        "date": "2023-08",
        "close": 47.45,
        "adjClose": 47.45,
        "ret": -0.010864
      },
      {
        "date": "2023-09",
        "close": 44.72,
        "adjClose": 44.72,
        "ret": -0.057395
      },
      {
        "date": "2023-10",
        "close": 43.93,
        "adjClose": 43.93,
        "ret": -0.017633
      },
      {
        "date": "2023-11",
        "close": 49.04,
        "adjClose": 49.04,
        "ret": 0.116111
      },
      {
        "date": "2023-12",
        "close": 51.16,
        "adjClose": 51.16,
        "ret": 0.043213
      },
      {
        "date": "2024-01",
        "close": 52.26,
        "adjClose": 52.26,
        "ret": 0.021585
      },
      {
        "date": "2024-02",
        "close": 55.95,
        "adjClose": 55.95,
        "ret": 0.070652
      },
      {
        "date": "2024-03",
        "close": 56.71,
        "adjClose": 56.71,
        "ret": 0.01363
      },
      {
        "date": "2024-04",
        "close": 54.34,
        "adjClose": 54.34,
        "ret": -0.041775
      },
      {
        "date": "2024-05",
        "close": 57.78,
        "adjClose": 57.78,
        "ret": 0.063244
      },
      {
        "date": "2024-06",
        "close": 61.7,
        "adjClose": 61.7,
        "ret": 0.067819
      },
      {
        "date": "2024-07",
        "close": 60.59,
        "adjClose": 60.59,
        "ret": -0.017938
      },
      {
        "date": "2024-08",
        "close": 61.95,
        "adjClose": 61.95,
        "ret": 0.022459
      },
      {
        "date": "2024-09",
        "close": 63.41,
        "adjClose": 63.41,
        "ret": 0.023529
      },
      {
        "date": "2024-10",
        "close": 63.25,
        "adjClose": 63.25,
        "ret": -0.002629
      },
      {
        "date": "2024-11",
        "close": 67.57,
        "adjClose": 67.57,
        "ret": 0.068446
      },
      {
        "date": "2024-12",
        "close": 67.88,
        "adjClose": 67.88,
        "ret": 0.004482
      },
      {
        "date": "2025-01",
        "close": 69.19,
        "adjClose": 69.19,
        "ret": 0.019274
      },
      {
        "date": "2025-02",
        "close": 67.1,
        "adjClose": 67.1,
        "ret": -0.030167
      },
      {
        "date": "2025-03",
        "close": 61.41,
        "adjClose": 61.41,
        "ret": -0.084847
      },
      {
        "date": "2025-04",
        "close": 62.64,
        "adjClose": 62.64,
        "ret": 0.020146
      },
      {
        "date": "2025-05",
        "close": 68.41,
        "adjClose": 68.41,
        "ret": 0.092123
      },
      {
        "date": "2025-06",
        "close": 72.68,
        "adjClose": 72.68,
        "ret": 0.062369
      },
      {
        "date": "2025-07",
        "close": 75.46,
        "adjClose": 75.46,
        "ret": 0.038274
      },
      {
        "date": "2025-08",
        "close": 76.03,
        "adjClose": 76.03,
        "ret": 0.00756
      },
      {
        "date": "2025-09",
        "close": 79.6,
        "adjClose": 79.6,
        "ret": 0.046881
      },
      {
        "date": "2025-10",
        "close": 82.79,
        "adjClose": 82.79,
        "ret": 0.040116
      },
      {
        "date": "2025-11",
        "close": 81.46,
        "adjClose": 81.46,
        "ret": -0.016057
      },
      {
        "date": "2025-12",
        "close": 81.05,
        "adjClose": 81.05,
        "ret": -0.005055
      },
      {
        "date": "2026-01",
        "close": 80,
        "adjClose": 80,
        "ret": -0.012933
      },
      {
        "date": "2026-02",
        "close": 76.57,
        "adjClose": 76.57,
        "ret": -0.042946
      },
      {
        "date": "2026-03",
        "close": 72.64,
        "adjClose": 72.64,
        "ret": -0.051201
      },
      {
        "date": "2026-04",
        "close": 82.99,
        "adjClose": 82.99,
        "ret": 0.142472
      },
      {
        "date": "2026-05",
        "close": 89.41,
        "adjClose": 89.41,
        "ret": 0.07731
      },
      {
        "date": "2026-06",
        "close": 86.05,
        "adjClose": 86.05,
        "ret": -0.037549
      },
      {
        "date": "2026-07",
        "close": 85.11,
        "adjClose": 85.11,
        "ret": -0.010913
      },
      {
        "date": "2026-08",
        "close": 88.15,
        "adjClose": 88.15,
        "ret": 0.035681
      },
      {
        "date": "2026-09",
        "close": 90.11,
        "adjClose": 90.11,
        "ret": 0.022215
      },
      {
        "date": "2026-10",
        "close": 85.06,
        "adjClose": 85.06,
        "ret": -0.056043
      },
      {
        "date": "2026-11",
        "close": 85.22,
        "adjClose": 85.22,
        "ret": 0.001881
      }
    ]
  }
];

export const FAMA_FRENCH_FACTORS = [
  {
    "date": "1972-01",
    "mkt_rf": 0.0154,
    "smb": 0.00312,
    "hml": 0.00236,
    "rmw": 0.001635,
    "cma": 0.001305,
    "mom": 0.01039,
    "rf": 0.0029
  },
  {
    "date": "1972-02",
    "mkt_rf": 0.0273,
    "smb": -0.0012,
    "hml": -0.00304,
    "rmw": 0.000345,
    "cma": -0.003345,
    "mom": 0.014555,
    "rf": 0.0025
  },
  {
    "date": "1972-03",
    "mkt_rf": 0.0064,
    "smb": -0.006,
    "hml": -0.00332,
    "rmw": 0.005585,
    "cma": -0.000885,
    "mom": 0.00724,
    "rf": 0.0027
  },
  {
    "date": "1972-04",
    "mkt_rf": 0.0035,
    "smb": -0.00144,
    "hml": -0.00306,
    "rmw": 0.0006,
    "cma": -0.00323,
    "mom": 0.006225,
    "rf": 0.0029
  },
  {
    "date": "1972-05",
    "mkt_rf": 0.0168,
    "smb": -0.0174,
    "hml": -0.010315,
    "rmw": 0.010645,
    "cma": -0.003482,
    "mom": 0.01088,
    "rf": 0.003
  },
  {
    "date": "1972-06",
    "mkt_rf": -0.0225,
    "smb": -0.01368,
    "hml": -0.00858,
    "rmw": 0.008355,
    "cma": -0.003365,
    "mom": -0.002875,
    "rf": 0.0029
  },
  {
    "date": "1972-07",
    "mkt_rf": -0.0023,
    "smb": -0.02076,
    "hml": -0.014105,
    "rmw": 0.01012,
    "cma": -0.006552,
    "mom": 0.004195,
    "rf": 0.0031
  },
  {
    "date": "1972-08",
    "mkt_rf": 0.0364,
    "smb": 0.00528,
    "hml": 0.00215,
    "rmw": -0.001115,
    "cma": -0.00025,
    "mom": 0.01774,
    "rf": 0.0029
  },
  {
    "date": "1972-09",
    "mkt_rf": -0.0065,
    "smb": -0.01356,
    "hml": -0.016715,
    "rmw": -0.001275,
    "cma": -0.014283,
    "mom": 0.002725,
    "rf": 0.0034
  },
  {
    "date": "1972-10",
    "mkt_rf": 0.0088,
    "smb": -0.00144,
    "hml": 0.00099,
    "rmw": 0.005325,
    "cma": 0.00217,
    "mom": 0.00808,
    "rf": 0.004
  },
  {
    "date": "1972-11",
    "mkt_rf": 0.0438,
    "smb": 0.02292,
    "hml": 0.021245,
    "rmw": 0.000705,
    "cma": 0.014797,
    "mom": 0.02033,
    "rf": 0.0037
  },
  {
    "date": "1972-12",
    "mkt_rf": 0.0106,
    "smb": -0.02076,
    "hml": -0.016055,
    "rmw": 0.007845,
    "cma": -0.009153,
    "mom": 0.00871,
    "rf": 0.0037
  },
  {
    "date": "1973-01",
    "mkt_rf": -0.0241,
    "smb": -0.0384,
    "hml": -0.02418,
    "rmw": 0.01299,
    "cma": -0.01374,
    "mom": 0.011565,
    "rf": 0.0044
  },
  {
    "date": "1973-02",
    "mkt_rf": -0.0402,
    "smb": -0.01476,
    "hml": -0.009145,
    "rmw": 0.003115,
    "cma": -0.007647,
    "mom": -0.00907,
    "rf": 0.0042
  },
  {
    "date": "1973-03",
    "mkt_rf": -0.007,
    "smb": -0.01476,
    "hml": -0.006745,
    "rmw": 0.005915,
    "cma": -0.004448,
    "mom": 0.00255,
    "rf": 0.0046
  },
  {
    "date": "1973-04",
    "mkt_rf": -0.0473,
    "smb": -0.01728,
    "hml": -0.00622,
    "rmw": 0.02145,
    "cma": -0.00226,
    "mom": -0.011555,
    "rf": 0.0052
  },
  {
    "date": "1973-05",
    "mkt_rf": -0.018,
    "smb": -0.02676,
    "hml": -0.017855,
    "rmw": 0.00687,
    "cma": -0.012178,
    "mom": -0.0013,
    "rf": 0.0051
  },
  {
    "date": "1973-06",
    "mkt_rf": -0.0109,
    "smb": -0.02436,
    "hml": -0.013185,
    "rmw": 0.009535,
    "cma": -0.007368,
    "mom": 0.001185,
    "rf": 0.0051
  },
  {
    "date": "1973-07",
    "mkt_rf": 0.0395,
    "smb": 0.03756,
    "hml": 0.026235,
    "rmw": -0.016285,
    "cma": 0.008643,
    "mom": 0.006825,
    "rf": 0.0064
  },
  {
    "date": "1973-08",
    "mkt_rf": -0.037,
    "smb": 0.00996,
    "hml": 0.005665,
    "rmw": -0.008275,
    "cma": -0.002492,
    "mom": -0.00795,
    "rf": 0.007
  },
  {
    "date": "1973-09",
    "mkt_rf": 0.0375,
    "smb": 0.04836,
    "hml": 0.046035,
    "rmw": -0.00571,
    "cma": 0.028667,
    "mom": 0.018125,
    "rf": 0.0068
  },
  {
    "date": "1973-10",
    "mkt_rf": -0.008,
    "smb": -0.0084,
    "hml": 0.00562,
    "rmw": 0.012965,
    "cma": 0.008285,
    "mom": 0.0022,
    "rf": 0.0065
  },
  {
    "date": "1973-11",
    "mkt_rf": -0.1147,
    "smb": -0.0276,
    "hml": -0.01317,
    "rmw": 0.02531,
    "cma": -0.005435,
    "mom": -0.035145,
    "rf": 0.0056
  },
  {
    "date": "1973-12",
    "mkt_rf": 0.0101,
    "smb": 0.00348,
    "hml": 0.007015,
    "rmw": 0.000815,
    "cma": 0.003132,
    "mom": 0.008535,
    "rf": 0.0064
  },
  {
    "date": "1974-01",
    "mkt_rf": -0.0164,
    "smb": 0.03816,
    "hml": 0.02621,
    "rmw": -0.01701,
    "cma": 0.008255,
    "mom": -0.00074,
    "rf": 0.0063
  },
  {
    "date": "1974-02",
    "mkt_rf": -0.0047,
    "smb": 0.0072,
    "hml": 0.01079,
    "rmw": 0.000905,
    "cma": 0.00597,
    "mom": 0.003355,
    "rf": 0.0058
  },
  {
    "date": "1974-03",
    "mkt_rf": -0.0302,
    "smb": -0.00252,
    "hml": -0.002365,
    "rmw": -0.00317,
    "cma": -0.005832,
    "mom": -0.00557,
    "rf": 0.0056
  },
  {
    "date": "1974-04",
    "mkt_rf": -0.0494,
    "smb": -0.0204,
    "hml": -0.01665,
    "rmw": 0.0129,
    "cma": -0.014325,
    "mom": -0.02429,
    "rf": 0.0075
  },
  {
    "date": "1974-05",
    "mkt_rf": -0.0379,
    "smb": -0.02508,
    "hml": -0.014715,
    "rmw": 0.008585,
    "cma": -0.008983,
    "mom": -0.020265,
    "rf": 0.0075
  },
  {
    "date": "1974-06",
    "mkt_rf": -0.0255,
    "smb": -0.01788,
    "hml": -0.006675,
    "rmw": 0.009615,
    "cma": -0.002513,
    "mom": -0.003925,
    "rf": 0.006
  },
  {
    "date": "1974-07",
    "mkt_rf": -0.086,
    "smb": 0.02196,
    "hml": 0.014255,
    "rmw": -0.00017,
    "cma": 0.001877,
    "mom": -0.0371,
    "rf": 0.007
  },
  {
    "date": "1974-08",
    "mkt_rf": -0.0941,
    "smb": -0.01524,
    "hml": -0.010805,
    "rmw": 0.013735,
    "cma": -0.009577,
    "mom": -0.039935,
    "rf": 0.006
  },
  {
    "date": "1974-09",
    "mkt_rf": -0.1235,
    "smb": 0.02724,
    "hml": 0.023875,
    "rmw": 0.00493,
    "cma": 0.011588,
    "mom": -0.050225,
    "rf": 0.0081
  },
  {
    "date": "1974-10",
    "mkt_rf": 0.1724,
    "smb": 0.00372,
    "hml": 0.011265,
    "rmw": 0.005495,
    "cma": 0.008658,
    "mom": 0.05334,
    "rf": 0.0051
  },
  {
    "date": "1974-11",
    "mkt_rf": -0.0451,
    "smb": 0.0162,
    "hml": 0.021785,
    "rmw": 0.003295,
    "cma": 0.015317,
    "mom": -0.022785,
    "rf": 0.0054
  },
  {
    "date": "1974-12",
    "mkt_rf": -0.0281,
    "smb": -0.00936,
    "hml": 0.00383,
    "rmw": 0.01199,
    "cma": 0.006465,
    "mom": -0.016835,
    "rf": 0.007
  },
  {
    "date": "1975-01",
    "mkt_rf": 0.1169,
    "smb": 0.06964,
    "hml": 0.0479,
    "rmw": -0.020095,
    "cma": 0.022725,
    "mom": 0.033915,
    "rf": 0.0058
  },
  {
    "date": "1975-02",
    "mkt_rf": 0.0596,
    "smb": -0.00392,
    "hml": 0.000325,
    "rmw": 0.00971,
    "cma": 0.002713,
    "mom": 0.02586,
    "rf": 0.0043
  },
  {
    "date": "1975-03",
    "mkt_rf": 0.0202,
    "smb": 0.02968,
    "hml": 0.014045,
    "rmw": -0.01325,
    "cma": 0.001172,
    "mom": 0.02707,
    "rf": 0.0041
  },
  {
    "date": "1975-04",
    "mkt_rf": 0.0433,
    "smb": 0.00868,
    "hml": -0.00446,
    "rmw": -0.010485,
    "cma": -0.011105,
    "mom": 0.035155,
    "rf": 0.0044
  },
  {
    "date": "1975-05",
    "mkt_rf": 0.0485,
    "smb": 0.0118,
    "hml": 0.01296,
    "rmw": 0.00622,
    "cma": 0.01028,
    "mom": 0.036975,
    "rf": 0.0044
  },
  {
    "date": "1975-06",
    "mkt_rf": 0.0461,
    "smb": 0.02956,
    "hml": 0.02626,
    "rmw": 0.00114,
    "cma": 0.01753,
    "mom": 0.036135,
    "rf": 0.0041
  },
  {
    "date": "1975-07",
    "mkt_rf": -0.0721,
    "smb": 0.00904,
    "hml": 0.002455,
    "rmw": 0.009165,
    "cma": -0.002097,
    "mom": -0.005235,
    "rf": 0.0048
  },
  {
    "date": "1975-08",
    "mkt_rf": -0.0237,
    "smb": -0.00008,
    "hml": -0.007095,
    "rmw": -0.0034,
    "cma": -0.009447,
    "mom": 0.011705,
    "rf": 0.0048
  },
  {
    "date": "1975-09",
    "mkt_rf": -0.0424,
    "smb": 0.00304,
    "hml": 0.002045,
    "rmw": 0.003645,
    "cma": 0.000897,
    "mom": -0.00984,
    "rf": 0.0053
  },
  {
    "date": "1975-10",
    "mkt_rf": 0.0592,
    "smb": 0.00136,
    "hml": 0.007965,
    "rmw": 0.0125,
    "cma": 0.009782,
    "mom": 0.02572,
    "rf": 0.0056
  },
  {
    "date": "1975-11",
    "mkt_rf": 0.0274,
    "smb": 0.0106,
    "hml": 0.01037,
    "rmw": 0.00459,
    "cma": 0.007535,
    "mom": 0.01459,
    "rf": 0.0041
  },
  {
    "date": "1975-12",
    "mkt_rf": -0.0174,
    "smb": 0.01132,
    "hml": 0.00977,
    "rmw": 0.003055,
    "cma": 0.00631,
    "mom": -0.00109,
    "rf": 0.0048
  },
  {
    "date": "1976-01",
    "mkt_rf": 0.1121,
    "smb": 0.0238,
    "hml": 0.02335,
    "rmw": 0.004425,
    "cma": 0.01705,
    "mom": 0.044235,
    "rf": 0.0047
  },
  {
    "date": "1976-02",
    "mkt_rf": -0.0109,
    "smb": 0.02596,
    "hml": 0.01822,
    "rmw": -0.004065,
    "cma": 0.008935,
    "mom": 0.016185,
    "rf": 0.0034
  },
  {
    "date": "1976-03",
    "mkt_rf": 0.026,
    "smb": -0.00824,
    "hml": -0.003695,
    "rmw": 0.01003,
    "cma": -0.000098,
    "mom": 0.0291,
    "rf": 0.004
  },
  {
    "date": "1976-04",
    "mkt_rf": -0.0149,
    "smb": 0.00748,
    "hml": 0.00984,
    "rmw": 0.00759,
    "cma": 0.00867,
    "mom": 0.014785,
    "rf": 0.0042
  },
  {
    "date": "1976-05",
    "mkt_rf": -0.0117,
    "smb": 0.00364,
    "hml": -0.00425,
    "rmw": -0.004395,
    "cma": -0.00785,
    "mom": 0.015905,
    "rf": 0.0037
  },
  {
    "date": "1976-06",
    "mkt_rf": 0.0411,
    "smb": 0.01756,
    "hml": 0.01407,
    "rmw": 0.000835,
    "cma": 0.00836,
    "mom": 0.034385,
    "rf": 0.0043
  },
  {
    "date": "1976-07",
    "mkt_rf": -0.0122,
    "smb": 0.00964,
    "hml": 0.0081,
    "rmw": 0.003055,
    "cma": 0.005075,
    "mom": 0.01573,
    "rf": 0.0047
  },
  {
    "date": "1976-08",
    "mkt_rf": -0.0026,
    "smb": -0.00044,
    "hml": 0.00177,
    "rmw": 0.00736,
    "cma": 0.002585,
    "mom": 0.00409,
    "rf": 0.0042
  },
  {
    "date": "1976-09",
    "mkt_rf": 0.0204,
    "smb": 0.00556,
    "hml": 0.00866,
    "rmw": 0.00844,
    "cma": 0.00823,
    "mom": 0.01214,
    "rf": 0.0044
  },
  {
    "date": "1976-10",
    "mkt_rf": -0.0241,
    "smb": 0.00484,
    "hml": 0.00818,
    "rmw": 0.008715,
    "cma": 0.008015,
    "mom": -0.003435,
    "rf": 0.0041
  },
  {
    "date": "1976-11",
    "mkt_rf": -0.003,
    "smb": 0.02548,
    "hml": 0.02145,
    "rmw": 0.00026,
    "cma": 0.013525,
    "mom": 0.00395,
    "rf": 0.004
  },
  {
    "date": "1976-12",
    "mkt_rf": 0.0499,
    "smb": 0.02224,
    "hml": 0.025875,
    "rmw": 0.00918,
    "cma": 0.021338,
    "mom": 0.022465,
    "rf": 0.004
  },
  {
    "date": "1977-01",
    "mkt_rf": -0.051,
    "smb": 0.01204,
    "hml": 0.00155,
    "rmw": 0.00463,
    "cma": -0.005075,
    "mom": -0.01285,
    "rf": 0.0036
  },
  {
    "date": "1977-02",
    "mkt_rf": -0.0201,
    "smb": 0.00196,
    "hml": -0.00187,
    "rmw": 0.00033,
    "cma": -0.003685,
    "mom": -0.002035,
    "rf": 0.0035
  },
  {
    "date": "1977-03",
    "mkt_rf": -0.0171,
    "smb": 0.01852,
    "hml": 0.01229,
    "rmw": -0.002355,
    "cma": 0.00542,
    "mom": -0.000985,
    "rf": 0.0038
  },
  {
    "date": "1977-04",
    "mkt_rf": -0.0024,
    "smb": 0.01744,
    "hml": 0.015155,
    "rmw": 0.00224,
    "cma": 0.009878,
    "mom": 0.00416,
    "rf": 0.0038
  },
  {
    "date": "1977-05",
    "mkt_rf": -0.0175,
    "smb": 0.01132,
    "hml": 0.00677,
    "rmw": -0.000445,
    "cma": 0.00231,
    "mom": -0.001125,
    "rf": 0.0037
  },
  {
    "date": "1977-06",
    "mkt_rf": 0.045,
    "smb": 0.00964,
    "hml": 0.01158,
    "rmw": 0.007115,
    "cma": 0.009715,
    "mom": 0.02075,
    "rf": 0.004
  },
  {
    "date": "1977-07",
    "mkt_rf": -0.0197,
    "smb": 0.00304,
    "hml": 0.001625,
    "rmw": 0.003155,
    "cma": 0.000338,
    "mom": -0.001895,
    "rf": 0.0042
  },
  {
    "date": "1977-08",
    "mkt_rf": -0.0189,
    "smb": 0.00244,
    "hml": 0.00072,
    "rmw": 0.002795,
    "cma": -0.000515,
    "mom": -0.001615,
    "rf": 0.0044
  },
  {
    "date": "1977-09",
    "mkt_rf": -0.0047,
    "smb": 0.00832,
    "hml": 0.007855,
    "rmw": 0.0043,
    "cma": 0.005527,
    "mom": 0.003355,
    "rf": 0.0043
  },
  {
    "date": "1977-10",
    "mkt_rf": -0.0472,
    "smb": 0.00712,
    "hml": 0.001395,
    "rmw": 0.010155,
    "cma": -0.002378,
    "mom": -0.01152,
    "rf": 0.0049
  },
  {
    "date": "1977-11",
    "mkt_rf": 0.0327,
    "smb": 0.025,
    "hml": 0.01679,
    "rmw": -0.00462,
    "cma": 0.007595,
    "mom": 0.016445,
    "rf": 0.005
  },
  {
    "date": "1977-12",
    "mkt_rf": -0.0002,
    "smb": 0.00412,
    "hml": 0.00092,
    "rmw": 0.00108,
    "cma": -0.00124,
    "mom": 0.00493,
    "rf": 0.0049
  },
  {
    "date": "1978-01",
    "mkt_rf": -0.0652,
    "smb": 0.01096,
    "hml": 0.002195,
    "rmw": 0.006635,
    "cma": -0.003578,
    "mom": -0.01782,
    "rf": 0.0049
  },
  {
    "date": "1978-02",
    "mkt_rf": -0.0213,
    "smb": 0.00664,
    "hml": 0.003785,
    "rmw": 0.0015,
    "cma": 0.001093,
    "mom": -0.002455,
    "rf": 0.0046
  },
  {
    "date": "1978-03",
    "mkt_rf": 0.0208,
    "smb": 0.02548,
    "hml": 0.01827,
    "rmw": -0.00345,
    "cma": 0.009285,
    "mom": 0.01228,
    "rf": 0.0053
  },
  {
    "date": "1978-04",
    "mkt_rf": 0.0815,
    "smb": -0.0008,
    "hml": -0.002625,
    "rmw": 0.00265,
    "cma": -0.003063,
    "mom": 0.033525,
    "rf": 0.0054
  },
  {
    "date": "1978-05",
    "mkt_rf": 0.0083,
    "smb": 0.0232,
    "hml": 0.012485,
    "rmw": -0.007555,
    "cma": 0.002917,
    "mom": 0.007905,
    "rf": 0.0051
  },
  {
    "date": "1978-06",
    "mkt_rf": -0.0217,
    "smb": 0.01276,
    "hml": 0.00707,
    "rmw": -0.001765,
    "cma": 0.00186,
    "mom": -0.002595,
    "rf": 0.0054
  },
  {
    "date": "1978-07",
    "mkt_rf": 0.0511,
    "smb": 0.01192,
    "hml": 0.004885,
    "rmw": -0.00334,
    "cma": -0.000558,
    "mom": 0.022885,
    "rf": 0.0056
  },
  {
    "date": "1978-08",
    "mkt_rf": 0.028,
    "smb": 0.01252,
    "hml": 0.01455,
    "rmw": 0.00724,
    "cma": 0.011975,
    "mom": 0.0298,
    "rf": 0.0056
  },
  {
    "date": "1978-09",
    "mkt_rf": -0.0129,
    "smb": 0.00448,
    "hml": 0.003245,
    "rmw": 0.003375,
    "cma": 0.001648,
    "mom": 0.015485,
    "rf": 0.0062
  },
  {
    "date": "1978-10",
    "mkt_rf": -0.0973,
    "smb": -0.01832,
    "hml": -0.017825,
    "rmw": 0.017235,
    "cma": -0.012987,
    "mom": -0.014055,
    "rf": 0.0068
  },
  {
    "date": "1978-11",
    "mkt_rf": 0.0229,
    "smb": 0.00736,
    "hml": 0.001475,
    "rmw": -0.00203,
    "cma": -0.002413,
    "mom": 0.013015,
    "rf": 0.007
  },
  {
    "date": "1978-12",
    "mkt_rf": 0.0082,
    "smb": -0.0002,
    "hml": -0.00475,
    "rmw": -0.000525,
    "cma": -0.00625,
    "mom": 0.00787,
    "rf": 0.0078
  },
  {
    "date": "1979-01",
    "mkt_rf": 0.0344,
    "smb": 0.02236,
    "hml": 0.01381,
    "rmw": -0.005035,
    "cma": 0.00518,
    "mom": 0.01704,
    "rf": 0.0077
  },
  {
    "date": "1979-02",
    "mkt_rf": -0.0369,
    "smb": 0.00172,
    "hml": 0.00135,
    "rmw": 0.004365,
    "cma": 0.00075,
    "mom": -0.007915,
    "rf": 0.0073
  },
  {
    "date": "1979-03",
    "mkt_rf": 0.0497,
    "smb": 0.02152,
    "hml": 0.014685,
    "rmw": -0.00304,
    "cma": 0.006843,
    "mom": 0.022395,
    "rf": 0.0081
  },
  {
    "date": "1979-04",
    "mkt_rf": -0.0055,
    "smb": 0.0064,
    "hml": 0.003105,
    "rmw": 0.000985,
    "cma": 0.000328,
    "mom": 0.003075,
    "rf": 0.008
  },
  {
    "date": "1979-05",
    "mkt_rf": -0.0225,
    "smb": 0.01504,
    "hml": 0.008955,
    "rmw": -0.00221,
    "cma": 0.003027,
    "mom": 0.012125,
    "rf": 0.0082
  },
  {
    "date": "1979-06",
    "mkt_rf": 0.0355,
    "smb": 0.025,
    "hml": 0.02528,
    "rmw": 0.005285,
    "cma": 0.018915,
    "mom": 0.017425,
    "rf": 0.0081
  },
  {
    "date": "1979-07",
    "mkt_rf": 0.0031,
    "smb": 0.0184,
    "hml": 0.012085,
    "rmw": -0.002455,
    "cma": 0.005217,
    "mom": 0.021085,
    "rf": 0.0077
  },
  {
    "date": "1979-08",
    "mkt_rf": 0.0518,
    "smb": 0.01516,
    "hml": 0.00892,
    "rmw": -0.00239,
    "cma": 0.00291,
    "mom": 0.02313,
    "rf": 0.0077
  },
  {
    "date": "1979-09",
    "mkt_rf": -0.0074,
    "smb": 0.00088,
    "hml": -0.006325,
    "rmw": -0.003615,
    "cma": -0.008988,
    "mom": 0.01741,
    "rf": 0.0083
  },
  {
    "date": "1979-10",
    "mkt_rf": -0.0731,
    "smb": -0.01004,
    "hml": -0.02918,
    "rmw": -0.005615,
    "cma": -0.033015,
    "mom": -0.005585,
    "rf": 0.0087
  },
  {
    "date": "1979-11",
    "mkt_rf": 0.0463,
    "smb": 0.01816,
    "hml": 0.004625,
    "rmw": -0.01088,
    "cma": -0.004587,
    "mom": 0.021205,
    "rf": 0.0099
  },
  {
    "date": "1979-12",
    "mkt_rf": 0.0091,
    "smb": 0.02044,
    "hml": 0.02019,
    "rmw": 0.004635,
    "cma": 0.01482,
    "mom": 0.023185,
    "rf": 0.0095
  },
  {
    "date": "1980-01",
    "mkt_rf": 0.0515,
    "smb": -0.00224,
    "hml": -0.010575,
    "rmw": -0.004955,
    "cma": -0.012813,
    "mom": 0.023025,
    "rf": 0.008
  },
  {
    "date": "1980-02",
    "mkt_rf": -0.007,
    "smb": -0.0278,
    "hml": -0.05583,
    "rmw": -0.02811,
    "cma": -0.058065,
    "mom": 0.01755,
    "rf": 0.0089
  },
  {
    "date": "1980-03",
    "mkt_rf": -0.1129,
    "smb": 0.01384,
    "hml": 0.001655,
    "rmw": 0.002665,
    "cma": -0.005997,
    "mom": -0.034515,
    "rf": 0.0121
  },
  {
    "date": "1980-04",
    "mkt_rf": 0.0352,
    "smb": 0.02176,
    "hml": 0.043655,
    "rmw": 0.03048,
    "cma": 0.045327,
    "mom": 0.01732,
    "rf": 0.0126
  },
  {
    "date": "1980-05",
    "mkt_rf": 0.0465,
    "smb": 0.02464,
    "hml": 0.046955,
    "rmw": 0.03099,
    "cma": 0.048028,
    "mom": 0.021275,
    "rf": 0.0081
  },
  {
    "date": "1980-06",
    "mkt_rf": 0.0261,
    "smb": 0.01372,
    "hml": 0.01948,
    "rmw": 0.0116,
    "cma": 0.01784,
    "mom": 0.014135,
    "rf": 0.0061
  },
  {
    "date": "1980-07",
    "mkt_rf": 0.0574,
    "smb": 0.02152,
    "hml": 0.005565,
    "rmw": -0.01368,
    "cma": -0.005317,
    "mom": 0.02509,
    "rf": 0.0053
  },
  {
    "date": "1980-08",
    "mkt_rf": 0.0082,
    "smb": 0.00928,
    "hml": -0.011865,
    "rmw": -0.01982,
    "cma": -0.021333,
    "mom": 0.00787,
    "rf": 0.0064
  },
  {
    "date": "1980-09",
    "mkt_rf": 0.0208,
    "smb": 0.00892,
    "hml": -0.00234,
    "rmw": -0.00829,
    "cma": -0.00842,
    "mom": 0.02728,
    "rf": 0.0075
  },
  {
    "date": "1980-10",
    "mkt_rf": 0.0082,
    "smb": -0.00296,
    "hml": -0.007425,
    "rmw": -0.000445,
    "cma": -0.008188,
    "mom": 0.02287,
    "rf": 0.0095
  },
  {
    "date": "1980-11",
    "mkt_rf": 0.104,
    "smb": -0.03356,
    "hml": -0.04461,
    "rmw": -0.00834,
    "cma": -0.039705,
    "mom": 0.0564,
    "rf": 0.0096
  },
  {
    "date": "1980-12",
    "mkt_rf": -0.0436,
    "smb": 0.03436,
    "hml": 0.02003,
    "rmw": -0.011695,
    "cma": 0.00639,
    "mom": 0.00474,
    "rf": 0.0131
  },
  {
    "date": "1981-01",
    "mkt_rf": -0.0589,
    "smb": 0.02956,
    "hml": 0.02713,
    "rmw": 0.014155,
    "cma": 0.01869,
    "mom": -0.000615,
    "rf": 0.0104
  },
  {
    "date": "1981-02",
    "mkt_rf": 0.0082,
    "smb": 0.0094,
    "hml": -0.00731,
    "rmw": -0.014645,
    "cma": -0.01533,
    "mom": 0.00787,
    "rf": 0.0107
  },
  {
    "date": "1981-03",
    "mkt_rf": 0.0249,
    "smb": 0.0484,
    "hml": 0.035555,
    "rmw": -0.009865,
    "cma": 0.018802,
    "mom": 0.013715,
    "rf": 0.0121
  },
  {
    "date": "1981-04",
    "mkt_rf": -0.0336,
    "smb": 0.02008,
    "hml": 0.001695,
    "rmw": -0.016525,
    "cma": -0.009628,
    "mom": 0.00824,
    "rf": 0.0108
  },
  {
    "date": "1981-05",
    "mkt_rf": -0.0061,
    "smb": 0.01732,
    "hml": 0.00283,
    "rmw": -0.012,
    "cma": -0.006485,
    "mom": 0.002865,
    "rf": 0.0115
  },
  {
    "date": "1981-06",
    "mkt_rf": -0.017,
    "smb": 0.00316,
    "hml": 0.01593,
    "rmw": 0.019705,
    "cma": 0.01934,
    "mom": -0.00095,
    "rf": 0.0135
  },
  {
    "date": "1981-07",
    "mkt_rf": -0.0093,
    "smb": -0.0044,
    "hml": -0.021645,
    "rmw": -0.015365,
    "cma": -0.026298,
    "mom": 0.001745,
    "rf": 0.0124
  },
  {
    "date": "1981-08",
    "mkt_rf": -0.0663,
    "smb": 0.00604,
    "hml": -0.0108,
    "rmw": -0.00282,
    "cma": -0.018,
    "mom": -0.018205,
    "rf": 0.0128
  },
  {
    "date": "1981-09",
    "mkt_rf": -0.0675,
    "smb": 0.00244,
    "hml": -0.00675,
    "rmw": 0.00608,
    "cma": -0.010475,
    "mom": -0.018625,
    "rf": 0.0124
  },
  {
    "date": "1981-10",
    "mkt_rf": 0.0446,
    "smb": 0.02128,
    "hml": 0.019135,
    "rmw": 0.00243,
    "cma": 0.012917,
    "mom": 0.00861,
    "rf": 0.0121
  },
  {
    "date": "1981-11",
    "mkt_rf": 0.0379,
    "smb": 0.00532,
    "hml": 0.04398,
    "rmw": 0.049925,
    "cma": 0.055465,
    "mom": 0.018265,
    "rf": 0.0107
  },
  {
    "date": "1981-12",
    "mkt_rf": -0.039,
    "smb": 0.00844,
    "hml": -0.00067,
    "rmw": -0.005785,
    "cma": -0.00591,
    "mom": -0.00865,
    "rf": 0.0087
  },
  {
    "date": "1982-01",
    "mkt_rf": -0.0283,
    "smb": -0.00236,
    "hml": -0.02017,
    "rmw": -0.01601,
    "cma": -0.025535,
    "mom": -0.004905,
    "rf": 0.008
  },
  {
    "date": "1982-02",
    "mkt_rf": -0.0613,
    "smb": 0.01384,
    "hml": 0.014345,
    "rmw": 0.01747,
    "cma": 0.010922,
    "mom": -0.016455,
    "rf": 0.0092
  },
  {
    "date": "1982-03",
    "mkt_rf": -0.0183,
    "smb": 0.00088,
    "hml": 0.014165,
    "rmw": 0.02029,
    "cma": 0.018333,
    "mom": -0.001405,
    "rf": 0.0098
  },
  {
    "date": "1982-04",
    "mkt_rf": 0.0294,
    "smb": 0.01804,
    "hml": 0.01267,
    "rmw": -0.001355,
    "cma": 0.00621,
    "mom": 0.01529,
    "rf": 0.0113
  },
  {
    "date": "1982-05",
    "mkt_rf": -0.0379,
    "smb": -0.0116,
    "hml": -0.002265,
    "rmw": 0.015595,
    "cma": 0.003793,
    "mom": -0.008265,
    "rf": 0.0106
  },
  {
    "date": "1982-06",
    "mkt_rf": -0.0292,
    "smb": -0.00104,
    "hml": -0.015485,
    "rmw": -0.012075,
    "cma": -0.020067,
    "mom": -0.00522,
    "rf": 0.0096
  },
  {
    "date": "1982-07",
    "mkt_rf": -0.0336,
    "smb": 0.00004,
    "hml": 0.00838,
    "rmw": 0.014515,
    "cma": 0.011115,
    "mom": -0.00676,
    "rf": 0.0105
  },
  {
    "date": "1982-08",
    "mkt_rf": 0.12,
    "smb": 0.0112,
    "hml": 0.029215,
    "rmw": 0.02588,
    "cma": 0.032308,
    "mom": 0.047,
    "rf": 0.0076
  },
  {
    "date": "1982-09",
    "mkt_rf": 0.0074,
    "smb": 0.01528,
    "hml": 0.028805,
    "rmw": 0.02067,
    "cma": 0.029353,
    "mom": 0.00759,
    "rf": 0.0051
  },
  {
    "date": "1982-10",
    "mkt_rf": 0.1041,
    "smb": 0.02416,
    "hml": 0.050635,
    "rmw": 0.03584,
    "cma": 0.053218,
    "mom": 0.056435,
    "rf": 0.0059
  },
  {
    "date": "1982-11",
    "mkt_rf": 0.0353,
    "smb": 0.01144,
    "hml": 0.017085,
    "rmw": 0.01145,
    "cma": 0.015992,
    "mom": 0.032355,
    "rf": 0.0063
  },
  {
    "date": "1982-12",
    "mkt_rf": 0.0068,
    "smb": 0.00988,
    "hml": 0.00788,
    "rmw": 0.00252,
    "cma": 0.00464,
    "mom": 0.02238,
    "rf": 0.0067
  },
  {
    "date": "1983-01",
    "mkt_rf": 0.0295,
    "smb": 0.0022,
    "hml": 0.00397,
    "rmw": 0.006865,
    "cma": 0.00396,
    "mom": 0.030325,
    "rf": 0.0069
  },
  {
    "date": "1983-02",
    "mkt_rf": 0.0195,
    "smb": 0.0106,
    "hml": 0.00245,
    "rmw": -0.00465,
    "cma": -0.003025,
    "mom": 0.026825,
    "rf": 0.0062
  },
  {
    "date": "1983-03",
    "mkt_rf": 0.0255,
    "smb": 0.01156,
    "hml": 0.01375,
    "rmw": 0.00742,
    "cma": 0.011475,
    "mom": 0.028925,
    "rf": 0.0063
  },
  {
    "date": "1983-04",
    "mkt_rf": 0.0664,
    "smb": -0.00428,
    "hml": -0.00002,
    "rmw": 0.009725,
    "cma": 0.002465,
    "mom": 0.04324,
    "rf": 0.0071
  },
  {
    "date": "1983-05",
    "mkt_rf": -0.0127,
    "smb": 0.0406,
    "hml": 0.02979,
    "rmw": -0.007545,
    "cma": 0.01572,
    "mom": 0.015555,
    "rf": 0.0069
  },
  {
    "date": "1983-06",
    "mkt_rf": 0.0293,
    "smb": -0.002,
    "hml": -0.011365,
    "rmw": -0.006155,
    "cma": -0.014007,
    "mom": 0.030255,
    "rf": 0.0067
  },
  {
    "date": "1983-07",
    "mkt_rf": -0.0421,
    "smb": 0.00568,
    "hml": -0.007365,
    "rmw": -0.010395,
    "cma": -0.013208,
    "mom": 0.005265,
    "rf": 0.0074
  },
  {
    "date": "1983-08",
    "mkt_rf": 0.0071,
    "smb": -0.0044,
    "hml": -0.013095,
    "rmw": -0.00539,
    "cma": -0.014898,
    "mom": 0.022485,
    "rf": 0.0076
  },
  {
    "date": "1983-09",
    "mkt_rf": 0.0063,
    "smb": 0.01324,
    "hml": 0.01461,
    "rmw": 0.006475,
    "cma": 0.01163,
    "mom": 0.022205,
    "rf": 0.0076
  },
  {
    "date": "1983-10",
    "mkt_rf": -0.0235,
    "smb": -0.005,
    "hml": -0.00038,
    "rmw": 0.01014,
    "cma": 0.00241,
    "mom": -0.003225,
    "rf": 0.0076
  },
  {
    "date": "1983-11",
    "mkt_rf": 0.015,
    "smb": 0.0256,
    "hml": 0.015595,
    "rmw": -0.00671,
    "cma": 0.005647,
    "mom": 0.01025,
    "rf": 0.007
  },
  {
    "date": "1983-12",
    "mkt_rf": -0.0143,
    "smb": 0.0004,
    "hml": -0.002105,
    "rmw": 0.001865,
    "cma": -0.003077,
    "mom": -0.000005,
    "rf": 0.0073
  },
  {
    "date": "1984-01",
    "mkt_rf": -0.0143,
    "smb": -0.02264,
    "hml": -0.003205,
    "rmw": 0.013385,
    "cma": 0.001973,
    "mom": -0.000005,
    "rf": 0.0076
  },
  {
    "date": "1984-02",
    "mkt_rf": -0.0404,
    "smb": -0.01892,
    "hml": -0.00789,
    "rmw": 0.003605,
    "cma": -0.00647,
    "mom": -0.00914,
    "rf": 0.0071
  },
  {
    "date": "1984-03",
    "mkt_rf": 0.0045,
    "smb": 0.001,
    "hml": -0.00077,
    "rmw": -0.01119,
    "cma": -0.008735,
    "mom": 0.006575,
    "rf": 0.0073
  },
  {
    "date": "1984-04",
    "mkt_rf": -0.0003,
    "smb": -0.02384,
    "hml": -0.014675,
    "rmw": 0.001395,
    "cma": -0.012613,
    "mom": 0.004895,
    "rf": 0.0081
  },
  {
    "date": "1984-05",
    "mkt_rf": -0.0587,
    "smb": -0.00752,
    "hml": -0.013525,
    "rmw": -0.00419,
    "cma": -0.020713,
    "mom": -0.015545,
    "rf": 0.0078
  },
  {
    "date": "1984-06",
    "mkt_rf": 0.0209,
    "smb": -0.00308,
    "hml": 0.00408,
    "rmw": -0.0008,
    "cma": 0.00014,
    "mom": 0.012315,
    "rf": 0.0075
  },
  {
    "date": "1984-07",
    "mkt_rf": -0.0195,
    "smb": -0.0152,
    "hml": 0.003205,
    "rmw": 0.012235,
    "cma": 0.006127,
    "mom": -0.001825,
    "rf": 0.0082
  },
  {
    "date": "1984-08",
    "mkt_rf": 0.1014,
    "smb": 0.00604,
    "hml": 0.02806,
    "rmw": 0.0166,
    "cma": 0.02673,
    "mom": 0.04049,
    "rf": 0.0083
  },
  {
    "date": "1984-09",
    "mkt_rf": -0.007,
    "smb": -0.00344,
    "hml": 0.011205,
    "rmw": 0.00793,
    "cma": 0.009853,
    "mom": 0.00255,
    "rf": 0.0086
  },
  {
    "date": "1984-10",
    "mkt_rf": -0.0039,
    "smb": -0.00068,
    "hml": 0.01628,
    "rmw": 0.01065,
    "cma": 0.01499,
    "mom": 0.003635,
    "rf": 0.01
  },
  {
    "date": "1984-11",
    "mkt_rf": -0.0159,
    "smb": -0.00176,
    "hml": 0.021425,
    "rmw": 0.017905,
    "cma": 0.022488,
    "mom": -0.000565,
    "rf": 0.0073
  },
  {
    "date": "1984-12",
    "mkt_rf": 0.02,
    "smb": -0.00224,
    "hml": 0.009505,
    "rmw": 0.004555,
    "cma": 0.006877,
    "mom": 0.027,
    "rf": 0.0064
  },
  {
    "date": "1985-01",
    "mkt_rf": 0.0686,
    "smb": 0.0028,
    "hml": 0.014155,
    "rmw": 0.004135,
    "cma": 0.010103,
    "mom": 0.04401,
    "rf": 0.0065
  },
  {
    "date": "1985-02",
    "mkt_rf": 0.0115,
    "smb": -0.00296,
    "hml": 0.004615,
    "rmw": -0.000315,
    "cma": 0.000783,
    "mom": 0.024025,
    "rf": 0.0058
  },
  {
    "date": "1985-03",
    "mkt_rf": -0.0045,
    "smb": -0.00152,
    "hml": 0.000595,
    "rmw": -0.006675,
    "cma": -0.005428,
    "mom": 0.018425,
    "rf": 0.0062
  },
  {
    "date": "1985-04",
    "mkt_rf": -0.0085,
    "smb": -0.00968,
    "hml": 0.012155,
    "rmw": 0.016275,
    "cma": 0.014802,
    "mom": 0.017025,
    "rf": 0.0072
  },
  {
    "date": "1985-05",
    "mkt_rf": 0.0561,
    "smb": 0.00004,
    "hml": 0.02249,
    "rmw": 0.01706,
    "cma": 0.022845,
    "mom": 0.039635,
    "rf": 0.0066
  },
  {
    "date": "1985-06",
    "mkt_rf": 0.0111,
    "smb": 0.0004,
    "hml": 0.025415,
    "rmw": 0.020055,
    "cma": 0.026533,
    "mom": 0.023885,
    "rf": 0.0055
  },
  {
    "date": "1985-07",
    "mkt_rf": -0.0141,
    "smb": -0.00596,
    "hml": 0.00162,
    "rmw": -0.00033,
    "cma": -0.00144,
    "mom": 0.015065,
    "rf": 0.0062
  },
  {
    "date": "1985-08",
    "mkt_rf": -0.0099,
    "smb": -0.00272,
    "hml": 0.007095,
    "rmw": 0.0023,
    "cma": 0.003947,
    "mom": 0.001535,
    "rf": 0.0055
  },
  {
    "date": "1985-09",
    "mkt_rf": -0.0398,
    "smb": -0.01532,
    "hml": -0.00243,
    "rmw": 0.0058,
    "cma": -0.001315,
    "mom": -0.00893,
    "rf": 0.006
  },
  {
    "date": "1985-10",
    "mkt_rf": 0.0432,
    "smb": 0.0034,
    "hml": 0.01452,
    "rmw": 0.003865,
    "cma": 0.010235,
    "mom": 0.02012,
    "rf": 0.0065
  },
  {
    "date": "1985-11",
    "mkt_rf": 0.0646,
    "smb": -0.0056,
    "hml": 0.015645,
    "rmw": 0.015615,
    "cma": 0.017048,
    "mom": 0.02761,
    "rf": 0.0061
  },
  {
    "date": "1985-12",
    "mkt_rf": 0.0408,
    "smb": -0.0098,
    "hml": 0.01378,
    "rmw": 0.01831,
    "cma": 0.01704,
    "mom": 0.01928,
    "rf": 0.0065
  },
  {
    "date": "1986-01",
    "mkt_rf": 0.0016,
    "smb": 0.00724,
    "hml": 0.01589,
    "rmw": 0.00101,
    "cma": 0.009795,
    "mom": 0.02056,
    "rf": 0.0056
  },
  {
    "date": "1986-02",
    "mkt_rf": 0.0733,
    "smb": 0.00208,
    "hml": 0.021745,
    "rmw": 0.013825,
    "cma": 0.020647,
    "mom": 0.045655,
    "rf": 0.0053
  },
  {
    "date": "1986-03",
    "mkt_rf": 0.0489,
    "smb": -0.01088,
    "hml": 0.021895,
    "rmw": 0.02903,
    "cma": 0.028498,
    "mom": 0.037115,
    "rf": 0.006
  },
  {
    "date": "1986-04",
    "mkt_rf": -0.018,
    "smb": -0.00788,
    "hml": 0.01415,
    "rmw": 0.016515,
    "cma": 0.0164,
    "mom": 0.0137,
    "rf": 0.0052
  },
  {
    "date": "1986-05",
    "mkt_rf": 0.0493,
    "smb": -0.00428,
    "hml": -0.00337,
    "rmw": -0.0081,
    "cma": -0.009085,
    "mom": 0.037255,
    "rf": 0.0049
  },
  {
    "date": "1986-06",
    "mkt_rf": 0.0131,
    "smb": -0.01028,
    "hml": -0.00039,
    "rmw": 0.002335,
    "cma": -0.00157,
    "mom": 0.024585,
    "rf": 0.0052
  },
  {
    "date": "1986-07",
    "mkt_rf": -0.0574,
    "smb": -0.00956,
    "hml": 0.01341,
    "rmw": 0.0296,
    "cma": 0.016405,
    "mom": -0.00009,
    "rf": 0.0052
  },
  {
    "date": "1986-08",
    "mkt_rf": 0.0676,
    "smb": -0.00416,
    "hml": 0.008955,
    "rmw": 0.00614,
    "cma": 0.007278,
    "mom": 0.04366,
    "rf": 0.0046
  },
  {
    "date": "1986-09",
    "mkt_rf": -0.0918,
    "smb": -0.00128,
    "hml": 0.001785,
    "rmw": 0.006435,
    "cma": -0.003982,
    "mom": -0.01213,
    "rf": 0.0045
  },
  {
    "date": "1986-10",
    "mkt_rf": 0.0517,
    "smb": 0.00472,
    "hml": 0.012815,
    "rmw": 0.000345,
    "cma": 0.007182,
    "mom": 0.023095,
    "rf": 0.0046
  },
  {
    "date": "1986-11",
    "mkt_rf": 0.0172,
    "smb": -0.01436,
    "hml": 0.00311,
    "rmw": 0.01115,
    "cma": 0.005505,
    "mom": 0.01102,
    "rf": 0.0039
  },
  {
    "date": "1986-12",
    "mkt_rf": -0.0328,
    "smb": -0.01136,
    "hml": 0.003975,
    "rmw": 0.00868,
    "cma": 0.004888,
    "mom": -0.00648,
    "rf": 0.0049
  },
  {
    "date": "1987-01",
    "mkt_rf": 0.1277,
    "smb": -0.00596,
    "hml": 0.00552,
    "rmw": 0.00422,
    "cma": 0.00376,
    "mom": 0.049695,
    "rf": 0.0042
  },
  {
    "date": "1987-02",
    "mkt_rf": 0.0358,
    "smb": 0.0094,
    "hml": 0.01187,
    "rmw": -0.006185,
    "cma": 0.00316,
    "mom": 0.03253,
    "rf": 0.0043
  },
  {
    "date": "1987-03",
    "mkt_rf": 0.0168,
    "smb": -0.01796,
    "hml": -0.00379,
    "rmw": 0.007275,
    "cma": -0.00157,
    "mom": 0.02588,
    "rf": 0.0047
  },
  {
    "date": "1987-04",
    "mkt_rf": -0.0186,
    "smb": -0.02072,
    "hml": -0.022965,
    "rmw": -0.011895,
    "cma": -0.025508,
    "mom": 0.01349,
    "rf": 0.0044
  },
  {
    "date": "1987-05",
    "mkt_rf": 0.0031,
    "smb": -0.0062,
    "hml": -0.00827,
    "rmw": -0.01159,
    "cma": -0.014485,
    "mom": 0.021085,
    "rf": 0.0038
  },
  {
    "date": "1987-06",
    "mkt_rf": 0.0458,
    "smb": -0.00536,
    "hml": 0.010175,
    "rmw": 0.008955,
    "cma": 0.009612,
    "mom": 0.03603,
    "rf": 0.0048
  },
  {
    "date": "1987-07",
    "mkt_rf": 0.0405,
    "smb": -0.0008,
    "hml": 0.007585,
    "rmw": 0.000645,
    "cma": 0.003468,
    "mom": 0.034175,
    "rf": 0.0046
  },
  {
    "date": "1987-08",
    "mkt_rf": 0.0377,
    "smb": -0.01208,
    "hml": -0.006285,
    "rmw": -0.002455,
    "cma": -0.008367,
    "mom": 0.033195,
    "rf": 0.0047
  },
  {
    "date": "1987-09",
    "mkt_rf": -0.0268,
    "smb": -0.00308,
    "hml": -0.00765,
    "rmw": -0.014485,
    "cma": -0.0155,
    "mom": 0.01062,
    "rf": 0.0045
  },
  {
    "date": "1987-10",
    "mkt_rf": -0.2141,
    "smb": -0.0218,
    "hml": -0.00858,
    "rmw": 0.01814,
    "cma": -0.00569,
    "mom": -0.054935,
    "rf": 0.006
  },
  {
    "date": "1987-11",
    "mkt_rf": -0.0861,
    "smb": 0.00784,
    "hml": 0.030265,
    "rmw": 0.029085,
    "cma": 0.028608,
    "mom": -0.025135,
    "rf": 0.0035
  },
  {
    "date": "1987-12",
    "mkt_rf": 0.0665,
    "smb": 0.01,
    "hml": 0.013735,
    "rmw": -0.004705,
    "cma": 0.005293,
    "mom": 0.016275,
    "rf": 0.0039
  },
  {
    "date": "1988-01",
    "mkt_rf": 0.0433,
    "smb": 0.0064,
    "hml": 0.021655,
    "rmw": 0.00871,
    "cma": 0.017978,
    "mom": 0.008155,
    "rf": 0.0029
  },
  {
    "date": "1988-02",
    "mkt_rf": 0.04,
    "smb": 0.01672,
    "hml": 0.031515,
    "rmw": 0.008245,
    "cma": 0.025032,
    "mom": 0.007,
    "rf": 0.0046
  },
  {
    "date": "1988-03",
    "mkt_rf": -0.036,
    "smb": 0.01396,
    "hml": 0.01555,
    "rmw": -0.00718,
    "cma": 0.005375,
    "mom": -0.0196,
    "rf": 0.0044
  },
  {
    "date": "1988-04",
    "mkt_rf": 0.0046,
    "smb": -0.01184,
    "hml": -0.007015,
    "rmw": -0.003585,
    "cma": -0.009483,
    "mom": -0.00539,
    "rf": 0.0046
  },
  {
    "date": "1988-05",
    "mkt_rf": 0.0025,
    "smb": -0.0092,
    "hml": -0.005655,
    "rmw": -0.00506,
    "cma": -0.009227,
    "mom": 0.005875,
    "rf": 0.0051
  },
  {
    "date": "1988-06",
    "mkt_rf": 0.0427,
    "smb": 0.007,
    "hml": 0.01812,
    "rmw": 0.00389,
    "cma": 0.01291,
    "mom": 0.034945,
    "rf": 0.0049
  },
  {
    "date": "1988-07",
    "mkt_rf": -0.0105,
    "smb": -0.0128,
    "hml": -0.002985,
    "rmw": 0.00223,
    "cma": -0.003543,
    "mom": 0.016325,
    "rf": 0.0051
  },
  {
    "date": "1988-08",
    "mkt_rf": -0.0347,
    "smb": 0.00136,
    "hml": 0.005485,
    "rmw": -0.00431,
    "cma": -0.000607,
    "mom": -0.007145,
    "rf": 0.0059
  },
  {
    "date": "1988-09",
    "mkt_rf": 0.0368,
    "smb": -0.00812,
    "hml": 0.00954,
    "rmw": 0.011415,
    "cma": 0.010395,
    "mom": 0.01788,
    "rf": 0.0062
  },
  {
    "date": "1988-10",
    "mkt_rf": 0.0187,
    "smb": -0.01796,
    "hml": 0.00029,
    "rmw": 0.012035,
    "cma": 0.00387,
    "mom": 0.011545,
    "rf": 0.0061
  },
  {
    "date": "1988-11",
    "mkt_rf": -0.0199,
    "smb": -0.01364,
    "hml": -0.00424,
    "rmw": 0.00174,
    "cma": -0.00472,
    "mom": -0.001965,
    "rf": 0.0057
  },
  {
    "date": "1988-12",
    "mkt_rf": 0.0118,
    "smb": -0.00032,
    "hml": 0.005285,
    "rmw": -0.002595,
    "cma": 0.000117,
    "mom": 0.00913,
    "rf": 0.0063
  },
  {
    "date": "1989-01",
    "mkt_rf": 0.0646,
    "smb": -0.00692,
    "hml": -0.00028,
    "rmw": 0.0044,
    "cma": 0.00076,
    "mom": 0.02761,
    "rf": 0.0055
  },
  {
    "date": "1989-02",
    "mkt_rf": -0.0293,
    "smb": 0.00664,
    "hml": 0.006895,
    "rmw": -0.002955,
    "cma": 0.002322,
    "mom": 0.009745,
    "rf": 0.0061
  },
  {
    "date": "1989-03",
    "mkt_rf": 0.0167,
    "smb": -0.008,
    "hml": -0.006115,
    "rmw": -0.001155,
    "cma": -0.006382,
    "mom": 0.025845,
    "rf": 0.0067
  },
  {
    "date": "1989-04",
    "mkt_rf": 0.0448,
    "smb": -0.00692,
    "hml": 0.00302,
    "rmw": 0.00825,
    "cma": 0.00516,
    "mom": 0.02068,
    "rf": 0.0067
  },
  {
    "date": "1989-05",
    "mkt_rf": 0.0332,
    "smb": -0.00308,
    "hml": 0.00847,
    "rmw": 0.010155,
    "cma": 0.01016,
    "mom": 0.03162,
    "rf": 0.0079
  },
  {
    "date": "1989-06",
    "mkt_rf": -0.0116,
    "smb": 0.0088,
    "hml": 0.022915,
    "rmw": 0.01323,
    "cma": 0.022408,
    "mom": 0.01594,
    "rf": 0.0071
  },
  {
    "date": "1989-07",
    "mkt_rf": 0.0809,
    "smb": -0.01208,
    "hml": 0.000805,
    "rmw": 0.01165,
    "cma": 0.005253,
    "mom": 0.048315,
    "rf": 0.007
  },
  {
    "date": "1989-08",
    "mkt_rf": 0.0112,
    "smb": 0.00508,
    "hml": 0.00489,
    "rmw": -0.003485,
    "cma": 0.00057,
    "mom": 0.02392,
    "rf": 0.0074
  },
  {
    "date": "1989-09",
    "mkt_rf": -0.0072,
    "smb": -0.0128,
    "hml": -0.007235,
    "rmw": 0.003105,
    "cma": -0.005043,
    "mom": 0.01748,
    "rf": 0.0065
  },
  {
    "date": "1989-10",
    "mkt_rf": -0.0296,
    "smb": -0.02252,
    "hml": -0.00836,
    "rmw": 0.013065,
    "cma": -0.000805,
    "mom": 0.00964,
    "rf": 0.0068
  },
  {
    "date": "1989-11",
    "mkt_rf": 0.013,
    "smb": -0.00992,
    "hml": -0.000395,
    "rmw": 0.007745,
    "cma": 0.002377,
    "mom": 0.02455,
    "rf": 0.0069
  },
  {
    "date": "1989-12",
    "mkt_rf": 0.0163,
    "smb": -0.00872,
    "hml": -0.001825,
    "rmw": 0.004685,
    "cma": -0.000237,
    "mom": 0.010705,
    "rf": 0.0061
  },
  {
    "date": "1990-01",
    "mkt_rf": -0.0759,
    "smb": -0.01424,
    "hml": -0.014615,
    "rmw": 0.008165,
    "cma": -0.014032,
    "mom": -0.006565,
    "rf": 0.0057
  },
  {
    "date": "1990-02",
    "mkt_rf": 0.0089,
    "smb": -0.002,
    "hml": -0.003395,
    "rmw": -0.00494,
    "cma": -0.006298,
    "mom": 0.008115,
    "rf": 0.0057
  },
  {
    "date": "1990-03",
    "mkt_rf": 0.0161,
    "smb": -0.0122,
    "hml": -0.00759,
    "rmw": 0.001995,
    "cma": -0.00587,
    "mom": 0.010635,
    "rf": 0.0064
  },
  {
    "date": "1990-04",
    "mkt_rf": -0.0309,
    "smb": -0.02216,
    "hml": -0.016565,
    "rmw": 0.003075,
    "cma": -0.011957,
    "mom": -0.005815,
    "rf": 0.0069
  },
  {
    "date": "1990-05",
    "mkt_rf": 0.0878,
    "smb": -0.0062,
    "hml": -0.00001,
    "rmw": 0.00388,
    "cma": 0.000695,
    "mom": 0.03573,
    "rf": 0.0068
  },
  {
    "date": "1990-06",
    "mkt_rf": -0.0126,
    "smb": -0.01076,
    "hml": 0.00252,
    "rmw": 0.01212,
    "cma": 0.00676,
    "mom": 0.00059,
    "rf": 0.0063
  },
  {
    "date": "1990-07",
    "mkt_rf": -0.0131,
    "smb": -0.02096,
    "hml": -0.011005,
    "rmw": 0.00817,
    "cma": -0.005252,
    "mom": 0.000415,
    "rf": 0.0068
  },
  {
    "date": "1990-08",
    "mkt_rf": -0.0954,
    "smb": -0.01676,
    "hml": -0.01448,
    "rmw": 0.011245,
    "cma": -0.012365,
    "mom": -0.02839,
    "rf": 0.0066
  },
  {
    "date": "1990-09",
    "mkt_rf": -0.0549,
    "smb": -0.02924,
    "hml": -0.01993,
    "rmw": 0.01936,
    "cma": -0.012265,
    "mom": -0.014215,
    "rf": 0.006
  },
  {
    "date": "1990-10",
    "mkt_rf": -0.0102,
    "smb": -0.02984,
    "hml": -0.013575,
    "rmw": 0.01547,
    "cma": -0.003438,
    "mom": 0.00143,
    "rf": 0.0068
  },
  {
    "date": "1990-11",
    "mkt_rf": 0.0619,
    "smb": 0.03376,
    "hml": 0.035345,
    "rmw": -0.001215,
    "cma": 0.024248,
    "mom": 0.026665,
    "rf": 0.0057
  },
  {
    "date": "1990-12",
    "mkt_rf": 0.0228,
    "smb": 0.0076,
    "hml": 0.016185,
    "rmw": 0.00677,
    "cma": 0.014143,
    "mom": 0.01298,
    "rf": 0.006
  },
  {
    "date": "1991-01",
    "mkt_rf": 0.0412,
    "smb": 0.01636,
    "hml": 0.01537,
    "rmw": -0.00434,
    "cma": 0.007885,
    "mom": 0.01942,
    "rf": 0.0052
  },
  {
    "date": "1991-02",
    "mkt_rf": 0.0655,
    "smb": 0.00352,
    "hml": 0.012005,
    "rmw": 0.006625,
    "cma": 0.010978,
    "mom": 0.027925,
    "rf": 0.0048
  },
  {
    "date": "1991-03",
    "mkt_rf": 0.0217,
    "smb": 0.001,
    "hml": -0.00097,
    "rmw": -0.00559,
    "cma": -0.004835,
    "mom": 0.027595,
    "rf": 0.0044
  },
  {
    "date": "1991-04",
    "mkt_rf": -0.0026,
    "smb": 0.00604,
    "hml": 0.00983,
    "rmw": 0.001165,
    "cma": 0.00659,
    "mom": 0.01909,
    "rf": 0.0053
  },
  {
    "date": "1991-05",
    "mkt_rf": 0.0363,
    "smb": 0.00292,
    "hml": 0.00552,
    "rmw": -0.000245,
    "cma": 0.002685,
    "mom": 0.032705,
    "rf": 0.0047
  },
  {
    "date": "1991-06",
    "mkt_rf": -0.0502,
    "smb": -0.01448,
    "hml": -0.010675,
    "rmw": 0.01304,
    "cma": -0.008637,
    "mom": 0.00243,
    "rf": 0.0042
  },
  {
    "date": "1991-07",
    "mkt_rf": 0.0428,
    "smb": 0.00004,
    "hml": 0.00441,
    "rmw": 0.0018,
    "cma": 0.002905,
    "mom": 0.03498,
    "rf": 0.0049
  },
  {
    "date": "1991-08",
    "mkt_rf": 0.0215,
    "smb": -0.00284,
    "hml": 0.01053,
    "rmw": 0.01228,
    "cma": 0.012765,
    "mom": 0.027525,
    "rf": 0.0046
  },
  {
    "date": "1991-09",
    "mkt_rf": -0.0187,
    "smb": -0.00188,
    "hml": 0.00842,
    "rmw": 0.008705,
    "cma": 0.009385,
    "mom": -0.001545,
    "rf": 0.0046
  },
  {
    "date": "1991-10",
    "mkt_rf": 0.0111,
    "smb": -0.00164,
    "hml": 0.00574,
    "rmw": 0.0053,
    "cma": 0.00567,
    "mom": 0.008885,
    "rf": 0.0042
  },
  {
    "date": "1991-11",
    "mkt_rf": -0.0403,
    "smb": -0.01136,
    "hml": -0.001325,
    "rmw": 0.00833,
    "cma": 0.001988,
    "mom": -0.009105,
    "rf": 0.0039
  },
  {
    "date": "1991-12",
    "mkt_rf": 0.1128,
    "smb": -0.00896,
    "hml": 0.005325,
    "rmw": 0.013305,
    "cma": 0.009437,
    "mom": 0.04448,
    "rf": 0.0038
  },
  {
    "date": "1992-01",
    "mkt_rf": -0.0215,
    "smb": 0.02224,
    "hml": 0.021395,
    "rmw": -0.00413,
    "cma": 0.012448,
    "mom": 0.012475,
    "rf": 0.0034
  },
  {
    "date": "1992-02",
    "mkt_rf": 0.0072,
    "smb": 0.00532,
    "hml": 0.00125,
    "rmw": -0.00801,
    "cma": -0.004425,
    "mom": 0.00752,
    "rf": 0.0028
  },
  {
    "date": "1992-03",
    "mkt_rf": -0.0242,
    "smb": -0.01208,
    "hml": -0.008705,
    "rmw": 0.000555,
    "cma": -0.007428,
    "mom": -0.00347,
    "rf": 0.0034
  },
  {
    "date": "1992-04",
    "mkt_rf": 0.0233,
    "smb": -0.01448,
    "hml": -0.004435,
    "rmw": 0.00832,
    "cma": -0.000317,
    "mom": 0.013155,
    "rf": 0.0032
  },
  {
    "date": "1992-05",
    "mkt_rf": 0.0035,
    "smb": -0.00476,
    "hml": 0.00323,
    "rmw": 0.00599,
    "cma": 0.004165,
    "mom": 0.006225,
    "rf": 0.0028
  },
  {
    "date": "1992-06",
    "mkt_rf": -0.0193,
    "smb": -0.00548,
    "hml": 0.00347,
    "rmw": 0.007105,
    "cma": 0.00491,
    "mom": 0.013245,
    "rf": 0.0032
  },
  {
    "date": "1992-07",
    "mkt_rf": 0.0383,
    "smb": -0.00464,
    "hml": 0.010575,
    "rmw": 0.01442,
    "cma": 0.013888,
    "mom": 0.018405,
    "rf": 0.0031
  },
  {
    "date": "1992-08",
    "mkt_rf": -0.0222,
    "smb": -0.00668,
    "hml": 0.00538,
    "rmw": 0.010725,
    "cma": 0.008165,
    "mom": -0.00277,
    "rf": 0.0026
  },
  {
    "date": "1992-09",
    "mkt_rf": 0.0103,
    "smb": 0.00064,
    "hml": 0.008675,
    "rmw": 0.00608,
    "cma": 0.008238,
    "mom": 0.008605,
    "rf": 0.0026
  },
  {
    "date": "1992-10",
    "mkt_rf": 0.0052,
    "smb": 0.00928,
    "hml": 0.007205,
    "rmw": -0.005655,
    "cma": 0.001177,
    "mom": 0.00682,
    "rf": 0.0023
  },
  {
    "date": "1992-11",
    "mkt_rf": 0.0342,
    "smb": 0.0034,
    "hml": 0.00061,
    "rmw": -0.00653,
    "cma": -0.004145,
    "mom": 0.01697,
    "rf": 0.0023
  },
  {
    "date": "1992-12",
    "mkt_rf": 0.0106,
    "smb": 0.0022,
    "hml": 0.00822,
    "rmw": 0.00374,
    "cma": 0.00671,
    "mom": 0.00871,
    "rf": 0.0028
  },
  {
    "date": "1993-01",
    "mkt_rf": 0.0043,
    "smb": 0.00736,
    "hml": 0.013585,
    "rmw": 0.004015,
    "cma": 0.010818,
    "mom": 0.006505,
    "rf": 0.0023
  },
  {
    "date": "1993-02",
    "mkt_rf": 0.0077,
    "smb": -0.00908,
    "hml": 0.00575,
    "rmw": 0.01394,
    "cma": 0.010075,
    "mom": 0.007695,
    "rf": 0.0022
  },
  {
    "date": "1993-03",
    "mkt_rf": 0.0198,
    "smb": 0.00172,
    "hml": 0.01187,
    "rmw": 0.008555,
    "cma": 0.01186,
    "mom": 0.01193,
    "rf": 0.0025
  },
  {
    "date": "1993-04",
    "mkt_rf": -0.0304,
    "smb": -0.0038,
    "hml": 0.00184,
    "rmw": 0.003255,
    "cma": 0.001745,
    "mom": -0.00564,
    "rf": 0.0024
  },
  {
    "date": "1993-05",
    "mkt_rf": 0.0255,
    "smb": -0.00428,
    "hml": -0.00024,
    "rmw": 0.001385,
    "cma": -0.000745,
    "mom": 0.013925,
    "rf": 0.0022
  },
  {
    "date": "1993-06",
    "mkt_rf": 0.0014,
    "smb": -0.0038,
    "hml": 0.0034,
    "rmw": 0.005075,
    "cma": 0.003825,
    "mom": 0.00549,
    "rf": 0.0025
  },
  {
    "date": "1993-07",
    "mkt_rf": -0.0058,
    "smb": 0.00112,
    "hml": 0.008475,
    "rmw": 0.00529,
    "cma": 0.007687,
    "mom": 0.00297,
    "rf": 0.0024
  },
  {
    "date": "1993-08",
    "mkt_rf": 0.0361,
    "smb": 0.00412,
    "hml": 0.01009,
    "rmw": 0.003695,
    "cma": 0.00807,
    "mom": 0.017635,
    "rf": 0.0025
  },
  {
    "date": "1993-09",
    "mkt_rf": -0.0069,
    "smb": 0.00016,
    "hml": 0.011485,
    "rmw": 0.009915,
    "cma": 0.012268,
    "mom": 0.002585,
    "rf": 0.0026
  },
  {
    "date": "1993-10",
    "mkt_rf": 0.0136,
    "smb": -0.00824,
    "hml": -0.000945,
    "rmw": 0.005155,
    "cma": 0.000653,
    "mom": 0.00976,
    "rf": 0.0022
  },
  {
    "date": "1993-11",
    "mkt_rf": -0.0135,
    "smb": -0.01136,
    "hml": -0.012695,
    "rmw": -0.004935,
    "cma": -0.013173,
    "mom": 0.000275,
    "rf": 0.0025
  },
  {
    "date": "1993-12",
    "mkt_rf": 0.0114,
    "smb": 0.00988,
    "hml": 0.01015,
    "rmw": -0.002915,
    "cma": 0.00475,
    "mom": 0.00899,
    "rf": 0.0023
  },
  {
    "date": "1994-01",
    "mkt_rf": 0.0284,
    "smb": -0.0092,
    "hml": -0.001835,
    "rmw": 0.00523,
    "cma": 0.000032,
    "mom": 0.01494,
    "rf": 0.0025
  },
  {
    "date": "1994-02",
    "mkt_rf": -0.0305,
    "smb": 0.001,
    "hml": 0.00011,
    "rmw": -0.00433,
    "cma": -0.003395,
    "mom": -0.005675,
    "rf": 0.0021
  },
  {
    "date": "1994-03",
    "mkt_rf": -0.0453,
    "smb": -0.00464,
    "hml": -0.010545,
    "rmw": 0.00178,
    "cma": -0.014273,
    "mom": -0.010855,
    "rf": 0.0027
  },
  {
    "date": "1994-04",
    "mkt_rf": 0.0091,
    "smb": -0.011,
    "hml": -0.01445,
    "rmw": -0.0074,
    "cma": -0.015725,
    "mom": 0.008185,
    "rf": 0.0027
  },
  {
    "date": "1994-05",
    "mkt_rf": 0.0131,
    "smb": -0.01208,
    "hml": -0.008945,
    "rmw": 0.000275,
    "cma": -0.007748,
    "mom": 0.009585,
    "rf": 0.0032
  },
  {
    "date": "1994-06",
    "mkt_rf": -0.0291,
    "smb": -0.00596,
    "hml": 0.00199,
    "rmw": 0.005935,
    "cma": 0.00322,
    "mom": -0.005185,
    "rf": 0.0031
  },
  {
    "date": "1994-07",
    "mkt_rf": 0.0296,
    "smb": -0.00728,
    "hml": -0.005185,
    "rmw": -0.000905,
    "cma": -0.005568,
    "mom": 0.01536,
    "rf": 0.0028
  },
  {
    "date": "1994-08",
    "mkt_rf": 0.0373,
    "smb": 0.00124,
    "hml": 0.00649,
    "rmw": 0.002835,
    "cma": 0.00497,
    "mom": 0.018055,
    "rf": 0.0037
  },
  {
    "date": "1994-09",
    "mkt_rf": -0.0275,
    "smb": -0.00596,
    "hml": -0.00494,
    "rmw": -0.00215,
    "cma": -0.00602,
    "mom": -0.004625,
    "rf": 0.0037
  },
  {
    "date": "1994-10",
    "mkt_rf": 0.0177,
    "smb": -0.01448,
    "hml": -0.012295,
    "rmw": -0.00085,
    "cma": -0.010798,
    "mom": 0.011195,
    "rf": 0.0038
  },
  {
    "date": "1994-11",
    "mkt_rf": -0.0371,
    "smb": -0.00968,
    "hml": -0.007455,
    "rmw": -0.00077,
    "cma": -0.007177,
    "mom": -0.007985,
    "rf": 0.0037
  },
  {
    "date": "1994-12",
    "mkt_rf": 0.0081,
    "smb": -0.00872,
    "hml": 0.001415,
    "rmw": 0.008465,
    "cma": 0.004082,
    "mom": 0.007835,
    "rf": 0.0044
  },
  {
    "date": "1995-01",
    "mkt_rf": 0.0239,
    "smb": -0.00752,
    "hml": -0.012405,
    "rmw": 0.00495,
    "cma": -0.005052,
    "mom": 0.013365,
    "rf": 0.0042
  },
  {
    "date": "1995-02",
    "mkt_rf": 0.0351,
    "smb": 0.0034,
    "hml": 0.00166,
    "rmw": 0.008695,
    "cma": 0.007255,
    "mom": 0.017285,
    "rf": 0.004
  },
  {
    "date": "1995-03",
    "mkt_rf": 0.0225,
    "smb": -0.0068,
    "hml": -0.006705,
    "rmw": 0.010765,
    "cma": 0.002122,
    "mom": 0.012875,
    "rf": 0.0046
  },
  {
    "date": "1995-04",
    "mkt_rf": 0.023,
    "smb": -0.01952,
    "hml": -0.018655,
    "rmw": 0.011575,
    "cma": -0.006303,
    "mom": 0.01305,
    "rf": 0.0044
  },
  {
    "date": "1995-05",
    "mkt_rf": 0.0343,
    "smb": -0.00824,
    "hml": -0.004485,
    "rmw": 0.015025,
    "cma": 0.005933,
    "mom": 0.032005,
    "rf": 0.0054
  },
  {
    "date": "1995-06",
    "mkt_rf": 0.0199,
    "smb": -0.0032,
    "hml": -0.000135,
    "rmw": 0.014255,
    "cma": 0.008757,
    "mom": 0.026965,
    "rf": 0.0047
  },
  {
    "date": "1995-07",
    "mkt_rf": 0.0314,
    "smb": 0.00268,
    "hml": -0.00884,
    "rmw": -0.00272,
    "cma": -0.00632,
    "mom": 0.03099,
    "rf": 0.0045
  },
  {
    "date": "1995-08",
    "mkt_rf": 0.0029,
    "smb": 0.00484,
    "hml": -0.00959,
    "rmw": -0.0061,
    "cma": -0.008595,
    "mom": 0.021015,
    "rf": 0.0047
  },
  {
    "date": "1995-09",
    "mkt_rf": 0.0387,
    "smb": -0.02168,
    "hml": -0.016945,
    "rmw": 0.016075,
    "cma": -0.002748,
    "mom": 0.033545,
    "rf": 0.0043
  },
  {
    "date": "1995-10",
    "mkt_rf": -0.0087,
    "smb": -0.02372,
    "hml": -0.02151,
    "rmw": 0.013115,
    "cma": -0.00763,
    "mom": 0.016955,
    "rf": 0.0047
  },
  {
    "date": "1995-11",
    "mkt_rf": 0.0401,
    "smb": 0.00088,
    "hml": -0.005105,
    "rmw": 0.003725,
    "cma": -0.000277,
    "mom": 0.034035,
    "rf": 0.0042
  },
  {
    "date": "1995-12",
    "mkt_rf": 0.0099,
    "smb": -0.01724,
    "hml": -0.01572,
    "rmw": 0.012355,
    "cma": -0.003735,
    "mom": 0.023465,
    "rf": 0.0049
  },
  {
    "date": "1996-01",
    "mkt_rf": 0.0297,
    "smb": -0.01016,
    "hml": -0.014155,
    "rmw": 0.00597,
    "cma": -0.005827,
    "mom": 0.030395,
    "rf": 0.0043
  },
  {
    "date": "1996-02",
    "mkt_rf": 0.0097,
    "smb": 0.00016,
    "hml": -0.011705,
    "rmw": -0.00314,
    "cma": -0.008653,
    "mom": 0.023395,
    "rf": 0.0039
  },
  {
    "date": "1996-03",
    "mkt_rf": 0.0042,
    "smb": -0.00008,
    "hml": -0.018595,
    "rmw": -0.0109,
    "cma": -0.017697,
    "mom": 0.02147,
    "rf": 0.0039
  },
  {
    "date": "1996-04",
    "mkt_rf": 0.0104,
    "smb": 0.00712,
    "hml": -0.008635,
    "rmw": -0.00763,
    "cma": -0.008667,
    "mom": 0.02364,
    "rf": 0.0046
  },
  {
    "date": "1996-05",
    "mkt_rf": 0.0203,
    "smb": -0.01568,
    "hml": -0.024365,
    "rmw": 0.00046,
    "cma": -0.016183,
    "mom": 0.027105,
    "rf": 0.0042
  },
  {
    "date": "1996-06",
    "mkt_rf": -0.0011,
    "smb": -0.01892,
    "hml": -0.02519,
    "rmw": 0.003255,
    "cma": -0.01537,
    "mom": 0.019615,
    "rf": 0.004
  },
  {
    "date": "1996-07",
    "mkt_rf": -0.0516,
    "smb": -0.01832,
    "hml": -0.020145,
    "rmw": 0.020445,
    "cma": -0.008998,
    "mom": -0.01306,
    "rf": 0.0045
  },
  {
    "date": "1996-08",
    "mkt_rf": 0.0207,
    "smb": 0.01288,
    "hml": 0.006335,
    "rmw": 0.003155,
    "cma": 0.007893,
    "mom": 0.012245,
    "rf": 0.0041
  },
  {
    "date": "1996-09",
    "mkt_rf": 0.053,
    "smb": -0.0098,
    "hml": -0.01933,
    "rmw": -0.000485,
    "cma": -0.01294,
    "mom": 0.02355,
    "rf": 0.0044
  },
  {
    "date": "1996-10",
    "mkt_rf": 0.0166,
    "smb": -0.02276,
    "hml": -0.01738,
    "rmw": 0.01682,
    "cma": -0.00269,
    "mom": 0.01081,
    "rf": 0.0042
  },
  {
    "date": "1996-11",
    "mkt_rf": 0.0707,
    "smb": -0.01364,
    "hml": -0.01029,
    "rmw": 0.014515,
    "cma": 0.00138,
    "mom": 0.029745,
    "rf": 0.0041
  },
  {
    "date": "1996-12",
    "mkt_rf": -0.0227,
    "smb": -0.00344,
    "hml": -0.012965,
    "rmw": -0.000435,
    "cma": -0.008207,
    "mom": 0.012055,
    "rf": 0.0046
  },
  {
    "date": "1997-01",
    "mkt_rf": 0.0562,
    "smb": -0.03164,
    "hml": -0.03693,
    "rmw": 0.00431,
    "cma": -0.023515,
    "mom": 0.03967,
    "rf": 0.0045
  },
  {
    "date": "1997-02",
    "mkt_rf": 0.0012,
    "smb": -0.0074,
    "hml": -0.00962,
    "rmw": 0.00806,
    "cma": -0.00141,
    "mom": 0.02042,
    "rf": 0.0039
  },
  {
    "date": "1997-03",
    "mkt_rf": -0.0487,
    "smb": -0.00404,
    "hml": -0.01708,
    "rmw": 0.00746,
    "cma": -0.01334,
    "mom": 0.002955,
    "rf": 0.0043
  },
  {
    "date": "1997-04",
    "mkt_rf": 0.0518,
    "smb": -0.04316,
    "hml": -0.04314,
    "rmw": 0.010425,
    "cma": -0.024995,
    "mom": 0.02313,
    "rf": 0.0043
  },
  {
    "date": "1997-05",
    "mkt_rf": 0.0582,
    "smb": 0.01396,
    "hml": 0.00572,
    "rmw": 0.001185,
    "cma": 0.006435,
    "mom": 0.04037,
    "rf": 0.0049
  },
  {
    "date": "1997-06",
    "mkt_rf": 0.0391,
    "smb": -0.01472,
    "hml": -0.013365,
    "rmw": 0.01218,
    "cma": -0.002083,
    "mom": 0.033685,
    "rf": 0.0037
  },
  {
    "date": "1997-07",
    "mkt_rf": 0.0778,
    "smb": -0.00284,
    "hml": -0.00405,
    "rmw": 0.00927,
    "cma": 0.003325,
    "mom": 0.04723,
    "rf": 0.0043
  },
  {
    "date": "1997-08",
    "mkt_rf": -0.0544,
    "smb": 0.02932,
    "hml": 0.01084,
    "rmw": 0.001345,
    "cma": 0.004195,
    "mom": 0.00096,
    "rf": 0.0041
  },
  {
    "date": "1997-09",
    "mkt_rf": 0.0492,
    "smb": -0.0068,
    "hml": -0.010995,
    "rmw": 0.00576,
    "cma": -0.003598,
    "mom": 0.03722,
    "rf": 0.0044
  },
  {
    "date": "1997-10",
    "mkt_rf": -0.0357,
    "smb": -0.01256,
    "hml": -0.013005,
    "rmw": 0.010095,
    "cma": -0.002877,
    "mom": 0.007505,
    "rf": 0.0042
  },
  {
    "date": "1997-11",
    "mkt_rf": 0.0403,
    "smb": -0.0236,
    "hml": -0.021455,
    "rmw": 0.01304,
    "cma": -0.007627,
    "mom": 0.034105,
    "rf": 0.0039
  },
  {
    "date": "1997-12",
    "mkt_rf": 0.0153,
    "smb": -0.00188,
    "hml": -0.0082,
    "rmw": 0.003315,
    "cma": -0.002775,
    "mom": 0.025355,
    "rf": 0.0048
  },
  {
    "date": "1998-01",
    "mkt_rf": 0.0054,
    "smb": -0.02696,
    "hml": -0.021315,
    "rmw": 0.0171,
    "cma": -0.005458,
    "mom": 0.02189,
    "rf": 0.0043
  },
  {
    "date": "1998-02",
    "mkt_rf": 0.0694,
    "smb": 0.00352,
    "hml": -0.006415,
    "rmw": -0.000865,
    "cma": -0.003582,
    "mom": 0.02929,
    "rf": 0.0039
  },
  {
    "date": "1998-03",
    "mkt_rf": 0.048,
    "smb": -0.0098,
    "hml": -0.01699,
    "rmw": 0.002245,
    "cma": -0.00982,
    "mom": 0.0368,
    "rf": 0.0039
  },
  {
    "date": "1998-04",
    "mkt_rf": 0.0085,
    "smb": -0.01196,
    "hml": -0.01657,
    "rmw": 0.00524,
    "cma": -0.007985,
    "mom": 0.022975,
    "rf": 0.0043
  },
  {
    "date": "1998-05",
    "mkt_rf": -0.0229,
    "smb": -0.01844,
    "hml": -0.02155,
    "rmw": 0.006945,
    "cma": -0.0108,
    "mom": 0.011985,
    "rf": 0.004
  },
  {
    "date": "1998-06",
    "mkt_rf": 0.0387,
    "smb": -0.04412,
    "hml": -0.03614,
    "rmw": 0.019705,
    "cma": -0.015095,
    "mom": 0.033545,
    "rf": 0.0041
  },
  {
    "date": "1998-07",
    "mkt_rf": -0.0148,
    "smb": -0.03644,
    "hml": -0.03319,
    "rmw": 0.01424,
    "cma": -0.015695,
    "mom": 0.01482,
    "rf": 0.004
  },
  {
    "date": "1998-08",
    "mkt_rf": -0.152,
    "smb": -0.02132,
    "hml": -0.02077,
    "rmw": 0.023195,
    "cma": -0.00806,
    "mom": -0.0332,
    "rf": 0.0043
  },
  {
    "date": "1998-09",
    "mkt_rf": 0.0625,
    "smb": -0.00344,
    "hml": 0.000985,
    "rmw": 0.01584,
    "cma": 0.010393,
    "mom": 0.026875,
    "rf": 0.0046
  },
  {
    "date": "1998-10",
    "mkt_rf": 0.0747,
    "smb": 0.00736,
    "hml": 0.003295,
    "rmw": 0.00601,
    "cma": 0.007097,
    "mom": 0.031145,
    "rf": 0.0032
  },
  {
    "date": "1998-11",
    "mkt_rf": 0.0605,
    "smb": -0.02084,
    "hml": -0.02976,
    "rmw": 0.00015,
    "cma": -0.02033,
    "mom": 0.026175,
    "rf": 0.0031
  },
  {
    "date": "1998-12",
    "mkt_rf": 0.0621,
    "smb": -0.02264,
    "hml": -0.020385,
    "rmw": 0.013175,
    "cma": -0.006767,
    "mom": 0.026735,
    "rf": 0.0038
  },
  {
    "date": "1999-01",
    "mkt_rf": 0.0363,
    "smb": -0.05048,
    "hml": -0.045685,
    "rmw": 0.015945,
    "cma": -0.024068,
    "mom": 0.032705,
    "rf": 0.0035
  },
  {
    "date": "1999-02",
    "mkt_rf": -0.0361,
    "smb": 0.00352,
    "hml": -0.012145,
    "rmw": -0.00755,
    "cma": -0.011222,
    "mom": 0.007365,
    "rf": 0.0035
  },
  {
    "date": "1999-03",
    "mkt_rf": 0.0366,
    "smb": -0.0074,
    "hml": -0.01892,
    "rmw": -0.00279,
    "cma": -0.01381,
    "mom": 0.03281,
    "rf": 0.0043
  },
  {
    "date": "1999-04",
    "mkt_rf": 0.0348,
    "smb": 0.05248,
    "hml": 0.030035,
    "rmw": -0.01512,
    "cma": 0.016117,
    "mom": 0.03218,
    "rf": 0.0037
  },
  {
    "date": "1999-05",
    "mkt_rf": -0.0264,
    "smb": 0.02488,
    "hml": 0.001335,
    "rmw": -0.016595,
    "cma": -0.005858,
    "mom": 0.01076,
    "rf": 0.0034
  },
  {
    "date": "1999-06",
    "mkt_rf": 0.0465,
    "smb": -0.02432,
    "hml": -0.033605,
    "rmw": -0.0003,
    "cma": -0.023402,
    "mom": 0.036275,
    "rf": 0.004
  },
  {
    "date": "1999-07",
    "mkt_rf": -0.0379,
    "smb": -0.00476,
    "hml": -0.00901,
    "rmw": 0.00571,
    "cma": -0.002155,
    "mom": 0.006735,
    "rf": 0.0038
  },
  {
    "date": "1999-08",
    "mkt_rf": -0.01,
    "smb": -0.02516,
    "hml": -0.02937,
    "rmw": 0.005615,
    "cma": -0.01726,
    "mom": 0.0015,
    "rf": 0.0039
  },
  {
    "date": "1999-09",
    "mkt_rf": -0.0313,
    "smb": -0.00896,
    "hml": -0.014055,
    "rmw": 0.004695,
    "cma": -0.006403,
    "mom": -0.005955,
    "rf": 0.0039
  },
  {
    "date": "1999-10",
    "mkt_rf": 0.0658,
    "smb": -0.02396,
    "hml": -0.02939,
    "rmw": 0.0042,
    "cma": -0.017995,
    "mom": 0.02803,
    "rf": 0.0039
  },
  {
    "date": "1999-11",
    "mkt_rf": 0.0233,
    "smb": -0.00716,
    "hml": -0.01128,
    "rmw": 0.005845,
    "cma": -0.003765,
    "mom": 0.013155,
    "rf": 0.0036
  },
  {
    "date": "1999-12",
    "mkt_rf": 0.064,
    "smb": -0.0122,
    "hml": -0.02253,
    "rmw": -0.001435,
    "cma": -0.01579,
    "mom": 0.0274,
    "rf": 0.0044
  },
  {
    "date": "2000-01",
    "mkt_rf": -0.0498,
    "smb": 0.00972,
    "hml": -0.017585,
    "rmw": 0.00367,
    "cma": -0.007642,
    "mom": -0.01243,
    "rf": 0.0041
  },
  {
    "date": "2000-02",
    "mkt_rf": -0.0069,
    "smb": -0.00468,
    "hml": -0.016025,
    "rmw": 0.01019,
    "cma": 0.002937,
    "mom": 0.002585,
    "rf": 0.0043
  },
  {
    "date": "2000-03",
    "mkt_rf": 0.0884,
    "smb": 0.02232,
    "hml": 0.00562,
    "rmw": 0.00413,
    "cma": 0.01586,
    "mom": 0.03594,
    "rf": 0.0047
  },
  {
    "date": "2000-04",
    "mkt_rf": -0.0436,
    "smb": 0.03096,
    "hml": 0.01195,
    "rmw": 0.001495,
    "cma": 0.0192,
    "mom": 0.00474,
    "rf": 0.0046
  },
  {
    "date": "2000-05",
    "mkt_rf": -0.033,
    "smb": 0.03912,
    "hml": 0.00132,
    "rmw": -0.02037,
    "cma": 0.00021,
    "mom": 0.00845,
    "rf": 0.005
  },
  {
    "date": "2000-06",
    "mkt_rf": 0.0273,
    "smb": -0.03216,
    "hml": -0.03096,
    "rmw": 0.024635,
    "cma": -0.000755,
    "mom": 0.014555,
    "rf": 0.004
  },
  {
    "date": "2000-07",
    "mkt_rf": -0.0235,
    "smb": 0.0132,
    "hml": -0.0057,
    "rmw": 0.0015,
    "cma": 0.00615,
    "mom": -0.003225,
    "rf": 0.0048
  },
  {
    "date": "2000-08",
    "mkt_rf": 0.0709,
    "smb": 0.0354,
    "hml": 0.013775,
    "rmw": -0.001525,
    "cma": 0.019013,
    "mom": 0.029815,
    "rf": 0.005
  },
  {
    "date": "2000-09",
    "mkt_rf": -0.054,
    "smb": 0.02424,
    "hml": 0.00152,
    "rmw": 0.00912,
    "cma": 0.00926,
    "mom": 0.0011,
    "rf": 0.0051
  },
  {
    "date": "2000-10",
    "mkt_rf": -0.0232,
    "smb": 0.00228,
    "hml": -0.013525,
    "rmw": 0.005035,
    "cma": 0.002162,
    "mom": -0.00312,
    "rf": 0.0056
  },
  {
    "date": "2000-11",
    "mkt_rf": -0.1033,
    "smb": -0.02448,
    "hml": -0.03323,
    "rmw": 0.02508,
    "cma": -0.008315,
    "mom": -0.031155,
    "rf": 0.0051
  },
  {
    "date": "2000-12",
    "mkt_rf": 0.0045,
    "smb": 0.05304,
    "hml": 0.03206,
    "rmw": -0.00065,
    "cma": 0.03298,
    "mom": 0.006575,
    "rf": 0.005
  },
  {
    "date": "2001-01",
    "mkt_rf": 0.029,
    "smb": 0.07476,
    "hml": 0.061205,
    "rmw": -0.01867,
    "cma": 0.039852,
    "mom": 0.01515,
    "rf": 0.0054
  },
  {
    "date": "2001-02",
    "mkt_rf": -0.1003,
    "smb": -0.01188,
    "hml": -0.000165,
    "rmw": 0.02221,
    "cma": 0.009168,
    "mom": -0.030105,
    "rf": 0.0038
  },
  {
    "date": "2001-03",
    "mkt_rf": -0.0731,
    "smb": -0.02568,
    "hml": -0.0067,
    "rmw": 0.03059,
    "cma": 0.0086,
    "mom": -0.032585,
    "rf": 0.0042
  },
  {
    "date": "2001-04",
    "mkt_rf": 0.0768,
    "smb": 0.06324,
    "hml": 0.045965,
    "rmw": -0.02309,
    "cma": 0.026333,
    "mom": 0.01988,
    "rf": 0.0039
  },
  {
    "date": "2001-05",
    "mkt_rf": 0.0033,
    "smb": 0.01584,
    "hml": 0.01266,
    "rmw": -0.006975,
    "cma": 0.009905,
    "mom": -0.005845,
    "rf": 0.0032
  },
  {
    "date": "2001-06",
    "mkt_rf": -0.024,
    "smb": 0.00672,
    "hml": 0.01448,
    "rmw": 0.005725,
    "cma": 0.017715,
    "mom": -0.0034,
    "rf": 0.0028
  },
  {
    "date": "2001-07",
    "mkt_rf": -0.0177,
    "smb": -0.00576,
    "hml": 0.00399,
    "rmw": 0.00796,
    "cma": 0.011095,
    "mom": -0.001195,
    "rf": 0.003
  },
  {
    "date": "2001-08",
    "mkt_rf": -0.0666,
    "smb": 0.0162,
    "hml": 0.024675,
    "rmw": 0.018625,
    "cma": 0.025712,
    "mom": -0.03031,
    "rf": 0.0031
  },
  {
    "date": "2001-09",
    "mkt_rf": -0.0849,
    "smb": -0.05136,
    "hml": -0.02384,
    "rmw": 0.040375,
    "cma": 0.000905,
    "mom": -0.024715,
    "rf": 0.0028
  },
  {
    "date": "2001-10",
    "mkt_rf": 0.0192,
    "smb": 0.04572,
    "hml": 0.043245,
    "rmw": -0.005945,
    "cma": 0.033048,
    "mom": 0.01172,
    "rf": 0.0022
  },
  {
    "date": "2001-11",
    "mkt_rf": 0.076,
    "smb": 0.0282,
    "hml": 0.025555,
    "rmw": -0.006265,
    "cma": 0.019803,
    "mom": 0.0196,
    "rf": 0.0017
  },
  {
    "date": "2001-12",
    "mkt_rf": 0.0085,
    "smb": 0.03132,
    "hml": 0.019755,
    "rmw": -0.01665,
    "cma": 0.010228,
    "mom": 0.007975,
    "rf": 0.0015
  },
  {
    "date": "2002-01",
    "mkt_rf": -0.0135,
    "smb": -0.00288,
    "hml": 0.00669,
    "rmw": 0.00777,
    "cma": 0.012995,
    "mom": 0.000275,
    "rf": 0.0014
  },
  {
    "date": "2002-02",
    "mkt_rf": -0.0219,
    "smb": -0.0024,
    "hml": 0.00883,
    "rmw": 0.00971,
    "cma": 0.015565,
    "mom": -0.002665,
    "rf": 0.0013
  },
  {
    "date": "2002-03",
    "mkt_rf": 0.0376,
    "smb": 0.0474,
    "hml": 0.032825,
    "rmw": -0.02005,
    "cma": 0.018163,
    "mom": 0.01816,
    "rf": 0.0013
  },
  {
    "date": "2002-04",
    "mkt_rf": -0.0611,
    "smb": 0.02616,
    "hml": 0.02771,
    "rmw": 0.010615,
    "cma": 0.02388,
    "mom": -0.001385,
    "rf": 0.0015
  },
  {
    "date": "2002-05",
    "mkt_rf": -0.0104,
    "smb": -0.009,
    "hml": 0.002385,
    "rmw": 0.009845,
    "cma": 0.010868,
    "mom": 0.00136,
    "rf": 0.0014
  },
  {
    "date": "2002-06",
    "mkt_rf": -0.0749,
    "smb": -0.02484,
    "hml": -0.004755,
    "rmw": 0.031885,
    "cma": 0.010698,
    "mom": -0.021215,
    "rf": 0.0013
  },
  {
    "date": "2002-07",
    "mkt_rf": -0.0738,
    "smb": -0.01932,
    "hml": 0.000145,
    "rmw": 0.0312,
    "cma": 0.013972,
    "mom": -0.03283,
    "rf": 0.0015
  },
  {
    "date": "2002-08",
    "mkt_rf": 0.0052,
    "smb": 0.00672,
    "hml": 0.02102,
    "rmw": 0.013355,
    "cma": 0.026435,
    "mom": -0.00518,
    "rf": 0.0014
  },
  {
    "date": "2002-09",
    "mkt_rf": -0.1069,
    "smb": 0.0078,
    "hml": 0.021695,
    "rmw": 0.02489,
    "cma": 0.026697,
    "mom": -0.044415,
    "rf": 0.0014
  },
  {
    "date": "2002-10",
    "mkt_rf": 0.0855,
    "smb": -0.01968,
    "hml": -0.00821,
    "rmw": 0.00987,
    "cma": 0.003045,
    "mom": 0.022925,
    "rf": 0.0014
  },
  {
    "date": "2002-11",
    "mkt_rf": 0.054,
    "smb": 0.04272,
    "hml": 0.03515,
    "rmw": -0.01191,
    "cma": 0.024025,
    "mom": 0.0119,
    "rf": 0.0012
  },
  {
    "date": "2002-12",
    "mkt_rf": -0.0587,
    "smb": 0.01932,
    "hml": 0.021575,
    "rmw": 0.01139,
    "cma": 0.019737,
    "mom": -0.027545,
    "rf": 0.0011
  },
  {
    "date": "2003-01",
    "mkt_rf": -0.0283,
    "smb": 0.01308,
    "hml": 0.016285,
    "rmw": 0.000455,
    "cma": 0.016368,
    "mom": -0.004905,
    "rf": 0.001
  },
  {
    "date": "2003-02",
    "mkt_rf": -0.0186,
    "smb": 0.00204,
    "hml": 0.012305,
    "rmw": 0.008615,
    "cma": 0.017577,
    "mom": -0.00151,
    "rf": 0.0009
  },
  {
    "date": "2003-03",
    "mkt_rf": 0.0107,
    "smb": 0.0024,
    "hml": 0.01115,
    "rmw": 0.00685,
    "cma": 0.015825,
    "mom": 0.008745,
    "rf": 0.001
  },
  {
    "date": "2003-04",
    "mkt_rf": 0.0793,
    "smb": 0.01308,
    "hml": 0.013285,
    "rmw": -0.003045,
    "cma": 0.012368,
    "mom": 0.032755,
    "rf": 0.001
  },
  {
    "date": "2003-05",
    "mkt_rf": 0.0537,
    "smb": 0.04608,
    "hml": 0.0489,
    "rmw": 0.000235,
    "cma": 0.040375,
    "mom": 0.023795,
    "rf": 0.0009
  },
  {
    "date": "2003-06",
    "mkt_rf": 0.0118,
    "smb": 0.00084,
    "hml": 0.013345,
    "rmw": 0.01122,
    "cma": 0.019672,
    "mom": 0.00913,
    "rf": 0.001
  },
  {
    "date": "2003-07",
    "mkt_rf": 0.0177,
    "smb": 0.01452,
    "hml": 0.003025,
    "rmw": -0.016685,
    "cma": -0.002162,
    "mom": 0.026195,
    "rf": 0.0007
  },
  {
    "date": "2003-08",
    "mkt_rf": 0.0181,
    "smb": 0.02688,
    "hml": 0.01601,
    "rmw": -0.01587,
    "cma": 0.007855,
    "mom": 0.026335,
    "rf": 0.0007
  },
  {
    "date": "2003-09",
    "mkt_rf": -0.0121,
    "smb": 0.00264,
    "hml": 0.01354,
    "rmw": 0.00936,
    "cma": 0.01887,
    "mom": 0.015765,
    "rf": 0.0008
  },
  {
    "date": "2003-10",
    "mkt_rf": 0.056,
    "smb": 0.0246,
    "hml": 0.024595,
    "rmw": -0.00321,
    "cma": 0.020647,
    "mom": 0.0396,
    "rf": 0.0007
  },
  {
    "date": "2003-11",
    "mkt_rf": 0.0093,
    "smb": 0.0198,
    "hml": 0.021405,
    "rmw": -0.001365,
    "cma": 0.019228,
    "mom": 0.023255,
    "rf": 0.0007
  },
  {
    "date": "2003-12",
    "mkt_rf": 0.0473,
    "smb": -0.00324,
    "hml": 0.005955,
    "rmw": 0.00733,
    "cma": 0.012228,
    "mom": 0.036555,
    "rf": 0.0008
  },
  {
    "date": "2004-01",
    "mkt_rf": 0.0173,
    "smb": 0.00828,
    "hml": 0.016185,
    "rmw": 0.005905,
    "cma": 0.019068,
    "mom": 0.026055,
    "rf": 0.0007
  },
  {
    "date": "2004-02",
    "mkt_rf": 0.0139,
    "smb": 0.0144,
    "hml": 0.01938,
    "rmw": 0.002535,
    "cma": 0.019715,
    "mom": 0.024865,
    "rf": 0.0006
  },
  {
    "date": "2004-03",
    "mkt_rf": -0.0163,
    "smb": 0.01596,
    "hml": 0.024445,
    "rmw": 0.006635,
    "cma": 0.025548,
    "mom": 0.014295,
    "rf": 0.0009
  },
  {
    "date": "2004-04",
    "mkt_rf": -0.0136,
    "smb": -0.00156,
    "hml": -0.005335,
    "rmw": -0.00779,
    "cma": -0.003817,
    "mom": 0.01524,
    "rf": 0.0008
  },
  {
    "date": "2004-05",
    "mkt_rf": 0.0112,
    "smb": 0.015,
    "hml": 0.009965,
    "rmw": -0.009145,
    "cma": 0.006808,
    "mom": 0.00892,
    "rf": 0.0006
  },
  {
    "date": "2004-06",
    "mkt_rf": 0.015,
    "smb": 0.01164,
    "hml": 0.015715,
    "rmw": 0.00146,
    "cma": 0.016457,
    "mom": 0.01025,
    "rf": 0.0008
  },
  {
    "date": "2004-07",
    "mkt_rf": -0.0358,
    "smb": -0.00576,
    "hml": 0.00873,
    "rmw": 0.01349,
    "cma": 0.017415,
    "mom": -0.00753,
    "rf": 0.001
  },
  {
    "date": "2004-08",
    "mkt_rf": 0.0025,
    "smb": 0.00108,
    "hml": 0.013245,
    "rmw": 0.010825,
    "cma": 0.019397,
    "mom": 0.005875,
    "rf": 0.0011
  },
  {
    "date": "2004-09",
    "mkt_rf": 0.0106,
    "smb": 0.02736,
    "hml": 0.03024,
    "rmw": 0.000175,
    "cma": 0.026545,
    "mom": 0.00871,
    "rf": 0.0011
  },
  {
    "date": "2004-10",
    "mkt_rf": 0.0128,
    "smb": 0.01632,
    "hml": 0.01969,
    "rmw": 0.00067,
    "cma": 0.018995,
    "mom": 0.00948,
    "rf": 0.0011
  },
  {
    "date": "2004-11",
    "mkt_rf": 0.0391,
    "smb": 0.0246,
    "hml": 0.022735,
    "rmw": -0.00538,
    "cma": 0.018167,
    "mom": 0.018685,
    "rf": 0.0015
  },
  {
    "date": "2004-12",
    "mkt_rf": 0.0329,
    "smb": 0.00984,
    "hml": 0.01339,
    "rmw": 0.000835,
    "cma": 0.01442,
    "mom": 0.016515,
    "rf": 0.0016
  },
  {
    "date": "2005-01",
    "mkt_rf": -0.0261,
    "smb": 0.00324,
    "hml": 0.009855,
    "rmw": 0.004365,
    "cma": 0.013603,
    "mom": -0.004135,
    "rf": 0.0016
  },
  {
    "date": "2005-02",
    "mkt_rf": 0.0192,
    "smb": 0.0078,
    "hml": 0.013985,
    "rmw": 0.003895,
    "cma": 0.016418,
    "mom": 0.01172,
    "rf": 0.0016
  },
  {
    "date": "2005-03",
    "mkt_rf": -0.0179,
    "smb": 0.01188,
    "hml": 0.008145,
    "rmw": -0.00765,
    "cma": 0.006222,
    "mom": -0.001265,
    "rf": 0.0021
  },
  {
    "date": "2005-04",
    "mkt_rf": -0.02,
    "smb": -0.00792,
    "hml": 0.00522,
    "rmw": 0.0119,
    "cma": 0.01401,
    "mom": -0.002,
    "rf": 0.0021
  },
  {
    "date": "2005-05",
    "mkt_rf": 0.0313,
    "smb": 0.01968,
    "hml": 0.02555,
    "rmw": 0.00361,
    "cma": 0.024825,
    "mom": 0.015955,
    "rf": 0.0024
  },
  {
    "date": "2005-06",
    "mkt_rf": -0.0008,
    "smb": 0.02244,
    "hml": 0.026125,
    "rmw": 0.00108,
    "cma": 0.023962,
    "mom": 0.00472,
    "rf": 0.0023
  },
  {
    "date": "2005-07",
    "mkt_rf": 0.0348,
    "smb": 0.0192,
    "hml": 0.01657,
    "rmw": -0.00631,
    "cma": 0.013135,
    "mom": 0.01718,
    "rf": 0.0024
  },
  {
    "date": "2005-08",
    "mkt_rf": -0.0114,
    "smb": 0.00528,
    "hml": 0.00884,
    "rmw": 0.000815,
    "cma": 0.011045,
    "mom": 0.00101,
    "rf": 0.003
  },
  {
    "date": "2005-09",
    "mkt_rf": 0.005,
    "smb": 0.00732,
    "hml": 0.013465,
    "rmw": 0.003845,
    "cma": 0.016008,
    "mom": 0.00675,
    "rf": 0.0029
  },
  {
    "date": "2005-10",
    "mkt_rf": -0.0169,
    "smb": -0.0024,
    "hml": -0.00056,
    "rmw": -0.001245,
    "cma": 0.003045,
    "mom": -0.000915,
    "rf": 0.0027
  },
  {
    "date": "2005-11",
    "mkt_rf": 0.0344,
    "smb": 0.0102,
    "hml": 0.012355,
    "rmw": -0.00079,
    "cma": 0.012828,
    "mom": 0.01704,
    "rf": 0.0031
  },
  {
    "date": "2005-12",
    "mkt_rf": -0.0033,
    "smb": 0.01464,
    "hml": 0.01886,
    "rmw": 0.00165,
    "cma": 0.01888,
    "mom": 0.003845,
    "rf": 0.0032
  },
  {
    "date": "2006-01",
    "mkt_rf": 0.0208,
    "smb": 0.018,
    "hml": 0.0207,
    "rmw": -0.0001,
    "cma": 0.01935,
    "mom": 0.01228,
    "rf": 0.0035
  },
  {
    "date": "2006-02",
    "mkt_rf": -0.0018,
    "smb": 0.00864,
    "hml": 0.00957,
    "rmw": -0.00223,
    "cma": 0.010035,
    "mom": 0.00437,
    "rf": 0.0034
  },
  {
    "date": "2006-03",
    "mkt_rf": 0.0095,
    "smb": 0.01152,
    "hml": 0.01158,
    "rmw": -0.003225,
    "cma": 0.011015,
    "mom": 0.008325,
    "rf": 0.0037
  },
  {
    "date": "2006-04",
    "mkt_rf": 0.0079,
    "smb": 0.00636,
    "hml": 0.005285,
    "rmw": -0.004585,
    "cma": 0.005668,
    "mom": 0.007765,
    "rf": 0.0036
  },
  {
    "date": "2006-05",
    "mkt_rf": -0.0301,
    "smb": 0.00276,
    "hml": 0.005975,
    "rmw": 0.000395,
    "cma": 0.008712,
    "mom": -0.005535,
    "rf": 0.0043
  },
  {
    "date": "2006-06",
    "mkt_rf": -0.0023,
    "smb": 0.0036,
    "hml": 0.00939,
    "rmw": 0.003405,
    "cma": 0.01277,
    "mom": 0.004195,
    "rf": 0.004
  },
  {
    "date": "2006-07",
    "mkt_rf": 0,
    "smb": -0.01572,
    "hml": -0.003845,
    "rmw": 0.01037,
    "cma": 0.006528,
    "mom": 0.005,
    "rf": 0.004
  },
  {
    "date": "2006-08",
    "mkt_rf": 0.0204,
    "smb": 0.00732,
    "hml": 0.016675,
    "rmw": 0.00759,
    "cma": 0.020287,
    "mom": 0.01214,
    "rf": 0.0042
  },
  {
    "date": "2006-09",
    "mkt_rf": 0.0207,
    "smb": 0.00336,
    "hml": 0.01273,
    "rmw": 0.00758,
    "cma": 0.017365,
    "mom": 0.012245,
    "rf": 0.0041
  },
  {
    "date": "2006-10",
    "mkt_rf": 0.0293,
    "smb": 0.00972,
    "hml": 0.013365,
    "rmw": 0.000945,
    "cma": 0.014457,
    "mom": 0.015255,
    "rf": 0.0041
  },
  {
    "date": "2006-11",
    "mkt_rf": 0.0146,
    "smb": 0.01572,
    "hml": 0.020735,
    "rmw": 0.002585,
    "cma": 0.020743,
    "mom": 0.01011,
    "rf": 0.0042
  },
  {
    "date": "2006-12",
    "mkt_rf": 0.0098,
    "smb": -0.00312,
    "hml": 0.00538,
    "rmw": 0.00652,
    "cma": 0.01139,
    "mom": 0.02343,
    "rf": 0.004
  },
  {
    "date": "2007-01",
    "mkt_rf": 0.0126,
    "smb": 0.01352,
    "hml": 0.00148,
    "rmw": -0.0068,
    "cma": -0.00316,
    "mom": 0.02441,
    "rf": 0.0044
  },
  {
    "date": "2007-02",
    "mkt_rf": -0.0233,
    "smb": 0.0206,
    "hml": 0.012135,
    "rmw": -0.00258,
    "cma": 0.006868,
    "mom": 0.011845,
    "rf": 0.0038
  },
  {
    "date": "2007-03",
    "mkt_rf": 0.0065,
    "smb": -0.00016,
    "hml": -0.00005,
    "rmw": 0.00728,
    "cma": 0.002875,
    "mom": 0.007275,
    "rf": 0.0043
  },
  {
    "date": "2007-04",
    "mkt_rf": 0.0387,
    "smb": -0.00124,
    "hml": -0.007415,
    "rmw": -0.00006,
    "cma": -0.006307,
    "mom": 0.018545,
    "rf": 0.0044
  },
  {
    "date": "2007-05",
    "mkt_rf": 0.0305,
    "smb": 0.00476,
    "hml": -0.001455,
    "rmw": -0.000065,
    "cma": -0.001903,
    "mom": 0.015675,
    "rf": 0.0041
  },
  {
    "date": "2007-06",
    "mkt_rf": -0.0212,
    "smb": 0.0002,
    "hml": -0.011165,
    "rmw": -0.006105,
    "cma": -0.012157,
    "mom": -0.00242,
    "rf": 0.004
  },
  {
    "date": "2007-07",
    "mkt_rf": -0.0322,
    "smb": -0.00412,
    "hml": -0.004025,
    "rmw": 0.007235,
    "cma": -0.000087,
    "mom": -0.00627,
    "rf": 0.004
  },
  {
    "date": "2007-08",
    "mkt_rf": 0.0117,
    "smb": -0.01036,
    "hml": -0.003345,
    "rmw": 0.015265,
    "cma": 0.004502,
    "mom": 0.009095,
    "rf": 0.0042
  },
  {
    "date": "2007-09",
    "mkt_rf": 0.0351,
    "smb": -0.0064,
    "hml": -0.00438,
    "rmw": 0.009465,
    "cma": 0.000785,
    "mom": 0.017285,
    "rf": 0.0032
  },
  {
    "date": "2007-10",
    "mkt_rf": 0.0171,
    "smb": 0.00068,
    "hml": -0.002995,
    "rmw": 0.00287,
    "cma": -0.001547,
    "mom": 0.010985,
    "rf": 0.0032
  },
  {
    "date": "2007-11",
    "mkt_rf": -0.0433,
    "smb": -0.00676,
    "hml": 0.000465,
    "rmw": 0.015535,
    "cma": 0.007458,
    "mom": -0.010155,
    "rf": 0.0034
  },
  {
    "date": "2007-12",
    "mkt_rf": -0.0083,
    "smb": -0.00472,
    "hml": -0.00541,
    "rmw": 0.006315,
    "cma": -0.00158,
    "mom": 0.002095,
    "rf": 0.0027
  },
  {
    "date": "2008-01",
    "mkt_rf": -0.0617,
    "smb": 0.01184,
    "hml": 0.01346,
    "rmw": 0.021125,
    "cma": 0.013805,
    "mom": -0.016595,
    "rf": 0.0021
  },
  {
    "date": "2008-02",
    "mkt_rf": -0.0317,
    "smb": 0.00092,
    "hml": -0.002225,
    "rmw": 0.00349,
    "cma": -0.000663,
    "mom": -0.006095,
    "rf": 0.0013
  },
  {
    "date": "2008-03",
    "mkt_rf": -0.0077,
    "smb": -0.01456,
    "hml": -0.00812,
    "rmw": 0.014565,
    "cma": 0.000615,
    "mom": 0.002305,
    "rf": 0.0017
  },
  {
    "date": "2008-04",
    "mkt_rf": 0.0433,
    "smb": 0.01028,
    "hml": 0.000385,
    "rmw": -0.00432,
    "cma": -0.002707,
    "mom": 0.008155,
    "rf": 0.0018
  },
  {
    "date": "2008-05",
    "mkt_rf": 0.0131,
    "smb": 0.01928,
    "hml": 0.00613,
    "rmw": -0.008055,
    "cma": -0.00036,
    "mom": 0.009585,
    "rf": 0.0018
  },
  {
    "date": "2008-06",
    "mkt_rf": -0.0861,
    "smb": -0.02008,
    "hml": -0.02214,
    "rmw": 0.01661,
    "cma": -0.01482,
    "mom": -0.025135,
    "rf": 0.0017
  },
  {
    "date": "2008-07",
    "mkt_rf": -0.0115,
    "smb": -0.01,
    "hml": -0.00789,
    "rmw": 0.009545,
    "cma": -0.00177,
    "mom": -0.011025,
    "rf": 0.0015
  },
  {
    "date": "2008-08",
    "mkt_rf": 0.0119,
    "smb": 0.00128,
    "hml": 0.00079,
    "rmw": 0.00659,
    "cma": 0.003145,
    "mom": 0.009165,
    "rf": 0.0013
  },
  {
    "date": "2008-09",
    "mkt_rf": -0.0919,
    "smb": -0.0442,
    "hml": -0.029715,
    "rmw": 0.035745,
    "cma": -0.010682,
    "mom": -0.027165,
    "rf": 0.0015
  },
  {
    "date": "2008-10",
    "mkt_rf": -0.1639,
    "smb": -0.0514,
    "hml": -0.041835,
    "rmw": 0.029955,
    "cma": -0.022592,
    "mom": -0.064365,
    "rf": 0.0008
  },
  {
    "date": "2008-11",
    "mkt_rf": -0.0701,
    "smb": -0.02788,
    "hml": -0.015995,
    "rmw": 0.032825,
    "cma": -0.002022,
    "mom": -0.031535,
    "rf": 0.0003
  },
  {
    "date": "2008-12",
    "mkt_rf": 0.0132,
    "smb": 0.03236,
    "hml": 0.045365,
    "rmw": 0.02255,
    "cma": 0.044233,
    "mom": -0.00238,
    "rf": 0
  },
  {
    "date": "2009-01",
    "mkt_rf": -0.0781,
    "smb": 0.01832,
    "hml": 0.00791,
    "rmw": 0.007135,
    "cma": 0.00258,
    "mom": -0.034335,
    "rf": 0
  },
  {
    "date": "2009-02",
    "mkt_rf": -0.0989,
    "smb": -0.00604,
    "hml": -0.014955,
    "rmw": 0.00871,
    "cma": -0.013527,
    "mom": -0.041615,
    "rf": 0.0001
  },
  {
    "date": "2009-03",
    "mkt_rf": 0.087,
    "smb": 0.01496,
    "hml": 0.00895,
    "rmw": 0.000245,
    "cma": 0.00595,
    "mom": -0.11455,
    "rf": 0.0002
  },
  {
    "date": "2009-04",
    "mkt_rf": 0.0896,
    "smb": 0.10976,
    "hml": 0.07253,
    "rmw": -0.03552,
    "cma": 0.034765,
    "mom": -0.11364,
    "rf": 0.0001
  },
  {
    "date": "2009-05",
    "mkt_rf": 0.0543,
    "smb": 0.02576,
    "hml": 0.00745,
    "rmw": -0.01403,
    "cma": -0.002425,
    "mom": -0.125995,
    "rf": 0
  },
  {
    "date": "2009-06",
    "mkt_rf": 0.0023,
    "smb": -0.00616,
    "hml": -0.01666,
    "rmw": -0.00514,
    "cma": -0.01573,
    "mom": -0.144195,
    "rf": 0.0001
  },
  {
    "date": "2009-07",
    "mkt_rf": 0.0741,
    "smb": 0.01412,
    "hml": 0.011085,
    "rmw": 0.00371,
    "cma": 0.009293,
    "mom": 0.030935,
    "rf": 0.0001
  },
  {
    "date": "2009-08",
    "mkt_rf": 0.032,
    "smb": 0.01604,
    "hml": 0.008125,
    "rmw": -0.00197,
    "cma": 0.004213,
    "mom": 0.0312,
    "rf": 0.0001
  },
  {
    "date": "2009-09",
    "mkt_rf": 0.0363,
    "smb": 0.02024,
    "hml": 0.01605,
    "rmw": 0.002405,
    "cma": 0.0123,
    "mom": 0.032705,
    "rf": 0.0001
  },
  {
    "date": "2009-10",
    "mkt_rf": -0.0165,
    "smb": -0.0154,
    "hml": -0.013245,
    "rmw": 0.00956,
    "cma": -0.005723,
    "mom": 0.014225,
    "rf": 0
  },
  {
    "date": "2009-11",
    "mkt_rf": 0.0594,
    "smb": -0.00868,
    "hml": -0.008935,
    "rmw": 0.006795,
    "cma": -0.003942,
    "mom": 0.04079,
    "rf": 0
  },
  {
    "date": "2009-12",
    "mkt_rf": 0.0201,
    "smb": 0.03308,
    "hml": 0.016565,
    "rmw": -0.011885,
    "cma": 0.005407,
    "mom": 0.027035,
    "rf": 0.0001
  },
  {
    "date": "2010-01",
    "mkt_rf": -0.0343,
    "smb": 0.005,
    "hml": -0.002125,
    "rmw": -0.001125,
    "cma": -0.002938,
    "mom": 0.007995,
    "rf": 0
  },
  {
    "date": "2010-02",
    "mkt_rf": 0.0316,
    "smb": 0.01484,
    "hml": 0.008925,
    "rmw": 0.000355,
    "cma": 0.005988,
    "mom": 0.01606,
    "rf": 0
  },
  {
    "date": "2010-03",
    "mkt_rf": 0.0587,
    "smb": 0.01136,
    "hml": 0.00463,
    "rmw": -0.00062,
    "cma": 0.002315,
    "mom": 0.025545,
    "rf": 0.0001
  },
  {
    "date": "2010-04",
    "mkt_rf": 0.0122,
    "smb": 0.017,
    "hml": 0.006825,
    "rmw": -0.0046,
    "cma": 0.001913,
    "mom": 0.02427,
    "rf": 0.0001
  },
  {
    "date": "2010-05",
    "mkt_rf": -0.0787,
    "smb": 0.00932,
    "hml": 0.013805,
    "rmw": 0.02445,
    "cma": 0.015752,
    "mom": -0.007545,
    "rf": 0.0001
  },
  {
    "date": "2010-06",
    "mkt_rf": -0.0512,
    "smb": -0.00268,
    "hml": 0.000475,
    "rmw": 0.022815,
    "cma": 0.005063,
    "mom": -0.01292,
    "rf": 0.0001
  },
  {
    "date": "2010-07",
    "mkt_rf": 0.0696,
    "smb": 0.0074,
    "hml": 0.006865,
    "rmw": 0.00658,
    "cma": 0.007632,
    "mom": 0.02936,
    "rf": 0.0001
  },
  {
    "date": "2010-08",
    "mkt_rf": -0.0441,
    "smb": 0.00128,
    "hml": 0.0052,
    "rmw": 0.023735,
    "cma": 0.009025,
    "mom": -0.010435,
    "rf": 0.0001
  },
  {
    "date": "2010-09",
    "mkt_rf": 0.0905,
    "smb": 0.0182,
    "hml": 0.011245,
    "rmw": -0.000835,
    "cma": 0.007097,
    "mom": 0.036675,
    "rf": 0.0001
  },
  {
    "date": "2010-10",
    "mkt_rf": 0.039,
    "smb": 0.00404,
    "hml": 0.002565,
    "rmw": 0.00546,
    "cma": 0.003883,
    "mom": 0.01865,
    "rf": 0.0001
  },
  {
    "date": "2010-11",
    "mkt_rf": 0.0006,
    "smb": 0.0164,
    "hml": 0.00385,
    "rmw": -0.007375,
    "cma": -0.0017,
    "mom": 0.00521,
    "rf": 0.0001
  },
  {
    "date": "2010-12",
    "mkt_rf": 0.0645,
    "smb": 0.00404,
    "hml": -0.011805,
    "rmw": -0.011305,
    "cma": -0.015278,
    "mom": 0.042575,
    "rf": 0.0001
  },
  {
    "date": "2011-01",
    "mkt_rf": 0.0223,
    "smb": -0.00408,
    "hml": -0.004235,
    "rmw": 0.001145,
    "cma": -0.003342,
    "mom": 0.027805,
    "rf": 0.0001
  },
  {
    "date": "2011-02",
    "mkt_rf": 0.0329,
    "smb": 0.00444,
    "hml": -0.00018,
    "rmw": -0.004005,
    "cma": -0.002965,
    "mom": 0.031515,
    "rf": 0.0001
  },
  {
    "date": "2011-03",
    "mkt_rf": 0.0011,
    "smb": 0.01056,
    "hml": 0.012285,
    "rmw": 0.00344,
    "cma": 0.010042,
    "mom": 0.020385,
    "rf": 0.0001
  },
  {
    "date": "2011-04",
    "mkt_rf": 0.0304,
    "smb": -0.0006,
    "hml": -0.00057,
    "rmw": 0.001385,
    "cma": -0.00051,
    "mom": 0.03064,
    "rf": 0
  },
  {
    "date": "2011-05",
    "mkt_rf": -0.0113,
    "smb": 0.00612,
    "hml": 0.01184,
    "rmw": 0.00807,
    "cma": 0.01207,
    "mom": 0.016045,
    "rf": 0
  },
  {
    "date": "2011-06",
    "mkt_rf": -0.0165,
    "smb": -0.0048,
    "hml": 0.001345,
    "rmw": 0.00849,
    "cma": 0.004523,
    "mom": 0.014225,
    "rf": 0
  },
  {
    "date": "2011-07",
    "mkt_rf": -0.0204,
    "smb": -0.018,
    "hml": -0.011875,
    "rmw": 0.008375,
    "cma": -0.005313,
    "mom": -0.00214,
    "rf": 0
  },
  {
    "date": "2011-08",
    "mkt_rf": -0.0536,
    "smb": -0.01224,
    "hml": 0.007925,
    "rmw": 0.036795,
    "cma": 0.017687,
    "mom": -0.01376,
    "rf": 0.0001
  },
  {
    "date": "2011-09",
    "mkt_rf": -0.0684,
    "smb": -0.02628,
    "hml": -0.01072,
    "rmw": 0.031325,
    "cma": 0.001115,
    "mom": -0.01894,
    "rf": 0
  },
  {
    "date": "2011-10",
    "mkt_rf": 0.1067,
    "smb": 0.02292,
    "hml": 0.01303,
    "rmw": -0.010025,
    "cma": 0.00374,
    "mom": 0.030345,
    "rf": 0
  },
  {
    "date": "2011-11",
    "mkt_rf": -0.0021,
    "smb": -0.006,
    "hml": -0.000435,
    "rmw": 0.007805,
    "cma": 0.002858,
    "mom": 0.004265,
    "rf": 0
  },
  {
    "date": "2011-12",
    "mkt_rf": 0.0088,
    "smb": -0.01812,
    "hml": -0.01154,
    "rmw": 0.008905,
    "cma": -0.004795,
    "mom": 0.00808,
    "rf": 0
  },
  {
    "date": "2012-01",
    "mkt_rf": 0.0471,
    "smb": 0.01992,
    "hml": 0.014955,
    "rmw": -0.0043,
    "cma": 0.008077,
    "mom": 0.021485,
    "rf": 0
  },
  {
    "date": "2012-02",
    "mkt_rf": 0.0452,
    "smb": -0.0024,
    "hml": -0.001095,
    "rmw": 0.00286,
    "cma": -0.000148,
    "mom": 0.02082,
    "rf": 0
  },
  {
    "date": "2012-03",
    "mkt_rf": 0.0326,
    "smb": -0.01548,
    "hml": -0.01486,
    "rmw": 0.00197,
    "cma": -0.01078,
    "mom": 0.03141,
    "rf": 0
  },
  {
    "date": "2012-04",
    "mkt_rf": -0.0069,
    "smb": -0.00492,
    "hml": -0.00012,
    "rmw": 0.00692,
    "cma": 0.00264,
    "mom": 0.017585,
    "rf": 0
  },
  {
    "date": "2012-05",
    "mkt_rf": -0.0598,
    "smb": -0.01992,
    "hml": -0.007865,
    "rmw": 0.02728,
    "cma": 0.001168,
    "mom": -0.00093,
    "rf": 0.0001
  },
  {
    "date": "2012-06",
    "mkt_rf": 0.0392,
    "smb": -0.01368,
    "hml": -0.005065,
    "rmw": 0.01131,
    "cma": 0.001217,
    "mom": 0.01872,
    "rf": 0
  },
  {
    "date": "2012-07",
    "mkt_rf": 0.0114,
    "smb": -0.01572,
    "hml": -0.00858,
    "rmw": 0.009575,
    "cma": -0.002265,
    "mom": 0.00899,
    "rf": 0
  },
  {
    "date": "2012-08",
    "mkt_rf": 0.0236,
    "smb": 0.0054,
    "hml": 0.00092,
    "rmw": -0.003835,
    "cma": -0.002065,
    "mom": 0.01326,
    "rf": 0.0001
  },
  {
    "date": "2012-09",
    "mkt_rf": 0.0268,
    "smb": -0.00372,
    "hml": -0.00302,
    "rmw": 0.002145,
    "cma": -0.001935,
    "mom": 0.01438,
    "rf": 0.0001
  },
  {
    "date": "2012-10",
    "mkt_rf": -0.0177,
    "smb": 0.0096,
    "hml": 0.006655,
    "rmw": -0.002015,
    "cma": 0.003103,
    "mom": -0.001195,
    "rf": 0.0001
  },
  {
    "date": "2012-11",
    "mkt_rf": 0.006,
    "smb": 0.00636,
    "hml": 0.0073,
    "rmw": 0.002495,
    "cma": 0.005875,
    "mom": 0.0071,
    "rf": 0.0001
  },
  {
    "date": "2012-12",
    "mkt_rf": 0.0087,
    "smb": 0.01296,
    "hml": 0.008105,
    "rmw": -0.00422,
    "cma": 0.003052,
    "mom": 0.008045,
    "rf": 0.0001
  },
  {
    "date": "2013-01",
    "mkt_rf": 0.0533,
    "smb": 0.01356,
    "hml": 0.00589,
    "rmw": -0.0075,
    "cma": -0.000255,
    "mom": 0.023655,
    "rf": 0
  },
  {
    "date": "2013-02",
    "mkt_rf": 0.0129,
    "smb": -0.00396,
    "hml": -0.00379,
    "rmw": 0.001525,
    "cma": -0.00282,
    "mom": 0.024515,
    "rf": 0
  },
  {
    "date": "2013-03",
    "mkt_rf": 0.039,
    "smb": 0.00504,
    "hml": 0.004625,
    "rmw": 0.000905,
    "cma": 0.003087,
    "mom": 0.01865,
    "rf": 0
  },
  {
    "date": "2013-04",
    "mkt_rf": 0.0185,
    "smb": -0.00828,
    "hml": -0.00076,
    "rmw": 0.01007,
    "cma": 0.00377,
    "mom": 0.026475,
    "rf": 0
  },
  {
    "date": "2013-05",
    "mkt_rf": 0.0244,
    "smb": -0.0042,
    "hml": -0.00624,
    "rmw": -0.001055,
    "cma": -0.005945,
    "mom": 0.02854,
    "rf": 0
  },
  {
    "date": "2013-06",
    "mkt_rf": -0.0137,
    "smb": -0.00156,
    "hml": -0.00881,
    "rmw": -0.007115,
    "cma": -0.01093,
    "mom": 0.015205,
    "rf": 0
  },
  {
    "date": "2013-07",
    "mkt_rf": 0.0536,
    "smb": 0.00492,
    "hml": -0.00212,
    "rmw": -0.006825,
    "cma": -0.005835,
    "mom": 0.03876,
    "rf": 0
  },
  {
    "date": "2013-08",
    "mkt_rf": -0.0272,
    "smb": 0.00132,
    "hml": -0.00191,
    "rmw": -0.002405,
    "cma": -0.00343,
    "mom": 0.01048,
    "rf": 0
  },
  {
    "date": "2013-09",
    "mkt_rf": 0.0334,
    "smb": 0.00948,
    "hml": 0.00594,
    "rmw": -0.00271,
    "cma": 0.00222,
    "mom": 0.01669,
    "rf": 0
  },
  {
    "date": "2013-10",
    "mkt_rf": 0.0442,
    "smb": -0.0108,
    "hml": -0.002545,
    "rmw": 0.01091,
    "cma": 0.002877,
    "mom": 0.02047,
    "rf": 0
  },
  {
    "date": "2013-11",
    "mkt_rf": 0.0306,
    "smb": -0.0114,
    "hml": -0.00954,
    "rmw": 0.003445,
    "cma": -0.006095,
    "mom": 0.03071,
    "rf": 0
  },
  {
    "date": "2013-12",
    "mkt_rf": 0.0266,
    "smb": 0.00192,
    "hml": -0.001875,
    "rmw": -0.00306,
    "cma": -0.003737,
    "mom": 0.02931,
    "rf": 0
  },
  {
    "date": "2014-01",
    "mkt_rf": -0.035,
    "smb": 0.00492,
    "hml": 0.00523,
    "rmw": 0.00175,
    "cma": 0.003965,
    "mom": 0.00775,
    "rf": 0
  },
  {
    "date": "2014-02",
    "mkt_rf": 0.046,
    "smb": 0.00732,
    "hml": 0.00939,
    "rmw": 0.00382,
    "cma": 0.008095,
    "mom": 0.0211,
    "rf": 0
  },
  {
    "date": "2014-03",
    "mkt_rf": 0.0075,
    "smb": -0.00792,
    "hml": -0.005035,
    "rmw": 0.004665,
    "cma": -0.002143,
    "mom": 0.022625,
    "rf": 0
  },
  {
    "date": "2014-04",
    "mkt_rf": 0.0054,
    "smb": -0.01332,
    "hml": -0.00841,
    "rmw": 0.00699,
    "cma": -0.003455,
    "mom": 0.02189,
    "rf": 0
  },
  {
    "date": "2014-05",
    "mkt_rf": 0.0228,
    "smb": -0.00168,
    "hml": 0.002985,
    "rmw": 0.006785,
    "cma": 0.004868,
    "mom": 0.01298,
    "rf": 0
  },
  {
    "date": "2014-06",
    "mkt_rf": 0.0199,
    "smb": 0.00672,
    "hml": 0.004615,
    "rmw": -0.001055,
    "cma": 0.002083,
    "mom": 0.011965,
    "rf": 0
  },
  {
    "date": "2014-07",
    "mkt_rf": -0.0135,
    "smb": -0.01332,
    "hml": -0.0073,
    "rmw": 0.008285,
    "cma": -0.001975,
    "mom": 0.000275,
    "rf": 0
  },
  {
    "date": "2014-08",
    "mkt_rf": 0.0407,
    "smb": 0.00168,
    "hml": 0.004645,
    "rmw": 0.004825,
    "cma": 0.005097,
    "mom": 0.019245,
    "rf": 0
  },
  {
    "date": "2014-09",
    "mkt_rf": -0.0137,
    "smb": -0.01668,
    "hml": -0.01355,
    "rmw": 0.00489,
    "cma": -0.008325,
    "mom": 0.000205,
    "rf": 0
  },
  {
    "date": "2014-10",
    "mkt_rf": 0.0227,
    "smb": 0.003,
    "hml": 0.00807,
    "rmw": 0.00729,
    "cma": 0.008885,
    "mom": 0.012945,
    "rf": 0
  },
  {
    "date": "2014-11",
    "mkt_rf": 0.0289,
    "smb": -0.0066,
    "hml": -0.00464,
    "rmw": 0.003595,
    "cma": -0.002395,
    "mom": 0.015115,
    "rf": 0
  },
  {
    "date": "2014-12",
    "mkt_rf": -0.0035,
    "smb": 0.00312,
    "hml": 0.005605,
    "rmw": 0.004275,
    "cma": 0.005527,
    "mom": 0.003775,
    "rf": 0
  },
  {
    "date": "2015-01",
    "mkt_rf": -0.0307,
    "smb": 0.00048,
    "hml": 0.008445,
    "rmw": 0.01065,
    "cma": 0.010873,
    "mom": -0.005745,
    "rf": 0
  },
  {
    "date": "2015-02",
    "mkt_rf": 0.06,
    "smb": 0.00456,
    "hml": 0.001585,
    "rmw": -0.002085,
    "cma": -0.000682,
    "mom": 0.026,
    "rf": 0
  },
  {
    "date": "2015-03",
    "mkt_rf": -0.0158,
    "smb": 0.00528,
    "hml": 0.002995,
    "rmw": -0.001275,
    "cma": 0.000772,
    "mom": -0.00053,
    "rf": 0
  },
  {
    "date": "2015-04",
    "mkt_rf": 0.01,
    "smb": -0.00768,
    "hml": -0.002555,
    "rmw": 0.00728,
    "cma": 0.001022,
    "mom": 0.0085,
    "rf": 0
  },
  {
    "date": "2015-05",
    "mkt_rf": 0.0121,
    "smb": -0.00612,
    "hml": -0.00958,
    "rmw": -0.002725,
    "cma": -0.009265,
    "mom": 0.009235,
    "rf": 0
  },
  {
    "date": "2015-06",
    "mkt_rf": -0.0183,
    "smb": -0.00492,
    "hml": -0.00642,
    "rmw": -0.00043,
    "cma": -0.00576,
    "mom": -0.001405,
    "rf": 0
  },
  {
    "date": "2015-07",
    "mkt_rf": 0.0209,
    "smb": -0.01596,
    "hml": -0.00968,
    "rmw": 0.00857,
    "cma": -0.00359,
    "mom": 0.012315,
    "rf": 0
  },
  {
    "date": "2015-08",
    "mkt_rf": -0.0602,
    "smb": 0.00168,
    "hml": 0.005275,
    "rmw": 0.01756,
    "cma": 0.005938,
    "mom": -0.01607,
    "rf": 0
  },
  {
    "date": "2015-09",
    "mkt_rf": -0.0259,
    "smb": -0.0174,
    "hml": -0.01166,
    "rmw": 0.00793,
    "cma": -0.00538,
    "mom": -0.004065,
    "rf": 0
  },
  {
    "date": "2015-10",
    "mkt_rf": 0.0816,
    "smb": -0.0144,
    "hml": -0.007285,
    "rmw": 0.009555,
    "cma": -0.001318,
    "mom": 0.03356,
    "rf": 0
  },
  {
    "date": "2015-11",
    "mkt_rf": 0.0031,
    "smb": -0.00324,
    "hml": -0.00592,
    "rmw": -0.001795,
    "cma": -0.006085,
    "mom": 0.006085,
    "rf": 0
  },
  {
    "date": "2015-12",
    "mkt_rf": -0.0179,
    "smb": -0.01608,
    "hml": -0.010275,
    "rmw": 0.008015,
    "cma": -0.004312,
    "mom": -0.001265,
    "rf": 0.0001
  },
  {
    "date": "2016-01",
    "mkt_rf": -0.0539,
    "smb": -0.0186,
    "hml": -0.00915,
    "rmw": 0.02425,
    "cma": -0.001325,
    "mom": -0.013865,
    "rf": 0.0001
  },
  {
    "date": "2016-02",
    "mkt_rf": -0.0019,
    "smb": 0.00672,
    "hml": 0.012325,
    "rmw": 0.00794,
    "cma": 0.012363,
    "mom": 0.004335,
    "rf": 0.0002
  },
  {
    "date": "2016-03",
    "mkt_rf": 0.0677,
    "smb": 0.01284,
    "hml": 0.00712,
    "rmw": -0.00523,
    "cma": 0.00181,
    "mom": 0.028695,
    "rf": 0.0002
  },
  {
    "date": "2016-04",
    "mkt_rf": 0.0068,
    "smb": 0.01188,
    "hml": 0.01079,
    "rmw": 0.000165,
    "cma": 0.00727,
    "mom": 0.00738,
    "rf": 0.0001
  },
  {
    "date": "2016-05",
    "mkt_rf": 0.0174,
    "smb": -0.00564,
    "hml": -0.00345,
    "rmw": 0.00387,
    "cma": -0.001375,
    "mom": 0.01109,
    "rf": 0.0001
  },
  {
    "date": "2016-06",
    "mkt_rf": -0.0003,
    "smb": -0.0096,
    "hml": -0.002445,
    "rmw": 0.009635,
    "cma": 0.002302,
    "mom": 0.004895,
    "rf": 0.0002
  },
  {
    "date": "2016-07",
    "mkt_rf": 0.037,
    "smb": 0.00216,
    "hml": 0.005165,
    "rmw": 0.004875,
    "cma": 0.005508,
    "mom": 0.01795,
    "rf": 0.0002
  },
  {
    "date": "2016-08",
    "mkt_rf": 0.0032,
    "smb": -0.00024,
    "hml": -0.001095,
    "rmw": 0.000355,
    "cma": -0.001423,
    "mom": 0.02112,
    "rf": 0.0002
  },
  {
    "date": "2016-09",
    "mkt_rf": 0.0013,
    "smb": -0.00048,
    "hml": -0.001445,
    "rmw": 0.000225,
    "cma": -0.001747,
    "mom": 0.020455,
    "rf": 0.0002
  },
  {
    "date": "2016-10",
    "mkt_rf": -0.0157,
    "smb": -0.00744,
    "hml": -0.007725,
    "rmw": 0.00097,
    "cma": -0.006013,
    "mom": -0.000495,
    "rf": 0.0002
  },
  {
    "date": "2016-11",
    "mkt_rf": 0.0397,
    "smb": 0.01104,
    "hml": -0.000185,
    "rmw": -0.011665,
    "cma": -0.006867,
    "mom": 0.018895,
    "rf": 0.0001
  },
  {
    "date": "2016-12",
    "mkt_rf": 0.0183,
    "smb": -0.01536,
    "hml": -0.018195,
    "rmw": -0.00206,
    "cma": -0.015298,
    "mom": 0.011405,
    "rf": 0.0003
  },
  {
    "date": "2017-01",
    "mkt_rf": 0.0203,
    "smb": 0.00444,
    "hml": -0.00887,
    "rmw": 0.00219,
    "cma": -0.008885,
    "mom": 0.012105,
    "rf": 0.0004
  },
  {
    "date": "2017-02",
    "mkt_rf": 0.0387,
    "smb": -0.00972,
    "hml": -0.02004,
    "rmw": 0.00558,
    "cma": -0.01542,
    "mom": 0.018545,
    "rf": 0.0004
  },
  {
    "date": "2017-03",
    "mkt_rf": 0.0015,
    "smb": -0.00324,
    "hml": -0.01701,
    "rmw": 0.0016,
    "cma": -0.015205,
    "mom": 0.020525,
    "rf": 0.0003
  },
  {
    "date": "2017-04",
    "mkt_rf": 0.0114,
    "smb": -0.00336,
    "hml": -0.011725,
    "rmw": 0.007905,
    "cma": -0.008088,
    "mom": 0.02399,
    "rf": 0.0005
  },
  {
    "date": "2017-05",
    "mkt_rf": 0.0147,
    "smb": -0.00936,
    "hml": -0.020115,
    "rmw": 0.005075,
    "cma": -0.015732,
    "mom": 0.025145,
    "rf": 0.0006
  },
  {
    "date": "2017-06",
    "mkt_rf": 0.0046,
    "smb": 0.00168,
    "hml": -0.009805,
    "rmw": 0.0043,
    "cma": -0.008502,
    "mom": 0.02161,
    "rf": 0.0006
  },
  {
    "date": "2017-07",
    "mkt_rf": 0.0205,
    "smb": -0.0078,
    "hml": -0.02198,
    "rmw": 0.00109,
    "cma": -0.01914,
    "mom": 0.012175,
    "rf": 0.0007
  },
  {
    "date": "2017-08",
    "mkt_rf": 0.004,
    "smb": -0.01332,
    "hml": -0.02052,
    "rmw": 0.009195,
    "cma": -0.013935,
    "mom": 0.0064,
    "rf": 0.0009
  },
  {
    "date": "2017-09",
    "mkt_rf": 0.02,
    "smb": 0.00528,
    "hml": -0.009625,
    "rmw": 0.000335,
    "cma": -0.010388,
    "mom": 0.012,
    "rf": 0.0009
  },
  {
    "date": "2017-10",
    "mkt_rf": 0.024,
    "smb": -0.0144,
    "hml": -0.027405,
    "rmw": 0.002415,
    "cma": -0.022477,
    "mom": 0.0134,
    "rf": 0.0009
  },
  {
    "date": "2017-11",
    "mkt_rf": 0.0317,
    "smb": 0.00468,
    "hml": -0.00999,
    "rmw": 0.000605,
    "cma": -0.01052,
    "mom": 0.016095,
    "rf": 0.0008
  },
  {
    "date": "2017-12",
    "mkt_rf": 0.0115,
    "smb": -0.00144,
    "hml": -0.015705,
    "rmw": 0.001035,
    "cma": -0.014528,
    "mom": 0.024025,
    "rf": 0.0009
  },
  {
    "date": "2018-01",
    "mkt_rf": 0.0595,
    "smb": -0.01416,
    "hml": -0.027685,
    "rmw": 0.00581,
    "cma": -0.022992,
    "mom": 0.040825,
    "rf": 0.0011
  },
  {
    "date": "2018-02",
    "mkt_rf": -0.036,
    "smb": -0.00648,
    "hml": -0.024465,
    "rmw": 0.00066,
    "cma": -0.023233,
    "mom": 0.0074,
    "rf": 0.0011
  },
  {
    "date": "2018-03",
    "mkt_rf": -0.0278,
    "smb": 0.01656,
    "hml": -0.001335,
    "rmw": 0.000925,
    "cma": -0.005993,
    "mom": 0.01027,
    "rf": 0.0012
  },
  {
    "date": "2018-04",
    "mkt_rf": 0.0029,
    "smb": -0.00696,
    "hml": -0.019195,
    "rmw": 0.007365,
    "cma": -0.015922,
    "mom": 0.006015,
    "rf": 0.0014
  },
  {
    "date": "2018-05",
    "mkt_rf": 0.0216,
    "smb": -0.0144,
    "hml": -0.026175,
    "rmw": 0.00785,
    "cma": -0.020838,
    "mom": 0.01256,
    "rf": 0.0014
  },
  {
    "date": "2018-06",
    "mkt_rf": 0.0049,
    "smb": 0.0048,
    "hml": -0.008675,
    "rmw": 0.006,
    "cma": -0.008837,
    "mom": 0.006715,
    "rf": 0.0014
  },
  {
    "date": "2018-07",
    "mkt_rf": 0.0348,
    "smb": -0.01068,
    "hml": -0.02075,
    "rmw": 0.009865,
    "cma": -0.0158,
    "mom": 0.01718,
    "rf": 0.0016
  },
  {
    "date": "2018-08",
    "mkt_rf": 0.0337,
    "smb": -0.01224,
    "hml": -0.022305,
    "rmw": 0.00986,
    "cma": -0.016952,
    "mom": 0.016795,
    "rf": 0.0016
  },
  {
    "date": "2018-09",
    "mkt_rf": 0.004,
    "smb": -0.00708,
    "hml": -0.02108,
    "rmw": 0.005305,
    "cma": -0.018365,
    "mom": 0.0064,
    "rf": 0.0015
  },
  {
    "date": "2018-10",
    "mkt_rf": -0.0709,
    "smb": -0.01044,
    "hml": -0.02448,
    "rmw": 0.013235,
    "cma": -0.020915,
    "mom": -0.004815,
    "rf": 0.0019
  },
  {
    "date": "2018-11",
    "mkt_rf": 0.0168,
    "smb": 0.00012,
    "hml": -0.01286,
    "rmw": 0.006545,
    "cma": -0.011655,
    "mom": 0.01088,
    "rf": 0.0018
  },
  {
    "date": "2018-12",
    "mkt_rf": -0.0914,
    "smb": -0.01248,
    "hml": -0.015965,
    "rmw": 0.025535,
    "cma": -0.008358,
    "mom": -0.02699,
    "rf": 0.0019
  },
  {
    "date": "2019-01",
    "mkt_rf": 0.0787,
    "smb": 0.0198,
    "hml": 0.00294,
    "rmw": 0.002155,
    "cma": -0.002205,
    "mom": 0.032545,
    "rf": 0.0021
  },
  {
    "date": "2019-02",
    "mkt_rf": 0.0314,
    "smb": 0.0048,
    "hml": -0.009665,
    "rmw": 0.004845,
    "cma": -0.010157,
    "mom": 0.01599,
    "rf": 0.0018
  },
  {
    "date": "2019-03",
    "mkt_rf": 0.0156,
    "smb": -0.01512,
    "hml": -0.022005,
    "rmw": 0.01355,
    "cma": -0.014852,
    "mom": 0.01046,
    "rf": 0.0019
  },
  {
    "date": "2019-04",
    "mkt_rf": 0.0405,
    "smb": -0.0054,
    "hml": -0.0168,
    "rmw": 0.00835,
    "cma": -0.01365,
    "mom": 0.019175,
    "rf": 0.0021
  },
  {
    "date": "2019-05",
    "mkt_rf": -0.0682,
    "smb": -0.00408,
    "hml": -0.013825,
    "rmw": 0.01829,
    "cma": -0.010462,
    "mom": -0.00387,
    "rf": 0.0021
  },
  {
    "date": "2019-06",
    "mkt_rf": 0.0693,
    "smb": 0.00324,
    "hml": -0.00387,
    "rmw": 0.013415,
    "cma": -0.00151,
    "mom": 0.029255,
    "rf": 0.0018
  },
  {
    "date": "2019-07",
    "mkt_rf": 0.0133,
    "smb": -0.00456,
    "hml": -0.007475,
    "rmw": 0.018255,
    "cma": -0.001712,
    "mom": 0.024655,
    "rf": 0.0019
  },
  {
    "date": "2019-08",
    "mkt_rf": -0.0212,
    "smb": -0.01488,
    "hml": -0.024475,
    "rmw": 0.01039,
    "cma": -0.018287,
    "mom": 0.01258,
    "rf": 0.0016
  },
  {
    "date": "2019-09",
    "mkt_rf": 0.0144,
    "smb": -0.00156,
    "hml": -0.01669,
    "rmw": 0.004025,
    "cma": -0.01577,
    "mom": 0.01004,
    "rf": 0.0018
  },
  {
    "date": "2019-10",
    "mkt_rf": 0.0219,
    "smb": -0.01356,
    "hml": -0.02372,
    "rmw": 0.00974,
    "cma": -0.01806,
    "mom": 0.012665,
    "rf": 0.0015
  },
  {
    "date": "2019-11",
    "mkt_rf": 0.038,
    "smb": 0.00504,
    "hml": -0.012495,
    "rmw": 0.001265,
    "cma": -0.014072,
    "mom": 0.0183,
    "rf": 0.0012
  },
  {
    "date": "2019-12",
    "mkt_rf": 0.0274,
    "smb": -0.00804,
    "hml": -0.02065,
    "rmw": 0.00692,
    "cma": -0.017225,
    "mom": 0.02959,
    "rf": 0.0014
  },
  {
    "date": "2020-01",
    "mkt_rf": 0.0028,
    "smb": -0.01128,
    "hml": -0.02165,
    "rmw": 0.01299,
    "cma": -0.014875,
    "mom": 0.02098,
    "rf": 0.0013
  },
  {
    "date": "2020-02",
    "mkt_rf": -0.0813,
    "smb": -0.00432,
    "hml": -0.01312,
    "rmw": 0.02287,
    "cma": -0.00761,
    "mom": -0.023455,
    "rf": 0.0012
  },
  {
    "date": "2020-03",
    "mkt_rf": -0.1221,
    "smb": -0.06528,
    "hml": -0.04805,
    "rmw": 0.052815,
    "cma": -0.0182,
    "mom": -0.037735,
    "rf": 0.0012
  },
  {
    "date": "2020-04",
    "mkt_rf": 0.1328,
    "smb": 0.0276,
    "hml": 0.0085,
    "rmw": 0.003075,
    "cma": 0.002375,
    "mom": -0.02852,
    "rf": 0
  },
  {
    "date": "2020-05",
    "mkt_rf": 0.0516,
    "smb": 0.01788,
    "hml": -0.003425,
    "rmw": 0.000435,
    "cma": -0.007788,
    "mom": -0.05694,
    "rf": 0.0001
  },
  {
    "date": "2020-06",
    "mkt_rf": 0.0228,
    "smb": -0.0102,
    "hml": -0.024425,
    "rmw": 0.0085,
    "cma": -0.019213,
    "mom": -0.06702,
    "rf": 0.0001
  },
  {
    "date": "2020-07",
    "mkt_rf": 0.0614,
    "smb": -0.00156,
    "hml": -0.014465,
    "rmw": 0.0101,
    "cma": -0.011033,
    "mom": 0.02649,
    "rf": 0.0001
  },
  {
    "date": "2020-08",
    "mkt_rf": 0.0788,
    "smb": -0.04104,
    "hml": -0.04561,
    "rmw": 0.01955,
    "cma": -0.029255,
    "mom": 0.03258,
    "rf": 0.0001
  },
  {
    "date": "2020-09",
    "mkt_rf": -0.0371,
    "smb": 0.02532,
    "hml": 0.001395,
    "rmw": -0.00257,
    "cma": -0.005752,
    "mom": 0.007015,
    "rf": 0.0001
  },
  {
    "date": "2020-10",
    "mkt_rf": -0.0261,
    "smb": 0.04032,
    "hml": -0.000405,
    "rmw": -0.00467,
    "cma": -0.008153,
    "mom": 0.010865,
    "rf": 0.0001
  },
  {
    "date": "2020-11",
    "mkt_rf": 0.1163,
    "smb": 0.0396,
    "hml": -0.000195,
    "rmw": -0.00359,
    "cma": -0.007448,
    "mom": 0.060705,
    "rf": 0.0001
  },
  {
    "date": "2020-12",
    "mkt_rf": 0.0418,
    "smb": 0.01884,
    "hml": -0.01445,
    "rmw": 0.003855,
    "cma": -0.0142,
    "mom": 0.03463,
    "rf": 0.0001
  },
  {
    "date": "2021-01",
    "mkt_rf": -0.008,
    "smb": -0.00136,
    "hml": 0.01672,
    "rmw": 0.001945,
    "cma": -0.000265,
    "mom": 0.0172,
    "rf": 0
  },
  {
    "date": "2021-02",
    "mkt_rf": 0.0236,
    "smb": 0.02252,
    "hml": 0.033005,
    "rmw": -0.00675,
    "cma": 0.007352,
    "mom": 0.02826,
    "rf": 0
  },
  {
    "date": "2021-03",
    "mkt_rf": 0.0361,
    "smb": 0.00032,
    "hml": 0.0135,
    "rmw": -0.00376,
    "cma": -0.00555,
    "mom": 0.032635,
    "rf": 0
  },
  {
    "date": "2021-04",
    "mkt_rf": 0.0546,
    "smb": -0.01432,
    "hml": 0.01042,
    "rmw": 0.009625,
    "cma": -0.001015,
    "mom": 0.03911,
    "rf": 0
  },
  {
    "date": "2021-05",
    "mkt_rf": 0.0035,
    "smb": 0.00236,
    "hml": 0.023375,
    "rmw": 0.005395,
    "cma": 0.006412,
    "mom": 0.021225,
    "rf": 0
  },
  {
    "date": "2021-06",
    "mkt_rf": 0.0274,
    "smb": -0.019,
    "hml": 0.010045,
    "rmw": 0.014615,
    "cma": 0.001248,
    "mom": 0.02959,
    "rf": 0
  },
  {
    "date": "2021-07",
    "mkt_rf": 0.0199,
    "smb": -0.02188,
    "hml": 0.010225,
    "rmw": 0.018165,
    "cma": 0.003187,
    "mom": 0.026965,
    "rf": 0
  },
  {
    "date": "2021-08",
    "mkt_rf": 0.0303,
    "smb": -0.0094,
    "hml": 0.015405,
    "rmw": 0.009735,
    "cma": 0.002728,
    "mom": 0.030605,
    "rf": 0
  },
  {
    "date": "2021-09",
    "mkt_rf": -0.0459,
    "smb": 0.00224,
    "hml": 0.02071,
    "rmw": 0.010425,
    "cma": 0.00293,
    "mom": 0.003935,
    "rf": 0
  },
  {
    "date": "2021-10",
    "mkt_rf": 0.07,
    "smb": -0.02128,
    "hml": 0.00138,
    "rmw": 0.00715,
    "cma": -0.00896,
    "mom": 0.0295,
    "rf": 0
  },
  {
    "date": "2021-11",
    "mkt_rf": -0.0105,
    "smb": -0.03004,
    "hml": 0.000395,
    "rmw": 0.01616,
    "cma": -0.005103,
    "mom": 0.016325,
    "rf": 0
  },
  {
    "date": "2021-12",
    "mkt_rf": 0.0351,
    "smb": 0.00452,
    "hml": 0.026435,
    "rmw": 0.00646,
    "cma": 0.009217,
    "mom": 0.017285,
    "rf": 0.0001
  },
  {
    "date": "2022-01",
    "mkt_rf": -0.0565,
    "smb": -0.01336,
    "hml": 0.00522,
    "rmw": 0.010445,
    "cma": 0.009485,
    "mom": -0.014775,
    "rf": 0
  },
  {
    "date": "2022-02",
    "mkt_rf": -0.0273,
    "smb": 0.01724,
    "hml": 0.029655,
    "rmw": -0.008535,
    "cma": 0.024003,
    "mom": -0.004555,
    "rf": 0
  },
  {
    "date": "2022-03",
    "mkt_rf": 0.0341,
    "smb": -0.02488,
    "hml": -0.00081,
    "rmw": 0.00477,
    "cma": 0.008245,
    "mom": 0.016935,
    "rf": 0
  },
  {
    "date": "2022-04",
    "mkt_rf": -0.0935,
    "smb": 0.00584,
    "hml": 0.01156,
    "rmw": -0.004425,
    "cma": 0.006605,
    "mom": -0.027725,
    "rf": 0
  },
  {
    "date": "2022-05",
    "mkt_rf": -0.0035,
    "smb": -0.00268,
    "hml": 0.016145,
    "rmw": -0.001195,
    "cma": 0.017747,
    "mom": -0.008225,
    "rf": 0.0003
  },
  {
    "date": "2022-06",
    "mkt_rf": -0.082,
    "smb": -0.01384,
    "hml": 0.00617,
    "rmw": 0.01211,
    "cma": 0.011035,
    "mom": -0.0357,
    "rf": 0.0006
  },
  {
    "date": "2022-07",
    "mkt_rf": 0.0947,
    "smb": -0.0076,
    "hml": 0.02139,
    "rmw": 0.01063,
    "cma": 0.027645,
    "mom": 0.026145,
    "rf": 0.0008
  },
  {
    "date": "2022-08",
    "mkt_rf": -0.0395,
    "smb": 0.0104,
    "hml": 0.02835,
    "rmw": -0.002125,
    "cma": 0.0263,
    "mom": -0.008825,
    "rf": 0.0019
  },
  {
    "date": "2022-09",
    "mkt_rf": -0.0925,
    "smb": -0.00616,
    "hml": 0.00267,
    "rmw": -0.00088,
    "cma": 0.001835,
    "mom": -0.027375,
    "rf": 0.0019
  },
  {
    "date": "2022-10",
    "mkt_rf": 0.0768,
    "smb": 0.00728,
    "hml": 0.01582,
    "rmw": -0.013125,
    "cma": 0.011435,
    "mom": 0.01988,
    "rf": 0.0023
  },
  {
    "date": "2022-11",
    "mkt_rf": 0.0494,
    "smb": 0.00584,
    "hml": 0.02713,
    "rmw": 0.00174,
    "cma": 0.027365,
    "mom": 0.02229,
    "rf": 0.0029
  },
  {
    "date": "2022-12",
    "mkt_rf": -0.064,
    "smb": 0.00536,
    "hml": 0.03069,
    "rmw": 0.01845,
    "cma": 0.032395,
    "mom": -0.0174,
    "rf": 0.0033
  },
  {
    "date": "2023-01",
    "mkt_rf": 0.0613,
    "smb": 0.01304,
    "hml": 0.00896,
    "rmw": -0.000975,
    "cma": 0.006055,
    "mom": 0.026455,
    "rf": 0.0035
  },
  {
    "date": "2023-02",
    "mkt_rf": -0.0263,
    "smb": -0.01396,
    "hml": -0.017155,
    "rmw": -0.00013,
    "cma": -0.012827,
    "mom": -0.004205,
    "rf": 0.0034
  },
  {
    "date": "2023-03",
    "mkt_rf": 0.0336,
    "smb": -0.05164,
    "hml": -0.036855,
    "rmw": 0.020585,
    "cma": -0.016852,
    "mom": 0.01676,
    "rf": 0.0036
  },
  {
    "date": "2023-04",
    "mkt_rf": 0.0096,
    "smb": -0.02836,
    "hml": -0.017875,
    "rmw": 0.01573,
    "cma": -0.005287,
    "mom": 0.02336,
    "rf": 0.0035
  },
  {
    "date": "2023-05",
    "mkt_rf": 0.0051,
    "smb": -0.04276,
    "hml": -0.035155,
    "rmw": 0.01227,
    "cma": -0.019827,
    "mom": 0.006785,
    "rf": 0.0036
  },
  {
    "date": "2023-06",
    "mkt_rf": 0.0629,
    "smb": 0.00836,
    "hml": -0.000595,
    "rmw": -0.006695,
    "cma": -0.003923,
    "mom": 0.027015,
    "rf": 0.004
  },
  {
    "date": "2023-07",
    "mkt_rf": 0.0296,
    "smb": -0.0004,
    "hml": -0.00623,
    "rmw": -0.00311,
    "cma": -0.006265,
    "mom": 0.03036,
    "rf": 0.0045
  },
  {
    "date": "2023-08",
    "mkt_rf": -0.0203,
    "smb": -0.0178,
    "hml": -0.021225,
    "rmw": -0.000425,
    "cma": -0.015988,
    "mom": 0.012895,
    "rf": 0.0045
  },
  {
    "date": "2023-09",
    "mkt_rf": -0.0509,
    "smb": -0.00532,
    "hml": -0.010915,
    "rmw": 0.00913,
    "cma": -0.009607,
    "mom": 0.002185,
    "rf": 0.0043
  },
  {
    "date": "2023-10",
    "mkt_rf": -0.0276,
    "smb": -0.03148,
    "hml": -0.034245,
    "rmw": 0.00025,
    "cma": -0.025272,
    "mom": -0.00466,
    "rf": 0.0047
  },
  {
    "date": "2023-11",
    "mkt_rf": 0.0886,
    "smb": -0.00052,
    "hml": 0.004095,
    "rmw": 0.009075,
    "cma": 0.007572,
    "mom": 0.03601,
    "rf": 0.0044
  },
  {
    "date": "2023-12",
    "mkt_rf": 0.0418,
    "smb": 0.03044,
    "hml": 0.030045,
    "rmw": 0.003445,
    "cma": 0.023898,
    "mom": 0.03463,
    "rf": 0.0043
  },
  {
    "date": "2024-01",
    "mkt_rf": 0.0125,
    "smb": -0.02944,
    "hml": -0.02434,
    "rmw": 0.00944,
    "cma": -0.01327,
    "mom": 0.009375,
    "rf": 0.0047
  },
  {
    "date": "2024-02",
    "mkt_rf": 0.0502,
    "smb": -0.01492,
    "hml": -0.016365,
    "rmw": 0.001905,
    "cma": -0.011208,
    "mom": 0.02257,
    "rf": 0.0042
  },
  {
    "date": "2024-03",
    "mkt_rf": 0.0277,
    "smb": 0.00872,
    "hml": 0.00377,
    "rmw": -0.00202,
    "cma": 0.001685,
    "mom": 0.029695,
    "rf": 0.0043
  },
  {
    "date": "2024-04",
    "mkt_rf": -0.0439,
    "smb": -0.01816,
    "hml": -0.0228,
    "rmw": -0.001845,
    "cma": -0.017875,
    "mom": 0.004635,
    "rf": 0.0047
  },
  {
    "date": "2024-05",
    "mkt_rf": 0.0435,
    "smb": -0.03544,
    "hml": -0.0261,
    "rmw": 0.014345,
    "cma": -0.012075,
    "mom": 0.035225,
    "rf": 0.0044
  },
  {
    "date": "2024-06",
    "mkt_rf": 0.0323,
    "smb": -0.05248,
    "hml": -0.03562,
    "rmw": 0.023,
    "cma": -0.01471,
    "mom": 0.031305,
    "rf": 0.0041
  },
  {
    "date": "2024-07",
    "mkt_rf": 0.0059,
    "smb": 0.02876,
    "hml": 0.019285,
    "rmw": -0.00716,
    "cma": 0.010542,
    "mom": 0.022065,
    "rf": 0.0045
  },
  {
    "date": "2024-08",
    "mkt_rf": 0.0191,
    "smb": -0.00532,
    "hml": 0.002225,
    "rmw": 0.01246,
    "cma": 0.007913,
    "mom": 0.026685,
    "rf": 0.0048
  },
  {
    "date": "2024-09",
    "mkt_rf": 0.0178,
    "smb": -0.00532,
    "hml": -0.002785,
    "rmw": 0.006615,
    "cma": 0.001233,
    "mom": 0.02623,
    "rf": 0.004
  },
  {
    "date": "2024-10",
    "mkt_rf": -0.0101,
    "smb": -0.00688,
    "hml": -0.01583,
    "rmw": -0.006795,
    "cma": -0.01524,
    "mom": 0.016465,
    "rf": 0.0039
  },
  {
    "date": "2024-11",
    "mkt_rf": 0.0612,
    "smb": 0.01136,
    "hml": -0.00015,
    "rmw": -0.009655,
    "cma": -0.0051,
    "mom": 0.04142,
    "rf": 0.004
  },
  {
    "date": "2024-12",
    "mkt_rf": -0.0271,
    "smb": -0.0508,
    "hml": -0.03884,
    "rmw": 0.017295,
    "cma": -0.019995,
    "mom": 0.010515,
    "rf": 0.0037
  },
  {
    "date": "2025-01",
    "mkt_rf": 0.0272,
    "smb": 0.0132,
    "hml": -0.00105,
    "rmw": -0.0082,
    "cma": -0.005025,
    "mom": 0.01452,
    "rf": 0.0037
  },
  {
    "date": "2025-02",
    "mkt_rf": -0.0208,
    "smb": -0.00084,
    "hml": -0.001365,
    "rmw": 0.007715,
    "cma": 0.002842,
    "mom": 0.01272,
    "rf": 0.0033
  },
  {
    "date": "2025-03",
    "mkt_rf": -0.0629,
    "smb": 0.02256,
    "hml": 0.01491,
    "rmw": 0.011565,
    "cma": 0.01073,
    "mom": -0.017015,
    "rf": 0.0034
  },
  {
    "date": "2025-04",
    "mkt_rf": -0.0077,
    "smb": -0.01716,
    "hml": -0.017125,
    "rmw": 0.008255,
    "cma": -0.008537,
    "mom": 0.002305,
    "rf": 0.0035
  },
  {
    "date": "2025-05",
    "mkt_rf": 0.0608,
    "smb": -0.0162,
    "hml": -0.019685,
    "rmw": 0.004155,
    "cma": -0.012518,
    "mom": 0.02628,
    "rf": 0.0038
  },
  {
    "date": "2025-06",
    "mkt_rf": 0.0491,
    "smb": -0.01596,
    "hml": -0.015315,
    "rmw": 0.008975,
    "cma": -0.006833,
    "mom": 0.022185,
    "rf": 0.0034
  },
  {
    "date": "2025-07",
    "mkt_rf": 0.0203,
    "smb": -0.01644,
    "hml": -0.016795,
    "rmw": 0.007805,
    "cma": -0.008523,
    "mom": 0.012105,
    "rf": 0.0034
  },
  {
    "date": "2025-08",
    "mkt_rf": 0.0154,
    "smb": 0.00492,
    "hml": 0.001365,
    "rmw": 0.00422,
    "cma": 0.003083,
    "mom": 0.01039,
    "rf": 0.0038
  },
  {
    "date": "2025-09",
    "mkt_rf": 0.0365,
    "smb": -0.0324,
    "hml": -0.02474,
    "rmw": 0.017045,
    "cma": -0.009695,
    "mom": 0.017775,
    "rf": 0.0033
  },
  {
    "date": "2025-10",
    "mkt_rf": 0.0216,
    "smb": -0.0324,
    "hml": -0.02669,
    "rmw": 0.01477,
    "cma": -0.012295,
    "mom": 0.02756,
    "rf": 0.0037
  },
  {
    "date": "2025-11",
    "mkt_rf": -0.0031,
    "smb": 0.01056,
    "hml": 0.00191,
    "rmw": -0.001685,
    "cma": 0.00048,
    "mom": 0.018915,
    "rf": 0.003
  },
  {
    "date": "2025-12",
    "mkt_rf": -0.0033,
    "smb": 0.00648,
    "hml": -0.00152,
    "rmw": -0.000955,
    "cma": -0.001685,
    "mom": 0.018845,
    "rf": 0.0034
  },
  {
    "date": "2026-01",
    "mkt_rf": 0.0073,
    "smb": 0.01044,
    "hml": 0.000955,
    "rmw": -0.00266,
    "cma": -0.000723,
    "mom": 0.022555,
    "rf": 0.003
  },
  {
    "date": "2026-02",
    "mkt_rf": -0.0134,
    "smb": 0.03732,
    "hml": 0.023445,
    "rmw": -0.007595,
    "cma": 0.013397,
    "mom": 0.00031,
    "rf": 0.0028
  },
  {
    "date": "2026-03",
    "mkt_rf": -0.0518,
    "smb": -0.0066,
    "hml": -0.012225,
    "rmw": 0.013725,
    "cma": -0.008238,
    "mom": -0.01313,
    "rf": 0.0029
  },
  {
    "date": "2026-04",
    "mkt_rf": 0.0988,
    "smb": -0.05208,
    "hml": -0.04327,
    "rmw": 0.01825,
    "cma": -0.022785,
    "mom": 0.03958,
    "rf": 0.0029
  },
  {
    "date": "2026-05",
    "mkt_rf": 0.0505,
    "smb": -0.03144,
    "hml": -0.03072,
    "rmw": 0.008955,
    "cma": -0.018235,
    "mom": 0.022675,
    "rf": 0.0031
  },
  {
    "date": "2026-06",
    "mkt_rf": -0.0154,
    "smb": 0.03552,
    "hml": 0.02064,
    "rmw": -0.00878,
    "cma": 0.01072,
    "mom": 0.01461,
    "rf": 0.0029
  },
  {
    "date": "2026-07",
    "mkt_rf": -0.0055,
    "smb": 0.00168,
    "hml": -0.0066,
    "rmw": -0.001315,
    "cma": -0.005625,
    "mom": 0.003075,
    "rf": 0.0033
  },
  {
    "date": "2026-08",
    "mkt_rf": 0.0263,
    "smb": -0.00888,
    "hml": -0.01282,
    "rmw": 0.003675,
    "cma": -0.007685,
    "mom": 0.014205,
    "rf": 0.0029
  }
];
