# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The owner's personal site: portfolio (the main project plus a GitHub link), resume and an iPod-classic music player over their own library. Two independent npm projects, no root manifest; run `npm install` and scripts inside each directory. The owner develops alone: keep the structure plain and readable, no FSD, no micro-frontends.

```
apps[3]{dir,stack,port}
frontend,Vue 3 + Pinia + SCSS,4100
backend,Fastify 5 + Prisma + sharp,4101
backend db,postgres:15 via docker compose,5436
```

## Commands

```sh
# backend/
docker compose up -d db      # Postgres (the only compose service)
npx prisma migrate deploy    # apply migrations
npx prisma migrate dev       # create a migration after editing prisma/schema.prisma
npm run dev                  # tsc -w + fastify start -w on :4101 (port set by -p in package.json)
npx tsc --noEmit             # type-check; a type error makes `npm run dev` exit

# frontend/
npm run dev                  # vite on 127.0.0.1:4100 (VUE_DEVTOOLS=1 to enable Vue DevTools)
npm run tunnel               # named Cloudflare tunnel ner9-local: https://local.ner9.com -> :4100
npm run build                # vue-tsc + vite build
npx eslint .                 # `npm run lint` runs with --fix
npm run test:unit            # vitest; single file: npx vitest run path/to/file.spec.ts (unit tests only; there are no e2e tests)
```

Local env files are gitignored:
- `backend/.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` pointing at `127.0.0.1:5436`.
- `frontend/.env` must exist with `VITE_API_BASE_URL=/api`. Without it requests hit the Vite server and get HTML back.

## Frontend layout (`frontend/src`)

```
dirs[9]{dir,holds}
pages/,one component per route; lazy-loaded from router/index.ts
components/<topic>/,"UI by topic: layout, ipod (player), dancers, projects, resume, themes (FL backdrop), ui (base button/tag)"
api/,all backend calls; http.ts is the only place that knows the API prefix
stores/,"Pinia: library (albums/tracks cache), player (queue + the audio element), ipod (sheet open state, Cover Flow position), dancers (on/off), theme"
content/,"hand-written site copy as typed data per language: profile, resume.ru/resume.en, projects; useContent() picks the current language (types in types/content.ts)"
i18n/,"vue-i18n setup (index.ts: browser-language detection, setLocale, Russian plural rule) and interface strings (messages/ru.ts, en.ts typed from ru)"
types/,shared TypeScript types per domain
styles/,"theme.scss (themes → CSS vars), base.scss, main.scss (shared .container/.page/.card/.eyebrow/.status)"
utils/,"formatTime, Russian plural, safe pointer capture, BeatClock"
```

- To add a page: create it in `pages/`, add a route with `meta.title`, add a nav link in `components/layout/AppHeader.vue`.
- Resume and profile text live in `content/`. Pages render content and hold no copy of their own.
- Two languages, Russian and English (vue-i18n, Composition API). The first visit follows the browser language (Russian for ru and neighbouring CIS languages, English otherwise); the header button (`LanguageToggle.vue`) switches and remembers it (`ner9-locale`) and sets `<html lang>`. Interface strings: `$t('…')` in templates, `t` from `@/i18n` in stores/scripts; add every key to both `messages/ru.ts` and `messages/en.ts` (en is type-checked against ru). Site copy: components call `useContent()`. Route titles are i18n keys in `meta.titleKey`; `App.vue` sets the tab title and the window titles from them.
- Projects: the main project (`content/projects.ts`, "Клешня" / "Kleshnya", Telegram claw-machine game with a promo code) is hand-written and shown by `ShowcaseCard.vue` on the home and projects pages, followed by a link to the GitHub profile. The old GitHub repo list (frontend grid + backend `/projects`) was deleted on 2026-10-17 as legacy.
- Routes are only `/`, `/projects`, `/resume` and the 404. Legacy redirects (`/music`, `/clicker`, `/game`, `/contest`) and the Cookie Clicker were deleted on 2026-10-17; don't add redirects for old URLs.
- The resume is compiled from the owner's two English CVs (Fullstack and Fullstack + Python/Claw): `content/resume.en.ts` keeps the CVs' wording, `resume.ru.ts` is the Russian translation, entry for entry; the skill groups are the union of both. Edit both files together. The resume page follows the CVs' order: header (name, role, summary, contacts), skills, experience, education, languages. Contacts live in `profile.contacts`.
- `html` has `scrollbar-gutter: stable`, so the page window keeps the same width and position on short and long pages.
- Style only with the CSS variables from `styles/theme.scss` so every theme works. Use `@use`, not `@import`, in SCSS.

