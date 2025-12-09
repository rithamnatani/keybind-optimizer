/**
 * Keybind Optimizer Service
 * 
 * Implements the "Master Bind" optimization engine.
 * Uses a greedy algorithm to assign actions to keys based on:
 * - Biomechanical reach cost
 * - Movement key protection
 * - Finger load balancing
 */

import { get } from 'svelte/store';
import { Finger, ActionType, OptimizationStatus, type KeyDefinition, type FingerPaintConfig } from '$lib/types';
import type { BenchAction } from '$lib/stores/actionBench';
import { PHYSICAL_KEYBOARD_MAP, KEYBOARD_MAP_BY_ID } from '$lib/stores/keyboardMap';
import { createKeybind, type Keybind } from '$lib/stores/keybinds';

// ============================================================================
// CONFIGURATION CONSTANTS (from spec)
// ============================================================================

/** Directional bias multipliers */
const DIRECTION_MULTIPLIERS = {
    /** Inward (closing hand) - natural grasping motion */
    INWARD: 0.8,
    /** Outward (splaying) - strain, RSI risk */
    OUTWARD: 1.5,
    /** Down (flexion) - neutral */
    DOWN: 1.0,
    /** Up (extension) - strain */
    UP: 1.3
};

/** Finger base penalties */
const FINGER_PENALTIES: Record<Finger, number> = {
    [Finger.THUMB]: 1.0,
    [Finger.INDEX]: 1.0,
    [Finger.MIDDLE]: 1.0,
    [Finger.RING]: 1.2,
    [Finger.PINKY]: 1.4
};

/** Movement sacrifice penalties */
const MOVEMENT_PENALTIES = {
    FORWARD: Infinity,  // Never sacrifice forward
    BACKWARD: 300,      // Retreat is critical
    STRAFE: 100         // Acceptable for non-critical
};

/** Penalty for HOLD action on weak finger (pinky) */
const WEAK_FINGER_HOLD_PENALTY = 100;

/** Penalty for overloading a finger */
const OVERLOAD_PENALTY = 50;

