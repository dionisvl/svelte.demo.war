export const WEAPON_ORDER = Object.freeze(['pulse', 'scatter', 'rail', 'rocket']);

export const WEAPONS = Object.freeze({
  pulse: Object.freeze({
    id: 'pulse',
    name: 'Pulse',
    cooldown: 0.26,
    blurb: 'Rapid single bolt',
    speed: 640,
    radius: 4,
    damage: 1,
  }),
  scatter: Object.freeze({
    id: 'scatter',
    name: 'Scatter',
    cooldown: 0.7,
    blurb: 'Five-bolt close-range fan',
    speed: 560,
    radius: 5,
    damage: 1,
    angles: Object.freeze([-0.42, -0.21, 0, 0.21, 0.42]),
    range: 300,
    pickup: 14,
    maxAmmo: 40,
  }),
  rail: Object.freeze({
    id: 'rail',
    name: 'Rail',
    cooldown: 1.3,
    blurb: 'Piercing beam, shreds armor',
    damage: 3,
    halfWidth: 9,
    beamTtl: 0.4,
    pickup: 8,
    maxAmmo: 24,
  }),
  rocket: Object.freeze({
    id: 'rocket',
    name: 'Rocket',
    cooldown: 1.6,
    blurb: 'Homing blast, area damage',
    speed: 330,
    radius: 7,
    damage: 2,
    splashDamage: 1,
    splashRadius: 78,
    turnRate: 3.4,
    ttl: 2.1,
    pickup: 8,
    maxAmmo: 24,
  }),
});

export const SPECIAL_WEAPONS = Object.freeze(WEAPON_ORDER.filter((id) => id !== 'pulse'));

const KEY_WEAPONS = Object.fromEntries(
  WEAPON_ORDER.flatMap((id, i) => [[`Digit${i + 1}`, id], [`Numpad${i + 1}`, id]]),
);

export const weaponForKey = (code) => KEY_WEAPONS[code] ?? null;
export const isWeapon = (id) => Object.hasOwn(WEAPONS, id);
export const noAmmo = () => Object.fromEntries(SPECIAL_WEAPONS.map((id) => [id, 0]));
