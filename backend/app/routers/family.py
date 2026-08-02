from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
import random
import string
import json
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from app.database import get_db_session
from app.models.user import User, Family, UserRole
from app.models.requests import FamilyJoinRequest, RequestStatus, MembershipRequest, FamilyCreationRequest
from app.dependencies import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/family", tags=["family"])

class CreateFamilyMemberItem(BaseModel):
    first_name: str
    surname: str
    relation: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None

class CreateFamilyRequest(BaseModel):
    family_name: str
    member_limit: Optional[int] = None
    first_name: str
    surname: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    members: Optional[List[CreateFamilyMemberItem]] = None

def generate_family_code():
    return "FAM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_family(
    payload: CreateFamilyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Submit a family creation request. The family is only created after admin approves."""
    # Prevent duplicate pending requests
    existing_req_check = await db.execute(
        select(FamilyCreationRequest).where(
            FamilyCreationRequest.user_id == current_user.user_id,
            FamilyCreationRequest.status == RequestStatus.PENDING
        )
    )
    if existing_req_check.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="You already have a pending family creation request. Please wait for admin approval."
        )

    if current_user.family_id:
        raise HTTPException(status_code=400, detail="You are already in a family.")

    # Validate limits
    added_members_count = len(payload.members) if payload.members else 0
    total_requested_count = 1 + added_members_count
    if payload.member_limit is not None:
        if payload.member_limit < 1:
            raise HTTPException(status_code=400, detail="Family member limit must be at least 1.")
        if total_requested_count > payload.member_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Requested total members ({total_requested_count}) exceeds the limit of {payload.member_limit}."
            )

    # Validation for Head: If profession is NOT "student", mobile and email are compulsory.
    is_student = payload.profession and payload.profession.strip().lower() == "student"
    if not is_student:
        if not payload.mobile or not payload.email:
            raise HTTPException(status_code=400, detail="Mobile and Email are compulsory for non-students.")

    # Validate member details before saving
    if payload.members:
        for m in payload.members:
            m_profession = m.profession.strip() if m.profession else None
            is_m_student = m_profession and m_profession.lower() == "student"
            if not is_m_student:
                if not m.mobile or not m.email:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Mobile and Email are compulsory for non-student member: {m.first_name} {m.surname}."
                    )

    # Serialize members list
    members_data = []
    if payload.members:
        for m in payload.members:
            members_data.append({
                "first_name": m.first_name.strip(),
                "surname": m.surname.strip(),
                "relation": m.relation.strip(),
                "mobile": m.mobile.strip() if m.mobile else None,
                "email": m.email.strip().lower() if m.email else None,
                "profession": m.profession.strip() if m.profession else None,
                "address": m.address.strip() if m.address else None,
                "profile_photo": m.profile_photo or None
            })

    # Create the pending FamilyCreationRequest
    creation_req = FamilyCreationRequest(
        user_id=current_user.user_id,
        family_name=payload.family_name.strip(),
        member_limit=payload.member_limit,
        head_first_name=payload.first_name.strip(),
        head_surname=payload.surname.strip(),
        head_mobile=payload.mobile.strip() if payload.mobile else None,
        head_email=payload.email.strip().lower() if payload.email else None,
        head_profession=payload.profession.strip() if payload.profession else None,
        head_address=payload.address.strip() if payload.address else None,
        head_profile_photo=payload.profile_photo or None,
        members_json=json.dumps(members_data) if members_data else None,
        status=RequestStatus.PENDING
    )
    db.add(creation_req)
    await db.commit()
    await db.refresh(creation_req)

    return {
        "message": "Family creation request submitted successfully. Awaiting admin approval.",
        "request_id": str(creation_req.request_id)
    }

@router.post("/join")
async def request_join_family(
    family_code: str,
    relation: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.is_member:
        raise HTTPException(status_code=403, detail="Only members can join families.")
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="You are already in a family.")

    result = await db.execute(select(Family).where(Family.family_code == family_code))
    family = result.scalars().first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found with given code.")

    # Check member limit
    if family.member_limit is not None:
        members_result = await db.execute(select(User).where(User.family_id == family.family_id))
        current_count = len(members_result.scalars().all())
        if current_count >= family.member_limit:
            raise HTTPException(
                status_code=400,
                detail=f"This family has reached its member limit of {family.member_limit}."
            )

    current_user.family_id = family.family_id
    current_user.family_relation = relation
    await db.commit()
    return {"message": "Family joined successfully."}

@router.get("/requests")
async def get_family_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
    
    # Verify user is head
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only family head can view requests.")

    result = await db.execute(
        select(FamilyJoinRequest, User)
        .join(User, FamilyJoinRequest.user_id == User.user_id)
        .where(
            FamilyJoinRequest.family_id == current_user.family_id,
            FamilyJoinRequest.status == RequestStatus.PENDING
        )
    )
    
    requests_data = []
    for req, user in result.all():
        requests_data.append({
            "request_id": str(req.request_id),
            "relation": req.relation,
            "created_at": req.created_at,
            "user": {
                "id": str(user.user_id),
                "name": f"{user.first_name} {user.surname}",
                "samaj_id": user.samaj_id
            }
        })
    return requests_data

@router.get("/me")
async def get_my_family(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    
    if not family:
        raise HTTPException(status_code=404, detail="Family not found.")
        
    members_result = await db.execute(select(User).where(User.family_id == family.family_id))
    members = members_result.scalars().all()
    
    members_data = []
    for m in members:
        members_data.append({
            "user_id": str(m.user_id),
            "name": f"{m.first_name} {m.surname}",
            "first_name": m.first_name,
            "surname": m.surname,
            "mobile": m.mobile,
            "email": m.email,
            "profession": m.profession,
            "address": m.address,
            "mobile_private": m.mobile_private,
            "email_private": m.email_private,
            "profile_photo": m.profile_photo,
            "samaj_id": m.samaj_id,
            "relation": m.family_relation,
            "is_head": m.user_id == family.head_user_id
        })
        
    return {
        "family_id": str(family.family_id),
        "family_name": family.family_name,
        "family_code": family.family_code,
        "member_limit": family.member_limit,
        "is_head": current_user.user_id == family.head_user_id,
        "members": members_data
    }

@router.post("/requests/{request_id}/approve")
async def approve_family_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(FamilyJoinRequest).where(FamilyJoinRequest.request_id == uuid.UUID(request_id))
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    # Verify user is head
    fam_result = await db.execute(select(Family).where(Family.family_id == req.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only family head can approve requests.")

    # Approve request
    req.status = RequestStatus.APPROVED
    
    # Update user
    user_result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = user_result.scalars().first()
    if user:
        user.family_id = req.family_id
        user.family_relation = req.relation

    await db.commit()
    return {"message": "Request approved. Member added to family."}

@router.post("/requests/{request_id}/reject")
async def reject_family_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(FamilyJoinRequest).where(FamilyJoinRequest.request_id == uuid.UUID(request_id))
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    # Verify user is head
    fam_result = await db.execute(select(Family).where(Family.family_id == req.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only family head can reject requests.")

    req.status = RequestStatus.REJECTED
    await db.commit()
    return {"message": "Request rejected."}

@router.delete("", status_code=status.HTTP_200_OK)
async def delete_family(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found.")
        
    if family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the family head can delete the family.")
        
    # Reset family_id and relation for all members
    members_result = await db.execute(select(User).where(User.family_id == family.family_id))
    members = members_result.scalars().all()
    for m in members:
        m.family_id = None
        m.family_relation = None
        
    # Delete the family
    await db.delete(family)
    await db.commit()
    
    return {"message": "Family deleted successfully."}

@router.delete("/members/{member_id}")
async def remove_family_member(
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the family head can remove members.")
        
    member_uuid = uuid.UUID(member_id)
    if member_uuid == current_user.user_id:
        raise HTTPException(status_code=400, detail="The family head cannot be removed from the family.")
        
    m_result = await db.execute(
        select(User).where(User.user_id == member_uuid, User.family_id == current_user.family_id)
    )
    member = m_result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found.")
        
    member.family_id = None
    member.family_relation = None
    await db.commit()
    return {"message": "Family member removed successfully."}

@router.put("/members/{member_id}/relation")
async def update_member_relation(
    member_id: str,
    relation: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the family head can update relations.")
        
    member_uuid = uuid.UUID(member_id)
    m_result = await db.execute(
        select(User).where(User.user_id == member_uuid, User.family_id == current_user.family_id)
    )
    member = m_result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found.")
        
    member.family_relation = relation
    await db.commit()
    return {"message": "Family member relation updated successfully."}

class UpdateFamilyMemberRequest(BaseModel):
    first_name: str
    surname: str
    relation: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    address: Optional[str] = None
    mobile_private: bool = False
    email_private: bool = False
    profile_photo: Optional[str] = None

@router.put("/members/{member_id}")
async def update_family_member(
    member_id: str,
    payload: UpdateFamilyMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the family head can update member details.")
        
    member_uuid = uuid.UUID(member_id)
    if member_uuid == current_user.user_id:
        raise HTTPException(status_code=400, detail="The family head cannot update their own relation from here.")
        
    m_result = await db.execute(
        select(User).where(User.user_id == member_uuid, User.family_id == current_user.family_id)
    )
    member = m_result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found.")
        
    # Validation: If profession is NOT "student", mobile and email are compulsory.
    is_student = payload.profession and payload.profession.strip().lower() == "student"
    if not is_student:
        if not payload.mobile or not payload.email:
            raise HTTPException(status_code=400, detail="Mobile and Email are compulsory for non-student members.")
            
    if payload.mobile:
        mobile_val = payload.mobile.strip()
        m_check = await db.execute(
            select(User).where(User.mobile == mobile_val, User.user_id != member_uuid)
        )
        if m_check.scalars().first() is not None:
            raise HTTPException(status_code=400, detail="A user with this mobile number is already registered.")
    else:
        mobile_val = None
        
    if payload.email:
        email_val = payload.email.strip().lower()
        e_check = await db.execute(
            select(User).where(User.email == email_val, User.user_id != member_uuid)
        )
        if e_check.scalars().first() is not None:
            raise HTTPException(status_code=400, detail="A user with this email address is already registered.")
    else:
        email_val = None

    member.first_name = payload.first_name.strip()
    member.surname = payload.surname.strip()
    member.family_relation = payload.relation
    member.mobile = mobile_val
    member.email = email_val
    member.profession = payload.profession.strip() if payload.profession else None
    member.address = payload.address.strip() if payload.address else None
    member.mobile_private = payload.mobile_private
    member.email_private = payload.email_private
    if payload.profile_photo is not None:
        member.profile_photo = payload.profile_photo

    await db.commit()
    return {"message": "Family member updated successfully."}

class AddFamilyMemberRequest(BaseModel):
    first_name: str
    surname: str
    relation: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    address: Optional[str] = None
    mobile_private: bool = False
    email_private: bool = False
    profile_photo: Optional[str] = None

@router.post("/members")
async def add_family_member(
    payload: AddFamilyMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the family head can add members directly.")
        
    # Check member limit
    if family.member_limit is not None:
        members_result = await db.execute(select(User).where(User.family_id == family.family_id))
        current_count = len(members_result.scalars().all())
        if current_count >= family.member_limit:
            raise HTTPException(
                status_code=400,
                detail=f"This family has reached its member limit of {family.member_limit}."
            )
        
    # Validation: If profession is NOT "student", mobile and email are compulsory.
    is_student = payload.profession and payload.profession.strip().lower() == "student"
    if not is_student:
        if not payload.mobile or not payload.email:
            raise HTTPException(status_code=400, detail="Mobile and Email are compulsory for non-student members.")

    if payload.mobile:
        mobile_val = payload.mobile.strip()
        m_check = await db.execute(select(User).where(User.mobile == mobile_val))
        if m_check.scalars().first() is not None:
            raise HTTPException(status_code=400, detail="A user with this mobile number is already registered.")
    else:
        mobile_val = None
        
    if payload.email:
        email_val = payload.email.strip().lower()
        e_check = await db.execute(select(User).where(User.email == email_val))
        if e_check.scalars().first() is not None:
            raise HTTPException(status_code=400, detail="A user with this email address is already registered.")
    else:
        email_val = None

    new_member = User(
        first_name=payload.first_name.strip(),
        surname=payload.surname.strip(),
        email=email_val,
        mobile=mobile_val,
        password_hash=None,
        family_id=current_user.family_id,
        family_relation=payload.relation,
        role=UserRole.GUEST,
        is_active=True,
        is_member=False,
        profession=payload.profession.strip() if payload.profession else None,
        address=payload.address.strip() if payload.address else None,
        mobile_private=payload.mobile_private,
        email_private=payload.email_private,
        profile_photo=payload.profile_photo
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    
    return {"message": "Family member added successfully.", "user_id": str(new_member.user_id)}

import shutil
import os

@router.post("/upload-photo")
async def upload_family_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session)
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, or WEBP images are allowed.")
    
    contents = await file.read()
    filename = f"{uuid.uuid4()}{file_ext}"
    
    # 1. Save to database for serverless persistence
    from app.models.blog import UploadedFile
    db_file = UploadedFile(
        filename=filename,
        mimetype=file.content_type or "image/jpeg",
        data=contents
    )
    db.add(db_file)
    await db.commit()
    
    # 2. Try to save to static folder (will fail silently on read-only environments)
    try:
        os.makedirs("static/profile_photos", exist_ok=True)
        filepath = os.path.join("static/profile_photos", filename)
        with open(filepath, "wb") as buffer:
            buffer.write(contents)
    except Exception:
        pass
        
    return {"photo_url": f"/static/profile_photos/{filename}"}
