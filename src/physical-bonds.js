// Structural links for moving bubbles. The hex lattice supplies the original
// sticky contacts; newly touching bubbles can acquire an additional physical
// link without pretending their grid cells have moved.
import { RADIUS } from './config.js';
import { cellKey, shooterNeighbours } from './grid.js';

export function bondId(a, b) {
  return a < b ? a + '|' + b : b + '|' + a;
}

export function bondEdges(board, phase, layout, extraBonds = new Set()) {
  const ids = new Set();
  for (const key of board.keys()) {
    const [row,col] = key.split(',').map(Number);
    for (const [r,c] of shooterNeighbours(board,row,col,phase,layout)) {
      ids.add(bondId(key,cellKey(r,c)));
    }
  }
  for (const id of extraBonds) {
    const [a,b] = id.split('|');
    if (board.has(a) && board.has(b)) ids.add(id);
  }
  return [...ids].map(id => id.split('|'));
}

export function cleanExtraBonds(board, bonds = new Set()) {
  for (const id of bonds) {
    const [a,b] = id.split('|');
    if (!board.has(a) || !board.has(b)) bonds.delete(id);
  }
  return bonds;
}

// Resolve physical contacts BEFORE publishing visible positions. Non-neighbour
// contacts become genuine sticky bonds, so two swinging groups can link up.
// Never move the roof. Existing hex links are supplied as edges.
export function resolveContacts(board, positions, phase, layout, extraBonds, edges, newContacts = null) {
  const keys = [...board.keys()];
  const present = new Set(edges.map(([a,b]) => bondId(a,b)));
  const minGap = RADIUS * 2 - .85;
  const contactGap = RADIUS * 2 + .65;
  const left = layout.left + RADIUS, right = layout.width - left;
  let added = 0;
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i], pa = positions.get(a);
    if (!pa) continue;
    for (let j = i + 1; j < keys.length; j++) {
      const b = keys[j], pb = positions.get(b);
      if (!pb || (Math.abs(pa.x - pb.x) > contactGap || Math.abs(pa.y - pb.y) > contactGap)) continue;
      const dx = pb.x - pa.x, dy = pb.y - pa.y;
      const dist = Math.hypot(dx,dy);
      if (dist > contactGap) continue;
      const link = bondId(a,b);
      if (!present.has(link)) {
        extraBonds.add(link);
        present.add(link);
        newContacts?.add(link);
        added++;
      }
      if (dist >= minGap) continue;
      const nx = dist > .001 ? dx / dist : (j % 2 ? 1 : -1);
      const ny = dist > .001 ? dy / dist : 0;
      const overlap = minGap - dist;
      const aFixed = a.startsWith('0,'), bFixed = b.startsWith('0,');
      if (aFixed && bFixed) continue;
      const moveA = aFixed ? 0 : bFixed ? 1 : .5;
      const moveB = bFixed ? 0 : aFixed ? 1 : .5;
      pa.x = Math.max(left, Math.min(right, pa.x - nx * overlap * moveA));
      pa.y -= ny * overlap * moveA;
      pb.x = Math.max(left, Math.min(right, pb.x + nx * overlap * moveB));
      pb.y += ny * overlap * moveB;
    }
  }
  return added;
}

// Hex neighbours are already bonded on the *resting* grid. They can still
// stretch well apart during a swing and later touch again. That re-contact
// must be a real match event, even though it isn't a brand-new extraBond.
// Hysteresis prevents tiny spring vibrations from repeatedly generating pops.
export function observeBondRecontacts(edges, positions, separated, newContacts) {
  const releasedAt = RADIUS * 2 + 8;
  const touchingAt = RADIUS * 2 + .65;
  const active = new Set();
  for (const [a, b] of edges) {
    const id = bondId(a, b);
    active.add(id);
    const pa = positions.get(a), pb = positions.get(b);
    if (!pa || !pb) continue;
    const distance = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    if (distance > releasedAt) separated.add(id);
    else if (distance <= touchingAt && separated.delete(id)) newContacts.add(id);
  }
  for (const id of separated) if (!active.has(id)) separated.delete(id);
}
