import {
    ANSI_LAYOUT,
    MOUSE_LAYOUT,
    KeyDef,
    KeyMap,
    Finger,
    ActionType,
    Action,
    ScoredKey,
    Binding,
    FingerConfigMap,
    LockedBinds,
    MovementConfig,
    FingerLoad,
    AxisConfig,
} from './types';
import { getKeyCenter, euclidean, keyDistance, sortKeysByX, buildKeyMap, Point } from './geometry';

export class Optimizer {
    private keyMap: KeyMap;
    private sortedKeysX: KeyDef[];

    constructor() {
        const allKeys = [...ANSI_LAYOUT, ...MOUSE_LAYOUT];
        this.keyMap = buildKeyMap(allKeys);
        this.sortedKeysX = sortKeysByX(allKeys);
    }

    getDistance(key1Id: string, key2Id: string): number {
        const key1 = this.keyMap.get(key1Id);
        const key2 = this.keyMap.get(key2Id);
        if (!key1 || !key2) return -1;
        return keyDistance(key1, key2);
    }

    getNearbyKeys(targetKeyId: string, maxDistance = 7): Array<{ key: string; distance: number }> {
        const targetKey = this.keyMap.get(targetKeyId);
        if (!targetKey) return [];

        const center = getKeyCenter(targetKey);
        return this.findKeysWithinRadius(center, maxDistance, targetKeyId);
    }

    private findKeysWithinRadius(
        center: Point,
        maxDistance: number,
        excludeCode?: string
    ): Array<{ key: string; distance: number }> {
        const results: Array<{ key: string; distance: number }> = [];

        for (const keyDefinition of this.sortedKeysX) {
            const keyCenter = getKeyCenter(keyDefinition);
            if (keyCenter.x < center.x - maxDistance) continue;
            if (keyCenter.x > center.x + maxDistance) break;
            if (Math.abs(keyCenter.y - center.y) > maxDistance) continue;
            if (keyDefinition.code === excludeCode) continue;

            const distance = euclidean(center, keyCenter);
            if (distance > maxDistance) continue;

            results.push({ key: keyDefinition.code, distance });
        }

        return results;
    }

    /** Scores all keys based on distance from resting finger positions. */
    scoreKeys(
        fingerConfig: FingerConfigMap,
        movementKeys: Set<string>,
        allKeyCodes: string[]
    ): ScoredKey[] {
        return allKeyCodes
            .map(code => this.scoreKey(code, fingerConfig, movementKeys))
            .filter((scored): scored is ScoredKey => scored !== null);
    }

    private scoreKey(
        keyCode: string,
        fingerConfig: FingerConfigMap,
        movementKeys: Set<string>
    ): ScoredKey | null {
        const result = this.findClosestRestingFinger(keyCode, fingerConfig);
        if (!result) return null;

        return {
            code: keyCode,
            totalScore: result.distance,
            bestFinger: result.finger,
            originKey: result.originKey,
            isRestingKey: result.distance === 0,
            isMovement: movementKeys.has(keyCode),
        };
    }

    private findClosestRestingFinger(
        keyCode: string,
        fingerConfig: FingerConfigMap
    ): { finger: Finger; originKey: string; distance: number } | null {
        let best: { finger: Finger; originKey: string; distance: number } | null = null;

        // First check if this key is exclusive to a specific finger
        for (const [finger, config] of Object.entries(fingerConfig)) {
            if (!config?.exclusiveKeys?.includes(keyCode)) continue;

            const penalty = config.keyPenalties?.[keyCode] ?? 0;
            if (keyCode === config.restingKey) {
                return { finger: finger as Finger, originKey: config.restingKey, distance: penalty };
            }
            const dist = this.getDistance(keyCode, config.restingKey);
            if (dist === -1) continue;
            return { finger: finger as Finger, originKey: config.restingKey, distance: dist + penalty };
        }

        // Normal search for non-exclusive keys
        for (const [finger, config] of Object.entries(fingerConfig)) {
            if (!config) continue;

            // Skip fingers that have exclusiveKeys - they can only use their exclusive keys
            if (config.exclusiveKeys && config.exclusiveKeys.length > 0) continue;

            const penalty = config.keyPenalties?.[keyCode] ?? 0;
            if (keyCode === config.restingKey) {
                return { finger: finger as Finger, originKey: config.restingKey, distance: penalty };
            }

            const dist = this.getDistance(keyCode, config.restingKey);
            if (dist === -1) continue;
            const totalDist = dist + penalty;
            if (!best || totalDist < best.distance) {
                best = { finger: finger as Finger, originKey: config.restingKey, distance: totalDist };
            }
        }

        return best;
    }

