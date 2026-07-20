import asyncio
import sys
import os
import uuid
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.user import User, UserRole, Family
from app.models.requests import MembershipRequest, RequestStatus
from app.utils.security import hash_password

async def main():
    try:
        async with SessionLocal() as db:
            # 1. Fetch families
            fam_result = await db.execute(select(Family).order_by(Family.created_at))
            families = fam_result.scalars().all()
            
            sharma_family = families[0] if len(families) > 0 else None
            gupta_family = families[1] if len(families) > 1 else None

            # 2. Check if we already have some guest users or create them
            new_guests_data = [
                {
                    "first_name": "Ramesh",
                    "surname": "Goyal",
                    "email": "ramesh.goyal@example.com",
                    "mobile": "9811122233",
                    "message": "I would like to apply for the official Samaj membership to participate in the upcoming elections and cultural events.",
                    "family": sharma_family,
                    "relation": "Uncle"
                },
                {
                    "first_name": "Suman",
                    "surname": "Agrawal",
                    "email": "suman.agrawal@example.com",
                    "mobile": "9822233344",
                    "message": "Recently moved to Mansarovar, Jaipur. Applying for general membership to connect with the local community.",
                    "family": None,
                    "relation": None
                },
                {
                    "first_name": "Karan",
                    "surname": "Bansal",
                    "email": "karan.bansal@example.com",
                    "mobile": "9833344455",
                    "message": "Requesting family linkage and membership approval as a family member.",
                    "family": gupta_family,
                    "relation": "Son"
                }
            ]

            print("[+] Inserting sample membership requests...")

            for data in new_guests_data:
                # Check if user already exists
                user_res = await db.execute(select(User).where(User.email == data["email"]))
                user = user_res.scalars().first()

                if not user:
                    user = User(
                        first_name=data["first_name"],
                        surname=data["surname"],
                        email=data["email"],
                        mobile=data["mobile"],
                        password_hash=hash_password("guest123"),
                        role=UserRole.GUEST,
                        is_active=True,
                        is_member=False
                    )
                    db.add(user)
                    await db.flush()
                    print(f"    Created Guest User: {user.first_name} {user.surname} ({user.email})")

                # Create membership request if not already present
                req_res = await db.execute(select(MembershipRequest).where(MembershipRequest.user_id == user.user_id))
                request = req_res.scalars().first()

                if not request:
                    request = MembershipRequest(
                        user_id=user.user_id,
                        message=data["message"],
                        status=RequestStatus.PENDING,
                        family_id=data["family"].family_id if data["family"] else None,
                        family_relation=data["relation"]
                    )
                    db.add(request)
                    await db.flush()
                    print(f"    Created Pending Membership Request for: {user.first_name} {user.surname}")

            # Also check if seed guest user "guest@agrawalsamaj.org" exists, and add a request for them
            seed_guest_res = await db.execute(select(User).where(User.email == "guest@agrawalsamaj.org"))
            seed_guest = seed_guest_res.scalars().first()
            if seed_guest:
                req_res = await db.execute(select(MembershipRequest).where(MembershipRequest.user_id == seed_guest.user_id))
                request = req_res.scalars().first()
                if not request:
                    request = MembershipRequest(
                        user_id=seed_guest.user_id,
                        message="Dear Admin, please approve my membership. I have paid the registration fee.",
                        status=RequestStatus.PENDING,
                        family_id=None,
                        family_relation=None
                    )
                    db.add(request)
                    await db.flush()
                    print(f"    Created Pending Membership Request for Seed Guest: {seed_guest.first_name} {seed_guest.surname}")

            await db.commit()
            print("[DONE] Sample membership requests successfully uploaded!")

    except Exception as e:
        print("[-] Error creating membership requests:", e)
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
