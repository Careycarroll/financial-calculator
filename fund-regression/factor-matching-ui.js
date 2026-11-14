/**
 * Factor Exposure Matching & Risk Parity UI Controller
 * 
 * Manages:
 * - Target factor loading configuration and pre-built target fund presets
 * - Constrained quadratic optimization to find optimal replicating ETF weights
 * - High-DPI canvas comparison bar chart (Target Betas vs Synthetic Portfolio Betas)
 * - Risk Factor Parity (Equal Risk Contribution) allocation mode
 * - Strictly conforms to window.CHART_FONTS constants, AbortController, and rafThrottle
 */

import {
  solveMatchExposures,
  solveFactorRiskParity,
  CANDIDATE_ETF_POOL,
  TARGET_PRESETS
} from './matching-engine.js';

function rafThrottle(fn) {
  let ticking = false;
  return function (...args) {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
    }
  };
}

export { CANDIDATE_ETF_POOL, TARGET_PRESETS };

const FACTOR_NAMES = [
  'Market (β_MKT)',
  'Size (β_SMB)',
  'Value (β_HML)',
  'Profitability (β_RMW)',
  'Investment (β_CMA)',
  'Momentum (β_MOM)'
];

// -------------------------------------------------------------------
// 2. State & Setup
// -------------------------------------------------------------------

const state = {
  mode: 'match', // 'match' | 'risk-parity'
  activePreset: 'berkshire',
  selectedEtfIds: new Set(['SPY', 'QQQ', 'IJS', 'VTV', 'VUG', 'BND', 'BIL']),
  optimizationResult: null,
  chartController: null
};

document.addEventListener('DOMContentLoaded', () => {
  wireExecutiveGuideToggle();
  wireModeControl();
  wirePresetButtons();
  renderCandidateCheckboxes();
  wireInputsAndRun();
  wireExportButtons();
  wireResizeHandler();

  runOptimization();
});

function wireExecutiveGuideToggle() {
  const toggle = document.getElementById('executive-guide-toggle');
  const body = document.getElementById('executive-guide-body');
  const arrow = document.getElementById('executive-guide-arrow');

  if (toggle && body && arrow) {
    toggle.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      toggle.classList.toggle('open', !isOpen);
      arrow.classList.toggle('open', !isOpen);
    });
  }
}

function wireModeControl() {
  const control = document.getElementById('matching-mode-control');
  if (!control) return;

  control.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;

    control.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.mode = btn.getAttribute('data-mode') || 'match';

    const targetSection = document.getElementById('target-inputs-section');
    const presetsSection = document.getElementById('target-presets-section');
    if (state.mode === 'risk-parity') {
      if (targetSection) targetSection.style.display = 'none';
      if (presetsSection) presetsSection.style.display = 'none';
      document.getElementById('chart-comparison-title').textContent = '⚖️ Factor Risk Parity: Capital vs. Risk Contribution';
      document.getElementById('chart-comparison-subtitle').textContent = 'Compares optimal capital allocation weight (%) vs marginal risk contribution (%) across assets.';
      document.getElementById('table-allocation-title').textContent = '📋 Equal Risk Contribution (ERC) Portfolio Weights';
    } else {
      if (targetSection) targetSection.style.display = 'block';
      if (presetsSection) presetsSection.style.display = 'block';
      document.getElementById('chart-comparison-title').textContent = '⚖️ Target vs. Replicated Synthetic Factor Exposures';
      document.getElementById('chart-comparison-subtitle').textContent = 'Side-by-side comparison of target factor beta loadings vs. the optimized synthetic portfolio beta loadings.';
      document.getElementById('table-allocation-title').textContent = '📋 Optimal Replicating ETF Portfolio Allocations';
    }
    runOptimization();
  });
}

function wirePresetButtons() {
  const container = document.getElementById('preset-buttons-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-chip-btn');
    if (!btn) return;

    container.querySelectorAll('.preset-chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const presetKey = btn.getAttribute('data-preset');
    state.activePreset = presetKey;
    applyTargetPreset(presetKey);
    runOptimization();
  });
}

