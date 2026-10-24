import { describe, it, expect } from 'vitest';
import { createInput, keyAction, applyKey, releaseAll } from '../src/game/input.js';

describe('keyboard mapping', () => {
  it('maps arrows and A/D to movement, Space to fire, P/Escape to pause', () => {
    expect(keyAction('ArrowLeft')).toBe('left');
    expect(keyAction('KeyA')).toBe('left');
    expect(keyAction('ArrowRight')).toBe('right');
    expect(keyAction('KeyD')).toBe('right');
    expect(keyAction('Space')).toBe('fire');
    expect(keyAction('KeyP')).toBe('pause');
    expect(keyAction('Escape')).toBe('pause');
    expect(keyAction('KeyZ')).toBeNull();
  });

  it('tracks key down and up', () => {
    let i = createInput();
    i = applyKey(i, 'ArrowLeft', true);
    i = applyKey(i, 'Space', true);
    expect(i).toMatchObject({ left: true, fire: true, right: false });
    i = applyKey(i, 'ArrowLeft', false);
    expect(i.left).toBe(false);
    expect(i.fire).toBe(true);
  });

  it('keeps a direction pressed when the other key of the pair is released', () => {
    let i = createInput();
    i = applyKey(i, 'ArrowLeft', true);
    i = applyKey(i, 'KeyA', true);
    i = applyKey(i, 'ArrowLeft', false);
    expect(i.left).toBe(true);
    i = applyKey(i, 'KeyA', false);
    expect(i.left).toBe(false);
  });

  it('clears all held controls and the pointer target on blur', () => {
    let i = createInput();
    i = applyKey(i, 'ArrowRight', true);
    i = applyKey(i, 'Space', true);
    i = { ...i, targetX: 120 };
    expect(releaseAll(i)).toEqual(createInput());
  });

  it('does not store pause as a held control', () => {
    const i = applyKey(createInput(), 'KeyP', true);
    expect(i).toEqual(createInput());
  });
});

describe('pointer mapping', () => {
  it('maps client x to world x with letterboxing', async () => {
    const { toWorldX } = await import('../src/game/input.js');
    expect(toWorldX(500, { left: 100, width: 400, height: 700 })).toBe(400);
    expect(toWorldX(100, { left: 100, width: 400, height: 700 })).toBe(0);
    expect(toWorldX(200, { left: 0, width: 800, height: 700 })).toBe(0);
    expect(toWorldX(400, { left: 0, width: 800, height: 700 })).toBeCloseTo(200, 6);
    expect(toWorldX(10, { left: 0, width: 200, height: 700 })).toBe(20);
  });
});
