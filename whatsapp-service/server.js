/**
 * WhatsApp delivery sidecar for the Agrawal Samaj Mansrovar Jaipur portal.
 *
 * Uses @whiskeysockets/baileys — a pure WebSocket WhatsApp Web client that
 * does NOT need a headless Chrome browser. This lets it run comfortably on
 * Railway Free Tier (512 MB RAM) where whatsapp-web.js + Puppeteer would OOM.
 *
 * Endpoints:
 *   GET  /status      — session state, safe to poll
 *   GET  /qr          — HTML page with the pairing QR (scan once to link a phone)
 *   GET  /qr.png      — the same pairing QR as a raw image
 *   POST /send-media  — send an image (the pass QR) with a caption
 *   POST /send-text   — send a plain text message
 *   POST /restart     — force a full session restart
 *
 * Every send endpoint requires the x-api-key header when WHATSAPP_API_KEY is set.
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const QRCode = require("qrcode");
const pino = require("pino");

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const PORT = parseInt(process.env.PORT || "3001", 10);
const API_KEY = process.env.WHATSAPP_API_KEY || "";
const AUTH_DIR = process.env.SESSION_DIR || path.join(__dirname, "auth_info");
const DEFAULT_COUNTRY_CODE = (process.env.DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "");

// Baileys is very chatty by default; silence it to keep Railway logs clean.
const logger = pino({ level: "warn" });

// ─────────────────────────── Session state ───────────────────────────
const state = {
  status: "starting", // starting | qr | ready | disconnected | auth_failure
  qrString: null,
  lastError: null,
  readyAt: null,
  me: null,
};

let sock = null;
let isRecovering = false;

// ─────────────────────────── Baileys setup ───────────────────────────

async function startSocket() {
  // Make sure auth dir exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, logger),
    },
    printQRInTerminal: true,
    // Prevent Baileys from spamming the phone's "message history" sync
    // on every reconnect — it can OOM small containers.
    syncFullHistory: false,
    // Mark messages as "received" automatically so the phone doesn't
    // keep retrying delivery.
    markOnlineOnConnect: false,
  });

  // ── QR code ──
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state.status = "qr";
      state.qrString = qr;
      console.log("\n[whatsapp] Scan this QR code with the sending WhatsApp account:");
      console.log("[whatsapp] (WhatsApp > Settings > Linked devices > Link a device)\n");
      // Print QR to Railway deploy logs so you can scan from the dashboard
      try {
        const smallQR = await QRCode.toString(qr, { type: "terminal", small: true });
        console.log(smallQR);
      } catch (_) {}
      console.log(`\n[whatsapp] Or open http://localhost:${PORT}/qr in a browser.\n`);
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode || 0;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.warn(
        `[whatsapp] Connection closed (code ${statusCode}).`,
        shouldReconnect ? "Reconnecting..." : "Logged out — scan QR again."
      );

      if (statusCode === DisconnectReason.loggedOut) {
        // Session is permanently invalid — wipe auth and restart fresh
        state.status = "disconnected";
        state.lastError = "Logged out on phone";
        try {
          await fs.promises.rm(AUTH_DIR, { recursive: true, force: true });
        } catch (_) {}
      }

      if (shouldReconnect && !isRecovering) {
        isRecovering = true;
        state.status = "starting";
        setTimeout(async () => {
          try {
            await startSocket();
          } catch (e) {
            state.status = "auth_failure";
            state.lastError = String(e);
            console.error("[whatsapp] Reconnection failed:", e);
          } finally {
            isRecovering = false;
          }
        }, 3000);
      } else if (!shouldReconnect) {
        // Logged out — restart to show a fresh QR
        isRecovering = true;
        setTimeout(async () => {
          try {
            await startSocket();
          } catch (e) {
            state.status = "auth_failure";
            state.lastError = String(e);
          } finally {
            isRecovering = false;
          }
        }, 3000);
      }
    }

    if (connection === "open") {
      state.status = "ready";
      state.qrString = null;
      state.readyAt = new Date().toISOString();
      state.lastError = null;
      // Extract the phone number from the session credentials
      state.me = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0] || null;
      console.log(`[whatsapp] Ready. Sending as +${state.me}`);
    }
  });

  // ── Persist credentials on every update ──
  sock.ev.on("creds.update", saveCreds);

  // Silence message-related events — we only send, not receive
  sock.ev.on("messages.upsert", () => {});
}

// ─────────────────────────── Helpers ───────────────────────────

/**
 * Normalize an arbitrary user-entered phone number to digits with a country
 * code. Mirrors the backend's assumption that bare 10-digit numbers are Indian.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // Strip a leading 0 (common in locally-written numbers) before adding a code.
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }
  return digits;
}

/**
 * Build a WhatsApp JID from a phone number.
 * Baileys uses number@s.whatsapp.net (not @c.us).
 */
