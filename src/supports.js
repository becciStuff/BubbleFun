// Structural analysis of the *attached* bubble graph. Pure rules: no animation,
// scoring, mutations or browser dependencies. The ceiling is an unbreakable root.
import { MOBILE_LAYOUT } from './config.js';
import { cellKey, shooterNeighbours } from './grid.js';

const CEILING = '@ceiling';
const toCell = key => key.split(',').map(Number);

// Each bridge is a single real bubble-to-bubble bond whose loss would leave
// the listed bubbles with no route to any ceiling anchor. A second independent
// support creates a cycle, so neither of its bonds is incorrectly a bridge.
export function analyseSupports(board, {
  phase = 0, layout = MOBILE_LAYOUT, bondStrength = 1, extraBonds = null,
} = {}) {
  const graph = new Map([[CEILING, []]]);
  for (const key of board.keys()) graph.set(key, []);
  for (const key of board.keys()) {
    const [row, col] = toCell(key);
    const neighbours = shooterNeighbours(board, row, col, phase, layout, extraBonds)
      .map(([r, c]) => cellKey(r, c));
    graph.set(key, neighbours);
    if (row === 0) {
      graph.get(CEILING).push(key);
      graph.get(key).push(CEILING);
    }
  }

  let clock = 0;
  const discovery = new Map();
  const low = new Map();
  const bridges = [];
  const supported = new Set();
  function visit(key, parent = null) {
    const order = ++clock;
    discovery.set(key, order);
    low.set(key, order);
    supported.add(key);
    let descendants = key === CEILING ? [] : [key];
    for (const neighbour of graph.get(key)) {
      if (neighbour === parent) continue;
      if (!discovery.has(neighbour)) {
        const branch = visit(neighbour, key);
        descendants = descendants.concat(branch);
        low.set(key, Math.min(low.get(key), low.get(neighbour)));
        if (key !== CEILING && low.get(neighbour) > discovery.get(key)) {
          const weight = branch.length;
          const strength = typeof bondStrength === 'function'
            ? bondStrength(key, neighbour) : bondStrength;
          if (!(Number.isFinite(strength) && strength > 0)) {
            throw new RangeError('Bond strength must be a positive finite number');
          }
          bridges.push({
            from: key, to: neighbour, weight, strength,
            stress: weight / strength,
            cells: branch.map(toCell),
            depth: discovery.get(key),
          });
        }
      } else {
        low.set(key, Math.min(low.get(key), discovery.get(neighbour)));
      }
    }
    return descendants;
  }
  visit(CEILING);
  supported.delete(CEILING);

  // Removing ceiling cells from the graph lets us count *distinct ceiling
  // anchors* of each suspended region. Two bonds to one ceiling bubble still
  // count as ONE independent support, even when those bonds form a cycle.
  const regions = [];
  const explored = new Set();
  for (const start of board.keys()) {
    if (toCell(start)[0] === 0 || explored.has(start)) continue;
    const members = [start];
    explored.add(start);
    const anchors = new Set();
    const anchorLinks = [];
    for (let i = 0; i < members.length; i++) {
      const node = members[i];
      for (const neighbour of graph.get(node)) {
        if (neighbour === CEILING) continue;
        if (toCell(neighbour)[0] === 0) {
          anchors.add(neighbour);
          anchorLinks.push([neighbour, node]);
        } else if (!explored.has(neighbour)) {
          explored.add(neighbour);
          members.push(neighbour);
        }
      }
    }
    if (!anchors.size) continue; // Old-style unsupported bubbles are separate.
    const strengths = anchorLinks.map(([a, b]) =>
      typeof bondStrength === 'function' ? bondStrength(a, b) : bondStrength);
    for (const strength of strengths) {
      if (!(Number.isFinite(strength) && strength > 0)) {
        throw new RangeError('Bond strength must be a positive finite number');
      }
    }
    // Multiple links to the SAME anchor do not multiply independent supports.
    // A strong reinforced attachment can nevertheless resist higher load.
    regions.push({
      anchors: [...anchors], supportCount: anchors.size,
      weight: members.length, strength: Math.max(...strengths),
      cells: members.map(toCell),
    });
  }
  return {
    regions,
    supported: Array.from(supported, toCell),
    unsupported: Array.from(board.keys()).filter(k => !supported.has(k)).map(toCell),
    bridges: bridges.sort((a, b) => a.depth - b.depth),
  };
}

// An explicit *Extreme Gravity* calculation. Normal gravity NEVER breaks
// attached bonds based on weight. Gameplay will enable this with a later power.
export function planGravitySurge(board, {
  force = 1.5, threshold = 1, ...options
} = {}) {
  if (!(Number.isFinite(force) && force >= 0)) throw new RangeError('Invalid gravity force');
  if (!(Number.isFinite(threshold) && threshold > 0)) throw new RangeError('Invalid stress threshold');
  const analysis = analyseSupports(board, options);
  const detachedKeys = new Set();
  const brokenBonds = [];
  const releasedRegions = [];
  for (const region of analysis.regions) {
    if (region.supportCount !== 1 || region.weight * force / region.strength <= threshold) continue;
    releasedRegions.push(region);
    for (const [row, col] of region.cells) detachedKeys.add(cellKey(row, col));
  }
  for (const bond of analysis.bridges) {
    if (bond.stress * force <= threshold) continue;
    // When a high-up bond breaks, the entire hanging branch goes; do not
    // report nested bonds inside that same falling branch as extra breaks.
    if (detachedKeys.has(bond.from) || detachedKeys.has(bond.to)) continue;
    brokenBonds.push({ from: bond.from, to: bond.to, weight: bond.weight,
      strength: bond.strength, stress: bond.stress * force });
    for (const [row, col] of bond.cells) detachedKeys.add(cellKey(row, col));
  }
  return {
    brokenBonds,
    releasedRegions,
    detached: Array.from(detachedKeys, toCell),
    unsupported: analysis.unsupported,
  };
}
