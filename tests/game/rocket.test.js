import { describe, it, expect } from 'vitest';
import { selectWeapon, step, pickTarget } from '$lib/game/engine.js';
import { WEAPONS } from '$lib/game/weapons.js';
import { held, idle, rng, playing, enemy, armed } from '../helpers.js';

const rocket = (patch = {}) => selectWeapon(playing({}, { ammo: armed, ...patch }), 'rocket');
const fire = (s, dt = 0.016) => step(s, held({ fire: true }), dt, rng);
const heavy = (patch = {}) => enemy({ r: 26, hp: 2, maxHp: 2, kind: 'heavy', points: 30, vy: 0, ...patch });
const still = (patch = {}) => enemy({ vy: 0, ...patch });

function fly(s, seconds, dt = 0.016) {
  let n = s;
  const events = [];
  for (let t = 0; t < seconds; t += dt) {
    n = step(n, idle(), dt, rng);
    events.push(...n.events);
  }
  return { s: n, events };
}

describe('rocket target selection', () => {
  it('picks the nearest on-screen enemy ahead, breaking ties by lowest id', () => {
    const near = still({ id: 7, x: 260, y: 300 });
    const far = still({ id: 3, x: 60, y: 100 });
    expect(pickTarget([far, near], { x: 200, y: 590 })?.id).toBe(7);
    const a = still({ id: 9, x: 150, y: 400 });
    const b = still({ id: 4, x: 250, y: 400 });
    expect(pickTarget([a, b], { x: 200, y: 590 })?.id).toBe(4);
    expect(pickTarget([b, a], { x: 200, y: 590 })?.id).toBe(4);
  });

  it('ignores enemies already behind the rocket or above the screen', () => {
    expect(pickTarget([still({ y: 650 }), still({ id: 2, y: -30 })], { x: 200, y: 590 })).toBeNull();
    expect(pickTarget([], { x: 200, y: 590 })).toBeNull();
  });
});

describe('rocket flight', () => {
  it('launches one slow rocket with a long cooldown', () => {
    const s = fire(rocket());
    expect(s.bullets).toHaveLength(1);
    expect(s.bullets[0]).toMatchObject({ weapon: 'rocket' });
    expect(s.events.find((e) => e.type === 'shot')).toEqual({ type: 'shot', weapon: 'rocket' });
    expect(s.player.cooldown).toBeCloseTo(WEAPONS.rocket.cooldown, 6);
    expect(WEAPONS.rocket.speed).toBeLessThan(WEAPONS.pulse.speed);
  });

  it('curves toward an off-axis target and destroys it', () => {
    const target = heavy({ x: 330, y: 300 });
    let s = fire(rocket({ enemies: [target] }));
    const xs = [];
    for (let i = 0; i < 200 && s.kills === 0; i++) {
      s = step(s, idle(), 0.016, rng);
      if (s.bullets[0]) xs.push(s.bullets[0].x);
    }
    expect(Math.max(...xs)).toBeGreaterThan(260);
    expect(s.kills).toBe(1);
    expect(s.bullets).toEqual([]);
  });

  it('homes the same way at 30fps and 120fps', () => {
    const run = (dt) => {
      let s = fire(rocket({ enemies: [heavy({ x: 320, y: 250 })] }), dt);
      for (let t = 0; t < 3 && s.kills === 0; t += dt) s = step(s, idle(), dt, rng);
      return s.kills;
    };
    expect(run(1 / 30)).toBe(1);
    expect(run(1 / 120)).toBe(1);
  });

  it('flies off without a blast when there is nothing to hit', () => {
    const { s, events } = fly(fire(rocket()), 3);
    expect(s.bullets).toEqual([]);
    expect(events.some((e) => e.type === 'splash')).toBe(false);
  });
});

describe('rocket splash', () => {
  const armed = (enemies) => ({
    ...rocket({ enemies }),
    bullets: [{ id: 50, x: 200, y: 310, vx: 0, vy: -330, weapon: 'rocket', damage: 2, radius: 7, ttl: 2, heading: 0, targetId: null }],
  });

  it('damages neighbours in the blast radius once and spares those outside it', () => {
    const direct = still({ id: 1, x: 200, y: 290, hp: 5, maxHp: 5 });
    const inside = still({ id: 2, x: 200 + 20 + 50, y: 290, hp: 3, maxHp: 3 });
    const outside = still({ id: 3, x: 200 + 20 + WEAPONS.rocket.splashRadius + 15, y: 290, hp: 3, maxHp: 3 });
    let s = step(armed([direct, inside, outside]), idle(), 0.016, rng);
    const hp = (id) => s.enemies.find((e) => e.id === id).hp;
    expect(hp(1)).toBe(5 - WEAPONS.rocket.damage);
    expect(hp(2)).toBe(3 - WEAPONS.rocket.splashDamage);
    expect(hp(3)).toBe(3);
    const splash = s.events.filter((e) => e.type === 'splash');
    expect(splash).toHaveLength(1);
    expect(splash[0]).toMatchObject({ radius: WEAPONS.rocket.splashRadius, hits: 1 });
    expect(s.bullets).toEqual([]);
    expect(s.explosions.some((x) => x.kind === 'blast' && x.radius === WEAPONS.rocket.splashRadius)).toBe(true);
    for (let i = 0; i < 20; i++) s = step(s, idle(), 0.016, rng);
    expect(hp(1)).toBe(3);
    expect(hp(2)).toBe(2);
  });

  it('chain-kills a cluster for combo and score, counting each kill once', () => {
    const cluster = [still({ id: 1, x: 200, y: 290 }), still({ id: 2, x: 235, y: 290 }), still({ id: 3, x: 165, y: 285 })];
    const s = step(armed(cluster), idle(), 0.016, rng);
    expect(s.kills).toBe(3);
    expect(s.combo).toBe(3);
    expect(s.score).toBe(30);
    expect(s.events.filter((e) => e.type === 'kill')).toHaveLength(3);
    expect(s.events.filter((e) => e.type === 'splash')).toHaveLength(1);
  });

  it('bounds explosions under sustained fire', () => {
    let s = rocket();
    for (let i = 0; i < 4000; i++) {
      s = step({ ...s, enemies: [heavy({ id: 900 + (i % 5), x: 40 + (i % 7) * 50, y: 120, hp: 2, maxHp: 2 })] }, held({ fire: true }), 0.05, rng);
      expect(s.explosions.length).toBeLessThanOrEqual(s.config.maxExplosions);
      expect(s.bullets.length).toBeLessThanOrEqual(s.config.maxBullets);
    }
  });
});
