# BubbleFun — gravity design and implementation

**Current review milestone: v0.8.1 — gravity-driven sag and explosion response inside Arcade and Puzzles.**
The standalone player-facing **Gravity Lab is retired**. Its lessons are now
tested through real game boards and browser interactions. Gravity is a core
mechanic of BubbleFun, **not a separate play style**.

## Gameplay rules

- **Normal Gravity**: ceiling-connected bubbles remain supported at any
  ordinary weight. Bubbles detached from *all* ceiling paths fall and burst.
- **Independent roof supports** count distinct ceiling anchors, not simply the
  number of bonds. Two paths back to the *same* roof bubble aren't two anchors.
- **Extreme Gravity** is currently only a pure support-overload calculation and
  an opt-in physical release API; it is **not wired to player turns or UI**.
  We may later make it an earned special, with balancing, scoring and warnings.
- Falling, matches, combo points, puzzle solutions and turn sequencing stay
  with the ordinary game rules. No hidden Lab scoring or board transitions.

## Modules (avoid growing a mega-file)

```text
config.js               Board and physics constants
grid.js                 Resting hex lattice, graph connectivity, hit predicate
supports.js             Ceiling anchor graph, weights, stresses, weak links
sag.js                  Pure load-bearing bridge sag equilibrium
sway.js                 Damped connected-body motion, shots and explosions
positions.js            One current attached-bubble position lookup
gravity.js              Detached-body physics and optional Extreme Gravity API
attachment-visuals.js   Canvas rendering of subtle stretched bonds
render.js               Bubble drawing and the aim-guide geometry
game.js                 Shooting, scoring and turn orchestration
app.js                  Normal Arcade/Puzzle controls and input
```

**Critical invariant:** `attachedPositions` holds the same coordinates
for `render.js`, `positions.js`, projectile collision in `grid.js`,
trajectory aiming and `gravity.js` falling starting points.
Never animate bubbles in a way that leaves their hitboxes at old locations.

The underlying *resting* hex coordinates remain the authority for colour
matching, connected-cluster membership and which slot a shot snaps into.
The attached motion is deliberately **constrained** to protect fair gameplay.
The spring/motion calculation itself lives in `sway.js`, not `game.js`.

## How v0.8.0 movement works

- **Ceiling bubbles stay fixed.** The attached bubble graph is inspected to
  distinguish one-roof regions from genuinely braced regions.
- A **single-anchor** branch has a subtle pendulum target. Longer/heavier
  suspended regions can move further around the roof pivot.
- **Multiply supported** Arcade/Puzzle formations retain modest ambient
  flex, rather than becoming utterly motionless as in earlier versions.
- Each shot gives attached neighbours a **real impulse**, transferred across
  the attached graph with a damped spring-to-grid and neighbour coupling.
  Movement decays; subsequent shots can excite new ripples.
- Bounds cap offsets and keep projectiles/snapping readable. Small translucent
  bonds appear where live connections stretch beyond their resting separation.
- The system respects `prefers-reduced-motion`. Entrance and row-drop
  transitions use fixed positions while they animate, so aiming stays fair.
- No Normal Gravity support breakage results from the sway motion.

This is a **constrained elastic-looking model**, not yet a full multi-body
solver with continuously rotating joints, force-balanced link stretching,
mass-specific sag or true torque conservation.

## New requirement: weight visibly hangs, and blasts shake supports (v0.8.1)

The screenshot-based feedback exposed a crucial distinction: periodic wobbling
does **not** imply that a sideways-hanging connection droops under gravity.

- `sag.js` uses `analyseSupports(...).bridges` to identify real single-cut
  connections, even when the overall board has many ceiling anchors. The
  dependent subtree rotates *down* around that bridge, preserving internal
  rigid-body distances and its parent bond length.
- Collision, wall, ceiling and maximum-displacement constraints reduce the
  target angle when the next bubble blocks the way. The whole connected
  component never randomly becomes detached in Normal Gravity.
- These equilibrium positions are **recomputed when topology changes** and
  become `sway.js` spring targets. The on-screen location, aiming guide,
  collisions and falling origin all use `attachedPositions`.
- Popped matches and bomb blasts now inject a **radial recoil into surviving
  neighbours**, proportional to their distance from the affected bubbles.
  Constrained springs and damping transmit/reduce those waves naturally.
- Reduced-motion users still see the resting hex lattice.

Important limitation: this is a *bounded equilibrium-sag and spring-response
prototype*, **not** a complete deformable, torque-balanced bubble simulator.
Larger swinging/elastic changes must maintain collision fairness. Bond
breaking remains reserved for future Extreme Gravity rules.

## Support analysis and future Extreme Gravity

G1 in `supports.js` provides:
- `analyseSupports(board, options)` — graph traversal for roof-connected
  regions, independent anchors, region loads and vulnerable bridge bonds.
- `planGravitySurge(board, options)` — a **side-effect-free** plan of which
  weak suspended structures would detach under a specified additional force.

`gravity.js` exposes `releaseGravitySurge(state, options)` to apply the
plan with the existing falling objects, without scoring. **No player UI
calls it** in v0.8.1. Heavy multi-anchor groups need better load-sharing
before extreme support breakage can be balanced for actual levels.

## Testing and release boundaries

- Node tests for actual Arcade and all three puzzles, single vs multiple
  roof supports, shot-driven motion, stable roof positions, reduced motion,
  visible-position hit tests and falling origins on both board layouts.
- Chromium browser smoke tests fire real shots in Arcade and Puzzles, assert
  no Lab buttons remain, and check movement/hit positions at desktop and
  mobile-sized viewports with the reduced-motion preference on and off.
- Live GitHub Pages and hands-on phone playtesting are **separate checks**;
  automated tests alone do not prove every physical device behaves correctly.

## What to build next

1. **Playtest**: assess shot impulse strength and spring damping in both
   layouts, especially near walls, after bomb chains and on longer hangers.
2. **More faithful attached physics**: conserve bond lengths locally, propagate
   torque through connected groups, avoid overlapping sprites and make
   stretching appear under loads — preserving hitbox/render parity.
3. **Better load sharing and stickiness**: distribute loads through multiple
   distinct roof anchors and tune actual support failure.
4. **Earnable Extreme Gravity** within real levels, never a permanent
   separate Gravity mode. Add scoring, warnings, balance and tutorial cues.
5. Eventually build the larger Fizzlings rescue adventure, boss mechanics and
   earn-only coin economy outlined in [VISION.md](VISION.md).

### History

- G1 (PR #5): ceiling support graph and opt-in overloaded release calculations.
- G2 (PR #8): temporary Gravity Lab demonstration for weight and bracing.
- G3 (PR #9): initial subtle sway with shared moving collision positions.
- G3.1–G3.2 (PRs #10–11): tuned a temporary pendulum Lab and its button;
  the Lab was then retired rather than becoming a second game mode.
- v0.8.0 (PR #12): actual Arcade/Puzzle response and removal of Lab UI/code.