function applyTargetPreset(key) {
  const p = TARGET_PRESETS[key] || TARGET_PRESETS['berkshire'];
  const ids = ['input-beta-mkt', 'input-beta-smb', 'input-beta-hml', 'input-beta-rmw', 'input-beta-cma', 'input-beta-mom'];
  p.betas.forEach((val, idx) => {
    const el = document.getElementById(ids[idx]);
    if (el) el.value = val.toFixed(2);
  });
}

function renderCandidateCheckboxes() {
  const container = document.getElementById('candidate-checkboxes-container');
  if (!container) return;

  container.innerHTML = CANDIDATE_ETF_POOL.map(etf => `
    <label class="candidate-check-item">
      <input type="checkbox" value="${etf.id}" ${state.selectedEtfIds.has(etf.id) ? 'checked' : ''} />
      <span><strong>${etf.id}</strong> <small style="color:#94a3b8;">(${etf.expenseRatio})</small></span>
    </label>
  `).join('');

  container.querySelectorAll('input[type="checkbox"]').forEach(box => {
    box.addEventListener('change', () => {
      const id = box.value;
      if (box.checked) {
        state.selectedEtfIds.add(id);
      } else {
        if (state.selectedEtfIds.size > 2) {
          state.selectedEtfIds.delete(id);
        } else {
          box.checked = true; // Maintain at least 2 funds
        }
      }
      runOptimization();
    });
  });
}

function wireInputsAndRun() {
  document.getElementById('btn-run-matching-opt')?.addEventListener('click', runOptimization);
  const inputIds = ['input-beta-mkt', 'input-beta-smb', 'input-beta-hml', 'input-beta-rmw', 'input-beta-cma', 'input-beta-mom'];
  inputIds.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      document.querySelectorAll('.preset-chip-btn').forEach(b => b.classList.remove('active'));
      runOptimization();
    });
  });
}

function wireResizeHandler() {
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (state.optimizationResult) {
        renderComparisonChart(state.optimizationResult);
      }
    }, 250);
  });
}

function wireExportButtons() {
  document.getElementById('btn-export-weights-csv')?.addEventListener('click', exportWeightsCSV);
}

// -------------------------------------------------------------------
// 3. Main Optimization Routine
// -------------------------------------------------------------------

export function runOptimization() {
  const candidateFunds = CANDIDATE_ETF_POOL.filter(etf => state.selectedEtfIds.has(etf.id));
  if (candidateFunds.length < 2) return;

  if (state.mode === 'match') {
    // Read target betas from inputs
    const ids = ['input-beta-mkt', 'input-beta-smb', 'input-beta-hml', 'input-beta-rmw', 'input-beta-cma', 'input-beta-mom'];
    const targetBetas = ids.map(id => parseFloat(document.getElementById(id)?.value) || 0);

    // Build candidate matrix B (6 rows x M cols)
    const M = candidateFunds.length;
    const candidateMatrix = Array.from({ length: 6 }, (_, k) => {
      const row = new Float64Array(M);
      for (let j = 0; j < M; j++) {
        row[j] = candidateFunds[j].betas[k];
      }
      return row;
    });

    const result = solveMatchExposures(targetBetas, candidateMatrix, candidateFunds);
    state.optimizationResult = { mode: 'match', ...result, candidateFunds };

    renderScorecardsMatch(result);
    renderComparisonChart(state.optimizationResult);
    renderAllocationTableMatch(result, candidateFunds);
  } else {
    // Risk Factor Allocation / Risk Parity
    const M = candidateFunds.length;
    // Build synthetic covariance matrix based on factor loadings
    const covMatrix = Array.from({ length: M }, (_, i) => {
      const row = new Float64Array(M);
      for (let j = 0; j < M; j++) {
        let dot = 0;
        for (let k = 0; k < 6; k++) {
          dot += candidateFunds[i].betas[k] * candidateFunds[j].betas[k];
        }
        row[j] = dot * 0.04 + (i === j ? 0.01 : 0);
      }
      return row;
    });

    const result = solveFactorRiskParity(covMatrix, candidateFunds);
    state.optimizationResult = { mode: 'risk-parity', ...result, candidateFunds };

    renderScorecardsRiskParity(result);
    renderRiskParityChart(result);
    renderAllocationTableRiskParity(result);
  }
}

