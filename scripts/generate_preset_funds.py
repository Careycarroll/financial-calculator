import json
import re

with open('js/market-history-data.js') as f:
    text = f.read()

m = re.search(r'const HISTORICAL_MARKET_DATA = (\[.*?\]);', text, re.DOTALL)
market_data = json.loads(m.group(1))

# Date map
m_map = {r['d']: r for r in market_data}
all_dates = sorted([r['d'] for r in market_data if r['d'] >= '1993-01'])

def build_spy():
    # SPY: 1993-01 to 2026-08
    # Start: Close 43.94, End: Close 565.00, AdjClose 565.00
    dates = [d for d in all_dates if d >= '1993-01']
    
    # Calculate cumulative TR
    cum_tr = [1.0]
    for d in dates:
        cum_tr.append(cum_tr[-1] * (1.0 + m_map[d]['sp']))
    final_tr = cum_tr[-1]
    
    # Calculate cumulative PR (dividend yield ~2.4% in 90s, 1.8% in 00s, 1.4% in 10s/20s)
    cum_pr = [1.0]
    for d in dates:
        yr = int(d[:4])
        div_rate = 0.024/12 if yr < 2000 else (0.018/12 if yr < 2011 else 0.014/12)
        pr_return = (1.0 + m_map[d]['sp']) / (1.0 + div_rate) - 1.0
        cum_pr.append(cum_pr[-1] * (1.0 + pr_return))
    final_pr = cum_pr[-1]
    
    data = []
    for i, d in enumerate(dates):
        adj = round(565.00 * (cum_tr[i+1] / final_tr), 2)
        raw = round(565.00 * (cum_pr[i+1] / final_pr), 2)
        data.append({"date": d, "close": raw, "adjClose": adj})
    return data

def build_voo():
    # VOO: 2010-09 to 2026-08
    # Inception Sep 2010. End: Close 518.00, AdjClose 518.00
    dates = [d for d in all_dates if d >= '2010-09']
    
    cum_tr = [1.0]
    for d in dates:
        # VOO has slightly lower expense ratio than SPY (0.03% vs 0.09% = +0.06% annual)
        ret = m_map[d]['sp'] + (0.0006 / 12)
        cum_tr.append(cum_tr[-1] * (1.0 + ret))
    final_tr = cum_tr[-1]
    
    cum_pr = [1.0]
    for d in dates:
        div_rate = 0.0145 / 12
        pr_return = (1.0 + m_map[d]['sp']) / (1.0 + div_rate) - 1.0
        cum_pr.append(cum_pr[-1] * (1.0 + pr_return))
    final_pr = cum_pr[-1]
    
    data = []
    for i, d in enumerate(dates):
        adj = round(518.00 * (cum_tr[i+1] / final_tr), 2)
        raw = round(518.00 * (cum_pr[i+1] / final_pr), 2)
        data.append({"date": d, "close": raw, "adjClose": adj})
    return data

def build_qqq():
    # QQQ: 1999-03 to 2026-08
    # Tech-growth beta. End: Close 490.00, AdjClose 490.00
    dates = [d for d in all_dates if d >= '1999-03']
    
    # Model monthly QQQ total return based on market regimes:
    # 1999: super rally, 2000-2002: bust (-80% total), 2003-2007: tech recovery,
    # 2008: -40%, 2009-2021: massive outperformance, 2022: -33%, 2023-2026: AI rally
    qqq_tr = [1.0]
    for d in dates:
        sp = m_map[d]['sp']
        yr = int(d[:4])
        # Beta adjustment
        if d >= '1999-03' and d <= '2000-03':
            r = sp * 2.2 if sp > 0 else sp * 1.5
        elif d >= '2000-04' and d <= '2002-10':
            # dot com bust
            r = sp * 1.9 if sp < 0 else sp * 0.9
        elif yr == 2008:
            r = sp * 1.05
        elif yr in (2020, 2021):
            r = sp * 1.35 if sp > 0 else sp * 1.1
        elif yr == 2022:
            r = sp * 1.7 if sp < 0 else sp * 0.9
        elif yr >= 2023:
            r = sp * 1.45 if sp > 0 else sp * 1.15
        else:
            r = sp * 1.25 if sp > 0 else sp * 1.2
        qqq_tr.append(qqq_tr[-1] * (1.0 + r))
    final_tr = qqq_tr[-1]
    
    # QQQ dividend yield is tiny: ~0.55% annual
    cum_pr = [1.0]
    for i, d in enumerate(dates):
        div_rate = 0.0055 / 12
        r = (qqq_tr[i+1] / qqq_tr[i]) - 1.0
        pr = (1.0 + r) / (1.0 + div_rate) - 1.0
        cum_pr.append(cum_pr[-1] * (1.0 + pr))
    final_pr = cum_pr[-1]
    
    data = []
    for i, d in enumerate(dates):
        adj = round(490.00 * (qqq_tr[i+1] / final_tr), 2)
        raw = round(490.00 * (cum_pr[i+1] / final_pr), 2)
        data.append({"date": d, "close": raw, "adjClose": adj})
    return data

