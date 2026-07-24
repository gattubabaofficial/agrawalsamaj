"""
Adds 100 dummy members to the existing database (does NOT wipe existing data),
so the public /members directory has real data to show. Safe to re-run —
each run adds another batch, continuing the AGS-DUMMY-NNNN numbering and
dummyNNNN@example.com / mobile ranges from wherever the last batch left off.

Run from backend/ directory:
    env\\Scripts\\python.exe scripts/seed_dummy_members.py
"""

import asyncio
import random
import re
import sys
import os

import bcrypt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(override=True)

from sqlalchemy import select, func
from app.database import SessionLocal
from app.models.user import User, UserRole

COUNT = 100
SAMAJ_PREFIX = "AGS-DUMMY-"
EMAIL_DOMAIN = "example.com"
PASSWORD = "Dummy@123"
MOBILE_BASE = 7100000000  # dummy range, distinct from seed_data.py's 98xx/97xx numbers and the first dummy batch's 70000000xx range

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
    "Ishaan", "Rohan", "Kabir", "Aryan", "Yash", "Dev", "Anaya", "Diya",
    "Saanvi", "Ananya", "Isha", "Kavya", "Riya", "Meera", "Pooja", "Neha",
    "Shreya", "Priya", "Nisha", "Kiran", "Manish", "Suresh", "Rakesh", "Naveen",
    "Ashok", "Vijay", "Sanjay", "Deepak", "Anil", "Vinod", "Ramesh", "Mahesh",
    "Sunita", "Geeta", "Seema", "Rekha", "Kamla", "Usha", "Vandana", "Shalini",
]

FATHER_FIRST_NAMES = [
    "Ramesh", "Suresh", "Mahesh", "Rajendra", "Om Prakash", "Radhey Shyam",
    "Ghanshyam", "Bal Kishan", "Shyam Sunder", "Hari Prasad", "Kailash",
    "Mohan Lal", "Girdhari", "Baldev", "Chandra Prakash",
]

SURNAMES = [
    "Agrawal", "Bansal", "Goyal", "Mittal", "Jindal", "Garg", "Singhal", "Goel",
    "Kedia", "Bhandari", "Saraf", "Rungta", "Tapadia", "Kayan", "Vaishya",
    "Sharma", "Gupta", "Modi", "Poddar", "Somani",
]

PROFESSIONS = [
    "Business Owner", "Chartered Accountant", "Software Engineer", "Doctor",
    "Teacher", "Lawyer", "Shop Owner", "Civil Engineer", "Student",
    "Homemaker", "Jewellery Trader", "Textile Merchant", "Architect",
    "Bank Manager", "Real Estate Consultant", "Pharmacist",
]

LOCALITIES = [
    "Mansarovar", "Malviya Nagar", "Vaishali Nagar", "C-Scheme", "Civil Lines",
    "Raja Park", "Tonk Road", "Jagatpura", "Vidhyadhar Nagar", "Bani Park",
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print(f"\n[SEED] Adding {COUNT} dummy members (existing data is preserved)...\n")

    async with SessionLocal() as db:
        # Continue numbering after the highest existing AGS-DUMMY-NNNN, so this
        # script can be run more than once without colliding on unique columns.
        existing = await db.execute(
            select(User.samaj_id).where(User.samaj_id.like(f"{SAMAJ_PREFIX}%"))
        )
        existing_indices = [
            int(m.group(1))
            for (sid,) in existing.all()
            if sid and (m := re.match(rf"^{re.escape(SAMAJ_PREFIX)}(\d+)$", sid))
        ]
        start = (max(existing_indices) if existing_indices else 0) + 1

        created = 0
        for i in range(start, start + COUNT):
            first = random.choice(FIRST_NAMES)
            surname = random.choice(SURNAMES)
            father_name = f"{random.choice(FATHER_FIRST_NAMES)} {surname}"

            idx = f"{i:04d}"
            mobile = str(MOBILE_BASE + i)
            email = f"dummy{idx}@{EMAIL_DOMAIN}"
            samaj_id = f"{SAMAJ_PREFIX}{idx}"
            profession = random.choice(PROFESSIONS)
            locality = random.choice(LOCALITIES)
            address = f"{random.randint(1, 200)}, {locality}, Jaipur, Rajasthan"

            mobile_private = random.random() < 0.2
            email_private = random.random() < 0.2
            address_private = random.random() < 0.3

            user = User(
                first_name=first,
                surname=surname,
                father_name=father_name,
                mobile=mobile,
                email=email,
                password_hash=hash_password(PASSWORD),
                role=UserRole.MEMBER,
                is_member=True,
                samaj_id=samaj_id,
                profession=profession,
                address=address,
                is_active=True,
                mobile_private=mobile_private,
                email_private=email_private,
                address_private=address_private,
            )
            db.add(user)
            created += 1

        await db.commit()
        print(f"[DONE] Created {created} dummy members ({SAMAJ_PREFIX}{start:04d} .. {SAMAJ_PREFIX}{start + COUNT - 1:04d}).")
        print(f"       Login for any of them: dummy{start:04d}@{EMAIL_DOMAIN} .. dummy{start + COUNT - 1:04d}@{EMAIL_DOMAIN} | password: {PASSWORD}\n")


if __name__ == "__main__":
    asyncio.run(seed())
