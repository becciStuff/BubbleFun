# BubbleFun gravity development

**Checkpoint: G1 — support and weight model on a review branch.**
This describes the first new physics code, not a claim that the playable gravity
mechanic, swinging, or Gravity Surge special is finished.

## Modular design

```text
config.js      board dimensions and stable tunables
grid.js        staggered geometry, neighbours and ordinary connectivity
supports.js    roof anchors, load-bearing regions, vulnerable bonds, stress
gravity.js     existing detachment/falling physics + explicit surge entry point
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

The normal turn loop does **not** call `releaseGravitySurge`. There is no button
or keyboard shortcut for this prototype, and no visible gameplay change yet.
That's intentional: the new behaviour gets validated before we connect it to a
special shot or a level.

**Initial prototype settings** (`force: 1.5`, `threshold: 1`,
`bondStrength: 1`) are placeholders for playtesting, not final balance values.

## Known limitations and next work

1. **Load is coarse:** region weight and single-link tributary weight are
   measured, but continuous force distribution across multiple anchors is not
   solved. Extremely heavy **multiply supported** regions do not yet tear free.
   They may need a separate overloading model.
2. **No attached-body movement:** there is no spring solver, live displacement,
   visible stretching, or swaying in G1.
3. **No user activation:** Gravity Surge will need an explicit game action,
   ownership of scoring, a turn lifecycle and audiovisual warnings.
4. **Collision fairness:** attached moving bubbles must later share the *same
   current physical coordinates* with projectile collisions, aim guide and
   renderer. Keep that invariant non-negotiable.
5. **Browser verification:** tests for support geometry run for desktop and
   mobile layouts, but real-device behaviour still requires checking.

## Proposed follow-up milestones

- **G2: visual stress diagnostic and deliberate activation.** Show weak links
  legibly; let a player trigger a temporary prototype Surge without making
  puzzles impossible; award outcomes through `game.js` only.
- **G3: improved load sharing, stickiness and support failure.** Tune force
  thresholds against isolated test boards including heavy dual supports.
- **G4: constrained, damped sway.** Add a single authoritative live position
  query shared by rendering, shot collision and aiming; test stability on mobile.
- **G5: integrate into puzzles, special shots, boss encounters and Fizzlings.**

## Tests

`tests/supports.test.js` checks single anchors, genuinely independent
supports, heavy branches, same-anchor double bonds, optional strengthening,
staggered phases, desktop/mobile geometry, side-effect-free planning and error
cases. `tests/surge.test.js` checks the opt-in release and keeps scoring with
the game coordinator. The GitHub Action runs `npm test` on PRs.

Only label G1 complete after its tests have passed and its PR is merged.