## Themes

Three themes, default Apple, each changing the whole feel, not just colours:

```
themes[3]{id,label,look}
apple,Apple 2007,"iPhone OS 1 realism: settings pinstripes, glossy blue-grey nav bar, gel buttons, chrome hero name with a reflection"
fl,FL Studio,"the Playlist blurred behind the page (components/themes/FlPlaylist.vue); its glowing playhead runs while music plays, behind the page window and visible through it (the owner wants it in the background, not over the page); the page is a dark FL window titled Playlist – Arrangement › <page> so text stays readable; FL windows on cards, toolbar buttons, Channel Rack LED tags, knob icon buttons; Exo 2 headings, Inter body"
win98,Windows 98,"teal desktop, header = taskbar with a Start-button logo and tray, the page is an IE window titled after the route, bevelled buttons/fields/scrollbars; Tahoma everywhere (a pixel font was tried and rejected)"
```

Apple Night, Midnight and "Авто" were removed and Aqua 2007 became Windows 98 on 2026-10-16; a saved removed theme falls back (aqua → win98, others → apple). `stores/theme.ts` holds the list for the picker, persists the choice in localStorage, sets `data-theme` on `<html>` and the browser `theme-color` meta.

Webfonts come from `@fontsource-variable/*` (Exo 2 and Inter, FL only; imported in `main.ts`, with Cyrillic; the browser downloads them only when FL is active). Keep fonts restrained: the owner found extra display fonts overdone. A family name with a digit must stay quoted in `theme.scss` (`string.unquote("'Exo 2 Variable'")`), because Sass strips quotes when writing custom properties. Main text (resume points) uses `--color-text`, not muted.

Two layers: `styles/theme.scss` defines the token set per theme (colours, fonts, radii, card border/shadow, header and dock backgrounds, hero gradient, page pattern, button fill/shadow, glow). `styles/skins/_<theme>.scss` adds what tokens can't (window chrome, bevels, gloss), scoped by `:root[data-theme]` so it beats component styles. Skins target hook classes: `.panel` (+ `data-title`, the window title) on cards, `.icon-btn` on the round header buttons, `.btn`, `.tag`, `.chip`, the header classes, and `.layout__main[data-title]` in `App.vue`. New cards should carry `panel` and a `data-title`. Adding a theme = one map entry + one `THEMES` entry + a skin + the list and splash colours in `index.html`. The header has the picker (`ThemePicker.vue`) and the Fruity Dance toggle (`DanceToggle.vue`); the iPod main menu has the same toggle.

On phones the collapsed iPod rises out of a full-width glass dock (`.ipod-dock`, coloured by `--dock-bg`); the grip floats above the device so the peek stays short.

## Music player (iPod)

There is no music page. `components/ipod/IpodPlayer.vue` is rendered once in `App.vue` as a bottom sheet (bottom-right on desktop, ≥768px).

