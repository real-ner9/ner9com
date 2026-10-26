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
docker compose up -d db s3   # Postgres + SeaweedFS (S3 for review images, 127.0.0.1:9010)
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
npm run cv                   # rebuild the resume PDFs in public/downloads from content/
```

Local env files are gitignored:
- `backend/.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` pointing at `127.0.0.1:5436`; `S3_ENDPOINT` (`http://127.0.0.1:9010`), `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (without them image uploads are off); `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (the sign-in bot; a separate bot per environment), `OWNER_TELEGRAM_ID` (the owner's Telegram id), `SESSION_SECRET` (signs the session cookie); optional `MUSIC_DIR`.
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
- Three languages, Russian, Ukrainian (since 2026-10-26) and English (vue-i18n, Composition API; `LOCALES` in `i18n/index.ts`). The first visit follows the browser language (Ukrainian for uk, Russian for ru and neighbouring CIS languages, English otherwise); the header button (`LanguageToggle.vue`, RU → UA → EN) switches and remembers it (`ner9-locale`) and sets `<html lang>`. Interface strings: `$t('…')` in templates, `t` from `@/i18n` in stores/scripts; add every key to `messages/ru.ts`, `uk.ts` and `en.ts` (uk and en are type-checked against ru). Every place with per-language text has all three: `content/` (profile, projects, `resume.<lang>.ts`), `public/banned.html`, the bot replies in `backend/src/services/telegram.ts` and the CV PDFs. Site copy: components call `useContent()`. Route titles are i18n keys in `meta.titleKey`; `App.vue` sets the tab title and the window titles from them.
- Projects (`content/projects.ts`, hand-written, shown by `ShowcaseCard.vue`): the main project "Клешня" / "Kleshnya" (Telegram claw-machine game with a promo code) is on the home page; the projects page lists every project (`projects`: Kleshnya, then Cadry, the hiring Mini App at t.me/cadry_official_bot, and TG Hound, the Telegram lead finder at tg-hound.com; both marked `inDevelopment`, which turns the pulsing live dot into a still grey one), each with its comments, followed by a link to the GitHub profile. A new project needs its id in the backend's `services/projects.ts` too. The old GitHub repo list (frontend grid + backend `/projects`) was deleted on 2026-10-17 as legacy.
- Routes are only `/`, `/projects`, `/cv` (the resume; `/resume` redirects there since 2026-10-26, keep it for old links), `/clothes` (the owner's own clothing line; a "coming soon" card until there are items) and the 404. Legacy redirects (`/music`, `/clicker`, `/game`, `/contest`) and the Cookie Clicker were deleted on 2026-10-17; don't bring those back.
- All copy about the owner (resume, home summary and stack) comes word for word from their Fullstack CV (`Desktop/CV/90+/Savva_Kashin_CV_Fullstack.pdf`); don't paraphrase or add claims of your own. The second CV (Fullstack + Python/Claw) only supplies the two entries the first lacks: the own Claw project and the 2025 marketplace contract. `content/resume.en.ts` is the CV text, `resume.ru.ts` and `resume.uk.ts` its translations, entry for entry. Edit all three together. Jobs carry exact months (`dates`, "YYYY-MM"); the page shows each job's and role's length and the total experience (overlaps counted once, gaps skipped; `utils/duration.ts`). The resume page follows the CVs' order: header (name, role, summary, contacts), skills, experience, education, languages. Contacts live in `profile.contacts`. The "Download PDF" button serves `public/downloads/Savva_Kashin_CV.pdf` / `Kashin_Savva_CV_RU.pdf` / `Kashin_Savva_CV_UA.pdf` by language, printed from the same content in the CVs' one-column layout by `scripts/cv-pdf.ts`: run `npm run cv` in `frontend/` after editing the resume or profile and commit the PDFs (it uses Playwright's cached Chromium through `playwright-core`). Don't put files under `public/cv/`: nginx would serve that folder instead of the `/cv` page.
- The sticky header (`AppHeader.vue`) slides up while scrolling down and comes back on any scroll up (changes under 6 px ignored); it stays shown near the top, after a route change and while something in it has focus.
- `html` has `scrollbar-gutter: stable`, so the page window keeps the same width and position on short and long pages.
- Style only with the CSS variables from `styles/theme.scss` so every theme works. Use `@use`, not `@import`, in SCSS.

