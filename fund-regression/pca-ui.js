/**
 * Principal Component Analysis (PCA) UI Controller
 * 
 * Manages:
 * - High-DPI canvas charts: Scree Plot (Bars + Cumulative line) and Asset Loadings on PC1 & PC2
 * - Dynamic universe preset switching and custom asset additions
 * - Correlation Matrix heatmap and Eigenvalue detail tables
 * - Responsive canvas resizing, mousemove tooltips via AbortController and rafThrottle
 * - Strictly conforms to window.CHART_FONTS constants
 */

import { runPrincipalComponentAnalysis, PCA_PRESETS } from './pca-engine.js';
import { PRELOADED_FACTOR_FUNDS } from './factor-data.js';
import { buildAssetClassMonthlyData, ASSET_CLASS_CATALOG } from '../portfolio-backtest/asset-class-data.js';

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

// -------------------------------------------------------------------
// 1. Color Palette & Universe Presets
// -------------------------------------------------------------------

const PALETTE = [
  '#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899',
  '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'
];

export { PCA_PRESETS };

// -------------------------------------------------------------------
// 2. Application State
// -------------------------------------------------------------------

const state = {
  activePreset: 'all-weather',
  mode: 'correlation', // 'correlation' | 'covariance'
  currentAssets: [],
  pcaResult: null,
  controllers: {
    scree: null,
    loadings: null
  }
};

// -------------------------------------------------------------------
// 3. Asset Data Resolution
// -------------------------------------------------------------------

function loadUniverseAssets(presetKey) {
  const preset = PCA_PRESETS[presetKey] || PCA_PRESETS['all-weather'];
  state.activePreset = presetKey;

  if (preset.source === 'asset-class') {
    const rawData = buildAssetClassMonthlyData();
    const commonStart = '1972-01';
    const commonEnd = '2026-08';

    const assets = preset.assetIds.map((id, idx) => {
      const cat = ASSET_CLASS_CATALOG.find(x => x.id === id);
      const series = rawData instanceof Map ? rawData.get(id) : (rawData[id] || []);
      const returns = (series || []).map(d => d.return);
      return {
        id,
        name: cat ? cat.name : id,
        color: PALETTE[idx % PALETTE.length],
        returns
      };
    });
    return assets;
  } else {
    // Factor ETFs
    const validFunds = PRELOADED_FACTOR_FUNDS.filter(f => preset.assetIds.includes(f.id));
    // Determine common start date
    let commonStart = '2006-03'; // RZV start
    const assets = validFunds.map((f, idx) => {
      const filtered = f.returns.filter(d => d.date >= commonStart);
      return {
        id: f.id,
        name: f.name,
        color: PALETTE[idx % PALETTE.length],
        returns: filtered.map(d => d.return)
      };
    });
    return assets;
  }
}

// -------------------------------------------------------------------
// 4. Initialization & Event Wiring
// -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  state.currentAssets = loadUniverseAssets('all-weather');

  wireExecutiveGuideToggle();
  wirePresetButtons();
  wireMatrixModeControl();
  wireExportButtons();
  wireResizeHandler();

  recalculateAndRender();
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

function wirePresetButtons() {
  const container = document.getElementById('preset-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-chip-btn');
    if (!btn) return;

    container.querySelectorAll('.preset-chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const presetKey = btn.getAttribute('data-preset');
    state.currentAssets = loadUniverseAssets(presetKey);
    recalculateAndRender();
  });
}

function wireMatrixModeControl() {
  const control = document.getElementById('matrix-mode-control');
  if (!control) return;

  control.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;

    control.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.mode = btn.getAttribute('data-mode') || 'correlation';
    recalculateAndRender();
  });
}

function wireResizeHandler() {
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.pcaResult) {
        renderScreePlot(state.pcaResult);
        renderLoadingsPlot(state.pcaResult);
      }
    }, 250);
  });
}

