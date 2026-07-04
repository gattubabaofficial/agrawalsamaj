
# Product Requirements Document (PRD)
## Agrawal Samaj Management Portal

---

**Document Version:** 1.0  
**Prepared For:** Agrawal Samaj  
**Tech Stack:** Next.js (Frontend) · Python FastAPI (Backend) · PostgreSQL (Database)  
**Deployment Target:** VPS (Self-hosted)  
**Date:** June 2025

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Entity Relationship Diagram (ERD)](#4-entity-relationship-diagram-erd)
5. [Database Schema (PostgreSQL)](#5-database-schema-postgresql)
6. [Class Diagram](#6-class-diagram)
7. [API Specification](#7-api-specification)
8. [Functional Requirements](#8-functional-requirements)
9. [Module-wise Feature Specification](#9-module-wise-feature-specification)
10. [Frontend Pages & Components (Next.js)](#10-frontend-pages--components-nextjs)
11. [Backend Structure (Python FastAPI)](#11-backend-structure-python-fastapi)
12. [VPS Deployment Architecture](#12-vps-deployment-architecture)
13. [Security Requirements](#13-security-requirements)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Future Enhancements](#15-future-enhancements)

---

## 1. Project Overview

### 1.1 Purpose

The Agrawal Samaj Management Portal is a full-stack community management web application for managing members, events, bhavan bookings, donations, and communications for the Agrawal Samaj community organization.

### 1.2 Goals

- Digitize member registration and management
- Enable online event registration with QR-based pass system
- Provide bhavan/hall booking with online and cash payment
- Facilitate community communication via chat and notifications
- Provide admin tools for complete portal management

### 1.3 Stakeholders

| Role | Description |
|---|---|
| Admin | Full portal control — manages members, events, bookings, donations |
| Member | Registered Agrawal Samaj member with full access |
| User (Non-Member) | General public — limited access to events and booking |

---

## 2. Tech Stack & Architecture

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR, SEO-friendly, React-based |
| Backend | Python 3.11+ with FastAPI | Fast, async, auto-docs via OpenAPI |
| Database | PostgreSQL 15 | ACID-compliant, relational, VPS-hostable |
| ORM | SQLAlchemy 2.0 + Alembic | Migration support, async support |
| Auth | JWT + OTP (via Twilio/AWS SNS) | Stateless, secure |
| File Storage | MinIO (self-hosted S3-compatible) | VPS-hostable object storage |
| Cache | Redis 7 | OTP storage, session cache, rate limiting |
| Queue | Celery + Redis | Background tasks (email, SMS, QR generation) |
| Real-time Chat | WebSocket (FastAPI + Redis PubSub) | Low-latency messaging |
| Payment Gateway | Razorpay | Indian UPI, cards, net banking |
| QR Generation | Python `qrcode` library | QR pass generation |
| Email | SMTP / SendGrid | Transactional emails |
| SMS | Twilio / MSG91 | OTP and WhatsApp notifications |
| WhatsApp | WhatsApp Business API / Twilio | Pass delivery |
| Reverse Proxy | Nginx | SSL termination, load balancing |
| Process Manager | Supervisor / systemd | Keep services alive on VPS |
| Containerization | Docker + Docker Compose | Easy VPS deployment |
| SSL | Let's Encrypt (Certbot) | Free HTTPS |

---

## 3. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│   Browser / Mobile Browser                                           │
│   Next.js 14 (SSR + CSR)  ←→  WebSocket (Chat)                     │
└─────────────────────┬────────────────────────────────────────────────┘
                      │ HTTPS / WSS
┌─────────────────────▼────────────────────────────────────────────────┐
│                        NGINX (Reverse Proxy)                         │
│   SSL Termination · Static Files · Rate Limiting · Load Balancing    │
└───────────┬───────────────────────────────┬──────────────────────────┘
            │ /api/*                        │ /*
┌───────────▼──────────────┐   ┌────────────▼──────────────────────────┐
│   FastAPI Backend        │   │   Next.js Frontend (Port 3000)        │
│   (Python 3.11+)         │   │   Pages, Components, SSR              │
│   Port 8000              │   └───────────────────────────────────────┘
│                          │
│  ┌─────────────────────┐ │
│  │   Routers / APIs    │ │
│  │  Auth · Members     │ │
│  │  Events · Booking   │ │
│  │  Payments · Chat    │ │
│  │  Notifications      │ │
│  └──────────┬──────────┘ │
└─────────────┼────────────┘
              │
    ┌─────────┼──────────────────────────────────────┐
    │         │                                       │
┌───▼──────┐ ┌▼──────────┐ ┌──────────┐ ┌──────────┐│
│PostgreSQL│ │  Redis     │ │  MinIO   │ │  Celery  ││
│(Database)│ │(Cache/OTP/ │ │(File     │ │(Workers) ││
│Port 5432 │ │PubSub)     │ │Storage)  │ │          ││
└──────────┘ └────────────┘ └──────────┘ └──────────┘│
                                                       │
              External Services                        │
    ┌──────────────────────────────────────────────────┘
    │  Razorpay · Twilio · SendGrid · WhatsApp API
    └──────────────────────────────────────────────────
```

---

## 4. Entity Relationship Diagram (ERD)

```
┌─────────────────┐         ┌─────────────────────┐
│     families    │         │       users         │
├─────────────────┤         ├─────────────────────┤
│ PK family_id    │◄────────│ PK user_id          │
│    family_code  │  1:N    │ FK family_id        │
│    created_at   │         │    first_name       │
│    head_user_id │         │    surname          │
└─────────────────┘         │    mobile           │
                            │    email            │
                            │    password_hash    │
                            │    role (ENUM)      │
                            │    is_member        │
                            │    profession       │
                            │    address          │
                            │    profile_photo    │
                            │    mobile_private   │
                            │    email_private    │
                            │    address_private  │
                            │    is_active        │
                            │    created_at       │
                            └──────────┬──────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
   ┌──────────▼──────────┐  ┌──────────▼──────────┐  ┌─────────▼───────────┐
   │  event_registrations│  │   bookings          │  │   donations         │
   ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
   │ PK registration_id  │  │ PK booking_id       │  │ PK donation_id      │
   │ FK user_id          │  │ FK user_id          │  │ FK user_id          │
   │ FK event_id         │  │ FK room_id          │  │ FK category_id      │
   │    pass_count       │  │    start_date       │  │    amount           │
   │    total_amount     │  │    end_date         │  │    payment_status   │
   │    payment_status   │  │    total_amount     │  │    razorpay_id      │
   │    qr_code          │  │    payment_mode     │  │    donated_at       │
   │    registered_at    │  │    booking_status   │  │    message          │
   │    attended         │  │    notes            │  └─────────────────────┘
   │    scanned_at       │  │    created_at       │
   └──────────┬──────────┘  └──────────┬──────────┘
              │                         │
   ┌──────────▼──────────┐  ┌──────────▼──────────┐
   │      events         │  │       rooms          │
   ├─────────────────────┤  ├─────────────────────┤
   │ PK event_id         │  │ PK room_id          │
   │ FK created_by       │  │    name             │
   │    title            │  │    type (hall/room) │
   │    description      │  │    capacity         │
   │    banner_url       │  │    price_per_day    │
   │    venue            │  │    floor_plan_url   │
   │    address          │  │    amenities        │
   │    category         │  │    is_available     │
   │    start_datetime   │  └─────────────────────┘
   │    end_datetime     │
   │    registration_    │  ┌─────────────────────┐
   │      deadline       │  │  donation_categories│
   │    pass_price       │  ├─────────────────────┤
   │    total_passes     │  │ PK category_id      │
   │    max_per_user     │  │    name             │
   │    status (ENUM)    │  │    description      │
   │    is_featured      │  │    is_active        │
   │    created_at       │  └─────────────────────┘
   └──────────┬──────────┘
              │
   ┌──────────▼──────────┐  ┌─────────────────────┐
   │   event_schedule    │  │    event_gallery     │
   ├─────────────────────┤  ├─────────────────────┤
   │ PK schedule_id      │  │ PK gallery_id       │
   │ FK event_id         │  │ FK event_id         │
   │    program_start    │  │    media_url        │
   │    guest_arrival    │  │    media_type       │
   │    cultural_time    │  │    uploaded_at      │
   │    food_time        │  └─────────────────────┘
   │    closing_time     │
   └─────────────────────┘  ┌─────────────────────┐
                            │  event_documents     │
   ┌─────────────────────┐  ├─────────────────────┤
   │   messages          │  │ PK doc_id           │
   ├─────────────────────┤  │ FK event_id         │
   │ PK message_id       │  │    doc_type         │
   │ FK sender_id        │  │    file_url         │
   │ FK receiver_id      │  │    uploaded_at      │
   │ FK group_id (null)  │  └─────────────────────┘
   │    content          │
   │    is_read          │  ┌─────────────────────┐
   │    sent_at          │  │     groups           │
   └─────────────────────┘  ├─────────────────────┤
                            │ PK group_id         │
   ┌─────────────────────┐  │    name             │
   │  group_members      │  │    type (ENUM)      │
   ├─────────────────────┤  │    location         │
   │ PK id               │  │    created_at       │
   │ FK group_id         │  └─────────────────────┘
   │ FK user_id          │
   │    joined_at        │  ┌─────────────────────┐
   └─────────────────────┘  │    notifications     │
                            ├─────────────────────┤
   ┌─────────────────────┐  │ PK notification_id  │
   │     otp_logs        │  │ FK user_id          │
   ├─────────────────────┤  │    type (ENUM)      │
   │ PK otp_id           │  │    title            │
   │    target           │  │    message          │
   │    otp_code         │  │    is_read          │
   │    otp_type         │  │    sent_at          │
   │    expires_at       │  └─────────────────────┘
   │    is_used          │
   └─────────────────────┘  ┌─────────────────────┐
                            │    audit_logs        │
                            ├─────────────────────┤
                            │ PK log_id           │
                            │ FK admin_id         │
                            │    action           │
                            │    target_table     │
                            │    target_id        │
                            │    old_value (JSON) │
                            │    new_value (JSON) │
                            │    timestamp        │
                            └─────────────────────┘
```

---

## 5. Database Schema (PostgreSQL)

### 5.1 ENUM Types

```sql
CREATE TYPE user_role AS ENUM ('admin', 'member', 'user');
CREATE TYPE event_status AS ENUM ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE event_category AS ENUM ('cultural', 'religious', 'sports', 'social', 'educational', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_mode AS ENUM ('upi', 'card', 'netbanking', 'cash');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE media_type AS ENUM ('photo', 'video');
CREATE TYPE doc_type AS ENUM ('brochure', 'instructions', 'rules');
CREATE TYPE group_type AS ENUM ('member', 'non_member', 'location');
CREATE TYPE notification_type AS ENUM ('event', 'booking', 'payment', 'otp', 'qr', 'general');
CREATE TYPE otp_type AS ENUM ('registration', 'login', 'password_reset');
```

### 5.2 Core Tables

```sql
-- Families
CREATE TABLE families (
    family_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_code   VARCHAR(20) UNIQUE NOT NULL,
    head_user_id  UUID,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID REFERENCES families(family_id),
    first_name      VARCHAR(100) NOT NULL,
    surname         VARCHAR(100) NOT NULL,
    mobile          VARCHAR(15) UNIQUE,
    email           VARCHAR(255) UNIQUE,
    password_hash   TEXT,
    role            user_role DEFAULT 'user',
    is_member       BOOLEAN DEFAULT FALSE,
    profession      VARCHAR(200),
    address         TEXT,
    profile_photo   TEXT,
    mobile_private  BOOLEAN DEFAULT FALSE,
    email_private   BOOLEAN DEFAULT FALSE,
    address_private BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    google_id       VARCHAR(255) UNIQUE,
    yahoo_id        VARCHAR(255) UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- OTP Logs
CREATE TABLE otp_logs (
    otp_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target     VARCHAR(255) NOT NULL,  -- mobile or email
    otp_code   VARCHAR(10) NOT NULL,
    otp_type   otp_type NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
    event_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by            UUID REFERENCES users(user_id),
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,
    banner_url            TEXT,
    organizer_name        VARCHAR(200),
    venue                 VARCHAR(300),
    address               TEXT,
    category              event_category DEFAULT 'other',
    start_datetime        TIMESTAMPTZ NOT NULL,
    end_datetime          TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ,
    pass_price            NUMERIC(10,2) DEFAULT 0,
    total_passes          INTEGER,
    passes_sold           INTEGER DEFAULT 0,
    max_per_user          INTEGER DEFAULT 5,
    status                event_status DEFAULT 'draft',
    is_featured           BOOLEAN DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Event Schedule
CREATE TABLE event_schedule (
    schedule_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID REFERENCES events(event_id) ON DELETE CASCADE,
    program_start  TIMESTAMPTZ,
    guest_arrival  TIMESTAMPTZ,
    cultural_time  TIMESTAMPTZ,
    food_time      TIMESTAMPTZ,
    closing_time   TIMESTAMPTZ,
    custom_slots   JSONB  -- additional custom timeline entries
);

-- Event Gallery
CREATE TABLE event_gallery (
    gallery_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(event_id) ON DELETE CASCADE,
    media_url   TEXT NOT NULL,
    media_type  media_type DEFAULT 'photo',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Documents
CREATE TABLE event_documents (
    doc_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(event_id) ON DELETE CASCADE,
    doc_type    doc_type NOT NULL,
    file_url    TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Registrations
CREATE TABLE event_registrations (
    registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(user_id),
    event_id        UUID REFERENCES events(event_id),
    pass_count      INTEGER NOT NULL DEFAULT 1,
    total_amount    NUMERIC(10,2) NOT NULL,
    payment_status  payment_status DEFAULT 'pending',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    qr_code         TEXT UNIQUE,
    qr_delivered    BOOLEAN DEFAULT FALSE,
    attended        BOOLEAN DEFAULT FALSE,
    scanned_at      TIMESTAMPTZ,
    scanned_by      UUID REFERENCES users(user_id),
    registered_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Rooms / Halls
CREATE TABLE rooms (
    room_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(200) NOT NULL,
    type           VARCHAR(50),  -- 'hall', 'room', 'facility'
    capacity       INTEGER,
    price_per_day  NUMERIC(10,2),
    floor_plan_url TEXT,
    amenities      JSONB,
    description    TEXT,
    is_available   BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
    booking_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(user_id),
    room_id         UUID REFERENCES rooms(room_id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    total_amount    NUMERIC(10,2) NOT NULL,
    payment_mode    payment_mode DEFAULT 'upi',
    payment_status  payment_status DEFAULT 'pending',
    booking_status  booking_status DEFAULT 'pending',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Donation Categories
CREATE TABLE donation_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE
);

-- Donations
CREATE TABLE donations (
    donation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(user_id),
    category_id   UUID REFERENCES donation_categories(category_id),
    amount        NUMERIC(10,2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    message       TEXT,
    donated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Groups (Chat)
CREATE TABLE groups (
    group_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(200) NOT NULL,
    type       group_type NOT NULL,
    location   VARCHAR(200),  -- for location-based groups
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Members
CREATE TABLE group_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Messages
CREATE TABLE messages (
    message_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID REFERENCES users(user_id),
    receiver_id UUID REFERENCES users(user_id),   -- NULL for group messages
    group_id    UUID REFERENCES groups(group_id), -- NULL for personal messages
    content     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (receiver_id IS NOT NULL AND group_id IS NULL) OR
        (receiver_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Notifications
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(user_id),
    type            notification_type NOT NULL,
    title           VARCHAR(300) NOT NULL,
    message         TEXT,
    meta            JSONB,  -- extra data like event_id, booking_id
    is_read         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID REFERENCES users(user_id),
    action       VARCHAR(100) NOT NULL,
    target_table VARCHAR(100),
    target_id    UUID,
    old_value    JSONB,
    new_value    JSONB,
    ip_address   INET,
    timestamp    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_family ON users(family_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start ON events(start_datetime);
CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

---

## 6. Class Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         MODELS LAYER                             │
└──────────────────────────────────────────────────────────────────┘

┌───────────────────────┐       ┌──────────────────────┐
│       User            │       │       Family         │
├───────────────────────┤       ├──────────────────────┤
│ + user_id: UUID       │ N:1   │ + family_id: UUID    │
│ + family_id: UUID     │──────▶│ + family_code: str   │
│ + first_name: str     │       │ + head_user_id: UUID │
│ + surname: str        │       │ + created_at: dt     │
│ + mobile: str         │       ├──────────────────────┤
│ + email: str          │       │ + generate_code()    │
│ + role: UserRole      │       │ + get_members()      │
│ + is_member: bool     │       └──────────────────────┘
│ + profile_photo: str  │
├───────────────────────┤       ┌──────────────────────┐
│ + register()          │       │       Event          │
│ + login()             │       ├──────────────────────┤
│ + update_profile()    │       │ + event_id: UUID     │
│ + set_privacy()       │       │ + title: str         │
│ + verify_otp()        │       │ + description: str   │
└───────────────────────┘       │ + status: EventStatus│
                                │ + pass_price: float  │
┌───────────────────────┐       │ + total_passes: int  │
│  EventRegistration    │       │ + passes_sold: int   │
├───────────────────────┤       ├──────────────────────┤
│ + registration_id     │ N:1   │ + create()           │
│ + user_id: UUID       │──────▶│ + publish()          │
│ + event_id: UUID      │       │ + cancel()           │
│ + pass_count: int     │       │ + get_stats()        │
│ + total_amount: float │       │ + remaining_passes() │
│ + payment_status      │       └──────────────────────┘
│ + qr_code: str        │
│ + attended: bool      │       ┌──────────────────────┐
├───────────────────────┤       │   EventSchedule      │
│ + register()          │       ├──────────────────────┤
│ + generate_qr()       │       │ + schedule_id: UUID  │
│ + verify_qr()         │       │ + event_id: UUID     │
│ + mark_attended()     │       │ + program_start: dt  │
│ + send_qr_whatsapp()  │       │ + food_time: dt      │
└───────────────────────┘       │ + closing_time: dt   │
                                └──────────────────────┘

┌───────────────────────┐       ┌──────────────────────┐
│       Booking         │       │       Room           │
├───────────────────────┤       ├──────────────────────┤
│ + booking_id: UUID    │ N:1   │ + room_id: UUID      │
│ + user_id: UUID       │──────▶│ + name: str          │
│ + room_id: UUID       │       │ + type: str          │
│ + start_date: date    │       │ + capacity: int      │
│ + end_date: date      │       │ + price_per_day      │
│ + payment_mode        │       │ + floor_plan_url     │
│ + booking_status      │       │ + is_available: bool │
├───────────────────────┤       ├──────────────────────┤
│ + create_booking()    │       │ + check_availability()│
│ + approve()           │       │ + get_bookings()     │
│ + cancel()            │       └──────────────────────┘
│ + update_payment()    │
└───────────────────────┘

┌───────────────────────┐       ┌──────────────────────┐
│       Donation        │       │  DonationCategory    │
├───────────────────────┤       ├──────────────────────┤
│ + donation_id: UUID   │ N:1   │ + category_id: UUID  │
│ + user_id: UUID       │──────▶│ + name: str          │
│ + category_id: UUID   │       │ + description: str   │
│ + amount: float       │       │ + is_active: bool    │
│ + payment_status      │       └──────────────────────┘
├───────────────────────┤
│ + donate()            │
│ + get_receipt()       │
└───────────────────────┘

┌───────────────────────┐       ┌──────────────────────┐
│      Message          │       │       Group          │
├───────────────────────┤       ├──────────────────────┤
│ + message_id: UUID    │       │ + group_id: UUID     │
│ + sender_id: UUID     │ N:1   │ + name: str          │
│ + receiver_id: UUID   │──────▶│ + type: GroupType    │
│ + group_id: UUID      │       │ + location: str      │
│ + content: str        │       ├──────────────────────┤
│ + is_read: bool       │       │ + add_member()       │
├───────────────────────┤       │ + remove_member()    │
│ + send()              │       │ + get_members()      │
│ + mark_read()         │       └──────────────────────┘
└───────────────────────┘

┌───────────────────────┐
│    PaymentService     │
├───────────────────────┤
│ + create_order()      │
│ + verify_payment()    │
│ + process_refund()    │
│ + get_payment_status()│
└───────────────────────┘

┌───────────────────────┐       ┌──────────────────────┐
│  NotificationService  │       │     QRService        │
├───────────────────────┤       ├──────────────────────┤
│ + send_sms()          │       │ + generate_qr()      │
│ + send_email()        │       │ + scan_qr()          │
│ + send_whatsapp()     │       │ + validate_qr()      │
│ + push_notification() │       │ + invalidate_qr()    │
└───────────────────────┘       └──────────────────────┘
```

---

## 7. API Specification

### 7.1 Base URL

```
Production:  https://yourdomain.com/api/v1
Development: http://localhost:8000/api/v1
```

### 7.2 Authentication APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register with mobile/email | Public |
| POST | `/auth/send-otp` | Send OTP to mobile or email | Public |
| POST | `/auth/verify-otp` | Verify OTP | Public |
| POST | `/auth/login` | Login with email+password | Public |
| POST | `/auth/google` | Google OAuth login | Public |
| POST | `/auth/refresh` | Refresh JWT token | Auth |
| POST | `/auth/logout` | Logout | Auth |

### 7.3 User APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get own profile | Auth |
| PUT | `/users/me` | Update own profile | Auth |
| PUT | `/users/me/privacy` | Update privacy settings | Auth |
| GET | `/users/members` | List registered members | Auth |
| GET | `/users/members/{id}` | Get member profile | Auth |
| GET | `/users/directory` | Member directory with search | Auth |

### 7.4 Admin User APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | List all users | Admin |
| POST | `/admin/users` | Create user | Admin |
| PUT | `/admin/users/{id}` | Edit user | Admin |
| DELETE | `/admin/users/{id}` | Delete user | Admin |
| POST | `/admin/users/{id}/approve` | Approve member | Admin |
| POST | `/admin/users/{id}/classify` | Classify member/non-member | Admin |

### 7.5 Event APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/events` | List events (filter by status) | Public |
| GET | `/events/featured` | Featured events | Public |
| GET | `/events/{id}` | Event details | Public |
| POST | `/events` | Create event | Admin |
| PUT | `/events/{id}` | Update event | Admin |
| DELETE | `/events/{id}` | Delete event | Admin |
| GET | `/events/{id}/stats` | Event statistics | Admin |
| POST | `/events/{id}/gallery` | Upload gallery | Admin |
| POST | `/events/{id}/documents` | Upload documents | Admin |

### 7.6 Event Registration APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/events/{id}/register` | Register for event | Auth |
| GET | `/events/{id}/registrations` | List registrations | Admin |
| GET | `/registrations/my` | My registrations | Auth |
| POST | `/registrations/{id}/verify-qr` | Scan & verify QR | Admin/Vol |
| POST | `/registrations/{id}/resend-qr` | Resend QR via WhatsApp | Auth |

### 7.7 Booking APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rooms` | List rooms/halls | Public |
| GET | `/rooms/{id}` | Room details | Public |
| GET | `/rooms/{id}/availability` | Check availability | Public |
| POST | `/bookings` | Create booking | Auth |
| GET | `/bookings/my` | My bookings | Auth |
| GET | `/admin/bookings` | All bookings | Admin |
| PUT | `/admin/bookings/{id}/approve` | Approve booking | Admin |
| PUT | `/admin/bookings/{id}/payment` | Update cash payment | Admin |
| DELETE | `/bookings/{id}` | Cancel booking | Auth |

### 7.8 Donation APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/donation-categories` | List categories | Public |
| POST | `/donations` | Make a donation | Auth |
| GET | `/donations/my` | My donation history | Auth |
| GET | `/admin/donations` | All donations | Admin |

### 7.9 Payment APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/create-order` | Create Razorpay order | Auth |
| POST | `/payments/verify` | Verify payment signature | Auth |
| POST | `/payments/webhook` | Razorpay webhook | Public |

### 7.10 Chat APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/chat/conversations` | List my conversations | Auth |
| GET | `/chat/messages/{user_id}` | Personal chat messages | Auth |
| POST | `/chat/messages` | Send personal message | Auth |
| GET | `/chat/groups` | List my groups | Auth |
| GET | `/chat/groups/{id}/messages` | Group messages | Auth |
| POST | `/chat/groups/{id}/messages` | Send group message | Auth |
| WS | `/ws/chat` | WebSocket connection | Auth |

### 7.11 Notification APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | My notifications | Auth |
| PUT | `/notifications/{id}/read` | Mark as read | Auth |
| PUT | `/notifications/read-all` | Mark all as read | Auth |

### 7.12 Admin APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/dashboard` | Dashboard statistics | Admin |
| GET | `/admin/audit-logs` | Audit logs | Admin |
| POST | `/admin/notifications/broadcast` | Broadcast notification | Admin |

---

## 8. Functional Requirements

### 8.1 Authentication & Registration

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Register via Mobile Number + OTP (SMS) | P1 |
| AUTH-02 | Register via Email + OTP | P1 |
| AUTH-03 | Login via Mobile + OTP | P1 |
| AUTH-04 | Login via Email + Password | P1 |
| AUTH-05 | Google OAuth Sign-In | P1 |
| AUTH-06 | Yahoo Email Registration | P2 |
| AUTH-07 | JWT-based session management | P1 |
| AUTH-08 | OTP expiry (5 minutes), rate limiting | P1 |
| AUTH-09 | Family ID linking on registration | P1 |

### 8.2 Member Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MEM-01 | Auto-generate unique Family ID for first member | P1 |
| MEM-02 | Join existing family using Family ID | P1 |
| MEM-03 | Edit own profile (name, address, photo, etc.) | P1 |
| MEM-04 | Privacy controls for mobile, email, address | P1 |
| MEM-05 | Admin can view all data regardless of privacy | P1 |
| MEM-06 | Admin can approve/reject/classify members | P1 |
| MEM-07 | Separate listing for members vs non-members | P2 |

### 8.3 Events

| ID | Requirement | Priority |
|----|-------------|----------|
| EVT-01 | Event listing with upcoming/ongoing/completed filters | P1 |
| EVT-02 | Featured events on homepage | P1 |
| EVT-03 | Full event details page | P1 |
| EVT-04 | Event schedule with timeline | P1 |
| EVT-05 | Login-required registration | P1 |
| EVT-06 | Pass selection and online payment | P1 |
| EVT-07 | Unique QR code generation per registration | P1 |
| EVT-08 | QR delivery via WhatsApp and Email | P1 |
| EVT-09 | QR scan verification (one-time use) | P1 |
| EVT-10 | Automatic attendance marking on QR scan | P1 |
| EVT-11 | Event notifications (announcement, reminder, changes) | P1 |
| EVT-12 | Event statistics for admin | P1 |
| EVT-13 | Gallery upload (photos + videos) | P2 |
| EVT-14 | Document upload (brochure, instructions, rules) | P2 |

### 8.4 Bhavan Booking

| ID | Requirement | Priority |
|----|-------------|----------|
| BKG-01 | View rooms/halls with photos and floor plans | P1 |
| BKG-02 | Real-time availability check | P1 |
| BKG-03 | Online booking request submission | P1 |
| BKG-04 | Online payment (Razorpay) | P1 |
| BKG-05 | Cash payment option with admin confirmation | P1 |
| BKG-06 | Admin booking approval workflow | P1 |
| BKG-07 | Public visibility of bhavan info | P1 |
| BKG-08 | Booking history for users | P2 |

### 8.5 Donations

| ID | Requirement | Priority |
|----|-------------|----------|
| DON-01 | Online donation with category selection | P1 |
| DON-02 | Multiple donation categories | P1 |
| DON-03 | Donation history for logged-in users | P1 |
| DON-04 | Payment receipts via email | P2 |

### 8.6 Communication

| ID | Requirement | Priority |
|----|-------------|----------|
| COM-01 | One-to-one personal chat | P1 |
| COM-02 | Member group chat | P1 |
| COM-03 | Non-member user group chat | P1 |
| COM-04 | Location-based group chats (colony/area) | P2 |
| COM-05 | Admin cannot view private personal chats | P1 |
| COM-06 | Real-time message delivery via WebSocket | P1 |

---

## 9. Module-wise Feature Specification

### 9.1 QR Pass System — Sequence Diagram

```
User          Frontend        Backend         DB          WhatsApp/Email
 │                │               │            │               │
 │─ Register ────▶│               │            │               │
 │                │─ POST /events/{id}/register▶               │
 │                │               │─ Create Registration ─────▶│
 │                │               │─ Create Razorpay Order      │
 │                │◀─ Order ID ───│            │               │
 │─ Pay ─────────▶│               │            │               │
 │                │─ POST /payments/verify ───▶│               │
 │                │               │─ Verify signature           │
 │                │               │─ Generate QR ──────────────▶│
 │                │               │─ Update payment_status      │
 │                │               │─ Send QR via WhatsApp ──────────────▶│
 │                │               │─ Send QR via Email ─────────────────▶│
 │◀─ Confirmation │               │            │               │
 │                │               │            │               │
 │─ Attend Event  │               │            │               │
 │ (Admin Scans QR)               │            │               │
 │                │─ POST /registrations/{id}/verify-qr ──────▶│
 │                │               │─ Check qr_code              │
 │                │               │─ Check attended = false     │
 │                │               │─ SET attended = true        │
 │                │               │─ SET scanned_at = NOW()     │
 │◀─ ✅ Entry OK ─│               │            │               │
```

### 9.2 Bhavan Booking — Flow Diagram

```
Start
  │
  ▼
[Public User visits /bhavan-booking]
  │
  ├─ Not Logged In ──▶ [Redirect to /login?next=/bhavan-booking]
  │
  └─ Logged In
       │
       ▼
  [View Rooms/Halls]
       │
       ▼
  [Select Room + Dates]
       │
       ▼
  [Check Availability] ──▶ Not Available ──▶ [Show Alternatives]
       │
       ▼
  [Select Payment Mode]
  ┌────┴────────┐
  │ Online      │ Cash
  ▼             ▼
[Pay via    [Submit Request]
 Razorpay]       │
  │              ▼
  ▼         [Admin Reviews]
[Auto           │
 Approval]      ├─ Approve ──▶ [Update Status + Notify User]
  │             │
  └─────────────┴─ Reject ──▶ [Notify User + Refund if Paid]
       │
       ▼
  [Booking Confirmation Email/SMS]
       │
       ▼
  End
```

---

## 10. Frontend Pages & Components (Next.js)

### 10.1 Project Structure

```
/agrawal-samaj-frontend
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # Homepage
│   │   ├── about/page.tsx             # About Samaj
│   │   ├── events/
│   │   │   ├── page.tsx               # Event listing
│   │   │   └── [id]/page.tsx          # Event detail
│   │   ├── bhavan/page.tsx            # Bhavan info
│   │   ├── donate/page.tsx            # Donations
│   │   └── gallery/page.tsx           # Photo gallery
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # Dashboard layout
│   │   ├── dashboard/page.tsx         # User dashboard
│   │   ├── profile/page.tsx           # My profile
│   │   ├── my-events/page.tsx         # My registrations
│   │   ├── my-bookings/page.tsx       # My bhavan bookings
│   │   ├── my-donations/page.tsx      # My donation history
│   │   ├── messages/
│   │   │   ├── page.tsx               # Inbox
│   │   │   └── [userId]/page.tsx      # Personal chat
│   │   └── groups/
│   │       ├── page.tsx               # Group list
│   │       └── [groupId]/page.tsx     # Group chat
│   ├── (admin)/
│   │   ├── layout.tsx                 # Admin layout
│   │   ├── admin/page.tsx             # Admin dashboard
│   │   ├── admin/members/page.tsx     # Member management
│   │   ├── admin/events/
│   │   │   ├── page.tsx               # Event list
│   │   │   ├── create/page.tsx        # Create event
│   │   │   └── [id]/edit/page.tsx     # Edit event
│   │   ├── admin/bookings/page.tsx    # Booking management
│   │   ├── admin/donations/page.tsx   # Donation management
│   │   ├── admin/qr-scanner/page.tsx  # QR scan interface
│   │   └── admin/reports/page.tsx     # Reports
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                            # Shadcn UI components
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventCarousel.tsx
│   │   ├── EventTimeline.tsx
│   │   └── RegistrationForm.tsx
│   ├── booking/
│   │   ├── RoomCard.tsx
│   │   ├── AvailabilityCalendar.tsx
│   │   └── BookingForm.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── GroupChat.tsx
│   ├── auth/
│   │   ├── OTPInput.tsx
│   │   └── GoogleSignIn.tsx
│   └── shared/
│       ├── QRScanner.tsx
│       ├── PaymentModal.tsx
│       ├── ImageUpload.tsx
│       └── NotificationBell.tsx
├── lib/
│   ├── api.ts                         # Axios API client
│   ├── auth.ts                        # Auth utilities
│   ├── websocket.ts                   # WebSocket client
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useNotifications.ts
├── store/
│   ├── authStore.ts                   # Zustand auth store
│   └── chatStore.ts                   # Chat state
├── types/
│   └── index.ts                       # TypeScript types
├── public/
├── next.config.js
├── tailwind.config.js
└── package.json
```

### 10.2 Key Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "@shadcn/ui": "latest",
    "axios": "^1.6.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "razorpay": "^2.9.0",
    "html5-qrcode": "^2.3.0",
    "socket.io-client": "^4.6.0",
    "react-hot-toast": "^2.4.0",
    "date-fns": "^3.0.0",
    "react-query": "^3.39.0",
    "next-auth": "^4.24.0",
    "framer-motion": "^11.0.0",
    "swiper": "^11.0.0"
  }
}
```

---

## 11. Backend Structure (Python FastAPI)

### 11.1 Project Structure

```
/agrawal-samaj-backend
├── app/
│   ├── main.py                        # FastAPI entry point
│   ├── config.py                      # Settings (pydantic-settings)
│   ├── database.py                    # DB engine + session
│   ├── dependencies.py                # Shared DI (get_db, get_current_user)
│   │
│   ├── models/                        # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── family.py
│   │   ├── event.py
│   │   ├── registration.py
│   │   ├── room.py
│   │   ├── booking.py
│   │   ├── donation.py
│   │   ├── message.py
│   │   ├── group.py
│   │   ├── notification.py
│   │   └── audit_log.py
│   │
│   ├── schemas/                       # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── event.py
│   │   ├── booking.py
│   │   ├── donation.py
│   │   ├── message.py
│   │   └── notification.py
│   │
│   ├── routers/                       # API route handlers
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── events.py
│   │   ├── registrations.py
│   │   ├── rooms.py
│   │   ├── bookings.py
│   │   ├── donations.py
│   │   ├── payments.py
│   │   ├── chat.py
│   │   ├── notifications.py
│   │   └── admin.py
│   │
│   ├── services/                      # Business logic
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── event_service.py
│   │   ├── qr_service.py             # QR generation + validation
│   │   ├── payment_service.py        # Razorpay integration
│   │   ├── notification_service.py   # Email/SMS/WhatsApp
│   │   ├── otp_service.py            # OTP generate + verify
│   │   └── file_service.py           # MinIO uploads
│   │
│   ├── websocket/
│   │   ├── manager.py                # WebSocket connection manager
│   │   └── chat.py                   # Chat WebSocket handler
│   │
│   ├── tasks/                        # Celery async tasks
│   │   ├── celery_app.py
│   │   ├── email_tasks.py
│   │   ├── sms_tasks.py
│   │   ├── whatsapp_tasks.py
│   │   └── qr_tasks.py
│   │
│   ├── middleware/
│   │   ├── auth_middleware.py
│   │   └── audit_middleware.py
│   │
│   └── utils/
│       ├── security.py               # JWT, password hash
│       ├── validators.py
│       └── helpers.py
│
├── alembic/                           # DB migrations
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── test_auth.py
│   ├── test_events.py
│   └── test_bookings.py
│
├── requirements.txt
├── .env
├── Dockerfile
└── docker-compose.yml
```

### 11.2 Key Dependencies (requirements.txt)

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.0
pydantic==2.7.0
pydantic-settings==2.2.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
redis==5.0.4
celery==5.4.0
razorpay==1.4.2
qrcode[pil]==7.4.2
pillow==10.3.0
boto3==1.34.0            # MinIO S3-compatible client
twilio==9.1.0
sendgrid==6.11.0
httpx==0.27.0
websockets==12.0
python-dotenv==1.0.1
pytest==8.2.0
pytest-asyncio==0.23.0
```

---

## 12. VPS Deployment Architecture

### 12.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: samaj_db
    environment:
      POSTGRES_DB: agrawal_samaj
      POSTGRES_USER: samaj_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped
    networks:
      - samaj_network

  redis:
    image: redis:7-alpine
    container_name: samaj_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    restart: unless-stopped
    networks:
      - samaj_network

  minio:
    image: minio/minio:latest
    container_name: samaj_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    restart: unless-stopped
    networks:
      - samaj_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: samaj_backend
    env_file: .env
    volumes:
      - ./backend:/app
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      - postgres
      - redis
      - minio
    restart: unless-stopped
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    networks:
      - samaj_network

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: samaj_celery
    env_file: .env
    command: celery -A app.tasks.celery_app worker --loglevel=info
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    networks:
      - samaj_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: samaj_frontend
    env_file: .env.frontend
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - samaj_network

  nginx:
    image: nginx:alpine
    container_name: samaj_nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - /etc/letsencrypt:/etc/letsencrypt:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - samaj_network

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  samaj_network:
    driver: bridge
```

### 12.2 Nginx Configuration

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Next.js frontend
    location / {
        proxy_pass http://samaj_frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # FastAPI backend
    location /api/ {
        proxy_pass http://samaj_backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for chat
    location /ws/ {
        proxy_pass http://samaj_backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # MinIO storage
    location /storage/ {
        proxy_pass http://samaj_minio:9000/;
    }

    # File upload size
    client_max_body_size 50M;
}
```

### 12.3 VPS Minimum Specifications

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Bandwidth | 1 TB/month | 3 TB/month |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 12.4 Environment Variables (.env)

```env
# Application
APP_NAME=Agrawal Samaj Portal
ENVIRONMENT=production
SECRET_KEY=<strong-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Database
DATABASE_URL=postgresql+asyncpg://samaj_user:${DB_PASSWORD}@postgres:5432/agrawal_samaj
DB_PASSWORD=<strong-password>

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
REDIS_PASSWORD=<strong-password>

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=<access-key>
MINIO_SECRET_KEY=<secret-key>
MINIO_BUCKET=samaj-media
MINIO_SECURE=false

# Razorpay
RAZORPAY_KEY_ID=<key-id>
RAZORPAY_KEY_SECRET=<key-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>

# Twilio (SMS + WhatsApp)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=+91XXXXXXXXXX
TWILIO_WHATSAPP_NUMBER=whatsapp:+91XXXXXXXXXX

# Email (SendGrid)
SENDGRID_API_KEY=<key>
FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

---

## 13. Security Requirements

| Category | Requirement | Implementation |
|---|---|---|
| Authentication | JWT with refresh tokens | python-jose + secure cookies |
| OTP Security | 5-min expiry, max 3 attempts, rate limit | Redis TTL |
| Password | Bcrypt hashing, minimum 8 chars | passlib[bcrypt] |
| RBAC | Role-based access (admin/member/user) | FastAPI dependencies |
| Privacy | Field-level visibility controls | DB-level query filtering |
| QR Validation | One-time scan, UUID-based | DB flag + atomic update |
| Payments | Razorpay signature verification | HMAC-SHA256 |
| HTTPS | TLS 1.2+ enforced | Let's Encrypt + Nginx |
| File Upload | Type validation, size limit 50MB | FastAPI + MinIO |
| SQL Injection | ORM-based queries only | SQLAlchemy parameterized |
| XSS | CSP headers, input sanitization | Nginx headers + Pydantic |
| Audit Logs | All admin actions logged | Middleware + audit_logs table |
| CORS | Whitelist frontend domain only | FastAPI CORSMiddleware |
| Chat Privacy | Admin excluded from personal chats | DB-level restriction |

---

## 14. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page Load Time | < 2 seconds (LCP) |
| API Response Time | < 300ms (p95) |
| Uptime | 99.5% monthly |
| Concurrent Users | 500+ |
| Mobile Responsive | Yes (all pages) |
| SEO | SSR via Next.js for public pages |
| Accessibility | WCAG 2.1 AA |
| Database Backups | Daily automated PostgreSQL dumps |
| Log Retention | 90 days |
| QR Scan Latency | < 1 second |

---

## 15. Future Enhancements

| Feature | Description | Priority |
|---|---|---|
| Mobile App | React Native cross-platform app | P1 |
| Push Notifications | FCM for mobile push | P1 |
| Digital Membership Card | PDF/wallet-ready membership card | P2 |
| Advanced Analytics | Charts for events, revenue, attendance | P2 |
| Volunteer Management | Assign and manage event volunteers | P2 |
| Attendance Reports | Exportable CSV/PDF attendance sheets | P2 |
| Multi-language Support | Hindi + English | P3 |
| Live Streaming | Event live stream embed | P3 |
| Bulk SMS/Email | Campaign-style broadcast | P3 |

---

## Appendix A: API Response Format

```json
// Success Response
{
  "success": true,
  "data": { },
  "message": "Operation successful"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mobile number is required",
    "details": []
  }
}

// Paginated Response
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "per_page": 20,
    "pages": 5
  }
}
```

## Appendix B: Deployment Checklist

- [ ] VPS provisioned with Ubuntu 22.04
- [ ] Docker + Docker Compose installed
- [ ] Domain DNS pointed to VPS IP
- [ ] Let's Encrypt SSL certificate generated
- [ ] Environment variables configured in `.env`
- [ ] Docker Compose stack deployed
- [ ] Database migrations run (`alembic upgrade head`)
- [ ] Admin user seeded
- [ ] MinIO buckets created
- [ ] Razorpay webhook endpoint registered
- [ ] Twilio WhatsApp sandbox configured
- [ ] Nginx configured and tested
- [ ] Automated PostgreSQL backup cron job set
- [ ] Monitoring (UptimeRobot or similar) set up

---

*End of PRD — Agrawal Samaj Management Portal v1.0*
