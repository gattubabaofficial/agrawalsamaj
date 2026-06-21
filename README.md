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