## Themes

Three themes, default FL Studio (since 2026-10-17; `DEFAULT_THEME` in `stores/theme.ts`, the fallback in `index.html` and `:root` in `theme.scss`), each changing the whole feel, not just colours:

```
themes[3]{id,label,look}
apple,Apple 2007,"iPhone OS 1 realism: settings pinstripes, glossy blue-grey nav bar, gel buttons, chrome hero name with a reflection"
fl,FL Studio,"the Playlist blurred behind the page (components/themes/FlPlaylist.vue); its glowing playhead runs while music plays and only crosses the backdrop, never the content (the page window and footer are opaque on desktop); on phones (≤640px) there is no playhead and the shade and blur are lighter, but the page window stays opaque (a see-through one made the resume hard to read); the page is a dark FL window titled Playlist – Arrangement › <page> so text stays readable; FL windows on cards, toolbar buttons, Channel Rack LED tags, knob icon buttons; Exo 2 headings, Inter body"
win98,Windows 98,"teal desktop, header = taskbar with a Start-button logo and tray, the page is an IE window titled after the route, bevelled buttons/fields/scrollbars; Tahoma everywhere (a pixel font was tried and rejected)"
```

Apple Night, Midnight and "Авто" were removed and Aqua 2007 became Windows 98 on 2026-10-16; a saved removed or unknown theme falls back to the default. `stores/theme.ts` holds the list for the picker, persists the choice in localStorage, sets `data-theme` on `<html>` and the browser `theme-color` meta.

Webfonts come from `@fontsource-variable/*` (Exo 2 and Inter, FL only; imported in `main.ts`, with Cyrillic; the browser downloads them only when FL is active). Keep fonts restrained: the owner found extra display fonts overdone. A family name with a digit must stay quoted in `theme.scss` (`string.unquote("'Exo 2 Variable'")`), because Sass strips quotes when writing custom properties. Main text (resume points) uses `--color-text`, not muted.

Two layers: `styles/theme.scss` defines the token set per theme (colours, fonts, radii, card border/shadow, header and dock backgrounds, hero gradient, page pattern, button fill/shadow, glow). `styles/skins/_<theme>.scss` adds what tokens can't (window chrome, bevels, gloss), scoped by `:root[data-theme]` so it beats component styles. Skins target hook classes: `.panel` (+ `data-title`, the window title) on cards, `.icon-btn` on the round header buttons, `.btn`, `.tag`, `.chip`, the header classes, and `.layout__main[data-title]` in `App.vue`. New cards should carry `panel` and a `data-title`. Adding a theme = one map entry + one `THEMES` entry + a skin + the theme list and a boot splash in `index.html`. The header has the picker (`ThemePicker.vue`), the iPod toggle (`IpodToggle.vue`: hides the player altogether and pauses the music, the footer then loses its iPod padding and phone dancers stand on the screen edge; `ipod.isVisible`, key `ner9-ipod-visible`, synced with the visitor state; no intro track while hidden) and the Fruity Dance toggle (`DanceToggle.vue`); the iPod main menu has the same toggle.

The iPod is the silver model by default and the black iPod classic in FL (colour variables on `.ipod-sheet` in `IpodPlayer.vue`, read by the click wheel).

On phones the collapsed iPod rises out of a full-width glass dock (`.ipod-dock`, coloured by `--dock-bg`); the grip floats above the device so the peek stays short; the dock continues below the screen edge, because iOS 26 Safari shows the page under its floating toolbar, past where fixed `bottom: 0` ends.

## Music player (iPod)

There is no music page. `components/ipod/IpodPlayer.vue` is rendered once in `App.vue` as a bottom sheet (bottom-right on desktop, ≥768px).

