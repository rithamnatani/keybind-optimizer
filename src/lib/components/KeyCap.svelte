<script lang="ts">
    import type { Keybind } from "$lib/stores/keybinds";
    import { OptimizationStatus, type Finger } from "$lib/types";
    import {
        FINGER_COLORS,
        type FingerColorConfig,
    } from "$lib/utils/fingerColors";
    import { userHand } from "$lib/stores/userHand";
    import { createEventDispatcher } from "svelte";

    export let keyId: string;
    export let keyLabel: string;
    export let binds: Keybind[] = [];
    export let isDropTarget: boolean = false;

    const dispatch = createEventDispatcher<{
        dragover: { keyId: string; event: DragEvent };
        dragleave: void;
        drop: { keyId: string; event: DragEvent };
    }>();

    // Get finger styling from userHand
    $: finger = $userHand.keyAssignments[keyId] as Finger | undefined;
    $: isAnchor = $userHand.anchorKeys.includes(keyId);
    $: isMovement = $userHand.movementKeys.includes(keyId);
    $: fingerColor = finger ? FINGER_COLORS[finger] : null;

    // Computed states
    $: hasBind = binds.length > 0;
    $: hasConflict = binds.some(
        (b) =>
            b.status === OptimizationStatus.CRITICAL ||
            b.status === OptimizationStatus.WARNING,
    );

    // Truncate action name for display
    function truncateName(name: string, maxLen: number = 6): string {
        return name.length > maxLen ? name.slice(0, maxLen) + "…" : name;
    }

    function handleDragOver(e: DragEvent) {
        dispatch("dragover", { keyId, event: e });
    }

    function handleDrop(e: DragEvent) {
        dispatch("drop", { keyId, event: e });
    }
</script>

<div
    class="w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-xs font-mono relative transition-all group
    {fingerColor ? fingerColor.bg : 'bg-base-300'}
    {fingerColor ? fingerColor.accent : 'border-base-content/10'}
    {isAnchor ? 'ring-2 ring-white/30' : ''}
    {isMovement ? 'border-dashed border-warning' : ''}
    {hasBind && !fingerColor ? 'border-primary bg-primary/10' : ''}
    {isDropTarget ? 'ring-2 ring-primary scale-105' : ''}
    {hasConflict ? 'border-error bg-error/10' : ''}"
    on:dragover|preventDefault={handleDragOver}
    on:dragleave={() => dispatch("dragleave")}
    on:drop|preventDefault={handleDrop}
    role="button"
    tabindex="0"
    title={binds.length > 0 ? binds.map((b) => b.actionName).join("\n") : ""}
>
    <!-- Key label -->
    <span
        class="{fingerColor
            ? fingerColor.text
            : 'text-base-content/40'} text-[10px] leading-none"
    >
        {keyLabel}
    </span>

    <!-- Action Stack: Show up to 2 visible actions -->
    {#if hasBind}
        <div class="flex flex-col items-center w-full px-0.5 overflow-hidden">
            {#each binds.slice(0, 2) as bind, i}
                {@const isBadBind =
                    bind.status === OptimizationStatus.CRITICAL ||
                    bind.status === OptimizationStatus.WARNING}
                <span
                    class="text-[7px] truncate max-w-full leading-tight
            {isBadBind
                        ? 'text-error underline decoration-error'
                        : i === 0
                          ? 'text-white'
                          : 'text-base-content/50'}"
                >
                    {truncateName(bind.actionName)}
                </span>
            {/each}
            {#if binds.length > 2}
                <span class="text-[6px] text-base-content/40"
                    >+{binds.length - 2}</span
                >
            {/if}
        </div>
    {/if}

    <!-- Conflict indicator line -->
    {#if hasConflict}
        <div
            class="absolute bottom-0 left-1 right-1 h-0.5 bg-error rounded"
        ></div>
    {/if}

    <!-- Hover tooltip with all binds -->
    {#if binds.length > 0}
        <div
            class="absolute hidden group-hover:block z-50 bottom-full left-1/2 -translate-x-1/2 mb-1
             bg-base-300 border border-base-content/20 rounded-lg shadow-xl p-2 min-w-max"
        >
            <div
                class="text-[10px] font-bold text-base-content/70 mb-1 border-b border-base-content/10 pb-1"
            >
                {keyLabel}
            </div>
            {#each binds as bind}
                {@const isBadBind =
                    bind.status === OptimizationStatus.CRITICAL ||
                    bind.status === OptimizationStatus.WARNING}
                <div
                    class="text-[9px] flex items-center gap-1 {isBadBind
                        ? 'text-error'
                        : 'text-base-content'}"
                >
                    {#if isBadBind}<span class="text-error">⚠</span>{/if}
                    <span>{bind.actionName}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>
