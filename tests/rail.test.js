import { describe, it, expect } from 'vitest';
import { selectWeapon, step } from '../src/game/engine.js';
import { WEAPONS } from '../src/game/weapons.js';
import { held, idle, rng, playing, enemy, armed } from './helpers.js';

const rail = (patch = {}) => selectWeapon(playing({}, { ammo: armed, ...patch }), 'rail');
const fire = (s, dt = 0.016) => step(s, held({ fire: true }), dt, rng);
const heavy = (patch = {}) => enemy({ r: 26, hp: 2, maxHp: 2, kind: 'heavy', points: 30, ...patch });

describe('rail', () => {
  it('pierces every enemy in its lane in a single shot, heavy armor included', () => {
    const lane = [enemy({ id: 1, y: 100 }), heavy({ id: 2, y: 250 }), enemy({ id: 3, x: 206, y: 400 })];
    const aside = enemy({ id: 4, x: 290, y: 300 });
    const s = fire(rail({ enemies: [...lane, aside] }));
    expect(s.enemies.map((e) => e.id)).toEqual([4]);
    expect(s.kills).toBe(3);
    expect(s.combo).toBe(3);
    expect(s.score).toBe(10 + 30 + 10);
    expect(s.events.filter((e) => e.type === 'kill')).toHaveLength(3);
    expect(s.events.find((e) => e.type === 'shot')).toEqual({ type: 'shot', weapon: 'rail' });
    expect(s.player.cooldown).toBeCloseTo(WEAPONS.rail.cooldown, 6);
  });

  it('ignores enemies beside the lane or behind the ship', () => {
    const near = enemy({ id: 1, x: 200 + 20 + WEAPONS.rail.halfWidth + 3, y: 300 });
    const behind = enemy({ id: 2, x: 200, y: 640 });
    const s = fire(rail({ enemies: [near, behind] }));
    expect(s.kills).toBe(0);
  });

  it('applies its damage once: tough targets are not re-hit by the lingering beam', () => {
    let s = fire(rail({ enemies: [enemy({ y: 200, hp: 8, maxHp: 8, vy: 0 })] }));
    expect(s.enemies[0].hp).toBe(8 - WEAPONS.rail.damage);
    const hits = s.events.filter((e) => e.type === 'hit').length;
    expect(hits).toBe(1);
    for (let i = 0; i < 10; i++) s = step(s, idle(), 0.016, rng);
    expect(s.enemies[0].hp).toBe(8 - WEAPONS.rail.damage);
  });

  it('leaves a lingering beam that expires, and never piles up', () => {
    let s = fire(rail());
    expect(s.beams).toHaveLength(1);
    expect(s.beams[0].x).toBe(s.player.x);
    for (let i = 0; i < 5; i++) s = step(s, idle(), 0.016, rng);
    expect(s.beams).toHaveLength(1);
    for (let i = 0; i < 40; i++) s = step(s, idle(), 0.016, rng);
    expect(s.beams).toEqual([]);

    let peak = 0;
    for (let i = 0; i < 3000; i++) {
      s = fire(s, 0.05);
      peak = Math.max(peak, s.beams.length);
    }
    expect(peak).toBeLessThanOrEqual(s.config.maxBeams);
    expect(peak).toBeGreaterThan(0);
  });

  it('starts fresh after restart', async () => {
    const { restartGame } = await import('../src/game/engine.js');
    expect(restartGame(fire(rail())).beams).toEqual([]);
  });
});
