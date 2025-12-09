/**
 * Profiles Store
 * 
 * Manages game profiles including the Master Bind (baseline) and game-specific profiles.
 * Handles save/load to LocalStorage for persistence.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { FingerPaintConfig, GameAction } from '$lib/types';
import type { Keybind } from './keybinds';
import type { BenchAction } from './actionBench';

const STORAGE_KEY = 'keybind-optimizer-profiles';
const ACTIVE_PROFILE_KEY = 'keybind-optimizer-active-profile';

/**
 * A complete profile containing all configuration for a game
 */
export interface Profile {
    /** Unique profile ID */
    id: string;

    /** Profile display name */
    name: string;

    /** Associated game name (or "Master" for baseline) */
    gameName: string;

    /** Whether this is the master/baseline profile */
    isMaster: boolean;

    /** Parent folder ID for organization */
    folderId: string;

    /** Finger paint configuration */
    fingerPaint: FingerPaintConfig;

    /** Actions defined for this profile */
    actions: GameAction[];

    /** Keybind mappings */
    keybinds: Keybind[];

    /** Created timestamp */
    createdAt: number;

    /** Last modified timestamp */
    updatedAt: number;
}

/**
 * A folder for organizing profiles
 */
export interface ProfileFolder {
    id: string;
    name: string;
    isOpen: boolean;
    createdAt: number;
}

/**
 * Complete profile data structure for storage
 */
interface ProfileData {
    folders: ProfileFolder[];
    profiles: Profile[];
    activeProfileId: string | null;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default profile data
 */
function createDefaultData(): ProfileData {
    const masterProfileId = generateId();
    const fpsFolderId = generateId();

    return {
        folders: [
            {
                id: fpsFolderId,
                name: 'FPS Profiles',
                isOpen: true,
                createdAt: Date.now()
            }
        ],
        profiles: [
            {
                id: masterProfileId,
                name: 'Master (Baseline)',
                gameName: 'Master',
                isMaster: true,
                folderId: fpsFolderId,
                fingerPaint: {
                    keyAssignments: {},
                    anchorKeys: ['A', 'S', 'D', 'F'],
                    movementKeys: ['W', 'A', 'S', 'D'],
                    handSpan: 4.5
                },
                actions: [],
                keybinds: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        ],
        activeProfileId: masterProfileId
    };
}

/**
 * Load profiles from LocalStorage
 */
function loadFromStorage(): ProfileData {
    if (!browser) return createDefaultData();

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored) as ProfileData;
        }
    } catch (e) {
        console.error('Failed to load profiles from storage:', e);
    }

    return createDefaultData();
}

/**
 * Save profiles to LocalStorage
 */
function saveToStorage(data: ProfileData): void {
    if (!browser) return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save profiles to storage:', e);
    }
}

/**
 * Profiles store implementation
 */
