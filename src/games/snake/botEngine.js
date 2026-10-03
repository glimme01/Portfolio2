// Bot-KI für Snake (VS BOT Modus)
import { GRID, DIR } from './engine.js';

// Distanz im Ring-Gitter mit Berücksichtigung von Wrap-Around
function gridDistance(p1, p2) {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  const wrapDx = Math.min(dx, GRID - dx);
  const wrapDy = Math.min(dy, GRID - dy);
  return wrapDx + wrapDy;
}

// Initialer Bot-Zustand
export function createBotState() {
  const head = { x: 4, y: 4 };
  const body = [head, { x: 3, y: 4 }, { x: 2, y: 4 }];
  return {
    snake: body,
    dir: { ...DIR.RIGHT },
    score: 0,
    alive: true,
    respawnTimer: 0,
  };
}

// Berechnet den besten nächsten Zug für den Bot
export function computeBotMove(botState, playerState, targetApple) {
  if (!botState.alive || botState.snake.length === 0) return DIR.RIGHT;

  const head = botState.snake[0];
  const curDir = botState.dir;
  const target = targetApple || { x: 12, y: 12 };

  // Alle 4 Himmelsrichtungen
  const directions = [DIR.UP, DIR.RIGHT, DIR.DOWN, DIR.LEFT];

  // Hindernisse: eigener Körper (ab Segment 1) + Körper der Spieler-Schlange
  const obstacles = new Set();
  botState.snake.slice(1).forEach(s => obstacles.add(`${s.x},${s.y}`));
  if (playerState && playerState.alive) {
    playerState.snake.forEach(s => obstacles.add(`${s.x},${s.y}`));
  }

  // Gültige Züge ermitteln (keine 180° Wende & keine Kollision)
  const validMoves = directions.filter(d => {
    // 180° Wende verboten
    if (d.x === -curDir.x && d.y === -curDir.y) return false;

    const nx = (head.x + d.x + GRID) % GRID;
    const ny = (head.y + d.y + GRID) % GRID;
    return !obstacles.has(`${nx},${ny}`);
  });

  if (validMoves.length === 0) {
    // Keine Rettung möglich
    return curDir;
  }

  // Wähle den Zug mit kürzester Distanz zum Apfel
  validMoves.sort((a, b) => {
    const na = { x: (head.x + a.x + GRID) % GRID, y: (head.y + a.y + GRID) % GRID };
    const nb = { x: (head.x + b.x + GRID) % GRID, y: (head.y + b.y + GRID) % GRID };
    return gridDistance(na, target) - gridDistance(nb, target);
  });

  return validMoves[0];
}

// Bot einen Schritt bewegen
// Gibt { newBotState, event } zurück ('apple', 'death', null)
export function stepBot(botState, playerState, targetApple) {
  if (!botState.alive) {
    if (botState.respawnTimer > 0) {
      return { newBotState: { ...botState, respawnTimer: botState.respawnTimer - 1 }, event: null };
    } else {
      // Respawn
      const fresh = createBotState();
      return { newBotState: fresh, event: 'respawn' };
    }
  }

  const nextDir = computeBotMove(botState, playerState, targetApple);
  const head = botState.snake[0];
  const newHead = {
    x: (head.x + nextDir.x + GRID) % GRID,
    y: (head.y + nextDir.y + GRID) % GRID,
  };

  // Kollision prüfen mit eigenem Körper oder Spieler-Schlange
  const hitSelf = botState.snake.slice(1).some(s => s.x === newHead.x && s.y === newHead.y);
  const hitPlayer = playerState && playerState.alive
    ? playerState.snake.some(s => s.x === newHead.x && s.y === newHead.y)
    : false;

  if (hitSelf || hitPlayer) {
    return {
      newBotState: {
        ...botState,
        alive: false,
        respawnTimer: 15, // nach 15 Ticks (~2s) respawnen
      },
      event: 'death',
    };
  }

  let newSnake = [newHead, ...botState.snake];
  let newScore = botState.score;
  let event = null;

  // Apfel gefressen?
  if (targetApple && newHead.x === targetApple.x && newHead.y === targetApple.y) {
    newScore += 1;
    event = 'apple';
  } else {
    newSnake = newSnake.slice(0, -1);
  }

  return {
    newBotState: {
      ...botState,
      snake: newSnake,
      dir: nextDir,
      score: newScore,
    },
    event,
  };
}
