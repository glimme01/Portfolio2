import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  type: "user" | "system";
  timestamp: number;
  isFlex?: boolean;
}

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 100;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const BAD_WORDS = [
  "arsch", "scheiße", "scheisse", "fuck", "shit", "bitch",
  "damn", "idiot", "hurensohn", "fotze", "wichser",
];

function filterBadWords(text: string): string {
  let filtered = text;
  for (const word of BAD_WORDS) {
    const regex = new RegExp(word, "gi");
    filtered = filtered.replace(regex, "***");
  }
  return filtered;
}

export default async (req: Request, context: Context) => {
  const store = getStore("chat-messages");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method === "GET") {
    try {
      const data = await store.get("messages", { type: "json" });
      const messages: ChatMessage[] = data || [];
      // Filter old messages
      const now = Date.now();
      const active = messages.filter(m => now - m.timestamp < MAX_AGE_MS);
      return new Response(JSON.stringify(active.slice(-MAX_MESSAGES)), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify([]), { status: 200, headers });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const { author, text, type, isFlex } = body;

      if (!author || !text) {
        return new Response(JSON.stringify({ error: "Missing author or text" }), { status: 400, headers });
      }

      const filteredText = filterBadWords(text.slice(0, MAX_MESSAGE_LENGTH));

      const msg: ChatMessage = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        author: filterBadWords(author.slice(0, 20)),
        text: filteredText,
        type: type || "user",
        timestamp: Date.now(),
        isFlex: isFlex || false,
      };

      const data = await store.get("messages", { type: "json" });
      let messages: ChatMessage[] = data || [];

      // Cleanup old messages
      const now = Date.now();
      messages = messages.filter(m => now - m.timestamp < MAX_AGE_MS);

      messages.push(msg);
      // Keep only last MAX_MESSAGES
      messages = messages.slice(-MAX_MESSAGES);

      await store.setJSON("messages", messages);
      return new Response(JSON.stringify(messages), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to send" }), { status: 500, headers });
    }
  }

  return new Response("Method not allowed", { status: 405, headers });
};
