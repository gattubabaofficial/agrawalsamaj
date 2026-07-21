"""
Dummy Data Seed Script
Run from backend/ directory:
    venv\Scripts\python.exe scripts/seed_data.py
"""

import asyncio
import sys
import os
import bcrypt
from datetime import datetime, date, timedelta
from sqlalchemy import delete

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
    {
        "family_code": "FAM003",
        "family_name": "Agrawal Family - Mittal",
        "member_limit": 6,
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
    {
        "first_name": "Sunil",
        "surname": "Mittal",
        "mobile": "9829012345",
        "email": "sunil.mittal@agrawalsamaj.org",
        "password": "Member@123",
        "role": UserRole.MEMBER,
        "is_member": True,
        "samaj_id": "AGS-MBR-003",
        "profession": "Chartered Accountant",
        "address": "88, Rajat Path, Mansarovar, Jaipur",
        "family_code": "FAM003",
        "family_relation": "head",
    },
]

EVENTS = [
    {
        "title": "Maharaja Agrasen Jayanti Mahotsav 2026",
        "description": "Annual grand celebration of Maharaja Agrasen Jayanti featuring procession, cultural performances, youth awards, and community feast at Agrasen Bhawan Mansarovar.",
        "organizer_name": "Agrawal Samaj Samiti Mansarovar",
        "venue": "Agrasen Bhawan Main Ground & Hall",
        "address": "Rajat Path, Mansarovar, Jaipur, Rajasthan 302020",
        "category": EventCategory.CULTURAL,
        "start_datetime": datetime.now() + timedelta(days=25),
        "end_datetime": datetime.now() + timedelta(days=25, hours=8),
        "registration_deadline": datetime.now() + timedelta(days=20),
        "pass_price": 150.0,
        "total_passes": 500,
        "passes_sold": 164,
        "max_per_user": 10,
        "status": EventStatus.UPCOMING,
        "is_featured": True,
        "visibility": EventVisibility.OPEN_TO_ALL,
        "pricing_type": EventPricingType.PAID,
    },
    {
        "title": "Shri Krishna Janmashtami Pooja & Bhajan Sandhya",
        "description": "Divine Krishna Janmashtami pooja, live bhajan performance, and children's Jhanki competition followed by Maha Prasad for all attendees.",
        "organizer_name": "Dharmic Mahila Samiti",
        "venue": "Agrasen Bhawan Temple Courtyard",
        "address": "Rajat Path, Mansarovar, Jaipur, Rajasthan 302020",
        "category": EventCategory.RELIGIOUS,
        "start_datetime": datetime.now() + timedelta(days=10),
        "end_datetime": datetime.now() + timedelta(days=10, hours=5),
        "registration_deadline": datetime.now() + timedelta(days=8),
        "pass_price": 0.0,
        "total_passes": 300,
        "passes_sold": 180,
        "max_per_user": 5,
        "status": EventStatus.UPCOMING,
        "is_featured": True,
        "visibility": EventVisibility.OPEN_TO_ALL,
        "pricing_type": EventPricingType.FREE,
    },
    {
        "title": "Free Eye Check-up & Medical Camp",
        "description": "Free eye testing, cataract check-up, and blood donation drive organized in association with Metro Mass Hospital for general public.",
        "organizer_name": "Agrawal Seva Mandal",
        "venue": "Ground Floor Hall, Agrasen Bhawan",
        "address": "Rajat Path, Mansarovar, Jaipur",
        "category": EventCategory.SOCIAL,
        "start_datetime": datetime.now() + timedelta(days=40),
        "end_datetime": datetime.now() + timedelta(days=40, hours=6),
        "registration_deadline": datetime.now() + timedelta(days=38),
        "pass_price": 0.0,
        "total_passes": 400,
        "passes_sold": 95,
        "max_per_user": 4,
        "status": EventStatus.UPCOMING,
        "is_featured": False,
        "visibility": EventVisibility.OPEN_TO_ALL,
        "pricing_type": EventPricingType.FREE,
    },
    {
        "title": "Agrawal Youth Premier League (Cricket Tournament)",
        "description": "Annual inter-colony T20 cricket tournament for Agrawal Samaj youth teams. Trophy, medals, and refreshments provided.",
        "organizer_name": "Agrawal Yuva Sangathan",
        "venue": "Mansarovar Sports Academy Ground",
        "address": "Mansarovar, Jaipur",
        "category": EventCategory.SPORTS,
        "start_datetime": datetime.now() - timedelta(days=15),
        "end_datetime": datetime.now() - timedelta(days=15) + timedelta(hours=10),
        "registration_deadline": datetime.now() - timedelta(days=18),
        "pass_price": 200.0,
        "total_passes": 250,
        "passes_sold": 250,
        "max_per_user": 5,
        "status": EventStatus.COMPLETED,
        "is_featured": False,
        "visibility": EventVisibility.MEMBERS_ONLY,
        "pricing_type": EventPricingType.PAID,
    },
]