function wireExportButtons() {
  document.getElementById('btn-export-scree-csv')?.addEventListener('click', exportScreeCSV);
  document.getElementById('btn-export-eigen-csv')?.addEventListener('click', exportEigenCSV);
  document.getElementById('btn-export-loadings-csv')?.addEventListener('click', exportLoadingsCSV);
}

// -------------------------------------------------------------------
// 5. Main Recalculate & Render Workflow
// -------------------------------------------------------------------

export function recalculateAndRender() {
  if (state.currentAssets.length < 2) return;

  try {
    state.pcaResult = runPrincipalComponentAnalysis(state.currentAssets, { mode: state.mode });
    renderStatusBar(state.pcaResult);
    renderAssetChips();
    renderScorecards(state.pcaResult);
    renderScreePlot(state.pcaResult);
    renderLoadingsPlot(state.pcaResult);
    renderEigenvalueTable(state.pcaResult);
    renderLoadingsTable(state.pcaResult);
    renderCorrelationTable(state.pcaResult);
  } catch (err) {
    console.error('PCA execution error:', err);
  }
}

// -------------------------------------------------------------------
// 6. UI Status Bar & Asset Chips
// -------------------------------------------------------------------

function renderStatusBar(pca) {
  const p = PCA_PRESETS[state.activePreset];
  document.getElementById('status-universe-name').textContent = p ? p.name : 'Custom Universe';
  document.getElementById('status-asset-count').textContent = `${pca.assetCount} Assets`;
  document.getElementById('status-sample-months').textContent = `(${pca.sampleMonths} Months)`;
  document.getElementById('status-matrix-basis').textContent = state.mode === 'correlation' ? 'Correlation Matrix' : 'Covariance Matrix';
}

function renderAssetChips() {
  const container = document.getElementById('asset-chips-container');
  if (!container) return;

  container.innerHTML = state.currentAssets.map((asset, idx) => `
    <div class="asset-chip" data-id="${asset.id}">
      <span class="asset-chip-color-dot" style="background: ${asset.color};"></span>
      <span>${escapeHTML(asset.id)}</span>
      ${state.currentAssets.length > 2 ? `<button type="button" class="asset-chip-remove" data-remove="${asset.id}" title="Remove asset">&times;</button>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.asset-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idToRemove = btn.getAttribute('data-remove');
      state.currentAssets = state.currentAssets.filter(a => a.id !== idToRemove);
      recalculateAndRender();
    });
  });
}

function renderScorecards(pca) {
  document.getElementById('card-pc1-var').textContent = `${pca.summary.pc1VariancePct.toFixed(1)}%`;
  document.getElementById('card-pc2-var').textContent = `${pca.summary.pc2VariancePct.toFixed(1)}%`;
  document.getElementById('card-top3-cum').textContent = `${pca.summary.top3CumulativePct.toFixed(1)}%`;
  document.getElementById('card-kaiser-count').textContent = `${pca.kaiserCount} of ${pca.assetCount}`;
}

// -------------------------------------------------------------------
// 7. Canvas Chart 1: Scree Plot & Cumulative Line
// -------------------------------------------------------------------

