import asyncio
import sys
import os
import uuid
from sqlalchemy import select, delete

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.user import User, Family, UserRole
from app.models.requests import MembershipRequest, RequestStatus
from app.utils.security import hash_password

async def clean_db(db):
    # Clean any previous test data
    print("Cleaning up old test data...")
    test_emails = ["test_approval_flow@example.com", "placeholder_claim@example.com"]
    for email in test_emails:
        # Find users
        user_res = await db.execute(select(User).where(User.email == email))
        users = user_res.scalars().all()
        for u in users:
            # Delete associated membership requests first
            await db.execute(delete(MembershipRequest).where(MembershipRequest.user_id == u.user_id))
            await db.execute(delete(User).where(User.user_id == u.user_id))
            
    await db.execute(delete(Family).where(Family.family_code == "TEST_FAM_123"))
    await db.commit()

async def main():
    try:
        async with SessionLocal() as db:
            await clean_db(db)

            # 1. Create a test Family
            print("Step 1: Creating a test family...")
            family = Family(
                family_code="TEST_FAM_123",
                family_name="Test Approved Family",
                member_limit=10
            )
            db.add(family)
            await db.commit()
            await db.refresh(family)
            print(f"Family created successfully: {family.family_name} with code {family.family_code}")

            # 2. Simulate Registration of a New User with family code
            print("\nStep 2: Simulating registration of a new user with family code...")
            # We mock the logic from verify_otp_and_register
            payload_first_name = "NewUser"
            payload_surname = "Flow"
            payload_email = "test_approval_flow@example.com"
            payload_password = "password123"
            payload_family_code = "TEST_FAM_123"
            payload_family_relation = "Son"

            # Check family
            target_family_id = None
            target_relation = None
            if payload_family_code:
                fam_result = await db.execute(select(Family).where(Family.family_code == payload_family_code))
                fam = fam_result.scalars().first()
                if not fam:
                    raise Exception("Family not found during test")
                target_family_id = fam.family_id
                target_relation = payload_family_relation or "Member"

            # Create User with family_id=None and family_relation=None initially
            hashed_pwd = hash_password(payload_password)
            new_user = User(
                first_name=payload_first_name,
                surname=payload_surname,
                email=payload_email,
                mobile=None,
                password_hash=hashed_pwd,
                family_id=None,
                family_relation=None,
                role=UserRole.GUEST,
                is_active=True,
                is_member=False
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)

            print(f"New User created with family_id={new_user.family_id}, family_relation={new_user.family_relation} (Expected: None, None)")
            assert new_user.family_id is None, "Error: family_id must be None during registration"
            assert new_user.family_relation is None, "Error: family_relation must be None during registration"

            # Check and create MembershipRequest
            req_check = await db.execute(select(MembershipRequest).where(MembershipRequest.user_id == new_user.user_id))
            existing_req = req_check.scalars().first()
            if not existing_req:
                new_m_request = MembershipRequest(
                    user_id=new_user.user_id,
                    family_id=target_family_id,
                    family_relation=target_relation,
                    message="Submitted automatically during registration."
                )
                db.add(new_m_request)
                await db.commit()
                await db.refresh(new_m_request)
                req1_id = new_m_request.request_id

            print(f"Created pending MembershipRequest: family_id={new_m_request.family_id}, relation={new_m_request.family_relation}")
            assert new_m_request.family_id == family.family_id, "Error: MembershipRequest must point to target family"
            assert new_m_request.family_relation == "Son", "Error: MembershipRequest relation must match"

            # 3. Simulate claiming/registration of a placeholder member
            print("\nStep 3: Simulating claiming/registration of a placeholder member...")
            # Set up placeholder first
            placeholder_user = User(
                first_name="Placeholder",
                surname="User",
                email="placeholder_claim@example.com",
                mobile=None,
                password_hash=None, # None indicates placeholder
                family_id=family.family_id,
                family_relation="Daughter",
                role=UserRole.GUEST,
                is_active=True,
                is_member=False
            )
            db.add(placeholder_user)
            await db.commit()
            await db.refresh(placeholder_user)
            print(f"Set up placeholder: family_id={placeholder_user.family_id}, family_relation={placeholder_user.family_relation}")

            # Now verify registration claims it and pulls back family association
            existing_user = placeholder_user
            target_family_id_ph = None
            target_relation_ph = None

            # Simulate the registration edit:
            if existing_user:
                existing_user.first_name = "PlaceholderUpdated".strip()
                existing_user.surname = "UserUpdated".strip()
                existing_user.password_hash = hash_password("password123")
                existing_user.is_active = True

                # Capture placeholder family details if not overridden by a new family_code
                if not target_family_id_ph and existing_user.family_id:
                    target_family_id_ph = existing_user.family_id
                    target_relation_ph = existing_user.family_relation

                # Clear family details on user model so they aren't members until approved!
                existing_user.family_id = None
                existing_user.family_relation = None

                await db.commit()
                await db.refresh(existing_user)

            print(f"After claim, placeholder user: family_id={existing_user.family_id}, family_relation={existing_user.family_relation} (Expected: None, None)")
            assert existing_user.family_id is None, "Error: family_id must be cleared on placeholder claim"
            assert existing_user.family_relation is None, "Error: family_relation must be cleared on placeholder claim"

            # Auto-create membership request
            req_check_ph = await db.execute(select(MembershipRequest).where(MembershipRequest.user_id == existing_user.user_id))
            existing_req_ph = req_check_ph.scalars().first()
            if not existing_req_ph:
                new_m_request_ph = MembershipRequest(
                    user_id=existing_user.user_id,
                    family_id=target_family_id_ph,
                    family_relation=target_relation_ph,
                    message="Submitted automatically during registration."
                )
                db.add(new_m_request_ph)
                await db.commit()
                await db.refresh(new_m_request_ph)
                req2_id = new_m_request_ph.request_id

            print(f"Created pending MembershipRequest for placeholder: family_id={new_m_request_ph.family_id}, relation={new_m_request_ph.family_relation}")
            assert new_m_request_ph.family_id == family.family_id, "Error: MembershipRequest must point to target family"
            assert new_m_request_ph.family_relation == "Daughter", "Error: MembershipRequest relation must match"

            # 4. Simulate GET /requests (membership.get_membership_requests logic)
            print("\nStep 4: Simulating GET /requests to verify family_name is returned...")
            result = await db.execute(
                select(MembershipRequest, User)
                .join(User, MembershipRequest.user_id == User.user_id)
                .where(MembershipRequest.status == RequestStatus.PENDING)
            )

            requests_data = []
            for req, user in result.all():
                family_name = None
                if req.family_id:
                    fam_res = await db.execute(select(Family).where(Family.family_id == req.family_id))
                    fam = fam_res.scalars().first()
                    if fam:
                        family_name = fam.family_name

                requests_data.append({
                    "request_id": str(req.request_id),
                    "family_name": family_name,
                    "family_relation": req.family_relation,
                    "user_name": f"{user.first_name} {user.surname}"
                })

            print("Fetched Pending Requests:")
            for req_data in requests_data:
                print(f" - {req_data['user_name']}: Joining family '{req_data['family_name']}' as '{req_data['family_relation']}'")
                assert req_data['family_name'] == "Test Approved Family", "Error: family_name must match 'Test Approved Family'"

            # 5. Simulate Admin approval (membership.approve_membership logic)
            print("\nStep 5: Simulating Admin approvals...")
            # Approve new user request
            result1 = await db.execute(select(MembershipRequest).where(MembershipRequest.request_id == req1_id))
            req1 = result1.scalars().first()
            user1_res = await db.execute(select(User).where(User.user_id == req1.user_id))
            user1 = user1_res.scalars().first()

            # Process approval
            req1.status = RequestStatus.APPROVED
            user1.role = UserRole.MEMBER
            user1.is_member = True
            user1.samaj_id = f"SMJ-{str(user1.user_id)[:6].upper()}"
            if req1.family_id:
                user1.family_id = req1.family_id
                user1.family_relation = req1.family_relation
            await db.commit()

            # Approve placeholder user request
            result2 = await db.execute(select(MembershipRequest).where(MembershipRequest.request_id == req2_id))
            req2 = result2.scalars().first()
            user2_res = await db.execute(select(User).where(User.user_id == req2.user_id))
            user2 = user2_res.scalars().first()

            # Process approval
            req2.status = RequestStatus.APPROVED
            user2.role = UserRole.MEMBER
            user2.is_member = True
            user2.samaj_id = f"SMJ-{str(user2.user_id)[:6].upper()}"
            if req2.family_id:
                user2.family_id = req2.family_id
                user2.family_relation = req2.family_relation
            await db.commit()

            # Refresh and assert final states
            await db.refresh(user1)
            await db.refresh(user2)

            print(f"After approval user 1: family_id={user1.family_id}, relation={user1.family_relation}, role={user1.role}, is_member={user1.is_member}")
            assert user1.family_id == family.family_id, "Error: User 1 family_id not set on approval"
            assert user1.family_relation == "Son", "Error: User 1 family_relation not set on approval"
            assert user1.role == UserRole.MEMBER, "Error: User 1 role must be MEMBER"
            assert user1.is_member is True, "Error: User 1 is_member must be True"

            print(f"After approval user 2: family_id={user2.family_id}, relation={user2.family_relation}, role={user2.role}, is_member={user2.is_member}")
            assert user2.family_id == family.family_id, "Error: User 2 family_id not set on approval"
            assert user2.family_relation == "Daughter", "Error: User 2 family_relation not set on approval"
            assert user2.role == UserRole.MEMBER, "Error: User 2 role must be MEMBER"
            assert user2.is_member is True, "Error: User 2 is_member must be True"

            print("\n==========================================")
            print("ALL ADMIN APPROVAL FLOW TESTS PASSED SUCCESSFULLY!")
            print("==========================================\n")

            # Cleanup after successful verification
            await clean_db(db)

    except Exception as e:
        print("\nTest failed with error:", e)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