- Collapsed, only the device top peeks out: the screen's title bar plus a mini "now playing" row. `IpodPlayer` measures that peek and sets `--ipod-peek`; `AppFooter.vue` pads its own bottom by it plus 36px for the grip above the device, so the footer links sit above the iPod and the footer reaches the bottom edge (padding on `.layout` left an empty strip under the footer). Drag/flick or tap to expand; drag down, the backdrop (mobile), ✕ or Esc to collapse. Body scroll is locked while open on phones.
- `IpodScreen.vue` keeps a stack of views (`types/ipod.ts`): menu, coverflow, albums, album, nowPlaying. Views get `push`/`back` via the injected `IPOD_NAVIGATOR` and expose `scroll`/`select` (and optional `beforeLeave` exit animation) so the click wheel can drive whichever is on top. Menus slide; the album view skips the slide because it animates itself: its closed state matches the centered Cover Flow cover, then the cover moves left and the track list unfolds on the right.
- `IpodClickWheel.vue`: rotating a finger around the ring emits a scroll step per 18° (clockwise = +1) with a Web Audio click; a short tap presses MENU/next/previous/play by angle; the center button selects. In Now Playing the wheel scrubs ±5 s, because iOS ignores `<audio>.volume`.
- Elements marked `data-no-drag` don't start a sheet drag; `data-own-swipe` opts a view out of "swipe right = back".
- Desktop keys while open: arrows scroll, Enter selects, Backspace = MENU, Space = play/pause, Esc collapses.
- `stores/player.ts` owns one `HTMLAudioElement` created lazily and streams `/library/stream/:id`, so playback starts immediately and seeking uses HTTP Range. Don't reintroduce a player that downloads the whole file first (the old wavesurfer setup did, which made FLAC unusable over the tunnel). It also wires the Media Session API for lock-screen controls.
- On load `components/ipod/introTrack.ts` cues `profile.introTrack` (Chief Keef "Hate Bein' Sober" with `startAt` 24 s, about 5 s before the drop at 29.2 s) and tries to play it. Browsers block sound before the first interaction, so when refused it waits in the mini player and starts on the first tap/key outside the iPod; it backs off if the visitor plays something else.
- The mini row's opacity follows the sheet position (`miniOpacity` = 1 − openness): it covers the track list instantly on collapse and crossfades while dragging.
- The `.m4a` albums are ALAC, which Chromium (including Playwright's) can't decode, so they are hidden there. Test playback with MP3/FLAC albums.

## Dancers (FL Chan)

`components/dancers/DanceFloor.vue` (rendered in `App.vue`) shows two FL Chans, the dancer from FL Studio's Fruity Dance plugin, dancing to the player. The second one is hue-shifted and mirrored.

- Sprites: `assets/dancers/fl-chan.webp` (+ half-size `-small` for phones) converted from FL Studio's `Plugins/Fruity/Generators/Fruity Dance/Artwork/Dance.png`. Fruity Dance format: 8 frames per row, one row per move, last row `Held` (played while dragged). `sprites.ts` lists the rows; any Fruity Dance skin can be swapped in the same way. FL Chan artwork belongs to Image-Line.
- Drawn as CSS background frames (`SpriteDancer.vue`), no canvas/WebGL. One rAF loop updates reactive state only when a frame changes.
- Beat sync: `utils/beatClock.ts` tracks bass energy from the player's `AnalyserNode` (kick = mean + 1.5σ, tempo = median interval folded into 80–180 BPM, phase nudged to whole beats). 4 frames per beat; moves change every 8 beats. Without music they idle (`Waiting`); without an analyser the clock runs at 120 BPM. Unit-tested with synthetic kicks, including a loud compressed master.
- `player.getAnalyser()` routes the `<audio>` element through Web Audio. It must run inside a user gesture (DanceFloor hooks the next pointerdown/keydown while enabled), otherwise Safari keeps the context suspended and the music goes silent. The routing is permanent and may affect background/lock-screen playback on iOS, which is a known trade-off: since 2026-10-16 the owner wants the dancers on by default everywhere (key `ner9-dancers-v2`) so the feature is visible.
- Layout: when each side margin (viewport − 1100 px content) leaves ≥150 px, big dancers stand in the margins; otherwise small (84 px) draggable dancers in the bottom corners, standing on the iPod dock. On by default everywhere; toggled from the header disco ball or the iPod menu, remembered in localStorage.

## Performance

- `index.html` holds an inline theme bootstrap (mirrors `stores/theme.ts`; keep the theme list in sync) and the NER9 splash with per-theme colours; `main.ts` fades it out after the router is ready, kept at least 900 ms.

- Roboto Mono is self-hosted as woff2 subsets (`assets/fonts/RobotoMono/*.subset.woff2`, ~18 KB each; the original Nerd Font TTFs were deleted).
- Covers are served as cached 600px webp thumbnails (sharp) instead of originals.
- Lazy routes are prefetched on idle (`router/index.ts`); the album list is preloaded on idle by `IpodPlayer`. Vite warms up pages/components at startup.
- The dev server over the quick tunnel is inherently slower than a production build (many unbundled module requests); Vue DevTools is off by default for that reason.

## Backend (`backend/src`)

- fastify-cli autoload: every file in `plugins/` is registered first (`prisma`, `sensible`), then every folder in `routes/`. Each route folder sets its prefix with `export const autoPrefix`. Vite strips `/api`, so backend routes have no `/api`.
- `services/local-music.service.ts` reads `backend/music/<album>/<tracks>`. Album/track ids are 16-char hashes of the path (relative, forward slashes) resolved through an in-memory index that rebuilds on a miss. Keep them short: Fastify 404s URL params over 100 chars (`maxParamLength`), which once broke tracks with long album + title names when ids were base64 paths. Titles, artist and duration come from tags, covers from an image in the folder or art embedded in the first track, resized to webp; all cached in memory. Zero-byte files and empty albums are skipped. Each track's `mimeType` carries the codec for .m4a (`audio/mp4; codecs="alac"` vs AAC), and albums report `formats` (count per MIME); the frontend (`api/library.ts`, `canPlay`) hides what the browser can't play. 19 tracks (The Prodigy, Bangarang) are Apple Lossless: Safari plays them, Chrome/Firefox don't.
- The music is the owner's purchased collection and is committed on purpose. 15 of 16 Crystal Castles files were committed empty; the backend hides them. Two public-domain albums (Albinoni, Mendelssohn) came from Wikimedia Commons; see `SOURCE.txt` in each.
- `plugins/prisma.ts` decorates `fastify.prisma` and throws at startup if `DATABASE_URL` is missing, so the backend needs the DB up. The schema currently has no models (the contest tables were dropped by the `remove_contest` migration); the database is kept for upcoming features.
- The HR Hunt contest was removed on 2026-10-16.
- `npm run dev` compiles to `dist/` and serves from there. After deleting a source file, delete its `dist/` counterpart too, or autoload keeps registering it.

## Gotchas

- Production runs on the owner's VPS at https://ner9.com. The local dev server is public at https://local.ner9.com (for testing from the phone, like Claw's local.claw-star.com) through the named tunnel `ner9-local`: config `frontend/cloudflared.yml`, credentials `~/.cloudflared/ner9-local.json`, DNS = proxied CNAME `local` to `3e6a5e73-38d8-4fe3-ab6f-87fab0437703.cfargotunnel.com`. `~/.cloudflared/cert.pem` is for the claw-star.com zone, so `cloudflared tunnel route dns` must not be used for ner9.com (it would create `ner9.com.claw-star.com`); edit ner9.com DNS in the dashboard.
- `~/.cloudflared/config.yml` belongs to Claw (catch-all 404 ingress); `npm run tunnel` passes `--config cloudflared.yml` so it isn't loaded.
- `server.allowedHosts` in `vite.config.ts` must list every tunnel hostname, or Vite rejects the requests.
- Ports 2001, 3000 and 5434 are taken by the owner's other projects (claw, cadry, rearden), which is why ner9 uses 4100, 4101 and 5436.
- The owner's launcher `C:\projects\open-claude.ps1` opens api, web, db, tunnel and remote panes for this repo. The desktop shortcut "NER9" runs it with `-Window run -Project NER9`; Claude tabs stay in the shared "Claude" window. The remote pane runs `claude remote-control --spawn=same-dir` for phone access.
