# Hyrox Manager

A mobile career management game about Hyrox: build an athlete from age 21, plan training and pacing, race the calendar, earn your place in Elite 15 and chase a world title during the peak years (28–31).

## Structure

```
sim/     game logic only (no UI): athlete model, races, economy, ranking, qualification, season pass, saves
tools/   balancing tools (batch simulation of thousands of careers, quick tuning loop)
docs/    playable economy simulator web app, served by GitHub Pages (still on the v1 race model)
app/     (next) Expo / React Native app for iOS and Android, built on sim/
```

## Game logic (`sim/`)

- **One config** (`sim/src/config.ts`) holds every tunable number. Its shape is ready to come from Remote Config later.
- **One game state**: plain JSON, so it saves, syncs and migrates easily (`sim/src/save.ts`, versioned with migrations; v1 saves upgrade to v2).
- **Seeded randomness**: the same seed and the same actions replay exactly the same career, which makes bugs reproducible and balancing comparable.
- **Actions** return `{ ok, events }` or `{ ok: false, error }`. Events (training, race result with splits, knock, pass tier, season end, ...) carry data, not text, so the app can show them in any language.
- **Auto-play profiles** play whole careers for balancing: casual, active on autopilot, active (smart), hardcore (races everything).

### Athlete and race model (v2, `sim/src/athlete.ts`)

- **9 stats**: Running (8 × 1 km) and the 8 stations. The overall rating (OVR) is their average weighted by each segment's share of race time, so running counts for about half.
- **Race time**: each segment's time comes from its stat (rating 100 everywhere = 53:20, about the world record). A race returns the finish time, the winner's time and 10 splits (9 segments + Roxzone).
- **Weekly choices**:
  - training block: Run, Engine (Ski, Row, Burpees), Strength (Sleds, Farmers, Lunges), Hybrid (Wall Balls, Lunges, Burpees, Run) or Balanced (autopilot, 15% less efficient);
  - intensity: light, normal or hard;
  - race pacing: conservative (safer), even, or aggressive (faster on average, riskier, can blow up).
- **Gains** close a share of each stat's gap to 100, so the weakest stations improve fastest. Gains drop with age (×1 up to 24, ×0.75 to 27, ×0.3 to 31). Stats decline from age 32.
- **Fatigue** (0–100) rises with hard weeks and races and falls with light weeks and recovery (physio, nutritionist, recovery room, cryo). It costs race time and raises the weekly knock chance. Racing or training hard on a knock can turn it into an injury. Race weeks give 65% of a normal training week.
- **Staff and facilities** have effects: training gains, running gains, knock chance, recovery, race-day bonus, consistency (less randomness and fewer blow-ups) and slower decline.

### Balancing results (500 careers per profile, `npm run batch`)

| Profile | Reaches Elite 15 | World champion | Coins at retirement |
|---|---|---|---|
| Casual · free (autopilot) | 100% (median S8) | 0% | ~13k |
| Active · autopilot | 100% (median S8) | 2% | ~15k |
| Active · smart | 100% (median S7) | 70% (1.1 titles, first at S10) | ~44k |
| Hardcore · races everything | 100% (median S7) | 49% | ~37k |

A smart player who never hires staff peaks about 7 OVR lower and never wins a title.

```bash
npm install
npm test            # rules tests
npm run typecheck   # TypeScript check
npm run batch -- --runs 500 --seed 1   # simulate careers, summary + CSV in tools/out/
npm run tune -- 150 '{"training":{"rate":0.05}}'   # try config changes without editing code
```

## Economy simulator (playable)

**https://alexpari.github.io/hyrox-manager-game/**

- Week-by-week play with real time, energy, ads, boosts, knocks, staff, training base, camps, gear, VIP and a real-time season pass with vault
- Random race results, Best 5 ranking, promotion (top 3 of Pro) and relegation (bottom 3 of Elite 15)
- Auto-play per player type, stats chart, CSV copy; every number editable in the Numbers tab
- Works offline once opened: on iPhone, open the link in Safari, then Share → Add to Home Screen

To update it, replace the files in `docs/` and bump `CACHE` in `docs/sw.js` (for example `hyrox-sim-v3`) so installed copies pick up the new version the next time they open online.
