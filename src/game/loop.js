export function createLoop({ update, raf, caf, maxDt = 0.05 }) {
  let handle = null;
  let last = null;
  let destroyed = false;

  function frame(t) {
    handle = null;
    const dt = last === null ? 0 : Math.min(maxDt, Math.max(0, (t - last) / 1000));
    last = t;
    try {
      update(dt);
    } catch (error) {
      running = false;
      last = null;
      throw error;
    }
    if (!destroyed && running) handle = raf(frame);
  }

  let running = false;

  return {
    start() {
      if (destroyed || running) return;
      running = true;
      last = null;
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle !== null) caf(handle);
      handle = null;
      last = null;
    },
    destroy() {
      this.stop();
      destroyed = true;
    },
    get running() {
      return running;
    },
  };
}
