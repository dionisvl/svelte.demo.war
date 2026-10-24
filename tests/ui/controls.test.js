// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import App from '../../src/App.svelte';
import Arsenal from '$lib/components/Arsenal.svelte';
import Hud from '$lib/components/Hud.svelte';
import { createGame } from '$lib/game/engine.js';

let frames;
let nextHandle;
let ctxs;

function installAudio({ resumeRejects = false } = {}) {
  ctxs = [];
  class FakeContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
      this.calls = { resume: 0, suspend: 0, close: 0 };
      ctxs.push(this);
    }
    createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createBufferSource() { return { connect() {}, disconnect() {}, start() {}, stop() {} }; }
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() {}, stop() {} }; }
    async decodeAudioData() { return {}; }
    async resume() { this.calls.resume++; if (resumeRejects) throw new Error('denied'); this.state = 'running'; }
    async suspend() { this.calls.suspend++; this.state = 'suspended'; }
    async close() { this.calls.close++; this.state = 'closed'; }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })));
}

beforeEach(() => {
  frames = new Map();
  nextHandle = 0;
  vi.stubGlobal('requestAnimationFrame', (cb) => { frames.set(++nextHandle, cb); return nextHandle; });
  vi.stubGlobal('cancelAnimationFrame', (h) => frames.delete(h));
  window.localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const key = (code, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
const weaponButtons = () => [...document.querySelectorAll('[data-weapon]')];
const pressed = () => weaponButtons().filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.weapon);
const soundButton = () => document.querySelector('[data-sound-toggle]');
const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); flushSync(); };

function runFrames(count, start = 0, step = 16) {
  for (let i = 0; i < count; i++) {
    const [[h, cb]] = [...frames];
    frames.delete(h);
    cb(start + i * step);
  }
  flushSync();
}

describe('Arsenal component', () => {
  it('lists four weapons with pressed state, accessible labels, descriptions and cooldowns', () => {
    const onselect = vi.fn();
    const target = document.getElementById('app');
    const ammo = { scatter: 5, rail: 3, rocket: 0 };
    const cmp = mount(Arsenal, { target, props: { weapon: 'scatter', cooldown: 0, ammo, onselect } });
    flushSync();
    expect(weaponButtons().map((b) => b.dataset.weapon)).toEqual(['pulse', 'scatter', 'rail', 'rocket']);
    expect(pressed()).toEqual(['scatter']);
    const rail = weaponButtons()[2];
    expect(rail.getAttribute('aria-label')).toMatch(/Rail.*key 3.*1\.3 seconds.*3 shots/i);
    expect(rail.textContent).toContain('×3');
    expect(weaponButtons()[0].textContent).toContain('∞');
    expect(weaponButtons()[3].disabled).toBe(true);
    expect(target.textContent).toMatch(/Five-bolt close-range fan/);
    rail.click();
    expect(onselect).toHaveBeenCalledWith('rail');
    unmount(cmp);
  });

  it('shows how charged the active weapon is', () => {
    const target = document.getElementById('app');
    const cmp = mount(Arsenal, { target, props: { weapon: 'rail', cooldown: 0.65, ammo: { rail: 2 }, onselect() {} } });
    flushSync();
    const charge = Number(weaponButtons()[2].style.getPropertyValue('--charge'));
    expect(charge).toBeCloseTo(0.5, 1);
    unmount(cmp);
  });
});

describe('Hud sound button', () => {
  const mountHud = (props) => mount(Hud, { target: document.getElementById('app'), props: { game: createGame(), best: 0, onpause() {}, paused: false, ...props } });

  it('reflects and toggles the sound state', () => {
    const onsound = vi.fn();
    const cmp = mountHud({ soundOn: true, soundSupported: true, onsound });
    flushSync();
    expect(soundButton().getAttribute('aria-pressed')).toBe('true');
    expect(soundButton().getAttribute('aria-label')).toBe('Sound');
    soundButton().click();
    expect(onsound).toHaveBeenCalled();
    unmount(cmp);
  });

  it('is disabled and labelled when the browser has no Web Audio', () => {
    const cmp = mountHud({ soundOn: true, soundSupported: false, onsound() {} });
    flushSync();
    expect(soundButton().disabled).toBe(true);
    expect(soundButton().getAttribute('aria-label')).toBe('Sound unavailable');
    unmount(cmp);
  });
});

