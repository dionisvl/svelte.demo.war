import { describe, it, expect } from 'vitest';
import {
  createGame, startGame, pauseGame, resumeGame, restartGame,
  step, levelFor, spawnInterval, enemySpeed,
} from '../src/game/engine.js';
import { WORLD, MAX_DT } from '../src/game/config.js';
import { idle, held, rng, playing, enemy, bullet } from './helpers.js';

describe('lifecycle', () => {
  it('starts in ready phase and does not advance until started', () => {
    const s = createGame();
    expect(s.phase).toBe('ready');
    const next = step(s, idle(), 0.016, rng);
    expect(next.time).toBe(0);
    expect(startGame(s).phase).toBe('playing');
  });

  it('pauses without advancing and resumes without catch-up', () => {
    const s = playing({}, { enemies: [enemy({ y: 100 })] });
    const p = pauseGame(s);
    expect(p.phase).toBe('paused');
    const after = step(p, idle(), 5, rng);
    expect(after.enemies[0].y).toBe(100);
    expect(after.time).toBe(s.time);
    const r = resumeGame(p);
    expect(r.phase).toBe('playing');
    const moved = step(r, idle(), 10, rng);
    expect(moved.enemies[0].y - 100).toBeLessThanOrEqual(moved.config.maxEnemySpeed * MAX_DT + 1e-9);
  });

  it('ignores pause from ready/over and resume from non-paused', () => {
    expect(pauseGame(createGame()).phase).toBe('ready');
    expect(resumeGame(playing()).phase).toBe('playing');
    const over = { ...playing(), phase: 'over' };
    expect(pauseGame(over).phase).toBe('over');
    expect(resumeGame(over).phase).toBe('over');
  });

  it('restart resets score, entities and shields and plays immediately', () => {
    const dirty = playing({}, {
      score: 500, kills: 20, combo: 7, shields: 0, phase: 'over',
      enemies: [enemy()], bullets: [bullet()], explosions: [{ id: 5, x: 1, y: 1, age: 0, ttl: 1, kind: 'kill' }],
    });
    const fresh = restartGame(dirty);
    expect(fresh.phase).toBe('playing');
    expect(fresh.score).toBe(0);
    expect(fresh.kills).toBe(0);
    expect(fresh.combo).toBe(0);
    expect(fresh.shields).toBe(fresh.config.shields);
    expect(fresh.enemies).toEqual([]);
    expect(fresh.bullets).toEqual([]);
    expect(fresh.explosions).toEqual([]);
  });

  it('does nothing once the game is over', () => {
    const over = { ...playing({}, { enemies: [enemy()] }), phase: 'over' };
    const next = step(over, held({ fire: true }), 0.016, rng);
    expect(next.enemies[0].y).toBe(100);
    expect(next.bullets).toEqual([]);
  });
});

describe('player movement', () => {
  it('stays inside the world bounds', () => {
    let s = playing();
    for (let i = 0; i < 300; i++) s = step(s, held({ left: true }), 0.016, rng);
    expect(s.player.x).toBe(s.config.playerRadius);
    for (let i = 0; i < 600; i++) s = step(s, held({ right: true }), 0.016, rng);
    expect(s.player.x).toBe(WORLD.width - s.config.playerRadius);
  });

  it('does not move when both directions are held', () => {
    const s = playing();
    const n = step(s, held({ left: true, right: true }), 0.016, rng);
    expect(n.player.x).toBe(s.player.x);
  });

  it('moves the same distance regardless of frame rate', () => {
    const a = step(playing(), held({ right: true }), 1 / 30, rng);
    let b = playing();
    b = step(b, held({ right: true }), 1 / 60, rng);
    b = step(b, held({ right: true }), 1 / 60, rng);
    expect(b.player.x).toBeCloseTo(a.player.x, 6);
    expect(a.player.x - 200).toBeCloseTo(a.config.playerSpeed / 30, 6);
  });

  it('clamps huge delta times so a stall cannot teleport entities', () => {
    const s = playing({}, { enemies: [enemy({ y: 0 })] });
    const n = step(s, held({ right: true }), 30, rng);
    expect(n.player.x - s.player.x).toBeCloseTo(s.config.playerSpeed * MAX_DT, 6);
    expect(n.enemies[0].y).toBeLessThan(s.config.maxEnemySpeed * MAX_DT + 1);
  });

  it('steers toward a pointer target without overshooting', () => {
    let s = playing();
    s = step(s, held({ targetX: 210 }), 0.016, rng);
    expect(s.player.x).toBeGreaterThan(200);
    for (let i = 0; i < 20; i++) s = step(s, held({ targetX: 210 }), 0.016, rng);
    expect(s.player.x).toBe(210);
  });

  it('keeps pointer targets inside the bounds', () => {
    let s = playing();
    for (let i = 0; i < 200; i++) s = step(s, held({ targetX: -500 }), 0.016, rng);
    expect(s.player.x).toBe(s.config.playerRadius);
  });
});