function renderScreePlot(pca) {
  const canvas = document.getElementById('scree-plot-canvas');
  const tooltip = document.getElementById('tooltip-scree-plot');
  if (!canvas) return;

  if (state.controllers.scree) state.controllers.scree.abort();
  state.controllers.scree = new AbortController();
  const { signal } = state.controllers.scree;

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

  const padLeft = 60;
  const padRight = 60;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Fonts
  const fonts = window.CHART_FONTS || {
    xs: '10px -apple-system, BlinkMacSystemFont, sans-serif',
    sm: '12px -apple-system, BlinkMacSystemFont, sans-serif',
    boldSm: 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif',
    boldMd: 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'
  };

  const K = pca.assetCount;
  const colWidth = plotWidth / K;
  const barWidth = Math.min(colWidth * 0.55, 60);

  // Draw Grid Lines (Left Axis: 0 to 100%)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const gridTicks = [0, 20, 40, 60, 80, 100];
  gridTicks.forEach(pct => {
    const y = padTop + plotHeight * (1 - pct / 100);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = fonts.xs;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pct}%`, padLeft - 8, y);

    ctx.textAlign = 'left';
    ctx.fillText(`${pct}%`, width - padRight + 8, y);
  });

  // Draw Bars for Each PC's % Variance Explained
  const barBoxes = [];
  for (let k = 0; k < K; k++) {
    const pct = pca.varianceRatios[k] * 100;
    const barH = (pct / 100) * plotHeight;
    const x = padLeft + k * colWidth + (colWidth - barWidth) / 2;
    const y = padTop + plotHeight - barH;

    // Gradient bar
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, barH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, barWidth, barH);

    // Value text above bar
    ctx.fillStyle = '#f8fafc';
    ctx.font = fonts.xs;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${pct.toFixed(1)}%`, x + barWidth / 2, y - 4);

    // X-axis label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = fonts.sm;
    ctx.textBaseline = 'top';
    ctx.fillText(`PC ${k + 1}`, x + barWidth / 2, padTop + plotHeight + 10);

    barBoxes.push({
      k,
      name: `PC ${k + 1}`,
      pct,
      cumPct: pca.cumulativeRatios[k] * 100,
      eigenvalue: pca.eigenvalues[k],
      x,
      y,
      width: barWidth,
      height: barH,
      centerX: x + barWidth / 2
    });
  }

  // Draw Cumulative Variance Line Curve
  ctx.beginPath();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2.5;
  for (let k = 0; k < K; k++) {
    const cumPct = pca.cumulativeRatios[k] * 100;
    const cx = barBoxes[k].centerX;
    const cy = padTop + plotHeight * (1 - cumPct / 100);
    if (k === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // Draw Cumulative Line Points
  for (let k = 0; k < K; k++) {
    const cumPct = pca.cumulativeRatios[k] * 100;
    const cx = barBoxes[k].centerX;
    const cy = padTop + plotHeight * (1 - cumPct / 100);

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Interactive Hover with AbortController and rafThrottle
  const handleMouseMove = rafThrottle((e) => {
    const cRect = canvas.getBoundingClientRect();
    const mx = e.clientX - cRect.left;
    const my = e.clientY - cRect.top;

    const hit = barBoxes.find(b => mx >= b.x - 10 && mx <= b.x + b.width + 10);
    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${hit.centerX}px`;
      tooltip.style.top = `${hit.y - 10}px`;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:#38bdf8; margin-bottom:0.25rem;">${hit.name}</div>
        <div style="font-size:0.8rem; color:#f8fafc;">Variance Explained: <strong>${hit.pct.toFixed(2)}%</strong></div>
        <div style="font-size:0.8rem; color:#a855f7;">Cumulative Variance: <strong>${hit.cumPct.toFixed(2)}%</strong></div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.2rem;">Eigenvalue (&lambda;): ${hit.eigenvalue.toFixed(4)}</div>
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMouseMove, { signal });
  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; }, { signal });
}

// -------------------------------------------------------------------
// 8. Canvas Chart 2: Asset Factor Loadings on PC1 & PC2
// -------------------------------------------------------------------

function renderLoadingsPlot(pca) {
  const canvas = document.getElementById('pca-loadings-canvas');
  const tooltip = document.getElementById('tooltip-pca-loadings');
  if (!canvas) return;

  if (state.controllers.loadings) state.controllers.loadings.abort();
  state.controllers.loadings = new AbortController();
  const { signal } = state.controllers.loadings;

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

  const K = pca.assetCount;
  const groupWidth = plotWidth / K;
  const subBarWidth = Math.min((groupWidth * 0.7) / 2, 28);

  // Y-axis range: -1.0 to +1.0 for correlation loadings
  const yMin = -1.0;
  const yMax = 1.0;
  const zeroY = padTop + plotHeight * (yMax / (yMax - yMin));

  // Draw Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const yTicks = [-1.0, -0.5, 0.0, 0.5, 1.0];
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

  // Draw Grouped Bars for PC1 & PC2
  const hoverBoxes = [];
  for (let i = 0; i < K; i++) {
    const asset = pca.assets[i];
    const groupCenter = padLeft + i * groupWidth + groupWidth / 2;

    const pc1Loading = pca.loadings[i][0];
    const pc2Loading = pca.loadings[i][1] || 0;

    // Bar 1: PC1 (Cyan)
    const x1 = groupCenter - subBarWidth - 2;
    const h1 = Math.abs(pc1Loading) / (yMax - yMin) * plotHeight;
    const y1 = pc1Loading >= 0 ? zeroY - h1 : zeroY;

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x1, y1, subBarWidth, h1);

    // Bar 2: PC2 (Purple)
    const x2 = groupCenter + 2;
    const h2 = Math.abs(pc2Loading) / (yMax - yMin) * plotHeight;
    const y2 = pc2Loading >= 0 ? zeroY - h2 : zeroY;

    ctx.fillStyle = '#a855f7';
    ctx.fillRect(x2, y2, subBarWidth, h2);

    // X-axis asset label
    ctx.fillStyle = '#f8fafc';
    ctx.font = fonts.boldSm;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(asset.id, groupCenter, padTop + plotHeight + 10);

    hoverBoxes.push({
      asset,
      pc1Loading,
      pc2Loading,
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
  ctx.fillText('PC 1 (Market Driver)', padLeft + 28, 16);

  ctx.fillStyle = '#a855f7';
  ctx.fillRect(padLeft + 190, 10, 12, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('PC 2 (Style/Rate Driver)', padLeft + 208, 16);

  // Mousemove listener
  const handleMove = rafThrottle((e) => {
    const cRect = canvas.getBoundingClientRect();
    const mx = e.clientX - cRect.left;
    const hit = hoverBoxes.find(b => mx >= b.x && mx <= b.x + b.width);

    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${hit.x + hit.width / 2}px`;
      tooltip.style.top = `${zeroY - 40}px`;
      tooltip.innerHTML = `
        <div style="font-weight:700; color:#f8fafc; margin-bottom:0.2rem;">${hit.asset.id}</div>
        <div style="font-size:0.8rem; color:#38bdf8;">PC1 Loading: <strong>${hit.pc1Loading.toFixed(3)}</strong></div>
        <div style="font-size:0.8rem; color:#a855f7;">PC2 Loading: <strong>${hit.pc2Loading.toFixed(3)}</strong></div>
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mousemove', handleMove, { signal });
  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; }, { signal });
}

// -------------------------------------------------------------------
// 9. Tables: Eigenvalues, Loadings & Correlation Matrix
// -------------------------------------------------------------------

function renderEigenvalueTable(pca) {
  const tbody = document.getElementById('eigenvalue-table-body');
  if (!tbody) return;

  tbody.innerHTML = pca.eigenvalues.map((val, idx) => {
    const pct = pca.varianceRatios[idx] * 100;
    const cumPct = pca.cumulativeRatios[idx] * 100;
    const isKaiser = val >= 1.0;
    const interp = idx === 0 ? 'Primary Broad Market Factor' : idx === 1 ? 'Secondary Style / Duration' : isKaiser ? 'Statistically Meaningful Risk Driver' : 'Idiosyncratic Residual Noise';

    return `
      <tr>
        <td style="font-weight:700; color:#38bdf8;">PC ${idx + 1}</td>
        <td class="num font-mono">${val.toFixed(4)}</td>
        <td class="num font-mono" style="color:#38bdf8; font-weight:600;">${pct.toFixed(2)}%</td>
        <td class="num font-mono" style="color:#a855f7;">${cumPct.toFixed(2)}%</td>
        <td>
          <span style="font-weight:700; color: ${isKaiser ? '#10b981' : '#64748b'};">
            ${isKaiser ? '✅ Retain (&ge; 1.0)' : '— Drop (&lt; 1.0)'}
          </span>
        </td>
        <td style="color:#cbd5e1; font-size:0.82rem;">${interp}</td>
      </tr>
    `;
  }).join('');
}

function renderLoadingsTable(pca) {
  const headerRow = document.getElementById('loadings-table-header-row');
  const tbody = document.getElementById('loadings-table-body');
  if (!headerRow || !tbody) return;

  const numPCs = Math.min(pca.assetCount, 5);
  headerRow.innerHTML = `
    <th>Asset / Fund</th>
    ${Array.from({ length: numPCs }, (_, k) => `<th class="num">PC ${k + 1}</th>`).join('')}
  `;

  tbody.innerHTML = pca.assets.map((asset, i) => `
    <tr>
      <td style="font-weight:700; color:#f8fafc;">${escapeHTML(asset.id)}</td>
      ${Array.from({ length: numPCs }, (_, k) => {
        const loading = pca.loadings[i][k];
        const color = loading > 0.5 ? '#38bdf8' : loading < -0.3 ? '#ef4444' : '#cbd5e1';
        return `<td class="num font-mono" style="color: ${color}; font-weight:600;">${loading.toFixed(3)}</td>`;
      }).join('')}
    </tr>
  `).join('');
}

function renderCorrelationTable(pca) {
  const table = document.getElementById('pca-correlation-table');
  if (!table) return;

  const K = pca.assetCount;
  let html = '<thead><tr><th></th>';
  for (let j = 0; j < K; j++) {
    html += `<th class="num">${pca.assets[j].id}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 0; i < K; i++) {
    html += `<tr><td style="font-weight:700; color:#f8fafc;">${pca.assets[i].id}</td>`;
    for (let j = 0; j < K; j++) {
      const corr = pca.corrMatrix[i][j];
      const bg = corr > 0
        ? `rgba(56, 189, 248, ${(corr * 0.45).toFixed(2)})`
        : `rgba(239, 68, 68, ${(Math.abs(corr) * 0.45).toFixed(2)})`;
      html += `<td class="num font-mono" style="background:${bg};">${corr.toFixed(2)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;
}

// -------------------------------------------------------------------
// 10. CSV Exporters
// -------------------------------------------------------------------

function exportScreeCSV() {
  if (!state.pcaResult) return;
  const rows = [['Component', 'Eigenvalue', 'Variance_Pct', 'Cumulative_Pct']];
  state.pcaResult.eigenvalues.forEach((ev, k) => {
    rows.push([
      `PC ${k + 1}`,
      ev.toFixed(4),
      (state.pcaResult.varianceRatios[k] * 100).toFixed(2),
      (state.pcaResult.cumulativeRatios[k] * 100).toFixed(2)
    ]);
  });
  downloadCSV(rows, 'pca_scree_variance.csv');
}

function exportEigenCSV() {
  if (!state.pcaResult) return;
  exportScreeCSV();
}

function exportLoadingsCSV() {
  if (!state.pcaResult) return;
  const numPCs = Math.min(state.pcaResult.assetCount, 5);
  const headers = ['Asset', ...Array.from({ length: numPCs }, (_, k) => `PC_${k + 1}`)];
  const rows = [headers];

  state.pcaResult.assets.forEach((asset, i) => {
    const row = [asset.id];
    for (let k = 0; k < numPCs; k++) {
      row.push(state.pcaResult.loadings[i][k].toFixed(4));
    }
    rows.push(row);
  });
  downloadCSV(rows, 'pca_factor_loadings.csv');
}

function downloadCSV(rows, filename) {
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
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
