export const SAMPLE_FILES = Object.freeze([
  'pulse-1', 'pulse-2', 'scatter-1', 'scatter-2', 'rail', 'rocket',
  'hit', 'explosion', 'splash', 'shield', 'over',
]);

export const MASTER_VOLUME = 0.5;
export const MAX_VOICES = 6;
export const PRIORITY_VOICES = 2;
export const PRIORITY_FILES = Object.freeze(['over']);

const SHOTS = Object.freeze({
  pulse: { group: 'pulse', files: ['pulse-1', 'pulse-2'], level: 0.45, gap: 0.07 },
  scatter: { group: 'scatter', files: ['scatter-1', 'scatter-2'], level: 0.2, gap: 0.2 },
  rail: { group: 'rail', files: ['rail'], level: 0.7, gap: 0.4 },
  rocket: { group: 'rocket', files: ['rocket'], level: 0.7, gap: 0.4 },
});

const IMPACTS = Object.freeze({
  hit: { group: 'hit', files: ['hit'], level: 0.4, gap: 0.05 },
  kill: { group: 'kill', files: ['explosion'], level: 0.5, gap: 0.07 },
  splash: { group: 'splash', files: ['splash'], level: 0.75, gap: 0.12 },
  leak: { group: 'shield', files: ['shield'], level: 0.7, gap: 0.25 },
  ram: { group: 'shield', files: ['shield'], level: 0.7, gap: 0.25 },
  over: { group: 'over', files: ['over'], level: 0.85, gap: 1 },
});

export function soundForEvent(event) {
  if (event.type === 'shot') return SHOTS[event.weapon] ?? null;
  return IMPACTS[event.type] ?? null;
}

export const SWITCH_CUE = Object.freeze({ base: 440, step: 110, seconds: 0.07, level: 0.12, gap: 0.06 });

export const PICKUP_CUE = Object.freeze({ notes: Object.freeze([660, 880, 1320]), spacing: 0.055, seconds: 0.09, level: 0.14, gap: 0.15 });
