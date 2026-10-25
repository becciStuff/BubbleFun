# BubbleFun — refactoring plan

  > **Status: All four structural phases merged.** New gravity features now live in a separate, staged plan: [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md). G1 support analysis is on a review branch.

## Why refactor now?

The original prototype worked, but `src/game.js` did several jobs at once: board geometry, connected-colour matching, puzzle setup, shot movement and collision, bomb chains, detached-bubble gravity, effects, scoring, win/loss rules, and the archived Bubble Pop mode. The refactor is progressively separating these responsibilities.

That makes it too easy for a change to gravity to accidentally break aiming or scoring. We want smaller, independently testable modules with clear ownership, without making a small browser game need a complicated build system.

**Primary objective:** reorganise the existing code **without changing how v0.5 plays**. Add richer gravity only after that baseline is stable.

## Proposed structure

```text
index.html
styles.css
src/
  app.js           Browser input, menu, accessibility, sound, saved scores
  game.js          Shooter state and turn orchestration; scoring and outcomes
  config.js        Shared layouts, sizes, colours and tuning constants
  grid.js          Hex-grid coordinates, neighbours, matching and support graph
  gravity.js       Support evaluation, detachment and falling-bubble simulation
  puzzles.js       Puzzle definitions, board setups and puzzle objectives
  effects.js       Visual effect data, particles, pulses and effect lifecycles
  render.js        Canvas drawing only; no game-rule decisions
  pop-mode.js      Archived Bubble Pop rules, isolated from active shooter
  specials.js      Future special-shot rules (not required for first refactor)
tests/
  game.test.js     End-to-end rules and existing regression cases
  grid.test.js     Geometry, adjacency, matching and support graph
  gravity.test.js  Detachment, gravity and support-strength cases
  puzzles.test.js  Puzzle layouts and solvability
  specials.test.js Future special-shot behaviour
```

This is a **target layout**, not a demand to create every file at once. In particular, `specials.js` waits until specials actually exist. If `effects.js` or `pop-mode.js` do not yet justify extraction, we can move them in later refactor-only steps.

## Ownership and dependencies

| Module | Owns | Must not own |
| --- | --- | --- |
| `config.js` | Read-only tuning constants and desktop/mobile layouts | Mutable game state |
| `grid.js` | Positions, staggered rows, valid cells, neighbours, connected groups, support-path information | Gravity thresholds, points, explosions |
| `gravity.js` | Detecting unsupported groups, simulating detached bubbles; later spring/sway and bond failure | Scoring, UI, sound, level victory |
| `puzzles.js` | Handcrafted boards, targets, shot limits, objective definitions | Rendering or per-frame motion |
| `game.js` | Applying shots, invoking subsystems in order, scoring, turns, win/loss, events | Low-level grid traversal or physics integration |
| `effects.js` | Transient visual effect objects and their animation updates | Gameplay damage and rewards |
| `render.js` | Drawing from the current state, including effects and visible bubble positions | Mutating rules or deciding a collision |
| `app.js` | DOM, input, keyboard/touch controls, local persistence, audio | Game rules |
| `pop-mode.js` | Dormant Bubble Pop behaviour | Active shooter state |

Prefer one-way imports: **`config` → `grid` → `gravity` → `game` → `app`**, with `render` reading the public state/geometry and `puzzles` supplying data to `game`. Shared data belongs lower in that chain; no circular imports. Avoid a giant replacement `utils.js` that simply hides the same problem.

### How the gravity boundary should work

The first `gravity.js` extraction should move the **existing** behaviour, including:

1. Identifying bubbles no longer connected to the ceiling after matches and bomb detonations.
2. Removing those bubbles from the attached board and creating falling objects.
3. Updating falling position, acceleration, spin and side-wall bounce each tick.
4. Reporting floor impacts or burst events back to `game.js` / `effects.js`.

The engine should take explicit board/state data and `dt` as inputs and return a result or events. Prefer injected randomness where motion varies. It should not award points, choose sounds, or call DOM/canvas functions itself. The game orchestrator decides **when** to settle the board, apply rewards and finish a turn.

For a small initial migration, wrapper functions or re-exports from `game.js` are acceptable to keep existing callers working. Remove redundant wrappers once all imports and tests are updated.

## Refactor sequence (separate, reviewable checkpoints)

### 0. Protect the current behaviour

- Run the existing `npm test` suite and record the baseline.
- Add focused characterisation tests **before moving code** where behaviour is under-tested, especially aim-versus-projectile collisions, bomb cascades, falling completion and delayed row descent.
- Keep the active Arcade/Puzzles modes, responsive layouts, controls, scoring and visuals identical during the extraction.

### 1. Extract shared configuration and the grid

- Move layout constants and collision-distance tuning to `config.js`.
- Move coordinate maths, staggered-row neighbours, colour-connected groups and ceiling-support traversal to `grid.js`.
- Keep one agreed position/collision calculation for actual shots and the aiming guide, including near-grazes and wall bounces.
- Add `grid.test.js`: odd/even rows, both layouts, neighbour symmetry, connected groups, multiple support routes, edge cases.

