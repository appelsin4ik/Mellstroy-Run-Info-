// =======================
// MELLSTROY RUN YEEEAH
// =======================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
// 🖐️ Touch control only inside the game canvas
canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
const scoreEl = document.getElementById("scoreDisplay");
const restartBtn = document.getElementById("restart");

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


//Дима добавил для отображения счета после проигрыша
const finalScoreDisplay = document.getElementById("finalScoreDisplay");

const menu = document.getElementById("menu");
const playBtn = document.getElementById("playBtn");
const container = document.getElementById("container");
const gameMusic = document.getElementById("gameMusic");
gameMusic.volume = 0.15;   // выбери нужное число (0..1)
const introSound = document.getElementById("introSound");

// СЛОТЫ гыгы
const slotMachineContainer = document.getElementById("slotMachineContainer");
const spinBtn = document.getElementById("spinBtn");
const slotMessage = document.getElementById("slotMessage");

// --- лампы вокруг окна слотов (рамка из 4-х сторон) ---
const slotWindow = document.querySelector(".slot-window");
const bulbFrame  = document.getElementById("bulbFrame");

let lightsReady = false;
let lightShowRunning = false;

let idleLightsOn = false;

let touchStartY = 0;
let touchMoved = false;

let nextSpinReward = 2500;

// путь обхода по периметру: top L→R, right T→B, bottom R→L, left B→T
function getBulbPath() {
  const top    = [...bulbFrame.querySelector('.top')?.children || []];
  const right  = [...bulbFrame.querySelector('.right')?.children || []];
  const bottom = [...bulbFrame.querySelector('.bottom')?.children || []].reverse();
  const left   = [...bulbFrame.querySelector('.left')?.children || []].reverse();
  return [...top, ...right, ...bottom, ...left];
}

function startIdleLights(force = false) {
  if (!lightsReady) return;
  if (idleLightsOn && !force) return;
  idleLightsOn = true;
  document.querySelectorAll('#bulbFrame .bulb').forEach(b => {
    b.classList.add('idlePulse');
    b.classList.remove('on');
  });
}

function stopIdleLights() {
  if (!idleLightsOn) return;
  idleLightsOn = false;
  document.querySelectorAll('#bulbFrame .bulb').forEach(b => {
    b.classList.remove('idlePulse');
    b.classList.remove('on');
  });
}

// Генерация ламп по периметру окна (4 стороны)
function buildBulbFrame() {
  if (!slotWindow || !bulbFrame) return;

  // размеры окна слотов
  const winRect = slotWindow.getBoundingClientRect();

  // стороны внутри рамки
  const sides = {
    top:    bulbFrame.querySelector('.top'),
    right:  bulbFrame.querySelector('.right'),
    bottom: bulbFrame.querySelector('.bottom'),
    left:   bulbFrame.querySelector('.left'),
  };
  if (!sides.top || !sides.right || !sides.bottom || !sides.left) return;

  // размеры лампы и шаг
  const LAMP = 12;      // px — совпадает с CSS
  const GAP  = 8;       // расстояние между лампами
  const PADH = 20;      // горизонтальные внутренние отступы (как в CSS: padding:0 10px)
  const PADV = 20;      // вертикальные отступы (как в CSS: padding:10px 0)

  const w = Math.max(0, slotWindow.clientWidth  - PADH);
  const h = Math.max(0, slotWindow.clientHeight - PADV);

  const countTop  = Math.max(6, Math.floor(w / (LAMP + GAP)));
  const countSide = Math.max(4, Math.floor(h / (LAMP + GAP)));

  // утилита заполнения
  const fill = (el, n) => {
    el.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'bulb';
      el.appendChild(b);
    }
  };

  fill(sides.top,    countTop);
  fill(sides.bottom, countTop);
  fill(sides.left,   countSide);
  fill(sides.right,  countSide);

  lightsReady = true;
  if (!isActiveRun()) startIdleLights(true);
}

// перестраивать при ресайзе
window.addEventListener('resize', () => {
  lightsReady = false;
  buildBulbFrame();

  // если мы в состоянии ожидания — вернём мягкий пульс
  if (!isActiveRun()) startIdleLights(true);
});

// === Новая DOM-структура слотов ===
const slotDoorsRoot = document.getElementById("slotDoors");

// в этой версии не используем reelElements (оставим как есть для совместимости)
// const reelElements = [...]  // можно оставить, но больше не трогаем

// Создаёт 3 двери с пустыми лентами (если вдруг не созданы)
function buildSlotDoors() {
  if (!slotDoorsRoot) return;
  // Уже размечено в HTML тремя .door -> .boxes, просто проверим
  const doors = slotDoorsRoot.querySelectorAll(".door .boxes");
  if (doors.length !== 3) {
    console.warn("Expected 3 doors, found:", doors.length);
  }
}

// символы: используем твои же три текстуры препятствий
// индексы: 0: lime, 1: chery, 2: banana (см. obstacleImages)
const SYMBOL_INDEX = { LIME: 0, CHERRY: 1, BANANA: 2 };

// util: создать div.box с <img> по индексу
function makeBox(symbolIndex, doorEl) {
  const box = document.createElement("div");
  box.className = "box";
  box.style.width  = doorEl.clientWidth + "px";
  box.style.height = doorEl.clientHeight + "px";
  const img = document.createElement("img");
  img.src = obstacleImages[symbolIndex].src;
  img.alt = "symbol";
  box.appendChild(img);
  return box;
}

const coinDisplay = document.getElementById("coinDisplay"); // Вы уже объявили

let playerCoins = 10; // НАЧАЛЬНЫЙ БАЛАНС
let isSpinning = false;
const spinCost = 1;
const jackpotObject = { type: 'SpeedBoost', value: 300 }; // Что выигрывается
// ...

// блок переменныз для работы лидерборда
const playerNameInput = document.getElementById("playerNameInput");
const nameError = document.getElementById("nameError");
const leaderboardContainer = document.getElementById("leaderboardContainer");
const leaderboardList = document.getElementById("leaderboardList");

let deltaTime = 0;

let playerSpins = 3;
const MAX_SPINS = 3;

// 🎰 sync spins with DB
async function fetchPlayerSpins(playerName) {
  if (!userId || !playerName) return;
  try {
    const res = await fetch(`/api/spins/by-id/${encodeURIComponent(userId)}/${encodeURIComponent(playerName)}`);
    if (!res.ok) throw new Error("Failed to load spins");
    const data = await res.json();
    playerSpins = Math.min(data.spins ?? 3, MAX_SPINS);
    updateSpinButton();
  } catch (err) {
    console.warn("⚠️ Ошибка загрузки вращений:", err);
  }
}

async function savePlayerSpins(playerName, spins) {
  if (!userId || !playerName) return;
  try {
    await fetch("/api/spins/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: playerName,
        spins: Math.min(spins, MAX_SPINS)
      })
    });
  } catch (err) {
    console.warn("⚠️ Ошибка сохранения вращений:", err);
  }
}

// =======================
// #new — пер-устройство UID
// =======================
const USER_ID_KEY = 'msr_userId';

function getOrCreateUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      if (crypto && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID();
      } else {
        // простой fallback генератора
        id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      }
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch (e) {
    // если localStorage недоступен — создаём volatile id на сессию
    return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

const userId = getOrCreateUserId();

// #new — per-identity localStorage helpers
function lsKey(name, key) {
  return `msr:${userId}:${name}:${key}`;
}
function lsGet(name, key, fallback) {
  try {
    const raw = localStorage.getItem(lsKey(name, key));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function lsSet(name, key, value) {
  try { localStorage.setItem(lsKey(name, key), JSON.stringify(value)); } catch {}
}

// для отладки можно открыть в консоли: window.__msrUserId = userId;

// лет на хранение именя до конца сессии
let currentPlayerName = "";

/* 
 =========== GAME OPTIONS ===========
*/ 

// ---- Game progression ----
let level = 1;                // current difficulty level
let maxLevel = 12;             // cap so game doesn’t become impossible
let nextLevelScore = 1000;     // score threshold for next speed-up
let spawnChance = 0.01;       // base spawn probability per frame
let groupGap = 7;             // distance between grouped obstacles
let minSpawnGap = 200;        // minimum distance (pixels) before next group can appear
let obstacles = [];
let speed = 7;
let worldScrollSpeed = 0; // how fast the world is currently scrolling

let boostActive = false;
let boostTimer = 0;
const boostDuration = 0.8; // seconds
const boostMultiplier = 2.0; // how much faster the player moves temporarily

let score = 0;
let gameOver = false;
let gameStarted = false;
let canRestart = true; // controls when space restart is allowed
let spaceReleasedSinceDeath = true;

// ---- DEBUG ---
let debug = false; 

let frozenScene = null;
let currentFrameId = null;
let skipNextDelta = false;

let paused = false;
let windowUnfocused = false;

// --- JUMP CONTROL ----
let isJumping = false;
let jumpHoldTime = 0;
const maxJumpHold = 0.25; // seconds the player can hold to extend jump

// ---- Background ----
let currentBgIndex = 0;
let nextBgIndex = 1;
let bgAlpha = 1;              // opacity for current background
let bgTransitioning = false;  // if fade is active
let bgStepProcessed = 0;

let groundX = 0;              // current scroll offset
const groundSpeedFactor = 1; // moves slightly slower than game speed for parallax

let casinoOpen = false;
let shopOpen = false;


// ---- Start Image ----
let waitingForStart = false;
let pulseTime = 0;
let loopRunning = false;
let lastTime = 0;

// ---- Player ----
const groundY = 250;
let gravity = 0.6;
let jumpForce = -9;
let player = { 
  x: 50,
  y: groundY,
  vy: 0,
  width: 60,
  height: 60,
  jumping: false 
};
let wasInAir = false; // tracks if player was previously jumping
player.hitbox = {
  offsetX: 12,    // left padding
  offsetY: -30,     // top padding
  width: 48,      // collision box width
  height: 70      // collision box height
};
player.state = "idle";   // can be "idle", "run", "jump"
player.frameIndex = 0;
player.frameTimer = 0;
player.frameInterval = 70; // ms between frames

player.previewScale = 1;
player.previewBumpTime = 0;

// --- Coin ----
let coins = [];                  // active coins on screen
let floatingTexts = [];          // for "+1" effects
let lastCoinScore = 0;           // last score when a coin spawned
const coinSize = 32;             // image width/height
const coinMargin = 40;           // min distance from obstacles

// Track which score-based skins were already announced (to avoid repeated toasts)
let announcedUnlocks = new Set();

/* 
 =========== LOAD IMAGES ===========
*/ 

// ---- Load player animation frames ----
const playerFrames = {
  idle: new Image(),
  jump: new Image(),
  run: [new Image(), new Image()]
};

playerFrames.idle.src = "assets/player/character_1_idle_better.png";
playerFrames.jump.src = "assets/player/character_1_jump_better.png";
playerFrames.run[0].src = "assets/player/character_1_run_1_better.png";
playerFrames.run[1].src = "assets/player/character_1_run_2_better.png";


// ---- Load obstacle images ----
const obstacleImages = [
  new Image(),
  new Image(),
  new Image(),
  new Image(),
  new Image
];
obstacleImages[0].src = "assets/images/lime.png";
obstacleImages[1].src = "assets/images/chery.png";
obstacleImages[2].src = "assets/images/banana.png";
obstacleImages[3].src = "assets/images/watermelon.png";
obstacleImages[4].src = "assets/images/plum.png";

// ---- Load background images ----
const backgroundImages = [
  new Image(),
  new Image(),
  new Image(),
  new Image(),
  new Image()
];
backgroundImages[0].src = "assets/backgrounds/bg_1.png";
backgroundImages[1].src = "assets/backgrounds/bg_2.png";
backgroundImages[2].src = "assets/backgrounds/bg_3.jpg";
backgroundImages[3].src = "assets/backgrounds/bg4.jpg";
backgroundImages[4].src = "assets/backgrounds/background_casion.JPG";

// ---- Load coin image ----
const coinImage = new Image();
coinImage.src = "assets/images/coin.png"; 

// ---- Load ground texture ----
const groundImage = new Image();
groundImage.src = "assets/images/asphalt.png";


const shieldImage = new Image();
shieldImage.src = "assets/images/shield_empty.png";


/* 
 =========== LOAD SOUNDS ===========
*/ 

// ---- Mega Jackpot sound ----
const jackpot = new Audio("assets/sounds/jackpot.mp3");
jackpot.volume = 1;
jackpot.currentTime = 1;
jackpot.preload = "auto";

const mini_jackpot = new Audio("assets/sounds/mini-jackpot.mp3");
mini_jackpot.volume = 1;
mini_jackpot.preload = "auto";

// ---- Lose ----
const loseSounds = [
  new Audio("assets/sounds/lose_1.mp3"),
  new Audio("assets/sounds/lose_2.mp3"),
  new Audio("assets/sounds/lose_3.mp3")
];

// Keep track of currently playing lose sounds
let activeLoseSounds = [];

// ---- Coin collection sounds ----
const coinSounds = [
  new Audio("assets/sounds/uhuuu_shorten.mp3"),
  new Audio("assets/sounds/bravoBossbravo.mp3"),
  new Audio("assets/sounds/amamam.mp3"),
  new Audio("assets/sounds/mmmBravo.mp3")
];

// Keep track of currently playing coin sounds
let activeCoinSounds = [];

// optional: volume balance
coinSounds.forEach(s => s.volume = 1);

// ---- Start / Restart Sounds ----
const startSound = new Audio("assets/sounds/speedup.mp3");

// Optional volume tweak
startSound.volume = 1;


// ------------- MENU -------------

// ⚡ Small independent loop for "Press SPACE" pulsing when paused or waiting
function drawPauseOverlay() {
  if (!waitingForStart) return; // draw only when needed

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Redraw last frame (the current blurred game screen)
  draw(dt);

  // Keep looping this animation for pulsing
  if (waitingForStart) {
    requestAnimationFrame(drawPauseOverlay);
  }
}

// Smoothly fade out any sound over a given duration (ms)
function fadeOutAudio(audio, duration = 800) {
  if (!audio || audio.paused) return;

  const startVolume = audio.volume;
  const step = startVolume / (duration / 50);

  const fade = setInterval(() => {
    if (audio.volume - step > 0.01) {
      audio.volume = Math.max(0, audio.volume - step);
    } else {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVolume; // reset for next play
    }
  }, 50);
}

function resetGameSettings() {

  groundX = 0;
  worldScrollSpeed = speed; // start at base speed

  nextSpinReward = 2500;


  // --- reset coins ---
  coins = [];
  floatingTexts = [];
  lastCoinScore = 0;

  // --- reset background ---
  currentBgIndex = 0;
  nextBgIndex = 1;
  bgAlpha = 1;
  bgTransitioning = false;
  bgStepProcessed = 0;

  // --- basic player/game state ---
  gameOver = false;
  score = 0;
  obstacles = [];
  player.y = groundY;
  player.vy = 0;
  player.jumping = false;

  // --- reset difficulty and spawn parameters ---
  level = 1;
  speed = 4;
  spawnChance = 0.01;
  nextLevelScore = 1000;
  minSpawnGap = 200;
  groupGap = 7;

  if (debug) console.log("Game reset to default settings");
}

// ------------- GAME -------------

function startGame() {

    // Shop disabling
    shopBtn.disabled = true;

    // Casino disabling
    spinBtn.disabled = true;
    casinoOpen = false;
    spinBtn.classList.remove("reenabled");

    // Play short start sound
    startSound.currentTime = 0;
    startSound.play().catch(err => console.warn("Start sound blocked:", err));

    resetGameSettings();

    stopIdleLights();

    // 🚀 Short starting speed boost
    boostActive = true;
    boostTimer = 0;

    // 💨 Massive dust burst at start
    // las number can be changed for more smoke!!!!
    createDustBurst(player.x + player.width * 0.4, groundY + player.height / 2, 30);

    console.log(`Level ${level} | speed=${speed.toFixed(2)} | chance=${spawnChance.toFixed(3)}`);

    gameStarted = true;
    restartBtn.style.display = "none";
    if (!loopRunning) {
      loopRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
}

function areBackgroundsLoaded() {
  return backgroundImages.every(img => img.complete && img.naturalWidth > 0);
}

function drawPlayer(deltaTime, forPreview = false) {
  let image;



  if (player.state === "run") {
    const frames = playerFrames.run;

      // 🧊 Freeze animation if paused
      if (!paused) {
        player.frameTimer += deltaTime * 1000;
        if (player.frameTimer >= player.frameInterval) {
          player.frameTimer = 0;
          player.frameIndex = (player.frameIndex + 1) % frames.length;
        }
      }

    image = frames[player.frameIndex];
  } else if (player.state === "jump") {
    image = playerFrames.jump;
  } else {
    image = playerFrames.idle;
  }

  // ===== PREVIEW POP ANIMATION =====
  if (forPreview) {
    // animate previewScale back to 1 smoothly
    if (player.previewBumpTime > 0) {
      player.previewBumpTime -= deltaTime;
      // ease-out scale curve: starts ~1.2 then falls to 1
      const t = 1 - Math.max(player.previewBumpTime, 0) / 0.15; // 0 -> 1 in 0.15s
      player.previewScale = 1.2 - 0.2 * t; // goes 1.2 -> 1.0
    } else {
      player.previewScale = 1;
    }

    const scale = player.previewScale;

    // draw centered with scale at player's x/y
    const drawW = (player.width + 10) * scale;
    const drawH = (player.height + 10) * scale;
    const drawX = player.x + (player.width + 10)/2 - drawW/2;
    const drawY = player.y - player.height / 2 + (player.height + 10)/2 - drawH/2;

    ctx.save();
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.restore();

  } else {
    // normal in-game rendering
    ctx.drawImage(image, player.x, player.y - player.height / 2, player.width + 10, player.height + 10);
  } 

  if (debug) {
    // yellow outline - hitbox
    const hb = player.hitbox;
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(player.x + hb.offsetX, player.y + hb.offsetY, hb.width, hb.height);

    // red outline -sprite
    ctx.strokeStyle = "rgba(255,0,0,0.5)";
    ctx.strokeRect(player.x, player.y, player.width, player.height);
  }

}

// --- ЛОГИКА СЛОТ-МАШИНЫ ---

// Функция для обновления отображения монет
function isActiveRun() {
  return gameStarted && !gameOver && !waitingForStart && !paused;
}

function updateCoinDisplay() {
  coinDisplay.innerHTML = `🪙 ${playerCoins}`;
  //spinBtn.textContent = `КРУТИТЬ (${spinCost})`;

  // Крутить можно в неигровых состояниях: экран ожидания, пауза, после проигрыша.
  const canSpinNow =
    !shopOpen &&
    !isSpinning &&
    playerCoins >= spinCost &&
    !isActiveRun(); // ← ключ

  spinBtn.disabled = !canSpinNow;
  spinBtn.classList.toggle("reenabled", canSpinNow);
}

function updateSpinButton() {
  spinBtn.textContent = `КРУТИТЬ ЗА 1🪙(${playerSpins}/${MAX_SPINS})`;
  spinBtn.disabled = playerSpins <= 0;
}

// инициализация слотов нового типа
buildSlotDoors();
initSlots(true, 1, 1.2);

/**
 * Инициализация содержимого лент.
 * firstInit=true  -> ставим "?" (просто пустой экран с 1 ячейкой)
 * firstInit=false -> формируем длинную ленту из повторов символов и запускаем транзишн
 * groups  -> сколько раз дублировать набор символов (визуальная «высота» ленты)
 * duration -> длительность прокрутки (сек)
 */
function initSlots(firstInit = true, groups = 1, duration = 1.2) {
  if (!slotDoorsRoot) return;
  const doorEls = slotDoorsRoot.querySelectorAll(".door");

  doorEls.forEach((door) => {
    // ✅ всегда пересобираем ленту для нового спина
    const boxes = door.querySelector(".boxes");
    const boxesClone = boxes.cloneNode(false); // пустой .boxes

    // сбрасываем флаги
    door.dataset.animating = firstInit ? "0" : "1";

    if (firstInit) {
      const placeholder = document.createElement("div");
      placeholder.className = "box";
      placeholder.style.width  = door.clientWidth + "px";
      placeholder.style.height = door.clientHeight + "px";
      placeholder.innerHTML = "<span style='font-size:32px;opacity:.4'></span>";
      boxesClone.appendChild(placeholder);
    } else {
      const base = [SYMBOL_INDEX.LIME, SYMBOL_INDEX.CHERRY, SYMBOL_INDEX.BANANA];
      const scrollArr = [];
      for (let n = 0; n < (groups > 0 ? groups : 1); n++) scrollArr.push(...base);
      shuffle(scrollArr);

      const placeholder = document.createElement("div");
      placeholder.className = "box";
      placeholder.style.width  = door.clientWidth + "px";
      placeholder.style.height = door.clientHeight + "px";
      placeholder.innerHTML = "<span style='font-size:32px;opacity:.35'></span>";

      const pool = [placeholder, ...scrollArr.map(idx => makeBox(idx, door))];

      boxesClone.addEventListener("transitionstart", () => {
        door.dataset.animating = "1";
        boxesClone.querySelectorAll(".box").forEach((el) => { el.style.filter = "blur(1px)"; });
      }, { once: true });

      boxesClone.addEventListener("transitionend", () => {
        boxesClone.querySelectorAll(".box").forEach((el, i) => {
          el.style.filter = "blur(0)";
          if (i > 0) boxesClone.removeChild(el); // оставляем только верхний
        });
        door.dataset.animating = "0";
      }, { once: true });

      for (let i = pool.length - 1; i >= 0; i--) boxesClone.appendChild(pool[i]);

      boxesClone.style.transitionProperty = "transform";
      boxesClone.style.transitionTimingFunction = "ease-in-out";
      boxesClone.style.transitionDuration = `${duration > 0 ? duration : 1}s`;
      boxesClone.style.transform = `translateY(-${door.clientHeight * (pool.length - 1)}px)`;
    }

    door.replaceChild(boxesClone, boxes);
  });
}

// утилита перетасовки
function shuffle(arr) {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

// ===== ЛАМПОЧКИ: анимации =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function bulbsAll(state) {
  document.querySelectorAll("#bulbFrame .bulb")
    .forEach(b => b.classList.toggle("on", !!state));
}

async function flashAll(times = 3, onMs = 140, offMs = 120, lastOnMs = null, lastOffMs = null) {
  const bulbs = [...document.querySelectorAll('#bulbFrame .bulb')];

  for (let i = 0; i < times; i++) {
    const onDur  = (i === times - 1 && lastOnMs  != null) ? lastOnMs  : onMs;
    const offDur = (i === times - 1 && lastOffMs != null) ? lastOffMs : offMs;

    bulbs.forEach(b => { b.classList.add('on'); b.classList.remove('idlePulse'); });
    await sleep(onDur);
    bulbs.forEach(b => b.classList.remove('on'));

    // пауза после мигания (для последнего можно задать свою или пропустить)
    if (offDur > 0) await sleep(offDur);
  }
}

async function chaseLoops(loops = 3, stepMs = 55) {
  const path = getBulbPath();
  const n = path.length;
  if (!n) return;

  let prev = null;
  for (let k = 0; k < loops; k++) {
    for (let i = 0; i < n; i++) {
      if (prev) prev.classList.remove('on');   // выключаем только предыдущую
      const cur = path[i];
      cur.classList.add('on');                 // включаем текущую
      prev = cur;
      await sleep(stepMs);
    }
  }
  if (prev) prev.classList.remove('on');
}

async function runLightShow(outcome) {
  if (!lightsReady || lightShowRunning) return;
  lightShowRunning = true;
  const shouldResumeIdleAfter = !isActiveRun(); // если не в игре — вернём idle
  try {
    stopIdleLights();
    if (outcome === 'CUSH') {
      mini_jackpot.play();
      fadeOutAudio(mini_jackpot, 800);
      await flashAll(3);
    } else if (outcome === 'MEGA_CUSH') {
      jackpot.currentTime = 1;
      jackpot.play();
      await chaseLoops(3, 5);
      await sleep(120);
      await flashAll(3, 140, 120, 600, 150);
    }
  } finally {
    bulbsAll(false);
    lightShowRunning = false;
    if (shouldResumeIdleAfter) startIdleLights(true);
  }
}

// Заполнение катушек случайными фруктами
function getRandomReelResult() {
    // В вашем коде 3 изображения: lime, chery, banana (индексы 0, 1, 2)
    return Math.floor(Math.random() * obstacleImages.length);
}

// Функция для прокрутки
function spinSlots() {
  if (isSpinning) return;
  if (shopOpen || isActiveRun()) return;

  if (playerSpins <= 0) {
    showToastMultiple("❌ Нет доступных вращений!", "Набери 2500🏆 чтобы получить +1 спин!", "error");
    return;
  }

  playerSpins--;
  savePlayerSpins(currentPlayerName, playerSpins);
  updateSpinButton();

  if (playerCoins < spinCost) {
    slotMessage.textContent = "Не хватает монет! (нужно 1)";
    // краткое мигание кнопки как подсказка
    spinBtn.classList.remove("reenabled");
    void spinBtn.offsetWidth;
    spinBtn.classList.add("reenabled");
    return;
  }

  isSpinning = true;
  casinoOpen = true;
  spinBtn.disabled = true;                 // ⛔️ блок кнопки
  spinBtn.classList.remove("reenabled");
  playerCoins -= spinCost;
  updateCoinDisplay();
  slotMessage.textContent = "Крутим...";

  if (currentPlayerName) savePlayerCoins(currentPlayerName, playerCoins);

  // 1) исход и целевые символы
  const outcome = calculateWinOutcome();
  const finalResults = generateReelsForOutcome(outcome);

  // 2) подготовить ленты
  const groups = 3;
  const baseDuration = 1.6;

  initSlots(false, groups, baseDuration);

  // 3) запуск дверей с задержкой
  const doorEls = slotDoorsRoot.querySelectorAll(".door");
  doorEls.forEach((door, i) => {
    const boxes = door.querySelector(".boxes");
    const topBox = boxes.firstElementChild;
    if (topBox) {
      const replacement = makeBox(finalResults[i], door);
      boxes.replaceChild(replacement, topBox);
    }

    const delay = i * 180; // мс
    setTimeout(() => {
      requestAnimationFrame(() => {
        boxes.style.transitionDuration = `${baseDuration + i * 0.2}s`;
        boxes.style.transform = "translateY(0)";
      });
    }, delay);
  });

  // 4) конец последней двери
  const settleDelay = baseDuration * 1000 + (doorEls.length - 1) * 180 + 120;
  setTimeout(() => {
    isSpinning = false;
    casinoOpen = false;
    displayWinMessage(outcome);

    // 🔔 световое шоу по исходу
  if (outcome === 'CUSH' || outcome === 'MEGA_CUSH') {
    runLightShow(outcome);
  }

    // ✅ плавное визуальное "включение" кнопки
    spinBtn.disabled = false;
    spinBtn.classList.remove("reenabled");
    if (!isActiveRun()) startIdleLights(true);
    void spinBtn.offsetWidth;
    spinBtn.classList.add("reenabled");
  }, settleDelay);
}

//// Новая функция: Выбирает тип выигрыша на основе заданных шансов
function calculateWinOutcome() {
    const rand = Math.random();

    // Шансы: 60% Проигрыш, 25% Малый, 10% Куш, 5% Мега Куш
    if (rand < 0.05) { // 5%
        return 'LOSE'
    } else if (rand < 0.05 + 0.05) { // 10% (5% + 5%)
        return 'SMALL_WIN';
    } else if (rand < 0.05 + 0.05 + 0.25) { // 35% (10% + 25%)
        return 'MEGA_CUSH';
    } else { // 100% (35% + 65%)
        return 'CUSH';;
    }
}

// Новая функция: Генерирует конкретные изображения катушек
function generateReelsForOutcome(outcome) {
    // Индексы: 0:Лайм (Лимон), 1:Вишня, 2:Банан
    const LIME = 0; // Мега Куш
    const CHERRY = 1; // Куш/Малый
    const BANANA = 2; // Куш/Малый
    const ALL_SYMBOLS = [LIME, CHERRY, BANANA];

    if (outcome === 'LOSE') {
        // Проигрыш: Все три разные
        const result = [LIME, CHERRY, BANANA];
        // Перемешиваем, чтобы не всегда было 0-1-2
        result.sort(() => Math.random() - 0.5); 
        return result;
    }

    if (outcome === 'MEGA_CUSH') {
        // Мега Куш: Три лимона (0-0-0)
        return [LIME, LIME, LIME]; 
    }

    if (outcome === 'CUSH') {
        // Куш: Три банана (2-2-2) ИЛИ Три вишни (1-1-1)
        const symbol = Math.random() < 0.5 ? CHERRY : BANANA;
        return [symbol, symbol, symbol];
    }
    
    if (outcome === 'SMALL_WIN') {
        // Малый выигрыш: Две вишни или два банана, третье - другое
        const winningSymbol = Math.random() < 0.5 ? CHERRY : BANANA; // 1 или 2
        
        // Случайный проигрышный символ (не должен быть winningSymbol)
        const losingSymbols = ALL_SYMBOLS.filter(s => s !== winningSymbol);
        const losingSymbol = losingSymbols[Math.floor(Math.random() * losingSymbols.length)];
        
        // Размещаем 2 выигрышных и 1 проигрышный
        const reels = [winningSymbol, winningSymbol, losingSymbol];
        
        // Перемешиваем, чтобы проигрышный символ не всегда был последним
        reels.sort(() => Math.random() - 0.5);
        return reels;
    }
}

// Новая функция: Отображает сообщение и обновляет монеты
function displayWinMessage(outcome) {
    let message = "Попробуй еще раз!";
    let winAmount = 0;

    switch (outcome) {
        case 'MEGA_CUSH':
            winAmount = 30;
            message = `МЕГА КУШ! +${winAmount}`;
            break;
        case 'CUSH':
            winAmount = 10;
            message = `КУШ! +${winAmount}`;
            break;
        case 'SMALL_WIN':
            winAmount = 2;
            message = `Малый выигрыш! (+${winAmount} монеты).`;
            break;
        case 'LOSE':
        default:
            winAmount = 0;
            // Сообщение уже "Попробуй еще раз!"
            break;
    }
    
    playerCoins += winAmount;
    slotMessage.textContent = message;
    updateCoinDisplay();

    if (winAmount > 0 && currentPlayerName) {
        savePlayerCoins(currentPlayerName, playerCoins);
    }
    
    if (winAmount > 0) {
        console.log(`Игрок выиграл ${winAmount} монет с исходом ${outcome}.`);
    }
}

updateCoinDisplay(); // Показываем начальное количество монет и стоимость

// ---- Draw obstacles ----
function drawObstacles() {
  obstacles.forEach(o => {
    const img = obstacleImages[o.imgIndex];
    ctx.drawImage(img, o.x, o.y, o.width, o.height);

    if(debug){
      ctx.strokeStyle = "rgba(0,255,0,0.6)"; // green outlines
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x, o.y, o.width, o.height);
    }

  });

}

// --- Dust Particles ---
let particles = [];

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = -(Math.random() * 2 + 2); // speed to the left
    this.vy = -(Math.random() * 1 - 0.5); // small vertical movement
    this.alpha = 1;
    this.size = Math.random() * 4 + 3; // dust size
    this.life = Math.random() * 0.5 + 0.5; // seconds to live
    this.age = 0;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.age += dt;
    this.alpha = Math.max(0, 1 - this.age / this.life);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    //ctx.fillStyle = "rgba(255,255,255,0.6)"; // soft white dust
    ctx.fillStyle = "rgba(150, 150, 150, 0.6)"; // greyish dust
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createDustBurst(x, y, count = 20) {
  for (let i = 0; i < count; i++) {
    if(particles.length > 60) break;
    const p = new Particle(x, y);
    // randomize speed and direction
    p.vx = -(Math.random() * 4 + 1.5);        // mostly to the left
    p.vy = (Math.random() - 0.5) * 3;         // small up/down spread
    p.size = Math.random() * 10 + 3;           // 3–7 px particles
    p.life = Math.random() * 0.6 + 0.4;       // 0.4–1 s lifetime
    p.alpha = 1;
    particles.push(p);
  }
}



function update() {
    if (gameOver || waitingForStart) return;

    // Apply jump "hold" effect
    if (player.jumping) {
      if (isJumping && jumpHoldTime < maxJumpHold) {
        player.vy += gravity * deltaTime * 144 * 0.4; // weaker gravity while holding
        jumpHoldTime += deltaTime;
      } else {
        player.vy += gravity * deltaTime * 144; // normal gravity
      }
    } else {
      player.vy += gravity * deltaTime * 144;
    }

    player.y += player.vy * deltaTime * 144;

    if (player.y > groundY) {
        player.y = groundY;
        player.vy = 0;
        player.jumping = false;
        isJumping = false;
    }

    // 🌀 Spawn dust when player is running on the ground
    if (!player.jumping && Math.random() < 0.15 && particles.length < 60) {
      //particles.push(new Particle(player.x + player.width * 0.3, player.y + player.height / 2));
      particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2));
    }

    // ---- Player animation state ----
    player.state = player.jumping ? "jump" : "run";

    // ---- Handle short starting boost ----
    if (boostActive) {
      boostTimer += deltaTime;
      const boostFactor = 1 + (boostMultiplier - 1) * (1 - boostTimer / boostDuration); // smooth fade
      if (boostTimer >= boostDuration) {
        boostActive = false;
      }
      // temporarily increase speed
      worldScrollSpeed = speed * boostFactor;
    } else {
      worldScrollSpeed = speed;
    }

    obstacles.forEach(o => o.x -= worldScrollSpeed * deltaTime * 144);
    obstacles = obstacles.filter(o => o.x + o.width > 0);

    // Move coins left and remove off-screen ones
    coins.forEach(c => c.x -= worldScrollSpeed * deltaTime * 144);
    coins = coins.filter(c => c.x + c.width > 0);

    // ---- Controlled obstacle spawning
    if (Math.random() < spawnChance) {
        // find the rightmost existing obstacle
        let rightmostX = 0;
        if (obstacles.length > 0) {
            rightmostX = Math.max(...obstacles.map(o => o.x + o.width));
        }

        // only spawn if the rightmost obstacle is far enough left
        if (rightmostX < canvas.width - minSpawnGap) {
            // decide possible group size depending on level
            let groupSize = 1;
            if (level >= 2 && Math.random() < 0.2) groupSize = 2; // 20% double
            if (level >= 4 && Math.random() < 0.1) groupSize = 3; // 10% triple

            // adjust the required future spawn gap based on group size
            if (groupSize === 1) minSpawnGap = 200;
            else if (groupSize === 2) minSpawnGap = 300;
            else minSpawnGap = 400;

            // create the obstacle group
            let groupX = canvas.width;
            for (let i = 0; i < groupSize; i++) {
                const randomImg = Math.floor(Math.random() * obstacleImages.length);
                const size = 40;
                obstacles.push({
                    x: groupX,
                    y: groundY,
                    width: size,
                    height: size,
                    imgIndex: randomImg
                });
                groupX += size + groupGap;
            }
            if (debug) console.log(`Spawned groupSize=${groupSize}, rightmostX=${rightmostX}`);
        }
    }

    // ---- Coin spawning logic ----
    if (score - lastCoinScore >= 1000) {
      lastCoinScore = score;

      // Determine random Y position (within jump reach)
      const minY = groundY - 120;  // max jump height
      const maxY = groundY - coinSize - 5; // slightly above ground
      const coinY = Math.random() * (maxY - minY) + minY;

      // Determine random X position (not too close to edges)
      const coinX = canvas.width - 100;

      // Ensure coin does not overlap any obstacle
      const overlaps = obstacles.some(o => 
        coinX < o.x + o.width + coinMargin &&
        coinX + coinSize + coinMargin > o.x &&
        coinY < o.y + o.height + coinMargin &&
        coinY + coinSize + coinMargin > o.y
      );

      if (!overlaps) {
        coins.push({ x: coinX, y: coinY, width: coinSize, height: coinSize });
      }
    }


    // Collision with obstacle
    obstacles.forEach(o => {
        const hb = player.hitbox;
        const px = player.x + hb.offsetX;
        const py = player.y + hb.offsetY;
        const pw = hb.width;
        const ph = hb.height;

        if (
          px < o.x + o.width &&
          px + pw > o.x &&
          py < o.y + o.height &&
          py + ph > o.y
        ) {
          // 💥 Smoothly fade out all coin sounds and game music
          activeCoinSounds.forEach(s => fadeOutAudio(s, 600));
          activeCoinSounds = [];

          gameMusic.pause();
          gameOver = true;
          shopBtn.disabled = false;
          spinBtn.disabled = false;
          spinBtn.classList.add("reenabled");
          loopRunning = false;
          spaceReleasedSinceDeath = false;
          restartBtn.classList.add("blinking");
          restartBtn.style.display = "block";

          // ⏳ Disable restart for a short time
          canRestart = false;
          setTimeout(() => {
            canRestart = true;
          }, 700); // 1 second delay before restart via Space

          // Freeze HUD to exact final value
          displayedScore = score;

          // Round and sync both HUD and final score
          const finalValue = Math.floor(displayedScore);
          scoreEl.textContent = finalValue.toString().padStart(5, "0");
          finalScoreDisplay.textContent = `СЧЁТ: ${finalValue.toString().padStart(5, "0")}`;
          finalScoreDisplay.style.display = "block";

          startIdleLights(true);

          // отправка счета
          if (currentPlayerName) {
              // Отправляем счет на сервер с уже известным именем
              sendScoreToServer(currentPlayerName, finalValue);
              checkScoreUnlocks(finalValue);
          }

          // play random sound if score >= 1000
          if (!debug){
            if (score >= 1000) {
            const randomIndex = Math.floor(Math.random() * loseSounds.length);
            const chosenSound = loseSounds[randomIndex];
            chosenSound.currentTime = 0;
            chosenSound.play().catch(err => console.warn("Sound blocked:", err));
            activeLoseSounds.push(chosenSound);

            // Clean up when finished
            chosenSound.onended = () => {
              activeLoseSounds = activeLoseSounds.filter(s => s !== chosenSound);
            };
          }
          }
        }
    });

    // ---- Coin collection ----
    coins.forEach((c, index) => {
      const hb = player.hitbox;
      const px = player.x + hb.offsetX;
      const py = player.y + hb.offsetY;
      const pw = hb.width;
      const ph = hb.height;

      if (
        px < c.x + c.width &&
        px + pw > c.x &&
        py < c.y + c.height &&
        py + ph > c.y
      ) {

        // spawn floating text effect
        floatingTexts.push({
          x: c.x,
          y: c.y,
          text: "+1",
          alpha: 1,
          vy: -0.5,
          scale: 0.5,      // starts small
          life: 0          // time counter
        });
        // Coin collected
        coins.splice(index, 1);
        //score += 200; // bonus points for collecting

        playerCoins += 1; // Увеличиваем на 1
        updateCoinDisplay(); // Обновляем отображение на HUD
        updateSpinButton();
      
        if (currentPlayerName) {
            savePlayerCoins(currentPlayerName, playerCoins);
        }

        // Play random coin sound 🎵
        const randomCoinSound = coinSounds[Math.floor(Math.random() * coinSounds.length)];
        randomCoinSound.currentTime = 0; // restart if still playing
        randomCoinSound.play().catch(() => {});

        // keep track
        activeCoinSounds.push(randomCoinSound);

        // auto-clean up when finished
        randomCoinSound.onended = () => {
          activeCoinSounds = activeCoinSounds.filter(s => s !== randomCoinSound);
        };
      }
    });

    // ---- Floating "+1" animations ----
    floatingTexts.forEach(ft => {
      ft.life += deltaTime;

      // rise & fade
      ft.y += ft.vy * 4;
      ft.alpha -= 0.02;

      // scale up fast, then shrink slightly
      if (ft.life < 0.1) {
        ft.scale += 0.15; // quick grow
      } else {
        ft.scale *= 0.97; // slow shrink
      }
    });

    floatingTexts = floatingTexts.filter(ft => ft.alpha > 0);

    particles.forEach(p => p.update(deltaTime));
    particles = particles.filter(p => p.alpha > 0);


    score += deltaTime * 144; // gain roughly 60 points per second (tweak as you like)

    if (score >= nextSpinReward && playerSpins < MAX_SPINS) {
      playerSpins++;
      savePlayerSpins(currentPlayerName, playerSpins);
      updateSpinButton();
      showToast("🎰 Получено новое вращение за 2500 очков!", "success");
      nextSpinReward += 2500;
    }

    // === Live check for score-based unlocks ===
    scoreLockedSkins.forEach(skin => {
      if (
        score >= skin.unlockScore &&
        !ownedSkins.includes(skin.id)
      ) {
        // Unlock skin instantly
        ownedSkins.push(skin.id);
        lsSet(currentPlayerName, "ownedSkins", ownedSkins);
        savePlayerSkins(currentPlayerName, ownedSkins);

        // Show toast only once
        if (!announcedUnlocks.has(skin.id)) {
          showToast(`🎉 Скин "${skin.name}" разблокирован!`, "success");
          announcedUnlocks.add(skin.id);
        }
      }
    });
    

    // ---- Difficulty progression ----
    if (score >= nextLevelScore && level < maxLevel) {
        level++;
        nextLevelScore += 1000;                              // next stage
        speed += 0.3;                                       // slightly faster game
        spawnChance = Math.min(spawnChance + 0.002, 0.03);  // increase obstacle frequency
        console.log(`Level ${level} | speed=${speed.toFixed(2)} | chance=${spawnChance.toFixed(3)}`);
    }

    const step = Math.floor(score / 1000);
    // ---- Background change every <1000> score ----
    if (!bgTransitioning && step > bgStepProcessed && currentBgIndex < backgroundImages.length - 1) {
      bgTransitioning = true;
      bgAlpha = 0;
      bgStepProcessed = step;
      nextBgIndex = (currentBgIndex + 1) % backgroundImages.length;
      
    }
}

let displayedScore = 0;
function updateHUD() {
  displayedScore += (score - displayedScore) * 0.2;
  scoreEl.textContent = Math.floor(displayedScore).toString().padStart(5, "0");
}

function drawBackground(deltaTime) {
  if (backgroundImages.length === 0) return;

  const currentBg = backgroundImages[currentBgIndex];
  const nextBg = backgroundImages[nextBgIndex];
  

  // Draw current background fully
  ctx.globalAlpha = 1;
  //ctx.filter = "brightness(0.6) contrast(1.1)";
  ctx.drawImage(currentBg, 0, 0, canvas.width, canvas.height);
  //ctx.filter = "none"; // reset filter


  // If transitioning — draw next one fading in
  if (bgTransitioning) {
    bgAlpha += deltaTime * 1.2; // fade speed (1s fade)
    ctx.globalAlpha = Math.min(bgAlpha, 1);

    ctx.drawImage(nextBg, 0, 0, canvas.width, canvas.height);

    // End transition
    if (bgAlpha >= 1) {
      bgTransitioning = false;
      currentBgIndex = nextBgIndex;
      nextBgIndex = (currentBgIndex + 1) % backgroundImages.length;
      bgAlpha = 0;
    }
  }

  // dark overlay
  ctx.globalAlpha = 0.50; // opacity of the overlay darkness
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if(!isMobile){
    ctx.save();
    ctx.globalAlpha = 0.7;  // 1.0 = fully opaque, 0.0 = fully transparent
    ctx.drawImage(shieldImage, 150, 210, 100, 80); // x, y, width, height
    ctx.translate(200, 250);             // move origin to center of shield
    ctx.rotate(10 * Math.PI / 180);     // slight rotation (~–10°)
    ctx.font = "bold 10px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000ff";           // golden text
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText("MELLSTROY", -3, -20);    // top line slightly above center
    // second line
    ctx.fillText("GAME", 0, -8);         // bottom line slightly below center
    ctx.restore();
  }


  ctx.globalAlpha = 1; // reset alpha
}

function draw(deltaTime) {

  // --- Draw background or fallback ---
  if (areBackgroundsLoaded()) {
    drawBackground(deltaTime);
  } else {
    ctx.fillStyle = "#3b3b6d"; // fallback blue background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  updateHUD();

  // --- Scrolling ground ---
  const groundYpos = groundY + player.height / 2;

  // ⛔ Freeze ground when paused
  if (!paused) {
    groundX -= worldScrollSpeed * deltaTime * 144 * groundSpeedFactor;
  }

  // wrap around when one tile fully scrolls off-screen
  if (groundX <= -canvas.width) groundX = 0;

  // draw two tiles to fill the screen continuously
  ctx.drawImage(groundImage, groundX, groundYpos, canvas.width, 70);
  ctx.drawImage(groundImage, groundX + canvas.width, groundYpos, canvas.width, 70);

  // --- Draw particles behind the player ---
  particles.forEach(p => p.draw(ctx));

  // --- Player and obstacles ---
  drawPlayer(deltaTime);
  drawObstacles();

  // ---- Draw coins ----
  coins.forEach(c => {
    ctx.drawImage(coinImage, c.x, c.y, c.width, c.height);

    if (debug) {
      ctx.strokeStyle = "gold";
      ctx.strokeRect(c.x, c.y, c.width, c.height);
    }
  });

  // ---- Draw floating "+1" texts ----
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.translate(ft.x + coinSize / 2, ft.y);
    ctx.scale(ft.scale, ft.scale);
    ctx.font = "bold 26px Arial";
    ctx.fillStyle = "gold";
    ctx.textAlign = "center";
    //ctx.shadowColor = "#ffd84d";
    //ctx.shadowBlur = 8;
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();


  });

  // --- Waiting for SPACE overlay ---
  if (waitingForStart) {
    // Save state so blur and alpha don't affect other draws
    ctx.save();

    // Apply slight blur to the current frame
    ctx.filter = "blur(3px)";     //  blur strength
    ctx.drawImage(canvas, 0, 0);  // re-draw itself blurred  
    ctx.filter = "none";

    ctx.restore();

    // Semi-transparent dark layer for contrast
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const message = paused ? "Press SPACE to continue" : "Press SPACE to start";

    // Detect if the player uses a touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Pulsing "Press SPACE" text
    pulseTime += deltaTime * 1000;
    const alpha = 0.6 + 0.4 * Math.sin(pulseTime / 300);
    ctx.font = "bold 28px 'Arial Black'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    if(isTouchDevice){
        ctx.fillText("TOUCH to start!", canvas.width / 2, canvas.height / 2);
    }else {
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }
  }
}


