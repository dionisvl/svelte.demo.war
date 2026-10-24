import { describe, it, expect } from 'vitest';
import { createGame, startGame, pauseGame, restartGame, selectWeapon, step } from '../src/game/engine.js';
import { WEAPONS, WEAPON_ORDER, weaponForKey } from '../src/game/weapons.js';
import { applyKey, createInput, keyAction } from '../src/game/input.js';
import { idle, held, rng, playing } from './helpers.js';

describe('weapon selection', () => {
  it('defaults to pulse with the original 0.26s cadence', () => {
    expect(createGame().weapon).toBe('pulse');
    expect(WEAPONS.pulse.cooldown).toBe(0.26);
    expect(WEAPON_ORDER).toEqual(['pulse', 'scatter', 'rail', 'rocket']);
  });

  it('switches in ready, playing, paused and over phases and ignores unknown ids', () => {
    const ready = createGame();
    expect(selectWeapon(ready, 'rail').weapon).toBe('rail');
    expect(selectWeapon(startGame(ready), 'rocket').weapon).toBe('rocket');
    expect(selectWeapon(pauseGame(playing()), 'scatter').weapon).toBe('scatter');
    expect(selectWeapon({ ...playing(), phase: 'over' }, 'scatter').weapon).toBe('scatter');
    expect(selectWeapon(ready, 'laser')).toBe(ready);
  });

  it('keeps the selected weapon across restart', () => {
    const s = selectWeapon(playing(), 'rail');
    expect(restartGame({ ...s, phase: 'over' }).weapon).toBe('rail');
  });

  it('tags shot events with the active weapon', () => {
    const s = step(playing(), held({ fire: true }), 0.016, rng);
    expect(s.events.find((e) => e.type === 'shot')).toMatchObject({ weapon: 'pulse' });
  });

  it('maps digit keys 1-4 (row and numpad) to weapons without making them held controls', () => {
    expect(weaponForKey('Digit1')).toBe('pulse');
    expect(weaponForKey('Numpad2')).toBe('scatter');
    expect(weaponForKey('Digit3')).toBe('rail');
    expect(weaponForKey('Digit4')).toBe('rocket');
    expect(weaponForKey('Digit5')).toBeNull();
    expect(keyAction('Digit1')).toBeNull();
    expect(applyKey(createInput(), 'Digit1', true)).toEqual(idle());
  });
});
