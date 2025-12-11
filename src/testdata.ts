import { Finger, ActionType, MovementConfig, Action, FingerConfigMap } from './lib/logic/Optimizer';

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export type LayoutPreset = 'YTGH' | 'WASD';

export interface LayoutConfig {
    fingerConfig: FingerConfigMap;
    movementConfig: MovementConfig;
    availableFingers: Set<Finger>;
}

const YTGH_CONFIG: LayoutConfig = {
    fingerConfig: {
        // Right hand on keyboard (YTGH layout)
        [Finger.RightPinky]: { restingKey: 'KeyI', reach: 12 },
        [Finger.RightRing]: { restingKey: 'KeyY', reach: 12 },
        [Finger.RightMiddle]: { restingKey: 'KeyT', reach: 12 },
        [Finger.RightIndex]: { restingKey: 'KeyE', reach: 12 },
        [Finger.RightThumb]: { restingKey: 'Space', reach: 8 },
        // Left hand on mouse
        [Finger.LeftIndex]: { restingKey: 'MouseLeft', reach: 4 },
        [Finger.LeftMiddle]: { restingKey: 'MouseRight', reach: 4 },
        [Finger.LeftRing]: {
            restingKey: 'Mouse4',
            reach: 4,
            exclusiveKeys: ['Mouse4', 'Mouse5'],
            keyPenalties: { 'Mouse4': 6, 'Mouse5': 12 },
        },
    },
    movementConfig: {
        verticalAxis: { positiveKey: 'KeyY', negativeKey: 'KeyH', fingers: [Finger.RightRing], isExclusive: true },
        horizontalAxis: { positiveKey: 'KeyT', negativeKey: 'KeyG', fingers: [Finger.RightMiddle], isExclusive: true },
    },
    availableFingers: new Set([
        Finger.RightPinky, Finger.RightThumb, Finger.RightIndex,
        Finger.LeftIndex, Finger.LeftMiddle, Finger.LeftRing,
    ]),
};

const WASD_CONFIG: LayoutConfig = {
    fingerConfig: {
        // Left hand on keyboard (WASD)
        [Finger.LeftMiddle]: { restingKey: 'KeyW', reach: 10 },
        [Finger.LeftRing]: { restingKey: 'KeyA', reach: 12 },
        [Finger.LeftIndex]: { restingKey: 'KeyD', reach: 12 },
        [Finger.LeftPinky]: { restingKey: 'ShiftLeft', reach: 8 },
        [Finger.LeftThumb]: { restingKey: 'Space', reach: 12 },
        // Right hand on mouse (can ONLY use mouse buttons)
        [Finger.RightIndex]: {
            restingKey: 'MouseLeft', reach: 4,
            exclusiveKeys: ['MouseLeft', 'MouseMiddle', 'MouseUp', 'MouseDown']
        },
        [Finger.RightMiddle]: {
            restingKey: 'MouseRight', reach: 4,
            exclusiveKeys: ['MouseRight']
        },
        [Finger.RightThumb]: {
            restingKey: 'Mouse4',
            reach: 4,
            exclusiveKeys: ['Mouse4', 'Mouse5'],
            keyPenalties: { 'Mouse4': 0, 'Mouse5': -4 },
        },
    },
    movementConfig: {
        verticalAxis: { positiveKey: 'KeyW', negativeKey: 'KeyS', fingers: [Finger.LeftMiddle], isExclusive: true },
        horizontalAxis: { positiveKey: 'KeyD', negativeKey: 'KeyA', fingers: [Finger.LeftIndex, Finger.LeftRing], isExclusive: false },
    },
    availableFingers: new Set([
        Finger.LeftRing, Finger.LeftIndex, Finger.LeftPinky, Finger.LeftThumb,
        Finger.RightIndex, Finger.RightMiddle, Finger.RightThumb,
    ]),
};

