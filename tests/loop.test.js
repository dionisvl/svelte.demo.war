import { describe, it, expect, vi } from 'vitest';
import { createLoop } from '../src/game/loop.js';

function harness(options = {}) {
  let id = 0;
  const queue = new Map();
  const calls = [];
  const loop = createLoop({
    update: (dt) => calls.push(dt),
    raf: (cb) => { queue.set(++id, cb); return id; },
    caf: (h) => queue.delete(h),
    maxDt: 0.05,
    ...options,
  });
  const frame = (t) => {
    const pending = [...queue.entries()];
    queue.clear();
    pending.forEach(([, cb]) => cb(t));
  };
  return { loop, calls, frame, queue };
}

describe('loop', () => {
  it('passes zero dt on the first frame and elapsed seconds afterwards', () => {
    const h = harness();
    h.loop.start();
    h.frame(1000);
    h.frame(1016);
    expect(h.calls[0]).toBe(0);
    expect(h.calls[1]).toBeCloseTo(0.016, 6);
  });

  it('clamps long gaps', () => {
    const h = harness();
    h.loop.start();
    h.frame(0);
    h.frame(5000);
    expect(h.calls[1]).toBe(0.05);
  });

  it('does not catch up after being stopped and started again', () => {
    const h = harness();
    h.loop.start();
    h.frame(0);
    h.frame(16);
    h.loop.stop();
    h.loop.start();
    h.frame(60000);
    expect(h.calls.at(-1)).toBe(0);
  });

  it('stops scheduling frames when stopped', () => {
    const h = harness();
    h.loop.start();
    h.frame(0);
    expect(h.queue.size).toBe(1);
    h.loop.stop();
    expect(h.queue.size).toBe(0);
    expect(h.loop.running).toBe(false);
    h.frame(16);
    expect(h.calls).toHaveLength(1);
  });

  it('never schedules more than one pending frame, even if started twice', () => {
    const h = harness();
    h.loop.start();
    h.loop.start();
    expect(h.queue.size).toBe(1);
  });

  it('destroy stops the loop permanently', () => {
    const h = harness();
    h.loop.start();
    h.loop.destroy();
    expect(h.queue.size).toBe(0);
    h.loop.start();
    expect(h.queue.size).toBe(0);
  });

  it('stops the loop and rethrows when update throws', () => {
    const update = vi.fn(() => { throw new Error('boom'); });
    const h = harness({ update });
    h.loop.start();
    expect(() => h.frame(0)).toThrow('boom');
    expect(h.queue.size).toBe(0);
    expect(h.loop.running).toBe(false);
  });
});