// -------------------------------------------------------------------
// 4. Rendering Scorecards & Tables
// -------------------------------------------------------------------

function renderScorecardsMatch(result) {
  document.getElementById('card-fit-r2').textContent = `${result.factorFitPct.toFixed(1)}%`;
  document.getElementById('card-rmse').textContent = result.rootMeanSqError.toFixed(4);
  const activeCount = result.allocations.filter(a => a.weight >= 0.01).length;
  document.getElementById('card-active-funds').textContent = `${activeCount} Funds`;
  const maxWeight = Math.max(...result.weights) * 100;
  document.getElementById('card-max-weight').textContent = `${maxWeight.toFixed(1)}%`;
}

function renderScorecardsRiskParity(result) {
  document.getElementById('card-fit-r2').textContent = '100% (ERC)';
  document.getElementById('card-rmse').textContent = `${(result.totalVolAnnualized * 100).toFixed(1)}% Vol`;
  document.getElementById('card-active-funds').textContent = `${result.weights.length} Funds`;
  const maxW = Math.max(...result.weights.map(w => w.weightPct));
  document.getElementById('card-max-weight').textContent = `${maxW.toFixed(1)}%`;
}

function renderAllocationTableMatch(result, candidateFunds) {
  const tbody = document.getElementById('allocation-table-body');
  if (!tbody) return;

  tbody.innerHTML = result.allocations.map(alloc => {
    const etf = candidateFunds.find(f => f.id === alloc.id) || {};
    return `
      <tr>
        <td style="font-weight:700; color:#38bdf8;">${alloc.id}</td>
        <td style="color:#f8fafc;">${escapeHTML(alloc.name)}</td>
        <td class="num font-mono" style="font-weight:700; color:#10b981;">${alloc.weightPct.toFixed(1)}%</td>
        <td class="num font-mono" style="color:#94a3b8;">${(alloc.weightPct * (etf.betas ? etf.betas[0] : 1.0)).toFixed(1)}%</td>
        <td class="num font-mono" style="color:#cbd5e1;">${etf.expenseRatio || '--'}</td>
        <td style="color:#94a3b8; font-size:0.82rem;">${etf.role || '--'}</td>
      </tr>
    `;
  }).join('');
}

