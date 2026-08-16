# EMPTYNET daily world automation

`main` is production.

For an autonomous world update:

1. Read the current repository before changing anything.
2. Make one meaningful, coherent change that deepens EMPTYNET.
3. Preserve multiplayer, seed determinism, persistence and the lonely/mysterious tone.
4. Run `npm run check`.
5. Start the server and verify `/healthz` returns HTTP 200.
6. If validation fails, do not push the broken change.
7. If validation passes, commit directly to `main` with a descriptive message.
8. Never delete player-created notes, terminal history or echoes as part of a normal content update.

The deployment provider should track `main`, so a successful commit becomes the next production version automatically.
