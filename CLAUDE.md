# CLAUDE.md

The owner's personal site: portfolio (the main project + GitHub link), resume, and an iPod-classic music player over their own library. Two independent npm projects, no root manifest: run `npm install` and scripts inside each directory. The owner works alone: plain readable structure, no FSD, no micro-frontends.

```
apps[3]{dir,stack,port}
frontend,Vue 3 + Pinia + SCSS,4100
backend,Fastify 5 + Prisma + sharp,4101
backend db,postgres:15 via docker compose,5436
```

## Commands

```sh
# backend/
docker compose up -d db s3   # Postgres + SeaweedFS (S3 for review images, 127.0.0.1:9010)
npx prisma migrate deploy    # apply migrations; `migrate dev` after editing schema.prisma
npm run dev                  # tsc -w + fastify start -w on :4101; a type error makes it exit
npx tsc --noEmit

# frontend/
npm run dev                  # vite on 127.0.0.1:4100 (VUE_DEVTOOLS=1 for DevTools)
npm run tunnel               # named tunnel ner9-local: https://local.ner9.com -> :4100
npm run build                # vue-tsc + vite build
npm run lint                 # eslint --fix
npm run test:unit            # vitest (unit only, no e2e); one file: npx vitest run path.spec.ts
npm run cv                   # rebuild resume PDFs in public/downloads from content/
```

Env (gitignored):
- `backend/.env`: `POSTGRES_*`, `DATABASE_URL` (127.0.0.1:5436); `S3_ENDPOINT` (http://127.0.0.1:9010), `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (without them uploads are off); `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (@ner9com_dev_bot locally, @ner9com_bot in prod); `OWNER_TELEGRAM_ID`; `SESSION_SECRET`; optional `MUSIC_DIR`.
- `frontend/.env` must contain `VITE_API_BASE_URL=/api`, otherwise requests hit Vite and get HTML.

## Frontend (`frontend/src`)

```
dirs[9]{dir,holds}
pages/,one component per route; lazy-loaded from router/index.ts
components/<topic>/,"layout, ipod, dancers, projects, resume, reviews, themes, ui"
api/,all backend calls; http.ts is the only place that knows the API prefix
stores/,"Pinia: library, player (queue + audio element), ipod, dancers, theme, auth, visitorSync"
content/,"site copy as typed data per language; useContent() picks the language"
i18n/,"vue-i18n setup and interface strings (messages/ru.ts source; uk.ts, en.ts typed from it)"
types/,shared types per domain
styles/,"theme.scss (tokens per theme), skins/_<theme>.scss, base.scss, main.scss"
utils/,"formatTime, plural, pointer capture, BeatClock, duration"
```

- New page: file in `pages/`, route with `meta.titleKey` (i18n key; `App.vue` sets tab/window titles), nav link in `components/layout/AppHeader.vue`.
- Routes: `/`, `/projects`, `/cv` (`/resume` redirects there — keep it), `/clothes`, 404. `/admin` is the owner's cheat sheet of deployed projects: no nav link (only the owner's account card links it), the list lives in `backend/src/services/ownerProjects.ts` and `GET /owner/projects` serves it to the owner's session only (404 for anyone else) — update it when a project moves. Don't bring back removed routes (`/music`, `/clicker`, `/game`, `/contest`, `/reviews`).
- Three languages ru/uk/en. Every key goes into `messages/ru.ts`, `uk.ts`, `en.ts`. Every place with per-language text has all three: `content/`, `public/banned.html`, bot replies in `backend/src/services/telegram.ts`, the CV PDFs. No copy inside pages: components call `useContent()` / `$t()`.
- Resume and home copy come word for word from the owner's LinkedIn (https://www.linkedin.com/in/savva-ai-fullstack/, since 2026-10-27: headline, About, the three jobs Teamatical / LegalShield / EPAM, NSU, languages; skill groups gather the technologies it names plus earlier skills kept on request: Angular, Next.js, MySQL, MongoDB, BullMQ, C4, FSD and the like). Never paraphrase or add claims. `content/resume.en.ts` is the source, `resume.ru.ts`/`resume.uk.ts` translate it entry for entry — edit all three. Jobs carry `dates` as "YYYY-MM" (no `to` = current job, counted to this month) and an optional `about` paragraph; `utils/duration.ts` counts total experience (overlaps once). After editing resume/profile run `npm run cv` and commit the PDFs.
- Never put files under `public/cv/`: nginx would serve that folder instead of the `/cv` page.
- Projects (`content/projects.ts`, hand-written, `ShowcaseCard.vue`): "Клешня" on the home page; the projects page lists Kleshnya, Cadry (t.me/cadry_official_bot) and TG Hound (tg-hound.com), the last two `inDevelopment` (still grey dot instead of the pulsing one). A new project also needs its id in `backend/src/services/projects.ts`.
- Style only with CSS variables from `styles/theme.scss`. SCSS uses `@use`, never `@import`.

