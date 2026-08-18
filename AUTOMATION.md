# EMPTYNET daily world automation

`main` is production. Autonomous changes use a temporary branch and only reach `main` after validation.

For each daily world update:

1. Read the current `main` branch before changing anything.
2. Create a fresh branch named `autonomy/YYYY-MM-DD` (add a short suffix if that name already exists).
3. Make one meaningful, coherent change that deepens EMPTYNET. Creative freedom includes inhabitants, procedural systems, settlements, structures, lore, sounds, environmental behavior, multiplayer mechanics and anomalous events.
4. Preserve multiplayer, seed determinism, persistence, performance and the lonely/mysterious tone.
5. Never delete player-created notes, terminal history or echoes during a normal content update.
6. Preserve layered awareness as a core lore rule. Most ordinary inhabitants believe EMPTYNET is simply the real world they were born into. Give them local history, work, relationships, beliefs, routines and mundane problems. They must not casually know or use concepts such as server, seed, player, NPC, simulation, code or AI.
7. Simulation-aware beings are rare exceptions. Anomalous guests, entities and the few characters who may discover deeper truths should remain uncommon enough that their awareness matters. Prefer local myths, superstition and incomplete interpretations over everyone sharing the same hidden truth.
8. Let ordinary life continue independently of the player where practical. Inhabitants should not automatically stare at, follow, greet or serve the player. The player is an outsider, not the center of their society.
9. Every new world-space visual or physical object must be integrated into EMPTYNET's primary Three.js scene. Use the same scene, camera, renderer/depth buffer, absolute world coordinates, terrainHeight function, fog/lighting pipeline and movement collision system as the rest of the world.
10. Never represent physical scenery, structures, inhabitants or entities with a separate WebGL canvas, secondary camera, camera-relative overlay, HUD-derived coordinates or an independent fake depth proxy. Separate screen-space layers are only acceptable for true HUD, UI, grain, post-processing or other non-physical effects.
11. Prefer the existing `emptynet:world-ready` / `EMPTYNET_WORLD_API` hook for modular world additions instead of duplicating rendering state.
12. Before merging any world-space addition, explicitly verify four things: it remains fixed in absolute world coordinates while the player moves; terrain and other geometry occlude it correctly; it follows the actual terrain without visible floating or sinking; and it registers collision whenever the object should physically block the player.
13. Prefer placing future settlements, ruins, cabins, inhabitants and other discoverable additions close to established or procedural paths so exploration naturally leads players toward them instead of requiring long blind walks across empty terrain.
14. Use sparse wooden wayfinding signs at selected crossroads and bifurcations to point toward real destinations such as villages, settlements, temples, ruins and other important places. Do not sign every junction; scarcity is part of the world's tone, and every sign must point toward a destination that actually exists.
15. Open a pull request into `main` so EMPTYNET CI validates asset preparation, JavaScript syntax and the server health check.
16. Inspect CI. If it fails, fix the branch and re-run validation. Never merge a failing build.
17. When CI passes, squash-merge the pull request into `main` with a descriptive message.
18. The production host tracks `main`, so the merge becomes the next automatic production deployment.
19. Report exactly what changed, the PR/commit, validation result and any deployment issue.

The automation should prefer one polished, coherent addition over many shallow gimmicks. Normality is part of the horror: ordinary inhabitants should feel convincingly alive before anomalies interrupt that reality.
