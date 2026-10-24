# Sveltewar

Orbital defense arcade shooter built with Svelte 5 and Vite 8. Hold the line against descending raiders, chain kills for a score multiplier, and survive escalating waves.

**Live:** https://sveltewar.web3main.pro/

![](readme.gif)

## Gameplay

- Raiders fall toward the defense line. Each one that crosses it, or rams your ship, costs a shield. Zero shields ends the run.
- Shoot them down for points. Consecutive kills build a combo: the multiplier rises every 5 kills (max x5) and resets when a raider gets through.
- Every 8 kills starts a new wave: faster raiders, quicker spawns, and armored heavies from wave 3.
- The high score is stored in `localStorage` (`sveltewar:highscore:v1`) when available.

| Input | Action |
| --- | --- |
| Arrow Left / Right, A / D | Move |
| Space | Fire (hold for auto-fire), also starts / restarts |
| 1 / 2 / 3 / 4 (row or numpad) | Select Pulse / Scatter / Rail / Rocket (special weapons only while they have ammo) |
| P or Esc | Pause / resume |
| Touch / mouse drag on the field | Steer the ship toward the pointer and fire |
| On-screen buttons (touch devices) | Move left, move right, fire |
| Weapon bar under the field (mouse or touch) | Select a weapon; shows ammo and charge, empty weapons are greyed out |
| Speaker button in the header | Sound on / off (remembered) |

The game pauses automatically when the window loses focus or the tab is hidden, and resumes without catch-up.

## Weapons

Pulse is always available with unlimited ammo. Scatter, Rail and Rocket run on ammo that drops from destroyed raiders: each run starts with Pulse only.

- Drones drop a crate 12% of the time, heavies 45%. After 10 kills without a drop the next kill always drops one.
- Fly into a falling crate to collect it: you get its ammo (Scatter 14, Rail 8, Rocket 8; stacks up to 40 / 24 / 24) and the weapon is equipped at once.
- While a shield is missing, a crate may instead restore one shield.
- Each shot spends one ammo; an empty weapon falls back to Pulse.

All weapons share one cooldown, so switching never skips a reload.

| Key | Weapon | Cooldown | Role |
| --- | --- | --- | --- |
| 1 | Pulse | 0.26 s | Rapid single cyan bolt. Precise, low damage per shot. |
| 2 | Scatter | 0.7 s | Fan of five amber bolts, about +/-24 degrees, short range. Each bolt is a separate swept projectile, so several can strip a heavy at close range. |
| 3 | Rail | 1.3 s | Instant piercing beam down your lane (damage 3). Hits every raider in the lane, heavies included, and lingers briefly on screen. |
| 4 | Rocket | 1.6 s | Slow homing missile (steers to the nearest raider ahead, ties go to the lowest id). Direct damage 2 plus splash damage 1 within 78 px, one blast per rocket. |

## Sound

Effects are bundled in `public/audio/` and loaded from the same origin, with no CDN and no tracking. They come from Kenney's **Sci-Fi Sounds** pack, released under CC0 1.0: see [`public/audio/SOURCE.md`](public/audio/SOURCE.md) and [`public/audio/LICENSE-Kenney.txt`](public/audio/LICENSE-Kenney.txt). Attribution is not required but appreciated.

- Nothing plays and no `AudioContext` exists until you interact (Launch, a key, a tap or the sound button), following the browser autoplay policy. If the browser denies the unlock, the next interaction retries.
- The speaker button toggles sound; the choice is stored in `localStorage` (`sveltewar:sound:v1`). Muting is independent of `prefers-reduced-motion`.
- Audio is suspended while the game is paused or the tab is hidden. At most 6 sounds play at once (game over may add 2), and each effect has a minimum gap so auto-fire and chain kills do not clip.
- If Web Audio is missing or samples fail to load, the game stays fully playable and the sound button is disabled when unsupported.

## Stack

- Svelte 5 (runes, `mount`) + Vite 8 + `@sveltejs/vite-plugin-svelte` 7. Plain Vite, no SvelteKit.
- Node `^20.19.0 || >=22.12.0` (Vite 8 requirement). Docker images use `node:24-alpine`.
- Tests: Vitest 5 (+ jsdom for component and audio-unlock tests, with a faked `AudioContext`).

## Layout

```
index.html            Vite entry
src/game/             Pure, deterministic game logic (engine, loop, input, high score)
src/components/       Svelte UI (Backdrop, Playfield, Hud, Overlay, Pad)
src/App.svelte        Wires input, loop, persistence and lifecycle
public/               Static files copied verbatim (manifest, icons, sw.js, art)
nginx/default.conf    Cache headers and static serving for the image
tests/                Vitest specs
dist/                 Build output (ignored)
```

## Local development

```bash
npm ci
npm run dev        # http://localhost:5173
npm test
npm run lint
npm run check      # svelte-check
npm run build      # outputs to dist/
npm run preview
```

`make check` runs tests, lint, svelte-check and the build.

## Docker

The production image builds in `node:24-alpine` (running the tests first) and serves `/dist` from Nginx. **No volume is mounted over `/usr/share/nginx/html`**, so the container always serves the build baked into the image.

### Development stack

Add to `/etc/hosts`:

```
127.0.0.1 sveltewar.local traefik.local
```

```bash
make dev           # docker compose -f compose.yml -f compose.override.dev.yaml up -d --build
```

Open http://sveltewar.local:8000 (Traefik dashboard: http://traefik.local:8080). The `dev` override runs the Vite dev server in a container with the repository mounted at `/app` (`node_modules` stays in the container), so edits hot-reload. Only that override mounts source; the base and production files do not.

### Production

Requires the shared Traefik (entrypoints `web`/`websecure`, cert resolver `myresolver`) and the external Docker network named by `DOCKER_NETWORK_NAME`.

```bash
cp .env.example .env     # DOCKER_NETWORK_NAME, DOMAIN
docker network create app-network   # if it does not exist yet
make prod                # docker compose -f compose.yml -f compose.override.prod.yaml up -d --build
```

The site is served at `https://sveltewar.${DOMAIN}/` (HTTP redirects to HTTPS).

## Caching and upgrades

Earlier releases shipped a cache-first service worker that cached `/` and stale assets. The current setup avoids leaving clients on an old UI:

- `/sw.js` is served with `no-cache` and registered with `updateViaCache: 'none'`, so browsers fetch the new worker on their next visit.
- The new worker calls `skipWaiting()`/`clients.claim()` and, on activation, deletes the legacy `my-site-cache-*` caches and its own outdated `sveltewar-*` caches. It does not touch other caches or site data.
- When a new worker takes over a page that already had one, the page reloads once to load the new build.
- Navigations are network-first (offline falls back to the last cached shell). Hashed files under `/build/` are cache-first and served `immutable`. Icons, manifest and art use stale-while-revalidate. Everything else is `no-cache` at Nginx.
- `/pwa_start_url.html` stays as a redirect to `/` for installed apps that still have the old manifest.

To ship a change to the worker logic, edit `public/sw.js`; bumping `VERSION` also purges previous caches.

## Known limitations

- PWA icons are the original artwork and do not match the new look.
- `public/assets/screen.webp` is a promo image; only a cropped detail is used on the start screen.
- Audio files are not in the service-worker cache, so sound needs a network connection on first load (the game itself still works offline without it).
- Audio levels were balanced from measured sample loudness and verified for playback in a browser; listening tests on different speakers or headphones remain worthwhile.