describe('firing', () => {
  it('fires while held, respecting the cooldown', () => {
    let s = playing();
    s = step(s, held({ fire: true }), 0.016, rng);
    expect(s.bullets).toHaveLength(1);
    s = step(s, held({ fire: true }), 0.016, rng);
    expect(s.bullets).toHaveLength(1);
    for (let i = 0; i < 20; i++) s = step(s, held({ fire: true }), 0.016, rng);
    expect(s.bullets.length).toBeGreaterThanOrEqual(2);
  });

  it('does not fire without input', () => {
    const s = step(playing(), idle(), 0.016, rng);
    expect(s.bullets).toEqual([]);
  });

  it('spawns bullets at the ship and moves them up at a fixed speed', () => {
    let s = step(playing(), held({ fire: true }), 0.016, rng);
    const b0 = s.bullets[0];
    expect(b0.x).toBe(s.player.x);
    s = step(s, idle(), 0.1, rng);
    expect(s.bullets[0].y).toBeCloseTo(b0.y - s.config.bulletSpeed * 0.05, 6);
  });

  it('assigns unique primitive ids to every entity', () => {
    let s = playing({}, { spawnTimer: 0 });
    const ids = new Set();
    for (let i = 0; i < 300; i++) {
      s = step(s, held({ fire: true }), 0.016, rng);
      for (const e of [...s.bullets, ...s.enemies, ...s.explosions]) {
        expect(typeof e.id).toBe('number');
        ids.add(`${e.id}`);
      }
    }
    expect(ids.size).toBeGreaterThan(5);
    const all = [...s.bullets, ...s.enemies, ...s.explosions].map((e) => e.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('removes bullets that leave the top of the field', () => {
    const s = playing({}, { bullets: [bullet({ y: 60 })] });
    const n = step(s, idle(), 0.05, rng);
    expect(n.bullets).toHaveLength(1);
    let t = n;
    for (let i = 0; i < 5; i++) t = step(t, idle(), 0.05, rng);
    expect(t.bullets).toEqual([]);
  });
});

describe('collisions and scoring', () => {
  it('destroys an enemy, consumes the bullet and awards points', () => {
    const s = playing({}, { enemies: [enemy({ x: 200, y: 200 })], bullets: [bullet({ x: 200, y: 215 })] });
    const n = step(s, idle(), 0.016, rng);
    expect(n.enemies).toEqual([]);
    expect(n.bullets).toEqual([]);
    expect(n.score).toBe(10);
    expect(n.kills).toBe(1);
    expect(n.combo).toBe(1);
    expect(n.explosions).toHaveLength(1);
    expect(n.events.map((e) => e.type)).toContain('kill');
  });

  it('misses an enemy that is horizontally clear of the bullet', () => {
    const s = playing({}, { enemies: [enemy({ x: 100, y: 200 })], bullets: [bullet({ x: 200, y: 215 })] });
    const n = step(s, idle(), 0.016, rng);
    expect(n.enemies).toHaveLength(1);
    expect(n.score).toBe(0);
  });

  it('detects hits for fast bullets that cross the enemy within one step', () => {
    const s = playing({}, { enemies: [enemy({ x: 200, y: 300 })], bullets: [bullet({ x: 200, y: 340 })] });
    const n = step(s, idle(), MAX_DT, rng);
    expect(n.enemies).toEqual([]);
    expect(n.score).toBe(10);
  });

  it('damages heavy enemies before destroying them', () => {
    const heavy = enemy({ hp: 2, maxHp: 2, kind: 'heavy', r: 26, points: 30, y: 200 });
    let s = playing({}, { enemies: [heavy], bullets: [bullet({ x: 200, y: 215 })] });
    s = step(s, idle(), 0.016, rng);
    expect(s.enemies).toHaveLength(1);
    expect(s.enemies[0].hp).toBe(1);
    expect(s.score).toBe(0);
    expect(s.bullets).toEqual([]);
    s = { ...s, bullets: [bullet({ id: 2001, x: s.enemies[0].x, y: s.enemies[0].y + 15 })] };
    s = step(s, idle(), 0.016, rng);
    expect(s.enemies).toEqual([]);
    expect(s.score).toBe(30);
  });

  it('one bullet can only hit one enemy', () => {
    const s = playing({}, {
      enemies: [enemy({ id: 1, x: 200, y: 200 }), enemy({ id: 2, x: 205, y: 200 })],
      bullets: [bullet({ x: 202, y: 215 })],
    });
    const n = step(s, idle(), 0.016, rng);
    expect(n.kills).toBe(1);
    expect(n.enemies).toHaveLength(1);
  });

  it('raises the score multiplier as the combo grows', () => {
    let s = playing({}, { combo: 4 });
    s = { ...s, enemies: [enemy({ y: 200 })], bullets: [bullet({ y: 215 })] };
    s = step(s, idle(), 0.016, rng);
    expect(s.combo).toBe(5);
    expect(s.score).toBe(20);
    expect(s.multiplier).toBe(2);
  });

  it('caps the multiplier', () => {
    let s = playing({}, { combo: 500 });
    s = { ...s, enemies: [enemy({ y: 200 })], bullets: [bullet({ y: 215 })] };
    s = step(s, idle(), 0.016, rng);
    expect(s.score).toBe(10 * s.config.maxMultiplier);
  });

  it('raises the level as kills accumulate', () => {
    const per = createGame().config.killsPerLevel;
    expect(levelFor(0, per)).toBe(1);
    expect(levelFor(per - 1, per)).toBe(1);
    expect(levelFor(per, per)).toBe(2);
    let s = playing({}, { kills: per - 1 });
    s = { ...s, enemies: [enemy({ y: 200 })], bullets: [bullet({ y: 215 })] };
    s = step(s, idle(), 0.016, rng);
    expect(s.level).toBe(2);
    expect(s.events.map((e) => e.type)).toContain('level');
  });
});

describe('enemies reaching the defense line', () => {
  it('removes the enemy, costs a shield and resets the combo', () => {
    const cfg = createGame().config;
    const s = playing({}, { combo: 6, enemies: [enemy({ x: 50, y: cfg.defenseY - 1 })] });
    const n = step(s, idle(), 0.05, rng);
    expect(n.enemies).toEqual([]);
    expect(n.shields).toBe(cfg.shields - 1);
    expect(n.combo).toBe(0);
    expect(n.phase).toBe('playing');
    expect(n.events.map((e) => e.type)).toContain('leak');
  });

  it('ends the game when the last shield is lost', () => {
    const cfg = createGame().config;
    const s = playing({}, { shields: 1, enemies: [enemy({ x: 50, y: cfg.defenseY })] });
    const n = step(s, idle(), 0.016, rng);
    expect(n.shields).toBe(0);
    expect(n.phase).toBe('over');
    expect(n.events.map((e) => e.type)).toContain('over');
  });

  it('never reports negative shields when several enemies leak together', () => {
    const cfg = createGame().config;
    const s = playing({}, {
      shields: 1,
      enemies: [enemy({ id: 1, x: 50, y: cfg.defenseY }), enemy({ id: 2, x: 300, y: cfg.defenseY })],
    });
    expect(step(s, idle(), 0.016, rng).shields).toBe(0);
  });

  it('damages the ship when an enemy rams it', () => {
    const cfg = createGame().config;
    const s = playing({}, { enemies: [enemy({ x: 200, y: cfg.playerY - 10 })] });
    const n = step(s, idle(), 0.016, rng);
    expect(n.enemies).toEqual([]);
    expect(n.shields).toBe(cfg.shields - 1);
    expect(n.events.map((e) => e.type)).toContain('ram');
  });
});

describe('spawning and difficulty', () => {
  it('spawns enemies inside the field when the timer elapses', () => {
    let s = playing({}, { spawnTimer: 0.01 });
    s = step(s, idle(), 0.05, rng);
    expect(s.enemies).toHaveLength(1);
    const e = s.enemies[0];
    expect(e.x).toBeGreaterThanOrEqual(e.r);
    expect(e.x).toBeLessThanOrEqual(WORLD.width - e.r);
    expect(e.y).toBeLessThan(0);
    expect(s.spawnTimer).toBeGreaterThan(0);
  });

  it('makes spawns faster and enemies quicker with level, within limits', () => {
    const cfg = createGame().config;
    expect(spawnInterval(5, cfg)).toBeLessThan(spawnInterval(1, cfg));
    expect(spawnInterval(500, cfg)).toBeGreaterThanOrEqual(cfg.minSpawnInterval);
    expect(enemySpeed(5, cfg)).toBeGreaterThan(enemySpeed(1, cfg));
    expect(enemySpeed(500, cfg)).toBeLessThanOrEqual(cfg.maxEnemySpeed);
  });

  it('only spawns heavy enemies from the configured level', () => {
    const cfg = createGame().config;
    const low = step(playing({}, { spawnTimer: 0 }), idle(), 0.016, () => 0);
    expect(low.enemies[0].kind).toBe('drone');
    const high = step(playing({}, { spawnTimer: 0, kills: cfg.killsPerLevel * cfg.heavyFromLevel }), idle(), 0.016, () => 0);
    expect(high.enemies[0].kind).toBe('heavy');
    expect(high.enemies[0].hp).toBe(2);
  });

  it('bounces enemies off the side walls', () => {
    const s = playing({}, { enemies: [enemy({ x: 25, y: 100, vx: -200 })] });
    const n = step(s, idle(), 0.05, rng);
    expect(n.enemies[0].x).toBeGreaterThanOrEqual(20);
    expect(n.enemies[0].vx).toBeGreaterThan(0);
  });

  it('keeps entity counts bounded in a long autoplay session', () => {
    let s = playing({ shields: 1e9 }, { spawnTimer: 0.1 });
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let peakE = 0, peakB = 0, peakX = 0;
    for (let i = 0; i < 60 * 600; i++) {
      s = step(s, held({ fire: i % 200 < 120, left: i % 90 < 45, right: i % 90 >= 45 }), 1 / 60, r);
      peakE = Math.max(peakE, s.enemies.length);
      peakB = Math.max(peakB, s.bullets.length);
      peakX = Math.max(peakX, s.explosions.length);
    }
    expect(peakE).toBeLessThanOrEqual(s.config.maxEnemies);
    expect(peakB).toBeLessThanOrEqual(s.config.maxBullets);
    expect(peakX).toBeLessThanOrEqual(s.config.maxExplosions);
    expect(s.kills).toBeGreaterThan(0);
  });

  it('expires explosions after their lifetime', () => {
    const s = playing({}, { explosions: [{ id: 9, x: 10, y: 10, age: 0, ttl: 0.2, kind: 'kill' }] });
    let n = step(s, idle(), 0.05, rng);
    expect(n.explosions).toHaveLength(1);
    for (let i = 0; i < 6; i++) n = step(n, idle(), 0.05, rng);
    expect(n.explosions).toEqual([]);
  });

  it('clears one-shot events on the next step', () => {
    const s = playing({}, { enemies: [enemy({ y: 200 })], bullets: [bullet({ y: 215 })] });
    const n = step(s, idle(), 0.016, rng);
    expect(n.events.length).toBeGreaterThan(0);
    expect(step(n, idle(), 0.016, rng).events).toEqual([]);
  });
});
