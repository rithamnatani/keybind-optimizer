---
created: 2025-12-08 16:17
category:
status:
---
# Keybind Optimizing Logic
# The "Master Bind" Optimization Engine: Logic Specification

## I. Hardware & Biomechanical Constants

**Context:** Right Hand on Keyboard, Left Hand on Mouse.

**Home Position (User-Defined Variable):** _The logic imports these coordinates from the UI's "Finger Paint" configuration._

- **Anchors:** Defined by the keys the user selects as 100% opacity "Resting Keys."
    
- **Movement Cluster:** The specific keys assigned to the user's movement fingers (e.g., Middle/Ring).
    
- **Hand Span:** Calculated dynamically based on the distance between the user's defined Anchors.

### 1. Directional Bias Multipliers

Fingers are not rulers; they favor specific vector directions relative to the palm center.

|**Direction Vector**|**Classification**|**Multiplier**|**Rationale**|
|---|---|---|---|
|**Inward (Closing Hand)**|**Sweet Spot**|`0.8x`|Natural grasping motion. (e.g., Index $\to$ Right, Pinky $\to$ Left).|
|**Outward (Splaying)**|**Strain**|`1.5x` to `2.0x`|High tension, RSI risk. (e.g., Index $\to$ Left, Pinky $\to$ Right).|
|**Down (Flexion)**|**Natural**|`1.0x`|Curling finger is neutral.|
|**Up (Extension)**|**Strain**|`1.3x`|Extension is weaker than flexion.|

### 2. Finger Stamina Tiers

Defines the `MaxLoad` capacity before the engine forces a "Fatigue Penalty."

- **Tier S (Infinite):** Index, Thumb (Spacebar only).
    
- **Tier A (High):** Middle, Ring (Static/Holding).
    
- **Tier B (Medium):** Pinky (Tap heavy, avoid Hold).
    
- **Tier C (Low):** Thumb (Side keys: Z, X, C, V, Alt).
    

---

## II. Data Structures

### A. The Physical Key (`KeyDefinition`)

JSON

```
{
  "id": "K_R",
  "coordinates": { "x": 3.0, "y": 1.0 }, 
  "finger_owner": "INDEX", 
  "is_movement_key": false,
  "is_home_row": true
}
```

### B. The Logical Action (`GameAction`)

JSON

```
{
  "name": "Upgrade Ability 1",
  "type": "COMBO",             // TAP, HOLD, COMBO
  "intensity": 5,              // 1 (Occasional) to 10 (Spam)
  "value": "MEDIUM",           // HIGH (Critical), MEDIUM, LOW (Fluff)
  "simultaneous_with": ["Move_Forward", "Jump"], 
  "dependency": "Modifier_Z"   // If type is COMBO
}
```

---

## III. The Scoring Engines

### 1. Biomechanical Reach Score (The Heatmap)

Calculates the cost of a single key press based on vector logic from the Finger's Home.

$$Cost_{reach} = \sqrt{(dx \cdot M_{x})^2 + (dy \cdot M_{y})^2} \times P_{finger}$$

- **$dx, dy$:** Euclidean offset from Home Key.
    
- **$M_{x}$ (Horizontal Modifier):**
    
    - Index Moving Right / Pinky Moving Left $\to$ `0.8`
        
    - Index Moving Left / Pinky Moving Right $\to$ `1.5`
        
- **$M_{y}$ (Vertical Modifier):**
    
    - Moving Down $\to$ `1.0`
        
    - Moving Up $\to$ `1.4`
        
- **$P_{finger}$ (Base Penalty):**
    
    - Index/Middle $\to$ `1.0`
        
    - Ring $\to$ `1.2`
        
    - Pinky $\to$ `1.4`

- These values should be able to be modified as they are just based off educated guesses and not the absolute truth

### 2. The "Spider-Hand" Span Check (Combos)

Determines if a `Modifier + Key` combo is anatomically possible.

**Logic:**

1. Calculate Euclidean Distance ($d$) between `Modifier_Key` and `Action_Key`.
    
2. Lookup `MaxSpan` for the finger pair involved.
    
    - _Thumb + Index:_ MaxSpan = High (~6u).
        
    - _Middle + Ring:_ MaxSpan = Very Low (~1.5u).
        
3. Evaluate:
    
	$$If \ d > MaxSpan(F_1, F_2) \rightarrow \text{Return CRITICAL\_FAIL}$$
    $$Else \rightarrow \text{Return } Cost_{reach} + \text{AnchorDrag}$$
    

Anchor Drag:

If the hand is anchored (e.g., holding Z with Thumb), add a "Pivot Cost" to the Reach Score of the second key, as the hand cannot float freely.

### 3. Load Balancing (Fatigue Algorithm)

Prevents RSI by distributing high-intensity actions.

$$Load_{current} = \sum (Action.Intensity \text{ assigned to Finger})$$

**Penalty Logic:**

- If $Load_{current} > Finger.Capacity$: Apply **Overload Penalty (+50 pts)**.
    
- If $Finger$ is `Pinky` AND $Action.Type$ is `HOLD`: Apply **Weak Finger Hold Penalty (+100 pts)**.

### **4. Base Layout Efficiency (The Real Estate Score)**

Calculates the "Total Usable Surface Area" of a specific hand position.

$$Score_{layout} = \sum_{k \in Keys} \left( \frac{1}{Cost_{reach}(k)} \times Value_{finger} \right)$$

- **Logic:**
    
    - Iterates through every key on the keyboard relative to the current **Anchor** keys.
        
    - Uses the existing **Biomechanical Reach Score** ($Cost_{reach}$).
        
    - **Thresholding:** If $Cost_{reach} > Threshold_{pain}$, the key contributes **0 points** (it is effectively unusable).
        
    - **Goal:** Maximize the score. A higher score means more keys are accessible without moving the hand or straining.


