import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const $ = selector => document.querySelector(selector);
const gate = $('#gate');
const game = $('#game');
const canvas = $('#view');
const nameInput = $('#name');
const connectBtn = $('#connect');
const statusEl = $('#node-status');
const loadingEl = $('#loading');
const feed = $('#feed');
const roomEl = $('#room');
const coordsEl = $('#coords');
const presenceEl = $('#presence');
const audioStateEl = $('#audio-state');
const hintEl = $('#hint');
const promptBox = $('#prompt');
const promptTitle = $('#prompt-title');
const promptText = $('#prompt-text');
const promptOk = $('#prompt-ok');
const promptCancel = $('#prompt-cancel');
const terminalBox = $('#terminal');
const terminalTitle = $('#terminal-title');
const terminalLog = $('#terminal-log');
const terminalInput = $('#terminal-input');
const terminalWrite = $('#terminal-write');
const terminalClose = $('#terminal-close');
const avatarCards = [...document.querySelectorAll('.avatar-card')];

const WORLD_SEED = 28031997;
const EYE_HEIGHT = 1.68;
const CHUNK_SIZE = 96;
const CHUNK_RADIUS = 4;
const STRUCTURE_CELL = 176;
const TRAIL_SPACING = 520;
const WORLD_SOFT_LIMIT = 1000000;
const LAKE = { x: -38, z: 58, rx: 14, rz: 9.5, level: -0.25 };
const TERMINAL_SITES = [
  { id: 'north-temple', title: 'NORTHERN FIELD TERMINAL', x: 8.5, z: -31.0, rot: 2.72 },
  { id: 'east-ruins', title: 'EASTERN FIELD TERMINAL', x: 39.0, z: 35.5, rot: -2.35 },
  { id: 'west-ruins', title: 'WESTERN FIELD TERMINAL', x: -41.0, z: 30.0, rot: 2.25 }
];
const RUINS = [
  { x: 0, z: -39, rot: 0.04, scale: 1.14, name: 'NORTHERN TEMPLE', terminal: 'north-temple', terminalOffset: [5.3, 0.58, 0.0] },
  { x: 51, z: 24, rot: -0.56, scale: 0.98, name: 'EASTERN RUINS', terminal: 'east-ruins', terminalOffset: [4.8, 0.58, -0.4] },
  { x: -53, z: 17, rot: 0.62, scale: 0.90, name: 'WESTERN RUINS', terminal: 'west-ruins', terminalOffset: [-4.8, 0.58, 0.3] },
  { x: 39, z: -73, rot: -0.18, scale: 0.84, name: 'LOW TEMPLE', terminal: null },
  { x: -70, z: -53, rot: 0.30, scale: 0.76, name: 'BROKEN COURT', terminal: null }
];
const PATH_CONTROL_SETS = [
  [[0, 7], [1, -9], [-2, -24], [0, -39], [8, -55], [22, -66], [39, -73]],
  [[0, -9], [15, -2], [31, 9], [51, 24]],
  [[-1, 4], [-17, 7], [-34, 12], [-53, 17]],
  [[-4, 8], [-12, 25], [-26, 40], [-38, 50]],
  [[-53, 17], [-61, -7], [-66, -31], [-70, -53]]
];

let ws;
let myId = '';
let myName = '';
let joined = false;
let initialized = false;
let scene;
let camera;
let renderer;
let controls;
let clock;
let assets = {};
let keys = Object.create(null);
let colliders = [];
let interactives = [];
let players = new Map();
let notes = new Map();
let terminalData = {};
let pendingNotes = [];
let worldEchoes = [];
let activeTerminal = null;
let promptMode = null;
let lastMoveSend = 0;
let currentZone = 'MEADOW';
let waterMesh = null;
let waterNormal = null;
let stalker = null;
let nextStalkerAt = 0;
let nextSignalGlitchAt = 0;
let signalGlitchTimer = null;
let ghostPlayback = null;
let nextGhostAt = 0;
let audioEnabled = true;
let audioCtx = null;
let masterGain = null;
let ambientBus = null;
let reverbGain = null;
let dryGain = null;
let lastFootstepAt = 0;
let movingLastFrame = false;
let spawnHeight = 0;
let selectedAvatar = 'wanderer';
let loadedChunks = new Map();
