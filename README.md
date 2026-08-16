# EMPTYNET

A persistent multiplayer 3D world built with Three.js, Node.js and WebSockets.

This repository is the canonical source for EMPTYNET. The world is seeded, procedurally streamed, persistent, and intentionally sparse and mysterious.

## Run locally

```bash
node server.js
```

Open `http://localhost:8080`.

## Controls

- WASD / arrows: move
- Mouse: look
- E: interact
- T: local chat
- N: leave a persistent note
- M: toggle audio

## World

Seed: `28031997`

The server keeps persistent notes, terminal entries and player echoes in `world-data.json` at runtime.

## Deployment

The app requires a Node.js runtime with WebSocket support and persistent storage if you want notes, terminal history and echoes to survive restarts.
