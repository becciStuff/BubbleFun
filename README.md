# BubbleFun 🫧

A small, free-to-play bubble shooter built with plain HTML, CSS and JavaScript. No accounts, ads, build tools or paid services required. It is a growing arcade prototype, designed for desktop and mobile.

**Where we're going:** Read [VISION.md](VISION.md) for the agreed Fizzlings rescue-adventure concept, gravity and special-shot ideas, earn-only coin economy, boss levels and prioritised roadmap. Those future ideas are not all implemented yet.

**Before new features:** Read [REFACTORING.md](REFACTORING.md) for the staged module split and regression-test plan. Configuration, grid, puzzle setup and basic falling physics have been separated; advanced gravity features are still to come.

**Building gravity?** Read [GRAVITY_DESIGN.md](GRAVITY_DESIGN.md) for support, strain and motion rules. **v0.7.0 enables gentle attached-bubble sway in regular Arcade and Puzzles**; the isolated Lab still demonstrates Extreme Gravity support breakage.

**Picking up the project?** Start with [PROJECT_STATUS.md](PROJECT_STATUS.md) for the current baseline, agreed decisions, next tasks and a new-chat handover.

## v0.7.0 — Attached bubble sway in the real game (G3)

**Gravity is not a separate game mode.** Arcade and all three Puzzles now have
gentle, support-sensitive movement while bubbles are still attached. Hanging
branches move more, separately braced structures move less, and ceiling bubbles
stay fixed. Impacts add small, damped ripples.

The **aiming guide**, **actual projectile collisions**, **rendered bubbles** and
**falling launch points** use the **same frame's live attached positions**.
The hex grid still owns colour matching, adjacency and where new shots snap,
so existing puzzle solutions and fair gameplay are preserved. Reduced-motion
settings turn off attached sway.

Gravity Lab remains available as a **diagnostic** for support strength and
experimental Surge. Real-level connections do not yet snap from weight or
Gravity Surge; multi-anchor load sharing and realistic stretching are future
physics milestones.

## v0.6.0 — Gravity Lab (G2 prototype)

The first **visible and interactive gravity experiment** is available in
Arcade's **Gravity Lab** panel. Press **Load test board** to display two
separate structures: an amber-marked single-support chain, and a mint-marked
structure with two independent ceiling anchors. Press **Gravity Surge** to
watch the weak chain detach and fall while the braced structure survives.
Reload the test board to repeat. The lab deliberately pauses shooting and
does not save scores.

The Surge action stays restricted to the test board; standard Arcade and
puzzles use gentle sway only. The Lab's warning rings still show
*support stress*, not simulated bending or snapping.

## Release tracking

**Current version: v0.7.0** on the G3 review branch. Gentle attached sway is
integrated into regular Arcade and Puzzles; the lab remains a diagnostic.
Realistic elastic stretching and dynamic bond breaking remain future features.

The header badge reads **Version 0.7.0**, loading the number from
the root `version.json` file. That JSON file is the single source for the
on-screen version; `package.json` mirrors it for developer tooling and tests
prevent the two from drifting.

To release a new version from a Node.js terminal:

```bash
npm run version:patch   # e.g. 0.7.0 → 0.7.1
# or
npm run version:minor   # e.g. 0.7.0 → 0.8.0
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
- `src/sway.js` — damped supported-cluster sway with impact impulses (G3)
- `src/positions.js` — shared current bubble centres for aiming, impacts, physics and visuals
- `src/gravity-lab.js` — independent, deterministic lab demonstration board
- `src/gravity-hints.js` — support marker data derived from the support graph
- `src/gravity-overlay.js` — canvas-only visual strain and bracing indicators
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
- `tests/gravity-lab.test.js` — interactive lab workflow, both layouts and normal-mode isolation
- `tests/sway.test.js` — live collision points, support-sensitive sway and reduced motion
- `tests/modules.test.js` — visual effects and dormant Pop regression tests

## Ideas for later

- Levels, difficulty settings and saved progress
- A movable catching bottle and charged power shots
- New visual themes and music
- Daily challenges, leaderboards and accessibility improvements

The goal is to have fun with the basics before adding complexity.
