<script>
  import { onMount } from 'svelte';
  import Backdrop from './components/Backdrop.svelte';
  import Playfield from './components/Playfield.svelte';
  import Hud from './components/Hud.svelte';
  import Overlay from './components/Overlay.svelte';
  import Pad from './components/Pad.svelte';
  import Arsenal from './components/Arsenal.svelte';
  import { createGame, startGame, pauseGame, resumeGame, restartGame, selectWeapon, step } from './game/engine.js';
  import { WEAPONS, WEAPON_ORDER, weaponForKey } from './game/weapons.js';
  import { createAudio } from './audio/audio.js';
  import { MAX_DT, WORLD } from './game/config.js';
  import { createLoop } from './game/loop.js';
  import { createInput, applyKey, keyAction, releaseAll, toWorldX } from './game/input.js';
  import { loadHighScore, saveHighScore } from './game/highScore.js';

  function safeStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  const storage = safeStorage();
  const audio = createAudio({
    AudioContextClass: window.AudioContext ?? window.webkitAudioContext,
    fetchImpl: (url) => fetch(url),
    storage,
    baseUrl: `${import.meta.env.BASE_URL}audio/`,
  });

  let game = $state.raw(createGame());
  let best = $state(loadHighScore(storage));
  let record = $state(false);
  let shaking = $state(false);
  let banner = $state.raw(null);
  let svg = $state(null);
  let status = $state('');
  let soundOn = $state(!audio.muted);
  let soundSupported = $state(audio.supported);

  let keys = createInput();
  let pad = { left: false, right: false, fire: false };
  let pointer = { id: null, x: null };
  let overAt = 0;

  const bannerText = $derived(banner && game.time < banner.until ? banner.text : '');
  const bannerKey = $derived(banner ? `${banner.text}@${banner.until}` : '');

  function merged() {
    return {
      left: keys.left || pad.left,
      right: keys.right || pad.right,
      fire: keys.fire || pad.fire || pointer.id !== null,
      targetX: pointer.id !== null ? pointer.x : null,
    };
  }

  function unlockAudio() {
    audio.unlock().then(() => {
      soundSupported = audio.supported;
    });
  }

  function tick(dt) {
    const next = step(game, merged(), dt);
    audio.handleEvents(next.events);
    for (const e of next.events) {
      if (e.type === 'leak' || e.type === 'ram') shaking = true;
      if (e.type === 'level') banner = { text: `Wave ${e.level}`, until: next.time + 1.6 };
      if (e.type === 'pickup') {
        const label = e.kind === 'shield' ? 'Shield +1' : `${WEAPONS[e.kind].name} ×${e.amount}`;
        banner = { text: label, until: next.time + 1.2, kind: e.kind };
        status = `${label} picked up.`;
        audio.pickupCue();
      }
      if (e.type === 'empty') status = `${WEAPONS[e.weapon].name} empty, back to Pulse.`;
      if (e.type === 'over') finish(next.score);
    }
    game = next;
    if (next.phase !== 'playing') loop.stop();
  }

  function finish(score) {
    overAt = performance.now();
    record = score > best;
    best = saveHighScore(storage, score);
    status = `Game over. Score ${score}.`;
  }

  const loop = createLoop({
    update: tick,
    raf: (cb) => requestAnimationFrame(cb),
    caf: (h) => cancelAnimationFrame(h),
    maxDt: MAX_DT,
  });

  function clearInput() {
    keys = releaseAll();
    pad = { left: false, right: false, fire: false };
    pointer = { id: null, x: null };
  }

  function start() {
    unlockAudio();
    audio.setActive(true);
    clearInput();
    record = false;
    banner = null;
    game = game.phase === 'ready' ? startGame(game) : restartGame(game);
    status = 'Game started.';
    loop.start();
  }

  function pause() {
    if (game.phase !== 'playing') return;
    loop.stop();
    clearInput();
    audio.setActive(false);
    game = pauseGame(game);
    status = 'Paused.';
  }

  function resume() {
    if (game.phase !== 'paused') return;
    unlockAudio();
    audio.setActive(true);
    clearInput();
    game = resumeGame(game);
    status = 'Resumed.';
    loop.start();
  }

  function togglePause() {
    if (game.phase === 'playing') pause();
    else resume();
  }

  function chooseWeapon(id) {
    unlockAudio();
    const next = selectWeapon(game, id);
    if (next === game) return;
    game = next;
    audio.switchCue(WEAPON_ORDER.indexOf(id));
    status = `${WEAPONS[id].name} selected.`;
  }

  function toggleSound() {
    audio.setMuted(soundOn);
    soundOn = !audio.muted;
    status = soundOn ? 'Sound on.' : 'Sound off.';
    unlockAudio();
  }

  function onkeydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const weaponKey = weaponForKey(e.code);
    if (weaponKey) {
      e.preventDefault();
      if (!e.repeat) chooseWeapon(weaponKey);
      return;
    }
    const action = keyAction(e.code);
    if (!action) return;
    const onButton = e.target instanceof HTMLElement && e.target.closest('button');
    if (game.phase !== 'playing' && onButton && (e.code === 'Space' || e.code === 'Enter')) return;
    e.preventDefault();
    if (e.repeat) return;
    if (action === 'pause') {
      if (game.phase === 'playing' || game.phase === 'paused') togglePause();
    } else if (game.phase === 'playing') {
      keys = applyKey(keys, e.code, true);
    } else if (action === 'fire') {
      if (game.phase === 'ready' || (game.phase === 'over' && performance.now() - overAt > 800)) start();
      else if (game.phase === 'paused') resume();
    }
  }

  function onkeyup(e) {
    keys = applyKey(keys, e.code, false);
  }

  function worldX(e) {
    return svg ? toWorldX(e.clientX, svg.getBoundingClientRect()) : null;
  }

  function onpointerdown(e) {
    unlockAudio();
    if (game.phase !== 'playing' || pointer.id !== null || e.button > 0) return;
    e.preventDefault();
    pointer = { id: e.pointerId, x: worldX(e) };
    svg?.setPointerCapture?.(e.pointerId);
  }

  function onpointermove(e) {
    if (e.pointerId === pointer.id) pointer = { id: pointer.id, x: worldX(e) };
  }

  function onpointerend(e) {
    if (e.pointerId === pointer.id) pointer = { id: null, x: null };
  }

  function onpad(name, down) {
    pad = { ...pad, [name]: down && game.phase === 'playing' };
  }

  function onvisibility() {
    if (document.hidden) {
      pause();
      audio.setActive(false);
    } else if (game.phase !== 'paused') {
      audio.setActive(true);
    }
  }

  onMount(() => {
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onvisibility);
    return () => {
      loop.destroy();
      audio.destroy();
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onvisibility);
    };
  });
