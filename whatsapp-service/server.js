/**
 * WhatsApp delivery sidecar for the Agrawal Samaj Mansrovar Jaipur portal.
 *
 * The FastAPI backend cannot run whatsapp-web.js (it is Node-only), so this
 * process owns the WhatsApp session and exposes a small HTTP API the backend
 * calls when an event payment is approved.
 *
 * Endpoints:
 *   GET  /status      — session state, safe to poll
 *   GET  /qr          — HTML page with the pairing QR (scan once to link a phone)
 *   GET  /qr.png      — the same pairing QR as a raw image
 *   POST /send-media  — send an image (the pass QR) with a caption
 *   POST /send-text   — send a plain text message
 *
 * Every endpoint except /status and the /qr pair requires the x-api-key header.
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const QRCode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

const PORT = parseInt(process.env.PORT || "3001", 10);
const API_KEY = process.env.WHATSAPP_API_KEY || "";
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, ".wwebjs_auth");
const DEFAULT_COUNTRY_CODE = (process.env.DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "");

// ─────────────────────────── Session state ───────────────────────────
const state = {
  status: "starting", // starting | qr | authenticated | ready | disconnected | auth_failure
  qrString: null,
  lastError: null,
  readyAt: null,
  me: null,
};

// Guards against overlapping reinitialize attempts. whatsapp-web.js can emit
// "disconnected" more than once for the same event (observed with LOGOUT),
// and two concurrent client.initialize() calls fight over the same Chrome
// profile directory — that's what produced "browser is already running" /
// EBUSY crashes.
let isRecovering = false;

/**
 * Delete a directory, retrying past transient Windows file locks (EBUSY /
 * EPERM) left behind by a Chrome process that hasn't fully released its
 * profile files yet.
 */
async function removeDirWithRetry(dir, attempts = 5, delayMs = 1000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return true;
    } catch (e) {
      if (i === attempts) {
        console.error(`[whatsapp] Could not remove session dir after ${attempts} attempts:`, e.message);
        return false;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  },
});

client.on("qr", (qr) => {
  state.status = "qr";
  state.qrString = qr;
  console.log("\n[whatsapp] Scan this QR code with the sending WhatsApp account:");
  console.log("[whatsapp] (WhatsApp > Settings > Linked devices > Link a device)\n");
  qrcodeTerminal.generate(qr, { small: true });
  console.log(`\n[whatsapp] Or open http://localhost:${PORT}/qr in a browser.\n`);
});

client.on("authenticated", () => {
  state.status = "authenticated";
  state.qrString = null;
  console.log("[whatsapp] Authenticated. Finishing handshake...");
});

client.on("ready", () => {
  state.status = "ready";
  state.qrString = null;
  state.readyAt = new Date().toISOString();
  state.me = client.info?.wid?.user || null;
  console.log(`[whatsapp] Ready. Sending as +${state.me}`);
});

client.on("auth_failure", (msg) => {
  state.status = "auth_failure";
  state.lastError = String(msg);
  console.error("[whatsapp] Authentication failed:", msg);
});

client.on("disconnected", (reason) => {
  state.status = "disconnected";
  state.lastError = String(reason);
  console.warn("[whatsapp] Disconnected:", reason);

  if (isRecovering) {
    console.warn("[whatsapp] Recovery already in progress, ignoring duplicate disconnect event.");
    return;
  }
  isRecovering = true;

  setTimeout(async () => {
    try {
      // Always try to fully close the old browser first — reinitializing
      // (or deleting session files) while it's still holding the profile
      // directory open is exactly what caused the EBUSY crash.
      try {
        await client.destroy();
      } catch (e) {
        console.warn("[whatsapp] destroy() during recovery raised (ignoring):", e.message);
      }

      if (reason === "LOGOUT") {
        // LOGOUT means the phone unlinked this device — the saved session is
        // permanently invalid, not just disconnected. Reusing it would just
        // reproduce the same crash, so wipe it and come back up needing a
        // fresh QR scan instead of guessing at a silent reconnect.
        console.warn("[whatsapp] Session was logged out on the phone. Clearing local session, a new QR scan will be required.");
        await removeDirWithRetry(SESSION_DIR);
      }

      state.status = "starting";
      await client.initialize();
    } catch (e) {
      state.status = "auth_failure";
      state.lastError = String(e);
      console.error("[whatsapp] Recovery failed:", e);
    } finally {
      isRecovering = false;
    }
  }, 3000);
});

