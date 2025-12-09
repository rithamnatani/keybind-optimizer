/**
 * Central export for all stores
 */

// Physical maps
export {
    keyboardMap,
    mouseMap,
    PHYSICAL_KEYBOARD_MAP,
    PHYSICAL_MOUSE_MAP,
    KEYBOARD_MAP_BY_ID,
    MOUSE_MAP_BY_ID,
    getKeyById,
    getKeysByFinger,
    getHomeRowKeys,
    getKeyDistance,
    getDistanceToPoint
} from './keyboardMap';

// User configuration
export {
    userHand,
    getFingerForKey,
    isAnchorKey,
    isMovementKey,
    keysForFinger
} from './userHand';

// Action bench
export {
    actionBench,
    benchCount,
    actionsNeedingAttention,
    actionsByCategory,
    actionsByIntensity,
    createBenchAction,
    type BenchAction,
    type BenchActionStatus
} from './actionBench';

// Keybinds
export {
    keybinds,
    getBindsForKey,
    getBindForAction,
    bindsWithIssues,
    keybindsByKey,
    totalBindCount,
    issueCount,
    createKeybind,
    type Keybind
} from './keybinds';

// Profiles
export {
    profiles,
    allFolders,
    allProfiles,
    activeProfile,
    masterProfile,
    profilesByFolder,
    folderTree,
    type Profile,
    type ProfileFolder
} from './profiles';

// Finger load tracking
export {
    fingerLoad,
    getFingerLoad,
    overloadedFingers,
    totalLoad,
    averageLoadPercentage,
    loadBalanceScore,
    type FingerLoadState,
    type FingerLoadMap
} from './fingerLoad';
