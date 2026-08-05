import asyncio
import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.requests import MembershipRequest

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def test_apply():
    async with SessionLocal() as db:
        try:
            mobile = "8290909163"
            print("Querying user by mobile...")
            res = await db.execute(select(User).where(User.mobile == mobile))
            user = res.scalars().first()
            if user:
                print(f"User exists! ID: {user.user_id} | Name: {user.first_name} {user.surname} | Role: {user.role} | Is Member: {user.is_member}")
                # Query requests
                req_res = await db.execute(select(MembershipRequest).where(MembershipRequest.user_id == user.user_id))
                reqs = req_res.scalars().all()
                print(f"Total Membership Requests: {len(reqs)}")
                for r in reqs:
                    print(f"Request: ID: {r.request_id} | Status: {r.status} | Msg: {r.message}")
            else:
                print("No user found with mobile 8290909163")

            # Let's run a test transaction (rolling it back) to simulate the exact create/update logic of `/apply-with-otp`!
            print("\nSimulating user and membership request insert...")
            async with db.begin_nested():
                if not user:
                    user = User(
                        first_name="TestName",
                        surname="TestSurname",
                        father_name="TestFather",
                        parent_relation="S/o",
                        mobile=mobile,
                        email=None,
                        role=UserRole.GUEST,
                        is_active=True,
                        is_member=False
                    )
                    db.add(user)
                    await db.flush()
                    print("Successfully created User (in memory)!")
                else:
                    user.first_name = "TestName"
                    user.surname = "TestSurname"
                    user.parent_relation = "S/o"
                    await db.flush()
                    print("Successfully updated User (in memory)!")

                new_req = MembershipRequest(
                    user_id=user.user_id,
                    message="Test message details"
                )
                db.add(new_req)
                await db.flush()
                print("Successfully created MembershipRequest (in memory)!")

            print("Simulation complete! No errors thrown during insert/flush!")

        except Exception as e:
            print("Simulation failed with error:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_apply())
