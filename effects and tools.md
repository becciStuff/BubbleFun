# BubbleFun — Effects and Tools

**Status:** Gameplay design specification — **not an implementation request**.  
**Last discussed:** 29 October 2026.  
**Purpose:** Clearly separate special-effect bubbles *on the board* from one-use *player tools* and record their agreed interactions before making gameplay changes.

> **Do not build or reintroduce the rejected Gravity Shift / Gravity Orb / random-event system** from v0.9.0–v0.9.1. The normal physical gravity, swinging, sticky connections and contact-based matching already work and must be preserved. **Increase Gravity below is a specific, player-earned, single-use tool**, not an always-on shift mechanic.

## 1. Core distinction

| Category | Where it appears | What activates it |
| --- | --- | --- |
| **Special-effect bubble** | A bubble already present on the board | Its own defined condition — usually being destroyed, or physical contact for Frozen bubbles |
| **Player tool** | A separately earned, selectable ability | The player chooses to spend one full charge; the tool then performs **one use** |
| **Normal gravity** | The regular game physics | Always operates as already implemented. Not itself a special effect or tool |

Special-effect bubbles and player tools are **different systems**. Do not replace either with constantly visible directional controls or arbitrary random gravity changes.

## 2. Special-effect bubbles on the board

These belong to the playfield and are identifiable as special bubbles. The exact visual design, placement frequency and level progression are **TBD**.

### 2.1 Bomb Bubble

- **Trigger:** The Bomb Bubble is destroyed / activated.
- **Effect:** A radial explosion destroys other bubbles in its surrounding area.
- **Chain reactions:** If the blast destroys another bubble that carries a special effect, **that other special effect also activates**. Cascades can therefore continue.
- **TBD:** Exact radius, timing and how overlapping blasts are sequenced.

### 2.2 Row Clear Bubble

- **Trigger:** The Row Clear Bubble is destroyed / activated.
- **Effect:** Destroys **all bubbles across its row**.
- **Frozen bubbles in the row:** Destroyed immediately; they do not merely change colour.
- **TBD:** Precise treatment of a row with swinging bubbles, and whether every kind of special destroyed by the clear should chain-activate in exactly the same way as a Bomb Bubble's victims. Visual row effects must agree with the game's actual playfield geometry.

### 2.3 Column Clear Bubble

- **Trigger:** The Column Clear Bubble is destroyed / activated.
- **Effect:** Destroys **all bubbles in its column**.
- **Frozen bubbles in the column:** Destroyed immediately; they do not merely change colour.
- **Important geometry detail:** BubbleFun uses staggered hex-grid rows. We must define a visually understandable *column* before implementation so a clear follows the column the player sees, not an unintuitive storage index.
- **TBD:** Column width/alignment and chain-triggering rules for other affected specials.

### 2.4 Frozen Bubble

- **Contact trigger:** A normal fired bubble hitting a Frozen Bubble, **or a new physical contact** caused by gravity-driven swinging.
- **First contact effect:** The Frozen Bubble **changes into the same colour as the bubble that touched it**.
- **No immediate pop:** That first contact is **conversion only**, even if its new colour creates a group of three or more. A **later qualifying matching/contact event** is required for a pop.
- **Contact fairness:** Existing neighbouring bubbles swaying or remaining in contact must not repeatedly recolour it each frame. Only a genuine qualifying contact should count.
- **Destructive effects bypass conversion:** The following **destroy Frozen Bubbles outright**:
  - Bomb Bubble explosion;
  - Row Clear;
  - Column Clear;
  - Player-fired Bomb;
  - Rocket.
- **TBD:** Whether the incoming ordinary fired bubble is consumed/attached on conversion, how simultaneous different-colour contacts are resolved, and how a freshly converted bubble's later match is detected. Do not silently turn the initial conversion into an immediate match-pop.

### 2.5 Other board effects — to be designed

There should eventually be more types, but **none are agreed yet**. Record new ideas here only after their trigger, result and interactions are discussed.