**Checkpoint:** tests pass; playing and aiming feel exactly as before.

### 2. Isolate puzzle data

- Move `PUZZLES`, level-specific initial formations and puzzle metadata to `puzzles.js`.
- Preserve existing puzzle opening ammunition, targets, shot limits and solutions.
- Add `puzzles.test.js` for initial board validity, target placement and the known playable solutions.

**Checkpoint:** all three current puzzles still play and resolve correctly on desktop and mobile.

### 3. Extract the current gravity engine

- Move floating-cluster identification policy, detachment creation and falling-object updates into `gravity.js` (using `grid.js` for connectivity).
- Keep floor-burst visuals and scoring as reactions to gravity events outside the physics engine.
- Keep the present chain-reaction order: colour match → queued bomb detonations → support check → visible falling/bursting → next turn, row descent or win/loss.
- Add `gravity.test.js` using small, explicit board arrangements; use seeded/injected randomness and fixed `dt` where needed.

**Checkpoint:** no gameplay changes, no phantom collisions, and no shots allowed during unresolved cascades.

### 4. Reduce `game.js` to orchestration (merged)

- Extract effect creation/update code to `effects.js`, if the extraction makes dependencies cleaner.
- Isolate dormant Bubble Pop functions in `pop-mode.js`; keep them tested but do **not** put Bubble Pop back on the menu.
- Update imports, remove duplication and keep `render.js` focused on drawing.
- Retain a straightforward static-ES-module setup: **no framework or bundler needed for GitHub Pages**.

**Checkpoint:** the structure matches the agreed responsibilities; smoke-test in a browser as well as running Node tests.

### 5. Only then: extend gravity (feature work, not part of this refactor)

The future physics layer can add constrained, damped **sway** for attached clusters, support strengths and temporary **Extreme Gravity / Gravity Surge**. See [VISION.md](VISION.md) for the intended player experience.

Important rules already agreed:

- **Normal gravity:** a bubble hanging from one connection may swing, but does not spontaneously fall.
- **Extreme gravity:** a lone bubble on a single weak connection can tear free; a mutually braced pair with enough **independent** supports should usually hold.
- Count both **weight** and **independent support paths**, not merely adjacent neighbours. A two-bubble group sharing one anchor is not equivalent to two separately supported bubbles.
- A small cluster can be mechanically stable while still visibly moving a little; strength, damping and motion amplitude should be tuneable.
- Whenever attached bubbles move, the aiming guide and actual projectile must query the **same current physical positions and hitboxes** as the renderer. No invisible old-grid collisions.
- Keep simulation stable on phones (fixed-size physics steps or bounded substeps), and make motion predictable enough for fair puzzles.

These are **design requirements for the next phase**, not claims about what v0.5 currently does. We should first prototype support strength on tiny test grids, then tune sway, breakage and visual warnings through playtesting.

## Tests and acceptance criteria

Before calling the refactor done:

- [ ] `npm test` passes, including the original tests and new unit tests.
- [ ] Arcade, all three puzzles, bombs and multi-stage detonations have not changed behaviour.
- [ ] Mobile portrait and desktop landscape layouts retain matching collision/aim trajectories.
- [ ] Detached clusters still visibly fall, bounce off walls and burst before the turn resolves.
- [ ] Scores, combos, turn counters, puzzle objectives and victory/defeat timing remain correct.
- [ ] Mouse, touch, keyboard, sound toggle and local high scores still work.
- [ ] Browser console has no module-load errors; deployment still works as plain static files on GitHub Pages.
- [ ] Gravity can be tested in isolation without DOM, canvas or audio dependencies.
- [ ] `game.js` is primarily a coordinator, not another all-in-one file.
- [ ] No unfinished new gravity features accidentally ship during the structural refactor.

## Risks and guardrails

- **Import cycles:** move common geometry/configuration downwards; never solve a cycle by importing the entire game into gravity.
- **State ownership:** decide clearly which module may mutate `board`, `falling` and support state. Prefer explicit returned changes or well-documented mutation boundaries.
- **Different visual and physical locations:** plan a single authoritative bubble-position query **before** adding attached-cluster movement.
- **Timing regressions:** preserve the current queued-bomb → detached-fall → turn-complete lifecycle. Add tests for delayed wins and rows.
- **Over-engineering:** keep plain ES modules, small functions and a modest number of files. Split by responsibility, not just file length.
- **Scope creep:** an extracted physics engine does **not** mean Gravity Surge, stickiness or swinging are implemented. Those require a separate feature change with their own tests.

## Definition of done

We can understand and change gravity without opening a 600+ line monolithic game-rules file; the existing game feels and behaves the same; the tests prove the key interactions; and the source is ready for our physics-led Fizzlings ideas.

*Update this plan as decisions are made. Mark checkpoints complete only after the corresponding code and tests land in the repository.*
