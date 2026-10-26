# BubbleFun 🫧

A small, free-to-play bubble shooter built with plain HTML, CSS and JavaScript. No accounts, ads, build tools or paid services required. It is a growing arcade prototype, designed for desktop and mobile.

**Where we're going:** Read [VISION.md](VISION.md) for the agreed Fizzlings rescue-adventure concept, gravity and special-shot ideas, earn-only coin economy, boss levels and prioritised roadmap. Those future ideas are not all implemented yet.

**Before new features:** Read [REFACTORING.md](REFACTORING.md) for the staged module split and regression-test plan. Configuration, grid, puzzle setup and basic falling physics have been separated; advanced gravity features are still to come.

**Building gravity?** Read [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) for support, strain and motion rules. **v0.8.1 adds gravity sag and blast recoil within Arcade and Puzzles**, with no Gravity Lab in the UI.

**Picking up the project?** Start with [PROJECT_STATUS.md](PROJECT_STATUS.md) for the current baseline, agreed decisions, next tasks and a new-chat handover.

## v0.8.1 — Dangling branches sag; explosions shake their neighbours

A bubble with **one sideways support connection** should not hover
indefinitely at its original hex-grid height. It now gravitates toward a
lower hanging position, rotating with any dependents about the weak bond.
Static equilibrium is **bounded by neighbouring bubbles, walls and existing
attachments**, so stable puzzles stay fair. Normal Gravity does not
automatically tear off ceiling-supported bubbles.

When a match pops or a bomb goes off, the **surviving connected bubbles**
receive an outward physical impulse. Motion travels through the supporting
connections and gradually settles into the new supported shape.
Disconnected pieces still drop through the existing falling engine.

`src/sag.js` computes pure resting positions from weak load-bearing bridges,
`src/sway.js` eases into those positions and handles explosion impulses,
`src/positions.js` supplies the same live centres for drawing and
collisions. The renderer and game remain separate. Reduced-motion settings
continue to suppress attached movement.

## v0.8.0 — Gravity belongs in Arcade and Puzzles

**Gravity Lab has been removed from the player interface.** Its demo buttons,
standalone board, overlay and orchestration are gone. BubbleFun has two visible
play styles: **Arcade** and **Puzzles**, each with gravity integrated directly.

- Ceiling bubbles stay fixed. Hanging single-anchor branches rock more
  naturally; densely supported regions still show small movements.
- Every landed shot sends a visible, **damped ripple through connected bubbles**
  instead of only adding an imperceptible ambient wobble. Tiny elastic
  attachment threads show stretched connections.
- The **rendered bubble centres**, aim guide, actual projectile hit detection
  and fall starting points all share the same `attachedPositions` map.
- Matching, ceiling topology, puzzle goals, scores and shot snap cells remain
  governed by the original hex grid. Normal gravity does **not** break a
  ceiling-supported cluster purely because of its weight.
- `prefers-reduced-motion` is respected throughout normal play.
- Support-weight analysis and an **unwired, test-only** Extreme Gravity API
  remain in their own modules for later earned specials. No separate Gravity
  mode or UI is part of the intended game.

The old Gravity Lab is retired as of this version. Its tests have been
replaced by real Arcade/Puzzle gameplay, geometry and reduced-motion tests
on desktop and mobile-sized screens.

## Previous gravity milestones

- **v0.7.0–0.7.2:** Implemented gentle sway and a temporary Gravity Lab
  pendulum to diagnose the physics. The lab was removed in v0.8.0.
- **v0.6.0:** Prototyped weak versus independently braced support structures.

## Release tracking

**Current version: v0.8.1** on the gravity-sag feature review branch. Gravity reacts to
shots in real Arcade and Puzzle gameplay. Elastic bond breakage and earned
Extreme Gravity specials are future work.

The header badge reads **Version 0.8.1**, loading the number from
the root `version.json` file. That JSON file is the single source for the
on-screen version; `package.json` mirrors it for developer tooling and tests
prevent the two from drifting.

To release a new version from a Node.js terminal:

```bash
npm run version:patch   # e.g. 0.8.1 → 0.8.2
# or
npm run version:minor   # e.g. 0.8.1 → 0.9.0
npm test
```

Commit both changed files (`version.json` and `package.json`) with
the release. The version increases for releases, **not automatically
for every Git commit**. The browser fetches `version.json` without
using the browser cache, so a deployed release shows its updated number.

## What's new in v0.5 — Puzzles & responsive playfields

- **Real landscape desktop board:** the browser width selects a 760 × 580 playfield with 16/15 alternating columns, while narrower screens get the 432 × 700 portrait board with 9/8 columns. Mouse, touch and keyboard remain supported.
- **Handcrafted puzzles:** Twin Towers, Heartbreaker and The Crown have shaped formations, glowing bomb targets, curated opening ammunition and a limited number of shots. Clear the marked targets (by popping, blasting or dropping them) to win. The puzzles are available on both layouts.
- **Smoother movement:** board wobble on impact, staggered puzzle entrances, animated descending rows, refined aim indication and more responsive aiming.
- **More forgiving grazes:** the projectile collision distance is slightly smaller than the drawn bubble pair. The aiming guide now uses the same collision distance and wall-bounce rules as the real projectile.
- **Bubble Pop temporarily hidden:** Arcade and Puzzles are now the two play styles within Bubble Shooter. The earlier Bubble Pop rules remain in the code for possible reintroduction later.