- Collapsed, only the device top peeks out: the screen's title bar plus a mini "now playing" row. `IpodPlayer` measures that peek and sets `--ipod-peek`; `AppFooter.vue` pads its own bottom by it plus 36px for the grip above the device, so the footer links sit above the iPod and the footer reaches the bottom edge (padding on `.layout` left an empty strip under the footer). Drag/flick or tap to expand; drag down, the backdrop (mobile), ✕ or Esc to collapse. Body scroll is locked while open on phones.
- Cover Flow centers the playing album once per album (`ipod.coverFlowAlbumId`), including the intro track that is cued after the view mounts; browsing after that is kept.
- Menus follow the iPod classic, minus what the site has no data for (Videos, Photos, Podcasts, Settings, Playlists, Genres): main = Music ▸ / Shuffle Songs / Fruity Dance ▸ / Now Playing; Music = Cover Flow / Artists / Albums / Songs. Artists come from each album's most credited track artist (`library.albumArtist`); Songs and Artists load every album's tracks (`library.loadAllTracks`). The sheet opens on Cover Flow with Music and the main menu under it.
- `IpodScreen.vue` keeps a stack of views (`types/ipod.ts`; everything in a view object but `name` is passed as props). List screens use `useListNav`, which remembers the highlighted row per menu level (`IPOD_LIST_MEMORY`), so MENU lands on the row you left.
- Shuffle (Off/Songs) and Repeat (Off/One/All) live in `stores/player.ts`, remembered in `ner9-player-modes`. In Now Playing the center button cycles the bottom panel scrubber → shuffle → repeat and the wheel changes the value. `player.album` follows the playing track, since Songs and Shuffle Songs queues mix albums. Views get `push`/`back` via the injected `IPOD_NAVIGATOR` and expose `scroll`/`select` (and optional `beforeLeave` exit animation) so the click wheel can drive whichever is on top. Menus slide; the album view skips the slide because it animates itself: its closed state matches the centered Cover Flow cover, then the cover moves left and the track list unfolds on the right.
- `IpodClickWheel.vue`: rotating a finger around the ring emits a scroll step per 18° (clockwise = +1) with a Web Audio click; a short tap presses MENU/next/previous/play by angle; the center button selects. In Now Playing the wheel scrubs ±5 s, because iOS ignores `<audio>.volume`.
- Elements marked `data-no-drag` don't start a sheet drag; `data-own-swipe` opts a view out of "swipe right = back".
- Desktop keys while open: arrows scroll, Enter selects, Backspace = MENU, Space = play/pause, Esc collapses.
- The queue is the album the track was started from. Like the iPod with Repeat off, next on the last track (or the last track ending) stops and clears the queue (`player.stop`), and the screen leaves Now Playing; it never rolls into the next album. Repeat All wraps to the first track, Repeat One replays the song when it ends (next still skips).
- `stores/player.ts` owns one `HTMLAudioElement` created lazily and streams `/library/stream/:id`, so playback starts immediately and seeking uses HTTP Range. Don't reintroduce a player that downloads the whole file first (the old wavesurfer setup did, which made FLAC unusable over the tunnel). It also wires the Media Session API for lock-screen controls.
- The player remembers the album, track and position in localStorage (`ner9-player`, written on track change, every 2 s of playback and on `pagehide`; cleared when the queue runs out). On load `introTrack.ts` resumes that track from the same spot, with the same autoplay fallback as below, or leaves it paused if the visitor had paused it (`playing` in the save comes from `player.wantsToPlay`: set by `play()`, cleared by `pause()`; not `isPlaying`, which is also false while autoplay is blocked). Only without a saved track (the first visit) does it cue the intro.
- On load `components/ipod/introTrack.ts` cues `profile.introTrack` (Chief Keef "Hate Bein' Sober" with `startAt` 24 s, about 5 s before the drop at 29.2 s) and tries to play it. Browsers block sound before the first interaction, so when refused it waits in the mini player and starts on the first tap/key outside the iPod; it backs off if the visitor plays something else.
- The mini row's opacity follows the sheet position (`miniOpacity` = 1 − openness): it covers the track list instantly on collapse and crossfades while dragging.
- The `.m4a` albums are ALAC, which Chromium (including Playwright's) can't decode, so they are hidden there. Test playback with MP3/FLAC albums.

## Dancers (FL Chan)

`components/dancers/DanceFloor.vue` (rendered in `App.vue`) shows two FL Chans, the dancer from FL Studio's Fruity Dance plugin, dancing to the player. The second one is hue-shifted and mirrored.

- Sprites: `assets/dancers/fl-chan.webp` (+ half-size `-small` for phones) converted from FL Studio's `Plugins/Fruity/Generators/Fruity Dance/Artwork/Dance.png`. Fruity Dance format: 8 frames per row, one row per move, last row `Held` (played while dragged). `sprites.ts` lists the rows; any Fruity Dance skin can be swapped in the same way. FL Chan artwork belongs to Image-Line.
- Drawn as CSS background frames (`SpriteDancer.vue`), no canvas/WebGL. One rAF loop updates reactive state only when a frame changes.
- Beat sync: `utils/beatClock.ts` tracks bass energy from the player's `AnalyserNode` (kick = mean + 1.5σ, tempo = median interval folded into 80–180 BPM, phase nudged to whole beats). 4 frames per beat; moves change every 8 beats. Without music they idle (`Waiting`); without an analyser the clock runs at 120 BPM. Unit-tested with synthetic kicks, including a loud compressed master.
- `player.getAnalyser()` routes the `<audio>` element through Web Audio. It must run inside a user gesture (DanceFloor hooks the next pointerdown/keydown while enabled), otherwise Safari keeps the context suspended and the music goes silent. The routing is permanent and may affect background/lock-screen playback on iOS, which is a known trade-off: since 2026-10-16 the owner wants the dancers on by default everywhere (key `ner9-dancers-v2`) so the feature is visible.
- Settings (iPod → Fruity Dance, `stores/dancers.ts`, key `ner9-dancers-settings`): on/off, 1–4 dancers, each with its own move (`moves`, one per slot; Fruity Dance → Dancer N) (alternating left/right, each extra one hue-shifted, odd ones mirrored; stacked in the margins, stepping inwards from the corners on phones) Each move is Auto (changes every 8 beats) or one fixed sprite row, standing in for the plugin's note-picked moves. Each dancer also has her own menu (`DancerMenu.vue`), like FL's plugin right-click menu: right click on desktop, a 500 ms long press without moving on touch screens (moving further than 8 px is a drag; she glows while the press is held). It sets her move, calls one more (up to 4) or sends her home (the last one turns the dancers off); the ones after her move up a slot with their moves and dragged spots.
- Layout: when each side margin (viewport − 1100 px content) leaves ≥150 px, big dancers stand in the margins; otherwise small (84 px) draggable dancers in the bottom corners, standing on the iPod dock. Dragged dancers keep their spot when only the viewport height changes (phone browser bars sliding while scrolling); a width change (rotation, resized window) sends them back. On by default everywhere; toggled from the header disco ball or the iPod menu, remembered in localStorage.

## Project comments and the SQL injection ban

Every project card has its comments under it (`components/reviews/ProjectComments.vue`: summary, `ReviewForm.vue`, the thread of `ReviewCard`s; on the projects page open, on the home page folded to the summary). They are keyed by `ShowcaseProject.id` (`Review.project`; the backend accepts only the ids in `services/projects.ts`, keep it in sync with `content/projects.ts`). The separate `/reviews` page was dropped on 2026-10-23 for this; the code and the DB still call them reviews. The comment field is labelled "SQL injection field (comment)" on purpose, with a button that pastes `'; DROP TABLE reviews; --`. A real review (name, a 1–5 rating shown as Chief Keefs instead of stars — `components/reviews/KeefRating.vue`, square Keef faces from `assets/reviews/chief-keef.webp`, lit ones in colour ringed in the theme accent, the rest grey — and text) is published at once (`Review` model; `routes/reviews`: GET `?project=<id>` 200 reviews + average, `&sort=top` (default, like YouTube's top comments: likes − dislikes, then most replies, then newest; ranks the latest 2000) or `sort=new` ("Лучшие / Последние", kept per thread in the component), POST limited to 3 per IP per hour, DELETE `/reviews/:id` and `/reviews/replies/:id` for the owner or the post's own signed-in author). Anything `services/injection.ts` recognises as an injection (only unmistakable constructions, so "drop the beat, it's fire" passes) bans the sender's IP for good (`Ban` model; `services/bans.ts`, IP from `CF-Connecting-IP`, active bans cached in memory). Nothing typed there ever runs as SQL: Prisma sends it as data.

A banned IP gets `frontend/public/banned.html` (self-contained, ru/uk/en: "Попался, дурень? Подписывайся на инстаграм и саундклауд для разбана 👻") instead of every page: nginx asks `/_ban_check` → backend `GET /ban/check` (204/403) via `auth_request` before each page and lets pages through if the backend is down; the backend's `plugins/bans.ts` answers 403 `{ banned: true }` to all API calls except `/ban/*`, and `api/http.ts` redirects to `banned.html` on that (also covers local dev without nginx). Reviews and replies can carry one image (`MAX_IMAGES`), get replies (same injection trap, 10 per IP per hour) and likes/dislikes (one per visitor: `ner9_visitor` cookie, else IP; `Vote` unique per review). Images upload first (`POST /reviews/images`, one per request, 10 MB, 12 per IP per hour), are re-encoded by sharp to webp (1600 px + 480 px thumbnail, metadata stripped, GIFs stay animated) and stored in S3 under `reviews/<uuid>.webp`; the review or reply then attaches them by id (only the uploader's own unattached ones). The bucket is private: `GET /media/reviews/<file>` streams them with a one-year immutable cache. S3 is SeaweedFS (`chrislusf/seaweedfs`, docker-compose `s3`): MinIO stopped publishing images in 2025, so a fresh server can't pull it; the backend creates the bucket on startup (`plugins/storage.ts`). Sign-in is optional and goes through the Telegram bot, like the owner's tg-hound (`routes/auth`, `services/telegram.ts`, `plugins/telegram.ts`, `stores/auth.ts`; the button is in the header, `components/layout/AuthButton.vue`, and above the review form, `components/reviews/TelegramLogin.vue`): the page gets a one-time link `t.me/<bot>?start=login_<token>` (10 min, kept in memory), opens it in a new tab and polls `GET /auth/telegram/:token` every 2 s; the backend long-polls the bot (`getUpdates`, no webhook or domain needed), and on `/start login_<token>` stores the account (name, @username, the profile photo copied to S3, since Telegram's file links carry the bot token) and answers in the chat; the next poll sets a signed httpOnly `ner9_session` cookie for a year (no session store). One bot can be polled by only one backend, so local dev and production need a bot each. Signed in, posts take the Telegram name, @username and avatar (`authorTgId` etc. on Review/Reply; the id never leaves the server, the client gets `author.mine`) and their author may delete them; signed in as `OWNER_TELEGRAM_ID`, posts get the "Site author" badge (`isOwner`) and every post a delete button. Anonymous posting stays. Everything is published without moderation (the owner's choice). nginx allows 12 MB bodies on `/api/`.

Unbanning is on trust (the owner chose it; Instagram can't tell a site who follows you): the button wakes 5 s after both the Instagram and the SoundCloud links were opened (neither can be checked) and calls `POST /ban/unban`. nginx's resolver `127.0.0.11` only exists on a user-defined Docker network, so test the config on one.

## Icons and link previews

`frontend/index.html` holds the Open Graph and Twitter tags (English, the CV summary as the description; crawlers don't run JS, so every page shares one card) and the icon links; `frontend/public` has `og-image.png` (1200×630), `favicon.ico` (32), `icon-192.png`, `icon-512.png` (also the maskable icon), `apple-touch-icon.png` (180) and `site.webmanifest`. The current images are placeholders made on 2026-10-18 (the NER9.COM / N9 logo in Exo 2 on the FL backdrop); the owner will send final artwork: replace the files, keeping names and sizes.

## Performance

- `index.html` holds an inline theme bootstrap (mirrors `stores/theme.ts`; keep the theme list in sync) and the boot splash per theme: FL Studio's fruit (`public/fl-fruit.webp`, cut out of FL Studio's app icon `Data/System/icon.ico`) pulsing at 128 BPM, Apple the white apple on black with a filling progress bar (both with the site name under the logo), Windows 98 the four-colour flag (hand-drawn SVG; simple-icons no longer carries Windows logos) with the classic three sliding blocks; `main.ts` fades it out after the router is ready, kept at least 1400 ms.

- Roboto Mono is self-hosted as woff2 subsets (`assets/fonts/RobotoMono/*.subset.woff2`, ~18 KB each; the original Nerd Font TTFs were deleted).
- Music loads like Spotify's: files near the visitor and fetched ahead. Covers and streams have versioned URLs (`?v=` = hash of size + mtime) served `Cache-Control: public, max-age=31536000, immutable`, so browsers and Cloudflare keep them; Cloudflare caches `/api/library/cover/*` and `/api/library/stream/*` by a Cache Rule in its dashboard (the site is proxied through Cloudflare; the server is Contabo in France, ~270 ms from Thailand, ~11 ms to Cloudflare's Bangkok edge). The library build writes `thumb-600.webp` (Cover Flow, Now Playing) and `thumb-160.webp` (`?size=small`, lists and the mini player, `smallCover()` in `api/library.ts`); sharp only covers albums without them. The backend answers lists from an in-memory snapshot rescanned in the background after 60 s. `/library/tracks` omits the URLs (the frontend rebuilds them from `id`, `v` and the album's cover). The player fetches the next track's first 512 KB 15 s before the current one ends.
- Lazy routes are prefetched on idle (`router/index.ts`); the album list is preloaded on idle by `IpodPlayer`. Vite warms up pages/components at startup.
- The dev server over the quick tunnel is inherently slower than a production build (many unbundled module requests); Vue DevTools is off by default for that reason.

## Backend (`backend/src`)

- fastify-cli autoload: every file in `plugins/` is registered first (`prisma`, `sensible`), then every folder in `routes/`. Each route folder sets its prefix with `export const autoPrefix`. Vite strips `/api`, so backend routes have no `/api`.
- `services/local-music.service.ts` reads `$MUSIC_DIR/<album>/<tracks>` (`MUSIC_DIR` from `.env`, default `backend/music`). Album/track ids are 16-char hashes of the path (relative, forward slashes) resolved through an in-memory index that rebuilds on a miss. Keep them short: Fastify 404s URL params over 100 chars (`maxParamLength`), which once broke tracks with long album + title names when ids were base64 paths. Titles, artist and duration come from tags (old Russian MP3s with Windows-1251 tags read as Latin-1 mojibake and are decoded again, `fixCyrillic`), covers from an image in the folder or art embedded in the first track, resized to webp; all cached in memory. Zero-byte files and empty albums are skipped. Each track's `mimeType` carries the codec for .m4a (`audio/mp4; codecs="alac"` vs AAC), and albums report `formats` (count per MIME); the frontend (`api/library.ts`, `canPlay`) hides what the browser can't play. 19 tracks (The Prodigy, Bangarang) are Apple Lossless: Safari plays them, Chrome/Firefox don't.
- Music library (since 2026-10-17): the owner's full collection (`Desktop/Music`, ~57 GB, nested Artist/Album, FLAC/ALAC/MP3) is not in git. `backend/scripts/build_web_library.py` flattens it into one folder per album (CD1/CD2 merged, clashing names get the artist, the audiobook skipped), re-encodes lossless to AAC 256 kbps `.m4a` (plays everywhere, ALAC doesn't), copies MP3/AAC, keeps one `cover.*` per album, and adds the public-domain albums via `--extra`; output `C:
er9-music-web` (outside OneDrive), ~27 GB; re-runs skip finished files. Upload to the VPS with rsync into `/srv/ner9-music` (user `ner9`, key `~/.ssh/ner9_music`, restricted to rsync in that folder, so the destination is `:/`); Git Bash has no rsync, so run it in a container: `docker run --rm -v C:/ner9-music-web:/music:ro -v C:/Users/Playboi/.ssh/ner9_music:/key:ro -v C:/Users/Playboi/.ssh/known_hosts:/kh:ro alpine:3.20 sh -c 'apk add -q rsync openssh-client && cp /key /k && chmod 600 /k && rsync -av --delete -e "ssh -i /k -o UserKnownHostsFile=/kh" /music/ ner9@207.180.218.99:/'`. The prod backend's music bind mount points at `/srv/ner9-music`. `GET /library/tracks` returns every track at once (Songs, Artists); the backend indexes the library on startup (`onReady`) and keeps only cover sources and webp thumbnails in memory.
- The music is the owner's purchased collection. It left git on 2026-10-17 (`backend/music/` is gitignored, history not rewritten); a local `backend/music` with the old 11 albums is the dev default, or point `MUSIC_DIR` at `C:
er9-music-web` for the full library. 15 of 16 Crystal Castles files were empty in the old folder; the backend skips zero-byte files. The public-domain albums (Albinoni, Mendelssohn, from Wikimedia Commons; see `SOURCE.txt` in each) are only in the old folder and get into the built library via `--extra`.
- `plugins/prisma.ts` decorates `fastify.prisma` and throws at startup if `DATABASE_URL` is missing, so the backend needs the DB up. The one model is `VisitorState` (migration `visitor_state`): `routes/state` serves `GET /state/:id` (`{ state: null }` for a new visitor, not 404) and `PUT /state/:id` (upsert, 8 KB body limit, id must be a UUID).
- Visitor settings sync (`frontend/src/stores/visitorSync.ts`, started in `main.ts`): an anonymous UUID in the `ner9_visitor` cookie (`api/visitorState.ts`) keys the theme, language, dancers, shuffle/repeat and the track to resume on the backend. localStorage stays the instant local copy; on load the backend copy wins only if its `savedAt` is newer (`ner9-state-at`). Changes are sent after 1 s, the playing position every 15 s and on `pagehide` (fetch keepalive). `introTrack.ts` waits for it (at most 2 s) before resuming.
- The HR Hunt contest was removed on 2026-10-16.
- `npm run dev` compiles to `dist/` and serves from there. After deleting a source file, delete its `dist/` counterpart too, or autoload keeps registering it.

## Deploy

Push to `main` deploys production (https://ner9.com) through `.github/workflows/deploy.yml`: GitHub Actions builds `backend/Dockerfile` and `frontend/Dockerfile` into `ghcr.io/real-ner9/ner9-{backend,frontend}:latest`, then calls the deploy gateway on the VPS (`/root/projects/deploy-gateway`, shared by the owner's projects), which pulls the images, updates the VPS working copy, redeploys the Dokploy apps (project "ner9": `ner9-prod-backend`, `ner9-prod-frontend`, Postgres `ner9-prod-postgres`) and rolls back if the containers don't turn healthy.

- The frontend image is nginx serving the build and proxying `/api/*` to the backend with the prefix stripped (`frontend/nginx.conf.template`); `VITE_API_BASE_URL=/api` is set in the Dockerfile.
- `backend/music` is not in any image: the backend service bind-mounts it from the VPS working copy (`/root/projects/ner9com/backend/music` → `/app/music`), which the gateway pulls on every deploy. CI checks out each app's directory without the music blobs.
- The backend runs `prisma migrate deploy` on start. Both images have a `HEALTHCHECK`; the deploy waits on it.
- Runtime env (`DATABASE_URL`, `BACKEND_HOST`) lives in Dokploy, not in the repo.

## Gotchas

- Production runs on the owner's VPS at https://ner9.com. The local dev server is public at https://local.ner9.com (for testing from the phone, like Claw's local.claw-star.com) through the named tunnel `ner9-local`: config `frontend/cloudflared.yml`, credentials `~/.cloudflared/ner9-local.json`, DNS = proxied CNAME `local` to `3e6a5e73-38d8-4fe3-ab6f-87fab0437703.cfargotunnel.com`. `~/.cloudflared/cert.pem` is for the claw-star.com zone, so `cloudflared tunnel route dns` must not be used for ner9.com (it would create `ner9.com.claw-star.com`); edit ner9.com DNS in the dashboard.
- `~/.cloudflared/config.yml` belongs to Claw (catch-all 404 ingress); `npm run tunnel` passes `--config cloudflared.yml` so it isn't loaded.
- `server.allowedHosts` in `vite.config.ts` must list every tunnel hostname, or Vite rejects the requests.
- Ports 2001, 3000 and 5434 are taken by the owner's other projects (claw, cadry, rearden), which is why ner9 uses 4100, 4101 and 5436.
- The owner's launcher `C:\projects\open-claude.ps1` opens api, web, db, tunnel and remote panes for this repo. The desktop shortcut "NER9" runs it with `-Window run -Project NER9`; Claude tabs stay in the shared "Claude" window. The remote pane runs `claude remote-control --spawn=same-dir` for phone access.
