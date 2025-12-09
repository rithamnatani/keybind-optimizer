<script lang="ts">
  import { actionBench, type BenchAction } from "$lib/stores/actionBench";
  import { keybinds, keybindsByKey } from "$lib/stores/keybinds";
  import { userHand } from "$lib/stores/userHand";
  import { optimize } from "$lib/services/optimizer";
  import { ActionType, OptimizationStatus, Finger } from "$lib/types";
  import {
    profiles,
    folderTree,
    activeProfile,
    masterProfile,
  } from "$lib/stores/profiles";
  import { KEYBOARD_MAP_BY_ID, getKeyById } from "$lib/stores/keyboardMap";
  import { FINGER_COLORS, getFingerColor } from "$lib/utils/fingerColors";
  import FingerPaint from "$lib/components/FingerPaint.svelte";

  // Zone C (Bench) collapse state
  let isBenchCollapsed = false;
  // Zone A (File Explorer) collapse state
  let isExplorerCollapsed = false;

  // Parser state
  let configInput = "";
  let isParsing = false;
  let parseError = "";

  // Optimizer state
  let isOptimizing = false;

  // Editing state
  let editingId: string | null = null;
  let editingName = "";

  // Drag-and-drop state
  let draggedAction: BenchAction | null = null;
  let dropTargetKey: string | null = null;

  // Finger Paint modal state
  let showFingerPaint = false;

  // Helper to get finger colors for a key
  function getKeyFingerStyle(keyId: string) {
    const finger = $userHand.keyAssignments[keyId];
    const isAnchor = $userHand.anchorKeys.includes(keyId);
    const isMovement = $userHand.movementKeys.includes(keyId);
    const color = finger ? FINGER_COLORS[finger] : null;
    return { finger, isAnchor, isMovement, color };
  }

  // Calculate dynamic health bar (Accessible Key Density)
  $: totalAssignedKeys = Object.keys($userHand.keyAssignments).length;
  $: lowStrainKeys = Object.entries($userHand.keyAssignments).filter(
    ([keyId, finger]) => {
      const keyDef = KEYBOARD_MAP_BY_ID[keyId];
      if (!keyDef) return false;
      // Keys on home row or one row away are low-strain
      return keyDef.coordinates.y >= 1 && keyDef.coordinates.y <= 3;
    },
  ).length;
  $: healthPercent =
    totalAssignedKeys > 0
      ? Math.round((lowStrainKeys / totalAssignedKeys) * 100)
      : 0;
  $: healthStatus =
    healthPercent >= 70 ? "success" : healthPercent >= 50 ? "warning" : "error";
  $: healthLabel =
    healthPercent >= 70
      ? "Optimal"
      : healthPercent >= 50
        ? "Acceptable"
        : "Needs Work";

  function toggleBench() {
    isBenchCollapsed = !isBenchCollapsed;
  }

  function toggleExplorer() {
    isExplorerCollapsed = !isExplorerCollapsed;
  }

  function toggleFolder(folderId: string) {
    profiles.toggleFolder(folderId);
  }

  function selectFile(folderId: string, profileId: string) {
    profiles.setActiveProfile(profileId);
  }

  async function handleParse() {
    if (!configInput.trim()) return;

    isParsing = true;
    parseError = "";

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: configInput }),
      });

      const data = await response.json();

      if (data.error) {
        parseError = data.error;
      } else if (data.actions && data.actions.length > 0) {
        actionBench.addMany(data.actions);
        configInput = ""; // Clear input on success
      } else {
        parseError = "No actions found in config";
      }
    } catch (err) {
      parseError = "Failed to parse config";
      console.error(err);
    } finally {
      isParsing = false;
    }
  }

  function startEditing(action: BenchAction) {
    editingId = action.id;
    editingName = action.name;
  }

  function saveEditing() {
    if (editingId && editingName.trim()) {
      actionBench.rename(editingId, editingName.trim());
    }
    editingId = null;
    editingName = "";
  }

  function cancelEditing() {
    editingId = null;
    editingName = "";
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      saveEditing();
    } else if (event.key === "Escape") {
      cancelEditing();
    }
  }

  function handleAutoMap() {
    if ($actionBench.length === 0) return;

    isOptimizing = true;

    try {
      // Run the optimizer
      const results = optimize($actionBench, $userHand);

      // Clear existing binds and load new ones
      keybinds.clear();
      keybinds.loadAll(results);

      // Clear the bench (actions are now mapped)
      actionBench.clear();
    } catch (err) {
      console.error("Optimization failed:", err);
    } finally {
      isOptimizing = false;
    }
  }

  // Helper to get key ID from display label
  function getKeyId(label: string): string {
    const keyMap: Record<string, string> = {
      "`": "GRAVE",
      "-": "MINUS",
      "=": "EQUAL",
      "[": "LBRACKET",
      "]": "RBRACKET",
      "\\": "BACKSLASH",
      ";": "SEMICOLON",
      "'": "QUOTE",
      ",": "COMMA",
      ".": "PERIOD",
      "/": "SLASH",
    };
    return keyMap[label] || label;
  }

  // ============================================================================
  // DRAG-AND-DROP HANDLERS
  // ============================================================================

  function handleDragStart(action: BenchAction, event: DragEvent) {
    draggedAction = action;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", action.id);
    }
  }

  function handleDragEnd() {
    draggedAction = null;
    dropTargetKey = null;
  }

  function handleDragOver(keyId: string, event: DragEvent) {
    event.preventDefault();
    dropTargetKey = keyId;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDragLeave() {
    dropTargetKey = null;
  }

  function handleDrop(keyId: string, event: DragEvent) {
    event.preventDefault();
    dropTargetKey = null;

    if (!draggedAction) return;

    // Validate the drop
    const validation = validateDrop(draggedAction, keyId);

    // Create the keybind with validation status
    keybinds.bind(
      draggedAction.id,
      draggedAction.name,
      keyId,
      true, // isManual
    );

    // Update status if there are warnings
    if (!validation.valid) {
      keybinds.updateAnalysis(
        draggedAction.id,
        validation.isCritical
          ? OptimizationStatus.CRITICAL
          : OptimizationStatus.WARNING,
        validation.penalty,
        {
          reachScore: 0,
          conflictScore: validation.penalty,
          movementScore: 0,
          loadScore: 0,
          comboScore: 0,
        },
        validation.conflicts,
      );
    }

    // Remove from bench
    actionBench.remove(draggedAction.id);

    draggedAction = null;
  }

  // ============================================================================
  // VALIDATION FUNCTION
  // ============================================================================

  import { ConflictSeverity, type ConflictDetail } from "$lib/types";

  interface DropValidation {
    valid: boolean;
    isCritical: boolean;
    penalty: number;
    conflicts: ConflictDetail[];
  }

  function validateDrop(action: BenchAction, keyId: string): DropValidation {
    const conflicts: ConflictDetail[] = [];
    let penalty = 0;
    let isCritical = false;

    // Check movement key protection (using user-defined movement keys)
    if ($userHand.movementKeys.includes(keyId)) {
      if (action.type === ActionType.HOLD) {
        // HOLD on movement key is critical
        isCritical = true;
        penalty += 1000;
        conflicts.push({
          conflictingActionId: keyId,
          severity: ConflictSeverity.CRITICAL,
          reason: `HOLD action blocks movement key ${keyId}`,
        });
      } else {
        // TAP on movement key is a warning
        penalty += 50;
        conflicts.push({
          conflictingActionId: keyId,
          severity: ConflictSeverity.HIGH,
          reason: `Action on movement key may interfere with movement`,
        });
      }
    }

    return {
      valid: conflicts.length === 0,
      isCritical,
      penalty,
      conflicts,
    };
  }
</script>

<div class="h-screen w-screen overflow-hidden bg-base-300 flex flex-col">
  <!-- Main Content: The Desk Mat -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Zone A: File Explorer (Left Sidebar) -->
    <aside
      class="flex-shrink-0 bg-base-200 border-r border-base-content/10 flex flex-col transition-all duration-300 ease-in-out"
      class:w-[220px]={!isExplorerCollapsed}
      class:w-12={isExplorerCollapsed}
    >
      <!-- Explorer Header -->
      <div
        class="p-3 border-b border-base-content/10 flex items-center justify-between"
      >
        {#if !isExplorerCollapsed}
          <h2
            class="text-sm font-semibold text-base-content/70 uppercase tracking-wider"
          >
            Profiles
          </h2>
        {/if}
        <button
          class="btn btn-ghost btn-xs btn-square"
          on:click={toggleExplorer}
          aria-label={isExplorerCollapsed
            ? "Expand explorer"
            : "Collapse explorer"}
        >
          <svg
            class="w-4 h-4 transition-transform duration-300"
            class:rotate-180={!isExplorerCollapsed}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {#if !isExplorerCollapsed}
        <!-- Folder Tree -->
        <div class="flex-1 p-2 overflow-y-auto">
          {#each $folderTree as folder}
            <div class="mb-1">
              <!-- Folder Header -->
              <button
                class="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-base-300 transition-colors text-left"
                on:click={() => toggleFolder(folder.id)}
              >
                <svg
                  class="w-4 h-4 text-base-content/50 transition-transform duration-200"
                  class:rotate-90={folder.isOpen}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <svg
                  class="w-4 h-4 text-warning"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                  />
                </svg>
                <span class="text-sm font-medium truncate">{folder.name}</span>
              </button>

              <!-- Folder Contents -->
              {#if folder.isOpen}
                <div class="ml-4 pl-2 border-l border-base-content/10">
                  {#each folder.profiles as profile}
                    <button
                      class="w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left text-sm {$activeProfile?.id ===
                      profile.id
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-base-300'}"
                      on:click={() => selectFile(folder.id, profile.id)}
                    >
                      <svg
                        class="w-4 h-4 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span class="truncate">{profile.name}</span>
                      {#if profile.isMaster}
                        <span class="badge badge-xs badge-ghost">★</span>
                      {/if}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Explorer Footer Actions -->
        <div class="p-2 border-t border-base-content/10 space-y-1">
          <button class="btn btn-ghost btn-sm w-full justify-start gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            New Folder
          </button>
          <button class="btn btn-ghost btn-sm w-full justify-start gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Profile
          </button>
        </div>
      {/if}
    </aside>

    <!-- Zone B: Mouse + Keyboard (Center) -->
    <main class="flex-1 bg-base-100 flex flex-col overflow-hidden">
      <!-- Foundation Health Bar Header -->
      <header class="p-4 border-b border-base-content/10 bg-base-200/50">
        <div class="flex items-center justify-between mb-2">
          <h2
            class="text-sm font-semibold text-base-content/70 uppercase tracking-wider"
          >
            Foundation Health
          </h2>
          <div class="flex gap-2 items-center">
            <span class="badge badge-{healthStatus} badge-sm"
              >{healthLabel}</span
            >
            <button
              class="btn btn-ghost btn-xs gap-1"
              on:click={() => (showFingerPaint = true)}
              title="Configure Finger Paint"
            >
              🎨 Finger Paint
            </button>
          </div>
        </div>

        <!-- Health Bar -->
        <div class="w-full">
          <div class="flex items-center gap-3">
            <progress
              class="progress progress-{healthStatus} flex-1 h-3"
              value={healthPercent}
              max="100"
            ></progress>
            <span class="text-sm font-mono text-base-content/70"
              >{healthPercent}%</span
            >
          </div>
          <p class="text-xs text-base-content/50 mt-1">
            Accessible Key Density — {lowStrainKeys} of {totalAssignedKeys} keys
            within low-strain reach
          </p>
        </div>
      </header>

      <!-- Combined Visualizer Area -->
      <div class="flex-1 p-6 overflow-auto">
        <div class="max-w-5xl mx-auto space-y-6">
          <!-- Mouse Schematic (Above Keyboard) -->
          <div class="flex justify-center">
            <div class="bg-base-200 rounded-xl p-4 shadow-lg">
              <h3
                class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3 text-center"
              >
                Mouse
              </h3>
              <div class="flex gap-1 items-start">
                <!-- Side Buttons Column -->
                <div class="flex flex-col gap-1">
                  {#each ["MOUSE4", "MOUSE5"] as btnId}
                    {@const binds = $keybindsByKey[btnId] || []}
                    {@const style = getKeyFingerStyle(btnId)}
                    <div
                      class="w-10 h-10 rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono relative transition-all
                        {style.color ? style.color.bg : 'bg-base-300'}
                        {style.color
                        ? style.color.accent
                        : 'border-base-content/10'}
                        {binds.length > 0 ? 'border-primary' : ''}
                        {dropTargetKey === btnId
                        ? 'ring-2 ring-primary scale-105'
                        : ''}"
                      on:dragover={(e) => handleDragOver(btnId, e)}
                      on:dragleave={handleDragLeave}
                      on:drop={(e) => handleDrop(btnId, e)}
                      role="button"
                      tabindex="0"
                    >
                      <span
                        class={style.color
                          ? style.color.text
                          : "text-base-content/40"}
                        >{btnId === "MOUSE4" ? "M4" : "M5"}</span
                      >
                      {#if binds.length > 0}
                        <span
                          class="text-[6px] text-primary truncate max-w-full"
                          >{binds[0].actionName.slice(0, 4)}</span
                        >
                      {/if}
                    </div>
                  {/each}
                </div>
                <!-- Main Buttons -->
                <div class="flex flex-col gap-1">
                  <div class="flex gap-1">
                    {#each ["LMB"] as btnId}
                      {@const binds = $keybindsByKey[btnId] || []}
                      {@const style = getKeyFingerStyle(btnId)}
                      <div
                        class="w-14 h-16 rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono relative transition-all
                          {style.color ? style.color.bg : 'bg-base-300'}
                          {style.color
                          ? style.color.accent
                          : 'border-base-content/10'}
                          {binds.length > 0 ? 'border-primary' : ''}
                          {dropTargetKey === btnId
                          ? 'ring-2 ring-primary scale-105'
                          : ''}"
                        on:dragover={(e) => handleDragOver(btnId, e)}
                        on:dragleave={handleDragLeave}
                        on:drop={(e) => handleDrop(btnId, e)}
                        role="button"
                        tabindex="0"
                      >
                        <span
                          class={style.color
                            ? style.color.text
                            : "text-base-content/40"}>LMB</span
                        >
                        {#if binds.length > 0}
                          <span
                            class="text-[6px] text-primary truncate max-w-full"
                            >{binds[0].actionName.slice(0, 5)}</span
                          >
                        {/if}
                      </div>
                    {/each}
                    <div class="flex flex-col gap-1">
                      <div
                        class="w-8 h-5 bg-base-300 rounded border border-base-content/10 flex items-center justify-center text-base-content/40 text-[8px] font-mono"
                      >
                        ↑
                      </div>
                      {#each ["MMB"] as btnId}
                        {@const binds = $keybindsByKey[btnId] || []}
                        <div
                          class="w-8 h-5 rounded border flex items-center justify-center text-[8px] font-mono
                            {binds.length > 0
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-base-300 border-base-content/10 text-base-content/40'}
                            {dropTargetKey === btnId
                            ? 'ring-2 ring-primary scale-105'
                            : ''}"
                          on:dragover={(e) => handleDragOver(btnId, e)}
                          on:dragleave={handleDragLeave}
                          on:drop={(e) => handleDrop(btnId, e)}
                          role="button"
                          tabindex="0"
                        >
                          M3
                        </div>
                      {/each}
                      <div
                        class="w-8 h-5 bg-base-300 rounded border border-base-content/10 flex items-center justify-center text-base-content/40 text-[8px] font-mono"
                      >
                        ↓
                      </div>
                    </div>
                    {#each ["RMB"] as btnId}
                      {@const binds = $keybindsByKey[btnId] || []}
                      {@const style = getKeyFingerStyle(btnId)}
                      <div
                        class="w-14 h-16 rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono relative transition-all
                          {style.color ? style.color.bg : 'bg-base-300'}
                          {style.color
                          ? style.color.accent
                          : 'border-base-content/10'}
                          {binds.length > 0 ? 'border-primary' : ''}
                          {dropTargetKey === btnId
                          ? 'ring-2 ring-primary scale-105'
                          : ''}"
                        on:dragover={(e) => handleDragOver(btnId, e)}
                        on:dragleave={handleDragLeave}
                        on:drop={(e) => handleDrop(btnId, e)}
                        role="button"
                        tabindex="0"
                      >
                        <span
                          class={style.color
                            ? style.color.text
                            : "text-base-content/40"}>RMB</span
                        >
                        {#if binds.length > 0}
                          <span
                            class="text-[6px] text-primary truncate max-w-full"
                            >{binds[0].actionName.slice(0, 5)}</span
                          >
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Keyboard Container -->
          <div class="bg-base-200 rounded-2xl p-6 shadow-lg">
            <h3
              class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-4 text-center"
            >
              Keyboard
            </h3>

            <!-- Row 1: Number Row -->
            <div class="flex gap-1 mb-1 justify-center">
              {#each ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="] as key}
                {@const keyId = getKeyId(key)}
                {@const binds = $keybindsByKey[keyId] || []}
                {@const hasBind = binds.length !== 0}
                {@const isDropTarget = dropTargetKey === keyId}
                {@const hasConflict = binds.some(
                  (b) =>
                    b.status === OptimizationStatus.CRITICAL ||
                    b.status === OptimizationStatus.WARNING,
                )}
                {@const fingerStyle = getKeyFingerStyle(keyId)}
                <div
                  class="w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-xs font-mono relative transition-all
                    {fingerStyle.color ? fingerStyle.color.bg : 'bg-base-300'}
                    {fingerStyle.color
                    ? fingerStyle.color.accent
                    : 'border-base-content/10'}
                    {fingerStyle.isAnchor ? 'ring-2 ring-white/30' : ''}
                    {fingerStyle.isMovement
                    ? 'border-dashed border-warning'
                    : ''}
                    {hasBind && !fingerStyle.color
                    ? 'border-primary bg-primary/10'
                    : ''}
                    {isDropTarget ? 'ring-2 ring-primary scale-105' : ''}
                    {hasConflict ? 'border-error bg-error/10' : ''}"
                  on:dragover={(e) => handleDragOver(keyId, e)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(keyId, e)}
                  role="button"
                  tabindex="0"
                >
                  <span
                    class={fingerStyle.color
                      ? fingerStyle.color.text
                      : "text-base-content/40"}>{key}</span
                  >
                  {#if hasBind}
                    <span
                      class="text-[8px] truncate max-w-[40px] {hasConflict
                        ? 'text-error'
                        : 'text-primary'}">{binds[0].actionName}</span
                    >
                  {/if}
                  {#if hasConflict}
                    <div
                      class="absolute bottom-0 left-1 right-1 h-0.5 bg-error rounded"
                    ></div>
                  {/if}
                </div>
              {/each}
            </div>

            <!-- Row 2: QWERTY Row -->
            <div class="flex gap-1 mb-1 justify-center">
              <div
                class="w-16 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Tab
              </div>
              {#each ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"] as key}
                {@const keyId = getKeyId(key)}
                {@const binds = $keybindsByKey[keyId] || []}
                {@const hasBind = binds.length !== 0}
                {@const isDropTarget = dropTargetKey === keyId}
                {@const hasConflict = binds.some(
                  (b) =>
                    b.status === OptimizationStatus.CRITICAL ||
                    b.status === OptimizationStatus.WARNING,
                )}
                {@const fingerStyle = getKeyFingerStyle(keyId)}
                <div
                  class="w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-xs font-mono relative transition-all
                    {fingerStyle.color ? fingerStyle.color.bg : 'bg-base-300'}
                    {fingerStyle.color
                    ? fingerStyle.color.accent
                    : 'border-base-content/10'}
                    {fingerStyle.isAnchor ? 'ring-2 ring-white/30' : ''}
                    {fingerStyle.isMovement
                    ? 'border-dashed border-warning'
                    : ''}
                    {hasBind && !fingerStyle.color
                    ? 'border-primary bg-primary/10'
                    : ''}
                    {isDropTarget ? 'ring-2 ring-primary scale-105' : ''}
                    {hasConflict ? 'border-error bg-error/10' : ''}"
                  on:dragover={(e) => handleDragOver(keyId, e)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(keyId, e)}
                  role="button"
                  tabindex="0"
                >
                  <span
                    class={fingerStyle.color
                      ? fingerStyle.color.text
                      : "text-base-content/40"}>{key}</span
                  >
                  {#if hasBind}
                    <span
                      class="text-[8px] truncate max-w-[40px] {hasConflict
                        ? 'text-error'
                        : 'text-primary'}">{binds[0].actionName}</span
                    >
                  {/if}
                  {#if hasConflict}
                    <div
                      class="absolute bottom-0 left-1 right-1 h-0.5 bg-error rounded"
                    ></div>
                  {/if}
                </div>
              {/each}
            </div>

            <!-- Row 3: Home Row -->
            <div class="flex gap-1 mb-1 justify-center">
              <div
                class="w-20 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Caps
              </div>
              {#each ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"] as key}
                {@const keyId = getKeyId(key)}
                {@const binds = $keybindsByKey[keyId] || []}
                {@const hasBind = binds.length !== 0}
                {@const isDropTarget = dropTargetKey === keyId}
                {@const hasConflict = binds.some(
                  (b) =>
                    b.status === OptimizationStatus.CRITICAL ||
                    b.status === OptimizationStatus.WARNING,
                )}
                {@const fingerStyle = getKeyFingerStyle(keyId)}
                <div
                  class="w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-xs font-mono relative transition-all
                    {fingerStyle.color ? fingerStyle.color.bg : 'bg-base-300'}
                    {fingerStyle.color
                    ? fingerStyle.color.accent
                    : 'border-base-content/10'}
                    {fingerStyle.isAnchor ? 'ring-2 ring-white/30' : ''}
                    {fingerStyle.isMovement
                    ? 'border-dashed border-warning'
                    : ''}
                    {hasBind && !fingerStyle.color
                    ? 'border-primary bg-primary/10'
                    : ''}
                    {isDropTarget ? 'ring-2 ring-primary scale-105' : ''}
                    {hasConflict ? 'border-error bg-error/10' : ''}"
                  on:dragover={(e) => handleDragOver(keyId, e)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(keyId, e)}
                  role="button"
                  tabindex="0"
                >
                  <span
                    class={fingerStyle.color
                      ? fingerStyle.color.text
                      : "text-base-content/40"}>{key}</span
                  >
                  {#if hasBind}
                    <span
                      class="text-[8px] truncate max-w-[40px] {hasConflict
                        ? 'text-error'
                        : 'text-primary'}">{binds[0].actionName}</span
                    >
                  {/if}
                  {#if hasConflict}
                    <div
                      class="absolute bottom-0 left-1 right-1 h-0.5 bg-error rounded"
                    ></div>
                  {/if}
                </div>
              {/each}
              <div
                class="w-24 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Enter
              </div>
            </div>

            <!-- Row 4: Bottom Row -->
            <div class="flex gap-1 mb-1 justify-center">
              <div
                class="w-24 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Shift
              </div>
              {#each ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"] as key}
                {@const keyId = getKeyId(key)}
                {@const binds = $keybindsByKey[keyId] || []}
                {@const hasBind = binds.length !== 0}
                {@const isDropTarget = dropTargetKey === keyId}
                {@const hasConflict = binds.some(
                  (b) =>
                    b.status === OptimizationStatus.CRITICAL ||
                    b.status === OptimizationStatus.WARNING,
                )}
                {@const fingerStyle = getKeyFingerStyle(keyId)}
                <div
                  class="w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-xs font-mono relative transition-all
                    {fingerStyle.color ? fingerStyle.color.bg : 'bg-base-300'}
                    {fingerStyle.color
                    ? fingerStyle.color.accent
                    : 'border-base-content/10'}
                    {fingerStyle.isAnchor ? 'ring-2 ring-white/30' : ''}
                    {fingerStyle.isMovement
                    ? 'border-dashed border-warning'
                    : ''}
                    {hasBind && !fingerStyle.color
                    ? 'border-primary bg-primary/10'
                    : ''}
                    {isDropTarget ? 'ring-2 ring-primary scale-105' : ''}
                    {hasConflict ? 'border-error bg-error/10' : ''}"
                  on:dragover={(e) => handleDragOver(keyId, e)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(keyId, e)}
                  role="button"
                  tabindex="0"
                >
                  <span
                    class={fingerStyle.color
                      ? fingerStyle.color.text
                      : "text-base-content/40"}>{key}</span
                  >
                  {#if hasBind}
                    <span
                      class="text-[8px] truncate max-w-[40px] {hasConflict
                        ? 'text-error'
                        : 'text-primary'}">{binds[0].actionName}</span
                    >
                  {/if}
                  {#if hasConflict}
                    <div
                      class="absolute bottom-0 left-1 right-1 h-0.5 bg-error rounded"
                    ></div>
                  {/if}
                </div>
              {/each}
              <div
                class="w-28 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Shift
              </div>
            </div>

            <!-- Row 5: Space Row -->
            <div class="flex gap-1 justify-center">
              <div
                class="w-16 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Ctrl
              </div>
              <div
                class="w-12 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Win
              </div>
              <div
                class="w-16 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Alt
              </div>
              <div
                class="w-64 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Space
              </div>
              <div
                class="w-16 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Alt
              </div>
              <div
                class="w-12 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Fn
              </div>
              <div
                class="w-16 h-12 bg-base-300 rounded-lg border border-base-content/10 flex items-center justify-center text-base-content/40 text-xs font-mono"
              >
                Ctrl
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Terminal (Collapsible Bottom Drawer) -->
      <div class="border-t border-base-content/10 bg-base-200/50 p-3">
        <div class="flex items-start gap-3">
          <textarea
            bind:value={configInput}
            placeholder="Paste raw config here (e.g., bind 'r' '+reload')..."
            class="textarea textarea-bordered flex-1 font-mono text-sm min-h-[60px] resize-y"
            rows="2"
            disabled={isParsing}
          ></textarea>
          <button
            class="btn btn-primary btn-sm"
            on:click={handleParse}
            disabled={isParsing || !configInput.trim()}
          >
            {#if isParsing}
              <span class="loading loading-spinner loading-xs"></span>
              Parsing...
            {:else}
              Parse to Bench
            {/if}
          </button>
        </div>
        {#if parseError}
          <p class="text-error text-xs mt-2">{parseError}</p>
        {/if}
      </div>
    </main>

    <!-- Zone C: The Bench (Right Sidebar) -->
    <aside
      class="flex-shrink-0 bg-base-200 border-l border-base-content/10 flex flex-col transition-all duration-300 ease-in-out"
      class:w-[300px]={!isBenchCollapsed}
      class:w-12={isBenchCollapsed}
    >
      <!-- Bench Header -->
      <div
        class="p-3 border-b border-base-content/10 flex items-center justify-between"
      >
        {#if !isBenchCollapsed}
          <h2
            class="text-sm font-semibold text-base-content/70 uppercase tracking-wider"
          >
            Action Bench
          </h2>
        {/if}
        <button
          class="btn btn-ghost btn-xs btn-square"
          on:click={toggleBench}
          aria-label={isBenchCollapsed ? "Expand bench" : "Collapse bench"}
        >
          <svg
            class="w-4 h-4 transition-transform duration-300"
            class:rotate-180={isBenchCollapsed}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {#if !isBenchCollapsed}
        <!-- Unmapped Actions List -->
        <div class="flex-1 p-3 overflow-y-auto">
          <p class="text-xs text-base-content/50 mb-3">
            {$actionBench.length > 0
              ? "Drag actions to keys"
              : "Paste config below to add actions"}
          </p>

          <!-- Dynamic Action Cards from Store -->
          <div class="space-y-2">
            {#each $actionBench as action (action.id)}
              {@const borderClass =
                action.status === "warning"
                  ? "border-warning"
                  : action.status === "error"
                    ? "border-error"
                    : "border-base-content/10"}
              {@const textClass =
                action.status === "warning"
                  ? "text-warning"
                  : action.status === "error"
                    ? "text-error"
                    : ""}
              {@const isDragging = draggedAction?.id === action.id}
              <div
                class="bg-base-100 p-3 rounded-lg border cursor-grab hover:border-primary transition-colors {borderClass}"
                class:opacity-50={isDragging}
                class:scale-95={isDragging}
                draggable="true"
                on:dragstart={(e) => handleDragStart(action, e)}
                on:dragend={handleDragEnd}
                role="listitem"
              >
                <!-- Action Name (editable) -->
                {#if editingId === action.id}
                  <input
                    type="text"
                    bind:value={editingName}
                    on:keydown={handleKeydown}
                    on:blur={saveEditing}
                    class="input input-xs input-bordered w-full font-medium"
                    autofocus
                  />
                {:else}
                  <p
                    class="text-sm font-medium cursor-pointer hover:text-primary transition-colors {textClass}"
                    on:click={() => startEditing(action)}
                    on:keydown={(e) =>
                      e.key === "Enter" && startEditing(action)}
                    role="button"
                    tabindex="0"
                  >
                    {action.name}
                  </p>
                {/if}

                <!-- Type and Intensity Row -->
                <div class="flex items-center gap-2 mt-2">
                  <!-- Type Selector -->
                  <select
                    class="select select-xs select-bordered w-20"
                    value={action.type}
                    on:change={(e) =>
                      actionBench.setType(action.id, e.currentTarget.value)}
                  >
                    <option value="TAP">TAP</option>
                    <option value="HOLD">HOLD</option>
                    <option value="COMBO">COMBO</option>
                  </select>

                  <!-- Intensity Slider -->
                  <div class="flex-1 flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={action.intensity}
                      on:input={(e) =>
                        actionBench.setIntensity(
                          action.id,
                          parseInt(e.currentTarget.value),
                        )}
                      class="range range-xs range-primary flex-1"
                    />
                    <span class="text-xs font-mono w-4 text-base-content/50"
                      >{action.intensity}</span
                    >
                  </div>

                  <!-- Delete Button -->
                  <button
                    class="btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100"
                    on:click={() => actionBench.remove(action.id)}
                    aria-label="Remove action"
                  >
                    <svg
                      class="w-3 h-3"
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

                <!-- Category badge if present -->
                {#if action.category}
                  <span class="badge badge-ghost badge-xs mt-2"
                    >{action.category}</span
                  >
                {/if}
              </div>
            {:else}
              <div class="text-center py-8 text-base-content/30">
                <svg
                  class="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p class="text-xs">No actions yet</p>
              </div>
            {/each}
          </div>
        </div>

        <!-- Bench Footer Actions -->
        <div class="p-3 border-t border-base-content/10 space-y-2">
          <button
            class="btn btn-primary btn-sm w-full"
            disabled={$actionBench.length === 0 || isOptimizing}
            on:click={handleAutoMap}
          >
            {#if isOptimizing}
              <span class="loading loading-spinner loading-xs"></span>
              Mapping...
            {:else}
              Auto-Map Actions
            {/if}
          </button>
          <button
            class="btn btn-ghost btn-sm w-full"
            on:click={() => actionBench.clear()}
            disabled={$actionBench.length === 0}
          >
            Clear Bench
          </button>
        </div>
      {/if}
    </aside>
  </div>
</div>

<!-- Finger Paint Modal -->
{#if showFingerPaint}
  <FingerPaint on:close={() => (showFingerPaint = false)} />
{/if}