function loop(timestamp) {

  // 🧭 Skip the first delta right after pause
  if (skipNextDelta) {
    lastTime = timestamp;
    skipNextDelta = false;
  }

  deltaTime = (timestamp - lastTime) / 1000; // convert ms → seconds
  lastTime = timestamp;

  update();
  draw(deltaTime);

  if (!gameOver && loopRunning) currentFrameId = requestAnimationFrame(loop);
}


/* 
 =========== LISTENERS ===========
*/ 


// ---- Jump with "SPACE" ----
window.addEventListener("keydown", e => {
  if (e.code !== "Space") return;
  e.preventDefault();

  // Disable Space if casino or shop is open
  if (casinoOpen || shopOpen) {
    e.preventDefault();
    return;
  }

  // Also block space if a button has keyboard focus (like Spin)
  const activeEl = document.activeElement;
  if (activeEl && activeEl.tagName === "BUTTON") {
    activeEl.blur(); // remove focus so space won't trigger it
    e.preventDefault();
    return;
  }

 // --- 💤 0️⃣ Resume from pause ---
  if (paused && waitingForStart && !gameOver) {
    paused = false;
    waitingForStart = false;

    stopIdleLights();  

    pulseTime = 0;

    // Resume music
    if (gameMusic.paused) {
      gameMusic.play().catch(err => console.warn("Music resume blocked:", err));
    }

    // Resume game loop
    if (!loopRunning) {
      loopRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
    return;
  }  


  // --- 1️⃣ Restart when game over ---
  if (gameOver) {
    // prevent restart spam
    if (!canRestart || !spaceReleasedSinceDeath) return;

    // after this point, we know: cooldown passed AND space was released once
    spaceReleasedSinceDeath = false;

    // fade out lose sounds & coins
    activeLoseSounds.forEach(s => fadeOutAudio(s, 300));
    activeLoseSounds = [];
    activeCoinSounds.forEach(s => fadeOutAudio(s, 300));
    activeCoinSounds = [];

    // restart music if needed
    if (gameMusic.paused) {
      gameMusic.currentTime = 0;
      gameMusic.volume = 0.15;
      gameMusic.play().catch(err => console.warn("Music blocked:", err));
    }

    loopRunning = false;
    restartBtn.classList.remove("blinking");
    gameMenuBtn.style.display = "none";
    fetchLeaderboard();

    startGame();
    return;
  }

  // --- 2️⃣ Start game if waiting for start ---
  if (waitingForStart) {
    waitingForStart = false;

    if (gameMusic.paused) {
      gameMusic.currentTime = 0;
      gameMusic.volume = 0.15;
      gameMusic.play().catch(err => console.warn("Music blocked:", err));
    }

    startGame();
    return;
  }

  // --- 3️⃣ Normal jump during gameplay ---
  if (!player.jumping && !gameOver && gameStarted) {
    player.vy = jumpForce;
    player.jumping = true;
    isJumping = true;
    jumpHoldTime = 0;
  }
});

window.addEventListener("keyup", e => {
  if (e.code === "Space") {
    isJumping = false;
  }

  if(gameOver){
    spaceReleasedSinceDeath = true;
  }

});

// ---- Restart Button Listener ----
restartBtn.addEventListener("click", () => {
  // ❌ Stop/fade all lose sounds
  activeLoseSounds.forEach(s => {
    fadeOutAudio(s, 300); // smooth fade
  });
  activeLoseSounds = [];

  // ❌ Fade out active coin sounds (for safety)
  activeCoinSounds.forEach(s => fadeOutAudio(s, 300));
  activeCoinSounds = [];

  // 🎵 Restart background music if it was stopped
  if (gameMusic.paused) {
    gameMusic.currentTime = 0;
    gameMusic.volume = 0.15;
    gameMusic.play().catch(err => console.warn("Music blocked:", err));
  }

  // 🔁 Reset and restart the game
  loopRunning = false;
  restartBtn.classList.remove("blinking");

  fetchLeaderboard();
  
  startGame();
});

// ---- Play Button Listener ----
playBtn.addEventListener("click", () => {
  if (!debug) {
      if (!currentPlayerName) {
    const inputName = playerNameInput.value.trim();
    if (inputName.length < 3 || inputName.length > 12) {
      nameError.textContent = "Имя должно быть 3-12 символов!"
      return
    } 

    currentPlayerName = inputName;
    // #new — мгновенно подхватим локальную косметику, пока сеть грузится
    ownedSkins   = lsGet(currentPlayerName, "ownedSkins", ["default"]);
    selectedSkin = lsGet(currentPlayerName, "selectedSkin", "default");
    applySelectedSkin();
    renderShop();

      playerNameInput.disabled = true; // Блокируем поле 
      nameError.textContent = "";
    }
  }

  if (currentPlayerName) {
      fetchPlayerCoins(currentPlayerName); 
      fetchPlayerSkins(currentPlayerName);
      fetchPlayerSpins(currentPlayerName);
  }

  introSound.currentTime = 0;
  introSound.play();

  // animation fade out
  menu.style.transition = "opacity 2s ease";
  menu.style.opacity = 0;

  // --- Coin zoom + glow animation ---
  const coins = document.querySelectorAll(".coinGif");
  coins.forEach(coin => {
    coin.classList.remove("coinPlay"); // reset if replaying
    void coin.offsetWidth;             // force reflow
    coin.classList.add("coinPlay");
  });

  // After fade completes, hide menu and show game screen
  setTimeout(() => {
    // === show banners when game starts ===
    document.querySelectorAll('.side-banner').forEach(banner => {
      banner.style.display = 'flex';
    });
    document.body.classList.add("game-active");
    menu.style.display = "none";
    container.style.display = "flex";

    buildBulbFrame();
    startIdleLights(true);  

    container.style.flexDirection = "column";
    container.style.alignItems = "center";

    fetchLeaderboard();

    waitingForStart = true;
    startIdleLights(true);
    updateCoinDisplay();


    // kick off
    if (!loopRunning) {
      loopRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }

  }, 1000);
});

// ---- Slot Machine Listener (ДОБАВИТЬ ЭТО!) ----
spinBtn.addEventListener("click", spinSlots);


// серверная часть !!!

// отправка счета на сервер:
// #change — используем v2 и передаём userId
function sendScoreToServer(playerName, finalScore) {
  if (!playerName || finalScore <= 0) {
    console.warn("Score not sent: Invalid name or score.");
    return;
  }

  fetch('/api/scores/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,                 // <— пер-устройство UID
      name: playerName,       // сохраняем отображаемое имя (может меняться)
      score: finalScore
    }),
  })
  .then(response => {
    if (!response.ok) throw new Error('Server error: ' + response.statusText);
    return response.json();
  })
  .then(() => {
    fetchLeaderboard(); // список топов без изменений
  })
  .catch((error) => {
    console.error('Error saving score:', error);
  });
}

