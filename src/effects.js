// Transient particles, pulses and screen feedback. Gameplay rules live elsewhere.
export function visualState() {
  return {
    effects: [], pulses: [], shockwaves: [], callouts: [], shake: 0, flash: 0,
    event: 0, lastEvent: '', lastPop: 0,
  };
}

export function addBurst(state, x, y, colour, count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 85 + Math.random() * 200;
    const life = .45 + Math.random() * .4;
    state.effects.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      colour, life, maxLife: life, size: 2.8 + Math.random() * 3.4,
      kind: i % 3 === 0 ? 'star' : 'spark',
    });
  }
}

export function addSpark(state, x, y, colour, vx = 0, vy = 0) {
  const life = .17 + Math.random() * .25;
  state.effects.push({ x, y, vx, vy, colour, life, maxLife: life, size: 1.7 + Math.random() * 2.2, kind: 'spark' });
}

export function addPulse(state, x, y, colour, strength = 1) {
  state.pulses.push({ x, y, colour, radius: 11, speed: 145 * strength, life: .38, maxLife: .38 });
  state.flash = Math.max(state.flash, strength * .15);
}

export function addExplosion(state, x, y, colour, strength = 1) {
  addBurst(state, x, y, colour, Math.round(23 * strength));
  addPulse(state, x, y, colour, 1.7 * strength);
  state.pulses.push({ x, y, colour: 'yellow', radius: 5, speed: 320 * strength, life: .47, maxLife: .47 });
  state.shockwaves.push({ x, y, radius: 10, life: .46, maxLife: .46, strength });
  state.shake = Math.max(state.shake, 1.1 * strength);
  state.flash = Math.max(state.flash, .95 * strength);
}

export function addCallout(state, x, y, text, colour = 'yellow') {
  state.callouts.push({ x, y, text, colour, life: 1.15, maxLife: 1.15 });
}

export function updateVisualEffects(state, dt) {
  for (const particle of state.effects) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 175 * dt;
    particle.life -= dt;
  }
  state.effects = state.effects.filter(p => p.life > 0);
  for (const pulse of state.pulses) {
    pulse.radius += pulse.speed * dt;
    pulse.life -= dt;
  }
  state.pulses = state.pulses.filter(p => p.life > 0);
  for (const wave of state.shockwaves) {
    wave.radius += dt * 285 * wave.strength;
    wave.life -= dt;
  }
  state.shockwaves = state.shockwaves.filter(w => w.life > 0);
  for (const callout of state.callouts) {
    callout.y -= 46 * dt;
    callout.life -= dt;
  }
  state.callouts = state.callouts.filter(c => c.life > 0);
}
