# BubbleFun gravity development

**Checkpoint: G3.2 — reliable Swing activation in v0.7.2 (review branch).**
G1 support analysis and G2 Gravity Lab are merged. G3 begins integrating
support-sensitive swaying into **normal Arcade and all three Puzzles**, not as
a separate game mode. Lab remains a controlled diagnostic only.

## Modular design

```text
config.js      board dimensions and stable tunables
grid.js        staggered geometry, neighbours and ordinary connectivity
supports.js    roof anchors, load-bearing regions, vulnerable bonds, stress
gravity.js     existing detachment/falling physics + explicit surge entry point
sway.js        constrained support-sensitive live attached motion
positions.js   shared live bubble coordinate lookup
game.js        shooting, turn sequence, scores, wins and effects coordination
render.js      drawing and eventual live physical position visualisation
```

Dependencies flow downward: `supports.js` uses the shared grid graph;
`gravity.js` consumes the analysis; the gameplay and UI must not leak back into
the support analyser.

## Rules preserved

- In **Normal Gravity**, all attached bubbles remain attached regardless of
  calculated stress. Removing their last ceiling path still makes them fall.
- In **Extreme Gravity**, some loaded single-support regions can disconnect.
- **Weight** is initially one unit per attached bubble in the dependent region.
- **Distinct ceiling anchors** count as independent supports. Two paths to the
  *same* ceiling bubble are **not** two independent roof supports.
- The analyser also finds **bridge bonds**: cut a single link and its dependent
  subtree has no other ceiling path.
- Bond strength is a positive tuneable value; reinforced attachments can
  survive higher forces.
- Never drop a group twice when both a region and nested bridge are weak.
- A ceiling bubble itself remains anchored; only bubbles below the ceiling
  can be released by this prototype.

## What G1 actually supplies

`src/supports.js`:
- `analyseSupports(board, {phase, layout, bondStrength})` returns supported and
  unsupported cells, suspended regions with their distinct roof anchors, and
  actual bridge bonds with their dependent load.
- `planGravitySurge(board, {force, threshold, ...})` calculates vulnerable
  groups and broken bonds **without modifying the board**.

`src/gravity.js`:
- `releaseGravitySurge(state, options)` explicitly applies the plan using the
  *existing* detached-bubble falling engine. It does not award points,
  trigger a sound or decide game outcomes.

The normal Arcade and puzzle turn loops **do not** call `releaseGravitySurge`.
G2 adds a **lab-only** button and a deterministic comparison board. There is
still no earned special shot or gravity-induced breakage in standard gameplay.

**Initial prototype settings** (`force: 1.5`, `threshold: 1`,
`bondStrength: 1`) are placeholders for playtesting, not final balance values.

## G2: what players can actually see

- In **Arcade**, press **Load test board** in Gravity Lab. In v0.7.1
  the board has a longer hanging pendulum and two independently anchored
  reference supports. Press **Swing the chain** to apply a damped push.
  From v0.7.2 Swing can be clicked **before loading** the test board: the
  action sets up the Lab and starts motion in one step.
- Amber-marked attachments show an overloaded single-ceiling-support chain.
  Mint-marked attachments identify the stronger, independently braced group.
- Press **Gravity Surge** once to release the vulnerable chain. The supported
  group remains attached. Detached objects use the existing falling physics.
- Press **Load test board** to try again. Restart returns to normal Arcade.
- The lab pauses firing and never saves a high score. Puzzles and standard
  Arcade cannot trigger the experimental Surge.
- Markers and support wires are a **diagnostic visual** following actual live
  bubble centres. The single-anchor chain swings around its fixed ceiling
  pivot. This is constrained rigid-body motion, not a deformable spring mesh.

`gravity-lab.js` provides a deterministic board; `gravity-hints.js`
prepares marker geometry from `analyseSupports`, and
`gravity-overlay.js` draws the markers without owning game logic.
`game.js` handles the explicit test action and its turn-safety checks.

## G3.2: explicit Swing activation and reduced motion

