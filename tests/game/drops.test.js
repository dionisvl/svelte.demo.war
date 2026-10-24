import { describe, it, expect } from 'vitest';
import { step } from '$lib/game/engine.js';
import { WEAPONS } from '$lib/game/weapons.js';
import { WORLD } from '$lib/game/config.js';
import { idle, playing, enemy, bullet } from '../helpers.js';

const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const kill = (patch = {}, rng = seq(0)) =>
  step(playing({}, { enemies: [enemy()], bullets: [bullet({ x: 200, y: 130 })], ...patch }), idle(), 0.016, rng);
const crate = (patch = {}) => ({ id: 900, x: 200, y: 300, kind: 'rocket', age: 0, ...patch });

describe('drops', () => {
  it('drops a weapon crate where the enemy died when the roll succeeds', () => {
    const s = kill({}, seq(0, 0.99));
    expect(s.pickups).toHaveLength(1);
    expect(s.pickups[0]).toMatchObject({ x: 200, kind: 'rocket' });
    expect(s.events).toContainEqual(expect.objectContaining({ type: 'drop', kind: 'rocket' }));
    expect(s.dryKills).toBe(0);
  });

  it('drops nothing when the roll fails and counts the dry kill', () => {
    const s = kill({}, seq(0.99));
    expect(s.pickups).toEqual([]);
    expect(s.dryKills).toBe(1);
  });

  it('heavy raiders drop far more often than drones', () => {
    const cfg = playing().config;
    expect(cfg.heavyDropChance).toBeGreaterThan(cfg.dropChance * 2);
    const roll = (cfg.dropChance + cfg.heavyDropChance) / 2;
    expect(kill({ enemies: [enemy()] }, seq(roll, 0.99)).pickups).toHaveLength(0);
    const heavy = enemy({ hp: 1, maxHp: 2, kind: 'heavy', r: 26, points: 30 });
    expect(kill({ enemies: [heavy] }, seq(roll, 0.99)).pickups).toHaveLength(1);
  });

  it('guarantees a drop after a long dry streak', () => {
    const s = kill({ dryKills: playing().config.dropPity - 1 }, seq(0.99, 0.99, 0));
    expect(s.pickups).toHaveLength(1);
  });

  it('only drops shields while a shield is missing', () => {
    expect(kill({ shields: 2 }, seq(0, 0)).pickups[0].kind).toBe('shield');
    expect(kill({}, seq(0, 0)).pickups[0].kind).not.toBe('shield');
  });

  it('caps how many crates are on screen', () => {
    const max = playing().config.maxPickups;
    const pickups = Array.from({ length: max }, (_, i) => crate({ id: 900 + i, x: 20, y: 50 }));
    expect(kill({ pickups }, seq(0)).pickups).toHaveLength(max);
  });
});

describe('pickups', () => {
  it('fall and disappear off the bottom', () => {
    const s = step(playing({}, { pickups: [crate({ x: 20, y: 100 })] }), idle(), 0.05, seq(0.99));
    expect(s.pickups[0].y).toBeGreaterThan(100);
    const gone = step(playing({}, { pickups: [crate({ x: 20, y: WORLD.height + 20 })] }), idle(), 0.05, seq(0.99));
    expect(gone.pickups).toEqual([]);
  });

  it('arms and equips the weapon when the ship touches the crate', () => {
    const s = playing({}, { pickups: [crate({ y: 600 })] });
    const next = step(s, idle(), 0.016, seq(0.99));
    expect(next.pickups).toEqual([]);
    expect(next.weapon).toBe('rocket');
    expect(next.ammo.rocket).toBe(WEAPONS.rocket.pickup);
    expect(next.events).toContainEqual(expect.objectContaining({ type: 'pickup', kind: 'rocket' }));
  });

  it('caps stacked ammo', () => {
    const s = playing({}, { ammo: { scatter: 0, rail: 0, rocket: WEAPONS.rocket.maxAmmo - 1 }, pickups: [crate({ y: 600 })] });
    expect(step(s, idle(), 0.016, seq(0.99)).ammo.rocket).toBe(WEAPONS.rocket.maxAmmo);
  });

  it('restores a shield up to the maximum', () => {
    const s = playing({}, { shields: 1, pickups: [crate({ y: 600, kind: 'shield' })] });
    expect(step(s, idle(), 0.016, seq(0.99)).shields).toBe(2);
    const full = playing({}, { pickups: [crate({ y: 600, kind: 'shield' })] });
    expect(step(full, idle(), 0.016, seq(0.99)).shields).toBe(full.config.shields);
  });

  it('leaves crates the ship does not touch', () => {
    const s = playing({}, { pickups: [crate({ x: 40, y: 600 })] });
    expect(step(s, idle(), 0.016, seq(0.99)).pickups).toHaveLength(1);
  });
});
