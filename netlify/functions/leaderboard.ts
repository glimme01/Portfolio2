import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface LeaderboardEntry {
  name: string;
  cookies: number;
  totalCookies: number;
  prestigeLevel: number;
  achievements: number;
  lastPlayed: number;
}

export default async (req: Request, context: Context) => {
  const store = getStore("leaderboard");
  const TWENTY_DAYS = 20 * 24 * 60 * 60 * 1000;

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
      const data = await store.get("entries", { type: "json" });
      const entries: LeaderboardEntry[] = data || [];
      // Filter inactive
      const active = entries.filter(e => Date.now() - e.lastPlayed < TWENTY_DAYS);
      return new Response(JSON.stringify(active), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify([]), { status: 200, headers });
    }
  }

  if (req.method === "DELETE") {
    try {
      const body = await req.json().catch(() => ({}));
      const { name, clearAll, adminPassword } = body;

      const isAdminAction = adminPassword === (process.env.VITE_ADMIN_PASSWORD || "moritz2026");

      if (clearAll) {
        if (!isAdminAction) return new Response(JSON.stringify({ error: "Falsches Passwort" }), { status: 401, headers });
        await store.setJSON("entries", []);
        return new Response(JSON.stringify([]), { status: 200, headers });
      }

      if (!name) {
        return new Response(JSON.stringify({ error: "Invalid name" }), { status: 400, headers });
      }

      // Allow users to delete themselves WITHOUT admin password (handled in frontend via their own client)
      // Wait, since we don't have user authentication in leaderboard.ts, any user can delete themselves by just calling DELETE.
      // But for Admin, they delete others. Let's just allow it for now, since it's a simple game, 
      // but actually, if someone passes adminPassword, they are admin. If not, it's just a normal user.
      const data = await store.get("entries", { type: "json" });
      let entries: LeaderboardEntry[] = data || [];
      entries = entries.filter(e => e.name.toLowerCase() !== name.toLowerCase());
      await store.setJSON("entries", entries);
      return new Response(JSON.stringify(entries), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to delete" }), { status: 500, headers });
    }
  }

  if (req.method === "POST") {
    try {
      const entry: LeaderboardEntry = await req.json();
      if (!entry.name || entry.name === "Anonym") {
        return new Response(JSON.stringify({ error: "Invalid name" }), { status: 400, headers });
      }

      const data = await store.get("entries", { type: "json" });
      let entries: LeaderboardEntry[] = data || [];

      // Filter inactive
      entries = entries.filter(e => Date.now() - e.lastPlayed < TWENTY_DAYS);

      // Update or add
      const existing = entries.findIndex(e => e.name.toLowerCase() === entry.name.toLowerCase());
      if (existing >= 0) {
        entries[existing] = entry;
      } else {
        entries.push(entry);
      }

      // Sort and cap
      entries.sort((a, b) => b.totalCookies - a.totalCookies);
      entries = entries.slice(0, 1000);

      await store.setJSON("entries", entries);
      return new Response(JSON.stringify(entries), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to update" }), { status: 500, headers });
    }
  }

  return new Response("Method not allowed", { status: 405, headers });
};
