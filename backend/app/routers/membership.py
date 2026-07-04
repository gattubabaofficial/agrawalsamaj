from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid
import json
import random
import string

from app.database import get_db_session
from app.models.user import User, UserRole, Family
from app.models.requests import MembershipRequest, RequestStatus, FamilyCreationRequest
from app.dependencies import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/membership", tags=["membership"])


def generate_family_code():
    return "FAM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_membership(
    message: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if current_user.is_member or current_user.role != UserRole.GUEST:
        raise HTTPException(status_code=400, detail="You are already a member or admin.")
        
    # Check if a pending request already exists
    existing_req = await db.execute(
        select(MembershipRequest).where(
            MembershipRequest.user_id == current_user.user_id,
            MembershipRequest.status == RequestStatus.PENDING
        )
    )
    if existing_req.scalars().first():
        raise HTTPException(status_code=400, detail="Membership request already pending.")

    new_request = MembershipRequest(
        user_id=current_user.user_id,
        message=message
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)
    return {"message": "Membership application submitted successfully."}


@router.get("/requests")
async def get_membership_requests(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Returns all pending requests - both membership requests and family creation requests.
    Each item has a `request_type` field: "membership" or "family_creation".
    """
    requests_data = []

    # 1. Fetch pending MembershipRequests
    result = await db.execute(
        select(MembershipRequest, User)
        .join(User, MembershipRequest.user_id == User.user_id)
        .where(MembershipRequest.status == RequestStatus.PENDING)
    )
    for req, user in result.all():
        family_name = None
        if req.family_id:
            fam_res = await db.execute(select(Family).where(Family.family_id == req.family_id))
            fam = fam_res.scalars().first()
            if fam:
                family_name = fam.family_name

        requests_data.append({
            "request_type": "membership",
            "request_id": str(req.request_id),
            "message": req.message,
            "created_at": req.created_at,
            "family_name": family_name,
            "family_relation": req.family_relation,
            "user": {
                "id": str(user.user_id),
                "name": f"{user.first_name} {user.surname}",
                "email": user.email,
                "mobile": user.mobile
            }
        })

    # 2. Fetch pending FamilyCreationRequests
    fc_result = await db.execute(
        select(FamilyCreationRequest, User)
        .join(User, FamilyCreationRequest.user_id == User.user_id)
        .where(FamilyCreationRequest.status == RequestStatus.PENDING)
    )
    for fc_req, user in fc_result.all():
        members_list = json.loads(fc_req.members_json) if fc_req.members_json else []
        requests_data.append({
            "request_type": "family_creation",
            "request_id": str(fc_req.request_id),
            "message": f"Requesting to create family: {fc_req.family_name}",
            "created_at": fc_req.created_at,
            "family_name": fc_req.family_name,
            "family_relation": "Head",
            "member_count": 1 + len(members_list),
            "member_limit": fc_req.member_limit,
            "user": {
                "id": str(user.user_id),
                "name": f"{fc_req.head_first_name} {fc_req.head_surname}",
                "email": fc_req.head_email or user.email,
                "mobile": fc_req.head_mobile or user.mobile
            }
        })

    # Sort by created_at descending
    requests_data.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return requests_data


@router.post("/requests/{request_id}/approve")
async def approve_membership(
    request_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    req_uuid = uuid.UUID(request_id)

    # First, try to find a FamilyCreationRequest with this ID
    fc_result = await db.execute(
        select(FamilyCreationRequest).where(FamilyCreationRequest.request_id == req_uuid)
    )
    fc_req = fc_result.scalars().first()

    if fc_req:
        # ---- FAMILY CREATION APPROVAL ----
        if fc_req.status != RequestStatus.PENDING:
            raise HTTPException(status_code=404, detail="Pending request not found.")

        # Get the head user
        head_user_result = await db.execute(select(User).where(User.user_id == fc_req.user_id))
        head_user = head_user_result.scalars().first()
        if not head_user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Create the actual Family record
        new_family = Family(
            family_code=generate_family_code(),
            family_name=fc_req.family_name,
            head_user_id=head_user.user_id,
            member_limit=fc_req.member_limit
        )
        db.add(new_family)
        await db.flush()  # get new_family.family_id

        # Update head user's profile and assign family
        head_user.first_name = fc_req.head_first_name
        head_user.surname = fc_req.head_surname
        if fc_req.head_mobile:
            head_user.mobile = fc_req.head_mobile
        if fc_req.head_email:
            head_user.email = fc_req.head_email
        if fc_req.head_profession:
            head_user.profession = fc_req.head_profession
        if fc_req.head_address:
            head_user.address = fc_req.head_address
        if fc_req.head_profile_photo:
            head_user.profile_photo = fc_req.head_profile_photo

        head_user.family_id = new_family.family_id
        head_user.family_relation = "Head"

        # Upgrade head user to MEMBER (if not already MEMBER or ADMIN)
        if head_user.role == UserRole.GUEST:
            head_user.role = UserRole.MEMBER
            head_user.is_member = True
            head_user.samaj_id = f"SMJ-{str(head_user.user_id)[:6].upper()}"

        # Process placeholder members from stored JSON
        if fc_req.members_json:
            members_list = json.loads(fc_req.members_json)
            for m in members_list:
                placeholder = User(
                    first_name=m["first_name"],
                    surname=m["surname"],
                    mobile=m.get("mobile"),
                    email=m.get("email"),
                    password_hash=None,
                    family_id=None,
                    family_relation=None,
                    role=UserRole.GUEST,
                    is_active=True,
                    is_member=False,
                    profession=m.get("profession"),
                    address=m.get("address"),
                    profile_photo=m.get("profile_photo")
                )
                db.add(placeholder)
                await db.flush()

                # Create a MembershipRequest for each placeholder member
                m_req = MembershipRequest(
                    user_id=placeholder.user_id,
                    family_id=new_family.family_id,
                    family_relation=m["relation"],
                    message="Added by family head during family creation. Pending admin approval."
                )
                db.add(m_req)

        # Mark the family creation request as approved
        fc_req.status = RequestStatus.APPROVED
        await db.commit()

        return {
            "message": f"Family '{new_family.family_name}' created successfully. Head user upgraded to Member.",
            "family_code": new_family.family_code
        }

    # ---- MEMBERSHIP REQUEST APPROVAL ----
    result = await db.execute(
        select(MembershipRequest).where(MembershipRequest.request_id == req_uuid)
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    user_result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Approve request and upgrade user
    req.status = RequestStatus.APPROVED
    if user.role == UserRole.GUEST:
        user.role = UserRole.MEMBER
        user.is_member = True
        user.samaj_id = f"SMJ-{str(user.user_id)[:6].upper()}"

    if req.family_id:
        user.family_id = req.family_id
        user.family_relation = req.family_relation

    await db.commit()
    return {"message": "Membership approved successfully."}


@router.post("/requests/{request_id}/reject")
async def reject_membership(
    request_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    req_uuid = uuid.UUID(request_id)

    # Check FamilyCreationRequest first
    fc_result = await db.execute(
        select(FamilyCreationRequest).where(FamilyCreationRequest.request_id == req_uuid)
    )
    fc_req = fc_result.scalars().first()
    if fc_req:
        if fc_req.status != RequestStatus.PENDING:
            raise HTTPException(status_code=404, detail="Pending request not found.")
        fc_req.status = RequestStatus.REJECTED
        await db.commit()
        return {"message": "Family creation request rejected."}

    # Fall back to MembershipRequest
    result = await db.execute(
        select(MembershipRequest).where(MembershipRequest.request_id == req_uuid)
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    req.status = RequestStatus.REJECTED
    await db.commit()
    return {"message": "Membership rejected."}


@router.get("/members")
async def list_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    # Fetch all users who are members
    result = await db.execute(
        select(User).filter(
            (User.role == UserRole.MEMBER) | (User.is_member == True)
        ).order_by(User.first_name, User.surname)
    )
    users = result.scalars().all()
    
    is_admin = current_user.role == UserRole.ADMIN
    
    data = []
    for u in users:
        family_name = None
        family_code = None
        if u.family_id:
            fam_res = await db.execute(select(Family).where(Family.family_id == u.family_id))
            fam = fam_res.scalars().first()
            if fam:
                family_name = fam.family_name
                family_code = fam.family_code

        data.append({
            "user_id": str(u.user_id),
            "samaj_id": u.samaj_id,
            "first_name": u.first_name,
            "surname": u.surname,
            "profession": u.profession,
            "profile_photo": u.profile_photo,
            "family_relation": u.family_relation,
            "family_name": family_name,
            "family_code": family_code,
            "email": u.email if is_admin else None,
            "mobile": u.mobile if is_admin else None,
            "address": u.address if is_admin else None,
            "role": u.role,
            "is_member": u.is_member
        })
    return data


@router.get("/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    # Fetch all registered users who are not registered members and not admins
    result = await db.execute(
        select(User).filter(
            (User.role == UserRole.GUEST) & (User.is_member == False)
        ).order_by(User.first_name, User.surname)
    )
    users = result.scalars().all()
    
    is_admin = current_user.role == UserRole.ADMIN
    
    data = []
    for u in users:
        family_name = None
        family_code = None
        if u.family_id:
            fam_res = await db.execute(select(Family).where(Family.family_id == u.family_id))
            fam = fam_res.scalars().first()
            if fam:
                family_name = fam.family_name
                family_code = fam.family_code

        data.append({
            "user_id": str(u.user_id),
            "samaj_id": u.samaj_id,
            "first_name": u.first_name,
            "surname": u.surname,
            "profession": u.profession,
            "profile_photo": u.profile_photo,
            "family_relation": u.family_relation,
            "family_name": family_name,
            "family_code": family_code,
            "email": u.email if is_admin else None,
            "mobile": u.mobile if is_admin else None,
            "address": u.address if is_admin else None,
            "role": u.role,
            "is_member": u.is_member
        })
    return data

