"""
Dummy Data Seed Script
Run from backend/ directory:
    python scripts/seed_data.py
"""

import asyncio
import sys
import os
import bcrypt
from datetime import datetime, date, timedelta

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(override=True)

from app.database import engine, Base, SessionLocal
from app.models.user import User, UserRole, Family
from app.models.event import (
    Event, EventStatus, EventCategory, EventVisibility,
    EventPricingType, EventRegistration, PaymentStatus, EventPaymentMode
)
from app.models.booking import Booking, Room, BookingStatus, PaymentMode

# ─────────────────────────────────────────
#  Data Definitions
# ─────────────────────────────────────────

FAMILIES = [
    {
        "family_code": "FAM001",
        "family_name": "Agrawal Family - Sharma",
        "member_limit": 10,
    },
    {
        "family_code": "FAM002",
        "family_name": "Agrawal Family - Gupta",
        "member_limit": 8,
    },
]

USERS = [
    {
        "first_name": "Rajesh",
        "surname": "Sharma",
        "mobile": "9876543210",
        "email": "admin@agrawalsamaj.org",
        "password": "Admin@123",
        "role": UserRole.ADMIN,
        "is_member": True,
        "samaj_id": "AGS-ADMIN-001",
        "profession": "Business",
        "address": "12, Laxmi Nagar, Jaipur, Rajasthan",
        "family_code": "FAM001",
        "family_relation": "head",
    },
    {
        "first_name": "Priya",
        "surname": "Gupta",
        "mobile": "9845678901",
        "email": "member@agrawalsamaj.org",
        "password": "Member@123",
        "role": UserRole.MEMBER,
        "is_member": True,
        "samaj_id": "AGS-MBR-002",
        "profession": "Doctor",
        "address": "45, Malviya Nagar, Jaipur, Rajasthan",
        "family_code": "FAM002",
        "family_relation": "head",
    },
    {
        "first_name": "Amit",
        "surname": "Bansal",
        "mobile": "9712345678",
        "email": "guest@agrawalsamaj.org",
        "password": "Guest@123",
        "role": UserRole.GUEST,
        "is_member": False,
        "samaj_id": None,
        "profession": "Software Engineer",
        "address": "78, Civil Lines, Jodhpur, Rajasthan",
        "family_code": None,
        "family_relation": None,
    },
    {
        "first_name": "Super",
        "surname": "Admin",
        "mobile": "9900000000",
        "email": "superadmin@agrawalsamaj.org",
        "password": "SuperAdmin@123",
        "role": UserRole.SUPER_ADMIN,
        "is_member": True,
        "samaj_id": "AGS-SUPER-000",
        "profession": "Administrator",
        "address": "Agrawal Bhavan, Jaipur, Rajasthan",
        "family_code": None,
        "family_relation": None,
    },
]

