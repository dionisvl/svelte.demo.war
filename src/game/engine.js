import { DEFAULTS, WORLD, MAX_DT } from './config.js';
import { WEAPONS, isWeapon } from './weapons.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const levelFor = (kills, killsPerLevel = DEFAULTS.killsPerLevel) =>
  1 + Math.floor(kills / killsPerLevel);

export const spawnInterval = (level, cfg = DEFAULTS) =>
  Math.max(cfg.minSpawnInterval, cfg.baseSpawnInterval * 0.92 ** (level - 1));

export const enemySpeed = (level, cfg = DEFAULTS) =>
  Math.min(cfg.maxEnemySpeed, cfg.baseEnemySpeed + cfg.speedPerLevel * (level - 1));

const multiplierFor = (combo, cfg) =>
  Math.min(cfg.maxMultiplier, 1 + Math.floor(combo / cfg.comboStep));

function freshState(config, weapon = 'pulse') {
  return {
    phase: 'ready',
    weapon,
    config,
    time: 0,
    score: 0,
    kills: 0,
    combo: 0,
    bestCombo: 0,
    multiplier: 1,
    level: 1,
    shields: config.shields,
    player: { x: WORLD.width / 2, y: config.playerY, cooldown: 0 },
    bullets: [],
    enemies: [],
    explosions: [],
    beams: [],
    spawnTimer: 0.8,
    nextId: 1,
    events: [],
  };
}

export const createGame = (overrides = {}) => freshState({ ...DEFAULTS, ...overrides });

export const startGame = (state) => (state.phase === 'ready' ? { ...state, phase: 'playing' } : state);
export const pauseGame = (state) => (state.phase === 'playing' ? { ...state, phase: 'paused' } : state);
export const resumeGame = (state) => (state.phase === 'paused' ? { ...state, phase: 'playing' } : state);
export const restartGame = (state) => ({ ...freshState(state.config, state.weapon), phase: 'playing' });
export const selectWeapon = (state, id) => (isWeapon(id) && id !== state.weapon ? { ...state, weapon: id } : state);

function movePlayer(player, input, dt, cfg) {
  const min = cfg.playerRadius;
  const max = WORLD.width - cfg.playerRadius;
  const reach = cfg.playerSpeed * dt;
  let x = player.x;
  if (input.targetX != null) {
    const target = clamp(input.targetX, min, max);
    x += clamp(target - x, -reach, reach);
  } else {
    x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * reach;
  }
  return clamp(x, min, max);
}

function segmentHitsCircle(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((cx - x0) * dx + (cy - y0) * dy) / len2, 0, 1);
  return Math.hypot(x0 + t * dx - cx, y0 + t * dy - cy) <= r;
}

const weaponStats = (cfg, id) =>
  id === 'pulse'
    ? { ...WEAPONS.pulse, cooldown: cfg.fireCooldown, speed: cfg.bulletSpeed, radius: cfg.bulletRadius }
    : WEAPONS[id];

