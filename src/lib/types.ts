/**
 * Keybind Optimizer - Type Definitions
 * 
 * Strictly typed interfaces for biomechanical keybind optimization.
 * Based on the Master Bind Optimization Engine specification.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Finger identifiers for the right hand on keyboard.
 * Used for finger ownership, load tracking, and span calculations.
 */
export enum Finger {
    THUMB = 'THUMB',
    INDEX = 'INDEX',
    MIDDLE = 'MIDDLE',
    RING = 'RING',
    PINKY = 'PINKY'
}

/**
 * Stamina tiers defining maximum load capacity before fatigue penalty.
 * - S (Infinite): Index, Thumb (Spacebar only)
 * - A (High): Middle, Ring (Static/Holding)
 * - B (Medium): Pinky (Tap heavy, avoid Hold)
 * - C (Low): Thumb (Side keys: Z, X, C, V, Alt)
 */
export enum StaminaTier {
    S = 'S', // Infinite
    A = 'A', // High
    B = 'B', // Medium
    C = 'C'  // Low
}

/**
 * Action type classification for input mechanics.
 */
export enum ActionType {
    TAP = 'TAP',     // Single press
    HOLD = 'HOLD',   // Sustained press
    COMBO = 'COMBO'  // Modifier + Key combination
}

/**
 * Action priority/value classification.
 */
export enum ActionValue {
    HIGH = 'HIGH',     // Critical actions (must be easily accessible)
    MEDIUM = 'MEDIUM', // Important but not critical
    LOW = 'LOW'        // Fluff/occasional actions
}

/**
 * Optimization status flags for feedback tiers.
 * Applied to each specific Action item on a key.
 */
export enum OptimizationStatus {
    /** Biomechanical Score < Threshold, Zero Conflicts */
    OPTIMAL = 'OPTIMAL',

    /** Score is valid but higher than "Master Bind" baseline */
    SUBOPTIMAL = 'SUBOPTIMAL',

    /** High Friction "Cope", Tap+Tap Conflict */
    WARNING = 'WARNING',

    /** Hold+Tap Conflict, Movement Block, Span Violation */
    CRITICAL = 'CRITICAL'
}

/**
 * Direction classification for directional bias multipliers.
 */
export enum DirectionClass {
    SWEET_SPOT = 'SWEET_SPOT', // Inward (closing hand) - 0.8x
    NATURAL = 'NATURAL',       // Down (flexion) - 1.0x
    STRAIN = 'STRAIN'          // Outward/Up - 1.3x to 2.0x
}

/**
 * Movement axis identifiers for movement sacrifice calculations.
 */
export enum MovementAxis {
    FORWARD = 'FORWARD',   // Never sacrifice (INFINITE penalty)
    BACKWARD = 'BACKWARD', // High penalty (300)
    STRAFE = 'STRAFE'      // Medium penalty (100)
}

/**
 * Conflict severity levels for simultaneous input matrix.
 */
export enum ConflictSeverity {
    NONE = 0,           // Same key (context sensitive) - allowed
    MEDIUM = 200,       // Finger cross-up
    HIGH = 500,         // Same finger tap + tap
    CRITICAL = 1000,    // Same finger hold + tap
    IMPOSSIBLE = Infinity // Spider-span violation
}

// ============================================================================
// INTERFACES - Core Data Structures
// ============================================================================

/**
 * 2D coordinate representation for key positions.
 * Uses keyboard unit spacing (1u = standard key width).
 */
export interface Coordinates {
    x: number;
    y: number;
}

/**
 * Physical key definition with biomechanical properties.
 * Represents a single key on the keyboard layout.
 */
export interface KeyDefinition {
    /** Unique key identifier (e.g., "K_R", "K_SPACE") */
    id: string;

    /** Physical position on keyboard in unit coordinates */
    coordinates: Coordinates;

    /** Which finger is assigned to this key */
    fingerOwner: Finger;

    /** Whether this key is part of movement controls (WASD/ESDF) */
    isMovementKey: boolean;

