export const STORAGE_KEY = 'sveltewar:highscore:v1';

const valid = (n) => Number.isSafeInteger(n) && n >= 0;

export function loadHighScore(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw == null || !/^\d{1,15}$/.test(raw)) return 0;
    const n = Number(raw);
    return valid(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(storage, score) {
  const current = loadHighScore(storage);
  if (!valid(score) || score <= current) return Math.max(current, 0);
  try {
    storage?.setItem(STORAGE_KEY, String(score));
  } catch {
    /* storage unavailable: keep the in-memory best */
  }
  return score;
}
