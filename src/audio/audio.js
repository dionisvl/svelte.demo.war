import {
  SAMPLE_FILES, MASTER_VOLUME, MAX_VOICES, PRIORITY_VOICES, PRIORITY_FILES, SWITCH_CUE, PICKUP_CUE, soundForEvent,
} from './sounds.js';
import { loadSoundEnabled, saveSoundEnabled } from './preference.js';

export function createAudio({ AudioContextClass, fetchImpl, storage, baseUrl = '/audio/', now = () => performance.now() }) {
  let ctx = null;
  let master = null;
  let status = AudioContextClass ? 'locked' : 'unsupported';
  let muted = !loadSoundEnabled(storage);
  let active = true;
  let destroyed = false;
  let loading = null;
  const buffers = new Map();
  const voices = new Set();
  const lastPlayed = new Map();
  const variant = new Map();

  function ensureContext() {
    if (ctx && ctx.state !== 'closed') return ctx;
    try {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
      status = 'unsupported';
    }
    return ctx;
  }

  async function loadSample(name) {
    try {
      const res = await fetchImpl(`${baseUrl}${name}.mp3`);
      if (!res?.ok) return;
      buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
    } catch {
      /* a missing or undecodable sample just stays silent */
    }
  }

  function preload() {
    loading ??= Promise.all(SAMPLE_FILES.map(loadSample));
    return loading;
  }

  async function unlock() {
    if (destroyed || !AudioContextClass || status === 'unsupported') return false;
    if (!ensureContext()) return false;
    try {
      if (ctx.state !== 'running') await ctx.resume();
    } catch {
      status = 'locked';
      return false;
    }
    if (destroyed || ctx?.state !== 'running') {
      status = 'locked';
      return false;
    }
    status = 'ready';
    if (!active) await suspendContext();
    await preload();
    return true;
  }

  async function suspendContext() {
    try {
      if (ctx && ctx.state === 'running') await ctx.suspend();
    } catch {
      /* already suspended or closed */
    }
  }

  function canPlay() {
    return !destroyed && !muted && active && status === 'ready' && ctx?.state === 'running';
  }

  function gapOk(key, seconds) {
    const t = now();
    const last = lastPlayed.get(key);
    if (last !== undefined && t - last < seconds * 1000) return false;
    lastPlayed.set(key, t);
    return true;
  }

  function track(node, onDone) {
    voices.add(node);
    node.onended = () => {
      voices.delete(node);
      node.disconnect?.();
      onDone?.();
    };
  }

  function play(name, { level = 0.6, gap = 0.05, group = name } = {}) {
    if (!canPlay()) return false;
    const buffer = buffers.get(name);
    if (!buffer) return false;
    const limit = MAX_VOICES + (PRIORITY_FILES.includes(name) ? PRIORITY_VOICES : 0);
    if (voices.size >= limit || !gapOk(group, gap)) return false;
    try {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = level;
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(master);
      track(src, () => gain.disconnect?.());
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  function handleEvents(events) {
    for (const event of events) {
      const sound = soundForEvent(event);
      if (!sound) continue;
      const turn = variant.get(sound.group) ?? 0;
      variant.set(sound.group, turn + 1);
      play(sound.files[turn % sound.files.length], sound);
    }
  }

  function tone(frequency, at, { seconds, level }, type = 'square') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
    osc.connect(gain);
    gain.connect(master);
    track(osc, () => gain.disconnect?.());
    osc.start(at);
    osc.stop(at + seconds);
  }

  function switchCue(index = 0) {
    if (!canPlay() || !gapOk('switch', SWITCH_CUE.gap)) return;
    try {
      tone(SWITCH_CUE.base + SWITCH_CUE.step * index, ctx.currentTime, SWITCH_CUE);
    } catch {
      /* the cue is optional */
    }
  }

  function pickupCue() {
    if (!canPlay() || !gapOk('pickup', PICKUP_CUE.gap)) return;
    try {
      PICKUP_CUE.notes.forEach((f, i) => tone(f, ctx.currentTime + i * PICKUP_CUE.spacing, PICKUP_CUE, 'triangle'));
    } catch {
      /* the cue is optional */
    }
  }

  function stopVoices() {
    for (const node of voices) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    voices.clear();
  }

  function setMuted(value) {
    muted = Boolean(value);
    saveSoundEnabled(storage, !muted);
    if (muted) stopVoices();
    else if (ctx && active && status === 'ready' && ctx.state !== 'running') ctx.resume?.().catch?.(() => {});
  }

  function setActive(value) {
    active = Boolean(value);
    if (!ctx || status !== 'ready') return;
    if (!active) {
      stopVoices();
      suspendContext();
    } else if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        status = 'locked';
      });
    }
  }

  function destroy() {
    destroyed = true;
    stopVoices();
    const closing = ctx;
    ctx = null;
    master = null;
    closing?.close?.().catch?.(() => {});
  }

  return {
    unlock,
    play,
    handleEvents,
    switchCue,
    pickupCue,
    setMuted,
    setActive,
    destroy,
    get muted() { return muted; },
    get status() { return status; },
    get supported() { return status !== 'unsupported'; },
    get ctx() { return ctx; },
  };
}
