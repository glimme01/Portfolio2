const express = require("express");
const cors = require("cors");
const Kahoot = require("kahoot.js-updated");

const app = express();
app.use(cors());
app.use(express.json());

// Keep track of active games and their clients
const activeSessions = new Map(); // pin -> array of Kahoot clients

app.get("/", (req, res) => {
  res.send("Kahoot Proxy Backend is running. Use /api/flood to start.");
});

// Start flood
app.get("/api/flood", (req, res) => {
  const pin = req.query.pin;
  const count = parseInt(req.query.count) || 10;
  const prefix = req.query.prefix || "MF_Bot";

  if (!pin) {
    return res.status(400).json({ error: "PIN is required" });
  }

  // If already flooding this PIN, stop it first
  if (activeSessions.has(pin)) {
    stopFlood(pin);
  }

  const clients = [];
  activeSessions.set(pin, clients);

  console.log(`Starting flood on game PIN ${pin} with ${count} bots (prefix: ${prefix})`);

  let joinedCount = 0;
  let failedCount = 0;

  for (let i = 1; i <= count; i++) {
    // Stagger joins slightly to prevent rate limits
    setTimeout(() => {
      // Check if session wasn't stopped in the meantime
      if (!activeSessions.has(pin)) return;

      const client = new Kahoot();
      clients.push(client);

      const botName = `${prefix}_${String(i).padStart(2, "0")}`;

      client.join(pin, botName)
        .then(() => {
          joinedCount++;
          console.log(`[Bot Joined] ${botName} on PIN ${pin}`);

          // Listen for questions and answer randomly to mimic real players
          client.on("QuestionStart", (question) => {
            const choicesCount = question.numberOfChoices;
            const randomAnswer = Math.floor(Math.random() * choicesCount);
            // Answer after a slight delay
            setTimeout(() => {
              try {
                client.answer(randomAnswer);
              } catch (err) {
                console.error(`Error answering for ${botName}:`, err.message);
              }
            }, 1000 + Math.random() * 2000);
          });
        })
        .catch((err) => {
          failedCount++;
          console.error(`[Bot Failed] ${botName} on PIN ${pin}:`, err.message);
        });
    }, i * 200);
  }

  res.json({
    success: true,
    message: `Started join sequence for ${count} bots on PIN ${pin}`,
  });
});

// Stop flood
app.get("/api/stop", (req, res) => {
  const pin = req.query.pin;
  if (!pin) {
    return res.status(400).json({ error: "PIN is required" });
  }

  if (activeSessions.has(pin)) {
    stopFlood(pin);
    res.json({ success: true, message: `Stopped flooding on PIN ${pin}` });
  } else {
    res.json({ success: false, message: `No active flood found on PIN ${pin}` });
  }
});

function stopFlood(pin) {
  const clients = activeSessions.get(pin);
  if (clients) {
    console.log(`Stopping flood and disconnecting bots on PIN ${pin}`);
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
    return res.status(400).json({ error: "PIN is required" });
  }
  const sessionExists = activeSessions.has(pin);
  res.json({
    active: sessionExists,
    botCount: sessionExists ? activeSessions.get(pin).length : 0,
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Kahoot Proxy Backend running on port ${PORT}`);
});