describe('App weapons', () => {
  it('starts on pulse with special weapons locked until a drop arms them', () => {
    installAudio();
    const app = mount(App, { target: document.getElementById('app') });
    flushSync();
    expect(pressed()).toEqual(['pulse']);
    expect(weaponButtons().map((b) => b.disabled)).toEqual([false, true, true, true]);
    key('Digit3');
    flushSync();
    expect(pressed()).toEqual(['pulse']);
    document.querySelector('button.primary').click();
    flushSync();
    key('Digit2');
    key('Numpad4');
    flushSync();
    expect(pressed()).toEqual(['pulse']);
    unmount(app);
  });

  it('does not leave fire stuck after blur', () => {
    installAudio();
    const app = mount(App, { target: document.getElementById('app') });
    flushSync();
    document.querySelector('button.primary').click();
    flushSync();
    key('Space');
    runFrames(1);
    const pulse = () => Number(weaponButtons()[0].style.getPropertyValue('--charge'));
    expect(pulse()).toBeLessThan(1);
    window.dispatchEvent(new Event('blur'));
    flushSync();
    key('KeyP');
    flushSync();
    runFrames(25);
    expect(pulse()).toBe(1);
    unmount(app);
  });
});

describe('App sound', () => {
  it('creates no AudioContext until Launch, then unlocks and resumes it', async () => {
    installAudio();
    const app = mount(App, { target: document.getElementById('app') });
    flushSync();
    await settle();
    expect(ctxs).toHaveLength(0);
    document.querySelector('button.primary').click();
    await settle();
    expect(ctxs).toHaveLength(1);
    expect(ctxs[0].state).toBe('running');
    unmount(app);
    expect(ctxs[0].calls.close).toBe(1);
  });

  it('persists the mute preference and restores it on the next load', async () => {
    installAudio();
    let app = mount(App, { target: document.getElementById('app') });
    flushSync();
    expect(soundButton().getAttribute('aria-pressed')).toBe('true');
    soundButton().click();
    flushSync();
    expect(soundButton().getAttribute('aria-pressed')).toBe('false');
    expect(window.localStorage.getItem('sveltewar:sound:v1')).toBe('off');
    unmount(app);
    document.body.innerHTML = '<div id="app"></div>';
    app = mount(App, { target: document.getElementById('app') });
    flushSync();
    expect(soundButton().getAttribute('aria-pressed')).toBe('false');
    unmount(app);
  });

  it('suspends audio while paused or hidden', async () => {
    installAudio();
    const app = mount(App, { target: document.getElementById('app') });
    flushSync();
    document.querySelector('button.primary').click();
    await settle();
    window.dispatchEvent(new Event('blur'));
    await settle();
    expect(ctxs[0].calls.suspend).toBe(1);
    key('KeyP');
    await settle();
    expect(ctxs[0].state).toBe('running');
    unmount(app);
  });

  it('plays fine without Web Audio and survives a denied resume', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    let app = mount(App, { target: document.getElementById('app') });
    flushSync();
    expect(soundButton().disabled).toBe(true);
    document.querySelector('button.primary').click();
    await settle();
    expect(document.querySelector('.overlay')).toBeNull();
    expect(frames.size).toBe(1);
    unmount(app);

    document.body.innerHTML = '<div id="app"></div>';
    installAudio({ resumeRejects: true });
    app = mount(App, { target: document.getElementById('app') });
    flushSync();
    document.querySelector('button.primary').click();
    await settle();
    expect(document.querySelector('.overlay')).toBeNull();
    unmount(app);
  });
});