/** Maximum intensity load per finger before penalty */
const FINGER_CAPACITY: Record<Finger, number> = {
    [Finger.THUMB]: 50,   // High capacity (spacebar only usually)
    [Finger.INDEX]: 100,  // Infinite tier
    [Finger.MIDDLE]: 40,  // High capacity but static
    [Finger.RING]: 30,    // Medium capacity
    [Finger.PINKY]: 20    // Low capacity
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Get the home key coordinates for a finger based on user config
 */
function getFingerHome(finger: Finger, config: FingerPaintConfig): { x: number; y: number } | null {
    // Find anchor keys assigned to this finger
    for (const anchorKeyId of config.anchorKeys) {
        const fingerForKey = config.keyAssignments[anchorKeyId];
        if (fingerForKey === finger) {
            const keyDef = KEYBOARD_MAP_BY_ID[anchorKeyId];
            if (keyDef) {
                return { x: keyDef.coordinates.x, y: keyDef.coordinates.y };
            }
        }
    }

    // Fallback: use default home row positions
    const defaultHomes: Record<Finger, string> = {
        [Finger.PINKY]: 'A',
        [Finger.RING]: 'S',
        [Finger.MIDDLE]: 'D',
        [Finger.INDEX]: 'F',
        [Finger.THUMB]: 'SPACE'
    };

    const keyDef = KEYBOARD_MAP_BY_ID[defaultHomes[finger]];
    return keyDef ? { x: keyDef.coordinates.x, y: keyDef.coordinates.y } : null;
}

/**
 * Calculate biomechanical reach score for a key press
 * 
 * Formula from spec: √((dx·Mx)² + (dy·My)²) × Pfinger
 */
export function calculateReachScore(
    key: KeyDefinition,
    config: FingerPaintConfig
): number {
    const finger = config.keyAssignments[key.id] ?? key.fingerOwner;
    const home = getFingerHome(finger, config);

    if (!home) return 100; // High penalty for unknown home

    const dx = key.coordinates.x - home.x;
    const dy = key.coordinates.y - home.y;

    // Determine horizontal multiplier based on finger and direction
    let mx: number;
    if (finger === Finger.INDEX) {
        // Index: inward = moving right, outward = moving left
        mx = dx > 0 ? DIRECTION_MULTIPLIERS.INWARD : DIRECTION_MULTIPLIERS.OUTWARD;
    } else if (finger === Finger.PINKY) {
        // Pinky: inward = moving left, outward = moving right
        mx = dx < 0 ? DIRECTION_MULTIPLIERS.INWARD : DIRECTION_MULTIPLIERS.OUTWARD;
    } else {
        // Middle/Ring: both directions are neutral-ish
        mx = 1.0;
    }

    // Vertical multiplier: up is harder
    const my = dy < 0 ? DIRECTION_MULTIPLIERS.UP : DIRECTION_MULTIPLIERS.DOWN;

    // Base reach cost
    const reachCost = Math.sqrt((dx * mx) ** 2 + (dy * my) ** 2);

    // Apply finger penalty
    const fingerPenalty = FINGER_PENALTIES[finger];

    return reachCost * fingerPenalty;
}

/**
 * Check if placing a HOLD action on this key would block movement
 */
export function isMovementLocked(
    keyId: string,
    actionType: ActionType,
    movementKeys: string[]
): boolean {
    // Only HOLD actions can block movement
    if (actionType !== ActionType.HOLD) {
        return false;
    }

    return movementKeys.includes(keyId);
}

/**
 * Get movement axis for a key (if it's a movement key)
 */
function getMovementAxis(keyId: string, movementKeys: string[]): 'FORWARD' | 'BACKWARD' | 'STRAFE' | null {
    if (!movementKeys.includes(keyId)) return null;

    // Assuming WASD or ESDF layout
    // W/E = forward, S/D (when using ESDF) = backward, A/S (WASD) or D/F (ESDF) = strafe
    const forwardKeys = ['W', 'E'];
    const backwardKeys = ['S'];

    if (forwardKeys.includes(keyId)) return 'FORWARD';
    if (backwardKeys.includes(keyId)) return 'BACKWARD';
    return 'STRAFE';
}

/**
 * Calculate movement sacrifice penalty
 */
function getMovementPenalty(keyId: string, movementKeys: string[]): number {
    const axis = getMovementAxis(keyId, movementKeys);
    if (!axis) return 0;

    return MOVEMENT_PENALTIES[axis];
}

// ============================================================================
// MAIN OPTIMIZER
// ============================================================================

interface FingerLoad {
    [Finger.THUMB]: number;
    [Finger.INDEX]: number;
    [Finger.MIDDLE]: number;
    [Finger.RING]: number;
    [Finger.PINKY]: number;
}

/**
 * Main optimization function - greedy algorithm
 * 
 * Input: List of actions from bench + user hand config
 * Output: Array of keybinds with optimization status
 */
export function optimize(
    actions: BenchAction[],
    config: FingerPaintConfig
): Keybind[] {
    const results: Keybind[] = [];
    const usedKeys = new Set<string>();

    // Track finger load for fatigue balancing
    const fingerLoad: FingerLoad = {
        [Finger.THUMB]: 0,
        [Finger.INDEX]: 0,
        [Finger.MIDDLE]: 0,
        [Finger.RING]: 0,
        [Finger.PINKY]: 0
    };

    // Sort actions by intensity (highest priority first)
    const sortedActions = [...actions].sort((a, b) => b.intensity - a.intensity);

    // Get available keys (main typing area, not function keys)
    const availableKeys = PHYSICAL_KEYBOARD_MAP.filter(key =>
        !['TAB', 'CAPSLOCK', 'LSHIFT', 'RSHIFT', 'LCTRL', 'RCTRL', 'ENTER'].includes(key.id)
    );

    for (const action of sortedActions) {
        let bestKey: KeyDefinition | null = null;
        let minScore = Infinity;
        let bestScoreBreakdown = { reachScore: 0, movementScore: 0, loadScore: 0 };

        for (const key of availableKeys) {
            // Skip already used keys (simplification: 1 action per key for now)
            if (usedKeys.has(key.id)) continue;

            // 1. Base biomechanical reach cost
            const reachScore = calculateReachScore(key, config);

            // 2. Check movement lock (hard constraint for HOLD)
            if (isMovementLocked(key.id, action.type, config.movementKeys)) {
                continue; // Skip this key entirely
            }

            // 3. Movement penalty (softer penalty for TAP on movement keys)
            const movementScore = config.movementKeys.includes(key.id) ? 50 : 0;

            // 4. Finger load balancing
            const finger = config.keyAssignments[key.id] ?? key.fingerOwner;
            const currentLoad = fingerLoad[finger];
            let loadScore = currentLoad * 0.5;

            // Overload penalty
            if (currentLoad + action.intensity > FINGER_CAPACITY[finger]) {
                loadScore += OVERLOAD_PENALTY;
            }

            // Weak finger + HOLD penalty
            if (finger === Finger.PINKY && action.type === ActionType.HOLD) {
                loadScore += WEAK_FINGER_HOLD_PENALTY;
            }

            // 5. Total score
            const totalScore = reachScore + movementScore + loadScore;

            if (totalScore < minScore) {
                minScore = totalScore;
                bestKey = key;
                bestScoreBreakdown = { reachScore, movementScore, loadScore };
            }
        }

        if (bestKey) {
            // Determine status based on score
            let status: OptimizationStatus;
            if (minScore < 2) {
                status = OptimizationStatus.OPTIMAL;
            } else if (minScore < 5) {
                status = OptimizationStatus.SUBOPTIMAL;
            } else if (minScore < 10) {
                status = OptimizationStatus.WARNING;
            } else {
                status = OptimizationStatus.CRITICAL;
            }

            // Create keybind
            const keybind = createKeybind(action.id, action.name, bestKey.id, {
                status,
                totalScore: minScore,
                scoreBreakdown: {
                    reachScore: bestScoreBreakdown.reachScore,
                    conflictScore: 0,
                    movementScore: bestScoreBreakdown.movementScore,
                    loadScore: bestScoreBreakdown.loadScore,
                    comboScore: 0
                },
                conflicts: [],
                isManual: false
            });

            results.push(keybind);
            usedKeys.add(bestKey.id);

            // Update finger load
            const finger = config.keyAssignments[bestKey.id] ?? bestKey.fingerOwner;
            fingerLoad[finger] += action.intensity;
        }
    }

    return results;
}