function renderAllocationTableRiskParity(result) {
  const tbody = document.getElementById('allocation-table-body');
  if (!tbody) return;

  tbody.innerHTML = result.weights.map(item => {
    const etf = CANDIDATE_ETF_POOL.find(f => f.id === item.id) || {};
    return `
      <tr>
        <td style="font-weight:700; color:#38bdf8;">${item.id}</td>
        <td style="color:#f8fafc;">${escapeHTML(item.name)}</td>
        <td class="num font-mono" style="font-weight:700; color:#38bdf8;">${item.weightPct.toFixed(1)}%</td>
        <td class="num font-mono" style="font-weight:700; color:#a855f7;">${item.riskContributionPct.toFixed(1)}%</td>
        <td class="num font-mono" style="color:#cbd5e1;">${etf.expenseRatio || '--'}</td>
        <td style="color:#94a3b8; font-size:0.82rem;">Risk Parity Equalized Contributor</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------------
// 5. Canvas Chart: Target vs Synthetic Betas (High-DPI)
// -------------------------------------------------------------------

function renderComparisonChart(data) {
  const canvas = document.getElementById('matching-chart-canvas');
  const tooltip = document.getElementById('tooltip-matching-chart');
  if (!canvas) return;

  if (state.chartController) state.chartController.abort();
  state.chartController = new AbortController();
  const { signal } = state.chartController;

  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width) || 800;
  const height = 360;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padLeft = 70;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 45;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const fonts = window.CHART_FONTS || {
    xs: '10px -apple-system, BlinkMacSystemFont, sans-serif',
    sm: '12px -apple-system, BlinkMacSystemFont, sans-serif',
    boldSm: 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
  };

  const K = 6;
  const groupWidth = plotWidth / K;
  const subBarWidth = Math.min((groupWidth * 0.7) / 2, 32);

  // Range: -0.6 to +1.4
  const yMin = -0.6;
  const yMax = 1.4;
  const zeroY = padTop + plotHeight * (yMax / (yMax - yMin));

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const yTicks = [-0.5, 0.0, 0.5, 1.0];
  yTicks.forEach(val => {
    const y = padTop + plotHeight * ((yMax - val) / (yMax - yMin));
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = val === 0 ? '#cbd5e1' : '#94a3b8';
    ctx.font = val === 0 ? fonts.boldSm : fonts.xs;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(val.toFixed(1), padLeft - 8, y);
  });

  // Zero axis line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, zeroY);
  ctx.lineTo(width - padRight, zeroY);
  ctx.stroke();

  const hoverBoxes = [];

  for (let k = 0; k < K; k++) {
    const targetBeta = data.targetBetas[k];
    const synBeta = data.matchedBetas[k];
    const groupCenter = padLeft + k * groupWidth + groupWidth / 2;

    // Bar 1: Target Beta (Gold)
    const x1 = groupCenter - subBarWidth - 2;
    const h1 = Math.abs(targetBeta) / (yMax - yMin) * plotHeight;
    const y1 = targetBeta >= 0 ? zeroY - h1 : zeroY;

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x1, y1, subBarWidth, h1);

    // Bar 2: Synthetic Replicated Beta (Cyan)
    const x2 = groupCenter + 2;
    const h2 = Math.abs(synBeta) / (yMax - yMin) * plotHeight;
    const y2 = synBeta >= 0 ? zeroY - h2 : zeroY;

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x2, y2, subBarWidth, h2);

    // Factor label
    ctx.fillStyle = '#f8fafc';
    ctx.font = fonts.sm;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const shortNames = ['MKT', 'SMB', 'HML', 'RMW', 'CMA', 'MOM'];
    ctx.fillText(shortNames[k], groupCenter, padTop + plotHeight + 10);

    hoverBoxes.push({
      name: FACTOR_NAMES[k],
      targetBeta,
      synBeta,
      x: groupCenter - subBarWidth - 6,
      width: subBarWidth * 2 + 12
    });
  }

  // Legend at top
  ctx.font = fonts.sm;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(padLeft + 10, 10, 12, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Target Factor Beta (β*)', padLeft + 28, 16);

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(padLeft + 210, 10, 12, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('Replicated Synthetic Beta (B*w)', padLeft + 228, 16);

  // Tooltip with rafThrottle
  const handleMove = rafThrottle((e) => {
    const cRect = canvas.getBoundingClientRect();
    const mx = e.clientX - cRect.left;
    const hit = hoverBoxes.find(b => mx >= b.x && mx <= b.x + b.width);

    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${hit.x + hit.width / 2}px`;
      tooltip.style.top = `${zeroY - 45}px`;
      const diff = hit.synBeta - hit.targetBeta;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:#f8fafc; margin-bottom:0.2rem;">${hit.name}</div>
        <div style="font-size:0.8rem; color:#f59e0b;">Target Beta: <strong>${hit.targetBeta.toFixed(2)}</strong></div>
        <div style="font-size:0.8rem; color:#38bdf8;">Synthetic Beta: <strong>${hit.synBeta.toFixed(2)}</strong></div>
        <div style="font-size:0.75rem; color:${Math.abs(diff) < 0.05 ? '#10b981' : '#f59e0b'}; margin-top:0.15rem;">
          Difference: ${diff >= 0 ? '+' : ''}${diff.toFixed(3)}
        </div>
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMove, { signal });
  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; }, { signal });
}