function checkScoreUnlocks(finalScore) {
  scoreLockedSkins.forEach(skin => {
    if (finalScore >= skin.unlockScore && !ownedSkins.includes(skin.id)) {
      ownedSkins.push(skin.id);
      lsSet(currentPlayerName, "ownedSkins", ownedSkins);
      savePlayerSkins(currentPlayerName, ownedSkins);
      showToast(`Скин "${skin.name}" разблокирован! Загляни в прилавок!`, "success");
    }
  });
}

function animatePreviewOnce() {
  const start = performance.now();

  function step(t) {
    const dt = (t - start) / 1000; // seconds since click start
    // redraw with current easing state
    forcePreviewRedraw(false);

    // keep running while bump time > 0 AND shop still open
    if (player.previewBumpTime > 0 && shopOpen) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

//загрузка счета с сервера 
function fetchLeaderboard() {
    leaderboardList.innerHTML = '<li>Loading...</li>';
    let rankDisplay = `<span style="color: gold;">🥉</span>`;

    fetch('/api/scores')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load scores.');
            }
            return response.json();
        })
        .then(scores => {
            leaderboardList.innerHTML = ''; // Очистка списка
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<li style="text-align: center;">No scores yet!</li>';
                return;
            }

            scores.forEach((entry, index) => {
                const listItem = document.createElement('li');
                // Визуальное выделение топ-3 лучших
                if (index === 0){
                  rankDisplay = `<span style="color: gold;">🥇</span>` ;
                }else if(index === 1){
                  rankDisplay = `<span style="color: gold;">🥈</span>`;
                }else if(index === 2){
                  rankDisplay = `<span style="color: gold;">🥉</span>`;
                }else {
                  rankDisplay = `#${index + 1}.`;
                }
                //const rankDisplay = index < 3 ? `<span style="color: gold;">🏆</span>` : `#${index + 1}.`;
                listItem.innerHTML = 
                  `${rankDisplay} ${entry.name.substring(0, 12)}
                  <span style="float: right;">${entry.score}</span>`;

                // Выделяем текущего игрока
                if (entry.name === currentPlayerName && currentPlayerName) {
                    listItem.style.color = '#33ccff';
                    listItem.style.fontWeight = 'bold';
                }

                leaderboardList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('Leaderboard error:', error);
            leaderboardList.innerHTML = 
              `<li style="color: #ff4444; text-align: center;"
              >Error loading: ${error.message}</li>`;
        });
}