ROOMS = [
    {
        "name": "First Unit (Ground Floor Hall & 5 Rooms)",
        "room_number": "GF-UNIT-1",
        "floor": "Ground Floor",
        "type": "hall",
        "capacity": 600,
        "price_per_day": 15000.0,
        "description": "Includes the main ground-floor hall, 5 guest rooms, outer hall, and dedicated commercial kitchen for grand wedding ceremonies and events.",
        "amenities": {"ac": True, "stage": True, "sound_system": True, "kitchen": True, "rooms_count": 5},
        "is_available": True,
    },
    {
        "name": "Second Unit (First Floor Rooms & Dormitories)",
        "room_number": "FF-UNIT-2",
        "floor": "First Floor",
        "type": "room",
        "capacity": 200,
        "price_per_day": 14000.0,
        "description": "Includes 11 furnished guest rooms on the 1st floor, 3 spacious dormitory halls, and 1 kitchen. Ideal for large family stay during functions.",
        "amenities": {"rooms": 11, "dormitories": 3, "kitchen": True, "attached_bathrooms": True},
        "is_available": True,
    },
    {
        "name": "Third Unit (Basement Hall & Kitchen)",
        "room_number": "BASE-UNIT-3",
        "floor": "Basement",
        "type": "hall",
        "capacity": 150,
        "price_per_day": 4000.0,
        "description": "Includes spacious basement hall and 1 kitchen. Perfect for dining arrangements, exhibitions, or small gatherings.",
        "amenities": {"basement": True, "kitchen": True, "air_ventilation": True},
        "is_available": True,
    },
    {
        "name": "Individual AC Guest Room",
        "room_number": "AC-201",
        "floor": "Second Floor",
        "type": "room",
        "capacity": 3,
        "price_per_day": 600.0,
        "description": "Comfortable AC guest room. Intended primarily for outstation family members and hospital visitor stays.",
        "amenities": {"ac": True, "double_bed": True, "geyser": True, "attached_bathroom": True},
        "is_available": True,
    },
    {
        "name": "Individual Non-AC Guest Room",
        "room_number": "NAC-205",
        "floor": "Second Floor",
        "type": "room",
        "capacity": 4,
        "price_per_day": 400.0,
        "description": "Economical non-AC room for outstation family members and visitors.",
        "amenities": {"fan": True, "double_bed": True, "attached_bathroom": True},
        "is_available": True,
    },
]

# ─────────────────────────────────────────
#  Seed Function
# ─────────────────────────────────────────