    /** Returns keys sorted by score (lowest = most accessible). */
    getPrioritizedKeyList(scoredKeys: ScoredKey[]): ScoredKey[] {
        return [...scoredKeys].sort((a, b) => a.totalScore - b.totalScore);
    }

    /** Returns actions sorted by frequency (higher = first pick). */
    sortActionsByFrequency(actions: Action[]): Action[] {
        return [...actions].sort((a, b) => b.useFrequency - a.useFrequency);
    }

    /** Allocates actions to keys. Sorts by frequency, priority caps max distance. */
    allocate(
        actions: Action[],
        scoredKeys: ScoredKey[],
        fingerConfig: FingerConfigMap,
        movementConfig: MovementConfig,
        availableFingers: Set<Finger>,
        lockedBinds: LockedBinds = new Map()
    ): Binding[] {
        // First pass: normal allocation
        const firstPassResult = this.allocatePass(
            actions, scoredKeys, fingerConfig, movementConfig, availableFingers, lockedBinds
        );

        // Check for unassigned concurrent actions that need displacement
        const assignedNames = new Set(firstPassResult.bindings.map(b => b.action));
        const unassignedConcurrent = actions.filter(
            a => !assignedNames.has(a.name) && a.concurrentWith && a.concurrentWith.length > 0
        );

        if (unassignedConcurrent.length === 0) {
            return firstPassResult.bindings;
        }

        // For each unassigned concurrent action, find a victim to displace
        const newLocks = new Map(lockedBinds);
        for (const action of unassignedConcurrent) {
            const victim = this.findDisplacementVictim(
                action, firstPassResult.bindings, firstPassResult.actionFingerMap, actions
            );
            if (victim) {
                newLocks.set(action.name, victim.key);
            }
        }

        // Second pass with new locks
        return this.allocatePass(
            actions, scoredKeys, fingerConfig, movementConfig, availableFingers, newLocks
        ).bindings;
    }

    private allocatePass(
        actions: Action[],
        scoredKeys: ScoredKey[],
        fingerConfig: FingerConfigMap,
        movementConfig: MovementConfig,
        availableFingers: Set<Finger>,
        lockedBinds: LockedBinds
    ): { bindings: Binding[]; actionFingerMap: Map<string, Finger[]> } {
        const sortedActions = this.sortActionsByFrequency(actions);
        const bindings: Binding[] = [];
        const boundKeys = new Set<string>();
        const lockedKeySet = new Set(lockedBinds.values());
        const fingerLoad: FingerLoad = new Map();
        const actionFingerMap = new Map<string, Finger[]>();

        const movementKeys = this.buildMovementKeySet(movementConfig);
        const movementFingers = this.buildExclusiveMovementFingers(movementConfig);

        for (const action of sortedActions) {
            const result = this.allocateActionWithLoad(
                action,
                scoredKeys,
                boundKeys,
                lockedBinds,
                lockedKeySet,
                fingerLoad,
                fingerConfig,
                movementConfig,
                movementKeys,
                movementFingers,
                availableFingers,
                actionFingerMap,
                actions
            );
            if (!result) continue;

            bindings.push(result.binding);
            boundKeys.add(result.binding.key);
            actionFingerMap.set(action.name, result.fingers);
        }

        return { bindings, actionFingerMap };
    }

