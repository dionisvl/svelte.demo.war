import { describe, it, expect } from 'vitest';
import { selectWeapon, step } from '$lib/game/engine.js';
import { WEAPONS } from '$lib/game/weapons.js';
import { held, rng, playing, enemy, armed } from '../helpers.js';

const scatter = (patch = {}, overrides = {}) => selectWeapon(playing(overrides, { ammo: armed, ...patch }), 'scatter');
const fire = (s, dt = 0.016) => step(s, held({ fire: true }), dt, rng);

describe('scatter', () => {
  it('fires a five-bolt fan with distinct divergent headings and a slow cadence', () => {
    const s = fire(scatter());
    expect(s.bullets).toHaveLength(5);
    expect(s.events.filter((e) => e.type === 'shot')).toEqual([{ type: 'shot', weapon: 'scatter' }]);
    const vxs = s.bullets.map((b) => b.vx).sort((a, b) => a - b);
    expect(new Set(vxs).size).toBe(5);
    expect(vxs[0]).toBeLessThan(0);
    expect(vxs[4]).toBeGreaterThan(0);
    expect(Math.abs(vxs[2])).toBeLessThan(1e-9);
    expect(s.player.cooldown).toBeCloseTo(WEAPONS.scatter.cooldown, 6);
    expect(fire(s, 0.3).bullets.length).toBeLessThanOrEqual(5);
  });

  it('spreads laterally as it travels', () => {
    let s = fire(scatter());
    const gap0 = Math.max(...s.bullets.map((b) => b.x)) - Math.min(...s.bullets.map((b) => b.x));
    for (let i = 0; i < 8; i++) s = step(s, held({}), 0.016, rng);
    const gap1 = Math.max(...s.bullets.map((b) => b.x)) - Math.min(...s.bullets.map((b) => b.x));
    expect(gap1).toBeGreaterThan(gap0 + 20);
  });

  it('expires pellets after its short range', () => {
    let s = fire(scatter());
    for (let i = 0; i < 60; i++) s = step(s, held({}), 0.016, rng);
    expect(s.bullets).toEqual([]);
  });

  it('hits an off-axis enemy with the angled pellets, one hit per pellet', () => {
    const armored = enemy({ x: 235, y: 470, vy: 0, r: 26, hp: 2, maxHp: 2, kind: 'heavy', points: 30 });
    const run = (s) => {
      s = fire(s);
      for (let i = 0; i < 25; i++) s = step(s, held({}), 0.016, rng);
      return s;
    };
    const fan = run(scatter({ enemies: [armored] }));
    expect(fan.enemies).toEqual([]);
    expect(fan.kills).toBe(1);
    const bolt = run(playing({}, { enemies: [armored] }));
    expect(bolt.kills).toBe(0);
  });

  it('sweeps fast diagonal pellets through a thin step', () => {
    const b = { id: 9, x: 170, y: 380, vx: 1200, vy: 0, weapon: 'scatter', damage: 1, ttl: 1, radius: 5 };
    const s = playing({}, { enemies: [enemy({ x: 200, y: 380 })], bullets: [b] });
    const n = step(s, held({}), 0.05, rng);
    expect(n.kills).toBe(1);
    expect(n.bullets).toEqual([]);
  });

  it('never exceeds the bullet cap', () => {
    let s = scatter();
    for (let i = 0; i < 2000; i++) s = fire(s, 0.05);
    expect(s.bullets.length).toBeLessThanOrEqual(s.config.maxBullets);
  });
});