export function pickTarget(enemies, from) {
  let best = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (e.y < 0 || e.y > from.y + 20) continue;
    const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
    if (d < bestD || (d === bestD && e.id < best.id)) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function steer(b, enemies, dt) {
  const w = WEAPONS.rocket;
  let target = enemies.find((e) => e.id === b.targetId);
  if (!target || target.y < 0 || target.y > b.y + 20) target = pickTarget(enemies, b);
  let heading = b.heading ?? 0;
  if (target) {
    const wanted = Math.atan2(target.x - b.x, b.y - target.y);
    heading += clamp(wrapAngle(wanted - heading), -w.turnRate * dt, w.turnRate * dt);
  }
  return { ...b, heading, targetId: target?.id ?? null, vx: Math.sin(heading) * w.speed, vy: -Math.cos(heading) * w.speed };
}

function advanceBullet(b, cfg, dt) {
  const x = b.x + (b.vx ?? 0) * dt;
  const y = b.y + (b.vy ?? -cfg.bulletSpeed) * dt;
  const r = b.radius ?? cfg.bulletRadius;
  const moved = { ...b, prevX: b.x, prevY: b.y, x, y };
  if (b.ttl != null) moved.ttl = b.ttl - dt;
  const alive = y > -r && x > -r && x < WORLD.width + r && (moved.ttl == null || moved.ttl > 0);
  return alive ? moved : null;
}

function muzzleBullets(w, cfg, x, nextId, enemies) {
  const y = cfg.playerY - cfg.playerRadius;
  if (w.id === 'rocket') {
    return [{
      id: nextId, x, y, prevX: x, prevY: y, vx: 0, vy: -w.speed, weapon: w.id, damage: w.damage,
      radius: w.radius, ttl: w.ttl, heading: 0, targetId: pickTarget(enemies, { x, y })?.id ?? null,
    }];
  }
  const make = (id, angle) => ({
    id,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: Math.sin(angle) * w.speed,
    vy: -Math.cos(angle) * w.speed,
    weapon: w.id,
    damage: w.damage,
    radius: w.radius,
    ...(w.range ? { ttl: w.range / w.speed } : {}),
  });
  return (w.angles ?? [0]).map((a, i) => make(nextId + i, a));
}

function spawnEnemy(state, rng) {
  const cfg = state.config;
  const heavy = state.level >= cfg.heavyFromLevel && rng() < cfg.heavyChance;
  const r = heavy ? cfg.heavyRadius : cfg.enemyRadius;
  const speed = enemySpeed(state.level, cfg);
  const drift = (rng() - 0.5) * 2 * Math.min(90, 20 + state.level * 6);
  return {
    id: state.nextId,
    x: r + rng() * (WORLD.width - 2 * r),
    y: -r,
    vx: drift,
    vy: heavy ? speed * 0.75 : speed,
    hp: heavy ? 2 : 1,
    maxHp: heavy ? 2 : 1,
    r,
    kind: heavy ? 'heavy' : 'drone',
    points: heavy ? cfg.heavyPoints : cfg.killPoints,
  };
}

export function step(state, input, rawDt, rng = Math.random) {
  if (state.phase !== 'playing') return state;

  const cfg = state.config;
  const dt = clamp(rawDt, 0, MAX_DT);
  const events = [];
  let nextId = state.nextId;
  let { score, kills, combo, bestCombo, shields, spawnTimer } = state;
  let level = levelFor(kills, cfg.killsPerLevel);

  const px = movePlayer(state.player, input, dt, cfg);
  let cooldown = Math.max(0, state.player.cooldown - dt);

  const weapon = state.weapon ?? 'pulse';
  const w = weaponStats(cfg, weapon);

  let bullets = [];
  for (const b of state.bullets) {
    const moved = advanceBullet(b.weapon === 'rocket' ? steer(b, state.enemies, dt) : b, cfg, dt);
    if (moved) bullets.push(moved);
  }
  const beams = state.beams
    .map((b) => ({ ...b, age: b.age + dt }))
    .filter((b) => b.age < b.ttl);
  const strikes = [];
  if (input.fire && cooldown === 0 && weapon === 'rail') {
    const beam = { id: nextId++, x: px, age: 0, ttl: w.beamTtl, halfWidth: w.halfWidth };
    beams.push(beam);
    strikes.push({ ...beam, damage: w.damage });
    cooldown = w.cooldown;
    events.push({ type: 'shot', weapon });
  } else if (input.fire && cooldown === 0) {
    const volley = muzzleBullets(w, cfg, px, nextId, state.enemies);
    if (bullets.length + volley.length <= cfg.maxBullets) {
      bullets.push(...volley);
      nextId += volley.length;
      cooldown = w.cooldown;
      events.push({ type: 'shot', weapon });
    }
  }

  spawnTimer -= dt;
  const spawned = [];
  if (spawnTimer <= 0) {
    if (state.enemies.length < cfg.maxEnemies) {
      const e = spawnEnemy({ ...state, nextId, level }, rng);
      nextId++;
      spawned.push(e);
    }
    spawnTimer = spawnInterval(level, cfg);
  }

  const explosions = state.explosions
    .map((e) => ({ ...e, age: e.age + dt }))
    .filter((e) => e.age < e.ttl);
  const boom = (x, y, kind, radius) =>
    explosions.push({ id: nextId++, x, y, age: 0, ttl: cfg.explosionTtl, kind, ...(radius ? { radius } : {}) });

  let enemies = [];
  for (const e of state.enemies) {
    let x = e.x + e.vx * dt;
    let vx = e.vx;
    if (x < e.r) { x = e.r; vx = Math.abs(vx); }
    else if (x > WORLD.width - e.r) { x = WORLD.width - e.r; vx = -Math.abs(vx); }
    enemies.push({ ...e, x, vx, y: e.y + (e.vy ?? enemySpeed(level, cfg)) * dt });
  }
  enemies.push(...spawned);

  const spent = new Set();
  const blasts = [];
  const damage = new Map();
  const strike = (e, amount) => damage.set(e.id, (damage.get(e.id) ?? 0) + amount);
  for (const e of enemies) {
    let hp = e.hp;
    for (const b of bullets) {
      if (hp <= 0) break;
      if (spent.has(b.id)) continue;
      const reach = e.r + (b.radius ?? cfg.bulletRadius);
      if (segmentHitsCircle(b.prevX ?? b.x, b.prevY ?? b.y, b.x, b.y, e.x, e.y, reach)) {
        spent.add(b.id);
        hp -= b.damage ?? 1;
        if (b.weapon === 'rocket') blasts.push({ x: b.x, y: b.y, directId: e.id });
      }
    }
    for (const beam of strikes) {
      if (hp > 0 && e.y <= cfg.playerY - cfg.playerRadius && Math.abs(e.x - beam.x) <= e.r + beam.halfWidth) {
        hp -= beam.damage;
      }
    }
    strike(e, e.hp - hp);
  }

  const splash = WEAPONS.rocket;
  for (const blast of blasts) {
    let hits = 0;
    for (const e of enemies) {
      if (e.id === blast.directId) continue;
      if (Math.hypot(e.x - blast.x, e.y - blast.y) - e.r <= splash.splashRadius) {
        strike(e, splash.splashDamage);
        hits++;
      }
    }
    boom(blast.x, blast.y, 'blast', splash.splashRadius);
    events.push({ type: 'splash', x: blast.x, y: blast.y, radius: splash.splashRadius, hits });
  }

  const survivors = [];
  for (const e of enemies) {
    const hp = e.hp - (damage.get(e.id) ?? 0);
    if (hp <= 0) {
      combo += 1;
      bestCombo = Math.max(bestCombo, combo);
      const gained = e.points * multiplierFor(combo, cfg);
      score += gained;
      kills += 1;
      boom(e.x, e.y, e.kind);
      events.push({ type: 'kill', x: e.x, y: e.y, points: gained });
    } else {
      if (hp < e.hp) events.push({ type: 'hit', x: e.x, y: e.y });
      survivors.push({ ...e, hp });
    }
  }
  bullets = bullets.filter((b) => !spent.has(b.id)).map(({ prevX, prevY, ...b }) => b);

  const kept = [];
  for (const e of survivors) {
    const rammed = Math.hypot(e.x - px, e.y - cfg.playerY) < e.r + cfg.playerRadius * 0.8;
    if (rammed || e.y + e.r * 0.5 >= cfg.defenseY) {
      shields = Math.max(0, shields - 1);
      combo = 0;
      boom(e.x, Math.min(e.y, cfg.defenseY), 'leak');
      events.push({ type: rammed ? 'ram' : 'leak', x: e.x });
    } else {
      kept.push(e);
    }
  }

  const nextLevel = levelFor(kills, cfg.killsPerLevel);
  if (nextLevel > state.level) events.push({ type: 'level', level: nextLevel });
  level = nextLevel;

  let phase = state.phase;
  if (shields === 0) {
    phase = 'over';
    events.push({ type: 'over', score });
  }

  return {
    ...state,
    phase,
    time: state.time + dt,
    score,
    kills,
    combo,
    bestCombo,
    multiplier: multiplierFor(combo, cfg),
    level,
    shields,
    player: { ...state.player, x: px, cooldown },
    bullets,
    enemies: kept,
    explosions: explosions.slice(-cfg.maxExplosions),
    beams: beams.slice(-cfg.maxBeams),
    spawnTimer,
    nextId,
    events,
  };
}
