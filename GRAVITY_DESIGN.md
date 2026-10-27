# BubbleFun — gravity physics and gameplay

**Current review milestone: v0.8.5 — only genuinely new colour-group merges
may trigger gravity-assisted matches.** No Gravity Lab or separate
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
   connectivity. **If a newly formed contact creates a group of 3+ identical
   colours, pop it automatically**, using the real scoring/bomb/cascade code.
   Never spontaneously pop an old group just because another frame passed.
   Unconnected pieces fall through the existing gravity engine.
8. Reduced-motion preferences keep positions static without changing game rules.
9. A later **Extreme Gravity special** can sever overloaded bonds, but the
   initial version is not a player control. Do not introduce a new mode.

## Small-module architecture

```text
config.js               Board dimensions and tuning
grid.js                 Hex slots, ordinary + sticky connectivity and hit tests
supports.js             Roof support analysis, weak bonds and overload planning
physical-bonds.js       Spring graph, collision resolution and sticky new links
contact-matches.js      Pure full-component 3+ detection on new/re-contacts
row-physics.js          Transfer moving bodies, momentum and bonds on row insertion
sway.js                 Downward gravity, spring forces, damping and hit impulses
positions.js            One live position lookup for all systems
gravity.js              Detachment, falling bodies and optional Surge API
attachment-visuals.js   Soft curved gel between bubble rims only when stretched
game.js                 Shots, automatic matches, score and lifecycle (thin physics hooks)
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

## v0.8.3: automatic gravity-assisted matches

Each new actual physical contact is recorded once in
`state.newContactBonds`, without changes to how bond forces are calculated.
After a safe simulation tick, `contact-matches.js` searches the *entire
same-colour connected group* for each new bond. Group sizes of 3+ go through
the normal `game.js` removal/score/effect/bomb queue, and then the existing
unsupported cascade. This must not consume a shot or a handcrafted Puzzle's
ammunition, and duplicates in one frame must not award points twice.

Contact events are retained while a projectile, bomb chain, entrance or
falling animation is in progress. They are consumed when the turn is safe.
Existing same-colour groups never burst merely because an animation frame
passed without a **new physical contact**.

The lines in the user's screenshot resembled straight bright rods. The
attachment overlay now renders only the **exposed gap** between bubble rims,
with a slight curve and low-opacity gel/glint strokes. The curve isn't a
scripted animation; it follows physical positions every frame.

Puzzle solutions may legitimately finish in fewer shots via physical
contacts. Test the known routes as **upper bounds** and ensure no Puzzle
wins before the player acts.

## v0.8.4: whole groups and real row-drop continuity

An extra sticky bond creating a **3+ same-colour cluster** already triggered
match-three, but an existing hex-neighbour bond stretching apart and touching
again was ignored. Physics now remembers bonds that separated by a meaningful
amount and emits a *new contact event* when they physically reconnect.
That event uses the **full colour-connected component**. Six connected blue
bubbles plus a seventh contacting blue bubble remove all seven, with combo
points, matched bombs and the usual falling cascade.

Tiny oscillations do not count as separations. Passive spring settling before
the player has fired a shot must not generate unearned re-contact pops.
Physical bonds genuinely formed with other bubbles retain their usual match
behaviour. Puzzle regression checks allow early *legitimate* wins but do not
allow spontaneous completion before play.

On Arcade ceiling-row insertion, old bubble identities shift from `row,col`
to `row+1,col` with the phase flip. `row-physics.js` remaps
`attachedPositions`, velocity/offset data, old/new sticky bonds, stretch
history and wobble state without resetting them. During `rowShift`,
`sway.js` **pauses integration without erasing physical state**. Rendering
offsets the remapped positions by the temporary visual slide so old bubbles
remain in the same on-screen place at the beginning of the drop. When the
animation ends, springs react to the new ceiling while preserving momentum.

Both rules are tested on desktop and mobile layouts; actual gameplay feedback
is still required for the visual feel.

## v0.8.5: require genuinely new same-colour connectivity

User playtesting found that recontact events introduced in v0.8.4
**over-triggered automatic matches**, sometimes destroying an entire group
that had already been connected before the alleged contact.

- An actual new sticky bond can trigger match-three **only if its endpoints
  belonged to different same-colour components immediately before that bond
  was introduced**.
- `contact-matches.js` forms the pre-contact graph by excluding the freshly
  introduced sticky bonds from `extraBonds`. It compares those old groups
  with the full graph after attachment.
- If two formerly separate same-colour groups join and total 3+ bubbles,
  pop the **entire resulting connected group** (six blues + one new blue
  means seven bubbles pop, with full combo/bomb/cascade rules).
- A redundant additional bond, or an existing lattice/spring bond simply
  oscillating back into place, **does not make a new colour component**.
  Those events must never pop a previously connected cluster.
- The erroneous `observeBondRecontacts` event emission is removed, along
  with obsolete separated-bond state. Actual spring forces, newly formed
  sticky physics contacts and continuous row-drop velocities stay intact.
- Handcrafted Puzzles and regular Arcade must not score or win from
  merely relaxing previously connected bonds.

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
- **PR #15 / v0.8.3: automatic 3+ pops from new contacts and soft gel links.**
- **PR #16 / v0.8.4: full 6+1 combos and continuous row-drop physics; the
  re-contact trigger proved over-broad in playtesting.**
- **PR #17 / v0.8.5: remove false re-contact triggers; require newly merged
  colour components before firing match-three.**
- Future: tune mass, elastic deformation, contact constraints, per-bond
  strength, earned in-game Extreme Gravity, Fizzlings and level progression.
