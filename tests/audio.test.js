import { describe, it, expect, vi } from 'vitest';
import { createAudio } from '../src/audio/audio.js';
import { soundForEvent, SAMPLE_FILES, MAX_VOICES } from '../src/audio/sounds.js';
import { SOUND_KEY, loadSoundEnabled, saveSoundEnabled } from '../src/audio/preference.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

function fakeContext({ resumeFails = 0, startState = 'suspended' } = {}) {
  const ctx = {
    state: startState,
    currentTime: 0,
    destination: {},
    sources: [],
    oscillators: [],
    resumeCalls: 0,
    closed: false,
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    },
    createBufferSource() {
      const src = { buffer: null, started: false, stopped: false, connect() {}, disconnect() {}, start() { src.started = true; }, stop() { src.stopped = true; }, onended: null };
      ctx.sources.push(src);
      return src;
    },
    createOscillator() {
      const osc = { type: 'sine', frequency: { value: 0, setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null };
      ctx.oscillators.push(osc);
      return osc;
    },
    decodeAudioData: vi.fn(async () => ({ duration: 0.2 })),
    async resume() {
      ctx.resumeCalls++;
      if (resumeFails > 0) { resumeFails--; throw new DOMException('denied', 'NotAllowedError'); }
      ctx.state = 'running';
    },
    async suspend() { ctx.state = 'suspended'; },
    async close() { ctx.closed = true; ctx.state = 'closed'; },
  };
  return ctx;
}

const okFetch = () => vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));

function build(options = {}) {
  const ctx = options.ctx ?? fakeContext();
  const Ctor = options.Ctor ?? vi.fn(function Ctor() { return ctx; });
  let clock = 0;
  const audio = createAudio({
    AudioContextClass: 'Ctor' in options ? options.Ctor : Ctor,
    fetchImpl: options.fetchImpl ?? okFetch(),
    storage: options.storage ?? memoryStorage(),
    baseUrl: '/audio/',
    now: () => clock,
  });
  return { audio, ctx, Ctor, advance: (ms) => { clock += ms; } };
}

describe('sound mapping', () => {
  it('maps each weapon shot and each impact to a bundled sample', () => {
    const shot = (weapon) => soundForEvent({ type: 'shot', weapon });
    expect(shot('pulse').files).toEqual(['pulse-1', 'pulse-2']);
    expect(shot('scatter').files).toEqual(['scatter-1', 'scatter-2']);
    expect(shot('rail').files).toEqual(['rail']);
    expect(shot('rocket').files).toEqual(['rocket']);
    expect(soundForEvent({ type: 'hit' }).files).toEqual(['hit']);
    expect(soundForEvent({ type: 'kill' }).files).toEqual(['explosion']);
    expect(soundForEvent({ type: 'splash' }).files).toEqual(['splash']);
    expect(soundForEvent({ type: 'leak' }).files).toEqual(['shield']);
    expect(soundForEvent({ type: 'ram' }).files).toEqual(['shield']);
    expect(soundForEvent({ type: 'over' }).files).toEqual(['over']);
    expect(soundForEvent({ type: 'level' })).toBeNull();
    expect(soundForEvent({ type: 'shot', weapon: 'nope' })).toBeNull();
  });

  it('only references the 11 curated files and keeps every level modest', () => {
    expect(SAMPLE_FILES.slice().sort()).toEqual([
      'explosion', 'hit', 'over', 'pulse-1', 'pulse-2', 'rail', 'rocket', 'scatter-1', 'scatter-2', 'shield', 'splash',
    ]);
    for (const e of ['hit', 'kill', 'splash', 'leak', 'over']) {
      expect(soundForEvent({ type: e }).level).toBeLessThanOrEqual(1);
    }
  });

  it('balances the louder scatter sample within five decibels of pulse', () => {
    const pulse = soundForEvent({ type: 'shot', weapon: 'pulse' }).level;
    const scatter = soundForEvent({ type: 'shot', weapon: 'scatter' }).level;
    const pulseDb = -18.5 + 20 * Math.log10(pulse);
    const scatterDb = -7.5 + 20 * Math.log10(scatter);
    expect(scatterDb - pulseDb).toBeLessThanOrEqual(5);
  });
});

