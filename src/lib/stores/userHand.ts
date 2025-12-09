/**
 * User Hand Store
 * 
 * Holds the user's "Finger Paint" configuration data.
 * Defines which finger owns which key and where the anchor (resting) keys are.
 */

import { writable, derived, get } from 'svelte/store';
import { Finger, type FingerPaintConfig } from '$lib/types';
import { KEYBOARD_MAP_BY_ID, getKeyById } from './keyboardMap';

/**
 * Default finger assignments based on standard touch typing.
 * Users can override these via the Finger Paint UI.
 */
const DEFAULT_FINGER_ASSIGNMENTS: Record<string, Finger> = {
    // Pinky keys (left side)
    'GRAVE': Finger.PINKY,
    '1': Finger.PINKY,
    'TAB': Finger.PINKY,
    'Q': Finger.PINKY,
    'CAPSLOCK': Finger.PINKY,
    'A': Finger.PINKY,
    'LSHIFT': Finger.PINKY,
    'Z': Finger.PINKY,
    'LCTRL': Finger.PINKY,

    // Ring finger keys
    '2': Finger.RING,
    'W': Finger.RING,
    'S': Finger.RING,
    'X': Finger.RING,

    // Middle finger keys
    '3': Finger.MIDDLE,
    'E': Finger.MIDDLE,
    'D': Finger.MIDDLE,
    'C': Finger.MIDDLE,

    // Index finger keys (left hand reach)
    '4': Finger.INDEX,
    '5': Finger.INDEX,
    'R': Finger.INDEX,
    'T': Finger.INDEX,
    'F': Finger.INDEX,
    'G': Finger.INDEX,
    'V': Finger.INDEX,
    'B': Finger.INDEX,

    // Index finger keys (right hand - for reference)
    '6': Finger.INDEX,
    '7': Finger.INDEX,
    'Y': Finger.INDEX,
    'U': Finger.INDEX,
    'H': Finger.INDEX,
    'J': Finger.INDEX,
    'N': Finger.INDEX,
    'M': Finger.INDEX,

    // Middle finger keys (right hand)
    '8': Finger.MIDDLE,
    'I': Finger.MIDDLE,
    'K': Finger.MIDDLE,
    'COMMA': Finger.MIDDLE,

    // Ring finger keys (right hand)
    '9': Finger.RING,
    'O': Finger.RING,
    'L': Finger.RING,
    'PERIOD': Finger.RING,

    // Pinky keys (right side)
    '0': Finger.PINKY,
    'MINUS': Finger.PINKY,
    'EQUAL': Finger.PINKY,
    'P': Finger.PINKY,
    'LBRACKET': Finger.PINKY,
    'RBRACKET': Finger.PINKY,
    'BACKSLASH': Finger.PINKY,
    'SEMICOLON': Finger.PINKY,
    'QUOTE': Finger.PINKY,
    'ENTER': Finger.PINKY,
    'SLASH': Finger.PINKY,
    'RSHIFT': Finger.PINKY,
    'RCTRL': Finger.PINKY,

    // Thumb keys
    'LWIN': Finger.THUMB,
    'LALT': Finger.THUMB,
    'SPACE': Finger.THUMB,
    'RALT': Finger.THUMB,
    'FN': Finger.THUMB,
};

/**
 * Default anchor keys (home row resting positions)
 */
const DEFAULT_ANCHOR_KEYS = ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'SEMICOLON'];

/**
 * Default movement keys (for FPS games, typically WASD or ESDF)
 */
const DEFAULT_MOVEMENT_KEYS = ['W', 'A', 'S', 'D'];

/**
 * Calculate hand span based on anchor key positions
 */
function calculateHandSpan(anchorKeys: string[]): number {
    if (anchorKeys.length < 2) return 0;

    let maxDistance = 0;
    for (let i = 0; i < anchorKeys.length; i++) {
        for (let j = i + 1; j < anchorKeys.length; j++) {
            const keyA = getKeyById(anchorKeys[i]);
            const keyB = getKeyById(anchorKeys[j]);
            if (keyA && keyB) {
                const dx = keyB.coordinates.x - keyA.coordinates.x;
                const dy = keyB.coordinates.y - keyA.coordinates.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > maxDistance) {
                    maxDistance = distance;
                }
            }
        }
    }
    return maxDistance;
}

