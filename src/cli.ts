import { Optimizer, ANSI_LAYOUT, MOUSE_LAYOUT } from './lib/logic/Optimizer';
import { optimizeSA, layoutToBindings } from './lib/logic/SAOptimizer';
import { LAYOUTS, ACTIONS, LOCKED_BINDS, LayoutPreset } from './testdata';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const LAYOUT: LayoutPreset = 'WASD';  // Options: 'YTGH' | 'WASD'
const USE_SA = true;                   // true = Simulated Annealing, false = Greedy

// ─────────────────────────────────────────────────────────────────────────────
const optimizer = new Optimizer();
const config = LAYOUTS[LAYOUT];

const allKeyCodes = [...ANSI_LAYOUT, ...MOUSE_LAYOUT].map(k => k.code);
const movementKeys = new Set([
    config.movementConfig.verticalAxis.positiveKey,
    config.movementConfig.verticalAxis.negativeKey,
    config.movementConfig.horizontalAxis.positiveKey,
    config.movementConfig.horizontalAxis.negativeKey,
]);

const scoredKeys = optimizer.scoreKeys(config.fingerConfig, movementKeys, allKeyCodes);

console.log(`=== Keybind Optimizer Demo (${LAYOUT}) [${USE_SA ? 'SA' : 'Greedy'}] ===\n`);

console.log('Top 10 Most Accessible Keys:');
const prioritized = optimizer.getPrioritizedKeyList(scoredKeys).slice(0, 10);
prioritized.forEach((key, i) => {
    console.log(`  ${i + 1}. ${key.code} (score: ${key.totalScore.toFixed(2)}, finger: ${key.bestFinger})`);
});

console.log('\n--- Allocation Results ---\n');

let bindings;
if (USE_SA) {
    const startTime = performance.now();
    const layout = optimizeSA(
        ACTIONS,
        scoredKeys,
        config.fingerConfig,
        config.movementConfig
    );
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`SA completed in ${elapsed}ms\n`);
    bindings = layoutToBindings(layout);
} else {
    bindings = optimizer.allocate(
        ACTIONS,
        scoredKeys,
        config.fingerConfig,
        config.movementConfig,
        config.availableFingers,
        LOCKED_BINDS
    );
}

bindings.forEach(binding => {
    const action = ACTIONS.find(a => a.name === binding.action);
    const keyScore = scoredKeys.find(k => k.code === binding.key);
    const finger = keyScore?.bestFinger ?? 'unknown';
    console.log(`  ${binding.action.padEnd(15)} → ${binding.key.padEnd(14)} [${finger}] (freq: ${action?.useFrequency}, pri: ${action?.priority})`);
});

console.log('\n--- Unassigned Actions ---');
const assignedActions = new Set(bindings.map(b => b.action));
const unassigned = ACTIONS.filter(a => !assignedActions.has(a.name));
if (unassigned.length === 0) {
    console.log('  (none)');
} else {
    unassigned.forEach(a => console.log(`  ${a.name} (pri: ${a.priority}, freq: ${a.useFrequency})`));
}
