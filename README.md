# Agrawal Samaj Management Portal

A comprehensive web application designed to manage community activities, families, events, bookings, and donations for Agrawal Samaj.

## Architecture
This project is separated into a modern frontend and a robust backend.

* **Frontend**: Built with Next.js (React), Tailwind CSS, and Lucide React icons.
* **Backend**: Built with FastAPI (Python), SQLAlchemy (Async), and SQLite.

## Prerequisites
* **Node.js**: v18 or later
* **Python**: 3.10 or later

## Setup & Installation

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Setup the SQLite Database (`test.db`) and seed initial data:
   ```bash
   # 1. Run migrations to create tables
   alembic upgrade head
   
   # 2. Run the seed script to populate mock users, families, events, etc.
   python scripts/seed_data.py
   ```
   *Note: This creates a `test.db` file in the backend folder and outputs login credentials in the terminal for Admin, Member, and Guest accounts.*

5. Run the development server:
   ```bash
   python run.py
   ```
   The API will be available at `http://localhost:8000`, and on your LAN at
   `http://<your-ip>:8000` (the startup banner prints both).

   > Use `python run.py`, **not** `uvicorn app.main:app --reload`. Bare `uvicorn`
   > binds `127.0.0.1`, so the API is unreachable from phones or other machines
   > and the frontend fails with `AxiosError: Network Error` when opened via a
   > LAN IP. `run.py` binds `0.0.0.0`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The web application will be available at `http://localhost:3000`

## Features Included
* **Authentication**: JWT-based authentication with Role-Based Access Control (Guest, Member, Admin, **Super Admin**).
* **Super Admin**: A dedicated super admin can create/deactivate admin accounts, set/reset their passwords, and view each admin's performance (approvals handled and cash generated). See `/admin/admins`.
* **Approver tracking**: Whenever an admin approves a cash/offline payment (Bhavan or event), their name is recorded as the approver. Each admin can see their own stats at `/admin/performance`.
* **Family Management**: Join or create families using unique family codes. Manage family members.
* **Events**: Browse upcoming events, get passes with a mock payment gateway, and view registrations.
* **Bhavan Bookings**: Request room and hall bookings for community functions.
  * **Dynamic pricing**: Admins can set custom per-day rates for a room over specific date ranges (`/admin/pricing`); bookings are priced day-by-day using the applicable rule (highest priority wins), falling back to the room default.
  * **Minimum-stay rules**: Admins can require a minimum number of booked days for stays overlapping a date window.
* **Receipts (PDF)**: A PDF receipt is generated for every booking and event payment — automatically on online payment, and after admin approval for offline/cash payments. Members download theirs at `/dashboard/receipts`; admins see all at `/admin/receipts`.
* **Admin Dashboard**: Approvals, data tables, and analytics.

> **Upgrading an existing database:** after pulling these changes, run `alembic upgrade head` to add the new tables/columns, then re-run `python scripts/seed_data.py` on a fresh DB to create the dedicated **Super Admin** account (`superadmin@agrawalsamaj.org` / `SuperAdmin@123`). Also run `pip install -r requirements.txt` to install `reportlab` (used for PDF receipts).

## Environment Variables

To run the backend fully, create a `.env` file in the `backend/` directory with the following configuration:

```env
# Application settings
APP_NAME="Agrawal Samaj API"
ENVIRONMENT="development"

# Public base URLs. DOMAIN_URL is this API (used for /static media links);
# FRONTEND_URL is the Next.js app (used for links people open, such as the
# /verify-pass target encoded into pass QR codes).
# Set BOTH to your LAN IP when serving over a network — a QR pointing at
# "localhost" resolves to the scanning phone itself and will not work.
DOMAIN_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

# Security (JWT)
SECRET_KEY="your-super-secret-key"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_URL="sqlite+aiosqlite:///./test.db"

# Razorpay (Mock/Test settings)
RAZORPAY_KEY_ID="rzp_test_123"
RAZORPAY_KEY_SECRET="rzp_test_secret"

# Email Configuration
FROM_EMAIL="noreply@agrawalsamaj.org"
SENDGRID_API_KEY=""

# Twilio Configuration (SMS OTP only)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"

# WhatsApp delivery (QR tickets & booking receipts) — whatsapp-web.js sidecar
WHATSAPP_PROVIDER="whatsapp_web"
WHATSAPP_WEB_URL="http://localhost:3001"
WHATSAPP_WEB_API_KEY="a-long-random-shared-secret"
```

### 📱 WhatsApp Setup Guide

The application sends automated QR code tickets and Bhavan booking receipts over
WhatsApp using a small Node.js sidecar (`whatsapp-service/`) built on
`whatsapp-web.js` — **not Twilio**. Twilio's WhatsApp API required a publicly
downloadable media URL, which a `localhost` deployment can never provide, so
it was removed; Twilio is still used for SMS OTP only.

1. `cd whatsapp-service && npm install` (first run also downloads Chromium).
2. `cp .env.example .env` and set `WHATSAPP_API_KEY` to the **same** value as
   `WHATSAPP_WEB_API_KEY` in `backend/.env` — this shared secret is what
   authenticates the backend's requests to the sidecar. If either `.env` is
   missing or the values don't match, the sidecar either rejects every send
   (mismatch) or silently accepts unauthenticated ones (missing key, dev-only
   fallback) — check both files if WhatsApp sends stop working.
3. `npm start`, then open `http://localhost:3001/qr` and scan it from the
   WhatsApp account that should send tickets/receipts (Settings → Linked
   devices → Link a device). The session persists in `.wwebjs_auth/` so this
   is a one-time step per machine.

See `whatsapp-service/README.md` for the full endpoint reference and
troubleshooting table.
