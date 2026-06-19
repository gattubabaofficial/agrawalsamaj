# Agrawal Samaj Community Portal — Full Project Analysis & Implementation Plan

## Current State Assessment

After a thorough analysis of [prd.md](file:///c:/Users/Dell/Desktop/agrawalsamaj/prd.md), [plan.txt](file:///c:/Users/Dell/Desktop/agrawalsamaj/plan.txt), and the entire codebase, here is the status breakdown.

---

## Tech Stack (Actual vs PRD)

| Layer | PRD Recommends | Actually Used | Status |
|-------|---------------|---------------|--------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS | Next.js 16 + TypeScript + Tailwind v4 | ✅ Better |
| Backend | NestJS + TypeScript + Prisma | **FastAPI + Python + SQLAlchemy** | ⚠️ Different (but functional) |
| Database | PostgreSQL | **SQLite (test.db)** | ⚠️ Dev-only |
| Auth | JWT + OTP | JWT + OTP (email + phone) | ✅ Done |
| Payments | Razorpay | Stub/Mock (package installed, not wired) | ❌ Not implemented |
| Real-time | Socket.IO | Socket.IO (basic stub) | 🟡 Partial |
| Cache | Redis | Config exists, not wired | ❌ Not implemented |

---

## Module-by-Module Completion Status

### ✅ DONE (Working)

| Module | Backend | Frontend | Notes |
|--------|---------|----------|-------|
| Auth — Registration | ✅ OTP flow, password hash, samaj_id generation | ✅ Register page with OTP verification | Working end-to-end |
| Auth — Login | ✅ OTP login + password login | ✅ Login page with OTP + password | Working |
| Auth — JWT Tokens | ✅ Access + Refresh tokens | ✅ Stored in localStorage | Working |
| Dashboard — Stats | ✅ `/dashboard/stats` endpoint | ✅ Overview cards (members, families, bookings, funds) | Working |
| Family — Create | ✅ `/family/register` endpoint | ✅ Family registration form in dashboard | Working |
| Family — Add Member | ✅ `/family/add-member` endpoint | ✅ Add member by Samaj ID in dashboard | Working |
| Family — Delete | ✅ `/family/remove` endpoint | ✅ Delete button in dashboard | Working |
| Family — View | ✅ `/family/my-family` endpoint | ✅ Family tab in dashboard | Working |
| Members — Directory | ✅ `/members` search endpoint | ✅ Directory tab in dashboard | Working |
| Members — Approval | ✅ `/members/approve`, `/members/reject` | ✅ Admin approvals tab in dashboard | Working |
| Members — Apply | ✅ `/members/apply` endpoint | ✅ Apply membership button | Working |
| Privacy — Settings | ✅ `/users/privacy` endpoint | ✅ Toggle switches in profile | Working |
| Address — Update | ✅ `/users/me/address` endpoint | ✅ Address form in profile | Working |
| Events — List | ✅ `/events` GET endpoint | ✅ Public events page + dashboard tab | Working |
| Events — Create | ✅ `/events` POST (admin) | ✅ Event creation form in dashboard | Working |
| Events — Register | ✅ `/events/{id}/register` endpoint | ✅ Register/book pass with payment mode | Working |
| Events — My Registrations | ✅ `/events/my-registrations` | ✅ Shows "Registered" badge on events | Working |
| Bookings — Create | ✅ `/bookings` POST (overlap check) | ✅ Bhavan page with facility selection | Working |
| Bookings — My Bookings | ✅ `/bookings/my-bookings` | ✅ Bookings tab in dashboard | Working |
| Donations — Create | ✅ `/donations` POST | ✅ Donations page | Working |
| Payments — Pending | ✅ `/payments/pending` (admin) | ✅ Admin dashboard shows pending | Working |
| Payments — Verify | ✅ `/payments/{id}/verify` (admin) | ✅ Admin can verify payments | Working |

### 🟡 PARTIALLY DONE

| Module | What's Done | What's Missing |
|--------|------------|----------------|
| Chat (Socket.IO) | Backend: `connect`, `disconnect`, `send_message`, `join_room` events. Frontend: Mock chat UI with hardcoded messages | **Real chat persistence** — messages not saved to DB. No real Socket.IO client integration. Chat UI is completely mock/local. No private DMs, no group-specific rooms persisted. |
| Public Website Pages | ✅ Home, About, Events, Bhavan, Donations, Contact pages exist | **Gallery page missing**. No CMS-driven content. Static content only. |
| Bhavan Booking UI | ✅ Facility listing + date picker + booking form | Floor plan view missing. No admin facility management UI. |
| Notifications | ✅ DB model exists (`Notification` table) | No notification creation logic. No in-app notification panel (stub only). No email/SMS/WhatsApp triggers. |
| Dashboard — 1290 lines monolith | ✅ Functional with 8 tabs | **Massive file** (68KB, 1290 lines). Should be split into components. Causes performance issues on reloads. |

### ❌ NOT STARTED

| Module | PRD Reference | Notes |
|--------|--------------|-------|
| QR Code Generation & Scanning | Sections 16-18 | QR ticket string generated but **no actual QR image**. No scan/validation endpoint. No volunteer scanner. |
| Event Schedule/Timeline | Section 13 | `event_schedules` table not in models. No timeline UI. |
| Event Volunteers | Section 17 | `event_volunteers` table not in models. No volunteer assignment or scanner role. |
| Event Attendance | Section 18 | `event_attendance` table not in models. No entry/exit tracking. |
| Bhavan Floor Plans | Section 22 | `floor_plans` table not in models. No floor plan upload/view. |
| Donation Receipts | Section 28 | `donation_receipts` table not in models. No PDF generation. |
| Donation Reports | Section 31 | No reporting endpoints or UI. |
| Gallery Page | Section 30 (CMS) | `gallery` table not in models. No gallery page on public website. |
| CMS / Pages | Section 30 | `pages` table not in models. No admin content management. |
| Audit Logs | Section 33 | `audit_logs` table not in models. No action tracking. |
| Notification Logs | Section 34 | `notification_logs` table not in models. No delivery tracking. |
| WhatsApp Integration | Section 43 | Not started. |
| SMS Integration (Fast2SMS) | Section 44 | Config key exists, OTP only logs to console. |
| Google OAuth Login | Section 8 | Not implemented. |
| Razorpay Payment Gateway | Section 25 | Config keys exist, but no actual gateway integration. |
| Admin — Facility Management | Section 20-21 | No admin UI/API to create/edit rooms & halls. |
| Admin — Event Edit/Delete | Section 40 | No edit/delete event endpoints or UI. |
| Admin — Booking Approval | Section 23 | `handleApproveBooking` is a mock alert, no real API. |
| Alembic Migrations | DB Design | `alembic/` directory exists but migrations may be out of sync with models. |

---

## Critical Bugs & Issues Found

### 🔴 Bug 1: Privacy endpoint returns wrong data
**File**: [main.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/main.py#L546-L556)  
The `update_privacy` endpoint (line 546-556) correctly saves privacy settings BUT returns `result.scalars().all()` of **Events** instead of a success message. This is clearly a copy-paste error.

```python
# Line 555-556: BUG — Returns events list instead of confirmation
result = await db.execute(select(Event))
return result.scalars().all()
```

### 🔴 Bug 2: Donation model field mismatch
**File**: [all_models.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/models/all_models.py#L182) has `donor_samaj_id`  
**File**: [main.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/main.py#L361) uses `donor_id`  
This will cause a runtime error when creating a donation.

### 🟡 Bug 3: Dashboard useEffect re-fetches on every tab change
**File**: [dashboard/page.tsx](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-website/src/app/dashboard/page.tsx#L157)  
`useEffect` depends on `[activeTab]`, causing **full auth check + data reload on every tab switch**. This is the root cause of the "site is reloading again and again" issue. Should only run once on mount.

### 🟡 Bug 4: Monolithic dashboard file (1290 lines / 68KB)
The entire dashboard with 8 tabs (Overview, Directory, Family, Bookings, Chat, Profile, Approvals, Events) lives in a **single file**. This causes slow Next.js HMR (Hot Module Replacement) and contributes to the buffering/reload issues.

### 🟡 Bug 5: Socket.IO not properly integrated
[main.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/main.py#L32-L34) creates a `socket_app` wrapper but `uvicorn` runs `app.main:app` not `app.main:socket_app`. Socket.IO never actually mounts.

---

## Proposed Implementation Plan (Phased)

### Phase 1: Fix Critical Bugs & Stabilize (IMMEDIATE)

> [!CAUTION]
> These issues cause runtime errors and poor UX. Must fix before any new features.

#### [MODIFY] [main.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/main.py)
1. Fix privacy endpoint to return proper response (line 555-556)
2. Fix donation `donor_id` → `donor_samaj_id` field name (line 361)
3. Add admin booking approval endpoint (currently mock)
4. Add admin facility management endpoints (CRUD for rooms/halls)

#### [MODIFY] [dashboard/page.tsx](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-website/src/app/dashboard/page.tsx)
1. Fix `useEffect` dependency array: change `[activeTab]` → `[]` (run once on mount)
2. Split into separate components for each tab (reduce file size from 68KB)

---

### Phase 2: Complete Core Backend APIs

#### [MODIFY] [all_models.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/models/all_models.py)
Add missing models:
- `EventSchedule` — for event timelines
- `EventVolunteer` — for volunteer assignments
- `EventAttendance` — for entry/exit tracking
- `FloorPlan` — for bhavan floor plan images
- `DonationReceipt` — for auto-generated receipts
- `Gallery` — for media gallery
- `Page` (CMS) — for admin content management
- `AuditLog` — for action tracking
- `NotificationLog` — for delivery tracking

#### [NEW] `app/modules/events/router.py`
- `GET /events/{id}` — single event detail
- `PUT /events/{id}` — admin edit event
- `DELETE /events/{id}` — admin delete event
- `POST /events/{id}/schedules` — add timeline items
- `GET /events/{id}/schedules` — get timeline
- `POST /events/{id}/volunteers` — assign volunteers
- `POST /events/{id}/attendance` — mark attendance (QR scan)

#### [NEW] `app/modules/bookings/router.py`
- `PUT /bookings/{id}/approve` — admin approve booking
- `PUT /bookings/{id}/reject` — admin reject booking
- `GET /facilities` — list all facilities
- `POST /facilities` — admin create facility
- `PUT /facilities/{id}` — admin edit facility

#### [NEW] `app/modules/chat/router.py`
- `GET /chat/conversations` — list user's conversations
- `POST /chat/conversations` — start new DM
- `GET /chat/conversations/{id}/messages` — get messages
- `GET /chat/groups` — list user's groups
- `GET /chat/groups/{id}/messages` — get group messages
- Persist messages to DB via Socket.IO handlers

#### [NEW] `app/modules/donations/router.py`
- `GET /donations` — list donations (admin)
- `GET /donations/my` — user's own donations
- `GET /donations/{id}/receipt` — generate PDF receipt

---

### Phase 3: Complete Frontend Pages

#### [NEW] `src/app/gallery/page.tsx`
- Public gallery page with image/video grid
- Lightbox modal for full-screen view

#### Split Dashboard into Components:
- `src/components/dashboard/OverviewTab.tsx`
- `src/components/dashboard/DirectoryTab.tsx`
- `src/components/dashboard/FamilyTab.tsx`
- `src/components/dashboard/BookingsTab.tsx`
- `src/components/dashboard/ChatTab.tsx`
- `src/components/dashboard/ProfileTab.tsx`
- `src/components/dashboard/ApprovalsTab.tsx`
- `src/components/dashboard/EventsTab.tsx`

#### [MODIFY] `src/app/events/page.tsx`
- Add event timeline/schedule display
- Add real QR code image generation (using a library like `qrcode`)

#### [MODIFY] `src/app/bhavan/page.tsx`
- Add floor plan viewer
- Add admin facility management section

---

### Phase 4: Real-time Chat Integration

#### [MODIFY] Backend `main.py`
- Mount `socket_app` instead of `app` in uvicorn
- Add message persistence in Socket.IO handlers
- Add typing indicators, read receipts

#### [MODIFY] Frontend Dashboard Chat
- Wire actual Socket.IO client connection
- Replace mock messages with real data
- Add private DM functionality
- Add colony/area group auto-join on registration

---

### Phase 5: Payment Gateway & Notifications

#### [NEW] `app/modules/payments/razorpay.py`
- Razorpay order creation
- Payment verification webhook
- Refund processing

#### [NEW] `app/modules/notifications/service.py`
- In-app notification creation
- Email notification dispatch
- SMS OTP via Fast2SMS (real integration)
- WhatsApp message sending (future)

---

### Phase 6: Admin CMS & Reports

#### [NEW] `app/modules/cms/router.py`
- CRUD for pages, gallery, announcements

#### [NEW] `app/modules/reports/router.py`
- Member reports
- Event reports  
- Booking reports
- Donation reports
- Revenue analytics

---

## Open Questions

> [!IMPORTANT]
> **Q1**: The PRD recommends **NestJS + TypeScript** for the backend, but you've built with **FastAPI + Python**. Should we continue with FastAPI (which is already functional) or migrate to NestJS? **Recommendation: Keep FastAPI** — it's already working and Python's async support is excellent.

> [!IMPORTANT]
> **Q2**: The database is currently **SQLite** (`test.db`). For production, this needs to be **PostgreSQL**. Should we set up PostgreSQL now or keep SQLite for local development and switch later? The code already has conditional PostgreSQL pooling in [database.py](file:///c:/Users/Dell/Desktop/agrawalsamaj/agrawalsamaj-api/app/database.py#L7-L12).

> [!WARNING]
> **Q3**: The dashboard file is 1290 lines (68KB). Do you want me to **split it now** into separate component files as Phase 1, or just fix the critical bugs first and split later?

> [!IMPORTANT]
> **Q4**: Which phase do you want to start with? I recommend **Phase 1 (bug fixes + stabilization)** first, then proceed phase by phase.

---

## Verification Plan

### Automated Tests
```bash
# Backend
cd agrawalsamaj-api
.\venv\Scripts\python -m pytest tests/ -v

# Frontend
cd agrawalsamaj-website
npm run build  # Type-check + build verification
```

### Manual Verification
1. Start backend: `.\venv\Scripts\python -m uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Test registration → login → dashboard flow
4. Verify events page loads without buffering
5. Test family create/add member
6. Test member approval flow (admin)
7. Verify privacy toggle saves correctly
