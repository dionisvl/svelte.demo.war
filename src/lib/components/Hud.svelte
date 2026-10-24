<script>
  let { game, best, onpause, paused, soundOn = true, soundSupported = true, onsound = () => {} } = $props();

  const pips = $derived(Array.from({ length: game.config.shields }, (_, i) => i < game.shields));
</script>

<header class="hud">
  <div class="stat score">
    <span class="label">Score</span>
    <strong class="value">{String(game.score).padStart(6, '0')}</strong>
  </div>

  <div class="stat wave">
    <span class="label">Wave</span>
    <strong class="value">{String(game.level).padStart(2, '0')}</strong>
  </div>

  <div class="stat best">
    <span class="label">Best</span>
    <strong class="value">{String(best).padStart(6, '0')}</strong>
  </div>

  <div class="stat shields" role="img" aria-label="Shields {game.shields} of {game.config.shields}">
    <span class="label" aria-hidden="true">Shields</span>
    <span class="pips" aria-hidden="true">
      {#each pips as on, i (i)}<i class:on></i>{/each}
    </span>
  </div>

  <div class="tools">
    <button
      class="tool"
      type="button"
      data-sound-toggle
      onclick={onsound}
      disabled={!soundSupported}
      aria-pressed={soundSupported && soundOn}
      aria-label={soundSupported ? 'Sound' : 'Sound unavailable'}
      title={soundSupported ? (soundOn ? 'Sound on' : 'Sound off') : 'Sound unavailable in this browser'}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {#if soundSupported && soundOn}
          <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        {:else}
          <path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        {/if}
      </svg>
    </button>
    <button class="tool" type="button" onclick={onpause} aria-label={paused ? 'Resume game' : 'Pause game'}>
      {#if paused}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4 20 12 7 20Z" fill="currentColor" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" /></svg>
      {/if}
    </button>
  </div>

  <div class="combo" class:live={game.combo >= 2} aria-hidden={game.combo < 2}>
    <span>Combo {game.combo}</span>
    <b>&times;{game.multiplier}</b>
  </div>
</header>

<style>
  .hud {
    position: relative;
    display: grid;
    grid-template-columns: 1.4fr 0.7fr 1fr 1fr auto;
    align-items: end;
    gap: 0.5rem 0.9rem;
    width: min(100%, 560px);
    margin: 0 auto;
    padding: max(0.6rem, env(safe-area-inset-top)) 0.9rem 0.4rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .label {
    font-size: 0.62rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .value {
    font: 700 1.5rem/1.1 var(--mono);
    color: var(--cyan);
    text-shadow: 0 0 14px rgb(59 232 255 / 0.55);
    font-variant-numeric: tabular-nums;
  }

  .wave .value {
    color: var(--amber);
    text-shadow: 0 0 14px rgb(255 176 46 / 0.5);
  }

  .best .value {
    color: var(--text);
    font-size: 1.05rem;
    text-shadow: none;
  }

  .pips {
    display: flex;
    gap: 0.28rem;
    height: 1.5rem;
    align-items: center;
  }

  .pips i {
    width: 0.9rem;
    height: 0.9rem;
    transform: skewX(-18deg);
    border: 1.5px solid var(--cyan-dim);
    background: transparent;
    transition: background 0.2s, box-shadow 0.2s;
  }

  .pips i.on {
    background: var(--cyan);
    border-color: var(--cyan);
    box-shadow: 0 0 10px rgb(59 232 255 / 0.7);
  }

  .tools {
    display: flex;
    gap: 0.35rem;
  }

  .tool {
    width: 2.4rem;
    height: 2.4rem;
    display: grid;
    place-items: center;
    background: rgb(16 28 74 / 0.7);
    border: 1px solid rgb(59 232 255 / 0.4);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
  }

  .tool:hover:not(:disabled) {
    background: rgb(59 232 255 / 0.2);
    border-color: var(--cyan);
  }

  .tool:active:not(:disabled) {
    transform: scale(0.94);
  }

  .tool:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .tool[aria-pressed='false'] {
    color: var(--muted);
    border-color: rgb(141 162 200 / 0.35);
  }

  .combo {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    height: 1.1rem;
    padding: 0 0.5rem;
    font: 700 0.7rem/1 var(--mono);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--amber);
    background: linear-gradient(90deg, rgb(255 176 46 / 0.2), transparent);
    border-left: 2px solid var(--amber);
    opacity: 0;
    transform: translateX(-8px);
    transition: opacity 0.2s, transform 0.2s;
  }

  .combo.live {
    opacity: 1;
    transform: none;
  }

  .combo b {
    font-size: 0.95rem;
  }

  @media (max-width: 420px) {
    .hud {
      grid-template-columns: 1.3fr 0.6fr 1fr auto;
      gap: 0.4rem 0.6rem;
    }

    .best {
      display: none;
    }

    .value {
      font-size: 1.25rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .combo,
    .pips i,
    .tool {
      transition: none;
    }
  }
</style>
