# Svelte War Game

A space shooter game built with Svelte, running in Docker.

**Live:** http://sveltewar.phpqa.ru/

![](readme.gif)

## Quick Start

### Development

Add to `/etc/hosts`:
```
127.0.0.1 sveltewar.local traefik.local
```

Start:
```bash
make up
```

Or use `docker compose`:
```bash
docker compose -f compose.yml -f compose.override.dev.yaml up -d
```

Access via Traefik: http://sveltewar.local:8000 (Dashboard: http://traefik.local:8080)

### Production

Ensure `my.blog` is running first (it provides Traefik and `app-network`):
```bash
cd ../my-web3.site  # or wherever my.blog is
docker compose -f compose.yml -f compose.override.prod.yaml up -d
```

Then start sveltewar:
```bash
make prod
```

Accessible at: http://sveltewar.phpqa.ru and http://sveltewar.web3main.pro

**Note:** If `app-network` doesn't exist, create it:
```bash
docker network create app-network --driver bridge
```

## Useful Commands

```bash
# View logs
docker compose logs -f sveltewar-app

# Stop
docker compose down

# Rebuild
docker compose -f compose.yml -f compose.override.dev.yaml up -d --build
```

## Architecture

- **Dev:** Local Traefik, live code mounting
- **Prod:** Shared Traefik from `my.blog` project, HTTPS via Let's Encrypt
- **Build:** Node.js multi-stage → Nginx static serving

## References

- Original: https://github.com/dionisvl/svelte.demo.war.git
- Article: https://habr.com/ru/post/452684/

## PWA
- Загружаем сайт в Google Play https://vc.ru/dev/76260-zagruzhaem-sayt-v-google-play
- Upload PWA to Playstore https://appmaker.xyz/pwa-to-apk/
- Web App Manifest Generator https://app-manifest.firebaseapp.com/
- Service Workers https://developers.google.com/web/fundamentals/primers/service-workers

### TODO
- Добавить обработку проигрыша, когда один из врагов добрался до нижней границы экрана;
- Добавить подсчет очков;
- Добавить экран старта и окончания игры с выводом текущих и максимально набранных очков;
- Добавить управление с клавиатуры;
- Добавить логику увеличения интенсивности появления и скорости движения врагов с каждым убитым. Постепенное увеличение сложности добавит реиграбельности.