import { createGame, startGame } from '$lib/game/engine.js';
import { createInput } from '$lib/game/input.js';

export const idle = () => createInput();
export const held = (patch) => ({ ...createInput(), ...patch });
export const rng = () => 0.5;
export const armed = Object.freeze({ scatter: 99, rail: 99, rocket: 99 });

export function playing(overrides = {}, patch = {}) {
  return { ...startGame(createGame(overrides)), spawnTimer: 999, ...patch };
}

export const enemy = (patch = {}) => ({
  id: 1000, x: 200, y: 100, vx: 0, hp: 1, maxHp: 1, r: 20, kind: 'drone', points: 10, ...patch,
});
export const bullet = (patch = {}) => ({ id: 2000, x: 200, y: 300, ...patch });