describe('sound preference', () => {
  it('defaults to on and reads a stored off', () => {
    expect(loadSoundEnabled(memoryStorage())).toBe(true);
    expect(loadSoundEnabled(memoryStorage({ [SOUND_KEY]: 'off' }))).toBe(false);
    expect(loadSoundEnabled(memoryStorage({ [SOUND_KEY]: 'garbage' }))).toBe(true);
  });

  it('survives missing or throwing storage', () => {
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(loadSoundEnabled(broken)).toBe(true);
    expect(loadSoundEnabled(null)).toBe(true);
    expect(() => saveSoundEnabled(broken, false)).not.toThrow();
    expect(() => saveSoundEnabled(null, false)).not.toThrow();
  });

  it('persists the choice', () => {
    const storage = memoryStorage();
    saveSoundEnabled(storage, false);
    expect(storage.data[SOUND_KEY]).toBe('off');
    saveSoundEnabled(storage, true);
    expect(loadSoundEnabled(storage)).toBe(true);
  });
});

describe('audio unlock', () => {
  it('creates no AudioContext and plays nothing before a user gesture', () => {
    const { audio, Ctor } = build();
    expect(Ctor).not.toHaveBeenCalled();
    expect(audio.play('hit')).toBe(false);
    audio.handleEvents([{ type: 'shot', weapon: 'pulse' }]);
    expect(Ctor).not.toHaveBeenCalled();
    expect(audio.status).toBe('locked');
  });

  it('creates and resumes the context on unlock, then preloads every sample from the local base', async () => {
    const fetchImpl = okFetch();
    const { audio, ctx, Ctor } = build({ fetchImpl });
    await expect(audio.unlock()).resolves.toBe(true);
    expect(Ctor).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBe('running');
    expect(audio.status).toBe('ready');
    expect(fetchImpl.mock.calls.map(([u]) => u).sort()).toEqual(SAMPLE_FILES.map((f) => `/audio/${f}.mp3`).sort());
    await audio.unlock();
    expect(Ctor).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(SAMPLE_FILES.length);
  });

  it('recovers when the browser denies the first resume', async () => {
    const { audio, ctx } = build({ ctx: fakeContext({ resumeFails: 1 }) });
    await expect(audio.unlock()).resolves.toBe(false);
    expect(audio.status).toBe('locked');
    expect(audio.play('hit')).toBe(false);
    await expect(audio.unlock()).resolves.toBe(true);
    expect(ctx.state).toBe('running');
  });

  it('tolerates a missing AudioContext and a throwing constructor', async () => {
    const none = build({ Ctor: undefined });
    await expect(none.audio.unlock()).resolves.toBe(false);
    expect(none.audio.status).toBe('unsupported');
    expect(none.audio.supported).toBe(false);
    expect(() => none.audio.handleEvents([{ type: 'kill' }])).not.toThrow();
    expect(() => none.audio.switchCue(2)).not.toThrow();

    const boom = build({ Ctor: vi.fn(function Boom() { throw new Error('nope'); }) });
    await expect(boom.audio.unlock()).resolves.toBe(false);
    expect(boom.audio.status).toBe('unsupported');
  });

  it('keeps working when some samples fail to fetch or decode', async () => {
    const ctx = fakeContext();
    ctx.decodeAudioData = vi.fn(async () => { throw new Error('bad data'); });
    const failing = build({ ctx, fetchImpl: vi.fn(async (u) => (u.includes('hit') ? { ok: false } : Promise.reject(new Error('net')))) });
    await expect(failing.audio.unlock()).resolves.toBe(true);
    expect(failing.audio.play('hit')).toBe(false);
    expect(() => failing.audio.handleEvents([{ type: 'shot', weapon: 'rail' }])).not.toThrow();

    const mixed = build({ fetchImpl: vi.fn(async (u) => (u.includes('rail') ? { ok: false } : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) })) });
    await mixed.audio.unlock();
    mixed.audio.handleEvents([{ type: 'shot', weapon: 'rail' }, { type: 'shot', weapon: 'rocket' }]);
    expect(mixed.ctx.sources).toHaveLength(1);
  });
});