export const LAYOUTS: Record<LayoutPreset, LayoutConfig> = {
    'YTGH': YTGH_CONFIG,
    'WASD': WASD_CONFIG,
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIONS: Action[] = [
    // TIER 1: Movement (Priority 100)
    { name: 'MoveForward', priority: 0, type: ActionType.DIRECTIONAL, useFrequency: 100 },
    { name: 'StrafeLeft', priority: 0, type: ActionType.DIRECTIONAL, useFrequency: 80 },
    { name: 'StrafeRight', priority: 0, type: ActionType.DIRECTIONAL, useFrequency: 80 },
    { name: 'MoveBackward', priority: 0, type: ActionType.DIRECTIONAL, useFrequency: 60 },

    // TIER 2: Critical Combat (Priority 80-90)
    { name: 'Fire', priority: 0, type: ActionType.COMBAT, useFrequency: 100 },
    { name: 'Jump', priority: 0, type: ActionType.MOVEMENT, useFrequency: 60 },
    { name: 'Dash', priority: 0, type: ActionType.MOVEMENT, useFrequency: 70 },
    { name: 'MeleeParry', priority: 70, type: ActionType.COMBAT, useFrequency: 10 },
    { name: 'Crouch', priority: 0, type: ActionType.MOVEMENT, useFrequency: 70 },
    { name: 'Melee', priority: 0, type: ActionType.COMBAT, useFrequency: 30 },

    // TIER 3: Core Abilities (Priority 60-75)
    { name: 'AltFire', priority: 0, type: ActionType.COMBAT, useFrequency: 50 },
    { name: 'Ability1', priority: 0, type: ActionType.COMBAT, useFrequency: 30 },
    { name: 'Reload', priority: 0, type: ActionType.UTILITY, useFrequency: 30 },
    { name: 'Ability2', priority: 0, type: ActionType.COMBAT, useFrequency: 30 },
    { name: 'Ability3', priority: 0, type: ActionType.COMBAT, useFrequency: 30 },

    // TIER 4: Situational (Priority 40-55)
    { name: 'Ping', priority: 0, type: ActionType.UTILITY, useFrequency: 50 },
    { name: 'CancelAbility', priority: 0, type: ActionType.UTILITY, useFrequency: 5 },
    { name: 'Item1', priority: 0, type: ActionType.UTILITY, useFrequency: 30 },
    { name: 'Ability4', priority: 0, type: ActionType.COMBAT, useFrequency: 20 },
    { name: 'Zipline', priority: 0, type: ActionType.MOVEMENT, useFrequency: 10 },

    // TIER 5: Menu / Low Priority (Priority 0-35)
    { name: 'Item2', priority: 0, type: ActionType.UTILITY, useFrequency: 30 },
    { name: 'AlternateCast', priority: 0, type: ActionType.COMBAT, useFrequency: 10 },
    { name: 'Item3', priority: 0, type: ActionType.UTILITY, useFrequency: 20 },
    { name: 'Item4', priority: 0, type: ActionType.UTILITY, useFrequency: 15 },
    { name: 'Scoreboard', priority: 0, type: ActionType.MENU, useFrequency: 10 },
    { name: 'ChatWheel', priority: 0, type: ActionType.MENU, useFrequency: 15 },
    { name: 'OpenShop', priority: 0, type: ActionType.MENU, useFrequency: 5 },
    { name: 'ChatTeam', priority: 0, type: ActionType.MENU, useFrequency: 10 },
    { name: 'ChatAll', priority: 0, type: ActionType.MENU, useFrequency: 5 },
    { name: 'VoiceChat', priority: 20, type: ActionType.UTILITY, useFrequency: 30, concurrentWith: ['Fire', 'Jump', 'Dash', 'MoveForward', 'MoveBackward', 'StrafeLeft', 'StrafeRight'] },
    { name: 'ExtraInfo', priority: 0, type: ActionType.MENU, useFrequency: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED BINDS (optional overrides)
// ─────────────────────────────────────────────────────────────────────────────

export const LOCKED_BINDS = new Map([
    ['Fire', 'MouseLeft'],
    ['AltFire', 'MouseRight'],
    ['Jump', 'Space'],
]);
