/**
 * Action Bench Store
 * 
 * Holds the game actions currently in the right sidebar (The Bench).
 * Actions here are waiting to be mapped to keys.
 */

import { writable, derived } from 'svelte/store';
import { ActionType, ActionValue, type GameAction } from '$lib/types';

/**
 * Generate a unique ID for new actions
 */
function generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Status of a bench action (for parsing confidence)
 */
export type BenchActionStatus = 'clean' | 'warning' | 'error';

/**
 * Extended action type for bench items with UI state
 */
export interface BenchAction extends GameAction {
    /** UI status for visual feedback */
    status: BenchActionStatus;
    /** Original raw text if parsed from config */
    rawText?: string;
    /** Whether the action has been edited by user */
    isEdited: boolean;
}

/**
 * Create a new bench action with defaults
 */
export function createBenchAction(
    name: string,
    options: Partial<Omit<BenchAction, 'id' | 'name'>> = {}
): BenchAction {
    return {
        id: generateId(),
        name,
        type: options.type ?? ActionType.TAP,
        intensity: options.intensity ?? 5,
        value: options.value ?? ActionValue.MEDIUM,
        simultaneousWith: options.simultaneousWith ?? [],
        dependency: options.dependency,
        category: options.category,
        status: options.status ?? 'clean',
        rawText: options.rawText,
        isEdited: options.isEdited ?? false
    };
}

/**
 * Main writable store for bench actions
 */
function createActionBenchStore() {
    const { subscribe, set, update } = writable<BenchAction[]>([]);

    return {
        subscribe,

        /**
         * Add a new action to the bench
         */
        add: (action: BenchAction) => {
            update(actions => [...actions, action]);
        },

        /**
         * Add multiple actions to the bench
         */
        addMany: (newActions: BenchAction[]) => {
            update(actions => [...actions, ...newActions]);
        },

        /**
         * Create and add a new action with just a name
         */
        createAndAdd: (name: string, options?: Partial<Omit<BenchAction, 'id' | 'name'>>) => {
            const action = createBenchAction(name, options);
            update(actions => [...actions, action]);
            return action;
        },

        /**
         * Remove an action from the bench by ID
         */
        remove: (actionId: string) => {
            update(actions => actions.filter(a => a.id !== actionId));
        },

        /**
         * Update an existing action
         */
        update: (actionId: string, updates: Partial<BenchAction>) => {
            update(actions => actions.map(a =>
                a.id === actionId
                    ? { ...a, ...updates, isEdited: true }
                    : a
            ));
        },

        /**
         * Update action name (commonly used for renaming parsed actions)
         */
        rename: (actionId: string, newName: string) => {
            update(actions => actions.map(a =>
                a.id === actionId
                    ? { ...a, name: newName, isEdited: true, status: 'clean' as BenchActionStatus }
                    : a
            ));
        },

        /**
         * Update action type
         */
        setType: (actionId: string, type: string) => {
            update(actions => actions.map(a =>
                a.id === actionId ? { ...a, type: type as ActionType, isEdited: true } : a
            ));
        },

        /**
         * Update action intensity
         */
        setIntensity: (actionId: string, intensity: number) => {
            update(actions => actions.map(a =>
                a.id === actionId
                    ? { ...a, intensity: Math.max(1, Math.min(10, intensity)), isEdited: true }
                    : a
            ));
        },

        /**
         * Update action value/priority
         */
        setValue: (actionId: string, value: ActionValue) => {
            update(actions => actions.map(a =>
                a.id === actionId ? { ...a, value, isEdited: true } : a
            ));
        },

        /**
         * Set action status (for parsing feedback)
         */
        setStatus: (actionId: string, status: BenchActionStatus) => {
            update(actions => actions.map(a =>
                a.id === actionId ? { ...a, status } : a
            ));
        },

        /**
         * Reorder actions (for drag and drop)
         */
        reorder: (fromIndex: number, toIndex: number) => {
            update(actions => {
                const result = [...actions];
                const [removed] = result.splice(fromIndex, 1);
                result.splice(toIndex, 0, removed);
                return result;
            });
        },

        /**
         * Clear all actions from the bench
         */
        clear: () => {
            set([]);
        },

        /**
         * Get action by ID (non-reactive)
         */
        getById: (actionId: string): BenchAction | undefined => {
            let result: BenchAction | undefined;
            const unsubscribe = subscribe(actions => {
                result = actions.find(a => a.id === actionId);
            });
            unsubscribe();
            return result;
        }
    };
}

export const actionBench = createActionBenchStore();

/**
 * Derived store: Count of actions on the bench
 */
export const benchCount = derived(actionBench, $actions => $actions.length);

/**
 * Derived store: Actions that need attention (warning/error status)
 */
export const actionsNeedingAttention = derived(
    actionBench,
    $actions => $actions.filter(a => a.status !== 'clean')
);

/**
 * Derived store: Actions grouped by category
 */
export const actionsByCategory = derived(actionBench, $actions => {
    const grouped: Record<string, BenchAction[]> = {};
    for (const action of $actions) {
        const category = action.category ?? 'Uncategorized';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(action);
    }
    return grouped;
});

/**
 * Derived store: Actions sorted by intensity (highest first)
 */
export const actionsByIntensity = derived(
    actionBench,
    $actions => [...$actions].sort((a, b) => b.intensity - a.intensity)
);