// A crash anywhere inside whatsapp-web.js's internals (e.g. a rejected
// promise during its own session cleanup) must not take the whole HTTP API
// down with it — /status and /qr need to stay reachable so the outage is
// visible and recoverable instead of silent.
process.on("unhandledRejection", (reason) => {
  console.error("[whatsapp] Unhandled rejection (server staying up):", reason);
  state.status = "auth_failure";
  state.lastError = String(reason);
});
process.on("uncaughtException", (err) => {
  console.error("[whatsapp] Uncaught exception (server staying up):", err);
  state.status = "auth_failure";
  state.lastError = String(err);
});

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
 * Resolve a phone number to a WhatsApp chat id, verifying the number actually
 * has a WhatsApp account. Returns null when the number is not on WhatsApp.
 */
async function resolveChatId(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const numberId = await client.getNumberId(digits);
  return numberId ? numberId._serialized : null;
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

  let messageMedia;
  try {
    if (media && media.base64) {
      messageMedia = new MessageMedia(
        media.mimetype || "image/png",
        media.base64,
        media.filename || "pass.png"
      );
    } else if (filePath) {
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ success: false, error: `File not found: ${filePath}` });
      }
      messageMedia = MessageMedia.fromFilePath(filePath);
    } else {
      return res.status(400).json({ success: false, error: "media.base64 or file_path is required" });
    }
  } catch (e) {
    return res.status(400).json({ success: false, error: `Could not read media: ${e.message}` });
  }

  try {
    const chatId = await resolveChatId(phone);
    if (!chatId) {
      return res.status(404).json({
        success: false,
        error: `${phone} is not registered on WhatsApp`,
        code: "not_on_whatsapp",
      });
    }

    const sent = await client.sendMessage(chatId, messageMedia, {
      caption: caption || undefined,
    });
    // whatsapp-web.js can resolve sendMessage() to undefined — e.g. when the
    // page's internal store hasn't fully hydrated yet right after "ready" —
    // even though the message was actually delivered. Don't crash on that;
    // just report we couldn't confirm the id.
    const messageId = sent && sent.id ? sent.id._serialized : null;
    if (messageId) {
      console.log(`[whatsapp] Sent media to ${chatId} (${messageId})`);
    } else {
      console.warn(`[whatsapp] Sent media to ${chatId}, but whatsapp-web.js returned no message id (likely still delivered).`);
    }
    return res.json({ success: true, message_id: messageId || "sent_unconfirmed", chat_id: chatId });
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
    const chatId = await resolveChatId(phone);
    if (!chatId) {
      return res.status(404).json({
        success: false,
        error: `${phone} is not registered on WhatsApp`,
        code: "not_on_whatsapp",
      });
    }
    const sent = await client.sendMessage(chatId, message);
    const messageId = sent && sent.id ? sent.id._serialized : null;
    if (messageId) {
      console.log(`[whatsapp] Sent text to ${chatId} (${messageId})`);
    } else {
      console.warn(`[whatsapp] Sent text to ${chatId}, but whatsapp-web.js returned no message id (likely still delivered).`);
    }
    return res.json({ success: true, message_id: messageId || "sent_unconfirmed", chat_id: chatId });
  } catch (e) {
    console.error("[whatsapp] send-text failed:", e);
    if (e.message && (e.message.includes("detached Frame") || e.message.includes("Execution context was destroyed"))) {
      console.warn("[whatsapp] Detached frame detected. Triggering full session recovery...");
      state.status = "disconnected";
      state.lastError = e.message;
      if (!isRecovering) {
        isRecovering = true;
        setTimeout(async () => {
          try {
            try { await client.destroy(); } catch (_) {}
            state.status = "starting";
            await client.initialize();
          } catch (recErr) {
            state.status = "auth_failure";
            state.lastError = String(recErr);
            console.error("[whatsapp] Auto-recovery failed:", recErr);
          } finally {
            isRecovering = false;
          }
        }, 2000);
      }
    }
    return res.status(500).json({ success: false, error: e.message });
  }
});

/** POST /restart — Force a full session restart (destroy + re-initialize) */
app.post("/restart", requireApiKey, async (req, res) => {
  if (isRecovering) {
    return res.status(409).json({ success: false, error: "Recovery already in progress." });
  }
  console.log("[whatsapp] Manual restart requested via /restart endpoint.");
  isRecovering = true;
  state.status = "starting";
  state.lastError = null;
  try {
    try { await client.destroy(); } catch (_) {}
    await client.initialize();
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

console.log("[whatsapp] Starting client (first run downloads Chromium, this can take a minute)...");
client.initialize().catch((e) => {
  state.status = "auth_failure";
  state.lastError = e.message;
  console.error("[whatsapp] Failed to initialize:", e);
});

// Shut the browser down cleanly so the session isn't corrupted.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    console.log(`\n[whatsapp] ${sig} received, closing session...`);
    try {
      await client.destroy();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}
