<script lang="ts">
    import { Finger } from "$lib/types";
    import { userHand } from "$lib/stores/userHand";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{ close: void }>();

    // Current editing mode
    type Mode = "finger" | "anchor" | "movement";
    let mode: Mode = "finger";
    let selectedFinger: Finger = Finger.INDEX;

    // Finger color mappings (from UI spec)
    const fingerColors: Record<
        Finger,
        { name: string; bg: string; text: string; accent: string }
    > = {
        [Finger.THUMB]: {
            name: "Thumb",
            bg: "bg-yellow-500/20",
            text: "text-yellow-400",
            accent: "ring-yellow-500",
        },
        [Finger.INDEX]: {
            name: "Index",
            bg: "bg-red-500/20",
            text: "text-red-400",
            accent: "ring-red-500",
        },
        [Finger.MIDDLE]: {
            name: "Middle",
            bg: "bg-green-500/20",
            text: "text-green-400",
            accent: "ring-green-500",
        },
        [Finger.RING]: {
            name: "Ring",
            bg: "bg-blue-500/20",
            text: "text-blue-400",
            accent: "ring-blue-500",
        },
        [Finger.PINKY]: {
            name: "Pinky",
            bg: "bg-purple-500/20",
            text: "text-purple-400",
            accent: "ring-purple-500",
        },
    };

    // Get the finger color classes for a key
    export function getFingerColorClasses(finger: Finger | undefined): {
        bg: string;
        text: string;
    } {
        if (!finger) return { bg: "", text: "" };
        return { bg: fingerColors[finger].bg, text: fingerColors[finger].text };
    }

    function selectFinger(finger: Finger) {
        selectedFinger = finger;
        mode = "finger";
    }

    function handleKeyClick(keyId: string) {
        if (mode === "finger") {
            userHand.assignFinger(keyId, selectedFinger);
        } else if (mode === "anchor") {
            userHand.toggleAnchor(keyId);
        } else if (mode === "movement") {
            userHand.toggleMovementKey(keyId);
        }
    }

    function resetToDefaults() {
        userHand.reset();
    }

    function close() {
        dispatch("close");
    }

    // Get display info for the keyboard preview
    $: keyAssignments = $userHand.keyAssignments;
    $: anchorKeys = $userHand.anchorKeys;
    $: movementKeys = $userHand.movementKeys;
</script>