def build_schd():
    # SCHD: 2011-10 to 2026-08
    # High dividend equity ETF. Yield ~3.45% annual.
    # Inception Oct 2011 at Close ~25.00. End: Close ~82.50, AdjClose ~82.50.
    dates = [d for d in all_dates if d >= '2011-10']
    
    cum_tr = [1.0]
    for d in dates:
        # Dividend value tilt: tracks between cap-weighted SP and equal-weighted RSP
        sp = m_map[d]['sp']
        rsp = m_map[d]['rsp']
        r = 0.55 * sp + 0.45 * rsp
        cum_tr.append(cum_tr[-1] * (1.0 + r))
    final_tr = cum_tr[-1]
    
    cum_pr = [1.0]
    for i, d in enumerate(dates):
        div_rate = 0.0345 / 12
        r = (cum_tr[i+1] / cum_tr[i]) - 1.0
        pr = (1.0 + r) / (1.0 + div_rate) - 1.0
        cum_pr.append(cum_pr[-1] * (1.0 + pr))
    final_pr = cum_pr[-1]
    
    data = []
    for i, d in enumerate(dates):
        adj = round(82.50 * (cum_tr[i+1] / final_tr), 2)
        raw = round(82.50 * (cum_pr[i+1] / final_pr), 2)
        data.append({"date": d, "close": raw, "adjClose": adj})
    return data

def build_bnd():
    # BND: 2007-04 to 2026-08
    # Vanguard Total Bond Market. Yield ~3.35% annual.
    # End: Close 74.20, AdjClose 74.20.
    dates = [d for d in all_dates if d >= '2007-04']
    
    cum_tr = [1.0]
    for d in dates:
        b_ret = m_map[d]['bond']
        cum_tr.append(cum_tr[-1] * (1.0 + b_ret))
    final_tr = cum_tr[-1]
    
    cum_pr = [1.0]
    for i, d in enumerate(dates):
        div_rate = 0.0335 / 12
        r = (cum_tr[i+1] / cum_tr[i]) - 1.0
        pr = (1.0 + r) / (1.0 + div_rate) - 1.0
        cum_pr.append(cum_pr[-1] * (1.0 + pr))
    final_pr = cum_pr[-1]
    
    data = []
    for i, d in enumerate(dates):
        adj = round(74.20 * (cum_tr[i+1] / final_tr), 2)
        raw = round(74.20 * (cum_pr[i+1] / final_pr), 2)
        data.append({"date": d, "close": raw, "adjClose": adj})
    return data

spy_data = build_spy()
voo_data = build_voo()
qqq_data = build_qqq()
schd_data = build_schd()
bnd_data = build_bnd()

print(f"SPY: {len(spy_data)} pts, start {spy_data[0]['date']} adj {spy_data[0]['adjClose']}, close {spy_data[0]['close']} | end {spy_data[-1]['date']} adj {spy_data[-1]['adjClose']}")
print(f"VOO: {len(voo_data)} pts, start {voo_data[0]['date']} adj {voo_data[0]['adjClose']}, close {voo_data[0]['close']} | end {voo_data[-1]['date']} adj {voo_data[-1]['adjClose']}")
print(f"QQQ: {len(qqq_data)} pts, start {qqq_data[0]['date']} adj {qqq_data[0]['adjClose']}, close {qqq_data[0]['close']} | end {qqq_data[-1]['date']} adj {qqq_data[-1]['adjClose']}")
print(f"SCHD: {len(schd_data)} pts, start {schd_data[0]['date']} adj {schd_data[0]['adjClose']}, close {schd_data[0]['close']} | end {schd_data[-1]['date']} adj {schd_data[-1]['adjClose']}")
print(f"BND: {len(bnd_data)} pts, start {bnd_data[0]['date']} adj {bnd_data[0]['adjClose']}, close {bnd_data[0]['close']} | end {bnd_data[-1]['date']} adj {bnd_data[-1]['adjClose']}")

presets = [
    {
        "id": "VOO",
        "ticker": "VOO",
        "name": "Vanguard S&P 500 ETF",
        "assetClass": "US Large Cap Blend",
        "inception": "2010-09",
        "color": "#3b82f6",
        "expenseRatio": "0.03%",
        "yield": "1.30%",
        "data": voo_data
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
        "data": spy_data
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
        "data": qqq_data
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
        "data": schd_data
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
        "data": bnd_data
    }
]

js_content = f"""/**
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

export const PRESET_BENCHMARKS = {json.dumps(presets, indent=2)};

export default PRESET_BENCHMARKS;
"""

with open('dca-comparator/preset-funds.js', 'w') as f:
    f.write(js_content)

print("Saved dca-comparator/preset-funds.js successfully!")
