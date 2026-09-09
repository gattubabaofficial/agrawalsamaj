/**
 * Reset WhatsApp Session Script
 * Deletes all stored authentication credentials and keys so a fresh QR can be scanned.
 */
const fs = require("fs");
const path = require("path");

try {
  require("dotenv").config();
} catch (_) {}

const AUTH_DIR = process.env.SESSION_DIR || path.join(__dirname, "auth_info");

console.log(`\n[whatsapp-reset] Target session directory: ${AUTH_DIR}`);

if (fs.existsSync(AUTH_DIR)) {
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log("✅ Successfully deleted stored WhatsApp session details.");
    console.log("👉 Now start the whatsapp-service ('npm start') and open http://localhost:3001/qr to scan a fresh QR code.\n");
  } catch (err) {
    console.error("❌ Failed to delete session directory:", err.message);
  }
} else {
  console.log("ℹ️ No previous session details found. Session directory is already clean.\n");
}