## Themes

Three themes, default FL Studio: `apple` (iPhone OS 1 realism), `fl` (FL Studio Playlist backdrop, Exo 2 + Inter), `win98` (Tahoma everywhere; a pixel font was rejected). Each changes the whole feel, not just colours.

- Two layers: `styles/theme.scss` = token set per theme; `styles/skins/_<theme>.scss` = what tokens can't do (chrome, bevels, gloss), scoped by `:root[data-theme]`. Skins hook onto `.panel` (+ `data-title`), `.icon-btn`, `.btn`, `.tag`, `.chip`, header classes, `.layout__main[data-title]`. New cards carry `panel` and `data-title`.
- Adding a theme = map entry in theme.scss + `THEMES` entry in `stores/theme.ts` + skin + the theme list and boot splash in `index.html` (inline bootstrap mirrors `stores/theme.ts` — keep in sync). Unknown saved themes fall back to the default.
- Fonts: `@fontsource-variable/*`, restrained (the owner finds extra display fonts overdone). A family name with a digit stays quoted via `string.unquote("'Exo 2 Variable'")` or Sass strips the quotes. Body text uses `--color-text`, not muted.

## Music player (iPod)

No music page: `components/ipod/IpodPlayer.vue` renders once in `App.vue` as a bottom sheet; `IpodScreen.vue` keeps a stack of views (`types/ipod.ts`), list screens use `useListNav`, the click wheel drives the top view through the injected `IPOD_NAVIGATOR`.

- `stores/player.ts` owns one lazily created `HTMLAudioElement` streaming `/library/stream/:id` with HTTP Range. Never reintroduce a player that downloads the whole file first (it made FLAC unusable over the tunnel). Queue = the album started from; with Repeat off the end stops and clears the queue, never rolls into the next album.
- State persists in localStorage (`ner9-player`, `ner9-player-modes`, `ner9-ipod-visible`) and syncs to the backend (below). The intro track (`introTrack.ts`) is cued only on a first visit; autoplay is blocked until the first gesture, so it waits for one. Use `player.wantsToPlay`, not `isPlaying`, for "visitor wanted it playing".
- `.m4a` ALAC can't play in Chromium (incl. Playwright): test playback with MP3/FLAC albums.
- Elements with `data-no-drag` don't start a sheet drag; `data-own-swipe` opts a view out of swipe-right = back.

## Dancers (FL Chan)

`components/dancers/DanceFloor.vue`: Fruity Dance sprite sheets (`assets/dancers/fl-chan.webp`, 8 frames per row, last row `Held`), drawn as CSS background frames, one rAF loop. Beat sync in `utils/beatClock.ts` (unit-tested) from the player's analyser.

- `player.getAnalyser()` must be called inside a user gesture, or Safari keeps the AudioContext suspended and the music goes silent. The routing is permanent (known iOS background-playback trade-off; dancers stay on by default, key `ner9-dancers-v2`).
- Settings in `stores/dancers.ts` (`ner9-dancers-settings`): 1–4 dancers with a move each; per-dancer menu `DancerMenu.vue` (right click / 500 ms long press). Big dancers in the margins when each leaves ≥150 px, otherwise small draggable ones in the bottom corners.

## Comments and the SQL-injection ban

Comments sit under each project card as an Instagram-like row (`ProjectComments.vue`: a heart for the project — `ProjectLike`, one per visitor, `POST /reviews/likes` —, the comment count, the Keef rating, the top comment); the thread and a one-line composer that unfolds on focus open in `CommentsSheet.vue` (bottom sheet on phones, centred window on desktop, no `.panel` chrome). Code and DB still call them reviews, keyed by project id. The field is a deliberate SQL-injection trap: anything `services/injection.ts` recognises (only unmistakable constructions) bans the sender's IP for good (`Ban`, IP from `CF-Connecting-IP`). Nothing typed ever runs as SQL — Prisma sends it as data.

