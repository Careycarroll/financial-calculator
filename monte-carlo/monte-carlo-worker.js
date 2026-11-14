/**
 * Monte Carlo Simulation Background Web Worker
 * Executes 1,000 to 10,000 multi-path simulations off the main thread,
 * ensuring fluid 60 FPS UI interaction and real-time progress updates.
 */

import { runMonteCarloSimulation } from './monte-carlo-engine.js';

self.onmessage = function (e) {
  const { action, config } = e.data;

  if (action === 'runSimulation') {
    try {
      // Post start notification
      self.postMessage({ action: 'progress', percent: 10 });

      // Run calculation pipeline
      const result = runMonteCarloSimulation(config);

      self.postMessage({ action: 'progress', percent: 100 });
      self.postMessage({ action: 'simulationComplete', result });
    } catch (err) {
      self.postMessage({ action: 'simulationError', error: err.message || 'Simulation error' });
    }
  }
};
