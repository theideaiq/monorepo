// Spark Catcher — The IDEA's Telegram mini-game (opened from @TheIdeaDroidBot).
// Catch the falling light bulbs, dodge the bugs, keep your energy up.

const texts = {
  ar: {
    best: "أفضل نتيجة: {score}",
    final: "نتيجتك: {score}",
    intro: "حرّك إصبعك لتلتقط المصابيح 💡 وتتجنّب الحشرات 👾.",
    lightsOut: "انطفأت الأنوار",
    restart: "أشعلها من جديد ⚡",
    start: "ابدأ اللعب",
  },
  en: {
    best: "Best: {score}",
    final: "Score: {score}",
    intro: "Move your finger to catch the bulbs 💡 and dodge the bugs 👾.",
    lightsOut: "Lights out",
    restart: "Reignite ⚡",
    start: "Play",
  },
};

const BRAND_YELLOW = "#f4cf08";
const DANGER_RED = "#ef4444";
const PLAYER_OFFSET = 30;
const CATCH_RADIUS = 40;
const ITEM_MARGIN = 24;
// Movement is tuned for 60 frames per second and scaled by elapsed time, so
// the game runs at the same speed on 60, 90 and 120 Hz screens.
const FRAME_MS = 1000 / 60;
const MAX_STEP = 3;
const SPAWN_CHANCE = 0.05;
const BUG_CHANCE = 0.2;
const BEST_KEY = "spark-catcher:best";

const telegram = window.Telegram?.WebApp;
const languageCode =
  telegram?.initDataUnsafe?.user?.language_code ?? navigator.language ?? "ar";
const language = languageCode.toLowerCase().startsWith("ar") ? "ar" : "en";
const t = (key, score) =>
  texts[language][key].replace("{score}", String(score ?? ""));

document.documentElement.lang = language;
document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestLabel = document.getElementById("best");
const energyBar = document.getElementById("energy-bar");
const energyFill = document.getElementById("energy-fill");
const overlay = document.getElementById("overlay");
const title = document.getElementById("title");
const message = document.getElementById("message");
const finalScore = document.getElementById("final");
const startButton = document.getElementById("start");

let width = 0;
let height = 0;
let playerX = 0;
let running = false;
let frame = 0;
let lastTime = 0;
let score = 0;
let energy = 100;
let items = [];

const readBest = () => {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

const saveBest = (value) => {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be unavailable (private mode); the best score is optional.
  }
};

let best = readBest();

const showBest = () => {
  bestLabel.textContent = best > 0 ? t("best", best) : "";
};

const resize = () => {
  const ratio = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  playerX = Math.min(Math.max(playerX || width / 2, 0), width);
};

const haptic = (kind) => {
  const feedback = telegram?.HapticFeedback;
  if (!feedback) {
    return;
  }
  if (kind === "catch" && typeof feedback.impactOccurred === "function") {
    feedback.impactOccurred("light");
  }
  if (kind === "hit" && typeof feedback.notificationOccurred === "function") {
    feedback.notificationOccurred("error");
  }
};

const createItem = () => ({
  size: 30,
  speed: 3 + Math.random() * 5,
  type: Math.random() < BUG_CHANCE ? "bug" : "bulb",
  x: ITEM_MARGIN + Math.random() * Math.max(width - ITEM_MARGIN * 2, 1),
  y: -50,
});

const drawBackground = () => {
  context.fillStyle = "#111";
  context.fillRect(0, 0, width, height);
};

const drawPlayer = () => {
  const y = height - PLAYER_OFFSET;
  context.strokeStyle = BRAND_YELLOW;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(playerX, y + 10);
  context.lineTo(playerX, height);
  context.stroke();

  context.shadowBlur = 20;
  context.shadowColor = BRAND_YELLOW;
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(playerX, y, 10, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
};

const drawItem = (item) => {
  context.font = `${item.size}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(item.type === "bulb" ? "💡" : "👾", item.x, item.y);
};

const updateHud = () => {
  const level = Math.max(0, Math.min(100, energy));
  scoreLabel.textContent = String(score);
  energyFill.style.width = `${level}%`;
  energyFill.style.backgroundColor = level < 30 ? DANGER_RED : BRAND_YELLOW;
  energyBar.setAttribute("aria-valuenow", String(Math.round(level)));
};

const showOverlay = (gameOver) => {
  title.textContent = gameOver ? t("lightsOut") : "Spark Catcher";
  message.textContent = gameOver ? "" : t("intro");
  finalScore.textContent = gameOver ? t("final", score) : "";
  startButton.textContent = gameOver ? t("restart") : t("start");
  overlay.classList.add("visible");
};

const endGame = () => {
  running = false;
  cancelAnimationFrame(frame);
  if (score > best) {
    best = score;
    saveBest(best);
  }
  showBest();
  showOverlay(true);
};

const step = (time) => {
  if (!running) {
    return;
  }
  const delta = Math.min((time - lastTime) / FRAME_MS, MAX_STEP);
  lastTime = time;

  drawBackground();
  drawPlayer();

  if (Math.random() < SPAWN_CHANCE * delta) {
    items.push(createItem());
  }

  const playerY = height - PLAYER_OFFSET;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    item.y += item.speed * delta;
    drawItem(item);

    if (Math.hypot(item.x - playerX, item.y - playerY) < CATCH_RADIUS) {
      if (item.type === "bulb") {
        score += 10;
        energy = Math.min(100, energy + 10);
        haptic("catch");
      } else {
        energy -= 30;
        haptic("hit");
      }
      items.splice(index, 1);
    } else if (item.y > height + item.size) {
      items.splice(index, 1);
      if (item.type === "bulb") {
        // A missed opportunity.
        energy -= 5;
      }
    }
  }

  updateHud();

  if (energy <= 0) {
    endGame();
    return;
  }
  frame = requestAnimationFrame(step);
};

const startGame = () => {
  cancelAnimationFrame(frame);
  overlay.classList.remove("visible");
  score = 0;
  energy = 100;
  items = [];
  running = true;
  updateHud();
  lastTime = performance.now();
  frame = requestAnimationFrame(step);
};

const moveTo = (clientX) => {
  playerX = Math.min(Math.max(clientX, 0), width);
};

window.addEventListener("resize", resize);
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 0) {
      event.preventDefault();
      moveTo(event.touches[0].clientX);
    }
  },
  { passive: false }
);
document.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length > 0 && running) {
      moveTo(event.touches[0].clientX);
    }
  },
  { passive: true }
);
document.addEventListener("mousemove", (event) => moveTo(event.clientX));
startButton.addEventListener("click", startGame);

// Don't count the time the game spent in the background.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    lastTime = performance.now();
  }
});

if (telegram) {
  telegram.ready();
  telegram.expand();
}

resize();
drawBackground();
showBest();
updateHud();
showOverlay(false);
