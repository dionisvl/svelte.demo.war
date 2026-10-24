import { describe, it, expect } from 'vitest';
import { createGame, startGame, pauseGame, restartGame, selectWeapon, step } from '$lib/game/engine.js';
import { WEAPONS, WEAPON_ORDER, weaponForKey } from '$lib/game/weapons.js';
import { applyKey, createInput, keyAction } from '$lib/game/input.js';
import { idle, held, rng, playing, armed } from '../helpers.js';

describe('weapon selection', () => {
  it('defaults to pulse with the original 0.26s cadence', () => {
    expect(createGame().weapon).toBe('pulse');
    expect(WEAPONS.pulse.cooldown).toBe(0.26);
    expect(WEAPON_ORDER).toEqual(['pulse', 'scatter', 'rail', 'rocket']);
  });

  it('starts with only pulse; special weapons need ammo', () => {
    const ready = createGame();
    expect(ready.ammo).toEqual({ scatter: 0, rail: 0, rocket: 0 });
    expect(selectWeapon(ready, 'rail')).toBe(ready);
    expect(selectWeapon(ready, 'laser')).toBe(ready);
  });

  it('switches to any stocked weapon in playing, paused and over phases', () => {
    const s = playing({}, { ammo: armed });
    expect(selectWeapon(startGame(createGame()), 'rocket').weapon).toBe('pulse');
    expect(selectWeapon(s, 'rocket').weapon).toBe('rocket');
    expect(selectWeapon(pauseGame(s), 'scatter').weapon).toBe('scatter');
    expect(selectWeapon({ ...s, phase: 'over' }, 'rail').weapon).toBe('rail');
    expect(selectWeapon(selectWeapon(s, 'rail'), 'pulse').weapon).toBe('pulse');
  });

  it('resets to pulse with no ammo on restart', () => {
    const s = selectWeapon(playing({}, { ammo: armed }), 'rail');
    const fresh = restartGame({ ...s, phase: 'over' });
    expect(fresh.weapon).toBe('pulse');
    expect(fresh.ammo).toEqual({ scatter: 0, rail: 0, rocket: 0 });
  });

  it('spends one ammo per shot and falls back to pulse when empty', () => {
    let s = selectWeapon(playing({}, { ammo: { scatter: 0, rail: 2, rocket: 0 } }), 'rail');
    s = step(s, held({ fire: true }), 0.016, rng);
    expect(s.ammo.rail).toBe(1);
    expect(s.weapon).toBe('rail');
    s = step({ ...s, player: { ...s.player, cooldown: 0 } }, held({ fire: true }), 0.016, rng);
    expect(s.ammo.rail).toBe(0);
    expect(s.weapon).toBe('pulse');
    expect(s.events).toContainEqual({ type: 'empty', weapon: 'rail' });
  });

  it('never spends ammo on pulse', () => {
    const s = step(playing({}, { ammo: armed }), held({ fire: true }), 0.016, rng);
    expect(s.ammo).toEqual(armed);
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
