<script>
  import { WORLD } from '../game/config.js';

  let { game, shaking = false, onshakeend, svg = $bindable(null) } = $props();

  const cfg = $derived(game.config);
  const p = (e) => Math.min(1, e.age / e.ttl);
  const sparks = [0, 1, 2, 3, 4, 5, 6, 7];
</script>

<svg
  bind:this={svg}
  class="field"
  class:shake={shaking}
  viewBox="0 0 {WORLD.width} {WORLD.height}"
  preserveAspectRatio="xMidYMid meet"
  role="img"
  aria-label="Playfield: defend the orbital line from descending raiders"
  onanimationend={onshakeend}
>
  <defs>
    <linearGradient id="g-hull" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8fbff" />
      <stop offset="0.5" stop-color="#3be8ff" />
      <stop offset="1" stop-color="#157a99" />
    </linearGradient>
    <linearGradient id="g-raider" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd27a" />
      <stop offset="0.6" stop-color="#ff8a2e" />
      <stop offset="1" stop-color="#b3331d" />
    </linearGradient>
    <linearGradient id="g-heavy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff9a8a" />
      <stop offset="0.6" stop-color="#ff5a3c" />
      <stop offset="1" stop-color="#6b1530" />
    </linearGradient>
    <linearGradient id="g-bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" />
      <stop offset="1" stop-color="#3be8ff" stop-opacity="0.1" />
    </linearGradient>
    <linearGradient id="g-line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffb02e" stop-opacity="0" />
      <stop offset="0.5" stop-color="#ffb02e" />
      <stop offset="1" stop-color="#ffb02e" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="g-rail" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9b5cff" stop-opacity="0" />
      <stop offset="0.3" stop-color="#9b5cff" stop-opacity="0.85" />
      <stop offset="0.5" stop-color="#ffffff" />
      <stop offset="0.7" stop-color="#3be8ff" stop-opacity="0.85" />
      <stop offset="1" stop-color="#3be8ff" stop-opacity="0" />
    </linearGradient>
    <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
  </defs>

  <rect x="0.5" y="0.5" width={WORLD.width - 1} height={WORLD.height - 1} rx="10" class="frame" />

  <g class="line" class:danger={game.shields === 1}>
    <rect x="0" y={cfg.defenseY - 1} width={WORLD.width} height="2" fill="url(#g-line)" />
    <rect x="0" y={cfg.defenseY} width={WORLD.width} height={WORLD.height - cfg.defenseY} class="zone" />
    <text x={WORLD.width / 2} y={cfg.defenseY + 24} class="tag">DEFENSE LINE</text>
  </g>

  {#each game.enemies as e (e.id)}
    <g transform="translate({e.x} {e.y}) scale({e.r / 20})">
      {#if e.kind === 'heavy'}
        <g class="heavy" class:hurt={e.hp < e.maxHp}>
          <path d="M0 26 L24 8 L22 -16 L8 -22 L0 -14 L-8 -22 L-22 -16 L-24 8Z" fill="url(#g-heavy)" stroke="#ffd0c4" stroke-width="1.2" />
          <path d="M0 14 L12 4 L10 -8 L0 -4 L-10 -8 L-12 4Z" fill="#240a1c" />
          <circle cx="0" cy="2" r="4" fill="#ffb02e" />
          {#if e.hp < e.maxHp}
            <path d="M-6 -16 L-1 -6 L-8 2 L-2 12" stroke="#fff" stroke-width="1.5" fill="none" />
          {/if}
        </g>
      {:else}
        <path d="M0 20 L18 -10 L8 -15 L0 -7 L-8 -15 L-18 -10Z" fill="url(#g-raider)" stroke="#ffe3b0" stroke-width="1" />
        <path d="M0 10 L5 -4 L0 -2 L-5 -4Z" fill="#2a0d12" />
        <circle cx="0" cy="-1" r="2.2" fill="#fff" />
      {/if}
    </g>
  {/each}

  {#each game.beams as beam (beam.id)}
    {@const t = Math.min(1, beam.age / beam.ttl)}
    {@const half = beam.halfWidth * (1.6 - 0.9 * t)}
    <g opacity={(1 - t) ** 1.5} pointer-events="none">
      <rect x={beam.x - half * 2.2} y="0" width={half * 4.4} height={cfg.playerY - cfg.playerRadius} fill="#9b5cff" opacity="0.35" filter="url(#f-glow)" />
      <rect x={beam.x - half} y="0" width={half * 2} height={cfg.playerY - cfg.playerRadius} fill="url(#g-rail)" />
      <rect x={beam.x - 1.2} y="0" width="2.4" height={cfg.playerY - cfg.playerRadius} fill="#fff" />
    </g>
  {/each}

  {#each game.bullets as b (b.id)}
    {#if b.weapon === 'scatter'}
      <g transform="translate({b.x} {b.y}) rotate({(Math.atan2(b.vx, -b.vy) * 180) / Math.PI})">
        <rect x="-4" y="-8" width="8" height="18" rx="4" fill="#ffb02e" opacity="0.4" filter="url(#f-glow)" />
        <rect x="-2" y="-7" width="4" height="14" rx="2" fill="#ffe3a8" />
      </g>
    {:else if b.weapon === 'rocket'}
      <g transform="translate({b.x} {b.y}) rotate({(Math.atan2(b.vx, -b.vy) * 180) / Math.PI})">
        <path d="M-3 8 L0 46 L3 8Z" fill="#ff7a3c" opacity="0.55" filter="url(#f-glow)" />
        <path d="M-2 8 L0 28 L2 8Z" fill="#fff6d6" />
        <path d="M0 -14 L5 -6 L5 9 L-5 9 L-5 -6Z" fill="#e8f4ff" stroke="#ff5a3c" stroke-width="1.2" stroke-linejoin="round" />
        <path d="M-5 9 L-9 15 L-5 13ZM5 9 L9 15 L5 13Z" fill="#ff5a3c" />
      </g>
    {:else}
      <g>
        <rect x={b.x - 4} y={b.y - 8} width="8" height="22" rx="4" fill="#3be8ff" opacity="0.35" filter="url(#f-glow)" />
        <rect x={b.x - 1.8} y={b.y - 10} width="3.6" height="20" rx="1.8" fill="url(#g-bolt)" />
      </g>
    {/if}
  {/each}

  {#each game.explosions as x (x.id)}
    {@const t = p(x)}
    {#if x.kind === 'blast'}
      <g transform="translate({x.x} {x.y})" opacity={(1 - t) ** 1.2} pointer-events="none">
        <circle r={x.radius * (0.25 + 0.75 * Math.sqrt(t))} fill="#ff7a3c" opacity="0.22" />
        <circle r={x.radius * (0.25 + 0.75 * Math.sqrt(t))} fill="none" stroke="#ffb02e" stroke-width={5 * (1 - t) + 1} />
        <circle r={(1 - t) * 30} fill="#fff" />
        <circle r={(1 - t) * x.radius * 0.6} fill="#ff5a3c" opacity="0.5" />
      </g>
    {:else}
    {@const s = x.kind === 'heavy' ? 1.5 : 1}
    {@const hot = x.kind === 'leak' ? '#ff5a3c' : '#ffb02e'}
    <g transform="translate({x.x} {x.y})" opacity={1 - t} pointer-events="none">
      <circle r={(6 + 46 * t) * s} fill="none" stroke={hot} stroke-width={4 * (1 - t) + 0.5} />
      <circle r={(1 - t) * 16 * s} fill="#fff" />
      <circle r={(1 - t) * 26 * s} fill={hot} opacity="0.45" />
      {#each sparks as i (i)}
        {@const a = (i / sparks.length) * Math.PI * 2 + (x.id % 7) * 0.2}
        <line
          x1={Math.cos(a) * (10 + 30 * t) * s}
          y1={Math.sin(a) * (10 + 30 * t) * s}
          x2={Math.cos(a) * (18 + 50 * t) * s}
          y2={Math.sin(a) * (18 + 50 * t) * s}
          stroke={i % 2 ? '#3be8ff' : '#fff'}
          stroke-width="2"
          stroke-linecap="round"
        />
      {/each}
    </g>
    {/if}
  {/each}

  <g transform="translate({game.player.x} {cfg.playerY})" class:over={game.phase === 'over'}>
    <path class="flame" d="M-7 18 L0 44 L7 18Z" fill="#ffb02e" />
    <path class="flame inner" d="M-3.5 18 L0 34 L3.5 18Z" fill="#fff6d6" />
    <path d="M0 -26 L8 -6 L22 14 L22 22 L9 16 L0 24 L-9 16 L-22 22 L-22 14 L-8 -6Z" fill="url(#g-hull)" stroke="#e9feff" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M0 -14 L4 0 L0 6 L-4 0Z" fill="#06142b" />
    <path d="M-22 14 L-14 12 M22 14 L14 12" stroke="#ffb02e" stroke-width="2.5" stroke-linecap="round" />
  </g>
</svg>

<style>
  .field {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    cursor: crosshair;
  }

  .frame {
    fill: rgb(4 8 20 / 0.45);
    stroke: rgb(59 232 255 / 0.35);
    stroke-width: 1;
  }

  .zone {
    fill: rgb(255 176 46 / 0.07);
  }

  .tag {
    fill: rgb(255 176 46 / 0.55);
    font: 700 10px var(--mono);
    letter-spacing: 0.4em;
    text-anchor: middle;
  }

  .danger .tag {
    fill: var(--danger);
    animation: blink 0.8s steps(2) infinite;
  }

  .heavy.hurt {
    filter: brightness(1.25);
  }

  .flame {
    transform-box: fill-box;
    transform-origin: top center;
    animation: flicker 0.12s linear infinite alternate;
  }

  .flame.inner {
    animation-duration: 0.09s;
  }

  .over {
    opacity: 0.25;
  }

  .shake {
    animation: shake 0.35s linear;
  }

  @keyframes flicker {
    from {
      transform: scaleY(0.7);
    }
    to {
      transform: scaleY(1.15);
    }
  }

  @keyframes blink {
    50% {
      opacity: 0.25;
    }
  }

  @keyframes shake {
    20% {
      transform: translate(-5px, 2px);
    }
    40% {
      transform: translate(4px, -3px);
    }
    60% {
      transform: translate(-3px, 3px);
    }
    80% {
      transform: translate(2px, -1px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flame,
    .danger .tag,
    .shake {
      animation: none;
    }
  }
</style>
