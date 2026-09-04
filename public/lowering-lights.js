import * as THREE from 'three';

// A rare synchronized procession between Node 7 and the Old Watch well.
// Locals have no shared explanation for it; at most, road stories call these
// wandering lamps seen after bad fog. The deeper interpretation remains gated.
const START = { x: 625, z: -430 };
const WELL = { x: 646, z: -407 };
const ACTIVE_DISTANCE = 360;
const CYCLE_MS = 21 * 60 * 1000;
const EVENT_MS = 78 * 1000;
const WORLD_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight) return;
  installed = true;

  const { scene, camera, terrainHeight, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Lowering_Lights';
  root.visible = false;
  scene.add(root);

  const iron = new THREE.MeshStandardMaterial({ color: 0x1c211f, roughness: 0.86, metalness: 0.20 });
  const glassMaterials = [];
  const glowMaterials = [];

  const mark = mesh => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  function makeLantern(index, stationary = false) {
    const group = new THREE.Group();
    group.name = stationary ? 'Seventh_Light' : `Lowering_Light_${index + 1}`;

    // Open iron cage: the glow is real scene geometry and remains visible through
    // the frame while still being occluded normally by terrain and structures.
    for (const x of [-0.11, 0.11]) {
      for (const z of [-0.11, 0.11]) {
        const post = mark(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.38, 0.025), iron));
        post.position.set(x, 0, z);
        group.add(post);
      }
    }
    for (const y of [-0.19, 0.19]) {
      const plate = mark(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.28), iron));
      plate.position.y = y;
      group.add(plate);
    }

    const glass = new THREE.MeshStandardMaterial({
      color: stationary ? 0xa7b9aa : 0xc9b57b,
      emissive: stationary ? 0x557862 : 0x826735,
      emissiveIntensity: stationary ? 0.75 : 1.15,
      transparent: true,
      opacity: 0,
      roughness: 0.30,
      depthWrite: false
    });
    glassMaterials.push(glass);

    const pane = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glass);
    pane.scale.set(1.0, 1.25, 1.0);
    group.add(pane);

    const glow = new THREE.MeshBasicMaterial({
      color: stationary ? 0x91b39a : 0xd3bb78,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    glowMaterials.push(glow);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), glow);
    halo.scale.set(1.0, 1.18, 1.0);
    group.add(halo);

    const handle = mark(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 14, Math.PI), iron));
    handle.rotation.z = Math.PI;
    handle.position.y = 0.24;
    group.add(handle);

    root.add(group);
    return group;
  }

  const moving = Array.from({ length: 6 }, (_, i) => makeLantern(i));
  const seventh = makeLantern(6, true);

  // Curves remain in absolute world coordinates. Y is sampled from terrain every frame.
  // The final section sinks beneath the well lip so the shared terrain/depth buffer
  // naturally occludes each light instead of using a screen-space disappearance.
  const path = [
    { x: 627.0, z: -428.5 },
    { x: 631.5, z: -425.0 },
    { x: 636.0, z: -420.4 },
    { x: 640.7, z: -415.6 },
    { x: 644.1, z: -411.0 },
    { x: WELL.x, z: WELL.z }
  ];

  function samplePath(t) {
    const scaled = THREE.MathUtils.clamp(t, 0, 1) * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(scaled));
    const f = scaled - i;
    return {
      x: THREE.MathUtils.lerp(path[i].x, path[i + 1].x, f),
      z: THREE.MathUtils.lerp(path[i].z, path[i + 1].z, f)
    };
  }

  function smoothstep(a, b, x) {
    const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  let eventAnnouncedSlot = -1;
  let deepAnnouncedSlot = -1;

  function deepContext() {
    return localStorage.getItem('emptynet_keeper_tally_found') === '1' &&
      localStorage.getItem('emptynet_node7_keeper_answered') === '1';
  }

  function emit(text, lifespan = 16000) {
    if (typeof addFeed === 'function') addFeed(text, true, lifespan);
  }

  function frame(now) {
    requestAnimationFrame(frame);

    const wallNow = Date.now();
    const sinceEpoch = Math.max(0, wallNow - WORLD_EPOCH_MS);
    const slot = Math.floor(sinceEpoch / CYCLE_MS);
    const phaseMs = sinceEpoch % CYCLE_MS;
    const active = phaseMs < EVENT_MS;

    const midpointX = (START.x + WELL.x) * 0.5;
    const midpointZ = (START.z + WELL.z) * 0.5;
    const distance = Math.hypot(camera.position.x - midpointX, camera.position.z - midpointZ);
    root.visible = active && distance < ACTIVE_DISTANCE;
    if (!root.visible) return;

    const eventT = phaseMs / EVENT_MS;
    const fadeIn = smoothstep(0.0, 0.07, eventT);
    const fadeOut = 1 - smoothstep(0.90, 1.0, eventT);
    const overallAlpha = fadeIn * fadeOut;

    // The seventh light never travels. It remains close to the tower and pulses once
    // for every cycle of the six moving lights.
    seventh.position.set(START.x + 1.4, terrainHeight(START.x + 1.4, START.z + 1.1) + 1.75, START.z + 1.1);
    seventh.rotation.y = 0.24;
    const seventhAlpha = overallAlpha * (0.42 + 0.16 * Math.sin(now * 0.0017));
    glassMaterials[6].opacity = Math.max(0, seventhAlpha);
    glowMaterials[6].opacity = Math.max(0, seventhAlpha * 0.34);

    moving.forEach((lantern, i) => {
      const delay = i * 0.055;
      const travel = THREE.MathUtils.clamp((eventT - 0.09 - delay) / 0.67, 0, 1);
      const p = samplePath(travel);
      const ground = terrainHeight(p.x, p.z);
      const sink = smoothstep(0.84, 1.0, travel) * (1.8 + i * 0.08);
      lantern.position.set(p.x, ground + 1.45 - sink, p.z);

      const ahead = samplePath(Math.min(1, travel + 0.01));
      lantern.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
      lantern.rotation.z = Math.sin(now * 0.0012 + i * 1.6) * 0.035;

      const localFadeIn = smoothstep(0.08 + delay, 0.15 + delay, eventT);
      const localFadeOut = 1 - smoothstep(0.73 + delay, 0.87 + delay, eventT);
      const alpha = overallAlpha * localFadeIn * localFadeOut;
      glassMaterials[i].opacity = alpha;
      glowMaterials[i].opacity = alpha * 0.42;
      lantern.visible = alpha > 0.015;
    });

    if (distance < 95 && eventAnnouncedSlot !== slot && eventT > 0.10) {
      eventAnnouncedSlot = slot;
      emit('Six lanterns are moving along the Old Watch road. No footsteps move with them.', 17000);
    }

    if (distance < 70 && deepContext() && deepAnnouncedSlot !== slot && eventT > 0.62) {
      deepAnnouncedSlot = slot;
      localStorage.setItem('emptynet_lowering_lights_seen', '1');
      emit('The six lights reach the well in the same order as the keeper tally. One by one, they pass below the ground. The seventh never leaves the Watch.', 26000);
    }
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
