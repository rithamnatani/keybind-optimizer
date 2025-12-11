import {
    Layout,
    PenaltyConfig,
    Action,
    ActionType,
    Finger,
    FingerConfigMap,
    MovementConfig,
    ScoredKey,
} from './types';

interface FrictionContext {
    actions: Action[];
    scoredKeys: ScoredKey[];
    fingerConfig: FingerConfigMap;
    movementConfig: MovementConfig;
    keyToFinger: Map<string, Finger>;
    keyToDistance: Map<string, number>;
    movementKeySet: Set<string>;
    movementActionToKey: Map<string, string>;
    fingerExclusiveKeys: Map<Finger, Set<string>>;
}

/** Pre-compute lookups for fast friction calculation. */
export function buildFrictionContext(
    actions: Action[],
    scoredKeys: ScoredKey[],
    fingerConfig: FingerConfigMap,
    movementConfig: MovementConfig
): FrictionContext {
    const keyToFinger = new Map<string, Finger>();
    const keyToDistance = new Map<string, number>();

    for (const sk of scoredKeys) {
        keyToFinger.set(sk.code, sk.bestFinger);
        keyToDistance.set(sk.code, sk.totalScore);
    }

    // Movement keys
    const movementKeySet = new Set([
        movementConfig.verticalAxis.positiveKey,
        movementConfig.verticalAxis.negativeKey,
        movementConfig.horizontalAxis.positiveKey,
        movementConfig.horizontalAxis.negativeKey,
    ]);

    // Map movement action names to their correct keys
    const movementActionToKey = new Map<string, string>();
    for (const action of actions) {
        if (action.type !== ActionType.DIRECTIONAL) continue;
        const name = action.name.toLowerCase();
        if (name.includes('forward')) {
            movementActionToKey.set(action.name, movementConfig.verticalAxis.positiveKey);
        } else if (name.includes('backward')) {
            movementActionToKey.set(action.name, movementConfig.verticalAxis.negativeKey);
        } else if (name.includes('left')) {
            movementActionToKey.set(action.name, movementConfig.horizontalAxis.negativeKey);
        } else if (name.includes('right')) {
            movementActionToKey.set(action.name, movementConfig.horizontalAxis.positiveKey);
        }
    }

    // Finger exclusive keys
    const fingerExclusiveKeys = new Map<Finger, Set<string>>();
    for (const [finger, config] of Object.entries(fingerConfig)) {
        if (config?.exclusiveKeys && config.exclusiveKeys.length > 0) {
            fingerExclusiveKeys.set(finger as Finger, new Set(config.exclusiveKeys));
        }
    }

    return {
        actions, scoredKeys, fingerConfig, movementConfig,
        keyToFinger, keyToDistance, movementKeySet, movementActionToKey, fingerExclusiveKeys
    };
}

/** Calculate total friction score for a layout. Lower = better. */
export function calculateFriction(
    layout: Layout,
    ctx: FrictionContext,
    penalties: PenaltyConfig
): number {
    let score = 0;
    const actionMap = new Map(ctx.actions.map(a => [a.name, a]));
    const exclusiveFingers = buildExclusiveFingerSet(ctx.movementConfig);
    const usedKeys = new Set(layout.values());

    for (const [actionName, keyCode] of layout) {
        const action = actionMap.get(actionName);
        if (!action) continue;

        const finger = ctx.keyToFinger.get(keyCode);
        const distance = ctx.keyToDistance.get(keyCode) ?? 100;

        // 1. CRITICAL: Movement actions MUST be on their correct keys
        if (action.type === ActionType.DIRECTIONAL) {
            const correctKey = ctx.movementActionToKey.get(actionName);
            if (correctKey && keyCode !== correctKey) {
                score += 1000000;  // Massive penalty for wrong movement key
            }
        }

        // 2. Non-movement actions can't be on movement keys
        if (action.type !== ActionType.DIRECTIONAL && ctx.movementKeySet.has(keyCode)) {
            score += 500000;  // Heavy penalty
        }

        // 3. Finger-exclusive key violation
        // If a finger has exclusiveKeys, ONLY those keys should be used by that finger
        // And those keys should ONLY be used by that finger
        if (finger) {
            const fingerExclusive = ctx.fingerExclusiveKeys.get(finger);
            if (fingerExclusive) {
                // This finger has exclusive keys - it should only use them
                if (!fingerExclusive.has(keyCode)) {
                    score += 200000;  // Finger using non-exclusive key
                }
            }

            // Check if this key belongs to another finger's exclusive set
            for (const [otherFinger, exclusiveSet] of ctx.fingerExclusiveKeys) {
                if (otherFinger !== finger && exclusiveSet.has(keyCode)) {
                    score += 200000;  // Key belongs to different exclusive finger
                }
            }
        }

        // 4. Distance penalty (weighted by frequency)
        score += distance * action.useFrequency * penalties.frequencyWeight;
        score += distance * penalties.distanceWeight;

        // 5. Exclusive movement finger violation
        if (finger && exclusiveFingers.has(finger) && action.type !== ActionType.DIRECTIONAL) {
            score += penalties.exclusiveViolation;
        }

        // 6. Reach violation
        if (finger) {
            const config = ctx.fingerConfig[finger];
            if (config && distance > config.reach) {
                score += penalties.unreachablePenalty;
            }
        }

        // 7. Concurrency penalty (same finger for concurrent actions)
        if (action.concurrentWith) {
            for (const otherName of action.concurrentWith) {
                const otherKey = layout.get(otherName);
                if (!otherKey) continue;
                const otherFinger = ctx.keyToFinger.get(otherKey);
                if (finger && otherFinger && finger === otherFinger) {
                    score += penalties.concurrencyPenalty;
                }
            }
        }
    }

    // 8. Finger load imbalance (soft constraint)
    score += calculateLoadImbalance(layout, ctx, actionMap);

    return score;
}

/** Penalize uneven finger load distribution. */
function calculateLoadImbalance(
    layout: Layout,
    ctx: FrictionContext,
    actionMap: Map<string, Action>
): number {
    const fingerLoads = new Map<Finger, number>();

    for (const [actionName, keyCode] of layout) {
        const action = actionMap.get(actionName);
        const finger = ctx.keyToFinger.get(keyCode);
        if (!action || !finger) continue;

        const current = fingerLoads.get(finger) ?? 0;
        fingerLoads.set(finger, current + action.useFrequency);
    }

    if (fingerLoads.size < 2) return 0;

    const loads = [...fingerLoads.values()];
    const max = Math.max(...loads);
    const min = Math.min(...loads);

    return (max - min) * 0.5;
}

function buildExclusiveFingerSet(config: MovementConfig): Set<Finger> {
    const exclusive = new Set<Finger>();
    if (config.verticalAxis.isExclusive) {
        config.verticalAxis.fingers.forEach(f => exclusive.add(f));
    }
    if (config.horizontalAxis.isExclusive) {
        config.horizontalAxis.fingers.forEach(f => exclusive.add(f));
    }
    return exclusive;
}

/** Calculate finger loads from a layout. */
export function calculateFingerLoads(
    layout: Layout,
    ctx: FrictionContext
): Map<Finger, number> {
    const actionMap = new Map(ctx.actions.map(a => [a.name, a]));
    const loads = new Map<Finger, number>();

    for (const [actionName, keyCode] of layout) {
        const action = actionMap.get(actionName);
        const finger = ctx.keyToFinger.get(keyCode);
        if (!action || !finger) continue;

        const current = loads.get(finger) ?? 0;
        loads.set(finger, current + action.useFrequency);
    }

    return loads;
}
