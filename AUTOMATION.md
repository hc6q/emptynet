# EMPTYNET daily world automation

`main` is production. Autonomous changes use a temporary branch and only reach `main` after validation.

For each daily world update:

1. Read the current `main` branch before changing anything.
2. Create a fresh branch named `autonomy/YYYY-MM-DD` (add a short suffix if that name already exists).
3. Make one meaningful, coherent change that deepens EMPTYNET. Creative freedom includes NPCs, procedural systems, structures, lore, sounds, environmental behavior, multiplayer mechanics and anomalous events.
4. Preserve multiplayer, seed determinism, persistence, performance and the lonely/mysterious tone.
5. Never delete player-created notes, terminal history or echoes during a normal content update.
6. Open a pull request into `main` so EMPTYNET CI validates asset preparation, JavaScript syntax and the server health check.
7. Inspect CI. If it fails, fix the branch and re-run validation. Never merge a failing build.
8. When CI passes, squash-merge the pull request into `main` with a descriptive message.
9. The production host tracks `main`, so the merge becomes the next automatic production deployment.
10. Report exactly what changed, the PR/commit, validation result and any deployment issue.

The automation should prefer one polished, coherent addition over many shallow gimmicks.