EVENTS = [
    {
        "title": "Agrawal Samaj Diwali Mahotsav 2025",
        "description": "Grand Diwali celebration with cultural programs, traditional food, and fireworks. All samaj members and their families are invited to celebrate this festival of lights together.",
        "organizer_name": "Agrawal Samaj Trust",
        "venue": "Samaj Bhawan, Main Hall",
        "address": "1, Samaj Bhawan Road, Jaipur, Rajasthan 302001",
        "category": EventCategory.CULTURAL,
        "start_datetime": datetime.now() + timedelta(days=15),
        "end_datetime": datetime.now() + timedelta(days=15, hours=6),
        "registration_deadline": datetime.now() + timedelta(days=12),
        "pass_price": 500.0,
        "total_passes": 500,
        "passes_sold": 127,
        "max_per_user": 10,
        "status": EventStatus.UPCOMING,
        "is_featured": True,
        "visibility": EventVisibility.OPEN_TO_ALL,
        "pricing_type": EventPricingType.PAID,
    },
    {
        "title": "Samaj Satsang & Puja — Navratri Special",
        "description": "Join us for the sacred Navratri puja and bhajan sandhya. Prasad will be distributed to all attendees. A spiritual evening dedicated to Maa Durga.",
        "organizer_name": "Dharm Samiti, Agrawal Samaj",
        "venue": "Durga Mandir Hall",
        "address": "5, Temple Road, Jaipur, Rajasthan",
        "category": EventCategory.RELIGIOUS,
        "start_datetime": datetime.now() + timedelta(days=5),
        "end_datetime": datetime.now() + timedelta(days=5, hours=4),
        "registration_deadline": datetime.now() + timedelta(days=3),
        "pass_price": 0.0,
        "total_passes": 200,
        "passes_sold": 88,
        "max_per_user": 5,
        "status": EventStatus.UPCOMING,
        "is_featured": False,
        "visibility": EventVisibility.MEMBERS_ONLY,
        "pricing_type": EventPricingType.FREE,
    },
    {
        "title": "Annual Sports Day — Cricket & Kabaddi",
        "description": "Annual inter-family cricket tournament and kabaddi matches. Come cheer for your family team! Prizes and trophies for winners.",
        "organizer_name": "Yuva Mandal, Agrawal Samaj",
        "venue": "Samaj Sports Ground",
        "address": "Near Samaj Bhawan, Jaipur",
        "category": EventCategory.SPORTS,
        "start_datetime": datetime.now() - timedelta(days=30),
        "end_datetime": datetime.now() - timedelta(days=30) + timedelta(hours=8),
        "registration_deadline": datetime.now() - timedelta(days=33),
        "pass_price": 100.0,
        "total_passes": 300,
        "passes_sold": 245,
        "max_per_user": 5,
        "status": EventStatus.COMPLETED,
        "is_featured": False,
        "visibility": EventVisibility.OPEN_TO_ALL,
        "pricing_type": EventPricingType.PAID,
    },
    {
        "title": "Scholarship Distribution Ceremony 2025",
        "description": "Annual scholarship distribution for meritorious students from samaj families. 50 scholarships worth ₹10,000 each to be awarded.",
        "organizer_name": "Shiksha Samiti, Agrawal Samaj",
        "venue": "Samaj Bhawan, Conference Room",
        "address": "1, Samaj Bhawan Road, Jaipur, Rajasthan 302001",
        "category": EventCategory.EDUCATIONAL,
        "start_datetime": datetime.now() + timedelta(days=30),
        "end_datetime": datetime.now() + timedelta(days=30, hours=3),
        "registration_deadline": datetime.now() + timedelta(days=25),
        "pass_price": 0.0,
        "total_passes": 150,
        "passes_sold": 42,
        "max_per_user": 3,
        "status": EventStatus.UPCOMING,
        "is_featured": True,
        "visibility": EventVisibility.MEMBERS_ONLY,
        "pricing_type": EventPricingType.FREE,
    },
]

ROOMS = [
    {
        "name": "Main Banquet Hall",
        "room_number": "G-01",
        "floor": "Ground",
        "type": "hall",
        "capacity": 500,
        "price_per_day": 15000.0,
        "description": "Fully air-conditioned banquet hall with stage, sound system, and projector. Ideal for weddings and large gatherings.",
        "amenities": {"ac": True, "projector": True, "sound_system": True, "parking": True, "catering": False},
        "is_available": True,
    },
    {
        "name": "Conference Room A",
        "room_number": "1-01",
        "floor": "First",
        "type": "room",
        "capacity": 50,
        "price_per_day": 3000.0,
        "description": "Modern conference room with whiteboard and video conferencing setup.",
        "amenities": {"ac": True, "projector": True, "whiteboard": True, "wifi": True},
        "is_available": True,
    },
    {
        "name": "Guest Room — Deluxe",
        "room_number": "2-01",
        "floor": "Second",
        "type": "room",
        "capacity": 4,
        "price_per_day": 1200.0,
        "description": "Comfortable deluxe guest room with attached bathroom, AC and TV. For outstation samaj members.",
        "amenities": {"ac": True, "tv": True, "wifi": True, "attached_bathroom": True},
        "is_available": True,
    },
    {
        "name": "Open Lawn",
        "room_number": "OUT-01",
        "floor": "Outdoor",
        "type": "facility",
        "capacity": 1000,
        "price_per_day": 8000.0,
        "description": "Spacious open lawn for outdoor events and functions.",
        "amenities": {"parking": True, "generator": True, "security": True},
        "is_available": True,
    },
]

# ─────────────────────────────────────────
#  Seed Function
# ─────────────────────────────────────────