## 3. Player tools — earned, selected and **single-use**

**Global rules agreed for every player tool:**

1. Each tool has **its own independent charge/progress** and its own qualifying earning conditions.
2. Once fully charged, the player can **save the tool** for a strategic moment and deliberately select/use it.
3. **One use consumes that tool's entire charge**; it then starts recharging from empty.
4. It **cannot be used again** until its charge is full again. It is never a permanent or unlimited toggle.
5. **At most one completed use is stored per tool** (no stockpiling multiple activations).
6. Different tools are not assumed to earn charge from the same events. The exact charge amounts, caps and presentation are **TBD**.
7. Selecting a player tool must not automatically activate unrelated background gravity events.

### 3.1 Rocket

- **Action:** The player points and fires a rocket in a **straight line**.
- **Effect:** Destroys **only the bubbles the rocket passes through**.
- **No splash:** It does **not** create a radial explosion or clear neighbouring bubbles merely for being nearby.
- **Earning/charging:** Builds progress from destroyed bubbles and **score increases**. As the player's score grows, Rocket charging gets **faster**.
- **Consumption:** **One fired rocket** spends the full charge. It must recharge before another rocket can be fired.
- **Frozen interaction:** The rocket destroys Frozen Bubbles outright.
- **TBD:** Pierce length, starting/ending position, whether bubbles containing board effects trigger when directly destroyed by the rocket, and the charging formula. *Faster charge* does not mean the rocket itself becomes an area bomb.

### 3.2 Match Colour

- **Action:** The player fires/uses a colour-matching special. On striking a bubble, **the special becomes the colour of the bubble it hits**, setting up a potential match.
- **Earning/charging:** Builds **more slowly than Rocket**, and only earns charge from **qualifying combos involving four or more bubbles**, with score contributing to its progress.
- **Consumption:** One use spends the full charge; the tool must recharge.
- **TBD:** Exact projectile appearance, how the colour-copy interacts with Frozen Bubbles, whether a successful transformed shot pops immediately under normal matching rules, and the precise charge formula.

### 3.3 Increase Gravity (player-triggered Extreme Gravity)

- **Action:** The player **chooses when to activate** a short period of stronger downward gravity.
- **Effect:** Stronger gravity places extra strain on the existing connections. Structures **hanging by a single thread/connection are intended to break and fall**, creating opportunities for large gravity cascades.
- **Earning/charging:** **Only qualifying combos involving five or more bubbles** earn charge from their score.
- **Consumption:** **One brief activation** spends the full charge; it must recharge before another activation.
- **This is NOT the removed Gravity Shift system:** No random shifts, no permanent directional controls, no Gravity Orb shot. **Normal gravity remains unchanged** whenever this single-use tool is not active.
- **TBD:** Duration, force, exact definition of a single supporting thread, break/cascade ordering, and balance. The aim is a visibly powerful **player-chosen** event, especially rewarding when a risky low-hanging chain drops.

### 3.4 Bomb (player-fired tool)

- **Action:** The player deliberately fires a **Bomb** at the bubbles.
- **Effect:** Creates a **medium-sized radial explosion** at impact.
- **Distinct from Bomb Bubble:** This is a **fired player tool**, not a bomb already sitting on the board.
- **Earning/charging:** Only earn charge from **combos involving four or more bubbles where an exploding Bomb Bubble on the board is activated/destroyed**. Score from those qualifying events drives progress; ordinary four-bubble matches alone are **not** enough.
- **Consumption:** **One fired Bomb** spends its full charge; it must recharge.
- **Frozen interaction:** The blast destroys Frozen Bubbles outright.
- **TBD:** Medium blast radius, whether its blast triggers every special bubble it destroys, and exact charge formula.

### 3.5 Other player tools — to be designed

More tools may be added later, but **none are agreed yet**. Every new player tool must specify how it earns charge, how it is selected/used, its one-use effect, and what it does to Frozen and other special bubbles.

## 4. Agreed interaction summary