---

## IV. Conflict & Severity Logic

The engine does not just say "Error." It calculates "Friction" to determine if the user can "Cope."

### 1. Simultaneous Input Matrix

Checks conflicts between `Action A` and `Action B` if they occur at the same time.

|**Scenario**|**Severity Score**|**Consequence**|
|---|---|---|
|**Same Key**|0|Allowed (Context Sensitive).|
|**Same Finger (Hold + Tap)**|**1000 (Critical)**|Physically Impossible. Finger is pinned.|
|**Same Finger (Tap + Tap)**|**500 (High)**|Limits APM. Bad for combos.|
|**Finger Cross-Up**|**200 (Med)**|Pinky pressing key to right of Ring finger.|
|**Spider-Span Violation**|**Infinite**|Anatomically impossible.|

### 2. Movement Sacrifice Tier

If an action is forced onto a **Movement Finger (Middle/Ring)**.

|**Movement Axis Lost**|**Penalty Score**|**Rationale**|
|---|---|---|
|**Forward (T)**|**INFINITE**|Never sacrifice forward movement.|
|**Backward (G)**|**High (300)**|Retreat is critical for survival.|
|**Strafe (Y/H)**|**Medium (100)**|Acceptable "Cope" for non-critical actions.|

---

## V. The Optimization Solver (Greedy + Backtracking)

**Phase 0: The Foundation Audit (Base Layout Suggestion)**

_This runs prior to assigning specific game actions to check if the user's hand placement is optimal._

Python

```
FUNCTION AuditBaseLayout(CurrentAnchors, PhysicalMap):
    # 1. Calculate Score of User's Chosen Position
    CurrentScore = CalculateLayoutScore(CurrentAnchors)
    
    # 2. Simulate Neighbors (Shift Hand Position)
    # Shifts the "Finger Paint" map by 1 unit in all directions
    Variations = [
        Shift(CurrentAnchors, x=+1), # Shift Right
        Shift(CurrentAnchors, x=-1), # Shift Left
        Shift(CurrentAnchors, y=+1)  # Shift Up
    ]
    
    Suggestions = []
    
    FOR Layout in Variations:
        SimulatedScore = CalculateLayoutScore(Layout)
        
        # 3. Compare Efficiency
        # If a shift offers > 15% more accessible keys
        IF SimulatedScore > (CurrentScore * 1.15):
             Suggestions.append({
                 "Type": "BETTER_BASE_FOUND",
                 "Suggestion": "Shift hand right 1 key.",
                 "Gain": "Gains access to 3 additional Tier-B keys."
             })
             
    RETURN Suggestions
```


**Phase 1: The Main Key binding**

_This is the main loop that assigns keys._

Input: List of GameActions (sorted by Priority/Frequency).

Output: Map of Action -> Key.

Python

```
FUNCTION Optimize(ActionList, PhysicalMap):
    Binds = {}
    FingerStates = {Index: 0, Middle: 0, ...} // Track Load

    FOR Action in ActionList:
        BestKey = NULL
        MinScore = INFINITY

        FOR Key in PhysicalMap:
            # 1. Base Biomechanical Cost
            Score = CalculateReachScore(Key)

            # 2. Check "Hard" Constraints (Conflicts)
            ConflictScore = 0
            FOR ExistingAction in Binds:
                IF AreSimultaneous(Action, ExistingAction):
                   ConflictScore += CheckConflict(Key, Binds[ExistingAction])

            # 3. Check Movement Integrity
            MovementScore = 0
            IF Key.is_movement_key:
                MovementScore = GetMovementSacrificePenalty(Key.axis)

            # 4. Check Load Balance
            LoadScore = FingerStates[Key.finger] * 0.5

            # 5. Check Modifier/Combo Logic
            ComboScore = 0
            IF Action.is_combo:
                ModKey = Binds[Action.dependency]
                ComboScore = CheckSpiderSpan(ModKey, Key) + AnchorDrag

            # 6. Total Calculation
            TotalScore = Score + ConflictScore + MovementScore + LoadScore + ComboScore

            IF TotalScore < MinScore:
                MinScore = TotalScore
                BestKey = Key

        # Assign, Update Load, and Flag Status
        Status = DetermineStatus(TotalScore, ConflictScore, MovementScore)
        Binds[Action] = { 
        "TargetKey": BestKey, 
        "Status": Status, 
        "ConflictDetails": ConflictReason # e.g., "Blocks Forward Movement" 
        }
        FingerStates[BestKey.finger] += Action.intensity
        
    
    RETURN Binds
```

---

## VI. Feedback Tiers (The Output)

**VI. Status Output (The API Response)**

The engine returns a `Status_Flag` for **each specific Action item** on a key (not the key itself). This allows the UI to render a "Critical" underline on one line item while leaving the rest of the key clean.

- **STATUS_OPTIMAL:**
    
    - Biomechanical Score < Threshold.
        
    - Zero Conflicts.
        
        
- **STATUS_SUBOPTIMAL:**
    
    - Score is valid but higher than the "Master Bind" baseline.
        
        
- **STATUS_WARNING:**
    
    - High Friction "Cope."
        
    - **Tap+Tap Conflict** (Two distinct actions assigned to this finger appearing in sequence).
        
        
- **STATUS_CRITICAL:**
    
    - **Hold+Tap Conflict** (Impossible physics: Finger is pinned holding this action, cannot press others).
        
    - **Movement Block** (This action prevents Forward/Strafe movement).
        
    - **Span Violation** (Impossible reach from current anchor).
        