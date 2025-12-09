/**
 * Finger color utilities for UI visualization
 * Based on the UI spec: Thumb=Yellow, Index=Red, Middle=Green, Ring=Blue, Pinky=Purple
 */

import { Finger } from '$lib/types';

export interface FingerColorConfig {
    name: string;
    /** Tailwind background class with opacity */
    bg: string;
    /** Solid background (no opacity) */
    bgSolid: string;
    /** Text color class */
    text: string;
    /** Ring/border accent color */
    accent: string;
    /** Hex color for SVG/canvas */
    hex: string;
}

export const FINGER_COLORS: Record<Finger, FingerColorConfig> = {
    [Finger.THUMB]: {
        name: 'Thumb',
        bg: 'bg-yellow-500/20',
        bgSolid: 'bg-yellow-500',
        text: 'text-yellow-400',
        accent: 'ring-yellow-500 border-yellow-500/50',
        hex: '#eab308'
    },
    [Finger.INDEX]: {
        name: 'Index',
        bg: 'bg-red-500/20',
        bgSolid: 'bg-red-500',
        text: 'text-red-400',
        accent: 'ring-red-500 border-red-500/50',
        hex: '#ef4444'
    },
    [Finger.MIDDLE]: {
        name: 'Middle',
        bg: 'bg-green-500/20',
        bgSolid: 'bg-green-500',
        text: 'text-green-400',
        accent: 'ring-green-500 border-green-500/50',
        hex: '#22c55e'
    },
    [Finger.RING]: {
        name: 'Ring',
        bg: 'bg-blue-500/20',
        bgSolid: 'bg-blue-500',
        text: 'text-blue-400',
        accent: 'ring-blue-500 border-blue-500/50',
        hex: '#3b82f6'
    },
    [Finger.PINKY]: {
        name: 'Pinky',
        bg: 'bg-purple-500/20',
        bgSolid: 'bg-purple-500',
        text: 'text-purple-400',
        accent: 'ring-purple-500 border-purple-500/50',
        hex: '#a855f7'
    }
};

/**
 * Get color config for a finger, or undefined if no finger provided
 */
export function getFingerColor(finger: Finger | undefined): FingerColorConfig | undefined {
    return finger ? FINGER_COLORS[finger] : undefined;
}

/**
 * Calculate opacity based on distance from anchor keys
 * Returns a value from 0.3 (far) to 1.0 (anchor)
 */
export function calculateOpacity(isAnchor: boolean, distanceFromAnchor: number): number {
    if (isAnchor) return 1.0;
    // Fade based on distance, minimum 0.3
    const opacity = Math.max(0.3, 1.0 - (distanceFromAnchor * 0.15));
    return opacity;
}

/**
 * Get opacity class string for Tailwind
 */
export function getOpacityClass(opacity: number): string {
    if (opacity >= 0.9) return 'opacity-100';
    if (opacity >= 0.7) return 'opacity-80';
    if (opacity >= 0.5) return 'opacity-60';
    if (opacity >= 0.3) return 'opacity-40';
    return 'opacity-30';
}
