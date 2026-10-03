// Snake-Spiel-Engine: pur JavaScript, kein React, kein Framework
// Damit unit-testbar und vom Canvas entkoppelt

export const GRID = 24;       // Gitter-Größe in Zellen
export const CELL = 16;       // Pixel pro Zelle
export const CANVAS_SIZE = GRID * CELL; // 384px

// Startgeschwindigkeit in Zellen/Sekunde
const SPEED_START = 8;
// Geschwindigkeitszunahme pro 5 Äpfel
const SPEED_STEP = 1;
// Gold-Apfel spawnt alle ~6 normalen Äpfel
const GOLD_INTERVAL = 6;
// Gold-Apfel bleibt 5 Sekunden
const GOLD_DURATION = 5000;
// Blinkt in den letzten 2 Sekunden
const GOLD_BLINK_START = 2000;

// Richtungs-Vektoren
export const DIR = {
  UP:    { x: 0, y: -1 },
  DOWN:  { x: 0, y:  1 },
  LEFT:  { x: -1, y: 0 },
  RIGHT: { x: 1, y:  0 },
};

// Zufällige freie Zelle im Gitter
function randomCell(occupied) {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (occupied.some(o => o.x === pos.x && o.y === pos.y));
  return pos;
}

// Erstellt einen neuen Spielstand
export function createInitialState() {
  const head = { x: 12, y: 12 };
  const body = [head, { x: 11, y: 12 }, { x: 10, y: 12 }];
  return {
    snake: body,
    dir: { ...DIR.RIGHT },
    nextDir: { ...DIR.RIGHT },
    apple: randomCell(body),
    goldApple: null,
    goldAppleTimer: 0,
    score: 0,
    apples: 0,       // Anzahl gefressener normaler Äpfel (für Speed und Gold)
    tick: SPEED_START,
    alive: true,
    paused: false,
  };
}

// Wiederherstellt Zustand aus gespeichertem Spielstand
export function restoreState(saved) {
  return {
    snake: saved.snakePositions.map(p => ({ ...p })),
    dir: { ...DIR.RIGHT },   // Richtung nicht gespeichert, neu starten
    nextDir: { ...DIR.RIGHT },
    apple: { ...saved.applePos },
    goldApple: saved.goldApple ? { ...saved.goldApple } : null,
    goldAppleTimer: 0,
    score: saved.score,
    apples: saved.apples,
    tick: saved.tick,
    alive: true,
    paused: false,
  };
}

// Ändert Richtung (verhindert 180°-Kehrtwendung)
export function setDirection(state, newDir) {
  const cur = state.dir;
  if (newDir.x === -cur.x && newDir.y === -cur.y) return; // 180° blockiert
  state.nextDir = { ...newDir };
}

// Einen Spielschritt berechnen
// Gibt { newState, event } zurück
// event: 'apple' | 'gold' | 'death' | null
export function step(state, now) {
  if (!state.alive || state.paused) return { newState: state, event: null };

  // Richtung übernehmen
  const dir = { ...state.nextDir };
  const head = state.snake[0];
  const newHead = {
    x: (head.x + dir.x + GRID) % GRID,
    y: (head.y + dir.y + GRID) % GRID,
  };

  // Kollision mit eigenem Körper
  const hitSelf = state.snake.slice(1).some(s => s.x === newHead.x && s.y === newHead.y);
  if (hitSelf) {
    return { newState: { ...state, alive: false }, event: 'death' };
  }

  let newSnake = [newHead, ...state.snake];
  let newScore = state.score;
  let newApples = state.apples;
  let newTick = state.tick;
  let newApple = { ...state.apple };
  let newGold = state.goldApple ? { ...state.goldApple } : null;
  let newGoldTimer = state.goldAppleTimer;
  let event = null;

  // Normalen Apfel fressen
  if (newHead.x === newApple.x && newHead.y === newApple.y) {
    newScore += 1;
    newApples += 1;
    event = 'apple';
    newApple = randomCell(newSnake);

    // Geschwindigkeit erhöhen alle 5 Äpfel
    const speedLevel = Math.floor(newApples / 5);
    newTick = Math.min(SPEED_START + speedLevel * SPEED_STEP, 20);

    // Gold-Apfel spawnen (alle ~6 Äpfel, wenn keiner aktiv)
    if (!newGold && newApples % GOLD_INTERVAL === 0) {
      newGold = { ...randomCell([...newSnake, newApple]), spawnTime: now };
      newGoldTimer = now;
    }
  } else {
    // Schlange verkürzen wenn kein Apfel
    newSnake = newSnake.slice(0, -1);
  }

  // Gold-Apfel fressen
  if (newGold && newHead.x === newGold.x && newHead.y === newGold.y) {
    newScore += 3;
    newGold = null;
    event = 'gold';
  }

  // Gold-Apfel ablaufen lassen
  if (newGold) {
    const age = now - newGold.spawnTime;
    if (age >= GOLD_DURATION) {
      newGold = null;
    }
  }

  return {
    newState: {
      ...state,
      snake: newSnake,
      dir,
      apple: newApple,
      goldApple: newGold,
      goldAppleTimer: newGoldTimer,
      score: newScore,
      apples: newApples,
      tick: newTick,
      alive: true,
    },
    event,
  };
}

// Berechnet ob Gold-Apfel blinken soll (letzte 2 Sekunden)
export function goldAppleBlink(goldApple, now) {
  if (!goldApple) return false;
  const remaining = GOLD_DURATION - (now - goldApple.spawnTime);
  if (remaining > GOLD_BLINK_START) return false;
  // Blinken: alle 250ms togglen
  return Math.floor(now / 250) % 2 === 0;
}

// Serialisiert Spielstand für Datenbank
export function serializeState(state) {
  return {
    score: state.score,
    apples: state.apples,
    tick: state.tick,
    snakePositions: state.snake,
    applePos: state.apple,
    goldApple: state.goldApple,
  };
}

// Tick-Intervall in Millisekunden
export function tickInterval(state) {
  return Math.round(1000 / state.tick);
}