/**
 * Create the initial finger paint config
 */
function createInitialConfig(): FingerPaintConfig {
    return {
        keyAssignments: { ...DEFAULT_FINGER_ASSIGNMENTS },
        anchorKeys: [...DEFAULT_ANCHOR_KEYS],
        movementKeys: [...DEFAULT_MOVEMENT_KEYS],
        handSpan: calculateHandSpan(DEFAULT_ANCHOR_KEYS)
    };
}

/**
 * Main writable store for user hand configuration
 */
function createUserHandStore() {
    const { subscribe, set, update } = writable<FingerPaintConfig>(createInitialConfig());

    return {
        subscribe,

        /**
         * Assign a finger to a specific key
         */
        assignFinger: (keyId: string, finger: Finger) => {
            update(config => ({
                ...config,
                keyAssignments: {
                    ...config.keyAssignments,
                    [keyId]: finger
                }
            }));
        },

        /**
         * Remove finger assignment from a key
         */
        unassignFinger: (keyId: string) => {
            update(config => {
                const { [keyId]: _, ...rest } = config.keyAssignments;
                return {
                    ...config,
                    keyAssignments: rest
                };
            });
        },

        /**
         * Set a key as an anchor (resting) key
         */
        setAnchor: (keyId: string) => {
            update(config => {
                if (config.anchorKeys.includes(keyId)) return config;
                const newAnchors = [...config.anchorKeys, keyId];
                return {
                    ...config,
                    anchorKeys: newAnchors,
                    handSpan: calculateHandSpan(newAnchors)
                };
            });
        },

        /**
         * Remove anchor status from a key
         */
        removeAnchor: (keyId: string) => {
            update(config => {
                const newAnchors = config.anchorKeys.filter(k => k !== keyId);
                return {
                    ...config,
                    anchorKeys: newAnchors,
                    handSpan: calculateHandSpan(newAnchors)
                };
            });
        },

        /**
         * Toggle anchor status for a key
         */
        toggleAnchor: (keyId: string) => {
            update(config => {
                const isAnchor = config.anchorKeys.includes(keyId);
                const newAnchors = isAnchor
                    ? config.anchorKeys.filter(k => k !== keyId)
                    : [...config.anchorKeys, keyId];
                return {
                    ...config,
                    anchorKeys: newAnchors,
                    handSpan: calculateHandSpan(newAnchors)
                };
            });
        },

        /**
         * Set movement keys
         */
        setMovementKeys: (keyIds: string[]) => {
            update(config => ({
                ...config,
                movementKeys: keyIds
            }));
        },

        /**
         * Toggle movement key status
         */
        toggleMovementKey: (keyId: string) => {
            update(config => ({
                ...config,
                movementKeys: config.movementKeys.includes(keyId)
                    ? config.movementKeys.filter(k => k !== keyId)
                    : [...config.movementKeys, keyId]
            }));
        },

        /**
         * Reset to default configuration
         */
        reset: () => {
            set(createInitialConfig());
        },

        /**
         * Load configuration from saved data
         */
        load: (config: FingerPaintConfig) => {
            set({
                ...config,
                handSpan: calculateHandSpan(config.anchorKeys)
            });
        }
    };
}

export const userHand = createUserHandStore();

/**
 * Derived store: Get finger for a specific key
 */
export const getFingerForKey = (keyId: string) =>
    derived(userHand, $config => $config.keyAssignments[keyId] ?? null);

/**
 * Derived store: Check if a key is an anchor
 */
export const isAnchorKey = (keyId: string) =>
    derived(userHand, $config => $config.anchorKeys.includes(keyId));

/**
 * Derived store: Check if a key is a movement key
 */
export const isMovementKey = (keyId: string) =>
    derived(userHand, $config => $config.movementKeys.includes(keyId));

/**
 * Derived store: Get all keys for a specific finger
 */
export const keysForFinger = (finger: Finger) =>
    derived(userHand, $config =>
        Object.entries($config.keyAssignments)
            .filter(([_, f]) => f === finger)
            .map(([keyId]) => keyId)
    );