function createProfilesStore() {
    const { subscribe, set, update } = writable<ProfileData>(loadFromStorage());

    // Auto-save on changes
    subscribe(data => {
        saveToStorage(data);
    });

    return {
        subscribe,

        // =========================================================================
        // FOLDER OPERATIONS
        // =========================================================================

        /**
         * Create a new folder
         */
        createFolder: (name: string): string => {
            const id = generateId();
            update(data => ({
                ...data,
                folders: [...data.folders, {
                    id,
                    name,
                    isOpen: true,
                    createdAt: Date.now()
                }]
            }));
            return id;
        },

        /**
         * Rename a folder
         */
        renameFolder: (folderId: string, name: string) => {
            update(data => ({
                ...data,
                folders: data.folders.map(f =>
                    f.id === folderId ? { ...f, name } : f
                )
            }));
        },

        /**
         * Delete a folder and all its profiles
         */
        deleteFolder: (folderId: string) => {
            update(data => ({
                ...data,
                folders: data.folders.filter(f => f.id !== folderId),
                profiles: data.profiles.filter(p => p.folderId !== folderId)
            }));
        },

        /**
         * Toggle folder open/closed state
         */
        toggleFolder: (folderId: string) => {
            update(data => ({
                ...data,
                folders: data.folders.map(f =>
                    f.id === folderId ? { ...f, isOpen: !f.isOpen } : f
                )
            }));
        },

        // =========================================================================
        // PROFILE OPERATIONS
        // =========================================================================

        /**
         * Create a new profile
         */
        createProfile: (name: string, gameName: string, folderId: string): string => {
            const id = generateId();
            update(data => ({
                ...data,
                profiles: [...data.profiles, {
                    id,
                    name,
                    gameName,
                    isMaster: false,
                    folderId,
                    fingerPaint: {
                        keyAssignments: {},
                        anchorKeys: ['A', 'S', 'D', 'F'],
                        movementKeys: ['W', 'A', 'S', 'D'],
                        handSpan: 4.5
                    },
                    actions: [],
                    keybinds: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }]
            }));
            return id;
        },

        /**
         * Update a profile
         */
        updateProfile: (profileId: string, updates: Partial<Omit<Profile, 'id' | 'createdAt'>>) => {
            update(data => ({
                ...data,
                profiles: data.profiles.map(p =>
                    p.id === profileId
                        ? { ...p, ...updates, updatedAt: Date.now() }
                        : p
                )
            }));
        },

        /**
         * Delete a profile
         */
        deleteProfile: (profileId: string) => {
            update(data => {
                const newProfiles = data.profiles.filter(p => p.id !== profileId);
                return {
                    ...data,
                    profiles: newProfiles,
                    activeProfileId: data.activeProfileId === profileId
                        ? (newProfiles[0]?.id ?? null)
                        : data.activeProfileId
                };
            });
        },

        /**
         * Duplicate a profile
         */
        duplicateProfile: (profileId: string, newName: string): string | null => {
            const id = generateId();
            let created = false;

            update(data => {
                const source = data.profiles.find(p => p.id === profileId);
                if (!source) return data;

                created = true;
                return {
                    ...data,
                    profiles: [...data.profiles, {
                        ...source,
                        id,
                        name: newName,
                        isMaster: false,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }]
                };
            });

            return created ? id : null;
        },

        /**
         * Set the active profile
         */
        setActiveProfile: (profileId: string) => {
            update(data => ({
                ...data,
                activeProfileId: profileId
            }));
        },

        /**
         * Get the active profile (non-reactive)
         */
        getActiveProfile: (): Profile | null => {
            const data = get({ subscribe });
            return data.profiles.find(p => p.id === data.activeProfileId) ?? null;
        },

        /**
         * Get the master profile (non-reactive)
         */
        getMasterProfile: (): Profile | null => {
            const data = get({ subscribe });
            return data.profiles.find(p => p.isMaster) ?? null;
        },

        /**
         * Save current working state to the active profile
         */
        saveCurrentState: (
            fingerPaint: FingerPaintConfig,
            actions: GameAction[],
            keybinds: Keybind[]
        ) => {
            update(data => {
                if (!data.activeProfileId) return data;
                return {
                    ...data,
                    profiles: data.profiles.map(p =>
                        p.id === data.activeProfileId
                            ? { ...p, fingerPaint, actions, keybinds, updatedAt: Date.now() }
                            : p
                    )
                };
            });
        },

        /**
         * Move a profile to a different folder
         */
        moveProfile: (profileId: string, newFolderId: string) => {
            update(data => ({
                ...data,
                profiles: data.profiles.map(p =>
                    p.id === profileId ? { ...p, folderId: newFolderId } : p
                )
            }));
        },

        /**
         * Reset to default data
         */
        reset: () => {
            set(createDefaultData());
        }
    };
}

export const profiles = createProfilesStore();

/**
 * Derived: List of all folders
 */
export const allFolders = derived(profiles, $data => $data.folders);

/**
 * Derived: List of all profiles
 */
export const allProfiles = derived(profiles, $data => $data.profiles);

/**
 * Derived: The currently active profile
 */
export const activeProfile = derived(
    profiles,
    $data => $data.profiles.find(p => p.id === $data.activeProfileId) ?? null
);

/**
 * Derived: The master (baseline) profile
 */
export const masterProfile = derived(
    profiles,
    $data => $data.profiles.find(p => p.isMaster) ?? null
);

/**
 * Derived: Profiles grouped by folder
 */
export const profilesByFolder = derived(profiles, $data => {
    const grouped: Record<string, Profile[]> = {};
    for (const folder of $data.folders) {
        grouped[folder.id] = $data.profiles.filter(p => p.folderId === folder.id);
    }
    return grouped;
});

/**
 * Derived: Folder tree structure for UI
 */
export const folderTree = derived(profiles, $data => {
    return $data.folders.map(folder => ({
        ...folder,
        profiles: $data.profiles.filter(p => p.folderId === folder.id)
    }));
});