function toJid(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return `${digits}@s.whatsapp.net`;
}

function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // no key configured = open (dev only)
  if (req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({ success: false, error: "Invalid or missing x-api-key" });
  }
  return next();
}

function requireReady(req, res, next) {
  if (state.status !== "ready") {
    return res.status(503).json({
      success: false,
      error: `WhatsApp session is not ready (status: ${state.status}). Visit /qr to link a device.`,
      status: state.status,
    });
  }
  return next();
}

// A crash anywhere inside Baileys's internals must not take the whole HTTP API
// down with it — /status and /qr need to stay reachable.
process.on("unhandledRejection", (reason) => {
  console.error("[whatsapp] Unhandled rejection (server staying up):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[whatsapp] Uncaught exception (server staying up):", err);
});

// ─────────────────────────── HTTP API ───────────────────────────
const app = express();
// Pass QR PNGs are a few KB, but allow headroom for larger media.
app.use(express.json({ limit: "15mb" }));

app.get("/status", (req, res) => {
  res.json({
    status: state.status,
    ready: state.status === "ready",
    sending_as: state.me,
    ready_at: state.readyAt,
    last_error: state.lastError,
  });
});

app.get("/qr.png", async (req, res) => {
  if (!state.qrString) {
    return res.status(404).json({
      success: false,
      error: `No pairing QR available (status: ${state.status}).`,
    });
  }
  try {
    const png = await QRCode.toBuffer(state.qrString, { width: 400, margin: 2 });
    res.type("png").send(png);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/qr", (req, res) => {
  if (state.status === "ready") {
    return res.send(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
         <h2>✅ WhatsApp is linked and ready</h2>
         <p>Sending as <b>+${state.me}</b></p>
       </body></html>`
    );
  }
  if (!state.qrString) {
    return res.send(
      `<html><head><meta http-equiv="refresh" content="3"></head>
       <body style="font-family:sans-serif;text-align:center;padding:60px">
         <h2>Waiting for pairing QR…</h2>
         <p>Status: <b>${state.status}</b> — this page refreshes automatically.</p>
       </body></html>`
    );
  }
  res.send(
    `<html><head><meta http-equiv="refresh" content="20"></head>
     <body style="font-family:sans-serif;text-align:center;padding:40px">
       <h2>Link the sending WhatsApp account</h2>
       <p>WhatsApp → Settings → Linked devices → Link a device</p>
       <img src="/qr.png?t=${Date.now()}" width="400" height="400" alt="Pairing QR" />
       <p style="color:#888;font-size:13px">This code rotates; the page refreshes every 20s.</p>
     </body></html>`
  );
});

/**
 * POST /send-media
 * Body: {
 *   phone: "9876543210",
 *   caption: "Your ticket ...",
 *   media: { base64: "...", mimetype: "image/png", filename: "pass.png" }
 *      — or —
 *   file_path: "C:/.../static/qr/<id>.png"
 * }
 */
app.post("/send-media", requireApiKey, requireReady, async (req, res) => {
  const { phone, caption, media, file_path: filePath } = req.body || {};

  if (!phone) {
    return res.status(400).json({ success: false, error: "phone is required" });
  }

  let mediaBuffer;
  let mimetype = "image/png";
  try {
    if (media && media.base64) {
      mediaBuffer = Buffer.from(media.base64, "base64");
      mimetype = media.mimetype || "image/png";
    } else if (filePath) {
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ success: false, error: `File not found: ${filePath}` });
      }
      mediaBuffer = fs.readFileSync(filePath);
      // Guess mimetype from extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".pdf") mimetype = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") mimetype = "image/jpeg";
      else if (ext === ".png") mimetype = "image/png";
    } else {
      return res.status(400).json({ success: false, error: "media.base64 or file_path is required" });
    }
  } catch (e) {
    return res.status(400).json({ success: false, error: `Could not read media: ${e.message}` });
  }

  try {
    const jid = toJid(phone);
    if (!jid) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    // Decide message content based on mimetype
    let messageContent;
    if (mimetype.startsWith("image/")) {
      messageContent = {
        image: mediaBuffer,
        caption: caption || undefined,
        mimetype,
      };
    } else if (mimetype === "application/pdf") {
      messageContent = {
        document: mediaBuffer,
        caption: caption || undefined,
        mimetype,
        fileName: (media && media.filename) || "document.pdf",
      };
    } else {
      messageContent = {
        document: mediaBuffer,
        caption: caption || undefined,
        mimetype,
        fileName: (media && media.filename) || "file",
      };
    }

    const sent = await sock.sendMessage(jid, messageContent);
    const messageId = sent?.key?.id || null;
    if (messageId) {
      console.log(`[whatsapp] Sent media to ${jid} (${messageId})`);
    } else {
      console.warn(`[whatsapp] Sent media to ${jid}, no message id returned (likely still delivered).`);
    }
    return res.json({ success: true, message_id: messageId || "sent_unconfirmed", chat_id: jid });
  } catch (e) {
    console.error("[whatsapp] send-media failed:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

/** POST /send-text  Body: { phone, message } */
app.post("/send-text", requireApiKey, requireReady, async (req, res) => {
  const { phone, message } = req.body || {};
  if (!phone || !message) {
    return res.status(400).json({ success: false, error: "phone and message are required" });
  }
  try {
    const jid = toJid(phone);
    if (!jid) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }
    const sent = await sock.sendMessage(jid, { text: message });
    const messageId = sent?.key?.id || null;
    if (messageId) {
      console.log(`[whatsapp] Sent text to ${jid} (${messageId})`);
    } else {
      console.warn(`[whatsapp] Sent text to ${jid}, no message id returned (likely still delivered).`);
    }
    return res.json({ success: true, message_id: messageId || "sent_unconfirmed", chat_id: jid });
  } catch (e) {
    console.error("[whatsapp] send-text failed:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

/** POST /restart — Force a full session restart */
app.post("/restart", requireApiKey, async (req, res) => {
  if (isRecovering) {
    return res.status(409).json({ success: false, error: "Recovery already in progress." });
  }
  console.log("[whatsapp] Manual restart requested via /restart endpoint.");
  isRecovering = true;
  state.status = "starting";
  state.lastError = null;
  try {
    if (sock) {
      try { sock.end(undefined); } catch (_) {}
    }
    await startSocket();
    res.json({ success: true, message: "Client restarted. Waiting for ready state." });
  } catch (e) {
    state.status = "auth_failure";
    state.lastError = String(e);
    console.error("[whatsapp] Restart failed:", e);
    res.status(500).json({ success: false, error: e.message });
  } finally {
    isRecovering = false;
  }
});

// ─────────────────────────── Boot ───────────────────────────
app.listen(PORT, () => {
  console.log(`[whatsapp] HTTP API listening on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn("[whatsapp] WHATSAPP_API_KEY is not set — the send endpoints are UNPROTECTED.");
  }
  console.log(`[whatsapp] Open http://localhost:${PORT}/qr to link a device.`);
});

console.log("[whatsapp] Starting Baileys client (no browser needed!)...");
startSocket().catch((e) => {
  state.status = "auth_failure";
  state.lastError = e.message;
  console.error("[whatsapp] Failed to initialize:", e);
});

// Shut down cleanly so the session isn't corrupted.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[whatsapp] ${sig} received, closing session...`);
    try {
      if (sock) sock.end(undefined);
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}
