<script>
  let { mode, game, best, record, onstart, onresume, onrestart } = $props();

  function autofocus(node) {
    node.focus({ preventScroll: true });
  }

  const keys = [
    ['← →', 'A D', 'Move'],
    ['Space', '', 'Fire'],
    ['1–4', '', 'Weapon'],
    ['P', 'Esc', 'Pause'],
  ];
</script>

<div class="overlay" class:over={mode === 'over'} role="dialog" aria-modal="true" aria-labelledby="ov-title">
  <div class="panel">
    {#if mode === 'ready'}
      <div class="art" aria-hidden="true"></div>
      <p class="kicker">Orbital defense</p>
      <h1 id="ov-title">Sveltewar</h1>
      <p class="lede">Raiders are dropping on the line. Hold it.</p>
    {:else if mode === 'paused'}
      <p class="kicker">Standing by</p>
      <h1 id="ov-title">Paused</h1>
    {:else}
      <p class="kicker warn">Defense breached</p>
      <h1 id="ov-title">Game over</h1>
      <dl class="result">
        <div><dt>Score</dt><dd>{game.score}</dd></div>
        <div><dt>Wave</dt><dd>{game.level}</dd></div>
        <div><dt>Best combo</dt><dd>{game.bestCombo}</dd></div>
      </dl>
      {#if record}<p class="record">New high score</p>{/if}
    {/if}

    {#if mode !== 'paused'}
      <p class="best">High score <b>{best}</b></p>
    {/if}

    <div class="actions">
      {#if mode === 'ready'}
        <button class="primary" type="button" use:autofocus onclick={onstart}>Launch</button>
      {:else if mode === 'paused'}
        <button class="primary" type="button" use:autofocus onclick={onresume}>Resume</button>
        <button class="ghost" type="button" onclick={onrestart}>Restart</button>
      {:else}
        <button class="primary" type="button" use:autofocus onclick={onrestart}>Redeploy</button>
      {/if}
    </div>

    <ul class="legend" aria-label="Controls">
      {#each keys as [a, b, label] (label)}
        <li><kbd>{a}</kbd>{#if b}<kbd>{b}</kbd>{/if}<span>{label}</span></li>
      {/each}
      <li class="touch"><kbd>Drag</kbd><span>Steer &amp; fire</span></li>
    </ul>
  </div>
</div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: radial-gradient(circle at 50% 40%, rgb(4 8 20 / 0.55), rgb(4 8 20 / 0.9));
    backdrop-filter: blur(3px);
    animation: fade 0.3s ease-out;
  }

  .panel {
    position: relative;
    width: min(100%, 22rem);
    max-height: 100%;
    overflow: hidden;
    padding: 1.4rem 1.3rem 1.1rem;
    text-align: center;
    background: linear-gradient(180deg, rgb(16 28 74 / 0.85), rgb(6 12 34 / 0.92));
    border: 1px solid rgb(59 232 255 / 0.45);
    clip-path: polygon(0 12px, 12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
    box-shadow: 0 0 40px rgb(59 232 255 / 0.15);
  }

  .art {
    height: 9rem;
    margin: -1.4rem -1.3rem 0.9rem;
    background:
      linear-gradient(to bottom, transparent 40%, rgb(8 16 44 / 0.95)),
      linear-gradient(90deg, rgb(4 8 20 / 0.5), transparent 30%, transparent 70%, rgb(4 8 20 / 0.5)),
      url('/assets/screen.webp') 50% 37% / 320% auto no-repeat;
    filter: saturate(0.85) contrast(1.05);
    opacity: 0.85;
  }

  .kicker {
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--cyan);
  }

  .kicker.warn {
    color: var(--danger);
  }

  h1 {
    margin: 0.2rem 0 0.4rem;
    font: 800 clamp(2rem, 10vw, 2.55rem) / 1 var(--display);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
    text-shadow: 0 0 24px rgb(59 232 255 / 0.5);
  }

  .over h1 {
    text-shadow: 0 0 24px rgb(255 90 60 / 0.55);
  }

  .lede {
    margin: 0 0 0.6rem;
    color: var(--muted);
    font-size: 0.95rem;
  }

  .best {
    margin: 0.5rem 0 0;
    font: 0.8rem var(--mono);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .best b {
    color: var(--amber);
    font-size: 1rem;
  }

  .result {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin: 0.8rem 0 0;
  }

  .result div {
    padding: 0.4rem 0;
    border-top: 1px solid rgb(59 232 255 / 0.3);
  }

  dt {
    font-size: 0.58rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }

  dd {
    margin: 0.15rem 0 0;
    font: 700 1.35rem var(--mono);
    color: var(--cyan);
  }

  .record {
    margin: 0.7rem 0 0;
    padding: 0.3rem 0;
    font: 700 0.8rem var(--mono);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--ink);
    background: var(--amber);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0 0.9rem;
  }

  button {
    min-height: 2.9rem;
    padding: 0.6rem 1rem;
    font: 800 1rem var(--display);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 0;
    transition: transform 0.12s, box-shadow 0.15s, background 0.15s;
  }

  .primary {
    color: var(--ink);
    background: linear-gradient(180deg, #8bf4ff, var(--cyan));
    border: 0;
    box-shadow: 0 0 22px rgb(59 232 255 / 0.4);
    clip-path: polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  }

  .primary:hover {
    box-shadow: 0 0 34px rgb(59 232 255 / 0.75);
    transform: translateY(-1px);
  }

  .ghost {
    background: transparent;
    border: 1px solid var(--cyan-dim);
    color: var(--text);
  }

  .ghost:hover {
    background: rgb(59 232 255 / 0.12);
    border-color: var(--cyan);
  }

  button:active {
    transform: scale(0.98);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem 0.9rem;
    margin: 0;
    padding: 0.7rem 0 0;
    list-style: none;
    border-top: 1px solid rgb(141 162 200 / 0.2);
    font-size: 0.72rem;
    color: var(--muted);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  kbd {
    padding: 0.1rem 0.4rem;
    font: 700 0.68rem var(--mono);
    color: var(--text);
    background: rgb(59 232 255 / 0.1);
    border: 1px solid rgb(59 232 255 / 0.35);
    border-radius: 3px;
  }

  .legend span {
    margin-left: 0.15rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .touch {
    display: none;
  }

  @media (pointer: coarse) {
    .touch {
      display: flex;
    }
  }

  @media (max-height: 640px) {
    .art {
      display: none;
    }

    .panel {
      padding-top: 1rem;
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes pulse {
    50% {
      opacity: 0.7;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .record {
      animation: none;
    }

    button {
      transition: none;
    }
  }
</style>