    /** Whether this key is on the home row (resting position) */
    isHomeRow: boolean;

    /** Optional: Movement axis if isMovementKey is true */
    movementAxis?: MovementAxis;

    /** Display label for the key */
    label?: string;
}

/**
 * Logical game action definition.
 * Represents an action that needs to be bound to a key.
 */
export interface GameAction {
    /** Unique action identifier */
    id: string;

    /** Human-readable action name (e.g., "Upgrade Ability 1") */
    name: string;

    /** Input type classification */
    type: ActionType;

    /** Usage frequency/intensity: 1 (occasional) to 10 (spam) */
    intensity: number;

    /** Priority/importance classification */
    value: ActionValue;

    /** Actions that may occur simultaneously with this one */
    simultaneousWith: string[];

    /** Modifier action ID if type is COMBO */
    dependency?: string;

    /** Optional category for grouping (e.g., "Combat", "Movement") */
    category?: string;
}

/**
 * Finger properties including stamina and load capacity.
 */
export interface FingerProperties {
    /** Finger identifier */
    finger: Finger;

    /** Stamina tier classification */
    staminaTier: StaminaTier;

    /** Maximum load before fatigue penalty applies */
    maxLoad: number;

    /** Base penalty multiplier for reach calculations */
    basePenalty: number;

    /** Current accumulated load from assigned actions */
    currentLoad: number;
}

// ============================================================================
// INTERFACES - Scoring & Optimization
// ============================================================================

/**
 * Directional bias multipliers for reach calculations.
 */
export interface DirectionalMultipliers {
    /** Horizontal movement multiplier (varies by direction) */
    horizontal: number;

    /** Vertical movement multiplier (varies by direction) */
    vertical: number;
}

/**
 * Conflict details for simultaneous action analysis.
 */
export interface ConflictDetail {
    /** Conflicting action ID */
    conflictingActionId: string;

    /** Severity score of the conflict */
    severity: ConflictSeverity;

    /** Human-readable conflict description */
    reason: string;
}

/**
 * Result of a keybind optimization for a single action.
 */
export interface BindResult {
    /** The action being bound */
    actionId: string;

    /** The assigned key */
    targetKey: KeyDefinition;

    /** Optimization status flag */
    status: OptimizationStatus;

    /** Total calculated score (lower is better) */
    totalScore: number;

    /** Breakdown of score components */
    scoreBreakdown: ScoreBreakdown;

    /** List of any conflicts detected */
    conflicts: ConflictDetail[];
}

/**
 * Detailed breakdown of scoring components.
 */
export interface ScoreBreakdown {
    /** Biomechanical reach cost */
    reachScore: number;

    /** Conflict penalty score */
    conflictScore: number;

    /** Movement sacrifice penalty */
    movementScore: number;

    /** Load balancing penalty */
    loadScore: number;

    /** Combo/modifier span penalty */
    comboScore: number;
}

/**
 * Span limit between finger pairs for combo validation.
 */
export interface FingerSpanLimit {
    /** First finger in the pair */
    finger1: Finger;

    /** Second finger in the pair */
    finger2: Finger;

    /** Maximum reach distance in keyboard units */
    maxSpan: number;
}

/**
 * Base layout audit suggestion.
 */
export interface LayoutSuggestion {
    /** Suggestion type identifier */
    type: 'BETTER_BASE_FOUND' | 'OPTIMIZATION_TIP' | 'WARNING';

    /** Human-readable suggestion text */
    suggestion: string;

    /** Description of the benefit */
    gain: string;

    /** Percentage improvement if applicable */
    improvementPercent?: number;
}

// ============================================================================
// INTERFACES - UI State & Configuration
// ============================================================================

/**
 * Finger paint configuration from user input.
 * Defines the user's custom hand position and key assignments.
 */
export interface FingerPaintConfig {
    /** Map of key IDs to their finger assignments */
    keyAssignments: Record<string, Finger>;

    /** Keys designated as anchor/home position (100% opacity) */
    anchorKeys: string[];