## Previous version: v0.4 — Explosive Cascades

- **Bomb bubbles** appear as glowing, marked coloured bubbles on the shooter board. Include one in a normal match of 3+, or hit it with another bomb's blast, to detonate it.
- A bomb clears nearby bubbles regardless of colour, triggering any other bombs in its radius. A short delay between detonations makes chains readable.
- Bomb combos grow from **×2** to **×8**, with bonus points and visible combo announcements.
- Once the blasts finish, unsupported bubbles tumble all the way to the floor and burst into colourful particles, expanding shockwaves and bright flashes.
- The previous falling-bubble collision system was removed: it relied on an unlikely board configuration, so it didn't give players meaningful control over chains.
- Detonations and gravity cascades finish before the next shot; row descents also wait for the effects to settle.

## Earlier improvements from v0.2–v0.3

- Detached shooter bubbles obey gravity and burst after visibly falling.
- Gravity combo bonuses, glowing shot trails, expanding blast rings, sparkles and score pop-ups.
- More polished glass reflections, subtle screen shake and launcher recoil.
- Extra gameplay tests for falling physics and the delayed board-clear celebration.

## Play

Open the site in a browser using any static web server. For example, if Python is installed:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. Using a local server is recommended because the game's JavaScript uses ES modules.

## Play styles

**Arcade** — Aim with your mouse or finger, then click/tap to shoot. Match **3 or more** connected bubbles of the same colour. Glowing marked bubbles are bombs: if a matched group contains one, it explodes and removes surrounding bubbles, potentially setting off more bombs. Disconnected bubbles tumble down and burst on the floor for a gravity bonus. A new row descends after every five shots. Lose if the stack reaches the launcher, or win by clearing it.

**Puzzles** — Choose one of three shaped challenges. Each has glowing bomb targets and a shot limit. You only need to clear the marked targets, not the entire board. You can advance to the next puzzle after winning.

Both play styles support a restart button, optional sound effects and separate local high scores. **Left/Right** arrow keys and **Space** work on a keyboard. Glossy reflections, particle trails, expanding burst rings, floating score pop-ups and subtle impact feedback add an arcade feel. Sound starts muted, and screen shake is disabled when reduced motion is preferred.

The archived **Bubble Pop** rules remain in `src/pop-mode.js` and are tested but the mode is not presented in the UI.

## Run tests

Node.js 20 or later is sufficient; no `npm install` is needed.

```bash
npm test
```

## Publish as a website

The repository is static-site ready. On GitHub, you can enable **Settings → Pages**, choose **Deploy from a branch**, and publish the `main` branch from `/ (root)`. GitHub will provide a Pages URL once deployment finishes. Publishing is optional while the prototype is in development.

## Structure

- `index.html` — accessible menu, score display and game layout
- `styles.css` — classic arcade styling and responsive layout
- `src/config.js` — shared layouts, colours and gameplay constants
- `src/grid.js` — hex-grid geometry, matching, ceiling support and shared hit detection
- `src/puzzles.js` — handcrafted puzzle layouts, targets, ammunition and fresh board creation
- `src/supports.js` — gravity support graph, suspended weight and independent ceiling anchors (merged in G1)
- `src/gravity.js` — detached-bubble detection, falling motion and opt-in Surge
- `src/sway.js` — damped attached springs and shot/explosion impulses
- `src/sag.js` — gravity-resting positions for weakly supported hanging branches
- `src/positions.js` — shared current bubble centres for aiming, impacts, physics and visuals
- `src/attachment-visuals.js` — subtle glass-like links between live bubble centres
- `src/game.js` — shooter rules, scoring and turn orchestration, retaining legacy exports during the refactor
- `src/effects.js` — visual effect creation, particles and effect lifetimes
- `src/pop-mode.js` — archived Bubble Pop logic (not shown in the UI)
- `src/render.js` — responsive canvas bubble graphics, aim guide and effects
- `src/app.js` — input, menus, scores, optional sound and persistence
- `tests/game.test.js` — gameplay regression tests, desktop geometry and verified puzzle solutions
- `tests/grid.test.js` — grid geometry, connectivity and projectile hit testing
- `tests/puzzles.test.js` — puzzle board definitions, desktop/mobile layouts and real solutions
- `tests/gravity.test.js` — independent detachment, falling physics, wall bounce and burst timing tests
- `tests/supports.test.js` — anchors, loaded bonds and surge planning (G1 branch)
- `tests/surge.test.js` — opt-in gravity detachment and scoring boundaries
- `tests/browser-smoke.mjs` — real Arcade/Puzzle firing across responsive layouts and motion preferences
- `tests/sway.test.js` — live collision points, support-sensitive sway and reduced motion
- `tests/sag.test.js` — single-link sag, bounds and geometry
- `tests/explosion-motion.test.js` — survivor recoil and damping
- `tests/modules.test.js` — visual effects and dormant Pop regression tests

## Ideas for later

- Levels, difficulty settings and saved progress
- A movable catching bottle and charged power shots
- New visual themes and music
- Daily challenges, leaderboards and accessibility improvements

The goal is to have fun with the basics before adding complexity.
