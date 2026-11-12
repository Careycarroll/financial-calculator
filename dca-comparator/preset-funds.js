/**
 * Pre-bundled Historical Monthly Price Datasets
 * Zero-dependency, 100% client-side benchmark data for:
 * - VOO  (Vanguard S&P 500 ETF, 2010–Present)
 * - SPY  (SPDR S&P 500 ETF Trust, 1993–Present)
 * - QQQ  (Invesco QQQ Trust / Nasdaq-100, 1999–Present)
 * - SCHD (Schwab U.S. Dividend Equity ETF, 2011–Present)
 * - BND  (Vanguard Total Bond Market ETF, 2007–Present)
 *
 * Each fund series includes:
 * - date: YYYY-MM
 * - close: Raw market close price (price return only, no dividends reinvested)
 * - adjClose: Dividend-adjusted close price (total return with DRIP reinvestment)
 */

export const PRESET_BENCHMARKS = [
  {
    "id": "VOO",
    "ticker": "VOO",
    "name": "Vanguard S&P 500 ETF",
    "assetClass": "US Large Cap Blend",
    "inception": "2010-09",
    "color": "#3b82f6",
    "expenseRatio": "0.03%",
    "yield": "1.30%",
    "data": [
      {
        "date": "2010-09",
        "close": 70.11,
        "adjClose": 55.15
      },
      {
        "date": "2010-10",
        "close": 72.77,
        "adjClose": 57.31
      },
      {
        "date": "2010-11",
        "close": 72.73,
        "adjClose": 57.35
      },
      {
        "date": "2010-12",
        "close": 77.33,
        "adjClose": 61.06
      },
      {
        "date": "2011-01",
        "close": 78.97,
        "adjClose": 62.43
      },
      {
        "date": "2011-02",
        "close": 81.48,
        "adjClose": 64.49
      },
      {
        "date": "2011-03",
        "close": 81.48,
        "adjClose": 64.57
      },
      {
        "date": "2011-04",
        "close": 83.85,
        "adjClose": 66.54
      },
      {
        "date": "2011-05",
        "close": 82.8,
        "adjClose": 65.79
      },
      {
        "date": "2011-06",
        "close": 81.34,
        "adjClose": 64.71
      },
      {
        "date": "2011-07",
        "close": 79.58,
        "adjClose": 63.39
      },
      {
        "date": "2011-08",
        "close": 75.24,
        "adjClose": 60.0
      },
      {
        "date": "2011-09",
        "close": 70.01,
        "adjClose": 55.9
      },
      {
        "date": "2011-10",
        "close": 77.38,
        "adjClose": 61.87
      },
      {
        "date": "2011-11",
        "close": 77.13,
        "adjClose": 61.74
      },
      {
        "date": "2011-12",
        "close": 77.71,
        "adjClose": 62.29
      },
      {
        "date": "2012-01",
        "close": 81.27,
        "adjClose": 65.22
      },
      {
        "date": "2012-02",
        "close": 84.84,
        "adjClose": 68.17
      },
      {
        "date": "2012-03",
        "close": 87.5,
        "adjClose": 70.4
      },
      {
        "date": "2012-04",
        "close": 86.79,
        "adjClose": 69.92
      },
      {
        "date": "2012-05",
        "close": 81.51,
        "adjClose": 65.75
      },
      {
        "date": "2012-06",
        "close": 84.61,
        "adjClose": 68.33
      },
      {
        "date": "2012-07",
        "close": 85.47,
        "adjClose": 69.11
      },
      {
        "date": "2012-08",
        "close": 87.39,
        "adjClose": 70.75
      },
      {
        "date": "2012-09",
        "close": 89.63,
        "adjClose": 72.66
      },
      {
        "date": "2012-10",
        "close": 87.95,
        "adjClose": 71.38
      },
      {
        "date": "2012-11",
        "close": 88.38,
        "adjClose": 71.82
      },
      {
        "date": "2012-12",
        "close": 89.05,
        "adjClose": 72.46
      },
      {
        "date": "2013-01",
        "close": 93.68,
        "adjClose": 76.32
      },
      {
        "date": "2013-02",
        "close": 94.77,
        "adjClose": 77.31
      },
      {
        "date": "2013-03",
        "close": 98.35,
        "adjClose": 80.33
      },
      {
        "date": "2013-04",
        "close": 100.05,
        "adjClose": 81.82
      },
      {
        "date": "2013-05",
        "close": 102.37,
        "adjClose": 83.82
      },
      {
        "date": "2013-06",
        "close": 100.84,
        "adjClose": 82.68
      },
      {
        "date": "2013-07",
        "close": 106.12,
        "adjClose": 87.11
      },
      {
        "date": "2013-08",
        "close": 103.11,
        "adjClose": 84.75
      },
      {
        "date": "2013-09",
        "close": 106.42,
        "adjClose": 87.58
      },
      {
        "date": "2013-10",
        "close": 110.99,
        "adjClose": 91.46
      },
      {
        "date": "2013-11",
        "close": 114.25,
        "adjClose": 94.26
      },
      {
        "date": "2013-12",
        "close": 117.15,
        "adjClose": 96.77
      },
      {
        "date": "2014-01",
        "close": 112.91,
        "adjClose": 93.39
      },
      {
        "date": "2014-02",
        "close": 117.97,
        "adjClose": 97.69
      },
      {
        "date": "2014-03",
        "close": 118.71,
        "adjClose": 98.43
      },
      {
        "date": "2014-04",
        "close": 119.2,
        "adjClose": 98.97
      },
      {
        "date": "2014-05",
        "close": 121.77,
        "adjClose": 101.23
      },
      {
        "date": "2014-06",
        "close": 124.05,
        "adjClose": 103.25
      },
      {
        "date": "2014-07",
        "close": 122.23,
        "adjClose": 101.86
      },
      {
        "date": "2014-08",
        "close": 127.05,
        "adjClose": 106.01
      },
      {
        "date": "2014-09",
        "close": 125.15,
        "adjClose": 104.56
      },
      {
        "date": "2014-10",
        "close": 127.84,
        "adjClose": 106.94
      },
      {
        "date": "2014-11",
        "close": 131.38,
        "adjClose": 110.04
      },
      {
        "date": "2014-12",
        "close": 130.76,
        "adjClose": 109.66
      },
      {
        "date": "2015-01",
        "close": 126.59,
        "adjClose": 106.3
      },
      {
        "date": "2015-02",
        "close": 134.03,
        "adjClose": 112.68
      },
      {
        "date": "2015-03",
        "close": 131.75,
        "adjClose": 110.91
      },
      {
        "date": "2015-04",
        "close": 132.91,
        "adjClose": 112.02
      },
      {
        "date": "2015-05",
        "close": 134.35,
        "adjClose": 113.38
      },
      {
        "date": "2015-06",
        "close": 131.73,
        "adjClose": 111.31
      },
      {
        "date": "2015-07",
        "close": 134.32,
        "adjClose": 113.64
      },
      {
        "date": "2015-08",
        "close": 126.09,
        "adjClose": 106.81
      },
      {
        "date": "2015-09",
        "close": 122.67,
        "adjClose": 104.05
      },
      {
        "date": "2015-10",
        "close": 132.52,
        "adjClose": 112.54
      },
      {
        "date": "2015-11",
        "close": 132.77,
        "adjClose": 112.9
      },
      {
        "date": "2015-12",
        "close": 130.25,
        "adjClose": 110.89
      },
      {
        "date": "2016-01",
        "close": 123.1,
        "adjClose": 104.93
      },
      {
        "date": "2016-02",
        "close": 122.74,
        "adjClose": 104.76
      },
      {
        "date": "2016-03",
        "close": 130.91,
        "adjClose": 111.88
      },
      {
        "date": "2016-04",
        "close": 131.66,
        "adjClose": 112.66
      },
      {
        "date": "2016-05",
        "close": 133.8,
        "adjClose": 114.63
      },
      {
        "date": "2016-06",
        "close": 133.63,
        "adjClose": 114.63
      },
      {
        "date": "2016-07",
        "close": 138.43,
        "adjClose": 118.9
      },
      {
        "date": "2016-08",
        "close": 138.73,
        "adjClose": 119.31
      },
      {
        "date": "2016-09",
        "close": 138.77,
        "adjClose": 119.49
      },
      {
        "date": "2016-10",
        "close": 136.46,
        "adjClose": 117.65
      },
      {
        "date": "2016-11",
        "close": 141.72,
        "adjClose": 122.33
      },
      {
        "date": "2016-12",
        "close": 144.18,
        "adjClose": 124.62
      },
      {
        "date": "2017-01",
        "close": 146.98,
        "adjClose": 127.2
      },
      {
        "date": "2017-02",
        "close": 152.55,
        "adjClose": 132.18
      },
      {
        "date": "2017-03",
        "close": 152.64,
        "adjClose": 132.43
      },
      {
        "date": "2017-04",
        "close": 154.27,
        "adjClose": 134.01
      },
      {
        "date": "2017-05",
        "close": 156.44,
        "adjClose": 136.06
      },
      {
        "date": "2017-06",
        "close": 157.06,
        "adjClose": 136.78
      },
      {
        "date": "2017-07",
        "close": 160.2,
        "adjClose": 139.69
      },
      {
        "date": "2017-08",
        "close": 160.79,
        "adjClose": 140.38
      },
      {
        "date": "2017-09",
        "close": 163.95,
        "adjClose": 143.32
      },
      {
        "date": "2017-10",
        "close": 167.83,
        "adjClose": 146.89
      },
      {
        "date": "2017-11",
        "close": 173.08,
        "adjClose": 151.68
      },
      {
        "date": "2017-12",
        "close": 175.01,
        "adjClose": 153.56
      },
      {
        "date": "2018-01",
        "close": 185.39,
        "adjClose": 162.88
      },
      {
        "date": "2018-02",
        "close": 178.71,
        "adjClose": 157.2
      },
      {
        "date": "2018-03",
        "close": 173.74,
        "adjClose": 153.03
      },
      {
        "date": "2018-04",
        "close": 174.28,
        "adjClose": 153.69
      },
      {
        "date": "2018-05",
        "close": 178.07,
        "adjClose": 157.24
      },
      {
        "date": "2018-06",
        "close": 178.98,
        "adjClose": 158.23
      },
      {
        "date": "2018-07",
        "close": 185.27,
        "adjClose": 164.0
      },
      {
        "date": "2018-08",
        "close": 191.58,
        "adjClose": 169.8
      },
      {
        "date": "2018-09",
        "close": 192.4,
        "adjClose": 170.74
      },
      {
        "date": "2018-10",
        "close": 178.91,
        "adjClose": 158.97
      },
      {
        "date": "2018-11",
        "close": 182.02,
        "adjClose": 161.93
      },
      {
        "date": "2018-12",
        "close": 165.53,
        "adjClose": 147.45
      },
      {
        "date": "2019-01",
        "close": 178.68,
        "adjClose": 159.37
      },
      {
        "date": "2019-02",
        "close": 184.39,
        "adjClose": 164.67
      },
      {
        "date": "2019-03",
        "close": 187.39,
        "adjClose": 167.56
      },
      {
        "date": "2019-04",
        "close": 195.14,
        "adjClose": 174.71
      },
      {
        "date": "2019-05",
        "close": 182.02,
        "adjClose": 163.17
      },
      {
        "date": "2019-06",
        "close": 194.73,
        "adjClose": 174.78
      },
      {
        "date": "2019-07",
        "close": 197.45,
        "adjClose": 177.44
      },
      {
        "date": "2019-08",
        "close": 193.35,
        "adjClose": 173.97
      },
      {
        "date": "2019-09",
        "close": 196.24,
        "adjClose": 176.8
      },
      {
        "date": "2019-10",
        "close": 200.59,
        "adjClose": 180.94
      },
      {
        "date": "2019-11",
        "close": 208.2,
        "adjClose": 188.05
      },
      {
        "date": "2019-12",
        "close": 213.94,
        "adjClose": 193.47
      },
      {
        "date": "2020-01",
        "close": 214.56,
        "adjClose": 194.27
      },
      {
        "date": "2020-02",
        "close": 197.13,
        "adjClose": 178.72
      },
      {
        "date": "2020-03",
        "close": 173.09,
        "adjClose": 157.12
      },
      {
        "date": "2020-04",
        "close": 195.84,
        "adjClose": 178.0
      },
      {
        "date": "2020-05",
        "close": 205.72,
        "adjClose": 187.21
      },
      {
        "date": "2020-06",
        "close": 210.17,
        "adjClose": 191.51
      },
      {
        "date": "2020-07",
        "close": 222.83,
        "adjClose": 203.29
      },
      {
        "date": "2020-08",
        "close": 240.12,
        "adjClose": 219.34
      },
      {
        "date": "2020-09",
        "close": 230.96,
        "adjClose": 211.24
      },
      {
        "date": "2020-10",
        "close": 224.68,
        "adjClose": 205.76
      },
      {
        "date": "2020-11",
        "close": 250.53,
        "adjClose": 229.72
      },
      {
        "date": "2020-12",
        "close": 260.71,
        "adjClose": 239.35
      },
      {
        "date": "2021-01",
        "close": 258.32,
        "adjClose": 237.45
      },
      {
        "date": "2021-02",
        "close": 264.09,
        "adjClose": 243.07
      },
      {
        "date": "2021-03",
        "close": 273.3,
        "adjClose": 251.85
      },
      {
        "date": "2021-04",
        "close": 287.87,
        "adjClose": 265.62
      },
      {
        "date": "2021-05",
        "close": 288.53,
        "adjClose": 266.56
      },
      {
        "date": "2021-06",
        "close": 296.08,
        "adjClose": 273.88
      },
      {
        "date": "2021-07",
        "close": 301.61,
        "adjClose": 279.34
      },
      {
        "date": "2021-08",
        "close": 310.37,
        "adjClose": 287.82
      },
      {
        "date": "2021-09",
        "close": 295.77,
        "adjClose": 274.62
      },
      {
        "date": "2021-10",
        "close": 316.09,
        "adjClose": 293.86
      },
      {
        "date": "2021-11",
        "close": 312.39,
        "adjClose": 290.79
      },
      {
        "date": "2021-12",
        "close": 323.0,
        "adjClose": 301.04
      },
      {
        "date": "2022-01",
        "close": 304.38,
        "adjClose": 284.05
      },
      {
        "date": "2022-02",
        "close": 295.71,
        "adjClose": 276.31
      },
      {
        "date": "2022-03",
        "close": 305.43,
        "adjClose": 285.74
      },
      {
        "date": "2022-04",
        "close": 276.54,
        "adjClose": 259.04
      },
      {
        "date": "2022-05",
        "close": 275.32,
        "adjClose": 258.22
      },
      {
        "date": "2022-06",
        "close": 252.6,
        "adjClose": 237.22
      },
      {
        "date": "2022-07",
        "close": 276.39,
        "adjClose": 259.88
      },
      {
        "date": "2022-08",
        "close": 265.68,
        "adjClose": 250.12
      },
      {
        "date": "2022-09",
        "close": 241.32,
        "adjClose": 227.48
      },
      {
        "date": "2022-10",
        "close": 260.09,
        "adjClose": 245.48
      },
      {
        "date": "2022-11",
        "close": 273.36,
        "adjClose": 258.33
      },
      {
        "date": "2022-12",
        "close": 256.46,
        "adjClose": 242.66
      },
      {
        "date": "2023-01",
        "close": 272.75,
        "adjClose": 258.4
      },
      {
        "date": "2023-02",
        "close": 266.18,
        "adjClose": 252.5
      },
      {
        "date": "2023-03",
        "close": 275.75,
        "adjClose": 261.9
      },
      {
        "date": "2023-04",
        "close": 279.03,
        "adjClose": 265.35
      },
      {
        "date": "2023-05",
        "close": 281.11,
        "adjClose": 267.67
      },
      {
        "date": "2023-06",
        "close": 299.56,
        "adjClose": 285.59
      },
      {
        "date": "2023-07",
        "close": 309.4,
        "adjClose": 295.34
      },
      {
        "date": "2023-08",
        "close": 304.14,
        "adjClose": 290.69
      },
      {
        "date": "2023-09",
        "close": 289.62,
        "adjClose": 277.16
      },
      {
        "date": "2023-10",
        "close": 282.65,
        "adjClose": 270.82
      },
      {
        "date": "2023-11",
        "close": 308.56,
        "adjClose": 296.02
      },
      {
        "date": "2023-12",
        "close": 322.39,
        "adjClose": 309.69
      },
      {
        "date": "2024-01",
        "close": 327.54,
        "adjClose": 315.03
      },
      {
        "date": "2024-02",
        "close": 344.95,
        "adjClose": 332.18
      },
      {
        "date": "2024-03",
        "close": 355.55,
        "adjClose": 342.83
      },
      {
        "date": "2024-04",
        "close": 341.2,
        "adjClose": 329.41
      },
      {
        "date": "2024-05",
        "close": 357.12,
        "adjClose": 345.2
      },
      {
        "date": "2024-06",
        "close": 369.67,
        "adjClose": 357.78
      },
      {
        "date": "2024-07",
        "close": 373.06,
        "adjClose": 361.52
      },
      {
        "date": "2024-08",
        "close": 381.52,
        "adjClose": 370.18
      },
      {
        "date": "2024-09",
        "close": 389.36,
        "adjClose": 378.27
      },
      {
        "date": "2024-10",
        "close": 386.48,
        "adjClose": 375.94
      },
      {
        "date": "2024-11",
        "close": 411.18,
        "adjClose": 400.47
      },
      {
        "date": "2024-12",
        "close": 401.08,
        "adjClose": 391.12
      },
      {
        "date": "2025-01",
        "close": 412.97,
        "adjClose": 403.23
      },
      {
        "date": "2025-02",
        "close": 405.26,
        "adjClose": 396.19
      },
      {
        "date": "2025-03",
        "close": 380.68,
        "adjClose": 372.64
      },
      {
        "date": "2025-04",
        "close": 378.63,
        "adjClose": 371.09
      },
      {
        "date": "2025-05",
        "close": 402.6,
        "adjClose": 395.08
      },
      {
        "date": "2025-06",
        "close": 423.23,
        "adjClose": 415.84
      },
      {
        "date": "2025-07",
        "close": 432.73,
        "adjClose": 425.72
      },
      {
        "date": "2025-08",
        "close": 440.51,
        "adjClose": 433.91
      },
      {
        "date": "2025-09",
        "close": 457.49,
        "adjClose": 451.21
      },
      {
        "date": "2025-10",
        "close": 468.5,
        "adjClose": 462.64
      },
      {
        "date": "2025-11",
        "close": 467.88,
        "adjClose": 462.62
      },
      {
        "date": "2025-12",
        "close": 467.37,
        "adjClose": 462.69
      },
      {
        "date": "2026-01",
        "close": 471.61,
        "adjClose": 467.48
      },
      {
        "date": "2026-02",
        "close": 466.05,
        "adjClose": 462.55
      },
      {
        "date": "2026-03",
        "close": 442.72,
        "adjClose": 439.95
      },
      {
        "date": "2026-04",
        "close": 487.16,
        "adjClose": 484.72
      },
      {
        "date": "2026-05",
        "close": 512.65,
        "adjClose": 510.72
      },
      {
        "date": "2026-06",
        "close": 505.63,
        "adjClose": 504.36
      },
      {
        "date": "2026-07",
        "close": 503.91,
        "adjClose": 503.28
      },
      {
        "date": "2026-08",
        "close": 518.0,
        "adjClose": 518.0
      }
    ]
  },
  {
    "id": "SPY",
    "ticker": "SPY",
    "name": "SPDR S&P 500 ETF Trust",
    "assetClass": "US Large Cap Blend",
    "inception": "1993-01",
    "color": "#06b6d4",
    "expenseRatio": "0.09%",
    "yield": "1.25%",
    "data": [
      {
        "date": "1993-01",
        "close": 29.29,
        "adjClose": 16.35
      },
      {
        "date": "1993-02",
        "close": 29.52,
        "adjClose": 16.51
      },
      {
        "date": "1993-03",
        "close": 30.11,
        "adjClose": 16.88
      },
      {
        "date": "1993-04",
        "close": 29.21,
        "adjClose": 16.41
      },
      {
        "date": "1993-05",
        "close": 29.96,
        "adjClose": 16.86
      },
      {
        "date": "1993-06",
        "close": 30.02,
        "adjClose": 16.93
      },
      {
        "date": "1993-07",
        "close": 29.86,
        "adjClose": 16.87
      },
      {
        "date": "1993-08",
        "close": 30.95,
        "adjClose": 17.52
      },
      {
        "date": "1993-09",
        "close": 30.75,
        "adjClose": 17.45
      },
      {
        "date": "1993-10",
        "close": 31.18,
        "adjClose": 17.72
      },
      {
        "date": "1993-11",
        "close": 30.77,
        "adjClose": 17.53
      },
      {
        "date": "1993-12",
        "close": 31.13,
        "adjClose": 17.77
      },
      {
        "date": "1994-01",
        "close": 32.03,
        "adjClose": 18.32
      },
      {
        "date": "1994-02",
        "close": 31.06,
        "adjClose": 17.8
      },
      {
        "date": "1994-03",
        "close": 29.68,
        "adjClose": 17.04
      },
      {
        "date": "1994-04",
        "close": 29.97,
        "adjClose": 17.24
      },
      {
        "date": "1994-05",
        "close": 30.39,
        "adjClose": 17.52
      },
      {
        "date": "1994-06",
        "close": 29.54,
        "adjClose": 17.06
      },
      {
        "date": "1994-07",
        "close": 30.44,
        "adjClose": 17.62
      },
      {
        "date": "1994-08",
        "close": 31.63,
        "adjClose": 18.34
      },
      {
        "date": "1994-09",
        "close": 30.81,
        "adjClose": 17.9
      },
      {
        "date": "1994-10",
        "close": 31.41,
        "adjClose": 18.29
      },
      {
        "date": "1994-11",
        "close": 30.3,
        "adjClose": 17.68
      },
      {
        "date": "1994-12",
        "close": 30.62,
        "adjClose": 17.9
      },
      {
        "date": "1995-01",
        "close": 31.42,
        "adjClose": 18.4
      },
      {
        "date": "1995-02",
        "close": 32.58,
        "adjClose": 19.12
      },
      {
        "date": "1995-03",
        "close": 33.4,
        "adjClose": 19.64
      },
      {
        "date": "1995-04",
        "close": 34.24,
        "adjClose": 20.18
      },
      {
        "date": "1995-05",
        "close": 35.53,
        "adjClose": 20.98
      },
      {
        "date": "1995-06",
        "close": 36.33,
        "adjClose": 21.49
      },
      {
        "date": "1995-07",
        "close": 37.56,
        "adjClose": 22.26
      },
      {
        "date": "1995-08",
        "close": 37.77,
        "adjClose": 22.43
      },
      {
        "date": "1995-09",
        "close": 39.32,
        "adjClose": 23.4
      },
      {
        "date": "1995-10",
        "close": 39.08,
        "adjClose": 23.31
      },
      {
        "date": "1995-11",
        "close": 40.73,
        "adjClose": 24.34
      },
      {
        "date": "1995-12",
        "close": 41.25,
        "adjClose": 24.7
      },
      {
        "date": "1996-01",
        "close": 42.57,
        "adjClose": 25.54
      },
      {
        "date": "1996-02",
        "close": 43.06,
        "adjClose": 25.88
      },
      {
        "date": "1996-03",
        "close": 43.32,
        "adjClose": 26.09
      },
      {
        "date": "1996-04",
        "close": 43.89,
        "adjClose": 26.49
      },
      {
        "date": "1996-05",
        "close": 44.87,
        "adjClose": 27.13
      },
      {
        "date": "1996-06",
        "close": 44.91,
        "adjClose": 27.21
      },
      {
        "date": "1996-07",
        "close": 42.71,
        "adjClose": 25.93
      },
      {
        "date": "1996-08",
        "close": 43.68,
        "adjClose": 26.57
      },
      {
        "date": "1996-09",
        "close": 46.1,
        "adjClose": 28.1
      },
      {
        "date": "1996-10",
        "close": 46.96,
        "adjClose": 28.68
      },
      {
        "date": "1996-11",
        "close": 50.37,
        "adjClose": 30.83
      },
      {
        "date": "1996-12",
        "close": 49.36,
        "adjClose": 30.27
      },
      {
        "date": "1997-01",
        "close": 52.26,
        "adjClose": 32.11
      },
      {
        "date": "1997-02",
        "close": 52.42,
        "adjClose": 32.27
      },
      {
        "date": "1997-03",
        "close": 49.99,
        "adjClose": 30.84
      },
      {
        "date": "1997-04",
        "close": 52.69,
        "adjClose": 32.57
      },
      {
        "date": "1997-05",
        "close": 55.9,
        "adjClose": 34.63
      },
      {
        "date": "1997-06",
        "close": 58.18,
        "adjClose": 36.11
      },
      {
        "date": "1997-07",
        "close": 62.83,
        "adjClose": 39.07
      },
      {
        "date": "1997-08",
        "close": 59.55,
        "adjClose": 37.11
      },
      {
        "date": "1997-09",
        "close": 62.62,
        "adjClose": 39.1
      },
      {
        "date": "1997-10",
        "close": 60.52,
        "adjClose": 37.86
      },
      {
        "date": "1997-11",
        "close": 63.07,
        "adjClose": 39.54
      },
      {
        "date": "1997-12",
        "close": 64.21,
        "adjClose": 40.33
      },
      {
        "date": "1998-01",
        "close": 64.7,
        "adjClose": 40.72
      },
      {
        "date": "1998-02",
        "close": 69.31,
        "adjClose": 43.71
      },
      {
        "date": "1998-03",
        "close": 72.76,
        "adjClose": 45.98
      },
      {
        "date": "1998-04",
        "close": 73.54,
        "adjClose": 46.57
      },
      {
        "date": "1998-05",
        "close": 72.01,
        "adjClose": 45.69
      },
      {
        "date": "1998-06",
        "close": 74.94,
        "adjClose": 47.64
      },
      {
        "date": "1998-07",
        "close": 73.98,
        "adjClose": 47.13
      },
      {
        "date": "1998-08",
        "close": 62.93,
        "adjClose": 40.17
      },
      {
        "date": "1998-09",
        "close": 67.02,
        "adjClose": 42.86
      },
      {
        "date": "1998-10",
        "close": 72.1,
        "adjClose": 46.2
      },
      {
        "date": "1998-11",
        "close": 76.53,
        "adjClose": 49.14
      },
      {
        "date": "1998-12",
        "close": 81.41,
        "adjClose": 52.38
      },
      {
        "date": "1999-01",
        "close": 84.48,
        "adjClose": 54.46
      },
      {
        "date": "1999-02",
        "close": 81.56,
        "adjClose": 52.69
      },
      {
        "date": "1999-03",
        "close": 84.73,
        "adjClose": 54.84
      },
      {
        "date": "1999-04",
        "close": 87.82,
        "adjClose": 56.95
      },
      {
        "date": "1999-05",
        "close": 85.63,
        "adjClose": 55.64
      },
      {
        "date": "1999-06",
        "close": 89.77,
        "adjClose": 58.45
      },
      {
        "date": "1999-07",
        "close": 86.54,
        "adjClose": 56.46
      },
      {
        "date": "1999-08",
        "close": 85.84,
        "adjClose": 56.11
      },
      {
        "date": "1999-09",
        "close": 83.32,
        "adjClose": 54.58
      },
      {
        "date": "1999-10",
        "close": 88.95,
        "adjClose": 58.38
      },
      {
        "date": "1999-11",
        "close": 91.16,
        "adjClose": 59.95
      },
      {
        "date": "1999-12",
        "close": 97.2,
        "adjClose": 64.05
      },
      {
        "date": "2000-01",
        "close": 92.62,
        "adjClose": 61.12
      },
      {
        "date": "2000-02",
        "close": 92.24,
        "adjClose": 60.97
      },
      {
        "date": "2000-03",
        "close": 100.67,
        "adjClose": 66.64
      },
      {
        "date": "2000-04",
        "close": 96.6,
        "adjClose": 64.04
      },
      {
        "date": "2000-05",
        "close": 93.76,
        "adjClose": 62.25
      },
      {
        "date": "2000-06",
        "close": 96.55,
        "adjClose": 64.2
      },
      {
        "date": "2000-07",
        "close": 94.6,
        "adjClose": 63.0
      },
      {
        "date": "2000-08",
        "close": 101.63,
        "adjClose": 67.78
      },
      {
        "date": "2000-09",
        "close": 96.51,
        "adjClose": 64.46
      },
      {
        "date": "2000-10",
        "close": 94.67,
        "adjClose": 63.33
      },
      {
        "date": "2000-11",
        "close": 85.25,
        "adjClose": 57.11
      },
      {
        "date": "2000-12",
        "close": 85.93,
        "adjClose": 57.65
      },
      {
        "date": "2001-01",
        "close": 88.75,
        "adjClose": 59.64
      },
      {
        "date": "2001-02",
        "close": 80.07,
        "adjClose": 53.88
      },
      {
        "date": "2001-03",
        "close": 74.44,
        "adjClose": 50.17
      },
      {
        "date": "2001-04",
        "close": 80.33,
        "adjClose": 54.22
      },
      {
        "date": "2001-05",
        "close": 80.73,
        "adjClose": 54.57
      },
      {
        "date": "2001-06",
        "close": 78.9,
        "adjClose": 53.41
      },
      {
        "date": "2001-07",
        "close": 77.62,
        "adjClose": 52.63
      },
      {
        "date": "2001-08",
        "close": 72.58,
        "adjClose": 49.29
      },
      {
        "date": "2001-09",
        "close": 66.52,
        "adjClose": 45.24
      },
      {
        "date": "2001-10",
        "close": 67.85,
        "adjClose": 46.21
      },
      {
        "date": "2001-11",
        "close": 73.01,
        "adjClose": 49.8
      },
      {
        "date": "2001-12",
        "close": 73.63,
        "adjClose": 50.3
      },
      {
        "date": "2002-01",
        "close": 72.63,
        "adjClose": 49.69
      },
      {
        "date": "2002-02",
        "close": 71.03,
        "adjClose": 48.66
      },
      {
        "date": "2002-03",
        "close": 73.68,
        "adjClose": 50.56
      },
      {
        "date": "2002-04",
        "close": 69.18,
        "adjClose": 47.54
      },
      {
        "date": "2002-05",
        "close": 68.46,
        "adjClose": 47.12
      },
      {
        "date": "2002-06",
        "close": 63.32,
        "adjClose": 43.65
      },
      {
        "date": "2002-07",
        "close": 58.66,
        "adjClose": 40.49
      },
      {
        "date": "2002-08",
        "close": 58.96,
        "adjClose": 40.76
      },
      {
        "date": "2002-09",
        "close": 52.66,
        "adjClose": 36.46
      },
      {
        "date": "2002-10",
        "close": 57.15,
        "adjClose": 39.63
      },
      {
        "date": "2002-11",
        "close": 60.21,
        "adjClose": 41.82
      },
      {
        "date": "2002-12",
        "close": 56.66,
        "adjClose": 39.41
      },
      {
        "date": "2003-01",
        "close": 55.03,
        "adjClose": 38.33
      },
      {
        "date": "2003-02",
        "close": 53.97,
        "adjClose": 37.65
      },
      {
        "date": "2003-03",
        "close": 54.52,
        "adjClose": 38.09
      },
      {
        "date": "2003-04",
        "close": 58.81,
        "adjClose": 41.15
      },
      {
        "date": "2003-05",
        "close": 61.93,
        "adjClose": 43.4
      },
      {
        "date": "2003-06",
        "close": 62.63,
        "adjClose": 43.95
      },
      {
        "date": "2003-07",
        "close": 63.69,
        "adjClose": 44.76
      },
      {
        "date": "2003-08",
        "close": 64.79,
        "adjClose": 45.61
      },
      {
        "date": "2003-09",
        "close": 63.96,
        "adjClose": 45.09
      },
      {
        "date": "2003-10",
        "close": 67.49,
        "adjClose": 47.65
      },
      {
        "date": "2003-11",
        "close": 68.06,
        "adjClose": 48.12
      },
      {
        "date": "2003-12",
        "close": 71.23,
        "adjClose": 50.44
      },
      {
        "date": "2004-01",
        "close": 72.4,
        "adjClose": 51.35
      },
      {
        "date": "2004-02",
        "close": 73.34,
        "adjClose": 52.09
      },
      {
        "date": "2004-03",
        "close": 72.1,
        "adjClose": 51.29
      },
      {
        "date": "2004-04",
        "close": 71.07,
        "adjClose": 50.63
      },
      {
        "date": "2004-05",
        "close": 71.8,
        "adjClose": 51.23
      },
      {
        "date": "2004-06",
        "close": 72.83,
        "adjClose": 52.04
      },
      {
        "date": "2004-07",
        "close": 70.19,
        "adjClose": 50.23
      },
      {
        "date": "2004-08",
        "close": 70.33,
        "adjClose": 50.41
      },
      {
        "date": "2004-09",
        "close": 71.05,
        "adjClose": 51.0
      },
      {
        "date": "2004-10",
        "close": 71.93,
        "adjClose": 51.71
      },
      {
        "date": "2004-11",
        "close": 74.74,
        "adjClose": 53.81
      },
      {
        "date": "2004-12",
        "close": 77.2,
        "adjClose": 55.66
      },
      {
        "date": "2005-01",
        "close": 75.2,
        "adjClose": 54.3
      },
      {
        "date": "2005-02",
        "close": 76.65,
        "adjClose": 55.43
      },
      {
        "date": "2005-03",
        "close": 75.32,
        "adjClose": 54.55
      },
      {
        "date": "2005-04",
        "close": 73.86,
        "adjClose": 53.58
      },
      {
        "date": "2005-05",
        "close": 76.24,
        "adjClose": 55.38
      },
      {
        "date": "2005-06",
        "close": 76.24,
        "adjClose": 55.46
      },
      {
        "date": "2005-07",
        "close": 78.96,
        "adjClose": 57.53
      },
      {
        "date": "2005-08",
        "close": 78.18,
        "adjClose": 57.04
      },
      {
        "date": "2005-09",
        "close": 78.68,
        "adjClose": 57.49
      },
      {
        "date": "2005-10",
        "close": 77.44,
        "adjClose": 56.68
      },
      {
        "date": "2005-11",
        "close": 80.23,
        "adjClose": 58.8
      },
      {
        "date": "2005-12",
        "close": 80.1,
        "adjClose": 58.8
      },
      {
        "date": "2006-01",
        "close": 81.92,
        "adjClose": 60.23
      },
      {
        "date": "2006-02",
        "close": 81.93,
        "adjClose": 60.32
      },
      {
        "date": "2006-03",
        "close": 82.89,
        "adjClose": 61.12
      },
      {
        "date": "2006-04",
        "close": 83.71,
        "adjClose": 61.82
      },
      {
        "date": "2006-05",
        "close": 81.43,
        "adjClose": 60.23
      },
      {
        "date": "2006-06",
        "close": 81.45,
        "adjClose": 60.33
      },
      {
        "date": "2006-07",
        "close": 81.65,
        "adjClose": 60.57
      },
      {
        "date": "2006-08",
        "close": 83.54,
        "adjClose": 62.06
      },
      {
        "date": "2006-09",
        "close": 85.48,
        "adjClose": 63.6
      },
      {
        "date": "2006-10",
        "close": 88.2,
        "adjClose": 65.72
      },
      {
        "date": "2006-11",
        "close": 89.72,
        "adjClose": 66.96
      },
      {
        "date": "2006-12",
        "close": 90.83,
        "adjClose": 67.88
      },
      {
        "date": "2007-01",
        "close": 92.23,
        "adjClose": 69.04
      },
      {
        "date": "2007-02",
        "close": 90.3,
        "adjClose": 67.69
      },
      {
        "date": "2007-03",
        "close": 91.14,
        "adjClose": 68.42
      },
      {
        "date": "2007-04",
        "close": 94.92,
        "adjClose": 71.37
      },
      {
        "date": "2007-05",
        "close": 98.06,
        "adjClose": 73.84
      },
      {
        "date": "2007-06",
        "close": 96.23,
        "adjClose": 72.57
      },
      {
        "date": "2007-07",
        "close": 93.38,
        "adjClose": 70.52
      },
      {
        "date": "2007-08",
        "close": 94.72,
        "adjClose": 71.65
      },
      {
        "date": "2007-09",
        "close": 98.2,
        "adjClose": 74.39
      },
      {
        "date": "2007-10",
        "close": 100.04,
        "adjClose": 75.9
      },
      {
        "date": "2007-11",
        "close": 95.91,
        "adjClose": 72.87
      },
      {
        "date": "2007-12",
        "close": 95.23,
        "adjClose": 72.46
      },
      {
        "date": "2008-01",
        "close": 89.42,
        "adjClose": 68.15
      },
      {
        "date": "2008-02",
        "close": 86.57,
        "adjClose": 66.07
      },
      {
        "date": "2008-03",
        "close": 85.92,
        "adjClose": 65.68
      },
      {
        "date": "2008-04",
        "close": 89.66,
        "adjClose": 68.64
      },
      {
        "date": "2008-05",
        "close": 90.86,
        "adjClose": 69.66
      },
      {
        "date": "2008-06",
        "close": 83.07,
        "adjClose": 63.78
      },
      {
        "date": "2008-07",
        "close": 82.11,
        "adjClose": 63.14
      },
      {
        "date": "2008-08",
        "close": 83.07,
        "adjClose": 63.98
      },
      {
        "date": "2008-09",
        "close": 75.45,
        "adjClose": 58.19
      },
      {
        "date": "2008-10",
        "close": 63.05,
        "adjClose": 48.7
      },
      {
        "date": "2008-11",
        "close": 58.56,
        "adjClose": 45.3
      },
      {
        "date": "2008-12",
        "close": 59.24,
        "adjClose": 45.9
      },
      {
        "date": "2009-01",
        "close": 54.54,
        "adjClose": 42.32
      },
      {
        "date": "2009-02",
        "close": 49.07,
        "adjClose": 38.14
      },
      {
        "date": "2009-03",
        "close": 53.27,
        "adjClose": 41.46
      },
      {
        "date": "2009-04",
        "close": 57.97,
        "adjClose": 45.18
      },
      {
        "date": "2009-05",
        "close": 61.02,
        "adjClose": 47.63
      },
      {
        "date": "2009-06",
        "close": 61.08,
        "adjClose": 47.75
      },
      {
        "date": "2009-07",
        "close": 65.51,
        "adjClose": 51.29
      },
      {
        "date": "2009-08",
        "close": 67.51,
        "adjClose": 52.94
      },
      {
        "date": "2009-09",
        "close": 69.86,
        "adjClose": 54.86
      },
      {
        "date": "2009-10",
        "close": 68.61,
        "adjClose": 53.96
      },
      {
        "date": "2009-11",
        "close": 72.57,
        "adjClose": 57.16
      },
      {
        "date": "2009-12",
        "close": 73.93,
        "adjClose": 58.32
      },
      {
        "date": "2010-01",
        "close": 71.29,
        "adjClose": 56.32
      },
      {
        "date": "2010-02",
        "close": 73.43,
        "adjClose": 58.1
      },
      {
        "date": "2010-03",
        "close": 77.63,
        "adjClose": 61.51
      },
      {
        "date": "2010-04",
        "close": 78.47,
        "adjClose": 62.27
      },
      {
        "date": "2010-05",
        "close": 72.19,
        "adjClose": 57.38
      },
      {
        "date": "2010-06",
        "close": 68.4,
        "adjClose": 54.44
      },
      {
        "date": "2010-07",
        "close": 73.06,
        "adjClose": 58.24
      },
      {
        "date": "2010-08",
        "close": 69.74,
        "adjClose": 55.68
      },
      {
        "date": "2010-09",
        "close": 75.94,
        "adjClose": 60.72
      },
      {
        "date": "2010-10",
        "close": 78.79,
        "adjClose": 63.09
      },
      {
        "date": "2010-11",
        "close": 78.73,
        "adjClose": 63.14
      },
      {
        "date": "2010-12",
        "close": 83.69,
        "adjClose": 67.22
      },
      {
        "date": "2011-01",
        "close": 85.47,
        "adjClose": 68.72
      },
      {
        "date": "2011-02",
        "close": 88.18,
        "adjClose": 70.99
      },
      {
        "date": "2011-03",
        "close": 88.19,
        "adjClose": 71.08
      },
      {
        "date": "2011-04",
        "close": 90.76,
        "adjClose": 73.24
      },
      {
        "date": "2011-05",
        "close": 89.63,
        "adjClose": 72.41
      },
      {
        "date": "2011-06",
        "close": 88.05,
        "adjClose": 71.22
      },
      {
        "date": "2011-07",
        "close": 86.15,
        "adjClose": 69.76
      },
      {
        "date": "2011-08",
        "close": 81.45,
        "adjClose": 66.03
      },
      {
        "date": "2011-09",
        "close": 75.79,
        "adjClose": 61.51
      },
      {
        "date": "2011-10",
        "close": 83.78,
        "adjClose": 68.08
      },
      {
        "date": "2011-11",
        "close": 83.51,
        "adjClose": 67.93
      },
      {
        "date": "2011-12",
        "close": 84.14,
        "adjClose": 68.53
      },
      {
        "date": "2012-01",
        "close": 88.0,
        "adjClose": 71.76
      },
      {
        "date": "2012-02",
        "close": 91.87,
        "adjClose": 75.0
      },
      {
        "date": "2012-03",
        "close": 94.76,
        "adjClose": 77.45
      },
      {
        "date": "2012-04",
        "close": 93.99,
        "adjClose": 76.91
      },
      {
        "date": "2012-05",
        "close": 88.28,
        "adjClose": 72.32
      },
      {
        "date": "2012-06",
        "close": 91.63,
        "adjClose": 75.16
      },
      {
        "date": "2012-07",
        "close": 92.57,
        "adjClose": 76.01
      },
      {
        "date": "2012-08",
        "close": 94.65,
        "adjClose": 77.82
      },
      {
        "date": "2012-09",
        "close": 97.09,
        "adjClose": 79.91
      },
      {
        "date": "2012-10",
        "close": 95.27,
        "adjClose": 78.5
      },
      {
        "date": "2012-11",
        "close": 95.74,
        "adjClose": 78.98
      },
      {
        "date": "2012-12",
        "close": 96.47,
        "adjClose": 79.68
      },
      {
        "date": "2013-01",
        "close": 101.49,
        "adjClose": 83.92
      },
      {
        "date": "2013-02",
        "close": 102.68,
        "adjClose": 85.01
      },
      {
        "date": "2013-03",
        "close": 106.56,
        "adjClose": 88.32
      },
      {
        "date": "2013-04",
        "close": 108.4,
        "adjClose": 89.95
      },
      {
        "date": "2013-05",
        "close": 110.92,
        "adjClose": 92.15
      },
      {
        "date": "2013-06",
        "close": 109.27,
        "adjClose": 90.89
      },
      {
        "date": "2013-07",
        "close": 115.0,
        "adjClose": 95.76
      },
      {
        "date": "2013-08",
        "close": 111.74,
        "adjClose": 93.15
      },
      {
        "date": "2013-09",
        "close": 115.33,
        "adjClose": 96.27
      },
      {
        "date": "2013-10",
        "close": 120.29,
        "adjClose": 100.52
      },
      {
        "date": "2013-11",
        "close": 123.83,
        "adjClose": 103.6
      },
      {
        "date": "2013-12",
        "close": 126.97,
        "adjClose": 106.35
      },
      {
        "date": "2014-01",
        "close": 122.39,
        "adjClose": 102.63
      },
      {
        "date": "2014-02",
        "close": 127.87,
        "adjClose": 107.35
      },
      {
        "date": "2014-03",
        "close": 128.68,
        "adjClose": 108.16
      },
      {
        "date": "2014-04",
        "close": 129.22,
        "adjClose": 108.74
      },
      {
        "date": "2014-05",
        "close": 132.01,
        "adjClose": 111.22
      },
      {
        "date": "2014-06",
        "close": 134.48,
        "adjClose": 113.43
      },
      {
        "date": "2014-07",
        "close": 132.51,
        "adjClose": 111.9
      },
      {
        "date": "2014-08",
        "close": 137.75,
        "adjClose": 116.46
      },
      {
        "date": "2014-09",
        "close": 135.7,
        "adjClose": 114.86
      },
      {
        "date": "2014-10",
        "close": 138.62,
        "adjClose": 117.47
      },
      {
        "date": "2014-11",
        "close": 142.46,
        "adjClose": 120.86
      },
      {
        "date": "2014-12",
        "close": 141.8,
        "adjClose": 120.44
      },
      {
        "date": "2015-01",
        "close": 137.28,
        "adjClose": 116.74
      },
      {
        "date": "2015-02",
        "close": 145.35,
        "adjClose": 123.75
      },
      {
        "date": "2015-03",
        "close": 142.89,
        "adjClose": 121.79
      },
      {
        "date": "2015-04",
        "close": 144.15,
        "adjClose": 123.01
      },
      {
        "date": "2015-05",
        "close": 145.72,
        "adjClose": 124.5
      },
      {
        "date": "2015-06",
        "close": 142.89,
        "adjClose": 122.22
      },
      {
        "date": "2015-07",
        "close": 145.7,
        "adjClose": 124.77
      },
      {
        "date": "2015-08",
        "close": 136.77,
        "adjClose": 117.26
      },
      {
        "date": "2015-09",
        "close": 133.08,
        "adjClose": 114.22
      },
      {
        "date": "2015-10",
        "close": 143.77,
        "adjClose": 123.55
      },
      {
        "date": "2015-11",
        "close": 144.04,
        "adjClose": 123.93
      },
      {
        "date": "2015-12",
        "close": 141.32,
        "adjClose": 121.72
      },
      {
        "date": "2016-01",
        "close": 133.56,
        "adjClose": 115.17
      },
      {
        "date": "2016-02",
        "close": 133.17,
        "adjClose": 114.98
      },
      {
        "date": "2016-03",
        "close": 142.05,
        "adjClose": 122.79
      },
      {
        "date": "2016-04",
        "close": 142.86,
        "adjClose": 123.63
      },
      {
        "date": "2016-05",
        "close": 145.2,
        "adjClose": 125.8
      },
      {
        "date": "2016-06",
        "close": 145.01,
        "adjClose": 125.78
      },
      {
        "date": "2016-07",
        "close": 150.23,
        "adjClose": 130.46
      },
      {
        "date": "2016-08",
        "close": 150.57,
        "adjClose": 130.91
      },
      {
        "date": "2016-09",
        "close": 150.62,
        "adjClose": 131.1
      },
      {
        "date": "2016-10",
        "close": 148.11,
        "adjClose": 129.07
      },
      {
        "date": "2016-11",
        "close": 153.82,
        "adjClose": 134.21
      },
      {
        "date": "2016-12",
        "close": 156.5,
        "adjClose": 136.7
      },
      {
        "date": "2017-01",
        "close": 159.56,
        "adjClose": 139.53
      },
      {
        "date": "2017-02",
        "close": 165.6,
        "adjClose": 144.99
      },
      {
        "date": "2017-03",
        "close": 165.71,
        "adjClose": 145.25
      },
      {
        "date": "2017-04",
        "close": 167.48,
        "adjClose": 146.98
      },
      {
        "date": "2017-05",
        "close": 169.85,
        "adjClose": 149.23
      },
      {
        "date": "2017-06",
        "close": 170.53,
        "adjClose": 150.0
      },
      {
        "date": "2017-07",
        "close": 173.94,
        "adjClose": 153.18
      },
      {
        "date": "2017-08",
        "close": 174.59,
        "adjClose": 153.93
      },
      {
        "date": "2017-09",
        "close": 178.03,
        "adjClose": 157.15
      },
      {
        "date": "2017-10",
        "close": 182.25,
        "adjClose": 161.06
      },
      {
        "date": "2017-11",
        "close": 187.96,
        "adjClose": 166.3
      },
      {
        "date": "2017-12",
        "close": 190.07,
        "adjClose": 168.36
      },
      {
        "date": "2018-01",
        "close": 201.35,
        "adjClose": 178.56
      },
      {
        "date": "2018-02",
        "close": 194.1,
        "adjClose": 172.33
      },
      {
        "date": "2018-03",
        "close": 188.71,
        "adjClose": 167.75
      },
      {
        "date": "2018-04",
        "close": 189.3,
        "adjClose": 168.47
      },
      {
        "date": "2018-05",
        "close": 193.43,
        "adjClose": 172.34
      },
      {
        "date": "2018-06",
        "close": 194.42,
        "adjClose": 173.43
      },
      {
        "date": "2018-07",
        "close": 201.27,
        "adjClose": 179.74
      },
      {
        "date": "2018-08",
        "close": 208.13,
        "adjClose": 186.09
      },
      {
        "date": "2018-09",
        "close": 209.03,
        "adjClose": 187.11
      },
      {
        "date": "2018-10",
        "close": 194.38,
        "adjClose": 174.2
      },
      {
        "date": "2018-11",
        "close": 197.76,
        "adjClose": 177.44
      },
      {
        "date": "2018-12",
        "close": 179.85,
        "adjClose": 161.56
      },
      {
        "date": "2019-01",
        "close": 194.16,
        "adjClose": 174.61
      },
      {
        "date": "2019-02",
        "close": 200.37,
        "adjClose": 180.41
      },
      {
        "date": "2019-03",
        "close": 203.64,
        "adjClose": 183.57
      },
      {
        "date": "2019-04",
        "close": 212.07,
        "adjClose": 191.39
      },
      {
        "date": "2019-05",
        "close": 197.82,
        "adjClose": 178.74
      },
      {
        "date": "2019-06",
        "close": 211.64,
        "adjClose": 191.45
      },
      {
        "date": "2019-07",
        "close": 214.6,
        "adjClose": 194.36
      },
      {
        "date": "2019-08",
        "close": 210.15,
        "adjClose": 190.55
      },
      {
        "date": "2019-09",
        "close": 213.31,
        "adjClose": 193.63
      },
      {
        "date": "2019-10",
        "close": 218.05,
        "adjClose": 198.16
      },
      {
        "date": "2019-11",
        "close": 226.33,
        "adjClose": 205.93
      },
      {
        "date": "2019-12",
        "close": 232.58,
        "adjClose": 211.86
      },
      {
        "date": "2020-01",
        "close": 233.26,
        "adjClose": 212.73
      },
      {
        "date": "2020-02",
        "close": 214.32,
        "adjClose": 195.69
      },
      {
        "date": "2020-03",
        "close": 188.19,
        "adjClose": 172.03
      },
      {
        "date": "2020-04",
        "close": 212.94,
        "adjClose": 194.88
      },
      {
        "date": "2020-05",
        "close": 223.68,
        "adjClose": 204.95
      },
      {
        "date": "2020-06",
        "close": 228.54,
        "adjClose": 209.65
      },
      {
        "date": "2020-07",
        "close": 242.31,
        "adjClose": 222.54
      },
      {
        "date": "2020-08",
        "close": 261.13,
        "adjClose": 240.1
      },
      {
        "date": "2020-09",
        "close": 251.17,
        "adjClose": 231.22
      },
      {
        "date": "2020-10",
        "close": 244.36,
        "adjClose": 225.2
      },
      {
        "date": "2020-11",
        "close": 272.48,
        "adjClose": 251.42
      },
      {
        "date": "2020-12",
        "close": 283.57,
        "adjClose": 261.95
      },
      {
        "date": "2021-01",
        "close": 280.97,
        "adjClose": 259.86
      },
      {
        "date": "2021-02",
        "close": 287.27,
        "adjClose": 265.99
      },
      {
        "date": "2021-03",
        "close": 297.29,
        "adjClose": 275.59
      },
      {
        "date": "2021-04",
        "close": 313.16,
        "adjClose": 290.64
      },
      {
        "date": "2021-05",
        "close": 313.89,
        "adjClose": 291.66
      },
      {
        "date": "2021-06",
        "close": 322.11,
        "adjClose": 299.65
      },
      {
        "date": "2021-07",
        "close": 328.14,
        "adjClose": 305.61
      },
      {
        "date": "2021-08",
        "close": 337.69,
        "adjClose": 314.87
      },
      {
        "date": "2021-09",
        "close": 321.81,
        "adjClose": 300.42
      },
      {
        "date": "2021-10",
        "close": 343.94,
        "adjClose": 321.45
      },
      {
        "date": "2021-11",
        "close": 339.93,
        "adjClose": 318.07
      },
      {
        "date": "2021-12",
        "close": 351.48,
        "adjClose": 329.27
      },
      {
        "date": "2022-01",
        "close": 331.24,
        "adjClose": 310.66
      },
      {
        "date": "2022-02",
        "close": 321.82,
        "adjClose": 302.18
      },
      {
        "date": "2022-03",
        "close": 332.41,
        "adjClose": 312.49
      },
      {
        "date": "2022-04",
        "close": 300.98,
        "adjClose": 283.27
      },
      {
        "date": "2022-05",
        "close": 299.66,
        "adjClose": 282.36
      },
      {
        "date": "2022-06",
        "close": 274.95,
        "adjClose": 259.38
      },
      {
        "date": "2022-07",
        "close": 300.86,
        "adjClose": 284.15
      },
      {
        "date": "2022-08",
        "close": 289.21,
        "adjClose": 273.47
      },
      {
        "date": "2022-09",
        "close": 262.7,
        "adjClose": 248.69
      },
      {
        "date": "2022-10",
        "close": 283.15,
        "adjClose": 268.36
      },
      {
        "date": "2022-11",
        "close": 297.61,
        "adjClose": 282.4
      },
      {
        "date": "2022-12",
        "close": 279.22,
        "adjClose": 265.25
      },
      {
        "date": "2023-01",
        "close": 296.96,
        "adjClose": 282.44
      },
      {
        "date": "2023-02",
        "close": 289.83,
        "adjClose": 275.97
      },
      {
        "date": "2023-03",
        "close": 300.26,
        "adjClose": 286.24
      },
      {
        "date": "2023-04",
        "close": 303.84,
        "adjClose": 289.99
      },
      {
        "date": "2023-05",
        "close": 306.12,
        "adjClose": 292.51
      },
      {
        "date": "2023-06",
        "close": 326.22,
        "adjClose": 312.08
      },
      {
        "date": "2023-07",
        "close": 336.95,
        "adjClose": 322.73
      },
      {
        "date": "2023-08",
        "close": 331.24,
        "adjClose": 317.63
      },
      {
        "date": "2023-09",
        "close": 315.44,
        "adjClose": 302.82
      },
      {
        "date": "2023-10",
        "close": 307.86,
        "adjClose": 295.89
      },
      {
        "date": "2023-11",
        "close": 336.09,
        "adjClose": 323.41
      },
      {
        "date": "2023-12",
        "close": 351.18,
        "adjClose": 338.32
      },
      {
        "date": "2024-01",
        "close": 356.8,
        "adjClose": 344.14
      },
      {
        "date": "2024-02",
        "close": 375.77,
        "adjClose": 362.86
      },
      {
        "date": "2024-03",
        "close": 387.35,
        "adjClose": 374.47
      },
      {
        "date": "2024-04",
        "close": 371.73,
        "adjClose": 359.79
      },
      {
        "date": "2024-05",
        "close": 389.08,
        "adjClose": 377.02
      },
      {
        "date": "2024-06",
        "close": 402.77,
        "adjClose": 390.75
      },
      {
        "date": "2024-07",
        "close": 406.49,
        "adjClose": 394.81
      },
      {
        "date": "2024-08",
        "close": 415.72,
        "adjClose": 404.25
      },
      {
        "date": "2024-09",
        "close": 424.29,
        "adjClose": 413.06
      },
      {
        "date": "2024-10",
        "close": 421.16,
        "adjClose": 410.5
      },
      {
        "date": "2024-11",
        "close": 448.1,
        "adjClose": 437.26
      },
      {
        "date": "2024-12",
        "close": 437.11,
        "adjClose": 427.03
      },
      {
        "date": "2025-01",
        "close": 450.09,
        "adjClose": 440.23
      },
      {
        "date": "2025-02",
        "close": 441.7,
        "adjClose": 432.52
      },
      {
        "date": "2025-03",
        "close": 414.93,
        "adjClose": 406.79
      },
      {
        "date": "2025-04",
        "close": 412.71,
        "adjClose": 405.08
      },
      {
        "date": "2025-05",
        "close": 438.86,
        "adjClose": 431.25
      },
      {
        "date": "2025-06",
        "close": 461.36,
        "adjClose": 453.89
      },
      {
        "date": "2025-07",
        "close": 471.74,
        "adjClose": 464.64
      },
      {
        "date": "2025-08",
        "close": 480.24,
        "adjClose": 473.57
      },
      {
        "date": "2025-09",
        "close": 498.77,
        "adjClose": 492.41
      },
      {
        "date": "2025-10",
        "close": 510.79,
        "adjClose": 504.87
      },
      {
        "date": "2025-11",
        "close": 510.15,
        "adjClose": 504.82
      },
      {
        "date": "2025-12",
        "close": 509.6,
        "adjClose": 504.87
      },
      {
        "date": "2026-01",
        "close": 514.25,
        "adjClose": 510.07
      },
      {
        "date": "2026-02",
        "close": 508.21,
        "adjClose": 504.66
      },
      {
        "date": "2026-03",
        "close": 482.79,
        "adjClose": 479.99
      },
      {
        "date": "2026-04",
        "close": 531.27,
        "adjClose": 528.8
      },
      {
        "date": "2026-05",
        "close": 559.1,
        "adjClose": 557.14
      },
      {
        "date": "2026-06",
        "close": 551.46,
        "adjClose": 550.18
      },
      {
        "date": "2026-07",
        "close": 549.61,
        "adjClose": 548.97
      },
      {
        "date": "2026-08",
        "close": 565.0,
        "adjClose": 565.0
      }
    ]
  },
  {
    "id": "QQQ",
    "ticker": "QQQ",
    "name": "Invesco QQQ Trust (Nasdaq-100)",
    "assetClass": "US Large Cap Growth / Tech",
    "inception": "1999-03",
    "color": "#a855f7",
    "expenseRatio": "0.20%",
    "yield": "0.60%",
    "data": [
      {
        "date": "1999-03",
        "close": 48.13,
        "adjClose": 41.4
      },
      {
        "date": "1999-04",
        "close": 52.18,
        "adjClose": 44.9
      },
      {
        "date": "1999-05",
        "close": 50.36,
        "adjClose": 43.35
      },
      {
        "date": "1999-06",
        "close": 55.93,
        "adjClose": 48.17
      },
      {
        "date": "1999-07",
        "close": 53.04,
        "adjClose": 45.71
      },
      {
        "date": "1999-08",
        "close": 52.54,
        "adjClose": 45.29
      },
      {
        "date": "1999-09",
        "close": 50.35,
        "adjClose": 43.43
      },
      {
        "date": "1999-10",
        "close": 58.05,
        "adjClose": 50.08
      },
      {
        "date": "1999-11",
        "close": 61.45,
        "adjClose": 53.05
      },
      {
        "date": "1999-12",
        "close": 70.67,
        "adjClose": 61.03
      },
      {
        "date": "2000-01",
        "close": 65.8,
        "adjClose": 56.85
      },
      {
        "date": "2000-02",
        "close": 65.51,
        "adjClose": 56.63
      },
      {
        "date": "2000-03",
        "close": 78.89,
        "adjClose": 68.22
      },
      {
        "date": "2000-04",
        "close": 73.01,
        "adjClose": 63.17
      },
      {
        "date": "2000-05",
        "close": 69.09,
        "adjClose": 59.81
      },
      {
        "date": "2000-06",
        "close": 71.01,
        "adjClose": 61.49
      },
      {
        "date": "2000-07",
        "close": 68.45,
        "adjClose": 59.31
      },
      {
        "date": "2000-08",
        "close": 73.1,
        "adjClose": 63.36
      },
      {
        "date": "2000-09",
        "close": 66.28,
        "adjClose": 57.47
      },
      {
        "date": "2000-10",
        "close": 64.03,
        "adjClose": 55.55
      },
      {
        "date": "2000-11",
        "close": 52.06,
        "adjClose": 45.19
      },
      {
        "date": "2000-12",
        "close": 52.48,
        "adjClose": 45.57
      },
      {
        "date": "2001-01",
        "close": 54.08,
        "adjClose": 46.98
      },
      {
        "date": "2001-02",
        "close": 44.14,
        "adjClose": 38.37
      },
      {
        "date": "2001-03",
        "close": 38.35,
        "adjClose": 33.35
      },
      {
        "date": "2001-04",
        "close": 41.11,
        "adjClose": 35.77
      },
      {
        "date": "2001-05",
        "close": 41.34,
        "adjClose": 35.98
      },
      {
        "date": "2001-06",
        "close": 39.65,
        "adjClose": 34.53
      },
      {
        "date": "2001-07",
        "close": 38.53,
        "adjClose": 33.56
      },
      {
        "date": "2001-08",
        "close": 33.86,
        "adjClose": 29.51
      },
      {
        "date": "2001-09",
        "close": 28.57,
        "adjClose": 24.91
      },
      {
        "date": "2001-10",
        "close": 29.1,
        "adjClose": 25.39
      },
      {
        "date": "2001-11",
        "close": 31.13,
        "adjClose": 27.17
      },
      {
        "date": "2001-12",
        "close": 31.39,
        "adjClose": 27.41
      },
      {
        "date": "2002-01",
        "close": 30.66,
        "adjClose": 26.78
      },
      {
        "date": "2002-02",
        "close": 29.44,
        "adjClose": 25.73
      },
      {
        "date": "2002-03",
        "close": 30.46,
        "adjClose": 26.63
      },
      {
        "date": "2002-04",
        "close": 27.0,
        "adjClose": 23.62
      },
      {
        "date": "2002-05",
        "close": 26.52,
        "adjClose": 23.21
      },
      {
        "date": "2002-06",
        "close": 22.8,
        "adjClose": 19.97
      },
      {
        "date": "2002-07",
        "close": 19.66,
        "adjClose": 17.22
      },
      {
        "date": "2002-08",
        "close": 19.77,
        "adjClose": 17.33
      },
      {
        "date": "2002-09",
        "close": 15.8,
        "adjClose": 13.85
      },
      {
        "date": "2002-10",
        "close": 17.03,
        "adjClose": 14.94
      },
      {
        "date": "2002-11",
        "close": 18.19,
        "adjClose": 15.97
      },
      {
        "date": "2002-12",
        "close": 16.93,
        "adjClose": 14.86
      },
      {
        "date": "2003-01",
        "close": 16.37,
        "adjClose": 14.38
      },
      {
        "date": "2003-02",
        "close": 16.01,
        "adjClose": 14.07
      },
      {
        "date": "2003-03",
        "close": 16.24,
        "adjClose": 14.28
      },
      {
        "date": "2003-04",
        "close": 17.86,
        "adjClose": 15.71
      },
      {
        "date": "2003-05",
        "close": 19.07,
        "adjClose": 16.78
      },
      {
        "date": "2003-06",
        "close": 19.37,
        "adjClose": 17.05
      },
      {
        "date": "2003-07",
        "close": 19.8,
        "adjClose": 17.44
      },
      {
        "date": "2003-08",
        "close": 20.26,
        "adjClose": 17.85
      },
      {
        "date": "2003-09",
        "close": 19.98,
        "adjClose": 17.61
      },
      {
        "date": "2003-10",
        "close": 21.38,
        "adjClose": 18.86
      },
      {
        "date": "2003-11",
        "close": 21.64,
        "adjClose": 19.09
      },
      {
        "date": "2003-12",
        "close": 22.93,
        "adjClose": 20.24
      },
      {
        "date": "2004-01",
        "close": 23.44,
        "adjClose": 20.7
      },
      {
        "date": "2004-02",
        "close": 23.85,
        "adjClose": 21.07
      },
      {
        "date": "2004-03",
        "close": 23.4,
        "adjClose": 20.68
      },
      {
        "date": "2004-04",
        "close": 23.03,
        "adjClose": 20.37
      },
      {
        "date": "2004-05",
        "close": 23.36,
        "adjClose": 20.67
      },
      {
        "date": "2004-06",
        "close": 23.81,
        "adjClose": 21.07
      },
      {
        "date": "2004-07",
        "close": 22.8,
        "adjClose": 20.19
      },
      {
        "date": "2004-08",
        "close": 22.89,
        "adjClose": 20.29
      },
      {
        "date": "2004-09",
        "close": 23.22,
        "adjClose": 20.58
      },
      {
        "date": "2004-10",
        "close": 23.61,
        "adjClose": 20.94
      },
      {
        "date": "2004-11",
        "close": 24.8,
        "adjClose": 22.0
      },
      {
        "date": "2004-12",
        "close": 25.86,
        "adjClose": 22.95
      },
      {
        "date": "2005-01",
        "close": 25.08,
        "adjClose": 22.28
      },
      {
        "date": "2005-02",
        "close": 25.72,
        "adjClose": 22.86
      },
      {
        "date": "2005-03",
        "close": 25.23,
        "adjClose": 22.42
      },
      {
        "date": "2005-04",
        "close": 24.67,
        "adjClose": 21.94
      },
      {
        "date": "2005-05",
        "close": 25.7,
        "adjClose": 22.87
      },
      {
        "date": "2005-06",
        "close": 25.74,
        "adjClose": 22.91
      },
      {
        "date": "2005-07",
        "close": 26.92,
        "adjClose": 23.97
      },
      {
        "date": "2005-08",
        "close": 26.64,
        "adjClose": 23.73
      },
      {
        "date": "2005-09",
        "close": 26.89,
        "adjClose": 23.97
      },
      {
        "date": "2005-10",
        "close": 26.42,
        "adjClose": 23.56
      },
      {
        "date": "2005-11",
        "close": 27.64,
        "adjClose": 24.66
      },
      {
        "date": "2005-12",
        "close": 27.63,
        "adjClose": 24.66
      },
      {
        "date": "2006-01",
        "close": 28.45,
        "adjClose": 25.41
      },
      {
        "date": "2006-02",
        "close": 28.5,
        "adjClose": 25.46
      },
      {
        "date": "2006-03",
        "close": 28.95,
        "adjClose": 25.88
      },
      {
        "date": "2006-04",
        "close": 29.36,
        "adjClose": 26.25
      },
      {
        "date": "2006-05",
        "close": 28.43,
        "adjClose": 25.44
      },
      {
        "date": "2006-06",
        "close": 28.48,
        "adjClose": 25.49
      },
      {
        "date": "2006-07",
        "close": 28.61,
        "adjClose": 25.62
      },
      {
        "date": "2006-08",
        "close": 29.48,
        "adjClose": 26.41
      },
      {
        "date": "2006-09",
        "close": 30.38,
        "adjClose": 27.23
      },
      {
        "date": "2006-10",
        "close": 31.63,
        "adjClose": 28.36
      },
      {
        "date": "2006-11",
        "close": 32.36,
        "adjClose": 29.03
      },
      {
        "date": "2006-12",
        "close": 32.9,
        "adjClose": 29.53
      },
      {
        "date": "2007-01",
        "close": 33.59,
        "adjClose": 30.16
      },
      {
        "date": "2007-02",
        "close": 32.79,
        "adjClose": 29.45
      },
      {
        "date": "2007-03",
        "close": 33.21,
        "adjClose": 29.85
      },
      {
        "date": "2007-04",
        "close": 34.99,
        "adjClose": 31.46
      },
      {
        "date": "2007-05",
        "close": 36.48,
        "adjClose": 32.82
      },
      {
        "date": "2007-06",
        "close": 35.71,
        "adjClose": 32.14
      },
      {
        "date": "2007-07",
        "close": 34.49,
        "adjClose": 31.05
      },
      {
        "date": "2007-08",
        "close": 35.16,
        "adjClose": 31.67
      },
      {
        "date": "2007-09",
        "close": 36.82,
        "adjClose": 33.19
      },
      {
        "date": "2007-10",
        "close": 37.74,
        "adjClose": 34.03
      },
      {
        "date": "2007-11",
        "close": 35.92,
        "adjClose": 32.4
      },
      {
        "date": "2007-12",
        "close": 35.66,
        "adjClose": 32.18
      },
      {
        "date": "2008-01",
        "close": 33.41,
        "adjClose": 30.17
      },
      {
        "date": "2008-02",
        "close": 32.33,
        "adjClose": 29.2
      },
      {
        "date": "2008-03",
        "close": 32.11,
        "adjClose": 29.02
      },
      {
        "date": "2008-04",
        "close": 33.62,
        "adjClose": 30.4
      },
      {
        "date": "2008-05",
        "close": 34.13,
        "adjClose": 30.87
      },
      {
        "date": "2008-06",
        "close": 31.09,
        "adjClose": 28.13
      },
      {
        "date": "2008-07",
        "close": 30.75,
        "adjClose": 27.84
      },
      {
        "date": "2008-08",
        "close": 31.16,
        "adjClose": 28.23
      },
      {
        "date": "2008-09",
        "close": 28.19,
        "adjClose": 25.55
      },
      {
        "date": "2008-10",
        "close": 23.35,
        "adjClose": 21.17
      },
      {
        "date": "2008-11",
        "close": 21.63,
        "adjClose": 19.62
      },
      {
        "date": "2008-12",
        "close": 21.92,
        "adjClose": 19.89
      },
      {
        "date": "2009-01",
        "close": 19.86,
        "adjClose": 18.03
      },
      {
        "date": "2009-02",
        "close": 17.5,
        "adjClose": 15.89
      },
      {
        "date": "2009-03",
        "close": 19.39,
        "adjClose": 17.62
      },
      {
        "date": "2009-04",
        "close": 21.56,
        "adjClose": 19.6
      },
      {
        "date": "2009-05",
        "close": 23.01,
        "adjClose": 20.93
      },
      {
        "date": "2009-06",
        "close": 23.07,
        "adjClose": 20.99
      },
      {
        "date": "2009-07",
        "close": 25.2,
        "adjClose": 22.94
      },
      {
        "date": "2009-08",
        "close": 26.2,
        "adjClose": 23.86
      },
      {
        "date": "2009-09",
        "close": 27.38,
        "adjClose": 24.94
      },
      {
        "date": "2009-10",
        "close": 26.82,
        "adjClose": 24.45
      },
      {
        "date": "2009-11",
        "close": 28.8,
        "adjClose": 26.27
      },
      {
        "date": "2009-12",
        "close": 29.51,
        "adjClose": 26.93
      },
      {
        "date": "2010-01",
        "close": 28.29,
        "adjClose": 25.82
      },
      {
        "date": "2010-02",
        "close": 29.39,
        "adjClose": 26.84
      },
      {
        "date": "2010-03",
        "close": 31.53,
        "adjClose": 28.81
      },
      {
        "date": "2010-04",
        "close": 32.0,
        "adjClose": 29.26
      },
      {
        "date": "2010-05",
        "close": 28.97,
        "adjClose": 26.5
      },
      {
        "date": "2010-06",
        "close": 27.18,
        "adjClose": 24.87
      },
      {
        "date": "2010-07",
        "close": 29.54,
        "adjClose": 27.04
      },
      {
        "date": "2010-08",
        "close": 27.97,
        "adjClose": 25.61
      },
      {
        "date": "2010-09",
        "close": 31.12,
        "adjClose": 28.51
      },
      {
        "date": "2010-10",
        "close": 32.63,
        "adjClose": 29.9
      },
      {
        "date": "2010-11",
        "close": 32.64,
        "adjClose": 29.93
      },
      {
        "date": "2010-12",
        "close": 35.26,
        "adjClose": 32.35
      },
      {
        "date": "2011-01",
        "close": 36.23,
        "adjClose": 33.25
      },
      {
        "date": "2011-02",
        "close": 37.71,
        "adjClose": 34.63
      },
      {
        "date": "2011-03",
        "close": 37.75,
        "adjClose": 34.68
      },
      {
        "date": "2011-04",
        "close": 39.16,
        "adjClose": 36.0
      },
      {
        "date": "2011-05",
        "close": 38.61,
        "adjClose": 35.51
      },
      {
        "date": "2011-06",
        "close": 37.83,
        "adjClose": 34.8
      },
      {
        "date": "2011-07",
        "close": 36.89,
        "adjClose": 33.95
      },
      {
        "date": "2011-08",
        "close": 34.5,
        "adjClose": 31.77
      },
      {
        "date": "2011-09",
        "close": 31.66,
        "adjClose": 29.16
      },
      {
        "date": "2011-10",
        "close": 35.86,
        "adjClose": 33.05
      },
      {
        "date": "2011-11",
        "close": 35.76,
        "adjClose": 32.97
      },
      {
        "date": "2011-12",
        "close": 36.13,
        "adjClose": 33.33
      },
      {
        "date": "2012-01",
        "close": 38.24,
        "adjClose": 35.3
      },
      {
        "date": "2012-02",
        "close": 40.39,
        "adjClose": 37.29
      },
      {
        "date": "2012-03",
        "close": 42.01,
        "adjClose": 38.81
      },
      {
        "date": "2012-04",
        "close": 41.64,
        "adjClose": 38.49
      },
      {
        "date": "2012-05",
        "close": 38.64,
        "adjClose": 35.73
      },
      {
        "date": "2012-06",
        "close": 40.52,
        "adjClose": 37.48
      },
      {
        "date": "2012-07",
        "close": 41.08,
        "adjClose": 38.02
      },
      {
        "date": "2012-08",
        "close": 42.27,
        "adjClose": 39.14
      },
      {
        "date": "2012-09",
        "close": 43.68,
        "adjClose": 40.46
      },
      {
        "date": "2012-10",
        "close": 42.73,
        "adjClose": 39.6
      },
      {
        "date": "2012-11",
        "close": 43.04,
        "adjClose": 39.91
      },
      {
        "date": "2012-12",
        "close": 43.49,
        "adjClose": 40.34
      },
      {
        "date": "2013-01",
        "close": 46.37,
        "adjClose": 43.03
      },
      {
        "date": "2013-02",
        "close": 47.1,
        "adjClose": 43.73
      },
      {
        "date": "2013-03",
        "close": 49.37,
        "adjClose": 45.86
      },
      {
        "date": "2013-04",
        "close": 50.49,
        "adjClose": 46.92
      },
      {
        "date": "2013-05",
        "close": 52.0,
        "adjClose": 48.35
      },
      {
        "date": "2013-06",
        "close": 51.13,
        "adjClose": 47.56
      },
      {
        "date": "2013-07",
        "close": 54.53,
        "adjClose": 50.74
      },
      {
        "date": "2013-08",
        "close": 52.72,
        "adjClose": 49.09
      },
      {
        "date": "2013-09",
        "close": 54.9,
        "adjClose": 51.13
      },
      {
        "date": "2013-10",
        "close": 57.9,
        "adjClose": 53.96
      },
      {
        "date": "2013-11",
        "close": 60.09,
        "adjClose": 56.02
      },
      {
        "date": "2013-12",
        "close": 62.06,
        "adjClose": 57.89
      },
      {
        "date": "2014-01",
        "close": 59.43,
        "adjClose": 55.46
      },
      {
        "date": "2014-02",
        "close": 62.82,
        "adjClose": 58.64
      },
      {
        "date": "2014-03",
        "close": 63.38,
        "adjClose": 59.19
      },
      {
        "date": "2014-04",
        "close": 63.77,
        "adjClose": 59.59
      },
      {
        "date": "2014-05",
        "close": 65.56,
        "adjClose": 61.29
      },
      {
        "date": "2014-06",
        "close": 67.16,
        "adjClose": 62.82
      },
      {
        "date": "2014-07",
        "close": 66.04,
        "adjClose": 61.8
      },
      {
        "date": "2014-08",
        "close": 69.37,
        "adjClose": 64.94
      },
      {
        "date": "2014-09",
        "close": 68.2,
        "adjClose": 63.87
      },
      {
        "date": "2014-10",
        "close": 70.1,
        "adjClose": 65.69
      },
      {
        "date": "2014-11",
        "close": 72.6,
        "adjClose": 68.06
      },
      {
        "date": "2014-12",
        "close": 72.26,
        "adjClose": 67.77
      },
      {
        "date": "2015-01",
        "close": 69.57,
        "adjClose": 65.28
      },
      {
        "date": "2015-02",
        "close": 74.75,
        "adjClose": 70.17
      },
      {
        "date": "2015-03",
        "close": 73.3,
        "adjClose": 68.84
      },
      {
        "date": "2015-04",
        "close": 74.19,
        "adjClose": 69.7
      },
      {
        "date": "2015-05",
        "close": 75.27,
        "adjClose": 70.76
      },
      {
        "date": "2015-06",
        "close": 73.59,
        "adjClose": 69.2
      },
      {
        "date": "2015-07",
        "close": 75.47,
        "adjClose": 71.01
      },
      {
        "date": "2015-08",
        "close": 69.99,
        "adjClose": 65.88
      },
      {
        "date": "2015-09",
        "close": 67.78,
        "adjClose": 63.83
      },
      {
        "date": "2015-10",
        "close": 74.66,
        "adjClose": 70.35
      },
      {
        "date": "2015-11",
        "close": 74.92,
        "adjClose": 70.62
      },
      {
        "date": "2015-12",
        "close": 73.28,
        "adjClose": 69.11
      },
      {
        "date": "2016-01",
        "close": 68.52,
        "adjClose": 64.65
      },
      {
        "date": "2016-02",
        "close": 68.35,
        "adjClose": 64.52
      },
      {
        "date": "2016-03",
        "close": 74.12,
        "adjClose": 69.99
      },
      {
        "date": "2016-04",
        "close": 74.72,
        "adjClose": 70.6
      },
      {
        "date": "2016-05",
        "close": 76.32,
        "adjClose": 72.14
      },
      {
        "date": "2016-06",
        "close": 76.28,
        "adjClose": 72.13
      },
      {
        "date": "2016-07",
        "close": 79.79,
        "adjClose": 75.49
      },
      {
        "date": "2016-08",
        "close": 80.09,
        "adjClose": 75.81
      },
      {
        "date": "2016-09",
        "close": 80.2,
        "adjClose": 75.95
      },
      {
        "date": "2016-10",
        "close": 78.68,
        "adjClose": 74.54
      },
      {
        "date": "2016-11",
        "close": 82.55,
        "adjClose": 78.24
      },
      {
        "date": "2016-12",
        "close": 84.43,
        "adjClose": 80.06
      },
      {
        "date": "2017-01",
        "close": 86.58,
        "adjClose": 82.13
      },
      {
        "date": "2017-02",
        "close": 90.77,
        "adjClose": 86.15
      },
      {
        "date": "2017-03",
        "close": 90.93,
        "adjClose": 86.34
      },
      {
        "date": "2017-04",
        "close": 92.24,
        "adjClose": 87.63
      },
      {
        "date": "2017-05",
        "close": 93.96,
        "adjClose": 89.3
      },
      {
        "date": "2017-06",
        "close": 94.53,
        "adjClose": 89.88
      },
      {
        "date": "2017-07",
        "close": 96.99,
        "adjClose": 92.27
      },
      {
        "date": "2017-08",
        "close": 97.54,
        "adjClose": 92.83
      },
      {
        "date": "2017-09",
        "close": 100.04,
        "adjClose": 95.26
      },
      {
        "date": "2017-10",
        "close": 103.11,
        "adjClose": 98.22
      },
      {
        "date": "2017-11",
        "close": 107.25,
        "adjClose": 102.21
      },
      {
        "date": "2017-12",
        "close": 108.86,
        "adjClose": 103.79
      },
      {
        "date": "2018-01",
        "close": 117.05,
        "adjClose": 111.66
      },
      {
        "date": "2018-02",
        "close": 112.1,
        "adjClose": 106.98
      },
      {
        "date": "2018-03",
        "close": 108.47,
        "adjClose": 103.57
      },
      {
        "date": "2018-04",
        "close": 109.01,
        "adjClose": 104.12
      },
      {
        "date": "2018-05",
        "close": 112.09,
        "adjClose": 107.12
      },
      {
        "date": "2018-06",
        "close": 112.92,
        "adjClose": 107.96
      },
      {
        "date": "2018-07",
        "close": 118.0,
        "adjClose": 112.87
      },
      {
        "date": "2018-08",
        "close": 123.15,
        "adjClose": 117.85
      },
      {
        "date": "2018-09",
        "close": 123.94,
        "adjClose": 118.66
      },
      {
        "date": "2018-10",
        "close": 113.63,
        "adjClose": 108.84
      },
      {
        "date": "2018-11",
        "close": 116.22,
        "adjClose": 111.37
      },
      {
        "date": "2018-12",
        "close": 103.69,
        "adjClose": 99.41
      },
      {
        "date": "2019-01",
        "close": 114.11,
        "adjClose": 109.45
      },
      {
        "date": "2019-02",
        "close": 118.79,
        "adjClose": 113.99
      },
      {
        "date": "2019-03",
        "close": 121.33,
        "adjClose": 116.48
      },
      {
        "date": "2019-04",
        "close": 127.73,
        "adjClose": 122.69
      },
      {
        "date": "2019-05",
        "close": 117.55,
        "adjClose": 112.95
      },
      {
        "date": "2019-06",
        "close": 127.94,
        "adjClose": 122.99
      },
      {
        "date": "2019-07",
        "close": 130.31,
        "adjClose": 125.33
      },
      {
        "date": "2019-08",
        "close": 127.18,
        "adjClose": 122.38
      },
      {
        "date": "2019-09",
        "close": 129.7,
        "adjClose": 124.86
      },
      {
        "date": "2019-10",
        "close": 133.43,
        "adjClose": 128.51
      },
      {
        "date": "2019-11",
        "close": 139.91,
        "adjClose": 134.81
      },
      {
        "date": "2019-12",
        "close": 144.88,
        "adjClose": 139.66
      },
      {
        "date": "2020-01",
        "close": 145.61,
        "adjClose": 140.44
      },
      {
        "date": "2020-02",
        "close": 132.72,
        "adjClose": 128.06
      },
      {
        "date": "2020-03",
        "close": 115.02,
        "adjClose": 111.03
      },
      {
        "date": "2020-04",
        "close": 135.58,
        "adjClose": 130.94
      },
      {
        "date": "2020-05",
        "close": 144.97,
        "adjClose": 140.08
      },
      {
        "date": "2020-06",
        "close": 149.39,
        "adjClose": 144.41
      },
      {
        "date": "2020-07",
        "close": 161.72,
        "adjClose": 156.4
      },
      {
        "date": "2020-08",
        "close": 178.86,
        "adjClose": 173.05
      },
      {
        "date": "2020-09",
        "close": 171.5,
        "adjClose": 166.01
      },
      {
        "date": "2020-10",
        "close": 166.52,
        "adjClose": 161.26
      },
      {
        "date": "2020-11",
        "close": 192.6,
        "adjClose": 186.6
      },
      {
        "date": "2020-12",
        "close": 203.4,
        "adjClose": 197.16
      },
      {
        "date": "2021-01",
        "close": 201.52,
        "adjClose": 195.42
      },
      {
        "date": "2021-02",
        "close": 207.84,
        "adjClose": 201.65
      },
      {
        "date": "2021-03",
        "close": 217.87,
        "adjClose": 211.48
      },
      {
        "date": "2021-04",
        "close": 233.82,
        "adjClose": 227.06
      },
      {
        "date": "2021-05",
        "close": 234.82,
        "adjClose": 228.14
      },
      {
        "date": "2021-06",
        "close": 243.39,
        "adjClose": 236.58
      },
      {
        "date": "2021-07",
        "close": 249.82,
        "adjClose": 242.93
      },
      {
        "date": "2021-08",
        "close": 259.92,
        "adjClose": 252.87
      },
      {
        "date": "2021-09",
        "close": 246.68,
        "adjClose": 240.1
      },
      {
        "date": "2021-10",
        "close": 269.87,
        "adjClose": 262.79
      },
      {
        "date": "2021-11",
        "close": 266.63,
        "adjClose": 259.76
      },
      {
        "date": "2021-12",
        "close": 279.17,
        "adjClose": 272.1
      },
      {
        "date": "2022-01",
        "close": 252.24,
        "adjClose": 245.96
      },
      {
        "date": "2022-02",
        "close": 240.43,
        "adjClose": 234.55
      },
      {
        "date": "2022-03",
        "close": 247.69,
        "adjClose": 241.75
      },
      {
        "date": "2022-04",
        "close": 208.23,
        "adjClose": 203.32
      },
      {
        "date": "2022-05",
        "close": 207.0,
        "adjClose": 202.22
      },
      {
        "date": "2022-06",
        "close": 178.27,
        "adjClose": 174.23
      },
      {
        "date": "2022-07",
        "close": 193.51,
        "adjClose": 189.21
      },
      {
        "date": "2022-08",
        "close": 181.05,
        "adjClose": 177.11
      },
      {
        "date": "2022-09",
        "close": 153.1,
        "adjClose": 149.84
      },
      {
        "date": "2022-10",
        "close": 163.92,
        "adjClose": 160.5
      },
      {
        "date": "2022-11",
        "close": 171.56,
        "adjClose": 168.06
      },
      {
        "date": "2022-12",
        "close": 153.78,
        "adjClose": 150.72
      },
      {
        "date": "2023-01",
        "close": 168.16,
        "adjClose": 164.88
      },
      {
        "date": "2023-02",
        "close": 163.65,
        "adjClose": 160.53
      },
      {
        "date": "2023-03",
        "close": 172.4,
        "adjClose": 169.19
      },
      {
        "date": "2023-04",
        "close": 175.6,
        "adjClose": 172.41
      },
      {
        "date": "2023-05",
        "close": 177.73,
        "adjClose": 174.58
      },
      {
        "date": "2023-06",
        "close": 194.88,
        "adjClose": 191.52
      },
      {
        "date": "2023-07",
        "close": 204.42,
        "adjClose": 200.99
      },
      {
        "date": "2023-08",
        "close": 200.62,
        "adjClose": 197.34
      },
      {
        "date": "2023-09",
        "close": 189.78,
        "adjClose": 186.76
      },
      {
        "date": "2023-10",
        "close": 184.7,
        "adjClose": 181.84
      },
      {
        "date": "2023-11",
        "close": 209.51,
        "adjClose": 206.36
      },
      {
        "date": "2023-12",
        "close": 223.41,
        "adjClose": 220.16
      },
      {
        "date": "2024-01",
        "close": 228.88,
        "adjClose": 225.65
      },
      {
        "date": "2024-02",
        "close": 246.82,
        "adjClose": 243.45
      },
      {
        "date": "2024-03",
        "close": 258.15,
        "adjClose": 254.74
      },
      {
        "date": "2024-04",
        "close": 246.4,
        "adjClose": 243.26
      },
      {
        "date": "2024-05",
        "close": 263.39,
        "adjClose": 260.16
      },
      {
        "date": "2024-06",
        "close": 277.17,
        "adjClose": 273.89
      },
      {
        "date": "2024-07",
        "close": 281.22,
        "adjClose": 278.02
      },
      {
        "date": "2024-08",
        "close": 290.83,
        "adjClose": 287.65
      },
      {
        "date": "2024-09",
        "close": 299.89,
        "adjClose": 296.74
      },
      {
        "date": "2024-10",
        "close": 297.61,
        "adjClose": 294.63
      },
      {
        "date": "2024-11",
        "close": 325.6,
        "adjClose": 322.48
      },
      {
        "date": "2024-12",
        "close": 316.69,
        "adjClose": 313.8
      },
      {
        "date": "2025-01",
        "close": 330.73,
        "adjClose": 327.86
      },
      {
        "date": "2025-02",
        "close": 323.93,
        "adjClose": 321.27
      },
      {
        "date": "2025-03",
        "close": 301.62,
        "adjClose": 299.28
      },
      {
        "date": "2025-04",
        "close": 300.03,
        "adjClose": 297.84
      },
      {
        "date": "2025-05",
        "close": 327.98,
        "adjClose": 325.74
      },
      {
        "date": "2025-06",
        "close": 352.79,
        "adjClose": 350.53
      },
      {
        "date": "2025-07",
        "close": 364.74,
        "adjClose": 362.58
      },
      {
        "date": "2025-08",
        "close": 374.73,
        "adjClose": 372.67
      },
      {
        "date": "2025-09",
        "close": 396.17,
        "adjClose": 394.18
      },
      {
        "date": "2025-10",
        "close": 410.52,
        "adjClose": 408.64
      },
      {
        "date": "2025-11",
        "close": 410.28,
        "adjClose": 408.59
      },
      {
        "date": "2025-12",
        "close": 410.15,
        "adjClose": 408.65
      },
      {
        "date": "2026-01",
        "close": 416.09,
        "adjClose": 414.76
      },
      {
        "date": "2026-02",
        "close": 410.83,
        "adjClose": 409.7
      },
      {
        "date": "2026-03",
        "close": 387.55,
        "adjClose": 386.66
      },
      {
        "date": "2026-04",
        "close": 444.49,
        "adjClose": 443.68
      },
      {
        "date": "2026-05",
        "close": 478.82,
        "adjClose": 478.16
      },
      {
        "date": "2026-06",
        "close": 471.72,
        "adjClose": 471.29
      },
      {
        "date": "2026-07",
        "close": 470.31,
        "adjClose": 470.1
      },
      {
        "date": "2026-08",
        "close": 490.0,
        "adjClose": 490.0
      }
    ]
  },
  {
    "id": "SCHD",
    "ticker": "SCHD",
    "name": "Schwab U.S. Dividend Equity ETF",
    "assetClass": "US High Dividend Equity",
    "inception": "2011-10",
    "color": "#10b981",
    "expenseRatio": "0.06%",
    "yield": "3.45%",
    "data": [
      {
        "date": "2011-10",
        "close": 18.97,
        "adjClose": 11.38
      },
      {
        "date": "2011-11",
        "close": 18.85,
        "adjClose": 11.34
      },
      {
        "date": "2011-12",
        "close": 18.86,
        "adjClose": 11.38
      },
      {
        "date": "2012-01",
        "close": 19.85,
        "adjClose": 12.01
      },
      {
        "date": "2012-02",
        "close": 20.69,
        "adjClose": 12.56
      },
      {
        "date": "2012-03",
        "close": 21.21,
        "adjClose": 12.91
      },
      {
        "date": "2012-04",
        "close": 20.99,
        "adjClose": 12.81
      },
      {
        "date": "2012-05",
        "close": 19.55,
        "adjClose": 11.96
      },
      {
        "date": "2012-06",
        "close": 20.18,
        "adjClose": 12.38
      },
      {
        "date": "2012-07",
        "close": 20.25,
        "adjClose": 12.47
      },
      {
        "date": "2012-08",
        "close": 20.74,
        "adjClose": 12.8
      },
      {
        "date": "2012-09",
        "close": 21.23,
        "adjClose": 13.14
      },
      {
        "date": "2012-10",
        "close": 20.89,
        "adjClose": 12.97
      },
      {
        "date": "2012-11",
        "close": 21.03,
        "adjClose": 13.1
      },
      {
        "date": "2012-12",
        "close": 21.28,
        "adjClose": 13.29
      },
      {
        "date": "2013-01",
        "close": 22.49,
        "adjClose": 14.08
      },
      {
        "date": "2013-02",
        "close": 22.7,
        "adjClose": 14.26
      },
      {
        "date": "2013-03",
        "close": 23.59,
        "adjClose": 14.86
      },
      {
        "date": "2013-04",
        "close": 23.91,
        "adjClose": 15.1
      },
      {
        "date": "2013-05",
        "close": 24.41,
        "adjClose": 15.47
      },
      {
        "date": "2013-06",
        "close": 24.02,
        "adjClose": 15.26
      },
      {
        "date": "2013-07",
        "close": 25.31,
        "adjClose": 16.13
      },
      {
        "date": "2013-08",
        "close": 24.59,
        "adjClose": 15.71
      },
      {
        "date": "2013-09",
        "close": 25.45,
        "adjClose": 16.31
      },
      {
        "date": "2013-10",
        "close": 26.43,
        "adjClose": 16.98
      },
      {
        "date": "2013-11",
        "close": 27.08,
        "adjClose": 17.45
      },
      {
        "date": "2013-12",
        "close": 27.77,
        "adjClose": 17.95
      },
      {
        "date": "2014-01",
        "close": 26.8,
        "adjClose": 17.37
      },
      {
        "date": "2014-02",
        "close": 28.05,
        "adjClose": 18.24
      },
      {
        "date": "2014-03",
        "close": 28.13,
        "adjClose": 18.34
      },
      {
        "date": "2014-04",
        "close": 28.09,
        "adjClose": 18.37
      },
      {
        "date": "2014-05",
        "close": 28.67,
        "adjClose": 18.8
      },
      {
        "date": "2014-06",
        "close": 29.26,
        "adjClose": 19.24
      },
      {
        "date": "2014-07",
        "close": 28.67,
        "adjClose": 18.91
      },
      {
        "date": "2014-08",
        "close": 29.8,
        "adjClose": 19.71
      },
      {
        "date": "2014-09",
        "close": 29.15,
        "adjClose": 19.34
      },
      {
        "date": "2014-10",
        "close": 29.8,
        "adjClose": 19.82
      },
      {
        "date": "2014-11",
        "close": 30.53,
        "adjClose": 20.37
      },
      {
        "date": "2014-12",
        "close": 30.4,
        "adjClose": 20.34
      },
      {
        "date": "2015-01",
        "close": 29.43,
        "adjClose": 19.74
      },
      {
        "date": "2015-02",
        "close": 31.19,
        "adjClose": 20.98
      },
      {
        "date": "2015-03",
        "close": 30.7,
        "adjClose": 20.72
      },
      {
        "date": "2015-04",
        "close": 30.87,
        "adjClose": 20.89
      },
      {
        "date": "2015-05",
        "close": 31.11,
        "adjClose": 21.12
      },
      {
        "date": "2015-06",
        "close": 30.43,
        "adjClose": 20.72
      },
      {
        "date": "2015-07",
        "close": 30.83,
        "adjClose": 21.05
      },
      {
        "date": "2015-08",
        "close": 28.95,
        "adjClose": 19.82
      },
      {
        "date": "2015-09",
        "close": 27.96,
        "adjClose": 19.2
      },
      {
        "date": "2015-10",
        "close": 30.04,
        "adjClose": 20.68
      },
      {
        "date": "2015-11",
        "close": 30.04,
        "adjClose": 20.74
      },
      {
        "date": "2015-12",
        "close": 29.28,
        "adjClose": 20.27
      },
      {
        "date": "2016-01",
        "close": 27.45,
        "adjClose": 19.06
      },
      {
        "date": "2016-02",
        "close": 27.42,
        "adjClose": 19.1
      },
      {
        "date": "2016-03",
        "close": 29.37,
        "adjClose": 20.51
      },
      {
        "date": "2016-04",
        "close": 29.65,
        "adjClose": 20.77
      },
      {
        "date": "2016-05",
        "close": 30.05,
        "adjClose": 21.11
      },
      {
        "date": "2016-06",
        "close": 29.89,
        "adjClose": 21.06
      },
      {
        "date": "2016-07",
        "close": 30.97,
        "adjClose": 21.88
      },
      {
        "date": "2016-08",
        "close": 31.02,
        "adjClose": 21.98
      },
      {
        "date": "2016-09",
        "close": 31.0,
        "adjClose": 22.03
      },
      {
        "date": "2016-10",
        "close": 30.38,
        "adjClose": 21.65
      },
      {
        "date": "2016-11",
        "close": 31.66,
        "adjClose": 22.63
      },
      {
        "date": "2016-12",
        "close": 32.01,
        "adjClose": 22.94
      },
      {
        "date": "2017-01",
        "close": 32.67,
        "adjClose": 23.48
      },
      {
        "date": "2017-02",
        "close": 33.77,
        "adjClose": 24.34
      },
      {
        "date": "2017-03",
        "close": 33.73,
        "adjClose": 24.38
      },
      {
        "date": "2017-04",
        "close": 34.03,
        "adjClose": 24.67
      },
      {
        "date": "2017-05",
        "close": 34.37,
        "adjClose": 24.99
      },
      {
        "date": "2017-06",
        "close": 34.51,
        "adjClose": 25.16
      },
      {
        "date": "2017-07",
        "close": 35.08,
        "adjClose": 25.65
      },
      {
        "date": "2017-08",
        "close": 35.01,
        "adjClose": 25.68
      },
      {
        "date": "2017-09",
        "close": 35.75,
        "adjClose": 26.29
      },
      {
        "date": "2017-10",
        "close": 36.38,
        "adjClose": 26.84
      },
      {
        "date": "2017-11",
        "close": 37.56,
        "adjClose": 27.79
      },
      {
        "date": "2017-12",
        "close": 37.94,
        "adjClose": 28.15
      },
      {
        "date": "2018-01",
        "close": 39.96,
        "adjClose": 29.73
      },
      {
        "date": "2018-02",
        "close": 38.41,
        "adjClose": 28.66
      },
      {
        "date": "2018-03",
        "close": 37.56,
        "adjClose": 28.11
      },
      {
        "date": "2018-04",
        "close": 37.56,
        "adjClose": 28.18
      },
      {
        "date": "2018-05",
        "close": 38.15,
        "adjClose": 28.71
      },
      {
        "date": "2018-06",
        "close": 38.39,
        "adjClose": 28.98
      },
      {
        "date": "2018-07",
        "close": 39.57,
        "adjClose": 29.95
      },
      {
        "date": "2018-08",
        "close": 40.71,
        "adjClose": 30.9
      },
      {
        "date": "2018-09",
        "close": 40.75,
        "adjClose": 31.02
      },
      {
        "date": "2018-10",
        "close": 37.72,
        "adjClose": 28.8
      },
      {
        "date": "2018-11",
        "close": 38.35,
        "adjClose": 29.37
      },
      {
        "date": "2018-12",
        "close": 34.69,
        "adjClose": 26.63
      },
      {
        "date": "2019-01",
        "close": 37.68,
        "adjClose": 29.01
      },
      {
        "date": "2019-02",
        "close": 38.92,
        "adjClose": 30.06
      },
      {
        "date": "2019-03",
        "close": 39.32,
        "adjClose": 30.45
      },
      {
        "date": "2019-04",
        "close": 40.84,
        "adjClose": 31.72
      },
      {
        "date": "2019-05",
        "close": 38.01,
        "adjClose": 29.61
      },
      {
        "date": "2019-06",
        "close": 40.69,
        "adjClose": 31.79
      },
      {
        "date": "2019-07",
        "close": 41.16,
        "adjClose": 32.25
      },
      {
        "date": "2019-08",
        "close": 40.06,
        "adjClose": 31.47
      },
      {
        "date": "2019-09",
        "close": 40.61,
        "adjClose": 32.0
      },
      {
        "date": "2019-10",
        "close": 41.28,
        "adjClose": 32.62
      },
      {
        "date": "2019-11",
        "close": 42.9,
        "adjClose": 34.0
      },
      {
        "date": "2019-12",
        "close": 43.93,
        "adjClose": 34.92
      },
      {
        "date": "2020-01",
        "close": 43.8,
        "adjClose": 34.91
      },
      {
        "date": "2020-02",
        "close": 40.1,
        "adjClose": 32.06
      },
      {
        "date": "2020-03",
        "close": 34.18,
        "adjClose": 27.4
      },
      {
        "date": "2020-04",
        "close": 38.96,
        "adjClose": 31.32
      },
      {
        "date": "2020-05",
        "close": 41.11,
        "adjClose": 33.15
      },
      {
        "date": "2020-06",
        "close": 41.78,
        "adjClose": 33.78
      },
      {
        "date": "2020-07",
        "close": 44.2,
        "adjClose": 35.84
      },
      {
        "date": "2020-08",
        "close": 46.87,
        "adjClose": 38.12
      },
      {
        "date": "2020-09",
        "close": 45.45,
        "adjClose": 37.07
      },
      {
        "date": "2020-10",
        "close": 44.57,
        "adjClose": 36.46
      },
      {
        "date": "2020-11",
        "close": 50.02,
        "adjClose": 41.03
      },
      {
        "date": "2020-12",
        "close": 52.04,
        "adjClose": 42.81
      },
      {
        "date": "2021-01",
        "close": 51.53,
        "adjClose": 42.51
      },
      {
        "date": "2021-02",
        "close": 53.11,
        "adjClose": 43.94
      },
      {
        "date": "2021-03",
        "close": 54.95,
        "adjClose": 45.6
      },
      {
        "date": "2021-04",
        "close": 57.57,
        "adjClose": 47.91
      },
      {
        "date": "2021-05",
        "close": 57.75,
        "adjClose": 48.19
      },
      {
        "date": "2021-06",
        "close": 58.83,
        "adjClose": 49.24
      },
      {
        "date": "2021-07",
        "close": 59.44,
        "adjClose": 49.89
      },
      {
        "date": "2021-08",
        "close": 60.95,
        "adjClose": 51.3
      },
      {
        "date": "2021-09",
        "close": 58.12,
        "adjClose": 49.07
      },
      {
        "date": "2021-10",
        "close": 61.64,
        "adjClose": 52.18
      },
      {
        "date": "2021-11",
        "close": 60.22,
        "adjClose": 51.13
      },
      {
        "date": "2021-12",
        "close": 62.35,
        "adjClose": 53.09
      },
      {
        "date": "2022-01",
        "close": 58.44,
        "adjClose": 49.9
      },
      {
        "date": "2022-02",
        "close": 57.14,
        "adjClose": 48.94
      },
      {
        "date": "2022-03",
        "close": 58.48,
        "adjClose": 50.22
      },
      {
        "date": "2022-04",
        "close": 53.07,
        "adjClose": 45.71
      },
      {
        "date": "2022-05",
        "close": 52.78,
        "adjClose": 45.59
      },
      {
        "date": "2022-06",
        "close": 48.15,
        "adjClose": 41.71
      },
      {
        "date": "2022-07",
        "close": 52.53,
        "adjClose": 45.64
      },
      {
        "date": "2022-08",
        "close": 50.69,
        "adjClose": 44.17
      },
      {
        "date": "2022-09",
        "close": 45.93,
        "adjClose": 40.13
      },
      {
        "date": "2022-10",
        "close": 49.61,
        "adjClose": 43.47
      },
      {
        "date": "2022-11",
        "close": 52.24,
        "adjClose": 45.91
      },
      {
        "date": "2022-12",
        "close": 49.11,
        "adjClose": 43.28
      },
      {
        "date": "2023-01",
        "close": 52.46,
        "adjClose": 46.36
      },
      {
        "date": "2023-02",
        "close": 50.91,
        "adjClose": 45.13
      },
      {
        "date": "2023-03",
        "close": 51.75,
        "adjClose": 46.0
      },
      {
        "date": "2023-04",
        "close": 51.8,
        "adjClose": 46.18
      },
      {
        "date": "2023-05",
        "close": 51.35,
        "adjClose": 45.92
      },
      {
        "date": "2023-06",
        "close": 54.87,
        "adjClose": 49.2
      },
      {
        "date": "2023-07",
        "close": 56.65,
        "adjClose": 50.94
      },
      {
        "date": "2023-08",
        "close": 55.31,
        "adjClose": 49.88
      },
      {
        "date": "2023-09",
        "close": 52.55,
        "adjClose": 47.53
      },
      {
        "date": "2023-10",
        "close": 50.66,
        "adjClose": 45.95
      },
      {
        "date": "2023-11",
        "close": 55.28,
        "adjClose": 50.28
      },
      {
        "date": "2023-12",
        "close": 58.37,
        "adjClose": 53.25
      },
      {
        "date": "2024-01",
        "close": 58.65,
        "adjClose": 53.66
      },
      {
        "date": "2024-02",
        "close": 61.42,
        "adjClose": 56.36
      },
      {
        "date": "2024-03",
        "close": 63.5,
        "adjClose": 58.43
      },
      {
        "date": "2024-04",
        "close": 60.5,
        "adjClose": 55.83
      },
      {
        "date": "2024-05",
        "close": 62.51,
        "adjClose": 57.84
      },
      {
        "date": "2024-06",
        "close": 63.46,
        "adjClose": 58.9
      },
      {
        "date": "2024-07",
        "close": 64.72,
        "adjClose": 60.23
      },
      {
        "date": "2024-08",
        "close": 66.04,
        "adjClose": 61.64
      },
      {
        "date": "2024-09",
        "close": 67.25,
        "adjClose": 62.96
      },
      {
        "date": "2024-10",
        "close": 66.57,
        "adjClose": 62.5
      },
      {
        "date": "2024-11",
        "close": 71.09,
        "adjClose": 66.93
      },
      {
        "date": "2024-12",
        "close": 67.99,
        "adjClose": 64.19
      },
      {
        "date": "2025-01",
        "close": 70.22,
        "adjClose": 66.49
      },
      {
        "date": "2025-02",
        "close": 68.77,
        "adjClose": 65.31
      },
      {
        "date": "2025-03",
        "close": 65.08,
        "adjClose": 61.98
      },
      {
        "date": "2025-04",
        "close": 64.2,
        "adjClose": 61.32
      },
      {
        "date": "2025-05",
        "close": 67.76,
        "adjClose": 64.91
      },
      {
        "date": "2025-06",
        "close": 70.71,
        "adjClose": 67.92
      },
      {
        "date": "2025-07",
        "close": 71.74,
        "adjClose": 69.12
      },
      {
        "date": "2025-08",
        "close": 73.04,
        "adjClose": 70.57
      },
      {
        "date": "2025-09",
        "close": 74.85,
        "adjClose": 72.52
      },
      {
        "date": "2025-10",
        "close": 75.61,
        "adjClose": 73.47
      },
      {
        "date": "2025-11",
        "close": 75.69,
        "adjClose": 73.76
      },
      {
        "date": "2025-12",
        "close": 75.66,
        "adjClose": 73.94
      },
      {
        "date": "2026-01",
        "close": 76.52,
        "adjClose": 75.0
      },
      {
        "date": "2026-02",
        "close": 76.56,
        "adjClose": 75.25
      },
      {
        "date": "2026-03",
        "close": 72.42,
        "adjClose": 71.38
      },
      {
        "date": "2026-04",
        "close": 78.14,
        "adjClose": 77.25
      },
      {
        "date": "2026-05",
        "close": 81.18,
        "adjClose": 80.48
      },
      {
        "date": "2026-06",
        "close": 81.01,
        "adjClose": 80.55
      },
      {
        "date": "2026-07",
        "close": 80.65,
        "adjClose": 80.42
      },
      {
        "date": "2026-08",
        "close": 82.5,
        "adjClose": 82.5
      }
    ]
  },
  {
    "id": "BND",
    "ticker": "BND",
    "name": "Vanguard Total Bond Market ETF",
    "assetClass": "US Total Investment Grade Bonds",
    "inception": "2007-04",
    "color": "#f97316",
    "expenseRatio": "0.03%",
    "yield": "3.35%",
    "data": [
      {
        "date": "2007-04",
        "close": 84.38,
        "adjClose": 44.19
      },
      {
        "date": "2007-05",
        "close": 84.09,
        "adjClose": 44.17
      },
      {
        "date": "2007-06",
        "close": 81.99,
        "adjClose": 43.18
      },
      {
        "date": "2007-07",
        "close": 82.72,
        "adjClose": 43.69
      },
      {
        "date": "2007-08",
        "close": 84.87,
        "adjClose": 44.95
      },
      {
        "date": "2007-09",
        "close": 85.91,
        "adjClose": 45.63
      },
      {
        "date": "2007-10",
        "close": 85.93,
        "adjClose": 45.76
      },
      {
        "date": "2007-11",
        "close": 88.46,
        "adjClose": 47.24
      },
      {
        "date": "2007-12",
        "close": 88.85,
        "adjClose": 47.58
      },
      {
        "date": "2008-01",
        "close": 91.29,
        "adjClose": 49.03
      },
      {
        "date": "2008-02",
        "close": 91.32,
        "adjClose": 49.18
      },
      {
        "date": "2008-03",
        "close": 92.92,
        "adjClose": 50.18
      },
      {
        "date": "2008-04",
        "close": 91.76,
        "adjClose": 49.69
      },
      {
        "date": "2008-05",
        "close": 90.41,
        "adjClose": 49.1
      },
      {
        "date": "2008-06",
        "close": 88.96,
        "adjClose": 48.45
      },
      {
        "date": "2008-07",
        "close": 89.62,
        "adjClose": 48.94
      },
      {
        "date": "2008-08",
        "close": 90.47,
        "adjClose": 49.54
      },
      {
        "date": "2008-09",
        "close": 91.86,
        "adjClose": 50.45
      },
      {
        "date": "2008-10",
        "close": 91.06,
        "adjClose": 50.15
      },
      {
        "date": "2008-11",
        "close": 93.01,
        "adjClose": 51.36
      },
      {
        "date": "2008-12",
        "close": 100.74,
        "adjClose": 55.79
      },
      {
        "date": "2009-01",
        "close": 99.91,
        "adjClose": 55.48
      },
      {
        "date": "2009-02",
        "close": 97.23,
        "adjClose": 54.14
      },
      {
        "date": "2009-03",
        "close": 97.55,
        "adjClose": 54.48
      },
      {
        "date": "2009-04",
        "close": 96.71,
        "adjClose": 54.15
      },
      {
        "date": "2009-05",
        "close": 94.07,
        "adjClose": 52.82
      },
      {
        "date": "2009-06",
        "close": 91.04,
        "adjClose": 51.26
      },
      {
        "date": "2009-07",
        "close": 92.15,
        "adjClose": 52.04
      },
      {
        "date": "2009-08",
        "close": 91.96,
        "adjClose": 52.07
      },
      {
        "date": "2009-09",
        "close": 93.28,
        "adjClose": 52.97
      },
      {
        "date": "2009-10",
        "close": 93.36,
        "adjClose": 53.16
      },
      {
        "date": "2009-11",
        "close": 93.29,
        "adjClose": 53.27
      },
      {
        "date": "2009-12",
        "close": 91.97,
        "adjClose": 52.66
      },
      {
        "date": "2010-01",
        "close": 91.03,
        "adjClose": 52.27
      },
      {
        "date": "2010-02",
        "close": 91.33,
        "adjClose": 52.59
      },
      {
        "date": "2010-03",
        "close": 91.08,
        "adjClose": 52.59
      },
      {
        "date": "2010-04",
        "close": 90.3,
        "adjClose": 52.28
      },
      {
        "date": "2010-05",
        "close": 93.24,
        "adjClose": 54.14
      },
      {
        "date": "2010-06",
        "close": 94.78,
        "adjClose": 55.19
      },
      {
        "date": "2010-07",
        "close": 96.12,
        "adjClose": 56.12
      },
      {
        "date": "2010-08",
        "close": 98.32,
        "adjClose": 57.57
      },
      {
        "date": "2010-09",
        "close": 98.64,
        "adjClose": 57.92
      },
      {
        "date": "2010-10",
        "close": 99.4,
        "adjClose": 58.52
      },
      {
        "date": "2010-11",
        "close": 97.69,
        "adjClose": 57.68
      },
      {
        "date": "2010-12",
        "close": 93.78,
        "adjClose": 55.52
      },
      {
        "date": "2011-01",
        "close": 93.07,
        "adjClose": 55.26
      },
      {
        "date": "2011-02",
        "close": 91.75,
        "adjClose": 54.63
      },
      {
        "date": "2011-03",
        "close": 92.93,
        "adjClose": 55.49
      },
      {
        "date": "2011-04",
        "close": 92.59,
        "adjClose": 55.44
      },
      {
        "date": "2011-05",
        "close": 94.6,
        "adjClose": 56.8
      },
      {
        "date": "2011-06",
        "close": 95.79,
        "adjClose": 57.67
      },
      {
        "date": "2011-07",
        "close": 95.76,
        "adjClose": 57.82
      },
      {
        "date": "2011-08",
        "close": 100.75,
        "adjClose": 61.0
      },
      {
        "date": "2011-09",
        "close": 103.07,
        "adjClose": 62.58
      },
      {
        "date": "2011-10",
        "close": 101.64,
        "adjClose": 61.88
      },
      {
        "date": "2011-11",
        "close": 102.61,
        "adjClose": 62.64
      },
      {
        "date": "2011-12",
        "close": 102.72,
        "adjClose": 62.89
      },
      {
        "date": "2012-01",
        "close": 102.68,
        "adjClose": 63.04
      },
      {
        "date": "2012-02",
        "close": 102.56,
        "adjClose": 63.14
      },
      {
        "date": "2012-03",
        "close": 100.9,
        "adjClose": 62.29
      },
      {
        "date": "2012-04",
        "close": 101.71,
        "adjClose": 62.97
      },
      {
        "date": "2012-05",
        "close": 103.5,
        "adjClose": 64.26
      },
      {
        "date": "2012-06",
        "close": 104.76,
        "adjClose": 65.22
      },
      {
        "date": "2012-07",
        "close": 105.32,
        "adjClose": 65.75
      },
      {
        "date": "2012-08",
        "close": 103.98,
        "adjClose": 65.09
      },
      {
        "date": "2012-09",
        "close": 103.52,
        "adjClose": 64.99
      },
      {
        "date": "2012-10",
        "close": 103.15,
        "adjClose": 64.94
      },
      {
        "date": "2012-11",
        "close": 103.79,
        "adjClose": 65.52
      },
      {
        "date": "2012-12",
        "close": 103.1,
        "adjClose": 65.27
      },
      {
        "date": "2013-01",
        "close": 101.49,
        "adjClose": 64.43
      },
      {
        "date": "2013-02",
        "close": 100.84,
        "adjClose": 64.19
      },
      {
        "date": "2013-03",
        "close": 100.87,
        "adjClose": 64.39
      },
      {
        "date": "2013-04",
        "close": 102.26,
        "adjClose": 65.46
      },
      {
        "date": "2013-05",
        "close": 100.82,
        "adjClose": 64.72
      },
      {
        "date": "2013-06",
        "close": 97.91,
        "adjClose": 63.03
      },
      {
        "date": "2013-07",
        "close": 95.78,
        "adjClose": 61.83
      },
      {
        "date": "2013-08",
        "close": 94.56,
        "adjClose": 61.21
      },
      {
        "date": "2013-09",
        "close": 94.02,
        "adjClose": 61.03
      },
      {
        "date": "2013-10",
        "close": 95.31,
        "adjClose": 62.04
      },
      {
        "date": "2013-11",
        "close": 94.54,
        "adjClose": 61.72
      },
      {
        "date": "2013-12",
        "close": 93.22,
        "adjClose": 61.02
      },
      {
        "date": "2014-01",
        "close": 93.47,
        "adjClose": 61.35
      },
      {
        "date": "2014-02",
        "close": 94.47,
        "adjClose": 62.19
      },
      {
        "date": "2014-03",
        "close": 94.35,
        "adjClose": 62.28
      },
      {
        "date": "2014-04",
        "close": 94.37,
        "adjClose": 62.47
      },
      {
        "date": "2014-05",
        "close": 95.38,
        "adjClose": 63.31
      },
      {
        "date": "2014-06",
        "close": 95.03,
        "adjClose": 63.25
      },
      {
        "date": "2014-07",
        "close": 95.4,
        "adjClose": 63.68
      },
      {
        "date": "2014-08",
        "close": 96.19,
        "adjClose": 64.38
      },
      {
        "date": "2014-09",
        "close": 95.33,
        "adjClose": 63.99
      },
      {
        "date": "2014-10",
        "close": 96.91,
        "adjClose": 65.23
      },
      {
        "date": "2014-11",
        "close": 96.61,
        "adjClose": 65.21
      },
      {
        "date": "2014-12",
        "close": 97.39,
        "adjClose": 65.92
      },
      {
        "date": "2015-01",
        "close": 99.7,
        "adjClose": 67.67
      },
      {
        "date": "2015-02",
        "close": 98.84,
        "adjClose": 67.27
      },
      {
        "date": "2015-03",
        "close": 98.28,
        "adjClose": 67.08
      },
      {
        "date": "2015-04",
        "close": 98.9,
        "adjClose": 67.69
      },
      {
        "date": "2015-05",
        "close": 96.86,
        "adjClose": 66.48
      },
      {
        "date": "2015-06",
        "close": 95.61,
        "adjClose": 65.8
      },
      {
        "date": "2015-07",
        "close": 95.82,
        "adjClose": 66.13
      },
      {
        "date": "2015-08",
        "close": 96.81,
        "adjClose": 67.01
      },
      {
        "date": "2015-09",
        "close": 96.72,
        "adjClose": 67.13
      },
      {
        "date": "2015-10",
        "close": 97.34,
        "adjClose": 67.75
      },
      {
        "date": "2015-11",
        "close": 95.86,
        "adjClose": 66.9
      },
      {
        "date": "2015-12",
        "close": 95.92,
        "adjClose": 67.13
      },
      {
        "date": "2016-01",
        "close": 96.9,
        "adjClose": 68.01
      },
      {
        "date": "2016-02",
        "close": 99.05,
        "adjClose": 69.71
      },
      {
        "date": "2016-03",
        "close": 98.1,
        "adjClose": 69.24
      },
      {
        "date": "2016-04",
        "close": 98.57,
        "adjClose": 69.76
      },
      {
        "date": "2016-05",
        "close": 98.45,
        "adjClose": 69.87
      },
      {
        "date": "2016-06",
        "close": 99.58,
        "adjClose": 70.87
      },
      {
        "date": "2016-07",
        "close": 100.48,
        "adjClose": 71.71
      },
      {
        "date": "2016-08",
        "close": 99.87,
        "adjClose": 71.47
      },
      {
        "date": "2016-09",
        "close": 99.2,
        "adjClose": 71.2
      },
      {
        "date": "2016-10",
        "close": 98.1,
        "adjClose": 70.6
      },
      {
        "date": "2016-11",
        "close": 95.18,
        "adjClose": 68.69
      },
      {
        "date": "2016-12",
        "close": 92.59,
        "adjClose": 67.01
      },
      {
        "date": "2017-01",
        "close": 92.94,
        "adjClose": 67.45
      },
      {
        "date": "2017-02",
        "close": 92.94,
        "adjClose": 67.64
      },
      {
        "date": "2017-03",
        "close": 92.45,
        "adjClose": 67.47
      },
      {
        "date": "2017-04",
        "close": 93.63,
        "adjClose": 68.52
      },
      {
        "date": "2017-05",
        "close": 93.55,
        "adjClose": 68.65
      },
      {
        "date": "2017-06",
        "close": 94.24,
        "adjClose": 69.35
      },
      {
        "date": "2017-07",
        "close": 93.24,
        "adjClose": 68.81
      },
      {
        "date": "2017-08",
        "close": 93.93,
        "adjClose": 69.51
      },
      {
        "date": "2017-09",
        "close": 93.91,
        "adjClose": 69.69
      },
      {
        "date": "2017-10",
        "close": 92.69,
        "adjClose": 68.98
      },
      {
        "date": "2017-11",
        "close": 92.68,
        "adjClose": 69.16
      },
      {
        "date": "2017-12",
        "close": 92.26,
        "adjClose": 69.04
      },
      {
        "date": "2018-01",
        "close": 90.94,
        "adjClose": 68.25
      },
      {
        "date": "2018-02",
        "close": 88.98,
        "adjClose": 66.96
      },
      {
        "date": "2018-03",
        "close": 89.08,
        "adjClose": 67.22
      },
      {
        "date": "2018-04",
        "close": 88.84,
        "adjClose": 67.22
      },
      {
        "date": "2018-05",
        "close": 88.09,
        "adjClose": 66.85
      },
      {
        "date": "2018-06",
        "close": 88.5,
        "adjClose": 67.34
      },
      {
        "date": "2018-07",
        "close": 88.6,
        "adjClose": 67.6
      },
      {
        "date": "2018-08",
        "close": 88.56,
        "adjClose": 67.77
      },
      {
        "date": "2018-09",
        "close": 87.8,
        "adjClose": 67.37
      },
      {
        "date": "2018-10",
        "close": 86.79,
        "adjClose": 66.78
      },
      {
        "date": "2018-11",
        "close": 86.97,
        "adjClose": 67.11
      },
      {
        "date": "2018-12",
        "close": 88.84,
        "adjClose": 68.74
      },
      {
        "date": "2019-01",
        "close": 89.61,
        "adjClose": 69.53
      },
      {
        "date": "2019-02",
        "close": 89.76,
        "adjClose": 69.84
      },
      {
        "date": "2019-03",
        "close": 90.45,
        "adjClose": 70.57
      },
      {
        "date": "2019-04",
        "close": 90.66,
        "adjClose": 70.93
      },
      {
        "date": "2019-05",
        "close": 91.48,
        "adjClose": 71.78
      },
      {
        "date": "2019-06",
        "close": 93.73,
        "adjClose": 73.75
      },
      {
        "date": "2019-07",
        "close": 96.65,
        "adjClose": 76.26
      },
      {
        "date": "2019-08",
        "close": 96.52,
        "adjClose": 76.37
      },
      {
        "date": "2019-09",
        "close": 95.87,
        "adjClose": 76.07
      },
      {
        "date": "2019-10",
        "close": 95.67,
        "adjClose": 76.12
      },
      {
        "date": "2019-11",
        "close": 94.83,
        "adjClose": 75.66
      },
      {
        "date": "2019-12",
        "close": 94.35,
        "adjClose": 75.49
      },
      {
        "date": "2020-01",
        "close": 94.95,
        "adjClose": 76.18
      },
      {
        "date": "2020-02",
        "close": 96.67,
        "adjClose": 77.78
      },
      {
        "date": "2020-03",
        "close": 101.08,
        "adjClose": 81.55
      },
      {
        "date": "2020-04",
        "close": 102.46,
        "adjClose": 82.9
      },
      {
        "date": "2020-05",
        "close": 102.15,
        "adjClose": 82.88
      },
      {
        "date": "2020-06",
        "close": 101.47,
        "adjClose": 82.56
      },
      {
        "date": "2020-07",
        "close": 102.09,
        "adjClose": 83.29
      },
      {
        "date": "2020-08",
        "close": 101.63,
        "adjClose": 83.15
      },
      {
        "date": "2020-09",
        "close": 101.18,
        "adjClose": 83.01
      },
      {
        "date": "2020-10",
        "close": 100.12,
        "adjClose": 82.37
      },
      {
        "date": "2020-11",
        "close": 99.31,
        "adjClose": 81.93
      },
      {
        "date": "2020-12",
        "close": 98.66,
        "adjClose": 81.62
      },
      {
        "date": "2021-01",
        "close": 97.35,
        "adjClose": 80.76
      },
      {
        "date": "2021-02",
        "close": 95.86,
        "adjClose": 79.75
      },
      {
        "date": "2021-03",
        "close": 93.18,
        "adjClose": 77.74
      },
      {
        "date": "2021-04",
        "close": 92.84,
        "adjClose": 77.67
      },
      {
        "date": "2021-05",
        "close": 92.85,
        "adjClose": 77.89
      },
      {
        "date": "2021-06",
        "close": 93.41,
        "adjClose": 78.59
      },
      {
        "date": "2021-07",
        "close": 94.67,
        "adjClose": 79.87
      },
      {
        "date": "2021-08",
        "close": 94.79,
        "adjClose": 80.19
      },
      {
        "date": "2021-09",
        "close": 93.99,
        "adjClose": 79.74
      },
      {
        "date": "2021-10",
        "close": 92.36,
        "adjClose": 78.57
      },
      {
        "date": "2021-11",
        "close": 92.36,
        "adjClose": 78.79
      },
      {
        "date": "2021-12",
        "close": 92.85,
        "adjClose": 79.43
      },
      {
        "date": "2022-01",
        "close": 90.69,
        "adjClose": 77.8
      },
      {
        "date": "2022-02",
        "close": 89.42,
        "adjClose": 76.92
      },
      {
        "date": "2022-03",
        "close": 87.98,
        "adjClose": 75.89
      },
      {
        "date": "2022-04",
        "close": 83.81,
        "adjClose": 72.5
      },
      {
        "date": "2022-05",
        "close": 82.82,
        "adjClose": 71.85
      },
      {
        "date": "2022-06",
        "close": 81.31,
        "adjClose": 70.73
      },
      {
        "date": "2022-07",
        "close": 82.75,
        "adjClose": 72.18
      },
      {
        "date": "2022-08",
        "close": 82.72,
        "adjClose": 72.36
      },
      {
        "date": "2022-09",
        "close": 78.85,
        "adjClose": 69.17
      },
      {
        "date": "2022-10",
        "close": 76.14,
        "adjClose": 66.98
      },
      {
        "date": "2022-11",
        "close": 76.7,
        "adjClose": 67.66
      },
      {
        "date": "2022-12",
        "close": 78.28,
        "adjClose": 69.25
      },
      {
        "date": "2023-01",
        "close": 78.83,
        "adjClose": 69.93
      },
      {
        "date": "2023-02",
        "close": 77.54,
        "adjClose": 68.97
      },
      {
        "date": "2023-03",
        "close": 78.09,
        "adjClose": 69.66
      },
      {
        "date": "2023-04",
        "close": 79.28,
        "adjClose": 70.92
      },
      {
        "date": "2023-05",
        "close": 78.64,
        "adjClose": 70.54
      },
      {
        "date": "2023-06",
        "close": 77.59,
        "adjClose": 69.79
      },
      {
        "date": "2023-07",
        "close": 76.75,
        "adjClose": 69.23
      },
      {
        "date": "2023-08",
        "close": 75.24,
        "adjClose": 68.05
      },
      {
        "date": "2023-09",
        "close": 74.1,
        "adjClose": 67.22
      },
      {
        "date": "2023-10",
        "close": 71.84,
        "adjClose": 65.34
      },
      {
        "date": "2023-11",
        "close": 73.53,
        "adjClose": 67.07
      },
      {
        "date": "2023-12",
        "close": 76.25,
        "adjClose": 69.74
      },
      {
        "date": "2024-01",
        "close": 76.06,
        "adjClose": 69.76
      },
      {
        "date": "2024-02",
        "close": 75.25,
        "adjClose": 69.21
      },
      {
        "date": "2024-03",
        "close": 75.3,
        "adjClose": 69.45
      },
      {
        "date": "2024-04",
        "close": 73.5,
        "adjClose": 67.98
      },
      {
        "date": "2024-05",
        "close": 73.9,
        "adjClose": 68.54
      },
      {
        "date": "2024-06",
        "close": 74.91,
        "adjClose": 69.68
      },
      {
        "date": "2024-07",
        "close": 75.31,
        "adjClose": 70.24
      },
      {
        "date": "2024-08",
        "close": 77.5,
        "adjClose": 72.49
      },
      {
        "date": "2024-09",
        "close": 78.41,
        "adjClose": 73.54
      },
      {
        "date": "2024-10",
        "close": 76.2,
        "adjClose": 71.67
      },
      {
        "date": "2024-11",
        "close": 74.77,
        "adjClose": 70.52
      },
      {
        "date": "2024-12",
        "close": 74.67,
        "adjClose": 70.62
      },
      {
        "date": "2025-01",
        "close": 73.39,
        "adjClose": 69.61
      },
      {
        "date": "2025-02",
        "close": 74.46,
        "adjClose": 70.82
      },
      {
        "date": "2025-03",
        "close": 75.48,
        "adjClose": 71.99
      },
      {
        "date": "2025-04",
        "close": 75.54,
        "adjClose": 72.24
      },
      {
        "date": "2025-05",
        "close": 74.81,
        "adjClose": 71.75
      },
      {
        "date": "2025-06",
        "close": 75.1,
        "adjClose": 72.23
      },
      {
        "date": "2025-07",
        "close": 75.11,
        "adjClose": 72.44
      },
      {
        "date": "2025-08",
        "close": 75.9,
        "adjClose": 73.41
      },
      {
        "date": "2025-09",
        "close": 76.75,
        "adjClose": 74.43
      },
      {
        "date": "2025-10",
        "close": 77.14,
        "adjClose": 75.02
      },
      {
        "date": "2025-11",
        "close": 77.01,
        "adjClose": 75.11
      },
      {
        "date": "2025-12",
        "close": 76.78,
        "adjClose": 75.08
      },
      {
        "date": "2026-01",
        "close": 76.42,
        "adjClose": 74.95
      },
      {
        "date": "2026-02",
        "close": 76.94,
        "adjClose": 75.66
      },
      {
        "date": "2026-03",
        "close": 76.29,
        "adjClose": 75.24
      },
      {
        "date": "2026-04",
        "close": 75.95,
        "adjClose": 75.11
      },
      {
        "date": "2026-05",
        "close": 75.1,
        "adjClose": 74.48
      },
      {
        "date": "2026-06",
        "close": 75.23,
        "adjClose": 74.81
      },
      {
        "date": "2026-07",
        "close": 74.57,
        "adjClose": 74.36
      },
      {
        "date": "2026-08",
        "close": 74.2,
        "adjClose": 74.2
      }
    ]
  }
];

export default PRESET_BENCHMARKS;