    /** Keys designated for movement */
    movementKeys: string[];

    /** Calculated hand span based on anchors */
    handSpan: number;
}

/**
 * Complete keybind configuration for a game profile.
 */
export interface KeybindProfile {
    /** Profile unique identifier */
    id: string;

    /** Profile name */
    name: string;

    /** Associated game name */
    gameName: string;

    /** Finger paint configuration */
    fingerPaint: FingerPaintConfig;

    /** List of game actions to bind */
    actions: GameAction[];

    /** Resulting binds after optimization */
    binds: Record<string, BindResult>;

    /** Profile creation timestamp */
    createdAt: string;

    /** Last modification timestamp */
    updatedAt: string;
}

// ============================================================================
// TYPE CONSTANTS - Default Values
// ============================================================================

/**
 * Default finger properties with stamina tiers and load capacities.
 */
export const DEFAULT_FINGER_PROPERTIES: Record<Finger, Omit<FingerProperties, 'currentLoad'>> = {
    [Finger.THUMB]: {
        finger: Finger.THUMB,
        staminaTier: StaminaTier.C, // Low for side keys
        maxLoad: 30,
        basePenalty: 1.0
    },
    [Finger.INDEX]: {
        finger: Finger.INDEX,
        staminaTier: StaminaTier.S,
        maxLoad: Infinity,
        basePenalty: 1.0
    },
    [Finger.MIDDLE]: {
        finger: Finger.MIDDLE,
        staminaTier: StaminaTier.A,
        maxLoad: 80,
        basePenalty: 1.0
    },
    [Finger.RING]: {
        finger: Finger.RING,
        staminaTier: StaminaTier.A,
        maxLoad: 70,
        basePenalty: 1.2
    },
    [Finger.PINKY]: {
        finger: Finger.PINKY,
        staminaTier: StaminaTier.B,
        maxLoad: 40,
        basePenalty: 1.4
    }
};

/**
 * Default span limits between finger pairs (in keyboard units).
 */
export const DEFAULT_SPAN_LIMITS: FingerSpanLimit[] = [
    { finger1: Finger.THUMB, finger2: Finger.INDEX, maxSpan: 6.0 },
    { finger1: Finger.THUMB, finger2: Finger.MIDDLE, maxSpan: 5.0 },
    { finger1: Finger.THUMB, finger2: Finger.RING, maxSpan: 4.0 },
    { finger1: Finger.THUMB, finger2: Finger.PINKY, maxSpan: 3.5 },
    { finger1: Finger.INDEX, finger2: Finger.MIDDLE, maxSpan: 2.5 },
    { finger1: Finger.INDEX, finger2: Finger.RING, maxSpan: 3.0 },
    { finger1: Finger.INDEX, finger2: Finger.PINKY, maxSpan: 4.0 },
    { finger1: Finger.MIDDLE, finger2: Finger.RING, maxSpan: 1.5 },
    { finger1: Finger.MIDDLE, finger2: Finger.PINKY, maxSpan: 2.5 },
    { finger1: Finger.RING, finger2: Finger.PINKY, maxSpan: 2.0 }
];

/**
 * Scoring thresholds for status determination.
 */
export const SCORE_THRESHOLDS = {
    /** Maximum score for OPTIMAL status */
    optimal: 50,

    /** Maximum score for SUBOPTIMAL status */
    suboptimal: 150,

    /** Maximum score for WARNING status (above = CRITICAL) */
    warning: 300,

    /** Pain threshold - keys above this are unusable */
    pain: 500
} as const;

/**
 * Penalty values for various conditions.
 */
export const PENALTIES = {
    /** Overload penalty when finger exceeds capacity */
    overload: 50,

    /** Weak finger (pinky) hold penalty */
    weakFingerHold: 100,

    /** Movement sacrifice penalties by axis */
    movement: {
        [MovementAxis.FORWARD]: Infinity,
        [MovementAxis.BACKWARD]: 300,
        [MovementAxis.STRAFE]: 100
    }
} as const;
