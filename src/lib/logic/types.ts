/** Physical key definition with position in 0.25u coordinate space. */
export interface KeyDef {
    code: string;
    x: number;
    y: number;
    width: number;
    height?: number;
}

export type KeyMap = Map<string, KeyDef>;

export const ANSI_LAYOUT: KeyDef[] = [
    // Row 1 (Numbers)
    { code: 'Backquote', x: 0, y: 0, width: 4 },
    { code: 'Digit1', x: 4, y: 0, width: 4 },
    { code: 'Digit2', x: 8, y: 0, width: 4 },
    { code: 'Digit3', x: 12, y: 0, width: 4 },
    { code: 'Digit4', x: 16, y: 0, width: 4 },
    { code: 'Digit5', x: 20, y: 0, width: 4 },
    { code: 'Digit6', x: 24, y: 0, width: 4 },
    { code: 'Digit7', x: 28, y: 0, width: 4 },
    { code: 'Digit8', x: 32, y: 0, width: 4 },
    { code: 'Digit9', x: 36, y: 0, width: 4 },
    { code: 'Digit0', x: 40, y: 0, width: 4 },
    { code: 'Minus', x: 44, y: 0, width: 4 },
    { code: 'Equal', x: 48, y: 0, width: 4 },
    { code: 'Backspace', x: 52, y: 0, width: 8 },

    // Row 2 (QWERTY)
    { code: 'Tab', x: 0, y: 4, width: 6 },
    { code: 'KeyQ', x: 6, y: 4, width: 4 },
    { code: 'KeyW', x: 10, y: 4, width: 4 },
    { code: 'KeyE', x: 14, y: 4, width: 4 },
    { code: 'KeyR', x: 18, y: 4, width: 4 },
    { code: 'KeyT', x: 22, y: 4, width: 4 },
    { code: 'KeyY', x: 26, y: 4, width: 4 },
    { code: 'KeyU', x: 30, y: 4, width: 4 },
    { code: 'KeyI', x: 34, y: 4, width: 4 },
    { code: 'KeyO', x: 38, y: 4, width: 4 },
    { code: 'KeyP', x: 42, y: 4, width: 4 },
    { code: 'BracketLeft', x: 46, y: 4, width: 4 },
    { code: 'BracketRight', x: 50, y: 4, width: 4 },
    { code: 'Backslash', x: 54, y: 4, width: 6 },

    // Row 3 (ASDF)
    { code: 'CapsLock', x: 0, y: 8, width: 7 },
    { code: 'KeyA', x: 7, y: 8, width: 4 },
    { code: 'KeyS', x: 11, y: 8, width: 4 },
    { code: 'KeyD', x: 15, y: 8, width: 4 },
    { code: 'KeyF', x: 19, y: 8, width: 4 },
    { code: 'KeyG', x: 23, y: 8, width: 4 },
    { code: 'KeyH', x: 27, y: 8, width: 4 },
    { code: 'KeyJ', x: 31, y: 8, width: 4 },
    { code: 'KeyK', x: 35, y: 8, width: 4 },
    { code: 'KeyL', x: 39, y: 8, width: 4 },
    { code: 'Semicolon', x: 43, y: 8, width: 4 },
    { code: 'Quote', x: 47, y: 8, width: 4 },
    { code: 'Enter', x: 51, y: 8, width: 9 },

    // Row 4 (ZXCV)
    { code: 'ShiftLeft', x: 0, y: 12, width: 9 },
    { code: 'KeyZ', x: 9, y: 12, width: 4 },
    { code: 'KeyX', x: 13, y: 12, width: 4 },
    { code: 'KeyC', x: 17, y: 12, width: 4 },
    { code: 'KeyV', x: 21, y: 12, width: 4 },
    { code: 'KeyB', x: 25, y: 12, width: 4 },
    { code: 'KeyN', x: 29, y: 12, width: 4 },
    { code: 'KeyM', x: 33, y: 12, width: 4 },
    { code: 'Comma', x: 37, y: 12, width: 4 },
    { code: 'Period', x: 41, y: 12, width: 4 },
    { code: 'Slash', x: 45, y: 12, width: 4 },
    { code: 'ShiftRight', x: 49, y: 12, width: 11 },

    // Row 5 (Bottom)
    { code: 'ControlLeft', x: 0, y: 16, width: 5 },
    { code: 'MetaLeft', x: 5, y: 16, width: 5 },
    { code: 'AltLeft', x: 10, y: 16, width: 5 },
    { code: 'Space', x: 15, y: 16, width: 4 },
    { code: 'SpaceRightSide', x: 19, y: 16, width: 21 },
    { code: 'AltRight', x: 40, y: 16, width: 5 },
    { code: 'MetaRight', x: 45, y: 16, width: 5 },
    { code: 'ContextMenu', x: 50, y: 16, width: 5 },
    { code: 'ControlRight', x: 55, y: 16, width: 5 },
];

