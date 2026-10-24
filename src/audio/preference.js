export const SOUND_KEY = 'sveltewar:sound:v1';

export function loadSoundEnabled(storage) {
  try {
    return storage?.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundEnabled(storage, enabled) {
  try {
    storage?.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
}
