# BubbleFun — gravity physics and gameplay

**Current review milestone: v0.8.2 — real gravity, spring bonds and sticky
contact inside ordinary Arcade and Puzzles.** No Gravity Lab or separate
play style.

## Non-negotiable behaviour

1. **Normal Gravity** pulls attached bubbles physically *down*, but cannot
   break an existing support purely for being heavy.
2. Bubbles hang from their existing connections: sideways-supported branches
   swing under gravity; connected neighbours transmit the force.
3. When a **moving bubble touches another**, they form a *real* connection,
   including a new ceiling-support path. The contact is not a drawn-only link.
4. Popping/exploding a support changes the physical structure and applies a
   local outward impulse to the survivors. The reaction swings and gradually
   settles instead of moving every bubble on the same artificial sine wave.
5. Visual positions, the aiming guide, projectile collision and falling-body
   origins **must be identical for any given simulation frame**.
6. Stable hex cells still govern *where new shots can be recorded*, puzzles,
   turns and colours. A moving shot attaches near the visibly hit bubble
   before its physical position relaxes towards the selected empty hex cell.
7. New sticky contacts participate in ceiling support and same-colour match
   connectivity. Unconnected pieces fall through the existing gravity engine.
8. Reduced-motion preferences keep positions static without changing game rules.
9. A later **Extreme Gravity special** can sever overloaded bonds, but the
   initial version is not a player control. Do not introduce a new mode.

## Small-module architecture

```text
config.js               Board dimensions and tuning
grid.js                 Hex slots, ordinary + sticky connectivity and hit tests
supports.js             Roof support analysis, weak bonds and overload planning
physical-bonds.js       Spring graph, collision resolution and sticky new links
sway.js                 Downward gravity, spring forces, damping and hit impulses
positions.js            One live position lookup for all systems
gravity.js              Detachment, falling bodies and optional Surge API
attachment-visuals.js   Thin drawn bonds and fresh sticky-contact highlights
game.js                 Shots, matches, score and lifecycle (thin physics hooks)
render.js               Canvas, aim guide, live bubbles and visual effects
app.js                  Player input, UI and sound
```

## Why the earlier implementation was insufficient

- G3/v0.7 added periodic, low-amplitude `Math.sin` offsets. Dense groups
  wobbled in unison, but the movement had **no physical cause**.
- v0.8.1's static `sag.js` rotated certain dangling branches toward
  a precomputed resting position, but still blended in sine-wave movement.
  It could not transfer swing momentum through real contacts or add new bonds.
- The v0.8.2 code retires that fixed-target module. Dynamics integrate
  **gravity, bond forces, local impulses, contact, momentum and damping**
  each simulation tick. It never drives motion from a periodic global clock.

## Motion and gameplay integration

- Roof-row bubbles are immovable anchor points.
- Each existing hex adjacency is a physical spring bond. Its preferred
  centre-to-centre length is `PITCH` (42px).
- New collision contacts are recorded in `state.extraBonds` and included
  in the same force network as original grid contacts. They survive across
  frames and only disappear when an endpoint bubble is removed.
- `grid.js` graph traversal optionally includes those extra bonds for
  ceiling support and colour-connected matches. `supports.js` accepts them
  for analysis; `gravity.js` uses them for float/detachment checks.
- Collisions keep bubbles from passing through one another; canvas connector
  lines show new sticky bonds. Existing bonds do not tear in normal gravity.
- Time is split into small physics substeps, positions and velocities are
  capped near the gameplay bounds, and damping gradually settles movement.
- The aim guide and projectile use `shotBubbleCollision` against the *same*
  `attachedPositions`. After a projectile touches a displaced bubble,
  `game.js` selects a valid adjacent resting cell relative to the live
  hit, and initializes its physical position near the actual impact.
- Shooting, matching and bombs inject momentum into adjacent structures.
  Explosions affect the surviving bubbles, with intensity decreasing by
  distance, and that energy travels through the spring network.
- Row insertions reset and rebuild physical bonds because grid cell keys
  change; existing puzzle turns and game results are preserved.
- Reduced motion disables the animated physics while retaining stable
  matching and ordinary disconnection/falling behaviour.

## Limits and what to tune next

This is a browser-friendly elastic approximation, **not** a complete
real-world rigid-body / finite-element solver. Bonds can stretch, but
they are not individually breakable or endowed with different strengths yet.
Large offsets are bounded to avoid losing puzzle playability, and shot
placement still maps to empty hex cells. Multiple anchors support naturally,
but physically accurate stress balancing and bond breakage are later stages.

Validate by hand on real phones and desktops, especially:

- A long side-hanging line falling lower and contacting an adjacent cluster;
- The freshly contacted bubbles really sticking and supporting each other;
- A pop/bomb shaking surviving neighbours, not the whole field in lockstep;
- No indefinite oscillation when a structure reaches equilibrium;
- A moving target being hit where its sprite appears;
- Wall collisions, row drops, puzzle goals and match-three fairness.

## Regression coverage

`tests/physical-gravity.test.js` checks hanging-leaf movement, contacts,
new load-bearing paths, same-colour matches, fixed anchors, dynamic hit
positions and absence of artificial sine motion. Existing sway,
explosion, support, puzzle and falling tests protect core gameplay.
Chromium browser checks run at desktop and phone-sized viewports with
reduced motion on/off. Manual device and actual Pages deployment checks
are separate; passing automation is not proof of perfectly tuned game feel.

## Project milestones

- PRs #1–4: modular refactor.
- PR #5: independent support/weight graph.
- PR #8: temporary Gravity Lab (since removed).
- PR #9–11: diagnostic swaying and proof-of-concept.
- PR #12: gravity visualisation integrated into Arcade/Puzzles.
- PR #13: bounded static sag and explosion impulses.
- **PR #14 / v0.8.2: actual force-driven motion and sticky contacts.**
- Future: tune mass, elastic deformation, contact constraints, per-bond
  strength, earned in-game Extreme Gravity, Fizzlings and level progression.
