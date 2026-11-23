# Hyrox Manager

A mobile career management game about Hyrox: build an athlete from age 21, plan training and pacing, race the calendar, earn your place in Elite 15 and chase a world title during the peak years (28–31).

## Structure

```
sim/     game logic only (no UI): economy, races, ranking, qualification, season pass, saves
tools/   balancing tools (batch simulation of thousands of careers)
docs/    playable economy simulator web app, served by GitHub Pages
app/     (next) Expo / React Native app for iOS and Android, built on sim/
```

## Game logic (`sim/`)

- **One config** (`sim/src/config.ts`) holds every tunable number, the same values as the balancing sheet. Its shape is ready to come from Remote Config later.
- **One game state**: plain JSON, so it saves, syncs and migrates easily (`sim/src/save.ts`, versioned with migrations).
- **Seeded randomness**: the same seed and the same actions replay exactly the same career, which makes bugs reproducible and balancing comparable.
- **Actions** return `{ ok, events }` or `{ ok: false, error }`. Events (race result, knock, pass tier, season end, ...) carry data, not text, so the app can show them in any language.
- **Auto-play profiles** (casual / active / hardcore) play whole careers for balancing.

```bash
npm install
npm test            # rules tests
npm run typecheck   # TypeScript check
npm run batch -- --runs 500 --seed 1   # simulate careers, summary + CSV in tools/out/
```

## Economy simulator (playable)

**https://alexpari.github.io/hyrox-manager-game/**

- Week-by-week play with real time, energy, ads, boosts, knocks, staff, training base, camps, gear, VIP and a real-time season pass with vault
- Random race results, Best 5 ranking, promotion (top 3 of Pro) and relegation (bottom 3 of Elite 15)
- Auto-play per player type, stats chart, CSV copy; every number editable in the Numbers tab
- Works offline once opened: on iPhone, open the link in Safari, then Share → Add to Home Screen

To update it, replace the files in `docs/` and bump `CACHE` in `docs/sw.js` (for example `hyrox-sim-v3`) so installed copies pick up the new version the next time they open online.