The Lab defaults to the device's system motion preference. Pressing **Swing
the chain** is an explicit user request to observe the diagnostic pendulum,
so it enables motion for that **one Lab state only**. A fresh Lab, ordinary
Arcade, and Puzzles continue respecting the system setting. The visible
tip-displacement readout comes from `sway.js`'s live attached position map.
Tests exercise this UI in desktop/mobile Chromium with both normal and
reduced-motion preferences. After Surge, **Reset & swing** reloads the
demonstration rather than leaving an inert button.

## G3: actual gentle sway in ordinary play (v0.7.0)

Attached bubble positions now move slightly and smoothly in ordinary Arcade
and all puzzles. Physics remains conservative: ceiling anchors are fixed;
singly supported hanging regions move more than multiple-anchor regions; shot
impacts trigger local ripples which decay. Connection weight affects the
movement amplitude, not automatic bond failure.

**Position invariant:**
- `sway.js` updates `state.attachedPositions` once per simulation tick.
- `positions.js` exposes `bubblePosition(state, row, col)` for drawing,
  explosions and release to the falling engine.
- The aiming guide and live projectile pass that **same map** to the shared
  `grid.js/shotBubbleCollision` predicate, so they see what players see.
- Grid cell centres and graph adjacency still own matching and the final
  snap location; visual movement is deliberately limited to stay fair.
- During opening/row animations the aim guide is hidden, since the board is
  temporarily presented with a separate entrance/row transition.
- **Reduced motion** disables sway, leaving canonical positions.
- The Gravity Lab now **uses live positions** as well. Its single-anchor
  structure rotates as a rigid pendulum about a fixed ceiling pivot; the
  braced structure stays nearly stationary. The support-warning overlay
  reads the same live positions rather than drawing phantom fixed links.

New support-aware movement is **not** a full elastic solver. It does not
redistribute real tension over multiple anchors, physically stretch links,
automatically sever connections, or provide earned Gravity Surge in levels.

**CI for the G3 review branch:** 82 Node tests passed and Chromium browser
checks passed at desktop 1300px / phone-sized 390px viewports. These are
automated checks; hands-on mobile and GitHub Pages deployment remain separate.

## Known limitations and next work

1. **Load is coarse:** region weight and single-link tributary weight are
   measured, but continuous force distribution across multiple anchors is not
   solved. Extremely heavy **multiply supported** regions do not yet tear free.
   They may need a separate overloading model.
2. **Movement is not a spring solver:** G3 supports small, visibly live sway
   but not continuous elastic link strain or realistic weight distribution.
3. **Experimental activation only:** G2 has a lab-only button and falling
   feedback; a balanced, earned Gravity Surge special for actual levels and
   scoring still needs separate design.
4. **Collision fairness:** G3 uses the *same current attached positions* for
   rendering, projectile collision, aim guide and fall origins. All future
   motion changes must keep that invariant.
5. **Browser verification:** tests for support geometry run for desktop and
   mobile layouts, but real-device behaviour still requires checking.

## Proposed follow-up milestones

- **G2: visual stress diagnostic and deliberate activation (v0.6.0).**
  Isolated Gravity Lab with warnings and button; normal levels remain unchanged.
- **G3: constrained, damped sway (v0.7.0 merged; v0.7.1 lab correction).** Integrated into normal
  Arcade and puzzles, with a shared live-position query.
- **G4: improve multi-anchor load sharing, stickiness and support failure.**
  Tune isolated heavy dual-support boards; no arbitrary collapse under normal gravity.
- **G5: more convincing elastic swinging and link stretch.** Evolve the
  constrained solver while maintaining renderer/guide/collision parity.
- **G6: gravity-led puzzles, earned specials, boss encounters and Fizzlings.**

## Tests

`tests/supports.test.js` checks single anchors, genuinely independent
supports, heavy branches, same-anchor double bonds, optional strengthening,
staggered phases, desktop/mobile geometry, side-effect-free planning and error
cases. `tests/surge.test.js` checks the opt-in release and keeps scoring with
the game coordinator. The GitHub Action runs `npm test` on PRs.

G1 was merged in PR #5. G2's automated tests cover physics and both board
layouts; its Chromium desktop/mobile smoke workflow confirms the lab controls,
Surge falling and puzzle isolation. A separate real-device playtest remains useful.
