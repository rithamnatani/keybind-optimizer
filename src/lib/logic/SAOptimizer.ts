import {
    Layout,
    PenaltyConfig,
    SAOptions,
    DEFAULT_PENALTIES,
    DEFAULT_SA_OPTIONS,
    Action,
    ActionType,
    Finger,
    ScoredKey,
    FingerConfigMap,
    MovementConfig,
    Binding,
} from './types';
import { calculateFriction, buildFrictionContext, calculateFingerLoads } from './CostFunction';

/** Seeded random number generator for reproducibility. */
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    pick<T>(arr: T[]): T {
        return arr[Math.floor(this.next() * arr.length)];
    }

    pickTwo<T>(arr: T[]): [T, T] {
        const i = Math.floor(this.next() * arr.length);
        let j = Math.floor(this.next() * (arr.length - 1));
        if (j >= i) j++;
        return [arr[i], arr[j]];
    }
}

/** Generate initial layout with movement keys locked and exclusive fingers used. */
function generateInitialLayout(
    actions: Action[],
    scoredKeys: ScoredKey[],
    movementConfig: MovementConfig,
    fingerConfig: FingerConfigMap
): Layout {
    const layout = new Map<string, string>();
    const usedKeys = new Set<string>();
    const usedActions = new Set<string>();

    // 1. Lock movement actions to their correct keys
    const movementMap = buildMovementActionMap(actions, movementConfig);
    for (const [actionName, keyCode] of movementMap) {
        layout.set(actionName, keyCode);
        usedKeys.add(keyCode);
        usedActions.add(actionName);
    }

    // 2. Assign actions to exclusive-key fingers first (mouse buttons)
    const nonMovement = actions
        .filter(a => !usedActions.has(a.name))
        .sort((a, b) => b.useFrequency - a.useFrequency);

    for (const [finger, config] of Object.entries(fingerConfig)) {
        if (!config?.exclusiveKeys || config.exclusiveKeys.length === 0) continue;

        for (const key of config.exclusiveKeys) {
            if (usedKeys.has(key)) continue;

            // Find highest-freq unassigned action for this key
            const action = nonMovement.find(a => !usedActions.has(a.name));
            if (!action) break;

            layout.set(action.name, key);
            usedKeys.add(key);
            usedActions.add(action.name);
        }
    }

    // 3. Assign remaining actions to remaining keys by score
    const remaining = nonMovement.filter(a => !usedActions.has(a.name));
    for (const action of remaining) {
        for (const sk of scoredKeys) {
            if (!usedKeys.has(sk.code)) {
                layout.set(action.name, sk.code);
                usedKeys.add(sk.code);
                break;
            }
        }
    }

    return layout;
}

/** Map movement action names to their designated keys. */
function buildMovementActionMap(
    actions: Action[],
    config: MovementConfig
): Map<string, string> {
    const map = new Map<string, string>();

    for (const action of actions) {
        if (action.type !== ActionType.DIRECTIONAL) continue;
        const name = action.name.toLowerCase();

        if (name.includes('forward')) {
            map.set(action.name, config.verticalAxis.positiveKey);
        } else if (name.includes('backward')) {
            map.set(action.name, config.verticalAxis.negativeKey);
        } else if (name.includes('left')) {
            map.set(action.name, config.horizontalAxis.negativeKey);
        } else if (name.includes('right')) {
            map.set(action.name, config.horizontalAxis.positiveKey);
        }
    }

    return map;
}

/** Swap keys between two actions. */
function swap(layout: Layout, actionA: string, actionB: string): Layout {
    const newLayout = new Map(layout);
    const keyA = layout.get(actionA);
    const keyB = layout.get(actionB);
    if (keyA && keyB) {
        newLayout.set(actionA, keyB);
        newLayout.set(actionB, keyA);
    }
    return newLayout;
}

/** Mutate layout using one of three strategies. */
function mutate(
    layout: Layout,
    fingerLoads: Map<Finger, number>,
    actions: Action[],
    keyToFinger: Map<string, Finger>,
    rng: SeededRandom
): Layout {
    const actionNames = [...layout.keys()];
    const roll = rng.next();

    if (roll < 0.7) {
        // 70%: Random swap
        const [a, b] = rng.pickTwo(actionNames);
        return swap(layout, a, b);
    } else if (roll < 0.9) {
        // 20%: Load balancing swap (high → low load finger)
        const sorted = [...fingerLoads.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length < 2) return layout;

        const highFinger = sorted[0][0];
        const lowFinger = sorted[sorted.length - 1][0];

        const highActions = actionNames.filter(a => {
            const key = layout.get(a);
            return key && keyToFinger.get(key) === highFinger;
        });
        const lowActions = actionNames.filter(a => {
            const key = layout.get(a);
            return key && keyToFinger.get(key) === lowFinger;
        });

        if (highActions.length > 0 && lowActions.length > 0) {
            return swap(layout, rng.pick(highActions), rng.pick(lowActions));
        }
    }

    // 10%: Concurrent conflict swap
    const actionMap = new Map(actions.map(a => [a.name, a]));
    for (const [actionName, key] of layout) {
        const action = actionMap.get(actionName);
        if (!action?.concurrentWith) continue;

        const finger = keyToFinger.get(key);
        for (const otherName of action.concurrentWith) {
            const otherKey = layout.get(otherName);
            if (!otherKey) continue;
            const otherFinger = keyToFinger.get(otherKey);
            if (finger && otherFinger && finger === otherFinger) {
                // Found conflict, swap one of them with random action
                const nonConflict = actionNames.filter(
                    a => a !== actionName && a !== otherName
                );
                if (nonConflict.length > 0) {
                    return swap(layout, otherName, rng.pick(nonConflict));
                }
            }
        }
    }

    return layout;
}

/** Simulated Annealing optimizer. Returns optimal layout. */
export function optimizeSA(
    actions: Action[],
    scoredKeys: ScoredKey[],
    fingerConfig: FingerConfigMap,
    movementConfig: MovementConfig,
    penalties: PenaltyConfig = DEFAULT_PENALTIES,
    options: SAOptions = DEFAULT_SA_OPTIONS
): Layout {
    const ctx = buildFrictionContext(actions, scoredKeys, fingerConfig, movementConfig);
    const rng = new SeededRandom(options.seed ?? Date.now());

    // Warm start
    let current = generateInitialLayout(actions, scoredKeys, movementConfig, fingerConfig);
    let currentScore = calculateFriction(current, ctx, penalties);
    let best = current;
    let bestScore = currentScore;
    let temp = options.initialTemp;

    while (temp > options.minTemp) {
        const fingerLoads = calculateFingerLoads(current, ctx);
        const neighbor = mutate(current, fingerLoads, actions, ctx.keyToFinger, rng);
        const neighborScore = calculateFriction(neighbor, ctx, penalties);

        const delta = neighborScore - currentScore;

        // Accept better, or worse with probability
        if (delta < 0 || rng.next() < Math.exp(-delta / temp)) {
            current = neighbor;
            currentScore = neighborScore;

            if (neighborScore < bestScore) {
                best = neighbor;
                bestScore = neighborScore;
            }
        }

        temp *= options.coolingRate;
    }

    return best;
}

/** Convert Layout to Binding array for output. */
export function layoutToBindings(layout: Layout): Binding[] {
    return [...layout.entries()].map(([action, key]) => ({ action, key }));
}
