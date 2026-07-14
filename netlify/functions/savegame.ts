import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

// Hash utility function using Web Crypto API
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);                    
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default async (req: Request, context: Context) => {
  const store = getStore("savegames");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const { action, name, password, state } = body;

      if (!action || !name || !password) {
        return new Response(JSON.stringify({ error: "Missing action, name, or password" }), { status: 400, headers });
      }

      const key = name.toLowerCase();
      const passwordHash = await sha256(password);
      
      // Determine if this is an admin action by checking the provided admin password
      const isAdminAction = password === (process.env.VITE_ADMIN_PASSWORD || "moritz2026");

      const existingDataRaw = await store.get(key, { type: "json" });
      const existingData = existingDataRaw as { passwordHash: string; state: any } | null;

      if (action === "save") {
        if (!isAdminAction && existingData && existingData.passwordHash !== passwordHash) {
          return new Response(JSON.stringify({ error: "Falsches Passwort" }), { status: 401, headers });
        }
        // If admin, we keep the old password hash so the user can still log in!
        const finalHash = (isAdminAction && existingData) ? existingData.passwordHash : passwordHash;
        await store.setJSON(key, { passwordHash: finalHash, state });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === "load") {
        if (!existingData) {
          return new Response(JSON.stringify({ error: "Account nicht gefunden" }), { status: 404, headers });
        }
        if (!isAdminAction && existingData.passwordHash !== passwordHash) {
          return new Response(JSON.stringify({ error: "Falsches Passwort" }), { status: 401, headers });
        }
        return new Response(JSON.stringify({ success: true, state: existingData.state }), { status: 200, headers });
      }

      if (action === "delete") {
        if (!existingData) {
           return new Response(JSON.stringify({ error: "Account nicht gefunden" }), { status: 404, headers });
        }
        if (!isAdminAction && existingData.passwordHash !== passwordHash) {
          return new Response(JSON.stringify({ error: "Falsches Passwort" }), { status: 401, headers });
        }
        await store.delete(key);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }
      
      if (action === "admin_update" && isAdminAction) {
        if (!existingData) {
          return new Response(JSON.stringify({ error: "Account nicht gefunden" }), { status: 404, headers });
        }
        // Update specific fields in state
        const updatedState = { ...existingData.state, ...state };
        await store.setJSON(key, { passwordHash: existingData.passwordHash, state: updatedState });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === "admin_reset_all" && isAdminAction) {
         let count = 0;
         const listResult = await store.list();
         for (const blob of listResult.blobs) {
            await store.delete(blob.key);
            count++;
         }
         return new Response(JSON.stringify({ success: true, deletedCount: count }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: "Unbekannte Aktion" }), { status: 400, headers });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: "Server Fehler" }), { status: 500, headers });
    }
  }

  return new Response("Method not allowed", { status: 405, headers });
};