function renderRiskParityChart(result) {
  const canvas = document.getElementById('matching-chart-canvas');
  const tooltip = document.getElementById('tooltip-matching-chart');
  if (!canvas) return;

  if (state.chartController) state.chartController.abort();
  state.chartController = new AbortController();
  const { signal } = state.chartController;

  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.floor(rect.width) || 800;
  const height = 360;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padLeft = 70;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 45;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const fonts = window.CHART_FONTS || {
    xs: '10px -apple-system, BlinkMacSystemFont, sans-serif',
    sm: '12px -apple-system, BlinkMacSystemFont, sans-serif',
    boldSm: 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
  };

  const M = result.weights.length;
  const groupWidth = plotWidth / M;
  const subBarWidth = Math.min((groupWidth * 0.7) / 2, 32);

  // Range: 0% to 100%
  const maxVal = Math.max(50, ...result.weights.map(w => Math.max(w.weightPct, w.riskContributionPct))) * 1.15;
  const zeroY = padTop + plotHeight;

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const ticks = [0, 20, 40, 60];
  ticks.forEach(val => {
    if (val > maxVal) return;
    const y = padTop + plotHeight * (1 - val / maxVal);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = fonts.xs;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${val}%`, padLeft - 8, y);
  });

  const hoverBoxes = [];

  for (let i = 0; i < M; i++) {
    const item = result.weights[i];
    const groupCenter = padLeft + i * groupWidth + groupWidth / 2;

    // Bar 1: Capital Weight (Cyan)
    const x1 = groupCenter - subBarWidth - 2;
    const h1 = (item.weightPct / maxVal) * plotHeight;
    const y1 = zeroY - h1;

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x1, y1, subBarWidth, h1);

    // Bar 2: Risk Contribution (Purple)
    const x2 = groupCenter + 2;
    const h2 = (item.riskContributionPct / maxVal) * plotHeight;
    const y2 = zeroY - h2;

    ctx.fillStyle = '#a855f7';
    ctx.fillRect(x2, y2, subBarWidth, h2);

    // X-label
    ctx.fillStyle = '#f8fafc';
    ctx.font = fonts.sm;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(item.id, groupCenter, zeroY + 10);

    hoverBoxes.push({
      id: item.id,
      weightPct: item.weightPct,
      rcPct: item.riskContributionPct,
      x: groupCenter - subBarWidth - 6,
      width: subBarWidth * 2 + 12
    });
  }

  // Legend at top
  ctx.font = fonts.sm;
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(padLeft + 10, 10, 12, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Capital Allocation Weight (%)', padLeft + 28, 16);

  ctx.fillStyle = '#a855f7';
  ctx.fillRect(padLeft + 240, 10, 12, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('Risk Contribution (% of Total Vol)', padLeft + 258, 16);

  const handleMove = rafThrottle((e) => {
    const cRect = canvas.getBoundingClientRect();
    const mx = e.clientX - cRect.left;
    const hit = hoverBoxes.find(b => mx >= b.x && mx <= b.x + b.width);

    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${hit.x + hit.width / 2}px`;
      tooltip.style.top = `${zeroY - 70}px`;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:#f8fafc; margin-bottom:0.2rem;">${hit.id}</div>
        <div style="font-size:0.8rem; color:#38bdf8;">Capital Weight: <strong>${hit.weightPct.toFixed(1)}%</strong></div>
        <div style="font-size:0.8rem; color:#a855f7;">Risk Contribution: <strong>${hit.rcPct.toFixed(1)}%</strong></div>
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMove, { signal });
  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; }, { signal });
}

// -------------------------------------------------------------------
// 6. CSV Exporter
// -------------------------------------------------------------------

function exportWeightsCSV() {
  if (!state.optimizationResult) return;
  const rows = [['Ticker', 'Name', 'Optimal_Weight_Pct']];
  if (state.mode === 'match') {
    state.optimizationResult.allocations.forEach(a => {
      rows.push([a.id, `"${a.name}"`, a.weightPct.toFixed(2)]);
    });
  } else {
    state.optimizationResult.weights.forEach(w => {
      rows.push([w.id, `"${w.name}"`, w.weightPct.toFixed(2)]);
    });
  }
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'factor_matching_allocations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