async def seed():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    print("\n[SEED] Starting fresh database schema recreation & seed...\n")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

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
            print(f"    OK  [{udata['role'].upper()}] {udata['first_name']} {udata['surname']} | {udata['email']}")

        admin_user = user_objects[0]
        member_user = user_objects[1]
        guest_user = user_objects[2]
        sunil_user = user_objects[4]

        # Update family heads
        family_map["FAM001"].head_user_id = admin_user.user_id
        family_map["FAM002"].head_user_id = member_user.user_id
        family_map["FAM003"].head_user_id = sunil_user.user_id

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
        jayanti_event = event_objects[0]
        pooja_event = event_objects[1]

        reg1 = EventRegistration(
            user_id=member_user.user_id,
            event_id=jayanti_event.event_id,
            pass_count=4,
            total_amount=600.0,
            payment_mode=EventPaymentMode.PAY_ONLINE,
            payment_status=PaymentStatus.VERIFIED,
            attended=False,
        )
        db.add(reg1)

        reg2 = EventRegistration(
            user_id=sunil_user.user_id,
            event_id=pooja_event.event_id,
            pass_count=3,
            total_amount=0.0,
            payment_mode=EventPaymentMode.PAY_AT_VENUE,
            payment_status=PaymentStatus.PAID,
            attended=False,
        )
        db.add(reg2)
        await db.commit()

        from app.services.whatsapp_service import generate_and_send_passes
        await generate_and_send_passes(reg1.registration_id, force=True)
        await generate_and_send_passes(reg2.registration_id, force=True)

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
        ground_unit = room_objects[0]
        first_unit = room_objects[1]
        ac_room = room_objects[3]

        today = date.today()

        # Member booked Ground Floor Unit for Wedding (2 days)
        b1 = Booking(
            user_id=member_user.user_id,
            room_id=ground_unit.room_id,
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=17),
            total_amount=21000.0,
            payment_mode=PaymentMode.UPI,
            payment_status=PaymentStatus.PAID,
            booking_status=BookingStatus.APPROVED,
            notes="Purpose: wedding_saava | Agrawal Member: Yes | Family wedding ceremony",
        )
        db.add(b1)

        # Sunil Mittal booked First Floor Unit for Engagement (1 day)
        b2 = Booking(
            user_id=sunil_user.user_id,
            room_id=first_unit.room_id,
            start_date=today + timedelta(days=30),
            end_date=today + timedelta(days=31),
            total_amount=6250.0,
            payment_mode=PaymentMode.CARD,
            payment_status=PaymentStatus.PENDING,
            booking_status=BookingStatus.PENDING,
            notes="Purpose: engagement_birthday_party | Agrawal Member: Yes | Daughter engagement function",
        )
        db.add(b2)

        # Guest booked AC Room for Hospital Patient Stay (3 days)
        b3 = Booking(
            user_id=guest_user.user_id,
            room_id=ac_room.room_id,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=8),
            total_amount=1800.0,
            payment_mode=PaymentMode.CASH,
            payment_status=PaymentStatus.NOT_APPLICABLE,
            booking_status=BookingStatus.APPROVED,
            notes="Purpose: Hospital visitor stay for Metro Mass patient family",
        )
        db.add(b3)

        print("    OK  Priya Gupta  -> First Unit (Ground Floor Hall) [15-17 days, APPROVED]")
        print("    OK  Sunil Mittal -> Second Unit (First Floor Rooms) [30-31 days, PENDING]")
        print("    OK  Amit Bansal  -> Individual AC Room [5-8 days, APPROVED]")

        await db.commit()
        print("\n[DONE] Database seeded successfully with fresh Agrasen Bhawan dummy entries!\n")
        print("=" * 55)
        print("  LOGIN CREDENTIALS")
        print("=" * 55)
        print(f"  [SUPER]  {USERS[3]['email']} | {USERS[3]['password']}")
        print(f"  [ADMIN]  {USERS[0]['email']} | {USERS[0]['password']}")
        print(f"  [MEMBER] {USERS[1]['email']} | {USERS[1]['password']}")
        print(f"  [MEMBER] {USERS[4]['email']} | {USERS[4]['password']}")
        print(f"  [GUEST]  {USERS[2]['email']} | {USERS[2]['password']}")
        print("=" * 55)


if __name__ == "__main__":
    asyncio.run(seed())