export const MOUSE_LAYOUT: KeyDef[] = [
    { code: 'MouseLeft', x: 70, y: 4, width: 4 },
    { code: 'MouseUp', x: 74, y: 0, width: 4 },
    { code: 'MouseRight', x: 78, y: 4, width: 4 },
    { code: 'Mouse4', x: 66, y: 8, width: 4 },
    { code: 'MouseMiddle', x: 74, y: 4, width: 4 },
    { code: 'Mouse5', x: 66, y: 12, width: 4 },
    { code: 'MouseDown', x: 74, y: 8, width: 4 },
];

export enum Finger {
    LeftPinky = 'LeftPinky',
    LeftRing = 'LeftRing',
    LeftMiddle = 'LeftMiddle',
    LeftIndex = 'LeftIndex',
    LeftThumb = 'LeftThumb',
    RightThumb = 'RightThumb',
    RightIndex = 'RightIndex',
    RightMiddle = 'RightMiddle',
    RightRing = 'RightRing',
    RightPinky = 'RightPinky',
}

export const FINGER_LIST: Finger[] = [
    Finger.LeftPinky,
    Finger.LeftRing,
    Finger.LeftMiddle,
    Finger.LeftIndex,
    Finger.LeftThumb,
    Finger.RightThumb,
    Finger.RightIndex,
    Finger.RightMiddle,
    Finger.RightRing,
    Finger.RightPinky,
];

/** Configuration for a single finger: resting key, reach, and ergonomic constraints. */
export interface FingerConfig {
    restingKey: string;
    reach: number;
    /** Keys that ONLY this finger can reach (e.g., side mouse buttons). */
    exclusiveKeys?: string[];
    /** Extra penalty for specific keys (e.g., awkward resting position). Map: keyCode → penalty. */
    keyPenalties?: Record<string, number>;
}

/** Maps each finger to its configuration. */
export type FingerConfigMap = Partial<Record<Finger, FingerConfig>>;

/** User-defined locked bindings: action name → key code. */
export type LockedBinds = Map<string, string>;

/** Accumulated frequency load per finger during allocation. */
export type FingerLoad = Map<Finger, number>;

/** Configuration for one movement axis (e.g., forward/backward). */
export interface AxisConfig {
    positiveKey: string;
    negativeKey: string;
    fingers: Finger[];
    /** If true, these fingers are exclusively for movement. If false, they can be used for other actions. */
    isExclusive: boolean;
}

/** User-defined movement key and finger configuration. */
export interface MovementConfig {
    verticalAxis: AxisConfig;
    horizontalAxis: AxisConfig;
}

/** A key with computed accessibility score from resting positions. */
export interface ScoredKey {
    code: string;
    totalScore: number;
    bestFinger: Finger;
    originKey: string;
    isRestingKey: boolean;
    isMovement: boolean;
}

export enum ActionType {
    DIRECTIONAL = 'DIRECTIONAL',  // Forward/Back/Left/Right - locked to axis fingers
    MOVEMENT = 'MOVEMENT',         // Jump, Dash, Crouch - allocated normally
    COMBAT = 'COMBAT',
    UTILITY = 'UTILITY',
    MENU = 'MENU',
}

/** A game action to be assigned to a key. */
export interface Action {
    name: string;
    priority: number;
    type: ActionType;
    /** How often this action is used (0-100). Higher = more frequent. */
    useFrequency: number;
    /** Action names that must be on different fingers (pressed simultaneously). */
    concurrentWith?: string[];
}

/** Final assignment of an action to a key. */
export interface Binding {
    action: string;
    key: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulated Annealing Types
// ─────────────────────────────────────────────────────────────────────────────

/** Complete layout: every action mapped to a key (permutation-based, no duplicates). */
export type Layout = Map<string, string>;  // actionName → keyCode

/** Penalty weights for SA cost function. */
export interface PenaltyConfig {
    /** Multiplier for distance from resting position. */
    distanceWeight: number;
    /** Multiplier for action frequency (high-freq = more distance penalty). */
    frequencyWeight: number;
    /** Penalty when concurrent actions share a finger. */
    concurrencyPenalty: number;
    /** Penalty for non-movement action on exclusive movement finger. */
    exclusiveViolation: number;
    /** Penalty for key outside finger's reach. */
    unreachablePenalty: number;
}

/** SA algorithm parameters. */
export interface SAOptions {
    initialTemp: number;
    coolingRate: number;
    minTemp: number;
    seed?: number;  // For reproducible results
}

/** Default penalty values. */
export const DEFAULT_PENALTIES: PenaltyConfig = {
    distanceWeight: 1.0,
    frequencyWeight: 0.1,
    concurrencyPenalty: 10000,
    exclusiveViolation: 100000,
    unreachablePenalty: 50000,
};

/** Default SA options. */
export const DEFAULT_SA_OPTIONS: SAOptions = {
    initialTemp: 1000,
    coolingRate: 0.995,
    minTemp: 0.1,
};
