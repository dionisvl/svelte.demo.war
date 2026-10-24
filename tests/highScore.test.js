import { describe, it, expect } from 'vitest';
import { loadHighScore, saveHighScore, STORAGE_KEY } from '../src/game/highScore.js';

const memory = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
};
const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

describe('high score', () => {
  it('returns 0 when nothing is stored or storage is missing', () => {
    expect(loadHighScore(memory())).toBe(0);
    expect(loadHighScore(null)).toBe(0);
    expect(loadHighScore(undefined)).toBe(0);
  });

  it('ignores corrupt values', () => {
    for (const bad of ['abc', '-5', 'NaN', 'Infinity', '', '1e999', '{"a":1}']) {
      expect(loadHighScore(memory({ [STORAGE_KEY]: bad }))).toBe(0);
    }
  });

  it('reads a stored integer', () => {
    expect(loadHighScore(memory({ [STORAGE_KEY]: '1250' }))).toBe(1250);
  });

  it('saves only when the score beats the stored best and returns the best', () => {
    const m = memory({ [STORAGE_KEY]: '100' });
    expect(saveHighScore(m, 50)).toBe(100);
    expect(m.data[STORAGE_KEY]).toBe('100');
    expect(saveHighScore(m, 300)).toBe(300);
    expect(m.data[STORAGE_KEY]).toBe('300');
  });

  it('survives storage that throws', () => {
    expect(loadHighScore(broken)).toBe(0);
    expect(saveHighScore(broken, 40)).toBe(40);
  });

  it('rejects non-finite or negative scores', () => {
    const m = memory();
    expect(saveHighScore(m, NaN)).toBe(0);
    expect(saveHighScore(m, -3)).toBe(0);
    expect(m.data[STORAGE_KEY]).toBeUndefined();
  });
});