| Interaction | Intended outcome |
| --- | --- |
| Bomb Bubble destroys another special-effect bubble | **That special activates**, producing a possible chain reaction |
| Row Clear hits Frozen | Frozen is **destroyed immediately** |
| Column Clear hits Frozen | Frozen is **destroyed immediately** |
| Bomb Bubble blast hits Frozen | Frozen is **destroyed immediately** |
| Player Bomb blast hits Frozen | Frozen is **destroyed immediately** |
| Rocket passes through Frozen | Frozen is **destroyed immediately** |
| Ordinary fired bubble hits Frozen | Frozen **converts to incoming colour**; **does not pop on that first contact** |
| New gravity-swing contact hits Frozen | Frozen **converts to touching colour**; **does not pop on that first contact** |
| Frozen bubble later participates in a qualifying new match | Normal match rules may pop it **on a later event** |
| Player fires/uses a ready tool | **Exactly one use**; charge resets and must be earned again |
| Player uses Increase Gravity | Brief player-chosen higher gravity; weak single-thread supports intended to break/fall |
| Board idles or ordinary shots occur with no special trigger | **No random Gravity Shift event** |

**Chain-reaction design requirement:** Do not double-activate or double-score a bubble destroyed by overlapping explosions/clears. Exact ordering and whether *all* destructive effects propagate other specials identically still need approval. Bomb Bubble → other special activation **is** agreed.

## 5. Scoring and strategic risk/reward

The scoring change is **planned but not yet implemented**. It is an important part of why these effects and tools exist:

- **Depth matters:** A bubble popped or detached **closer to the bottom danger line** should award more points than one cleared high up.
- **Reward long hanging lines:** Players may deliberately grow a long, low-hanging chain, risking game over for a large eventual reward when an upper support is removed or Increase Gravity makes it drop.
- **Play safe or gamble:** Clearing early/high should be safer but generally worth less than a skilfully timed large, deep cascade.
- **Both pops and falls count:** Reward each affected bubble by **its own depth when it is removed/detached**. Don't inflate rewards just because an animation carries a bubble farther down afterward.
- **Count once:** A bubble must not pay out multiple times through pop, explosion, detachment and floor burst.
- **Combine cleanly:** Existing combos, bomb cascades and future depth bonuses should work with player-tool charging, but charging must be balanced so a single huge chain doesn't make every tool permanently reusable.
- **Future design:** Exact points, depth multipliers, charge rates and per-cascade caps are undecided. Preserve fair gameplay on desktop/mobile and in handcrafted Puzzles.

The detailed depth-scoring intent is also recorded in [VISION.md](VISION.md). The current normal spring physics is already valued; **do not rewrite it just to add scoring or specials**.

## 6. Questions deliberately left open

These are **not approved rules**. Settle them before implementation:

- How are Bomb, Row Clear and Column Clear bubbles distributed, identified and activated in levels?
- Should Row/Column Clear and player tools always trigger other special-effect bubbles they destroy, just as a Bomb Bubble does?
- What exactly is a *combo of 4+* or *5+* for charging (one matching group vs a full shot cascade), and which score components contribute?
- How quickly does each tool charge? What happens to charging during a huge cascade when a tool is already full?
- What happens to the fired bubble when it converts Frozen, and how are simultaneous swinging contacts adjudicated?
- How should staggered-grid *columns* be defined visually and physically?
- What are the Rocket length, both Bomb radii, Increase Gravity's duration and single-thread break rules?
- How should earned tools be presented and selected without cluttering the playfield?
- Which further board effects and player tools would be fun without undermining the risk/reward strategy?

## 7. Implementation guardrails

**This document is a design agreement, not permission to code.** Before any implementation, review the open questions with the game designer and make small, testable PRs.

Keep the established Arcade/Puzzle simulation: normal gravity-driven springs and swaying, sticky real contact links, only *newly formed* 3+ matching colour components popping, whole-group combos, explosions and falling, and uninterrupted motion when a new ceiling row arrives. **Do not reintroduce the removed experimental Gravity Shift/Event/Orb implementation.**

