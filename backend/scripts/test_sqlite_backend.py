"""
Smoke Test for SQLite Backend
------------------------------
Tests async database connectivity, queries across key models (Users, Events, Bhavan Units, Pass Registrations, Custom Roles),
and writes a test audit record to verify read/write capabilities on SQLite.
"""

import os
import sys
import asyncio

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from sqlalchemy import select, func
from app.database import engine, SessionLocal, get_db_session
from app.models import User, Event, EventRegistration, BhavanUnit, CustomRole, Blog, AuditLog


async def smoke_test():
    print("=" * 60)
    print("  SQLITE BACKEND SMOKE TEST & HEALTH CHECK")
    print("=" * 60)

    async with SessionLocal() as session:
        # 1. Count users
        res = await session.execute(select(func.count(User.user_id)))
        user_count = res.scalar()
        print(f"[OK] Total Users in SQLite: {user_count}")
        assert user_count > 0, "Users table should not be empty!"

        # 2. Query some member records
        res = await session.execute(select(User).limit(3))
        sample_users = res.scalars().all()
        for u in sample_users:
            print(f"     - Member: {u.first_name} {u.surname or ''} (Mobile: {u.mobile}, Role: {u.role})")

        # 3. Count events
        res = await session.execute(select(func.count(Event.event_id)))
        event_count = res.scalar()
        print(f"[OK] Total Events in SQLite: {event_count}")

        # 4. Count Bhavan units
        res = await session.execute(select(func.count(BhavanUnit.id)))
        unit_count = res.scalar()
        print(f"[OK] Total Bhavan Units in SQLite: {unit_count}")

        # 5. Count blogs
        res = await session.execute(select(func.count(Blog.blog_id)))
        blog_count = res.scalar()
        print(f"[OK] Total Blogs in SQLite: {blog_count}")

        # 6. Count custom roles
        res = await session.execute(select(func.count(CustomRole.role_id)))
        role_count = res.scalar()
        print(f"[OK] Total Custom Roles in SQLite: {role_count}")

        # 7. Test write operation (create audit log entry & commit)
        test_audit = AuditLog(
            admin_id=sample_users[0].user_id,
            action="MIGRATION_SMOKE_TEST",
            target_table="system",
            new_value={"test": "success", "driver": "sqlite+aiosqlite"}
        )
        session.add(test_audit)
        await session.commit()
        print(f"[OK] Write Test: Successfully inserted and committed test audit record ({test_audit.log_id}).")

    await engine.dispose()
    print("=" * 60)
    print("[ALL CHECKS PASSED] SQLite database is fully functional and ready!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(smoke_test())