describe('playback', () => {
  const ready = async (options) => {
    const b = build(options);
    await b.audio.unlock();
    return b;
  };

  it('starts one source per mapped event and applies per-event levels', async () => {
    const { audio, ctx, advance } = await ready();
    audio.handleEvents([{ type: 'shot', weapon: 'rail' }]);
    advance(500);
    audio.handleEvents([{ type: 'splash', x: 1, y: 1 }]);
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources.every((s) => s.started && s.buffer)).toBe(true);
  });

  it('alternates pulse variants', async () => {
    const { audio, ctx, advance } = await ready();
    const buffers = [];
    ctx.decodeAudioData.mockClear();
    for (let i = 0; i < 4; i++) {
      audio.handleEvents([{ type: 'shot', weapon: 'pulse' }]);
      advance(300);
    }
    for (const s of ctx.sources) buffers.push(s.buffer);
    expect(new Set(buffers).size).toBe(2);
    expect(buffers[0]).not.toBe(buffers[1]);
    expect(buffers[0]).toBe(buffers[2]);
  });

  it('rate-limits a sound that is spammed within its minimum gap', async () => {
    const { audio, ctx, advance } = await ready();
    for (let i = 0; i < 20; i++) audio.handleEvents([{ type: 'kill' }]);
    expect(ctx.sources).toHaveLength(1);
    advance(500);
    audio.handleEvents([{ type: 'kill' }]);
    expect(ctx.sources).toHaveLength(2);
  });

  it('caps concurrent voices and frees them as they end', async () => {
    const { audio, ctx, advance } = await ready();
    const names = ['hit', 'explosion', 'splash', 'shield', 'rail', 'rocket', 'scatter-1', 'scatter-2', 'pulse-1', 'pulse-2'];
    for (const n of names) {
      audio.play(n);
      advance(1000);
    }
    expect(ctx.sources).toHaveLength(MAX_VOICES);
    ctx.sources[0].onended();
    audio.play('pulse-1');
    expect(ctx.sources).toHaveLength(MAX_VOICES + 1);
  });

  it('lets game-over through even when voices are saturated', async () => {
    const { audio, ctx, advance } = await ready();
    for (const n of ['hit', 'explosion', 'splash', 'shield', 'rail', 'rocket']) { audio.play(n); advance(1000); }
    expect(audio.play('over')).toBe(true);
    expect(ctx.sources).toHaveLength(MAX_VOICES + 1);
  });

  it('is silent while muted, stops live voices on mute, and never plays after destroy', async () => {
    const storage = memoryStorage();
    const { audio, ctx, advance } = await ready({ storage });
    audio.handleEvents([{ type: 'shot', weapon: 'rail' }]);
    audio.setMuted(true);
    expect(ctx.sources[0].stopped).toBe(true);
    expect(storage.data[SOUND_KEY]).toBe('off');
    advance(1000);
    audio.handleEvents([{ type: 'kill' }]);
    audio.switchCue(1);
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.oscillators).toHaveLength(0);
    audio.setMuted(false);
    expect(storage.data[SOUND_KEY]).toBe('on');
    expect(audio.play('kill')).toBe(false);
    expect(audio.play('hit')).toBe(true);
    audio.destroy();
    expect(ctx.closed).toBe(true);
    expect(audio.play('hit')).toBe(false);
    await expect(audio.unlock()).resolves.toBe(false);
  });

  it('starts muted from storage and does not resume the context while muted', async () => {
    const storage = memoryStorage({ [SOUND_KEY]: 'off' });
    const { audio, ctx } = build({ storage });
    expect(audio.muted).toBe(true);
    await audio.unlock();
    expect(audio.play('hit')).toBe(false);
    expect(ctx.state).not.toBe('closed');
  });

  it('suspends while inactive (paused or hidden) and resumes afterwards', async () => {
    const { audio, ctx, advance } = await ready();
    audio.setActive(false);
    await Promise.resolve();
    expect(ctx.state).toBe('suspended');
    advance(1000);
    expect(audio.play('hit')).toBe(false);
    audio.setActive(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx.state).toBe('running');
    expect(audio.play('hit')).toBe(true);
  });

  it('plays a short synthesized cue for weapon switches', async () => {
    const { audio, ctx } = await ready();
    audio.switchCue(2);
    expect(ctx.oscillators).toHaveLength(1);
  });
});
