# BubbleFun 🫧

A small, free-to-play bubble arcade built with plain HTML, CSS and JavaScript. No accounts, ads, build tools or paid services required. This is the classic-arcade prototype, designed so we can expand it later.

## What's new in v0.3

- Falling bubbles can collide with attached clusters. Hitting a same-colour pair triggers a secondary pop, and can release further bubbles.
- Chain-reaction multipliers grow from **×2** to **×8**, with animated score call-outs and a temporary combo display.
- Non-matching collisions now ricochet; controlled downward trajectories and substep collision checks make cascades more predictable.
- Each falling cascade resolves before the next shot, so scoring and chain timing are clear.
- More regression tests cover chaining, ricochets, multiplier scoring and chain completion.

## Earlier improvements from v0.2

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

## Two modes

**Bubble Shooter** — Aim with your mouse or finger, then click/tap to shoot. Match **3 or more** connected bubbles of the same colour. Breaking the connection to the ceiling releases other bubbles into a gravity cascade: they tumble down with sparkly trails, then explode for bonus points. A new row descends after every five shots. Lose if the stack reaches the launcher, or win by clearing it. The **Left/Right** arrow keys and **Space** work on a keyboard too.

**Bubble Pop** — Click/tap groups of **2 or more** adjacent bubbles of the same colour. Bigger groups earn more points (`group size² × 5`). Bubbles fall and empty columns shift left. Clear the board for a bonus, or keep going until no groups remain.

Both modes support a restart button, optional sound effects and separate local high scores. Glossy reflections, particle trails, expanding burst rings, floating score pop-ups and subtle impact feedback add an arcade feel. The game is responsive for desktop and mobile browsers. Sound starts muted, and screen shake is disabled when reduced motion is preferred.

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
- `src/game.js` — game rules and state (kept independent of display)
- `src/render.js` — canvas bubble graphics, aim line and effects
- `src/app.js` — input, menus, scores, optional sound and persistence
- `tests/game.test.js` — basic gameplay regression tests

## Ideas for later

- Levels, difficulty settings and saved progress
- Special bubbles, boosters and combo animations
- New visual themes and music
- Daily challenges, leaderboards and accessibility improvements

The goal is to have fun with the basics before adding complexity.
