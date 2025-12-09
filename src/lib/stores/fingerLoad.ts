/**
 * Finger Load Store
 * 
 * Tracks the current load (intensity sum) per finger for the fatigue algorithm.
 * Used to calculate overload penalties and balance distribution.
 */

import { writable, derived } from 'svelte/store';
import { Finger, StaminaTier, DEFAULT_FINGER_PROPERTIES } from '$lib/types';

/**
 * Load state for a single finger
 */
export interface FingerLoadState {
    finger: Finger;
    currentLoad: number;
    maxLoad: number;
    staminaTier: StaminaTier;
    isOverloaded: boolean;
    overloadAmount: number;
    loadPercentage: number;
}

/**
 * Complete load state for all fingers
 */
export type FingerLoadMap = Record<Finger, FingerLoadState>;

/**
 * Create initial load state for all fingers
 */
function createInitialLoadState(): FingerLoadMap {
    const state: Partial<FingerLoadMap> = {};

    for (const finger of Object.values(Finger)) {
        const props = DEFAULT_FINGER_PROPERTIES[finger];
        state[finger] = {
            finger,
            currentLoad: 0,
            maxLoad: props.maxLoad,
            staminaTier: props.staminaTier,
            isOverloaded: false,
            overloadAmount: 0,
            loadPercentage: 0
        };
    }

    return state as FingerLoadMap;
}

/**
 * Recalculate derived fields for a finger state
 */
function recalculateState(state: FingerLoadState): FingerLoadState {
    const isOverloaded = state.currentLoad > state.maxLoad;
    return {
        ...state,
        isOverloaded,
        overloadAmount: isOverloaded ? state.currentLoad - state.maxLoad : 0,
        loadPercentage: state.maxLoad === Infinity
            ? 0
            : Math.min(100, (state.currentLoad / state.maxLoad) * 100)
    };
}

/**
 * Finger load store implementation
 */
function createFingerLoadStore() {
    const { subscribe, set, update } = writable<FingerLoadMap>(createInitialLoadState());

    return {
        subscribe,

        /**
         * Add load to a finger (when an action is assigned)
         */
        addLoad: (finger: Finger, intensity: number) => {
            update(state => ({
                ...state,
                [finger]: recalculateState({
                    ...state[finger],
                    currentLoad: state[finger].currentLoad + intensity
                })
            }));
        },

        /**
         * Remove load from a finger (when an action is unassigned)
         */
        removeLoad: (finger: Finger, intensity: number) => {
            update(state => ({
                ...state,
                [finger]: recalculateState({
                    ...state[finger],
                    currentLoad: Math.max(0, state[finger].currentLoad - intensity)
                })
            }));
        },

        /**
         * Set the exact load for a finger
         */
        setLoad: (finger: Finger, load: number) => {
            update(state => ({
                ...state,
                [finger]: recalculateState({
                    ...state[finger],
                    currentLoad: load
                })
            }));
        },

        /**
         * Recalculate all loads from a list of actions and their finger assignments
         */
        recalculateFromActions: (
            actions: Array<{ intensity: number; finger: Finger }>
        ) => {
            // Start fresh
            const newState = createInitialLoadState();

            // Sum up intensities per finger
            for (const action of actions) {
                newState[action.finger].currentLoad += action.intensity;
            }

            // Recalculate derived fields
            for (const finger of Object.values(Finger)) {
                newState[finger] = recalculateState(newState[finger]);
            }

            set(newState);
        },

        /**
         * Reset all loads to zero
         */
        reset: () => {
            set(createInitialLoadState());
        },

        /**
         * Update max load for a finger (for custom configurations)
         */
        setMaxLoad: (finger: Finger, maxLoad: number) => {
            update(state => ({
                ...state,
                [finger]: recalculateState({
                    ...state[finger],
                    maxLoad
                })
            }));
        }
    };
}

export const fingerLoad = createFingerLoadStore();

/**
 * Derived: Get load state for a specific finger
 */
export const getFingerLoad = (finger: Finger) =>
    derived(fingerLoad, $state => $state[finger]);

/**
 * Derived: List of overloaded fingers
 */
export const overloadedFingers = derived(
    fingerLoad,
    $state => Object.values($state).filter(f => f.isOverloaded)
);

/**
 * Derived: Total load across all fingers
 */
export const totalLoad = derived(
    fingerLoad,
    $state => Object.values($state).reduce((sum, f) => sum + f.currentLoad, 0)
);

/**
 * Derived: Average load percentage (excluding infinite capacity fingers)
 */
export const averageLoadPercentage = derived(fingerLoad, $state => {
    const finiteFingersLoad = Object.values($state).filter(f => f.maxLoad !== Infinity);
    if (finiteFingersLoad.length === 0) return 0;
    return finiteFingersLoad.reduce((sum, f) => sum + f.loadPercentage, 0) / finiteFingersLoad.length;
});

/**
 * Derived: Load balance score (0-100, 100 = perfectly balanced)
 */
export const loadBalanceScore = derived(fingerLoad, $state => {
    const fingers = Object.values($state).filter(f => f.maxLoad !== Infinity);
    if (fingers.length === 0) return 100;

    const loads = fingers.map(f => f.loadPercentage);
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    // Convert standard deviation to a 0-100 score (lower deviation = higher score)
    return Math.max(0, 100 - stdDev * 2);
});
