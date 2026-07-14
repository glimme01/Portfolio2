import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface FeedbackEntry {
  id: string;
  author: string;
  text: string;
  rating: number;
  timestamp: number;
}

const MAX_FEEDBACK_LENGTH = 500;

export default async (req: Request, context: Context) => {
  const store = getStore("feedback");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // GET — Admin only (returns all feedback)
  if (req.method === "GET") {
    try {
      const data = await store.get("entries", { type: "json" });
      const entries: FeedbackEntry[] = data || [];
      return new Response(JSON.stringify(entries), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify([]), { status: 200, headers });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const { author, text, rating } = body;

      if (!text || !rating) {
        return new Response(JSON.stringify({ error: "Missing text or rating" }), { status: 400, headers });
      }

      const entry: FeedbackEntry = {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        author: (author || "Anonym").slice(0, 20),
        text: text.slice(0, MAX_FEEDBACK_LENGTH),
        rating: Math.min(5, Math.max(1, Math.floor(rating))),
        timestamp: Date.now(),
      };

      const data = await store.get("entries", { type: "json" });
      let entries: FeedbackEntry[] = data || [];
      entries.push(entry);
      // Keep last 500 feedbacks
      entries = entries.slice(-500);
      await store.setJSON("entries", entries);

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500, headers });
    }
  }

  return new Response("Method not allowed", { status: 405, headers });
};
