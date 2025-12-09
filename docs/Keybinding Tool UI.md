---
created: 2025-12-08 18:34
category:
status:
---
# Keybinding Tool UI

# Master Bind Optimizer: UI/UX Design Specification

## 1. Global Layout: "The Desk Mat"

The interface mimics a physical desktop setup, divided into three vertical zones.

- **Zone A (Left): The Schematic Mouse.**
    
    - _Purpose:_ Displays mouse bindings using a grid-based abstraction.
        
    - _Position:_ Aligned left to match the user's left-handed mouse usage.
        
- **Zone B (Center): The Spotlight Keyboard.**
    
    - _Purpose:_ The primary visualizer for keyboard binds, heatmap, and conflicts.
        
- **Zone C (Right): The Bench (Sidebar).**
    
    - _Purpose:_ Staging area for unmapped actions, parsing results, and manual editing.
        

---

## 2. Visual Logic: Spotlight & Heatmap

Visual hierarchy is determined by the "Finger Paint" configuration, avoiding algorithmic guesses in favor of user-defined constraints.

### The "Finger Paint" Setup

- **Configuration Mode:** User selects a finger on a static **Hand Wireframe**, then clicks specific keys on the keyboard to assign "ownership."
    
- **Color Palette (Finger Assignment):**
    
    - **Thumb:** 🟨 Yellow
        
    - **Index:** 🟥 Red
        
    - **Middle:** 🟩 Green
        
    - **Ring:** 🟦 Blue
        
    - **Pinky:** 🟪 Purple
        
- **Opacity Rules (Reachability):**
    
    - **Anchors (Home Row):** 100% Opacity (Solid background tint).
        
    - **Reach:** Opacity fades based on distance from the defined anchor.
        
    - **Unassigned:** 0% Opacity / Dark Outline only.
        

---

## 3. Component Design

### A. The "Action Stack" Keycap

Keys are data containers, not just buttons. 1:1 key scaling.

- **Structure:**
    
    - **Background:** Tinted by Finger Color (e.g., Red tint for Index keys).
        
    - **Key Label (e.g., 'T'):** Small, semi-transparent, bottom-right corner.
        
    - **Content Area:** Center-aligned list.
        
- **The Data Stack (Order of Operations):**
    
    1. **Row 1 (Primary):** Bright White Text. Large. (e.g., `RELOAD`)
        
    2. **Row 2 (Secondary):** Medium Grey Text. (e.g., `Open Door`)
        
    3. **Row 3 (Combo):** Colored Prefix Notation. (e.g., `^ Chat` for Ctrl+Chat).
        
- **Ghost Layer (Master Profile):**
    
    - A dim, grey text layer physically below the active binds showing the "Baseline" action for muscle memory comparison (e.g., `(Flash)`).
        
- **Text Constraints:**
    
    - **Limit:** 6-8 characters max.
        
    - **Truncation:** Ellipsis (`...`).
        
    - **Hover State:** Key z-index increases; list expands vertically to show full text/extra items.
        
- **Conflict Indicators:**
    
    - Status is per-line-item, not per-key.
        
    - **Visual:** Red underline + "!" icon on the specific text line causing a physiological conflict.
        

### B. The Schematic Mouse

Abstracts the physical mouse into a readable grid of "Key" blocks to support full text labels.

- **Grid Layout (Right-Handed Mouse):**
    
    - **Column A (Side Panel):** Stacked 1x1 keys (`Side 1`, `Side 2`).
        
    - **Column B (Main Left):** 2x1 Double-Wide key (`L-CLICK`).
        
    - **Column C (Scroll Cluster):** Vertical stack of 1x1 keys (`Scroll Up`, `Click`, `Down`).
        
    - **Column D (Main Right):** 2x1 Double-Wide key (`R-CLICK`).
        
- **Visuals:** Uses the exact same **Action Stack** UI and **Finger Coloring** as the keyboard.

### C. The Foundation Health Bar (Zone B Header)

Located above the Keyboard visualizer. Only shown while home/base keys are still being configured.

- **Visual:** A progress bar showing "Accessible Key Density."
    
- **Behavior:**
    
    - **Green:** Current hand position maximizes the number of reachable keys.
        
    - **Yellow:** Hand position is valid, but shifting (e.g., to the right) would unlock 3 more low-strain keys.
        
    - **Ghost Overlay:** If the user hovers over the warning, a **Ghost Hand** overlay appears on the keyboard showing the suggested optimal position vs. their current position.

---

## 4. Input & Mapping Workflow: "Sanitized Staging"

### Phase 1: The Input (The Dirty Box)

- **UI:** Collapsible drawer/terminal at bottom.
    
- **Action:** User pastes raw config text (messy).
    
- **Trigger:** User clicks `[PARSE TO BENCH]`.
    
- **Result:** Terminal closes; items populate the Right Sidebar.
    

### Phase 2: The Bench (Staging Area)

- **Location:** Zone C (Right Sidebar).
    
- **Item Design:** Draggable "Cards/Chips."
    
    - **Text:** Editable input field (User renames `+jump_long` to `Long Jump`).
        
    - **Controls:** `[X]` to delete; Drag-over to Merge (combine distinct modifiers).
        
    - **Status Colors:** White (Clean Parse), Yellow (Low Confidence/Verify).
        

### Phase 3: The Execution

- **Trigger:** `[AUTO-MAP ACTIONS]` button.
    
- **Animation:** Cards physically fly from Bench to Keyboard/Mouse zones.
    
- **Logic:**
    
    - **Success:** Card "snaps" into the Action Stack of the target key.
        
    - **Rejection:** Unmappable items (due to constraints) fly back to the Bench and turn **Red**.
        

---

## 5. Navigation & File Structure

- **Style:** Obsidian-like Tree View (Left Sidebar, collapsible).
    
- **Hierarchy:**
    
    - Folder: `FPS Profiles` -> `Master (Baseline)`, `Valorant`, `Deadlock`.
        
    - Folder: `MMO Profiles` -> `WoW`.
        
- **Visual Comparison:**
    
    - No split view. Comparison is handled via the **Ghost Layer** on individual keys.