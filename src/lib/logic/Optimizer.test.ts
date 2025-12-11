import { describe, it, expect } from 'vitest';
import { Optimizer, ActionType, ScoredKey, Finger, FingerConfigMap, MovementConfig } from './Optimizer';

const DEFAULT_FINGER_CONFIG: FingerConfigMap = {
    [Finger.LeftMiddle]: { restingKey: 'KeyW', reach: 12 },
    [Finger.LeftIndex]: { restingKey: 'KeyD', reach: 12 },
    [Finger.RightIndex]: { restingKey: 'KeyF', reach: 12 },
    [Finger.RightMiddle]: { restingKey: 'KeyG', reach: 12 },
    [Finger.RightRing]: { restingKey: 'KeyH', reach: 12 },
    [Finger.RightPinky]: { restingKey: 'KeyJ', reach: 12 },
    [Finger.RightThumb]: { restingKey: 'Space', reach: 8 },
};

const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
    verticalAxis: { positiveKey: 'KeyW', negativeKey: 'KeyS', fingers: [Finger.LeftMiddle], isExclusive: true },
    horizontalAxis: { positiveKey: 'KeyD', negativeKey: 'KeyA', fingers: [Finger.LeftIndex], isExclusive: true },
};

const DEFAULT_AVAILABLE_FINGERS = new Set([
    Finger.RightIndex,
    Finger.RightMiddle,
    Finger.RightRing,
    Finger.RightPinky,
    Finger.RightThumb,
]);