    private findDisplacementVictim(
        concurrentAction: Action,
        bindings: Binding[],
        actionFingerMap: Map<string, Finger[]>,
        allActions: Action[]
    ): Binding | null {
        const blockedFingers = this.getBlockedFingersForConcurrency(
            concurrentAction, actionFingerMap, allActions
        );

        // Find bindings on fingers NOT blocked by concurrentWith
        const candidates = bindings.filter(b => {
            const fingers = actionFingerMap.get(b.action);
            if (!fingers) return false;
            return fingers.some(f => !blockedFingers.has(f));
        });

        // Filter out actions in concurrentWith list
        const concurrentNames = new Set(concurrentAction.concurrentWith ?? []);
        const evictable = candidates.filter(b => !concurrentNames.has(b.action));

        if (evictable.length === 0) return null;

        // Pick lowest frequency victim
        const actionMap = new Map(allActions.map(a => [a.name, a]));
        evictable.sort((a, b) => {
            const freqA = actionMap.get(a.action)?.useFrequency ?? 0;
            const freqB = actionMap.get(b.action)?.useFrequency ?? 0;
            return freqA - freqB;
        });

        return evictable[0];
    }

    private buildMovementKeySet(config: MovementConfig): Set<string> {
        return new Set([
            config.verticalAxis.positiveKey,
            config.verticalAxis.negativeKey,
            config.horizontalAxis.positiveKey,
            config.horizontalAxis.negativeKey,
        ]);
    }

    private allocateActionWithLoad(
        action: Action,
        scoredKeys: ScoredKey[],
        boundKeys: Set<string>,
        lockedBinds: LockedBinds,
        lockedKeySet: Set<string>,
        fingerLoad: FingerLoad,
        fingerConfig: FingerConfigMap,
        movementConfig: MovementConfig,
        movementKeys: Set<string>,
        movementFingers: Set<Finger>,
        availableFingers: Set<Finger>,
        actionFingerMap: Map<string, Finger[]>,
        allActions: Action[]
    ): { binding: Binding; fingers: Finger[] } | null {
        const lockedKey = lockedBinds.get(action.name);
        if (lockedKey) {
            const keyScore = scoredKeys.find(k => k.code === lockedKey);
            const finger = keyScore?.bestFinger ?? Finger.RightIndex;
            return { binding: { action: action.name, key: lockedKey }, fingers: [finger] };
        }

        if (action.type === ActionType.DIRECTIONAL) {
            return this.allocateMovementAction(action, scoredKeys, boundKeys, movementConfig, fingerLoad);
        }

        return this.allocateNonMovementAction(
            action,
            scoredKeys,
            boundKeys,
            lockedKeySet,
            fingerLoad,
            fingerConfig,
            movementKeys,
            movementFingers,
            availableFingers,
            actionFingerMap,
            allActions
        );
    }

    private allocateMovementAction(
        action: Action,
        scoredKeys: ScoredKey[],
        boundKeys: Set<string>,
        movementConfig: MovementConfig,
        fingerLoad: FingerLoad
    ): { binding: Binding; fingers: Finger[] } | null {
        const axisConfig = this.findAxisForAction(action, movementConfig);
        if (!axisConfig) return null;

        const targetKeys = [axisConfig.positiveKey, axisConfig.negativeKey];
        const bestKey = scoredKeys.find(
            key => targetKeys.includes(key.code) && !boundKeys.has(key.code)
        );
        if (!bestKey) return null;

        const primaryFinger = axisConfig.fingers[0];
        this.addFingerLoad(fingerLoad, primaryFinger, action.useFrequency);
        return { binding: { action: action.name, key: bestKey.code }, fingers: axisConfig.fingers };
    }

    private findAxisForAction(action: Action, config: MovementConfig): AxisConfig | null {
        if (action.name.toLowerCase().includes('forward') || action.name.toLowerCase().includes('backward')) {
            return config.verticalAxis;
        }
        if (action.name.toLowerCase().includes('left') || action.name.toLowerCase().includes('right')) {
            return config.horizontalAxis;
        }
        return null;
    }

