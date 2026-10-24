// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import App from '../../src/App.svelte';

let frames;
let nextHandle;

beforeEach(() => {
  frames = new Map();
  nextHandle = 0;
  vi.stubGlobal('requestAnimationFrame', (cb) => { frames.set(++nextHandle, cb); return nextHandle; });
  vi.stubGlobal('cancelAnimationFrame', (h) => frames.delete(h));
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const key = (code, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
const text = () => document.body.textContent;

describe('App', () => {
  it('shows the start overlay, runs only while playing, pauses on blur, and cleans up', () => {
    const app = mount(App, { target: document.getElementById('app') });
    flushSync();
    expect(text()).toContain('Launch');
    expect(frames.size).toBe(0);

    document.querySelector('button.primary').click();
    flushSync();
    expect(document.querySelector('.overlay')).toBeNull();
    expect(frames.size).toBe(1);

    window.dispatchEvent(new Event('blur'));
    flushSync();
    expect(text()).toContain('Paused');
    expect(frames.size).toBe(0);

    key('KeyP');
    flushSync();
    expect(document.querySelector('.overlay')).toBeNull();
    expect(frames.size).toBe(1);

    key('Escape');
    flushSync();
    expect(text()).toContain('Paused');

    unmount(app);
    expect(frames.size).toBe(0);
  });

  it('starts with Space from the ready screen', () => {
    const app = mount(App, { target: document.getElementById('app') });
    flushSync();
    key('Space');
    flushSync();
    expect(document.querySelector('.overlay')).toBeNull();
    expect(frames.size).toBe(1);
    unmount(app);
  });
});