describe('Optimizer', () => {
    it('calculates distance correctly', () => {
        const optimizer = new Optimizer();

        const distF = optimizer.getDistance('KeyF', 'KeyF');
        expect(distF).toBe(0);

        const distG = optimizer.getDistance('KeyF', 'KeyG');
        expect(distG).toBe(4);

        const distR = optimizer.getDistance('KeyF', 'KeyR');
        expect(distR).toBeCloseTo(4.123);
    });

    it('finds nearby keys correctly', () => {
        const optimizer = new Optimizer();

        const nearby = optimizer.getNearbyKeys('KeyF', 5);
        const nearbyCodes = nearby.map(k => k.key);

        expect(nearbyCodes).toContain('KeyG');
        expect(nearbyCodes).toContain('KeyD');
        expect(nearbyCodes).toContain('KeyR');
        expect(nearbyCodes).toContain('KeyV');
        expect(nearbyCodes).toContain('KeyC');
        expect(nearbyCodes).toContain('KeyT');

        expect(nearbyCodes).not.toContain('KeyP');
        expect(nearbyCodes).not.toContain('KeyQ');
        expect(nearbyCodes).not.toContain('KeyF');

        const keyG = nearby.find(k => k.key === 'KeyG');
        expect(keyG).toBeDefined();
        expect(keyG?.distance).toBe(4);
    });

    it('calculates mouse key distances', () => {
        const optimizer = new Optimizer();
        const dist = optimizer.getDistance('MouseLeft', 'MouseRight');
        expect(dist).toBe(8);
    });

    it('scores keys correctly with FingerConfigMap', () => {
        const optimizer = new Optimizer();
        const fingerConfig: FingerConfigMap = {
            [Finger.LeftIndex]: { restingKey: 'KeyF', reach: 12 },
            [Finger.RightIndex]: { restingKey: 'KeyJ', reach: 12 },
        };
        const movementKeys = new Set<string>();
        const allKeys = ['KeyF', 'KeyG', 'KeyH', 'KeyJ'];

        const scored = optimizer.scoreKeys(fingerConfig, movementKeys, allKeys);

        const keyF = scored.find(k => k.code === 'KeyF');
        const keyJ = scored.find(k => k.code === 'KeyJ');
        const keyG = scored.find(k => k.code === 'KeyG');
        const keyH = scored.find(k => k.code === 'KeyH');

        expect(keyF?.totalScore).toBe(0);
        expect(keyF?.isRestingKey).toBe(true);
        expect(keyF?.bestFinger).toBe(Finger.LeftIndex);

        expect(keyJ?.totalScore).toBe(0);
        expect(keyJ?.isRestingKey).toBe(true);

        expect(keyG?.totalScore).toBe(4);
        expect(keyG?.isRestingKey).toBe(false);

        expect(keyH?.totalScore).toBe(4);
        expect(keyH?.isRestingKey).toBe(false);
    });

    it('prioritizes keys correctly', () => {
        const optimizer = new Optimizer();
        const scoredKeys: ScoredKey[] = [
            { code: 'KeyA', totalScore: 10, bestFinger: Finger.RightPinky, originKey: 'KeyA', isRestingKey: false, isMovement: false },
            { code: 'KeyB', totalScore: 0, bestFinger: Finger.RightIndex, originKey: 'KeyB', isRestingKey: true, isMovement: false },
            { code: 'KeyC', totalScore: 5, bestFinger: Finger.RightMiddle, originKey: 'KeyD', isRestingKey: false, isMovement: false },
        ];

        const prioritized = optimizer.getPrioritizedKeyList(scoredKeys);

        expect(prioritized[0].code).toBe('KeyB');
        expect(prioritized[0].totalScore).toBe(0);
        expect(prioritized[1].code).toBe('KeyC');
        expect(prioritized[1].totalScore).toBe(5);
        expect(prioritized[2].code).toBe('KeyA');
        expect(prioritized[2].totalScore).toBe(10);
    });

    it('allocates by frequency, higher frequency gets better keys', () => {
        const optimizer = new Optimizer();
        const actions = [
            { name: 'LowFreq', priority: 100, type: ActionType.COMBAT, useFrequency: 10 },
            { name: 'HighFreq', priority: 100, type: ActionType.COMBAT, useFrequency: 100 },
        ];

        const scoredKeys: ScoredKey[] = [
            { code: 'KeyF', totalScore: 0, bestFinger: Finger.RightIndex, originKey: 'KeyF', isRestingKey: true, isMovement: false },
            { code: 'KeyG', totalScore: 4, bestFinger: Finger.RightMiddle, originKey: 'KeyG', isRestingKey: false, isMovement: false },
        ];

        const bindings = optimizer.allocate(actions, scoredKeys, DEFAULT_FINGER_CONFIG, DEFAULT_MOVEMENT_CONFIG, DEFAULT_AVAILABLE_FINGERS);

        expect(bindings).toHaveLength(2);
        expect(bindings[0]).toEqual({ action: 'HighFreq', key: 'KeyF' });
        expect(bindings[1]).toEqual({ action: 'LowFreq', key: 'KeyG' });
    });

    it('excludes movement keys from non-movement actions', () => {
        const optimizer = new Optimizer();
        const actions = [
            { name: 'Reload', priority: 80, type: ActionType.UTILITY, useFrequency: 50 }
        ];

        const scoredKeys: ScoredKey[] = [
            { code: 'KeyW', totalScore: 0, bestFinger: Finger.LeftMiddle, originKey: 'KeyW', isRestingKey: true, isMovement: true },
            { code: 'KeyR', totalScore: 5, bestFinger: Finger.RightIndex, originKey: 'KeyF', isRestingKey: false, isMovement: false }
        ];

        const bindings = optimizer.allocate(actions, scoredKeys, DEFAULT_FINGER_CONFIG, DEFAULT_MOVEMENT_CONFIG, DEFAULT_AVAILABLE_FINGERS);

        expect(bindings[0].key).toBe('KeyR');
    });

    it('respects locked binds', () => {
        const optimizer = new Optimizer();
        const actions = [
            { name: 'Jump', priority: 80, type: ActionType.COMBAT, useFrequency: 50 },
            { name: 'Shoot', priority: 80, type: ActionType.COMBAT, useFrequency: 50 }
        ];

        const scoredKeys: ScoredKey[] = [
            { code: 'KeyF', totalScore: 0, bestFinger: Finger.RightIndex, originKey: 'KeyF', isRestingKey: true, isMovement: false },
            { code: 'KeyG', totalScore: 4, bestFinger: Finger.RightMiddle, originKey: 'KeyG', isRestingKey: false, isMovement: false }
        ];

        const lockedBinds = new Map([['Jump', 'KeyG']]);
        const bindings = optimizer.allocate(actions, scoredKeys, DEFAULT_FINGER_CONFIG, DEFAULT_MOVEMENT_CONFIG, DEFAULT_AVAILABLE_FINGERS, lockedBinds);

        expect(bindings[0]).toEqual({ action: 'Jump', key: 'KeyG' });
        expect(bindings[1]).toEqual({ action: 'Shoot', key: 'KeyF' });
    });

    it('prevents double-assignment when key is locked', () => {
        const optimizer = new Optimizer();
        const actions = [
            { name: 'Jump', priority: 80, type: ActionType.COMBAT, useFrequency: 50 },
            { name: 'Shoot', priority: 80, type: ActionType.COMBAT, useFrequency: 50 }
        ];

        const scoredKeys: ScoredKey[] = [
            { code: 'KeyF', totalScore: 0, bestFinger: Finger.RightIndex, originKey: 'KeyF', isRestingKey: true, isMovement: false },
            { code: 'KeyG', totalScore: 4, bestFinger: Finger.RightMiddle, originKey: 'KeyG', isRestingKey: false, isMovement: false }
        ];

        const lockedBinds = new Map([['OtherAction', 'KeyF']]);
        const bindings = optimizer.allocate(actions, scoredKeys, DEFAULT_FINGER_CONFIG, DEFAULT_MOVEMENT_CONFIG, DEFAULT_AVAILABLE_FINGERS, lockedBinds);

        expect(bindings[0]).toEqual({ action: 'Jump', key: 'KeyG' });
        expect(bindings).toHaveLength(1);
    });

    it('priority caps max distance from resting key', () => {
        const optimizer = new Optimizer();
        const actions = [
            { name: 'LowPri', priority: 10, type: ActionType.MENU, useFrequency: 50 },
        ];

        const scoredKeys: ScoredKey[] = [
            { code: 'KeyF', totalScore: 0, bestFinger: Finger.RightIndex, originKey: 'KeyF', isRestingKey: true, isMovement: false },
            { code: 'FarKey', totalScore: 8, bestFinger: Finger.RightIndex, originKey: 'KeyF', isRestingKey: false, isMovement: false },
        ];

        const fingerConfig: FingerConfigMap = {
            [Finger.RightIndex]: { restingKey: 'KeyF', reach: 12 },
        };

        const bindings = optimizer.allocate(actions, scoredKeys, fingerConfig, DEFAULT_MOVEMENT_CONFIG, DEFAULT_AVAILABLE_FINGERS);

        expect(bindings[0].key).toBe('KeyF');
    });
});