    private buildExclusiveMovementFingers(config: MovementConfig): Set<Finger> {
        const fingers = new Set<Finger>();
        if (config.verticalAxis.isExclusive) {
            config.verticalAxis.fingers.forEach(f => fingers.add(f));
        }
        if (config.horizontalAxis.isExclusive) {
            config.horizontalAxis.fingers.forEach(f => fingers.add(f));
        }
        return fingers;
    }

    private allocateNonMovementAction(
        action: Action,
        scoredKeys: ScoredKey[],
        boundKeys: Set<string>,
        lockedKeySet: Set<string>,
        fingerLoad: FingerLoad,
        fingerConfig: FingerConfigMap,
        movementKeys: Set<string>,
        movementFingers: Set<Finger>,
        availableFingers: Set<Finger>,
        actionFingerMap: Map<string, Finger[]>,
        allActions: Action[]
    ): { binding: Binding; fingers: Finger[] } | null {
        const blockedFingers = this.getBlockedFingersForConcurrency(action, actionFingerMap, allActions);

        let bestKey: ScoredKey | null = null;
        let minimumScore = Infinity;

        for (const scoredKey of scoredKeys) {
            if (boundKeys.has(scoredKey.code)) continue;
            if (lockedKeySet.has(scoredKey.code)) continue;
            if (movementKeys.has(scoredKey.code)) continue;
            if (movementFingers.has(scoredKey.bestFinger)) continue;
            if (!availableFingers.has(scoredKey.bestFinger)) continue;
            if (blockedFingers.has(scoredKey.bestFinger)) continue;

            const config = fingerConfig[scoredKey.bestFinger];
            if (!config) continue;

            const maxDistance = action.priority === 0
                ? Infinity
                : 4 + (config.reach - 4) * ((100 - action.priority) / 99);
            if (scoredKey.totalScore > maxDistance) continue;

            const currentLoad = fingerLoad.get(scoredKey.bestFinger) ?? 0;
            const frequencyBonus = action.useFrequency * 0.1;
            const loadPenalty = currentLoad * 0.05;
            const totalScore = scoredKey.totalScore - frequencyBonus + loadPenalty;

            if (totalScore >= minimumScore) continue;

            minimumScore = totalScore;
            bestKey = scoredKey;
        }

        if (!bestKey) return null;

        this.addFingerLoad(fingerLoad, bestKey.bestFinger, action.useFrequency);
        return { binding: { action: action.name, key: bestKey.code }, fingers: [bestKey.bestFinger] };
    }

    private getBlockedFingersForConcurrency(
        action: Action,
        actionFingerMap: Map<string, Finger[]>,
        allActions: Action[]
    ): Set<Finger> {
        const blocked = new Set<Finger>();

        // Check actions that this action must be concurrent with
        if (action.concurrentWith) {
            for (const otherName of action.concurrentWith) {
                const fingers = actionFingerMap.get(otherName);
                if (fingers) fingers.forEach(f => blocked.add(f));
            }
        }

        // Check if other actions list this action in their concurrentWith
        for (const otherAction of allActions) {
            if (otherAction.concurrentWith?.includes(action.name)) {
                const fingers = actionFingerMap.get(otherAction.name);
                if (fingers) fingers.forEach(f => blocked.add(f));
            }
        }

        return blocked;
    }

    private addFingerLoad(fingerLoad: FingerLoad, finger: Finger, frequency: number): void {
        const current = fingerLoad.get(finger) ?? 0;
        fingerLoad.set(finger, current + frequency);
    }
}

export { ActionType, Finger, ANSI_LAYOUT, MOUSE_LAYOUT } from './types';
export type { Action, Binding, KeyDef, KeyMap, ScoredKey, FingerConfigMap, FingerConfig, LockedBinds, MovementConfig, FingerLoad } from './types';
