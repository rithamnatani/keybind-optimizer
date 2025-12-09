/**
 * Keybinds Store
 * 
 * Stores the actual action-to-key mappings with optimization status and conflict details.
 * This is the output of the optimization engine.
 */

import { writable, derived } from 'svelte/store';
import {
    OptimizationStatus,
    type BindResult,
    type ConflictDetail,
    type ScoreBreakdown,
    type KeyDefinition,
    ConflictSeverity
} from '$lib/types';

/**
 * A keybind entry linking an action to a key with full analysis
 */
export interface Keybind {
    /** Action ID being bound */
    actionId: string;

    /** Action name for display */
    actionName: string;

    /** Target key ID */
    keyId: string;

    /** Optimization status */
    status: OptimizationStatus;

    /** Total optimization score (lower is better) */
    totalScore: number;

    /** Detailed score breakdown */
    scoreBreakdown: ScoreBreakdown;

    /** List of conflicts */
    conflicts: ConflictDetail[];

    /** Whether this was manually placed by user (vs auto-mapped) */
    isManual: boolean;

    /** Timestamp of when this bind was created */
    createdAt: number;
}

/**
 * Create an empty score breakdown
 */
function emptyScoreBreakdown(): ScoreBreakdown {
    return {
        reachScore: 0,
        conflictScore: 0,
        movementScore: 0,
        loadScore: 0,
        comboScore: 0
    };
}

/**
 * Create a new keybind entry
 */
export function createKeybind(
    actionId: string,
    actionName: string,
    keyId: string,
    options: Partial<Omit<Keybind, 'actionId' | 'actionName' | 'keyId'>> = {}
): Keybind {
    return {
        actionId,
        actionName,
        keyId,
        status: options.status ?? OptimizationStatus.OPTIMAL,
        totalScore: options.totalScore ?? 0,
        scoreBreakdown: options.scoreBreakdown ?? emptyScoreBreakdown(),
        conflicts: options.conflicts ?? [],
        isManual: options.isManual ?? false,
        createdAt: options.createdAt ?? Date.now()
    };
}

/**
 * Main keybinds store
 */
function createKeybindsStore() {
    const { subscribe, set, update } = writable<Keybind[]>([]);

    return {
        subscribe,

        /**
         * Add or update a keybind
         */
        set: (keybind: Keybind) => {
            update(binds => {
                const existing = binds.findIndex(b => b.actionId === keybind.actionId);
                if (existing >= 0) {
                    const updated = [...binds];
                    updated[existing] = keybind;
                    return updated;
                }
                return [...binds, keybind];
            });
        },

        /**
         * Bind an action to a key (simple version for manual binding)
         */
        bind: (actionId: string, actionName: string, keyId: string, isManual = true) => {
            const keybind = createKeybind(actionId, actionName, keyId, { isManual });
            update(binds => {
                const existing = binds.findIndex(b => b.actionId === actionId);
                if (existing >= 0) {
                    const updated = [...binds];
                    updated[existing] = keybind;
                    return updated;
                }
                return [...binds, keybind];
            });
        },

        /**
         * Unbind an action
         */
        unbind: (actionId: string) => {
            update(binds => binds.filter(b => b.actionId !== actionId));
        },

        /**
         * Unbind all actions from a specific key
         */
        unbindKey: (keyId: string) => {
            update(binds => binds.filter(b => b.keyId !== keyId));
        },

        /**
         * Update the status and scores for a keybind (after optimization recalculation)
         */
        updateAnalysis: (
            actionId: string,
            status: OptimizationStatus,
            totalScore: number,
            scoreBreakdown: ScoreBreakdown,
            conflicts: ConflictDetail[]
        ) => {
            update(binds => binds.map(b =>
                b.actionId === actionId
                    ? { ...b, status, totalScore, scoreBreakdown, conflicts }
                    : b
            ));
        },

        /**
         * Set all keybinds at once (for loading profiles)
         */
        loadAll: (keybinds: Keybind[]) => {
            set(keybinds);
        },

        /**
         * Clear all keybinds
         */
        clear: () => {
            set([]);
        },

        /**
         * Move a keybind to a different key
         */
        moveToKey: (actionId: string, newKeyId: string) => {
            update(binds => binds.map(b =>
                b.actionId === actionId
                    ? { ...b, keyId: newKeyId, isManual: true }
                    : b
            ));
        }
    };
}

export const keybinds = createKeybindsStore();

/**
 * Derived: Get binds for a specific key
 */
export const getBindsForKey = (keyId: string) =>
    derived(keybinds, $binds => $binds.filter(b => b.keyId === keyId));

/**
 * Derived: Get bind for a specific action
 */
export const getBindForAction = (actionId: string) =>
    derived(keybinds, $binds => $binds.find(b => b.actionId === actionId));

/**
 * Derived: All binds with issues (warnings or critical)
 */
export const bindsWithIssues = derived(
    keybinds,
    $binds => $binds.filter(b =>
        b.status === OptimizationStatus.WARNING ||
        b.status === OptimizationStatus.CRITICAL
    )
);

/**
 * Derived: Keybinds grouped by key ID
 */
export const keybindsByKey = derived(keybinds, $binds => {
    const grouped: Record<string, Keybind[]> = {};
    for (const bind of $binds) {
        if (!grouped[bind.keyId]) {
            grouped[bind.keyId] = [];
        }
        grouped[bind.keyId].push(bind);
    }
    return grouped;
});

/**
 * Derived: Count of total binds
 */
export const totalBindCount = derived(keybinds, $binds => $binds.length);

/**
 * Derived: Count of binds with issues
 */
export const issueCount = derived(bindsWithIssues, $issues => $issues.length);
