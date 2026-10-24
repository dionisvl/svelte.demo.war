<script>
  import { WEAPONS, WEAPON_ORDER } from '$lib/game/weapons.js';

  let { weapon, cooldown = 0, ammo = {}, onselect } = $props();

  const accents = { pulse: 'var(--cyan)', scatter: 'var(--amber)', rail: '#b58cff', rocket: '#ff7a5c' };
  const active = $derived(WEAPONS[weapon]);
  const charge = $derived(Math.min(1, Math.max(0, 1 - cooldown / active.cooldown)));
</script>

<div class="arsenal" role="group" aria-label="Weapons">
  <div class="row">
    {#each WEAPON_ORDER as id, i (id)}
      {@const w = WEAPONS[id]}
      {@const left = id === 'pulse' ? Infinity : (ammo[id] ?? 0)}
      <button
        type="button"
        data-weapon={id}
        class:on={id === weapon}
        class:empty={left === 0}
        disabled={left === 0}
        aria-pressed={id === weapon}
        aria-label="{w.name}, key {i + 1}. {w.blurb}. Cooldown {w.cooldown} seconds. {left === Infinity
          ? 'Unlimited'
          : `${left} shots`}"
        title="{w.name} (key {i + 1}): {w.blurb}"
        style:--accent={accents[id]}
        style:--charge={id === weapon ? charge : 1}
        onclick={() => onselect(id)}
      >
        <span class="top"><kbd aria-hidden="true">{i + 1}</kbd><span class="name">{w.name}</span></span>
        <span class="cd" aria-hidden="true">{left === Infinity ? '∞' : left ? `×${left}` : 'drop'} · {w.cooldown}s</span>
        <span class="meter" aria-hidden="true"><i></i></span>
      </button>
    {/each}
  </div>
  <p class="blurb" aria-hidden="true"><b>{active.name}</b> {active.blurb} · shoot raiders for weapon drops</p>
</div>

<style>
  .arsenal {
    width: min(100%, 560px);
    margin: 0 auto;
    padding: 0.3rem 0.5rem 0;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }

  button {
    position: relative;
    display: grid;
    gap: 0.08rem;
    min-height: 2.7rem;
    padding: 0.28rem 0.3rem 0.4rem;
    text-align: left;
    background: rgb(16 28 74 / 0.6);
    border: 1px solid rgb(141 162 200 / 0.3);
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
  }

  button:not(:disabled):hover {
    border-color: var(--accent);
  }

  button:not(:disabled):active {
    transform: scale(0.97);
  }

  button.empty {
    cursor: not-allowed;
    opacity: 0.38;
    filter: grayscale(0.7);
  }

  button.on {
    background: color-mix(in srgb, var(--accent) 20%, rgb(6 12 34));
    border-color: var(--accent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 0 0 1px var(--accent);
  }

  .top {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  kbd {
    flex: none;
    padding: 0 0.3rem;
    font: 700 0.62rem/1.3 var(--mono);
    color: var(--ink);
    background: var(--accent);
    border-radius: 3px;
  }

  .name {
    overflow: hidden;
    font: 800 0.68rem var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cd {
    font: 600 0.58rem var(--mono);
    color: var(--muted);
  }

  .meter {
    position: absolute;
    inset: auto 0 0;
    height: 3px;
    background: rgb(255 255 255 / 0.08);
  }

  .meter i {
    display: block;
    height: 100%;
    background: var(--accent);
    transform: scaleX(var(--charge));
    transform-origin: left;
  }

  .blurb {
    margin: 0.3rem 0 0;
    overflow: hidden;
    font: 0.64rem var(--mono);
    letter-spacing: 0.06em;
    text-align: center;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--muted);
  }

  .blurb b {
    color: var(--text);
  }

  @media (max-width: 360px) {
    .row {
      gap: 0.2rem;
    }

    button {
      padding-inline: 0.18rem;
    }

    .top {
      gap: 0.12rem;
    }

    kbd {
      padding-inline: 0.18rem;
      font-size: 0.57rem;
    }

    .name {
      font-size: 0.55rem;
      letter-spacing: 0;
    }
  }

  @media (max-height: 640px) {
    .blurb {
      display: none;
    }

    button {
      min-height: 2.4rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
</style>
