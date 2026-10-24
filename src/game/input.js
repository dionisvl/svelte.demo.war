const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire',
  KeyP: 'pause',
  Escape: 'pause',
};

export const createInput = () => ({ left: false, right: false, fire: false, targetX: null, held: [] });

export const keyAction = (code) => KEYS[code] ?? null;

export function applyKey(input, code, down) {
  const action = keyAction(code);
  if (!action || action === 'pause') return input;
  const held = down ? (input.held.includes(code) ? input.held : [...input.held, code]) : input.held.filter((c) => c !== code);
  const active = (a) => held.some((c) => KEYS[c] === a);
  return { ...input, held, left: active('left'), right: active('right'), fire: active('fire') };
}

export const releaseAll = () => createInput();

export function toWorldX(clientX, rect, world = { width: 400, height: 700 }) {
  const scale = Math.min(rect.width / world.width, rect.height / world.height);
  const offset = (rect.width - world.width * scale) / 2;
  return Math.min(world.width, Math.max(0, (clientX - rect.left - offset) / scale));
}
