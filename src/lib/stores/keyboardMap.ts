/**
 * Physical Keyboard Map Store
 * 
 * Defines the physical layout of a standard QWERTY keyboard with accurate
 * staggered coordinates. Uses keyboard units (1u = standard key width).
 * 
 * Coordinate System:
 * - Origin (0, 0) is at the top-left of the keyboard (grave/tilde key)
 * - X increases to the right
 * - Y increases downward
 * - Stagger offsets are applied per row to match real QWERTY layout
 */

import { readable } from 'svelte/store';
import { Finger, type KeyDefinition, type Coordinates } from '$lib/types';

// Row stagger offsets (in keyboard units)
// Based on standard ANSI keyboard layout
const ROW_STAGGER = {
    NUMBER: 0,      // Row 0: Number row (baseline)
    TOP: 0.25,      // Row 1: QWERTY row (offset 0.25u from Tab key)
    HOME: 0.625,    // Row 2: Home row (offset 0.625u from Caps Lock)
    BOTTOM: 1.125,  // Row 3: Bottom row (offset 1.125u from Shift)
    SPACE: 1.5      // Row 4: Space row (varies by key)
};

/**
 * Helper to create a KeyDefinition
 */
function key(
    id: string,
    x: number,
    y: number,
    fingerOwner: Finger,
    options: Partial<KeyDefinition> = {}
): KeyDefinition {
    return {
        id,
        coordinates: { x, y },
        fingerOwner,
        isMovementKey: options.isMovementKey ?? false,
        isHomeRow: options.isHomeRow ?? false,
        movementAxis: options.movementAxis,
        label: options.label ?? id
    };
}

/**
 * Complete physical keyboard map with staggered coordinates.
 * Each key has precise float coordinates accounting for row stagger.
 */
export const PHYSICAL_KEYBOARD_MAP: readonly KeyDefinition[] = Object.freeze([
    // ============================================================================
    // ROW 0: Number Row (Y = 0)
    // ============================================================================
    key('GRAVE', 0, 0, Finger.PINKY, { label: '`' }),
    key('1', 1, 0, Finger.PINKY),
    key('2', 2, 0, Finger.RING),
    key('3', 3, 0, Finger.MIDDLE),
    key('4', 4, 0, Finger.INDEX),
    key('5', 5, 0, Finger.INDEX),
    key('6', 6, 0, Finger.INDEX),
    key('7', 7, 0, Finger.INDEX),
    key('8', 8, 0, Finger.MIDDLE),
    key('9', 9, 0, Finger.RING),
    key('0', 10, 0, Finger.PINKY),
    key('MINUS', 11, 0, Finger.PINKY, { label: '-' }),
    key('EQUAL', 12, 0, Finger.PINKY, { label: '=' }),

    // ============================================================================
    // ROW 1: QWERTY Row (Y = 1, stagger = 0.25u)
    // Tab key is 1.5u wide, so first letter starts at x = 1.5
    // ============================================================================
    key('TAB', 0, 1, Finger.PINKY, { label: 'Tab' }),
    key('Q', 1.5 + ROW_STAGGER.TOP, 1, Finger.PINKY),
    key('W', 2.5 + ROW_STAGGER.TOP, 1, Finger.RING),
    key('E', 3.5 + ROW_STAGGER.TOP, 1, Finger.MIDDLE),
    key('R', 4.5 + ROW_STAGGER.TOP, 1, Finger.INDEX),
    key('T', 5.5 + ROW_STAGGER.TOP, 1, Finger.INDEX),
    key('Y', 6.5 + ROW_STAGGER.TOP, 1, Finger.INDEX),
    key('U', 7.5 + ROW_STAGGER.TOP, 1, Finger.INDEX),
    key('I', 8.5 + ROW_STAGGER.TOP, 1, Finger.MIDDLE),
    key('O', 9.5 + ROW_STAGGER.TOP, 1, Finger.RING),
    key('P', 10.5 + ROW_STAGGER.TOP, 1, Finger.PINKY),
    key('LBRACKET', 11.5 + ROW_STAGGER.TOP, 1, Finger.PINKY, { label: '[' }),
    key('RBRACKET', 12.5 + ROW_STAGGER.TOP, 1, Finger.PINKY, { label: ']' }),
    key('BACKSLASH', 13.5 + ROW_STAGGER.TOP, 1, Finger.PINKY, { label: '\\' }),

    // ============================================================================
    // ROW 2: Home Row (Y = 2, stagger = 0.625u)
    // Caps Lock is 1.75u wide, so first letter starts at x = 1.75
    // These are the anchor keys for touch typing
    // ============================================================================
    key('CAPSLOCK', 0, 2, Finger.PINKY, { label: 'Caps' }),
    key('A', 1.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.PINKY, { isHomeRow: true }),
    key('S', 2.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.RING, { isHomeRow: true }),
    key('D', 3.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.MIDDLE, { isHomeRow: true }),
    key('F', 4.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.INDEX, { isHomeRow: true }),
    key('G', 5.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.INDEX),
    key('H', 6.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.INDEX),
    key('J', 7.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.INDEX, { isHomeRow: true }),
    key('K', 8.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.MIDDLE, { isHomeRow: true }),
    key('L', 9.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.RING, { isHomeRow: true }),
    key('SEMICOLON', 10.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.PINKY, { label: ';', isHomeRow: true }),
    key('QUOTE', 11.75 + ROW_STAGGER.HOME - 0.625, 2, Finger.PINKY, { label: "'" }),
    key('ENTER', 13, 2, Finger.PINKY, { label: 'Enter' }),

    // ============================================================================
    // ROW 3: Bottom Row (Y = 3, stagger = 1.125u)
    // Left Shift is 2.25u wide, so first letter starts at x = 2.25
    // ============================================================================
    key('LSHIFT', 0, 3, Finger.PINKY, { label: 'Shift' }),
    key('Z', 2.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.PINKY),
    key('X', 3.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.RING),
    key('C', 4.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.MIDDLE),
    key('V', 5.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.INDEX),
    key('B', 6.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.INDEX),
    key('N', 7.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.INDEX),
    key('M', 8.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.INDEX),
    key('COMMA', 9.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.MIDDLE, { label: ',' }),
    key('PERIOD', 10.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.RING, { label: '.' }),
    key('SLASH', 11.25 + ROW_STAGGER.BOTTOM - 1.125, 3, Finger.PINKY, { label: '/' }),
    key('RSHIFT', 13.5, 3, Finger.PINKY, { label: 'Shift' }),

    // ============================================================================
    // ROW 4: Space Row (Y = 4)
    // Modifier keys with varying widths
    // ============================================================================
    key('LCTRL', 0, 4, Finger.PINKY, { label: 'Ctrl' }),
    key('LWIN', 1.5, 4, Finger.THUMB, { label: 'Win' }),
    key('LALT', 2.75, 4, Finger.THUMB, { label: 'Alt' }),
    key('SPACE', 6.5, 4, Finger.THUMB, { label: 'Space' }), // Spacebar center
    key('RALT', 10.25, 4, Finger.THUMB, { label: 'Alt' }),
    key('FN', 11.5, 4, Finger.THUMB, { label: 'Fn' }),
    key('RCTRL', 13, 4, Finger.PINKY, { label: 'Ctrl' }),
]);

