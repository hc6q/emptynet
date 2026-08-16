# EMPTYNET // Field Node 06

Persistent multiplayer field built with Three.js and a dependency-free Node.js WebSocket server.

Seed: `28031997`

## Run locally

Requires Node.js 20+.

```bash
npm run prepare:assets
npm start
```

Open `http://localhost:8080`.

The asset preparation step downloads the CC0 Poly Haven textures used by the world and generates the tiny procedural noise/water-normal textures. Once downloaded, the files stay in `public/assets/`.

## Controls

- WASD / arrows: move
- Mouse: look
- E: interact
- T: local chat
- N: leave a persistent note
- M: mute / unmute ambience
- Esc: release mouse

## v0.8.0

- Deterministic seed-based world
- Streaming 9×9 chunk window
- Three terrain LOD levels
- Procedural trails, cabins, shrines, ponds and watchtowers
- Carved water basins and terrain-following paths
- CRT terminal stations
- Four selectable player shells
- Multiplayer proximity chat
- Persistent notes, terminal entries and movement echoes
- Observer/stalker system

## Persistence

`world-data.json` stores notes, terminal entries and recent movement echoes. Set `DATA_DIR` to place it on a persistent disk in production.

## Automatic deployment

This repository is prepared for continuous deployment. `main` is the production branch. The daily EMPTYNET automation is expected to test changes before committing to `main`; a connected hosting provider can then deploy every successful commit automatically.

`render.yaml` is included for a Render Blueprint. A persistent disk is configured at `/var/data`; the server reads `DATA_DIR=/var/data`.

## Assets

See `ASSET_CREDITS.md`. Visual source assets are CC0 from Poly Haven. `scripts/fetch-assets.mjs` retrieves them from Poly Haven's public API during setup.
