const express = require("express");
const cors = require("cors");
const Kahoot = require("kahoot.js-updated");

const app = express();
app.use(cors());
app.use(express.json());

// Keep track of active games and their clients
const activeSessions = new Map(); // pin -> array of Kahoot clients

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Kahoot Bot Server is running",
    endpoints: {
      flood: "/api/flood?pin=PIN&count=N&prefix=Bot",
      stop: "/api/stop?pin=PIN",
      status: "/api/status?pin=PIN",
    },
  });
});

// Health check for uptime monitoring
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Start flood
app.get("/api/flood", async (req, res) => {
  const pin = req.query.pin;
  const count = Math.min(parseInt(req.query.count) || 10, 100); // Cap at 100
  const prefix = req.query.prefix || "Bot";

  if (!pin) {
    return res.status(400).json({ success: false, error: "PIN is required" });
  }

  if (pin.length < 4) {
    return res.status(400).json({ success: false, error: "PIN must be at least 4 digits" });
  }

  // If already flooding this PIN, stop it first
  if (activeSessions.has(pin)) {
    stopFlood(pin);
  }

  const clients = [];
  const results = { joined: 0, failed: 0, errors: [] };
  activeSessions.set(pin, clients);

  console.log(`[START] Flooding PIN ${pin} with ${count} bots (prefix: ${prefix})`);

  for (let i = 1; i <= count; i++) {
    // Stagger joins to prevent rate limits
    setTimeout(() => {
      // Check if session wasn't stopped in the meantime
      if (!activeSessions.has(pin)) return;

      const client = new Kahoot();
      clients.push(client);

      const botName = `${prefix}_${String(i).padStart(2, "0")}`;

      client.join(pin, botName)
        .then(() => {
          results.joined++;
          console.log(`  [✓] ${botName} joined PIN ${pin}`);

          // Answer questions randomly to mimic real players
          client.on("QuestionStart", (question) => {
            const choicesCount = question.numberOfChoices;
            const randomAnswer = Math.floor(Math.random() * choicesCount);
            setTimeout(() => {
              try {
                client.answer(randomAnswer);
              } catch (err) {
                // Already disconnected
              }
            }, 1000 + Math.random() * 3000);
          });

          // Handle disconnect
          client.on("Disconnect", () => {
            console.log(`  [—] ${botName} disconnected from PIN ${pin}`);
          });
        })
        .catch((err) => {
          results.failed++;
          results.errors.push(`${botName}: ${err.message}`);
          console.error(`  [✗] ${botName} failed on PIN ${pin}: ${err.message}`);
        });
    }, i * 200);
  }

  res.json({
    success: true,
    message: `Started join sequence for ${count} bots on PIN ${pin}`,
    pin,
    count,
    prefix,
  });
});

// Stop flood
app.get("/api/stop", (req, res) => {
  const pin = req.query.pin;
  if (!pin) {
    return res.status(400).json({ success: false, error: "PIN is required" });
  }

  if (activeSessions.has(pin)) {
    const count = activeSessions.get(pin).length;
    stopFlood(pin);
    console.log(`[STOP] Disconnected ${count} bots from PIN ${pin}`);
    res.json({ success: true, message: `Stopped ${count} bots on PIN ${pin}` });
  } else {
    res.json({ success: false, message: `No active flood on PIN ${pin}` });
  }
});

function stopFlood(pin) {
  const clients = activeSessions.get(pin);
  if (clients) {
    clients.forEach((client) => {
      try {
        client.leave();
      } catch (err) {
        // already left or disconnected
      }
    });
    activeSessions.delete(pin);
  }
}

// Active session status check
app.get("/api/status", (req, res) => {
  const pin = req.query.pin;
  if (!pin) {
    // Return all active sessions
    const sessions = [];
    activeSessions.forEach((clients, sessionPin) => {
      sessions.push({ pin: sessionPin, botCount: clients.length });
    });
    return res.json({ activeSessions: sessions });
  }
  const sessionExists = activeSessions.has(pin);
  res.json({
    active: sessionExists,
    botCount: sessionExists ? activeSessions.get(pin).length : 0,
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n🤖 Kahoot Bot Server running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}\n`);
});