// ✅ 1. Загрузка монет с сервера
// #change — читаем по userId
function fetchPlayerCoins(playerName) {
  if (!userId) return;

  fetch(`/api/coins/by-id/${encodeURIComponent(userId)}/${encodeURIComponent(playerName)}`)
    .then(response => {
      if (!response.ok) throw new Error('Failed to load coins.');
      return response.json();
    })
    .then(data => {
      playerCoins = data.coins;
      updateCoinDisplay();
    })
    .catch(error => {
      console.error('Coins load error:', error);
    });
}


// ✅ 2. Сохранение монет на сервере
// #change — сохраняем по userId (и передаём name для обновления отображаемого имени)
function savePlayerCoins(playerName, coins) {
  if (!userId) return;

  fetch('/api/coins/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      name: playerName || currentPlayerName || null,
      coins: Math.max(0, Math.floor(coins))
    }),
  })
  .then(response => {
    if (!response.ok) throw new Error('Server error saving coins: ' + response.statusText);
    return response.json();
  })
  .catch((error) => {
    console.error('Error saving coins:', error);
  });
}

// ✅ Загрузка скинов по userId + name
function fetchPlayerSkins(playerName) {
  if (!userId || !playerName) return;

  fetch(`/api/skins/by-id/${encodeURIComponent(userId)}/${encodeURIComponent(playerName)}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load skins.');
      return res.json();
    })
    .then(data => {
      ownedSkins   = Array.isArray(data.skins) ? data.skins : ["default"];
      selectedSkin = data.selectedSkin || "default";

      // кэш под связку {userId, name}
      lsSet(playerName, "ownedSkins", ownedSkins);
      lsSet(playerName, "selectedSkin", selectedSkin);

      applySelectedSkin();
      renderShop();
    })
    .catch(err => {
      console.error("Ошибка загрузки скинов:", err);
      ownedSkins   = lsGet(playerName, "ownedSkins", ["default"]);
      selectedSkin = lsGet(playerName, "selectedSkin", "default");
      applySelectedSkin();
      renderShop();
    });
}

// ✅ Сохранение скинов по userId + name
function savePlayerSkins(playerName, skins) {
  if (!userId || !playerName) return;

  const sel = lsGet(playerName, "selectedSkin", "default");

  fetch('/api/skins/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      name: playerName,
      skins,
      selectedSkin: sel
    })
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to save skins.');
    return res.json();
  })
  .then(() => {
    lsSet(playerName, "ownedSkins", skins);
    lsSet(playerName, "selectedSkin", sel);
  })
  .catch(err => console.error("Ошибка сохранения скинов:", err));
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.classList.add("toast");

  if (type === "success") {
    toast.style.borderColor = "lime";
    toast.style.color = "#baff9e";
    toast.style.boxShadow = "3px 3px 0 #000, 0 0 10px rgba(100,255,100,0.6)";
  } else if (type === "error") {
    toast.style.borderColor = "red";
    toast.style.color = "#ffb3b3";
    toast.style.boxShadow = "3px 3px 0 #000, 0 0 10px rgba(255,100,100,0.6)";
  } else if (type === "gold") {
    toast.style.borderColor = "gold";
    toast.style.color = "#fffbe8";
  }

  toast.textContent = message;
  container.appendChild(toast);

  // Удаляем после анимации (≈3 секунды)
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showToastMultiple(message1,message2, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.classList.add("toast");
  
  // make \n show as line breaks
  toast.style.whiteSpace = 'pre-line';

  if (type === "success") {
    toast.style.borderColor = "lime";
    toast.style.color = "#baff9e";
    toast.style.boxShadow = "3px 3px 0 #000, 0 0 10px rgba(100,255,100,0.6)";
  } else if (type === "error") {
    toast.style.borderColor = "red";
    toast.style.color = "#ffb3b3";
    toast.style.boxShadow = "3px 3px 0 #000, 0 0 10px rgba(255,100,100,0.6)";
  } else if (type === "gold") {
    toast.style.borderColor = "gold";
    toast.style.color = "#fffbe8";
  }

  toast.textContent = (message1 ?? "") + "\n\n" + (message2 ?? "");
  container.appendChild(toast);

  // Удаляем после анимации (≈3 секунды)
  setTimeout(() => {
    toast.remove();
  }, 3000);
}


// ======= МАГАЗИН (3 СКИНА) =======

const shopBtn = document.getElementById("shopBtn");
const shopOverlay = document.getElementById("shopOverlay");
const closeShopBtn = document.getElementById("closeShopBtn");
const skinsRow = document.getElementById("skinsRow");

// === 3 скина с правильными ценами ===
const skins = [
  {
    id: "default",
    name: "🧍 Стандарт",
    price: 0,
    img: "assets/player/character_1_idle_better.png",
    frames: {
      idle: "assets/player/character_1_idle_better.png",
      run1: "assets/player/character_1_run_1_better.png",
      run2: "assets/player/character_1_run_2_better.png",
      jump: "assets/player/character_1_jump_better.png"
    }
  },
  { id: "mell_cool",
    name: "Мелл Крутой",
    price: 30,
    img: "assets/player/mellstroy_cool_idle.png",
    frames: {
      idle: "assets/player/mellstroy_cool_idle.png",
      run1: "assets/player/mellstroy_cool_run_1.png",
      run2: "assets/player/mellstroy_cool_run_2.png",
      jump: "assets/player/mellstroy_cool_jump.png"
    }
  },
  {
    id: "mell_kid",
    name: "Айпад Кид",
    price: 60, 
    img: "assets/player/mellstroy_kid_idle.png",
    frames: {
      idle: "assets/player/mellstroy_kid_idle.png",
      run1: "assets/player/mellstroy_kid_run_1.png",
      run2: "assets/player/mellstroy_kid_run_2.png",
      jump: "assets/player/mellstroy_kid_jump.png"
    }
  },  
  { id: "mell_buisness",
    name: "Мелл Бизнес",
    price: 100,
    img: "assets/player/mellstroy_buisness_idle.png",
    frames: {
      idle: "assets/player/mellstroy_buisness_idle.png",
      run1: "assets/player/mellstroy_buisness_run_1.png",
      run2: "assets/player/mellstroy_buisness_run_2.png",
      jump: "assets/player/mellstroy_buisness_jump.png"
    }
  },
  {
    id: "mell_prisoner",
    name: "Мелл Лудик",
    price: 100, 
    img: "assets/player/mellstroy_prisoner_idle.png",
    frames: {
      idle: "assets/player/mellstroy_prisoner_idle.png",
      run1: "assets/player/mellstroy_prisoner_run_1.png",
      run2: "assets/player/mellstroy_prisoner_run_2.png",
      jump: "assets/player/mellstroy_prisoner_jump.png"
    }
  },
  {
    id: "mell_swag",
    name: "Мелл Свэггер",
    price: 100, 
    img: "assets/player/mellstroy_swag_idle.png",
    frames: {
      idle: "assets/player/mellstroy_swag_idle.png",
      run1: "assets/player/mellstroy_swag_run_1.png",
      run2: "assets/player/mellstroy_swag_idle.png",
      jump: "assets/player/mellstroy_swag_jump.png"
    }
  }
];

// === Score-based skins (3rd row, unlocked by reaching score milestones) ===
const scoreLockedSkins = [
  { id: "mell_santa",
    name: "Мелл Санта",
    unlockScore: 2500,
    img: "assets/player/mellstroy_santa_idle.png",
    frames: {
      idle: "assets/player/mellstroy_santa_idle.png",
      run1: "assets/player/mellstroy_santa_run_1.png",
      run2: "assets/player/mellstroy_santa_run_2.png",
      jump: "assets/player/mellstroy_santa_jump.png"
    }
  },
  {
    id: "mell_tynka",
    name: "Мелл Тянка",
    unlockScore: 5000, 
    img: "assets/player/mellstroy_tynka_idle.png",
    frames: {
      idle: "assets/player/mellstroy_tynka_idle.png",
      run1: "assets/player/mellstroy_tynka_run_1.png",
      run2: "assets/player/mellstroy_tynka_run_2.png",
      jump: "assets/player/mellstroy_tynka_jump.png"
    }
  },
  {
    id: "mell_judge",
    name: "Судья",
    unlockScore: 10000, 
    img: "assets/player/mellstroy_judge_v3_idle.png",
    frames: {
      idle: "assets/player/mellstroy_judge_v3_idle.png",
      run1: "assets/player/mellstroy_judge_v3_run_1.png",
      run2: "assets/player/mellstroy_judge_v3_run_2.png",
      jump: "assets/player/mellstroy_judge_v3_jump.png"
    }
  }
];

// данные игрока
// #change — данные игрока (лениво подхватываем per-identity после ввода имени)
let ownedSkins = ["default"];
let selectedSkin = "default";

// ====== отрисовка магазина ======
function renderShop() {
  // подхват локальных значений
  if (currentPlayerName) {
    ownedSkins = lsGet(currentPlayerName, "ownedSkins", ownedSkins);
    selectedSkin = lsGet(currentPlayerName, "selectedSkin", selectedSkin);
  }

  skinsRow.innerHTML = "";

  skins.forEach((skin, index) => {
    const div = document.createElement("div");
    div.classList.add("skinItem");

    const isOwned = ownedSkins.includes(skin.id);
    const isSelected = selectedSkin === skin.id;

    // 👇 NEW: check previous skin
    // for first skin (index 0) there is no previous → always allowed
    const prevSkin = index > 0 ? skins[index - 1] : null;
    const prevOwned = !prevSkin || ownedSkins.includes(prevSkin.id);

    // 👇 NEW: super lock only if this is in 2nd row AND previous is NOT owned
    const isSuperLocked = (index >= 3 && index < 6) && !prevOwned;

    if (!isOwned && skin.price > 0) {
      div.classList.add("locked");
    }
    if (isSelected) {
      div.classList.add("selected");
    }
    if (isSuperLocked) {
      div.classList.add("superLocked");
    }

    div.dataset.id = skin.id;
    div.dataset.price = skin.price;

    // картинка
    const img = document.createElement("img");
    img.src = skin.img;


    if (skin.id === "default") {
      img.style.transform = "scale(1.4) translateY(15px)";
    }
    if (skin.id === "mell_kid") {
      img.style.height = "130px";
    }
    if (skin.id === "mell_prisoner") {
      img.style.height = "135px";
      img.style.transform = "translateY(2px)";
    }
    if (skin.id === "mell_swag") {
      img.style.height = "160px";
      img.style.transform = "translateY(-20px)";
    }

    if (skin.id === "mell_buisness") {
      img.style.height = "130px";
    }

    if (skin.id === "mell_cool") {
      img.style.height = "130px";
    }

    div.appendChild(img);

    // подпись
    const label = document.createElement("div");
    label.classList.add("skinLabel");
    if (skin.price > 0 && !isOwned) {
      label.textContent = `${skin.name} (${skin.price}🪙)`;
    } else {
      label.textContent = skin.name;
    }
    div.appendChild(label);

    // клик
    div.addEventListener("click", () => {
      // ⛔ if still super locked → block
      if (div.classList.contains("superLocked")) {
        showToast("🔒 Разблокируй предыдущий скин, чтобы увидеть цену и внешний вид!");
        return;
      }

      if (!isOwned && skin.price > 0) {
        if (playerCoins >= skin.price) {
          showToast(`🛒 Куплен ${skin.name} за ${skin.price}🪙!`, "gold");

          playerCoins -= skin.price;
          ownedSkins.push(skin.id);

          updateCoinDisplay();
          savePlayerCoins(currentPlayerName, playerCoins);

          selectedSkin = skin.id;
          lsSet(currentPlayerName, "ownedSkins", ownedSkins);
          lsSet(currentPlayerName, "selectedSkin", selectedSkin);
          savePlayerSkins(currentPlayerName, ownedSkins);

          applySelectedSkin();
          forcePreviewRedraw(true);
          animatePreviewOnce();
          renderShop();
        } else {
          showToast("❌ Недостаточно монет!", "error");
        }
      } else {
        // уже куплен → просто надеть
        selectedSkin = skin.id;
        lsSet(currentPlayerName, "selectedSkin", selectedSkin);
        savePlayerSkins(currentPlayerName, ownedSkins);
        applySelectedSkin();

        forcePreviewRedraw(true);
        animatePreviewOnce();
        renderShop();
      }
    });

    // сохранить локально
    lsSet(currentPlayerName, "ownedSkins", ownedSkins);
    lsSet(currentPlayerName, "selectedSkin", selectedSkin);

    skinsRow.appendChild(div);
  });

  // === 3️⃣ SCORE-BASED SKINS ROW ===

  scoreLockedSkins.forEach(skin => {
  const div = document.createElement("div");
  div.dataset.score = skin.unlockScore;
  const isOwned = ownedSkins.includes(skin.id);
  const unlocked = score >= skin.unlockScore; // optional, if you have current score available
  const isSelected = selectedSkin === skin.id;

  div.classList.add("skinItem");

  if (!isOwned) {
    div.classList.add("scoreLocked");
  }

  // ✅ if owned + selected → make it glow like others
  if (isOwned && isSelected) {
    div.classList.add("selected");
  }

  const img = document.createElement("img");
  img.src = skin.img;

  if (skin.id === "mell_santa") {
    img.style.height = "115px";
    img.style.transform = "translateY(10px) translateX(3px)";
  }

  if (skin.id === "mell_judge") {
    img.style.height = "150px";
  }

  if (skin.id === "mell_tynka") {
    img.style.height = "140px";
  }

  div.appendChild(img);

  // Label text
  const label = document.createElement("div");
  label.classList.add("skinLabel");


  div.appendChild(label);

  // === Click logic ===
  if (isOwned) {
    div.addEventListener("click", () => {
      selectedSkin = skin.id;
      lsSet(currentPlayerName, "selectedSkin", selectedSkin);
      savePlayerSkins(currentPlayerName, ownedSkins);
      applySelectedSkin();
      forcePreviewRedraw(true);
      animatePreviewOnce();
      renderShop();
    });
  } else {
    div.addEventListener("click", () => {
      showToast(`❗ Нужно набрать ${skin.unlockScore} очков, чтобы разблокировать этот скин!`, "error");
    });
  }

  skinsRow.appendChild(div);
});


}



// ====== применить выбранный скин ======
function applySelectedSkin() {
  // 🔍 Search both normal skins and score-based skins
  const allAvailableSkins = [...skins, ...scoreLockedSkins];
  const chosen = allAvailableSkins.find(s => s.id === selectedSkin);
  if (chosen && chosen.frames) {
    playerFrames.idle = new Image();
    playerFrames.jump = new Image();
    playerFrames.run = [new Image(), new Image()];

    playerFrames.idle.src = chosen.frames.idle;
    playerFrames.jump.src = chosen.frames.jump;
    playerFrames.run[0].src = chosen.frames.run1;
    playerFrames.run[1].src = chosen.frames.run2;

    console.log(`✅ Применён скин (preview): ${chosen.name}`);
  } else {
    console.warn("⚠️ Скин не найден:", selectedSkin);
  }

  forcePreviewRedraw();
}

// ====== предпросмотр ======
function forcePreviewRedraw(triggerBump = false) {
  if (!frozenScene) return;

  // restore paused background snapshot
  ctx.putImageData(frozenScene, 0, 0);

  // if we just clicked a skin, start the bump animation
  if (triggerBump) {
    player.previewBumpTime = 0.15; // seconds of pop
    player.previewScale = 1.2;
  }

  // draw the chosen skin in idle pose, with preview scaling
  const oldState = player.state;
  player.state = "idle";

  // deltaTime for animation easing: we can pass a tiny dt, like 0.016 (~1 frame)
  drawPlayer(0.016, true);

  player.state = oldState;
}



// ====== слушатели ======
shopBtn.addEventListener("click", () => {
  renderShop();
  shopOverlay.style.display = "flex";
  shopOpen = true;

  // Redraw world without player
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(0);

  // draw asphalt (ground)
  const groundYpos = groundY + player.height / 2;
  ctx.drawImage(groundImage, groundX, groundYpos, canvas.width, 70);
  ctx.drawImage(groundImage, groundX + canvas.width, groundYpos, canvas.width, 70);

  // draw obstacles & coins
  drawObstacles();
  coins.forEach(c => ctx.drawImage(coinImage, c.x, c.y, c.width, c.height));

  // Save this clean scene
  frozenScene = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Now draw current player skin ON TOP once
  forcePreviewRedraw();

  // Stop animation loop
  if (currentFrameId) cancelAnimationFrame(currentFrameId);
  loopRunning = false;
});


closeShopBtn.addEventListener("click", () => {
  shopOverlay.style.display = "none";
  shopOpen = false;
  updateCoinDisplay();

  if (!isActiveRun()) startIdleLights(true);

  frozenScene = null;

  cancelAnimationFrame(currentFrameId);
  currentFrameId = null;
  lastTime = performance.now();
  skipNextDelta = true; // ignore the first delta spike

  loopRunning = true;
  requestAnimationFrame(loop);
});


// 💤 Pause the game when tab becomes inactive
document.addEventListener("visibilitychange", () => {
  if (document.hidden && gameStarted && !gameOver && !waitingForStart) {
    paused = true;
    windowUnfocused = true;
    loopRunning = false;

    // Pause sounds
    gameMusic.pause();

    // Show overlay like "Press Space to continue"
    waitingForStart = true;
    startIdleLights(true);
    requestAnimationFrame(drawPauseOverlay);
  }
});

// 🔸 Pause if window loses focus (click another app)
window.addEventListener("blur", () => {
  if (gameStarted && !gameOver && !waitingForStart) {
    paused = true;
    windowUnfocused = true;
    loopRunning = false;
    gameMusic.pause();
    waitingForStart = true;
    startIdleLights(true);
    requestAnimationFrame(drawPauseOverlay);
  }
});

// ========================================
// 🖐️ TOUCH CONTROLS (fixed + non-passive)
// ========================================
let touchStartTime = 0;

function handleTouchStart(e) {
  if (e.touches.length > 1) return;
  if (shopOpen || casinoOpen || gameOver) return;

  // --- Resume from pause ---
  if (paused && waitingForStart && !gameOver) {
    paused = false;
    waitingForStart = false;
    stopIdleLights();
    pulseTime = 0;
    if (gameMusic.paused) gameMusic.play().catch(()=>{});
    if (!loopRunning) {
      loopRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
    return;
  }

  // --- Restart after game over ---
  if (gameOver && canRestart) {
    spaceReleasedSinceDeath = false;
    gameMusic.currentTime = 0;
    gameMusic.volume = 0.15;
    gameMusic.play().catch(()=>{});
    restartBtn.classList.remove("blinking");
    fetchLeaderboard();
    startGame();
    return;
  }

  // --- Start game ---
  if (waitingForStart) {
    waitingForStart = false;
    if (gameMusic.paused) {
      gameMusic.currentTime = 0;
      gameMusic.volume = 0.15;
      gameMusic.play().catch(()=>{});
    }
    startGame();
    return;
  }

  // --- Jump ---
  if (!player.jumping && !gameOver && gameStarted) {
    player.vy = jumpForce;
    player.jumping = true;
    isJumping = true;
    jumpHoldTime = 0;
    touchStartTime = performance.now();
  }

  e.preventDefault();
}

function handleTouchEnd(e) {
  if (!player.jumping) return;
  const holdDuration = (performance.now() - touchStartTime) / 1000;
  isJumping = false; // both short & long handled by physics
  if (gameOver) spaceReleasedSinceDeath = true;
  e.preventDefault();
}

// 📱 Restart only on intentional tap (not scroll)

canvas.addEventListener("touchstart", (e) => {
  touchMoved = false;
  touchStartY = e.touches[0].clientY;
});

canvas.addEventListener("touchmove", (e) => {
  const dy = Math.abs(e.touches[0].clientY - touchStartY);
  if (dy > 10) touchMoved = true; // mark as scroll if finger moved >10px
});

canvas.addEventListener("touchend", (e) => {
  // 🔒 Don’t block scrolls; just ignore them
  if (touchMoved || e.cancelable === false) return;

  // ✅ Only restart on real taps
  if (gameOver && canRestart && !shopOpen && !casinoOpen) {
    activeLoseSounds.forEach(s => fadeOutAudio(s, 300));
    activeLoseSounds = [];
    activeCoinSounds.forEach(s => fadeOutAudio(s, 300));
    activeCoinSounds = [];

    if (gameMusic.paused) {
      gameMusic.currentTime = 0;
      gameMusic.volume = 0.15;
      gameMusic.play().catch(err => console.warn("Music blocked:", err));
    }

    loopRunning = false;
    restartBtn.classList.remove("blinking");
    fetchLeaderboard();
    startGame();
  }
}, { passive: true }); // 👈 important: mark listener as passive



// применяем выбранный скин при старте
applySelectedSkin();