- Banned IPs get `public/banned.html` for every page: nginx `auth_request` → `GET /ban/check` (lets pages through if the backend is down); the API answers 403 `{banned: true}` except `/ban/*`, and `api/http.ts` redirects. Unban is on trust: `POST /ban/unban` after both social links were opened.
- Limits: 3 reviews and 10 replies per IP per hour, 12 image uploads per IP per hour (10 MB, one per request). Images are re-encoded by sharp to webp (+480 px thumb, metadata stripped) into private S3 `reviews/<uuid>.webp`, served by `GET /media/reviews/<file>`. S3 is SeaweedFS (MinIO stopped publishing images); the backend creates the bucket on startup.
- Optional Telegram sign-in (same flow as tg-hound): one-time `t.me/<bot>?start=login_<token>`, page polls `GET /auth/telegram/:token`, backend long-polls `getUpdates`, then a signed httpOnly `ner9_session` cookie. One bot can be polled by one backend only (409), hence separate dev/prod bots. Signed in as `OWNER_TELEGRAM_ID` = "Site author" badge and delete rights everywhere. Anonymous posting stays; no moderation (owner's choice).
- nginx resolver `127.0.0.11` exists only on a user-defined Docker network — test the config on one. nginx allows 12 MB bodies on `/api/`.

## Backend (`backend/src`)

- fastify-cli autoload: `plugins/` first, then every folder in `routes/` (prefix via `export const autoPrefix`). Vite strips `/api`, so routes have no `/api`.
- `npm run dev` serves from `dist/`: after deleting a source file delete its `dist/` counterpart, or autoload keeps registering it.
- `plugins/prisma.ts` throws at startup without `DATABASE_URL`. Models: `VisitorState` (`GET/PUT /state/:id`, UUID ids, 8 KB limit; `{state: null}` for new visitors), `Review`, `Reply`, `Vote`, `ProjectLike`, `Ban`.
- Visitor sync (`stores/visitorSync.ts`): anonymous UUID in the `ner9_visitor` cookie keys theme, language, dancers, player modes and resume track; localStorage is the instant copy, the backend copy wins only if its `savedAt` is newer.
- Music: `services/local-music.service.ts` reads `$MUSIC_DIR/<album>/<tracks>` (default `backend/music`, the old 11 albums). Ids are 16-char path hashes — keep them short, Fastify 404s params over 100 chars. Cyrillic MP3 tags in Windows-1251 are re-decoded (`fixCyrillic`); zero-byte files are skipped; `mimeType` carries the codec for .m4a and the frontend hides what the browser can't play.
- Full library: the owner's `Desktop/Music` (~57 GB) is built by `backend/scripts/build_web_library.py` into `C:\ner9-music-web` (~27 GB, AAC 256 for lossless, `--extra` adds public-domain albums). It is not in git. Upload with rsync from a container (Git Bash has none):
  `docker run --rm -v C:/ner9-music-web:/music:ro -v C:/Users/Playboi/.ssh/ner9_music:/key:ro -v C:/Users/Playboi/.ssh/known_hosts:/kh:ro alpine:3.20 sh -c 'apk add -q rsync openssh-client && cp /key /k && chmod 600 /k && rsync -av --delete -e "ssh -i /k -o UserKnownHostsFile=/kh" /music/ ner9@207.180.218.99:/'`
  (user `ner9` is restricted to rsync in `/srv/ner9-music`, hence destination `:/`).
- Performance: covers and streams have versioned immutable URLs (`?v=`) cached by browsers and a Cloudflare Cache Rule; thumbnails `thumb-600.webp`/`thumb-160.webp`; lists come from an in-memory snapshot; the player prefetches the next track's first 512 KB.

## Deploy

Push to `main` deploys https://ner9.com via `.github/workflows/deploy.yml`: images `ghcr.io/real-ner9/ner9-{backend,frontend}:latest` → deploy gateway on the VPS (`/root/projects/deploy-gateway`) → Dokploy apps `ner9-prod-backend`, `ner9-prod-frontend`, Postgres `ner9-prod-postgres`, with rollback on unhealthy containers.

- Frontend image = nginx serving the build and proxying `/api/*` with the prefix stripped (`frontend/nginx.conf.template`).
- The backend bind-mounts music from `/srv/ner9-music`; runs `prisma migrate deploy` on start. Runtime env lives in Dokploy.

## Gotchas

- Dev is public at https://local.ner9.com through tunnel `ner9-local` (`frontend/cloudflared.yml`, creds `~/.cloudflared/ner9-local.json`). `~/.cloudflared/config.yml` and `cert.pem` belong to Claw's claw-star.com: `npm run tunnel` passes `--config`, and never use `cloudflared tunnel route dns` for ner9.com — edit DNS in the dashboard.
- `server.allowedHosts` in `vite.config.ts` must list every tunnel hostname.
- Other local projects hold 2000–2002, 3002/3003, 5000/5001, 5432, 5434, 5435, 5437; ner9 uses 4100, 4101, 5436, 9010.
- Launcher: `C:\projects\open-claude.ps1 -Window run -Project NER9` (desktop shortcut "NER9") opens api, web, db, tunnel and remote panes.
- Link-preview images in `frontend/public` (`og-image.png` 1200×630, favicons, `site.webmanifest`) are placeholders; replace files keeping names and sizes.