async def seed():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    print("\n[SEED] Starting database seed...\n")

    async with SessionLocal() as db:

        # --- Families ---
        print("[+] Creating families...")
        family_map = {}  # family_code -> Family object
        for fdata in FAMILIES:
            family = Family(
                family_code=fdata["family_code"],
                family_name=fdata["family_name"],
                member_limit=fdata["member_limit"],
            )
            db.add(family)
            await db.flush()  # get family_id
            family_map[fdata["family_code"]] = family
            print(f"    OK  Family: {fdata['family_name']} [{fdata['family_code']}]")

        # ── Users ─────────────────────────────────
        print("\n[+] Creating users...")
        user_objects = []
        for udata in USERS:
            family = family_map.get(udata["family_code"]) if udata["family_code"] else None
            user = User(
                first_name=udata["first_name"],
                surname=udata["surname"],
                mobile=udata["mobile"],
                email=udata["email"],
                password_hash=hash_password(udata["password"]),
                role=udata["role"],
                is_member=udata["is_member"],
                samaj_id=udata["samaj_id"],
                profession=udata["profession"],
                address=udata["address"],
                family_id=family.family_id if family else None,
                family_relation=udata["family_relation"],
                is_active=True,
            )
            db.add(user)
            await db.flush()
            user_objects.append(user)
            print(f"    OK  [{udata['role'].upper()}] {udata['first_name']} {udata['surname']} | {udata['email']} | pw: {udata['password']}")

        admin_user = user_objects[0]
        member_user = user_objects[1]
        guest_user = user_objects[2]

        # Update family heads
        family_map["FAM001"].head_user_id = admin_user.user_id
        family_map["FAM002"].head_user_id = member_user.user_id

        # ── Events ────────────────────────────────
        print("\n[+] Creating events...")
        event_objects = []
        for edata in EVENTS:
            event = Event(
                created_by=admin_user.user_id,
                title=edata["title"],
                description=edata["description"],
                organizer_name=edata["organizer_name"],
                venue=edata["venue"],
                address=edata["address"],
                category=edata["category"],
                start_datetime=edata["start_datetime"],
                end_datetime=edata["end_datetime"],
                registration_deadline=edata["registration_deadline"],
                pass_price=edata["pass_price"],
                total_passes=edata["total_passes"],
                passes_sold=edata["passes_sold"],
                max_per_user=edata["max_per_user"],
                status=edata["status"],
                is_featured=edata["is_featured"],
                visibility=edata["visibility"],
                pricing_type=edata["pricing_type"],
            )
            db.add(event)
            await db.flush()
            event_objects.append(event)
            print(f"    OK  [{edata['status'].upper()}] {edata['title']}")

        # ── Event Registrations ───────────────────
        print("\n[+] Creating event registrations...")
        diwali_event = event_objects[0]
        sports_event = event_objects[2]

        # Admin registered for Diwali (paid, verified)
        reg1 = EventRegistration(
            user_id=admin_user.user_id,
            event_id=diwali_event.event_id,
            pass_count=4,
            total_amount=2000.0,
            payment_mode=EventPaymentMode.PAY_ONLINE,
            payment_status=PaymentStatus.VERIFIED,
            attended=False,
        )
        db.add(reg1)

        # Member registered for Diwali (paid, pending)
        reg2 = EventRegistration(
            user_id=member_user.user_id,
            event_id=diwali_event.event_id,
            pass_count=2,
            total_amount=1000.0,
            payment_mode=EventPaymentMode.PAY_AT_VENUE,
            payment_status=PaymentStatus.PENDING,
            attended=False,
        )
        db.add(reg2)

        # Guest registered for Diwali (paid, pending)
        reg3 = EventRegistration(
            user_id=guest_user.user_id,
            event_id=diwali_event.event_id,
            pass_count=1,
            total_amount=500.0,
            payment_mode=EventPaymentMode.PAY_ONLINE,
            payment_status=PaymentStatus.PAID,
            attended=False,
        )
        db.add(reg3)

        # Admin & Member attended past Sports Day
        reg4 = EventRegistration(
            user_id=admin_user.user_id,
            event_id=sports_event.event_id,
            pass_count=2,
            total_amount=200.0,
            payment_mode=EventPaymentMode.PAY_ONLINE,
            payment_status=PaymentStatus.VERIFIED,
            attended=True,
        )
        db.add(reg4)

        reg5 = EventRegistration(
            user_id=member_user.user_id,
            event_id=sports_event.event_id,
            pass_count=1,
            total_amount=100.0,
            payment_mode=EventPaymentMode.PAY_AT_VENUE,
            payment_status=PaymentStatus.VERIFIED,
            attended=True,
        )
        db.add(reg5)

        print("    OK  Admin  -> Diwali Mahotsav (4 passes, Rs.2000, VERIFIED)")
        print("    OK  Member -> Diwali Mahotsav (2 passes, Rs.1000, PENDING)")
        print("    OK  Guest  -> Diwali Mahotsav (1 pass,  Rs.500, PAID)")
        print("    OK  Admin  -> Sports Day (2 passes, Rs.200, ATTENDED)")
        print("    OK  Member -> Sports Day (1 pass,  Rs.100, ATTENDED)")

        # ── Rooms ─────────────────────────────────
        print("\n[+] Creating rooms...")
        room_objects = []
        for rdata in ROOMS:
            room = Room(
                name=rdata["name"],
                room_number=rdata["room_number"],
                floor=rdata["floor"],
                type=rdata["type"],
                capacity=rdata["capacity"],
                price_per_day=rdata["price_per_day"],
                description=rdata["description"],
                amenities=rdata["amenities"],
                is_available=rdata["is_available"],
            )
            db.add(room)
            await db.flush()
            room_objects.append(room)
            print(f"    OK  {rdata['name']} [{rdata['type']}] - Rs.{rdata['price_per_day']}/day")

        # ── Bookings ──────────────────────────────
        print("\n[+] Creating bookings...")
        banquet_hall = room_objects[0]
        conference_room = room_objects[1]
        guest_room = room_objects[2]

        today = date.today()

        # Admin booked banquet hall for next month (approved)
        b1 = Booking(
            user_id=admin_user.user_id,
            room_id=banquet_hall.room_id,
            start_date=today + timedelta(days=20),
            end_date=today + timedelta(days=21),
            total_amount=15000.0,
            payment_mode=PaymentMode.UPI,
            payment_status=PaymentStatus.PAID,
            booking_status=BookingStatus.APPROVED,
            notes="Family function — Mundan ceremony of Rohan Sharma",
        )
        db.add(b1)

        # Member booked conference room (pending)
        b2 = Booking(
            user_id=member_user.user_id,
            room_id=conference_room.room_id,
            start_date=today + timedelta(days=7),
            end_date=today + timedelta(days=7),
            total_amount=3000.0,
            payment_mode=PaymentMode.CARD,
            payment_status=PaymentStatus.PENDING,
            booking_status=BookingStatus.PENDING,
            notes="Business meeting — quarterly review",
        )
        db.add(b2)

        # Guest booked guest room (approved)
        b3 = Booking(
            user_id=guest_user.user_id,
            room_id=guest_room.room_id,
            start_date=today + timedelta(days=3),
            end_date=today + timedelta(days=5),
            total_amount=2400.0,  # 2 nights × ₹1200
            payment_mode=PaymentMode.CASH,
            payment_status=PaymentStatus.NOT_APPLICABLE,
            booking_status=BookingStatus.APPROVED,
            notes="Visiting from Jodhpur for samaj event",
        )
        db.add(b3)

        # Past booking - completed (member, rejected)
        b4 = Booking(
            user_id=member_user.user_id,
            room_id=banquet_hall.room_id,
            start_date=today - timedelta(days=10),
            end_date=today - timedelta(days=9),
            total_amount=15000.0,
            payment_mode=PaymentMode.NETBANKING,
            payment_status=PaymentStatus.REFUNDED,
            booking_status=BookingStatus.REJECTED,
            notes="Date conflict with samaj event — rejected and refunded",
        )
        db.add(b4)

        print("    OK  Admin  -> Banquet Hall (20 days later, Rs.15000, APPROVED)")
        print("    OK  Member -> Conference Room (7 days later, Rs.3000, PENDING)")
        print("    OK  Guest  -> Guest Room (3-5 days later, Rs.2400, APPROVED)")
        print("    OK  Member -> Banquet Hall (past, REJECTED + REFUNDED)")

        await db.commit()
        print("\n[DONE] Database seeded successfully!\n")
        print("=" * 55)
        print("  LOGIN CREDENTIALS")
        print("=" * 55)
        print(f"  [SUPER]  {USERS[3]['email']} | {USERS[3]['password']}")
        print(f"  [ADMIN]  {USERS[0]['email']} | {USERS[0]['password']}")
        print(f"  [MEMBER] {USERS[1]['email']} | {USERS[1]['password']}")
        print(f"  [GUEST]  {USERS[2]['email']} | {USERS[2]['password']}")
        print("=" * 55)


if __name__ == "__main__":
    asyncio.run(seed())
