# Production deployment

The repository is ready for automatic deployment from `main`.

## Render Blueprint

1. Create a new Blueprint in Render from `hc6q/emptynet`.
2. Keep `render.yaml` as the Blueprint path.
3. Deploy the Blueprint once.

After that, commits to `main` trigger production deploys automatically. The Blueprint provisions a Node web service with `/healthz` checks, WebSocket support and a persistent disk mounted at `/var/data` for EMPTYNET world state.

The daily EMPTYNET automation is configured to treat `main` as production and only commit validated world changes.
