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
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`

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
* **Authentication**: JWT-based authentication with Role-Based Access Control (Guest, Member, Admin).
* **Family Management**: Join or create families using unique family codes. Manage family members.
* **Events**: Browse upcoming events, get passes with a mock payment gateway, and view registrations.
* **Bhavan Bookings**: Request room and hall bookings for community functions.
* **Donations**: Contribute to various causes (Education, Medical, Maintenance) with tax-exemption receipts.
* **Admin Dashboard**: Approvals, data tables, and analytics.

## Environment Variables

To run the backend fully, create a `.env` file in the `backend/` directory with the following configuration:

```env
# Application settings
APP_NAME="Agrawal Samaj API"
ENVIRONMENT="development"
DOMAIN_URL="http://localhost:8000"

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

# Twilio Configuration (WhatsApp QR Tickets & SMS)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
TWILIO_CONTENT_SID=""
TWILIO_STATUS_CALLBACK_URL="http://yourdomain.com/api/v1/passes/webhooks/twilio/status"
```

### 📱 Twilio WhatsApp Setup Guide

The application uses Twilio to send automated QR code tickets to users on WhatsApp when their event payment is verified. 

**For Development / Testing (Sandbox):**
1. Go to your Twilio Console -> Messaging -> Try it out -> Send a WhatsApp message.
2. Twilio provides a shared sandbox number (e.g. `whatsapp:+14155238886`). Put this in `TWILIO_WHATSAPP_FROM`.
3. **Important:** Every person who wants to receive a ticket in development *must* send a join code (like "join fast-fox") from their personal WhatsApp to the Sandbox number first!
4. You do not need a `TWILIO_CONTENT_SID` in the sandbox. The system will fallback to a default text message with the QR image attached.

**For Production:**
1. You must register your own Twilio WhatsApp Sender (a business number) and get it approved by Meta.
2. Create a Content Template in Twilio (Messaging -> Content Template Builder) with an image header and body variables:
   * **Header:** Image
   * **Body:** "Your ticket for {{1}} — pass {{2}} of {{3}}. See you there!"
3. Submit the template to Meta for approval. Once approved, put the SID (starts with `HX...`) in your `TWILIO_CONTENT_SID`.
4. Ensure your server is publicly accessible (e.g., deployed or using Ngrok) and set `DOMAIN_URL` properly so Twilio can download the QR images served from `/static/qr/`.