<div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
>
    <div
        class="bg-base-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
    >
        <!-- Header -->
        <div
            class="p-4 border-b border-base-content/10 flex items-center justify-between"
        >
            <div>
                <h2 class="text-xl font-bold">Finger Paint Configuration</h2>
                <p class="text-sm text-base-content/60">
                    Click a finger, then paint keys on the keyboard
                </p>
            </div>
            <button
                class="btn btn-ghost btn-sm btn-square"
                on:click={close}
                aria-label="Close"
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-6">
            <div class="flex gap-8">
                <!-- Left: Hand Wireframe -->
                <div class="flex-shrink-0 w-64">
                    <h3
                        class="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-4"
                    >
                        Select Finger
                    </h3>

                    <!-- Simple Hand SVG -->
                    <div
                        class="relative aspect-square bg-base-300 rounded-xl p-4"
                    >
                        <svg viewBox="0 0 100 120" class="w-full h-full">
                            <!-- Palm -->
                            <ellipse
                                cx="50"
                                cy="85"
                                rx="35"
                                ry="30"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                class="text-base-content/30"
                            />

                            <!-- Thumb -->
                            <g
                                class="cursor-pointer transition-all {selectedFinger ===
                                Finger.THUMB
                                    ? 'opacity-100'
                                    : 'opacity-60 hover:opacity-80'}"
                                on:click={() => selectFinger(Finger.THUMB)}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    selectFinger(Finger.THUMB)}
                                role="button"
                                tabindex="0"
                            >
                                <ellipse
                                    cx="18"
                                    cy="70"
                                    rx="8"
                                    ry="14"
                                    class="fill-yellow-500/30 stroke-yellow-500 {selectedFinger ===
                                    Finger.THUMB
                                        ? 'stroke-[3]'
                                        : 'stroke-[1.5]'}"
                                />
                                <text
                                    x="18"
                                    y="74"
                                    text-anchor="middle"
                                    class="text-[6px] fill-yellow-400 font-medium"
                                    >T</text
                                >
                            </g>

                            <!-- Index -->
                            <g
                                class="cursor-pointer transition-all {selectedFinger ===
                                Finger.INDEX
                                    ? 'opacity-100'
                                    : 'opacity-60 hover:opacity-80'}"
                                on:click={() => selectFinger(Finger.INDEX)}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    selectFinger(Finger.INDEX)}
                                role="button"
                                tabindex="0"
                            >
                                <rect
                                    x="28"
                                    y="20"
                                    width="12"
                                    height="40"
                                    rx="6"
                                    class="fill-red-500/30 stroke-red-500 {selectedFinger ===
                                    Finger.INDEX
                                        ? 'stroke-[3]'
                                        : 'stroke-[1.5]'}"
                                />
                                <text
                                    x="34"
                                    y="44"
                                    text-anchor="middle"
                                    class="text-[6px] fill-red-400 font-medium"
                                    >I</text
                                >
                            </g>

                            <!-- Middle -->
                            <g
                                class="cursor-pointer transition-all {selectedFinger ===
                                Finger.MIDDLE
                                    ? 'opacity-100'
                                    : 'opacity-60 hover:opacity-80'}"
                                on:click={() => selectFinger(Finger.MIDDLE)}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    selectFinger(Finger.MIDDLE)}
                                role="button"
                                tabindex="0"
                            >
                                <rect
                                    x="44"
                                    y="10"
                                    width="12"
                                    height="48"
                                    rx="6"
                                    class="fill-green-500/30 stroke-green-500 {selectedFinger ===
                                    Finger.MIDDLE
                                        ? 'stroke-[3]'
                                        : 'stroke-[1.5]'}"
                                />
                                <text
                                    x="50"
                                    y="38"
                                    text-anchor="middle"
                                    class="text-[6px] fill-green-400 font-medium"
                                    >M</text
                                >
                            </g>

                            <!-- Ring -->
                            <g
                                class="cursor-pointer transition-all {selectedFinger ===
                                Finger.RING
                                    ? 'opacity-100'
                                    : 'opacity-60 hover:opacity-80'}"
                                on:click={() => selectFinger(Finger.RING)}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    selectFinger(Finger.RING)}
                                role="button"
                                tabindex="0"
                            >
                                <rect
                                    x="60"
                                    y="15"
                                    width="12"
                                    height="45"
                                    rx="6"
                                    class="fill-blue-500/30 stroke-blue-500 {selectedFinger ===
                                    Finger.RING
                                        ? 'stroke-[3]'
                                        : 'stroke-[1.5]'}"
                                />
                                <text
                                    x="66"
                                    y="42"
                                    text-anchor="middle"
                                    class="text-[6px] fill-blue-400 font-medium"
                                    >R</text
                                >
                            </g>

                            <!-- Pinky -->
                            <g
                                class="cursor-pointer transition-all {selectedFinger ===
                                Finger.PINKY
                                    ? 'opacity-100'
                                    : 'opacity-60 hover:opacity-80'}"
                                on:click={() => selectFinger(Finger.PINKY)}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    selectFinger(Finger.PINKY)}
                                role="button"
                                tabindex="0"
                            >
                                <rect
                                    x="76"
                                    y="28"
                                    width="10"
                                    height="35"
                                    rx="5"
                                    class="fill-purple-500/30 stroke-purple-500 {selectedFinger ===
                                    Finger.PINKY
                                        ? 'stroke-[3]'
                                        : 'stroke-[1.5]'}"
                                />
                                <text
                                    x="81"
                                    y="50"
                                    text-anchor="middle"
                                    class="text-[6px] fill-purple-400 font-medium"
                                    >P</text
                                >
                            </g>
                        </svg>
                    </div>

                    <!-- Mode Selection -->
                    <div class="mt-4 space-y-2">
                        <h3
                            class="text-sm font-semibold text-base-content/70 uppercase tracking-wider"
                        >
                            Paint Mode
                        </h3>
                        <div class="btn-group btn-group-vertical w-full">
                            <button
                                class="btn btn-sm {mode === 'finger'
                                    ? 'btn-primary'
                                    : 'btn-ghost'}"
                                on:click={() => (mode = "finger")}
                            >
                                🎨 Finger Assignment
                            </button>
                            <button
                                class="btn btn-sm {mode === 'anchor'
                                    ? 'btn-primary'
                                    : 'btn-ghost'}"
                                on:click={() => (mode = "anchor")}
                            >
                                ⚓ Anchor Keys
                            </button>
                            <button
                                class="btn btn-sm {mode === 'movement'
                                    ? 'btn-primary'
                                    : 'btn-ghost'}"
                                on:click={() => (mode = "movement")}
                            >
                                🎮 Movement Keys
                            </button>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div class="mt-4 space-y-1">
                        <h3
                            class="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-2"
                        >
                            Colors
                        </h3>
                        {#each Object.entries(fingerColors) as [finger, color]}
                            <div class="flex items-center gap-2 text-xs">
                                <div
                                    class="w-3 h-3 rounded {color.bg} border {color.text}"
                                ></div>
                                <span class={color.text}>{color.name}</span>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Right: Mini Keyboard Preview -->
                <div class="flex-1">
                    <h3
                        class="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-4"
                    >
                        Click Keys to Paint
                        <span class="text-primary ml-2">
                            {#if mode === "finger"}
                                ({fingerColors[selectedFinger].name})
                            {:else if mode === "anchor"}
                                (Toggle Anchor)
                            {:else}
                                (Toggle Movement)
                            {/if}
                        </span>
                    </h3>

                    <div class="bg-base-300 rounded-xl p-4">
                        <!-- Number Row -->
                        <div class="flex gap-1 mb-1 justify-center">
                            {#each ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="] as key}
                                {@const keyId =
                                    key === "`"
                                        ? "GRAVE"
                                        : key === "-"
                                          ? "MINUS"
                                          : key === "="
                                            ? "EQUAL"
                                            : key}
                                {@const finger = keyAssignments[keyId]}
                                {@const isAnchor = anchorKeys.includes(keyId)}
                                {@const isMovement =
                                    movementKeys.includes(keyId)}
                                {@const colors = finger
                                    ? fingerColors[finger]
                                    : null}
                                <button
                                    class="w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-mono transition-all
                    {colors ? colors.bg : 'bg-base-100/50'}
                    {colors ? colors.accent : 'border-base-content/20'}
                    {isAnchor ? 'ring-2 ring-white/50' : ''}
                    {isMovement ? 'border-dashed border-warning' : ''}
                    hover:scale-105 active:scale-95"
                                    on:click={() => handleKeyClick(keyId)}
                                >
                                    <span
                                        class={colors
                                            ? colors.text
                                            : "text-base-content/40"}
                                        >{key}</span
                                    >
                                    {#if isAnchor}<span
                                            class="text-[6px] text-white/60"
                                            >⚓</span
                                        >{/if}
                                </button>
                            {/each}
                        </div>

                        <!-- QWERTY Row -->
                        <div class="flex gap-1 mb-1 justify-center ml-4">
                            {#each ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"] as key}
                                {@const keyId =
                                    key === "["
                                        ? "LBRACKET"
                                        : key === "]"
                                          ? "RBRACKET"
                                          : key === "\\"
                                            ? "BACKSLASH"
                                            : key}
                                {@const finger = keyAssignments[keyId]}
                                {@const isAnchor = anchorKeys.includes(keyId)}
                                {@const isMovement =
                                    movementKeys.includes(keyId)}
                                {@const colors = finger
                                    ? fingerColors[finger]
                                    : null}
                                <button
                                    class="w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-mono transition-all
                    {colors ? colors.bg : 'bg-base-100/50'}
                    {colors ? colors.accent : 'border-base-content/20'}
                    {isAnchor ? 'ring-2 ring-white/50' : ''}
                    {isMovement ? 'border-dashed border-warning' : ''}
                    hover:scale-105 active:scale-95"
                                    on:click={() => handleKeyClick(keyId)}
                                >
                                    <span
                                        class={colors
                                            ? colors.text
                                            : "text-base-content/40"}
                                        >{key}</span
                                    >
                                    {#if isAnchor}<span
                                            class="text-[6px] text-white/60"
                                            >⚓</span
                                        >{/if}
                                </button>
                            {/each}
                        </div>

                        <!-- Home Row -->
                        <div class="flex gap-1 mb-1 justify-center ml-6">
                            {#each ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"] as key}
                                {@const keyId =
                                    key === ";"
                                        ? "SEMICOLON"
                                        : key === "'"
                                          ? "QUOTE"
                                          : key}
                                {@const finger = keyAssignments[keyId]}
                                {@const isAnchor = anchorKeys.includes(keyId)}
                                {@const isMovement =
                                    movementKeys.includes(keyId)}
                                {@const colors = finger
                                    ? fingerColors[finger]
                                    : null}
                                <button
                                    class="w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-mono transition-all
                    {colors ? colors.bg : 'bg-base-100/50'}
                    {colors ? colors.accent : 'border-base-content/20'}
                    {isAnchor ? 'ring-2 ring-white/50' : ''}
                    {isMovement ? 'border-dashed border-warning' : ''}
                    hover:scale-105 active:scale-95"
                                    on:click={() => handleKeyClick(keyId)}
                                >
                                    <span
                                        class={colors
                                            ? colors.text
                                            : "text-base-content/40"}
                                        >{key}</span
                                    >
                                    {#if isAnchor}<span
                                            class="text-[6px] text-white/60"
                                            >⚓</span
                                        >{/if}
                                </button>
                            {/each}
                        </div>

                        <!-- Bottom Row -->
                        <div class="flex gap-1 justify-center ml-8">
                            {#each ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"] as key}
                                {@const keyId =
                                    key === ","
                                        ? "COMMA"
                                        : key === "."
                                          ? "PERIOD"
                                          : key === "/"
                                            ? "SLASH"
                                            : key}
                                {@const finger = keyAssignments[keyId]}
                                {@const isAnchor = anchorKeys.includes(keyId)}
                                {@const isMovement =
                                    movementKeys.includes(keyId)}
                                {@const colors = finger
                                    ? fingerColors[finger]
                                    : null}
                                <button
                                    class="w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-mono transition-all
                    {colors ? colors.bg : 'bg-base-100/50'}
                    {colors ? colors.accent : 'border-base-content/20'}
                    {isAnchor ? 'ring-2 ring-white/50' : ''}
                    {isMovement ? 'border-dashed border-warning' : ''}
                    hover:scale-105 active:scale-95"
                                    on:click={() => handleKeyClick(keyId)}
                                >
                                    <span
                                        class={colors
                                            ? colors.text
                                            : "text-base-content/40"}
                                        >{key}</span
                                    >
                                    {#if isAnchor}<span
                                            class="text-[6px] text-white/60"
                                            >⚓</span
                                        >{/if}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Stats -->
                    <div class="mt-4 grid grid-cols-3 gap-4">
                        <div class="bg-base-300 rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-primary">
                                {Object.keys(keyAssignments).length}
                            </div>
                            <div class="text-xs text-base-content/60">
                                Keys Painted
                            </div>
                        </div>
                        <div class="bg-base-300 rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-success">
                                {anchorKeys.length}
                            </div>
                            <div class="text-xs text-base-content/60">
                                Anchor Keys
                            </div>
                        </div>
                        <div class="bg-base-300 rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-warning">
                                {movementKeys.length}
                            </div>
                            <div class="text-xs text-base-content/60">
                                Movement Keys
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-base-content/10 flex justify-between">
            <button class="btn btn-ghost" on:click={resetToDefaults}>
                Reset to Defaults
            </button>
            <div class="flex gap-2">
                <button class="btn btn-ghost" on:click={close}>Cancel</button>
                <button class="btn btn-primary" on:click={close}>Apply</button>
            </div>
        </div>
    </div>
</div>