/**
 * Lookup map for O(1) key access by ID
 */
export const KEYBOARD_MAP_BY_ID: Readonly<Record<string, KeyDefinition>> = Object.freeze(
    PHYSICAL_KEYBOARD_MAP.reduce((acc, key) => {
        acc[key.id] = key;
        return acc;
    }, {} as Record<string, KeyDefinition>)
);

/**
 * Readable Svelte store for reactive access to the keyboard map
 */
export const keyboardMap = readable<readonly KeyDefinition[]>(PHYSICAL_KEYBOARD_MAP);

/**
 * Get a key definition by its ID
 */
export function getKeyById(id: string): KeyDefinition | undefined {
    return KEYBOARD_MAP_BY_ID[id];
}

/**
 * Get all keys owned by a specific finger
 */
export function getKeysByFinger(finger: Finger): KeyDefinition[] {
    return PHYSICAL_KEYBOARD_MAP.filter(key => key.fingerOwner === finger);
}

/**
 * Get all home row keys (anchor positions)
 */
export function getHomeRowKeys(): KeyDefinition[] {
    return PHYSICAL_KEYBOARD_MAP.filter(key => key.isHomeRow);
}

/**
 * Calculate Euclidean distance between two keys
 */
export function getKeyDistance(keyA: KeyDefinition, keyB: KeyDefinition): number {
    const dx = keyB.coordinates.x - keyA.coordinates.x;
    const dy = keyB.coordinates.y - keyA.coordinates.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Euclidean distance from a key to specific coordinates
 */
export function getDistanceToPoint(key: KeyDefinition, point: Coordinates): number {
    const dx = point.x - key.coordinates.x;
    const dy = point.y - key.coordinates.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// MOUSE BUTTON MAP
// ============================================================================

/**
 * Physical mouse button map
 * Uses a simplified grid coordinate system
 */
export const PHYSICAL_MOUSE_MAP: readonly KeyDefinition[] = Object.freeze([
    key('LMB', 0, 0, Finger.INDEX, { label: 'LMB' }),
    key('RMB', 2, 0, Finger.MIDDLE, { label: 'RMB' }),
    key('MMB', 1, 0, Finger.MIDDLE, { label: 'M3' }),
    key('SCROLLUP', 1, -0.5, Finger.MIDDLE, { label: '↑' }),
    key('SCROLLDOWN', 1, 0.5, Finger.MIDDLE, { label: '↓' }),
    key('MOUSE4', -1, 0, Finger.THUMB, { label: 'M4' }),
    key('MOUSE5', -1, 1, Finger.THUMB, { label: 'M5' }),
]);

export const MOUSE_MAP_BY_ID: Readonly<Record<string, KeyDefinition>> = Object.freeze(
    PHYSICAL_MOUSE_MAP.reduce((acc, key) => {
        acc[key.id] = key;
        return acc;
    }, {} as Record<string, KeyDefinition>)
);

export const mouseMap = readable<readonly KeyDefinition[]>(PHYSICAL_MOUSE_MAP);