</script>

<svelte:window {onkeydown} {onkeyup} />

<Backdrop shift={(game.player.x - WORLD.width / 2) / (WORLD.width / 2)} />

<main class="cabinet" aria-label="Sveltewar">
  <Hud
    {game}
    {best}
    paused={game.phase === 'paused'}
    onpause={togglePause}
    {soundOn}
    {soundSupported}
    onsound={toggleSound}
  />

  <div
    class="stage"
    role="group"
    aria-label="Game area"
    onpointerdown={onpointerdown}
    onpointermove={onpointermove}
    onpointerup={onpointerend}
    onpointercancel={onpointerend}
    onlostpointercapture={onpointerend}
  >
    <Playfield {game} {shaking} bind:svg onshakeend={() => (shaking = false)} />

    {#if bannerText}
      {#key bannerKey}
        <div class="banner" class:loot={banner.kind} aria-hidden="true">{bannerText}</div>
      {/key}
    {/if}

    {#if game.phase !== 'playing'}
      <Overlay
        mode={game.phase}
        {game}
        {best}
        {record}
        onstart={start}
        onresume={resume}
        onrestart={start}
      />
    {/if}
  </div>

  <Arsenal weapon={game.weapon} cooldown={game.player.cooldown} ammo={game.ammo} onselect={chooseWeapon} />
  <Pad {onpad} />
  <p class="sr-only" role="status" aria-live="polite">{status}</p>
</main>

<style>
  .cabinet {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    padding: 0 0.5rem;
    touch-action: none;
  }

  .banner {
    position: absolute;
    inset: 22% 0 auto;
    text-align: center;
    font: 800 2rem var(--display);
    letter-spacing: 0.5em;
    text-indent: 0.5em;
    text-transform: uppercase;
    color: var(--amber);
    text-shadow: 0 0 20px rgb(255 176 46 / 0.7);
    pointer-events: none;
    animation: rise 1.6s ease-out forwards;
  }

  .banner.loot {
    inset: 34% 0 auto;
    font-size: 1.4rem;
    letter-spacing: 0.3em;
    text-indent: 0.3em;
    color: var(--cyan);
    text-shadow: 0 0 18px rgb(59 232 255 / 0.75);
    animation-duration: 1.2s;
  }

  @keyframes rise {
    0% {
      opacity: 0;
      transform: translateY(12px);
    }
    15%,
    70% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .banner {
      animation: none;
    }
  }
</style>
