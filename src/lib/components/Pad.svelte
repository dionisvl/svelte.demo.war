<script>
  let { onpad } = $props();

  function hold(node, name) {
    let active = null;
    const end = () => {
      if (active === null) return;
      active = null;
      node.classList.remove('down');
      onpad(name, false);
    };
    const down = (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      active = e.pointerId;
      node.setPointerCapture?.(e.pointerId);
      node.classList.add('down');
      onpad(name, true);
    };
    const up = (e) => {
      if (e.pointerId === active) end();
    };
    const block = (e) => e.preventDefault();
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('lostpointercapture', up);
    node.addEventListener('pointerleave', up);
    node.addEventListener('contextmenu', block);
    return {
      destroy() {
        end();
        node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        node.removeEventListener('lostpointercapture', up);
        node.removeEventListener('pointerleave', up);
        node.removeEventListener('contextmenu', block);
      },
    };
  }
</script>

<div class="pad">
  <button type="button" class="dir" aria-label="Move left" use:hold={'left'}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg>
  </button>
  <button type="button" class="fire" aria-label="Fire" use:hold={'fire'}>Fire</button>
  <button type="button" class="dir" aria-label="Move right" use:hold={'right'}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 8 8-8 8" /></svg>
  </button>
</div>

<style>
  .pad {
    display: none;
    grid-template-columns: 1fr 1.6fr 1fr;
    gap: 0.6rem;
    width: min(100%, 460px);
    margin: 0 auto;
    padding: 0.4rem 0.9rem max(0.8rem, env(safe-area-inset-bottom));
  }

  @media (pointer: coarse) {
    .pad {
      display: grid;
    }
  }

  button {
    min-height: 3.6rem;
    display: grid;
    place-items: center;
    background: rgb(16 28 74 / 0.75);
    border: 1px solid rgb(59 232 255 / 0.4);
    border-radius: 14px;
    cursor: pointer;
    touch-action: none;
    transition: background 0.1s, transform 0.1s;
  }

  button:hover {
    border-color: var(--cyan);
  }

  button:global(.down) {
    background: rgb(59 232 255 / 0.3);
    transform: scale(0.97);
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
    fill: none;
    stroke: var(--cyan);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .fire {
    font: 800 1.05rem var(--display);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--amber);
    border-color: rgb(255 176 46 / 0.55);
  }

  .fire:global(.down) {
    background: rgb(255 176 46 / 0.3);
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
</style>
