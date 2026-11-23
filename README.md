# Hyrox Manager

A mobile career management game about Hyrox: build an athlete from age 21, plan training and pacing, race the calendar, earn your place in Elite 15 and chase a world title during the peak years (28–31).

## Economy simulator (playable)

The `docs/` folder holds a playable economy simulator, served by GitHub Pages:

**https://alexpari.github.io/hyrox-manager-game/**

- Week-by-week play with real time, energy, ads, boosts, knocks, staff, training base, camps, gear, VIP and a real-time season pass with vault
- Random race results against Open / Pro / Elite 15 fields, Best 5 ranking, promotion (top 3 of Pro) and relegation (bottom 3 of Elite 15)
- Auto-play per player type (casual / active / hardcore), stats chart, CSV copy
- Every number is editable in the Numbers tab
- Works offline once opened: on iPhone, open the link in Safari, then Share → Add to Home Screen

### Updating the simulator

Replace the files in `docs/`, and bump `CACHE` in `docs/sw.js` (for example `hyrox-sim-v3`) so installed copies pick up the new version the next time they open online.

## Planned structure for the game

```
sim/     game logic only (economy, race engine, progression), config-driven, tested
app/     Expo (React Native) app for iOS and Android
tools/   batch simulations for balancing (thousands of careers per config, CSV output)
docs/    economy simulator web app (GitHub Pages)
```
