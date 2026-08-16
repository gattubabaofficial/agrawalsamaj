from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import shutil
from pathlib import Path
from app.services.otp_delivery import (
    send_otp_message,
    CHANNEL_WHATSAPP,
    DELIVERED_CHANNELS,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import uuid
import json
import random
import string
import hashlib
from datetime import datetime, timedelta

from app.database import get_db_session
from app.models.user import User, UserRole, Family, PhoneOTPRequest
from app.models.requests import MembershipRequest, RequestStatus, FamilyCreationRequest, ProfileUpdateRequest
from app.dependencies import get_current_user, get_current_admin, get_optional_current_user, is_admin_level

router = APIRouter(prefix="/api/v1/membership", tags=["membership"])

# Roles an admin may assign through the generic role-update endpoint below.
ASSIGNABLE_ROLES = {UserRole.GUEST, UserRole.MEMBER, UserRole.VOLUNTEER}


@router.post("/upload-photo")
async def upload_profile_photo(file: UploadFile = File(...)):
    ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Invalid file format. Allowed: JPG, PNG, WEBP.")
    
    upload_dir = Path("uploads/profiles")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/uploads/profiles/{filename}"}


class RoleUpdateRequest(BaseModel):
    role: str


class ApplyWithOtpRequest(BaseModel):
    first_name: str
    surname: str
    father_name: Optional[str] = None
    parent_relation: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    profession: Optional[str] = None
    native_place: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    mobile_private: bool = False
    email_private: bool = False
    address_private: bool = False
    profession_private: bool = False
    native_place_private: bool = False
    bio_private: bool = False
    otp: str


class SendMemberEditOtpPayload(BaseModel):
    user_id: Optional[str] = None
    identifier: Optional[str] = None


class VerifyMemberEditOtpPayload(BaseModel):
    user_id: Optional[str] = None
    identifier: Optional[str] = None
    otp: str


class ProfileUpdateRequestPayload(BaseModel):
    user_id: str
    mobile: Optional[str] = None
    otp: str
    first_name: str
    surname: str
    father_name: Optional[str] = None
    profession: Optional[str] = None
    native_place: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    mobile_private: bool = False
    email_private: bool = False
    address_private: bool = False
    profession_private: bool = False
    native_place_private: bool = False
    bio_private: bool = False


class ContactMemberPayload(BaseModel):
    recipient_user_id: str
    sender_name: str
    sender_mobile: str
    sender_email: Optional[str] = None
    reason: str
    message: str
    otp: str




def mask_phone_number(mobile: Optional[str]) -> Optional[str]:
    if not mobile:
        return None
    clean = mobile.strip()
    if len(clean) <= 4:
        return clean
    return "X" * (len(clean) - 4) + clean[-4:]


def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


async def verify_otp_internal(db: AsyncSession, mobile: str, otp: str) -> bool:
    clean_mobile = mobile.strip()
    if not clean_mobile:
        return False

    # 1. Try to check OtpLog first (for registration/application flow)
    from app.models.user import OtpLog
    from datetime import timezone
    otp_log_stmt = (
        select(OtpLog)
        .where(OtpLog.target == clean_mobile)
        .where(OtpLog.otp_code == otp)
        .where(OtpLog.is_used == False)
        .order_by(OtpLog.created_at.desc())
        .limit(1)
    )
    try:
        otp_log_res = await db.execute(otp_log_stmt)
        otp_log = otp_log_res.scalars().first()
        if otp_log:
            now = datetime.now(timezone.utc)
            expires_at = otp_log.expires_at if otp_log.expires_at.tzinfo else otp_log.expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= now:
                otp_log.is_used = True
                await db.commit()
                return True
    except Exception:
        pass

    # 2. Fallback to PhoneOTPRequest (for login flow)
    result = await db.execute(
        select(PhoneOTPRequest)
        .where(PhoneOTPRequest.phone == clean_mobile)
        .order_by(PhoneOTPRequest.created_at.desc())
        .limit(1)
    )
    otp_req = result.scalars().first()
    if not otp_req:
        return False
    if otp_req.verified:
        return True
    if hash_otp(otp) == otp_req.otp_hash:
        otp_req.verified = True
        await db.commit()
        return True
    return False



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
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    # Fetch all users who are members
    result = await db.execute(
        select(User).filter(
            (User.role == UserRole.MEMBER) | (User.is_member == True)
        ).order_by(User.first_name, User.surname)
    )
    users = result.scalars().all()
    
    is_admin = False
    if current_user:
        r_str = str(getattr(current_user, "role", "")).upper()
        is_admin = r_str in ("ADMIN", "SUPER_ADMIN") or getattr(current_user, "custom_role_id", None) is not None
    
    data = []
    for u in users:
        # Imported list members keep their number in `contact_mobile` (non-unique);
        # registered members use `mobile`. Display whichever is present.
        display_mobile = u.mobile or u.contact_mobile

        # Privacy handling for email, address, mobile, profession, native_place, bio
        if is_admin:
            email_val = u.email
            mobile_val = display_mobile
            address_val = u.address
            profession_val = u.profession
            native_place_val = u.native_place
            bio_val = u.bio
        else:
            email_val = None if u.email_private else u.email
            address_val = None if u.address_private else u.address
            mobile_val = None if u.mobile_private else mask_phone_number(display_mobile)
            profession_val = None if getattr(u, "profession_private", False) else u.profession
            native_place_val = None if getattr(u, "native_place_private", False) else u.native_place
            bio_val = None if getattr(u, "bio_private", False) else u.bio

        data.append({
            "user_id": str(u.user_id),
            "samaj_id": u.samaj_id,
            "lm_no": u.lm_no,
            "zone": u.zone,
            "house_no": u.house_no,
            "member_status": u.member_status or "active",
            "first_name": u.first_name,
            "surname": u.surname,
            "father_name": u.father_name,
            "profession": profession_val,
            "native_place": native_place_val,
            "bio": bio_val,
            "profile_photo": u.profile_photo,
            "family_relation": u.family_relation,
            "email": email_val,
            "mobile": mobile_val,
            "mobile_masked": mask_phone_number(display_mobile),
            "address": address_val,
            "mobile_private": u.mobile_private,
            "email_private": u.email_private,
            "address_private": u.address_private,
            "profession_private": getattr(u, "profession_private", False),
            "native_place_private": getattr(u, "native_place_private", False),
            "bio_private": getattr(u, "bio_private", False),
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "is_member": u.is_member,
            "custom_role_id": str(u.custom_role_id) if u.custom_role_id else None
        })
    return data


@router.post("/contact-member")
async def contact_member(
    payload: ContactMemberPayload,
    db: AsyncSession = Depends(get_db_session)
):
    # Verify OTP on sender_mobile
    otp_valid = await verify_otp_internal(db, payload.sender_mobile, payload.otp)
    if not otp_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code for your mobile number.")

    try:
        u_uuid = uuid.UUID(payload.recipient_user_id)
        res = await db.execute(select(User).where(User.user_id == u_uuid))
        recipient = res.scalars().first()
    except ValueError:
        recipient = None

    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient member not found.")

    # Dispatch WhatsApp message to recipient's registered mobile number
    if recipient.mobile:
        from app.services.whatsapp_service import send_whatsapp_text
        from app.services.sms_service import send_sms

        formatted_msg = (
            f"📩 *New Contact Request from Agrawal Samaj Mansrovar Jaipur Portal*\n\n"
            f"👤 *Sender Name:* {payload.sender_name}\n"
            f"📞 *Sender Mobile:* {payload.sender_mobile}\n"
            f"📧 *Sender Email:* {payload.sender_email or 'Not provided'}\n"
            f"📋 *Reason:* {payload.reason}\n\n"
            f"💬 *Message Details:*\n{payload.message}\n\n"
            f"— Agrawal Samaj Mansrovar Jaipur Community Portal"
        )
        res_sid = send_whatsapp_text(recipient.mobile, formatted_msg)
        
        # Fallback to SMS if WhatsApp sidecar is unlinked or failed
        if res_sid in ("failed_sid", None):
            await send_sms(recipient.mobile, f"Agrawal Samaj Mansrovar Jaipur: New contact request from {payload.sender_name} ({payload.sender_mobile}): {payload.message}")

    return {
        "status": "success",
        "message": f"Your message request has been sent to {recipient.first_name} {recipient.surname}. They will review your contact details and get back to you."
    }


@router.post("/apply-with-otp", status_code=status.HTTP_201_CREATED)
async def apply_for_membership_with_otp(
    payload: ApplyWithOtpRequest,
    db: AsyncSession = Depends(get_db_session)
):
    # 1. Verify OTP
    otp_valid = await verify_otp_internal(db, payload.mobile, payload.otp)
    if not otp_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")

    # 2. Always create a new User record (mobile number is not unique)
    user = User(
        first_name=payload.first_name.strip(),
        surname=payload.surname.strip(),
        father_name=payload.father_name.strip() if payload.father_name else None,
        parent_relation=payload.parent_relation.strip() if payload.parent_relation else None,
        mobile=payload.mobile.strip(),
        email=payload.email.strip().lower() if payload.email else None,
        profession=payload.profession.strip() if payload.profession else None,
        native_place=payload.native_place.strip() if payload.native_place else None,
        bio=payload.bio.strip() if payload.bio else None,
        address=payload.address.strip() if payload.address else None,
        profile_photo=payload.profile_photo.strip() if payload.profile_photo else None,
        mobile_private=payload.mobile_private,
        email_private=payload.email_private,
        address_private=payload.address_private,
        profession_private=payload.profession_private,
        native_place_private=payload.native_place_private,
        bio_private=payload.bio_private,
        role=UserRole.GUEST,
        is_active=True,
        is_member=False
    )
    db.add(user)
    await db.flush()

    # 3. Create pending MembershipRequest
    new_req = MembershipRequest(
        user_id=user.user_id,
        message=f"Registration application from public members directory. Profession: {payload.profession or 'N/A'}, Address: {payload.address or 'N/A'}"
    )
    db.add(new_req)
    await db.commit()
    return {"message": "Membership application submitted successfully. Pending admin approval."}


@router.post("/send-member-edit-otp")
async def send_member_edit_otp(
    payload: SendMemberEditOtpPayload,
    db: AsyncSession = Depends(get_db_session)
):
    user = None
    if payload.user_id:
        try:
            u_uuid = uuid.UUID(payload.user_id)
            res = await db.execute(select(User).where(User.user_id == u_uuid))
            user = res.scalars().first()
        except ValueError:
            pass

    if not user and payload.identifier:
        ident = payload.identifier.strip()
        res = await db.execute(
            select(User).where(
                (User.samaj_id == ident) | (User.mobile == ident)
            )
        )
        user = res.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="Member account not found in Samaj database.")

    if not user.mobile:
        raise HTTPException(status_code=400, detail="No registered mobile number on record for this member. Please contact Samaj Admin.")

    target_mobile = user.mobile.strip()

    # Generate 6-digit OTP code and send to registered mobile
    otp_code = "".join(random.choices(string.digits, k=6))
    otp_hash = hash_otp(otp_code)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp_req = PhoneOTPRequest(
        phone=target_mobile,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        verified=False
    )
    db.add(otp_req)
    await db.commit()

    # Actually deliver it. This was missing: the code was generated, hashed and
    # stored, then discarded, while the response claimed it had been sent — so
    # the member waited for a message that did not exist and every code they
    # tried came back "Invalid or expired verification code."
    message = (
        f"Your Agrawal Samaj Mansrovar Jaipur verification code is {otp_code}. "
        f"Valid for 5 minutes. Do not share this with anyone."
    )
    channel = await send_otp_message(target_mobile, message)

    if channel not in DELIVERED_CHANNELS:
        # Nothing reached the member. Saying "sent" here is what caused the
        # original confusion, so fail instead and let them retry.
        raise HTTPException(
            status_code=502,
            detail="Could not send the verification code right now. Please try again in a moment.",
        )

    return {
        "status": "success",
        "channel": channel,
        "user_id": str(user.user_id),
        "samaj_id": user.samaj_id,
        "member_name": f"{user.first_name} {user.surname}",
        "masked_phone": mask_phone_number(target_mobile),
        "message": (
            f"Verification code sent on WhatsApp to the number ending in ...{target_mobile[-3:]}"
            if channel == CHANNEL_WHATSAPP
            else f"Verification code sent by SMS to the number ending in ...{target_mobile[-3:]}"
        ),
    }


@router.post("/verify-member-edit-otp")
async def verify_member_edit_otp(
    payload: VerifyMemberEditOtpPayload,
    db: AsyncSession = Depends(get_db_session)
):
    user = None
    if payload.user_id:
        try:
            u_uuid = uuid.UUID(payload.user_id)
            res = await db.execute(select(User).where(User.user_id == u_uuid))
            user = res.scalars().first()
        except ValueError:
            pass

    if not user and payload.identifier:
        ident = payload.identifier.strip()
        res = await db.execute(
            select(User).where(
                (User.samaj_id == ident) | (User.mobile == ident)
            )
        )
        user = res.scalars().first()

    if not user or not user.mobile:
        raise HTTPException(status_code=404, detail="Member account not found.")

    otp_valid = await verify_otp_internal(db, user.mobile, payload.otp)
    if not otp_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    return {
        "status": "success",
        "message": "OTP verified successfully.",
        "user": {
            "user_id": str(user.user_id),
            "samaj_id": user.samaj_id,
            "first_name": user.first_name,
            "surname": user.surname,
            "father_name": user.father_name,
            "profession": user.profession,
            "native_place": user.native_place,
            "bio": user.bio,
            "email": user.email,
            "mobile": user.mobile,
            "mobile_masked": mask_phone_number(user.mobile),
            "address": user.address,
            "profile_photo": user.profile_photo,
            "mobile_private": user.mobile_private,
            "email_private": user.email_private,
            "address_private": user.address_private,
            "profession_private": getattr(user, "profession_private", False),
            "native_place_private": getattr(user, "native_place_private", False),
            "bio_private": getattr(user, "bio_private", False),
        }
    }


@router.post("/update-profile/request", status_code=status.HTTP_201_CREATED)
async def submit_profile_update_request(
    payload: ProfileUpdateRequestPayload,
    db: AsyncSession = Depends(get_db_session)
):
    # 1. Verify user exists
    try:
        user_uuid = uuid.UUID(payload.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    user_res = await db.execute(select(User).where(User.user_id == user_uuid))
    user = user_res.scalars().first()
    if not user or not user.mobile:
        raise HTTPException(status_code=404, detail="Member account not found.")

    # 2. Verify OTP against user.mobile (the registered mobile number stored in DB!)
    otp_valid = await verify_otp_internal(db, user.mobile, payload.otp)
    if not otp_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")

    # 3. Construct old and new details
    old_details = {
        "first_name": user.first_name,
        "surname": user.surname,
        "father_name": user.father_name,
        "profession": user.profession,
        "native_place": user.native_place,
        "bio": user.bio,
        "email": user.email,
        "mobile": user.mobile,
        "address": user.address,
        "profile_photo": user.profile_photo,
        "mobile_private": user.mobile_private,
        "email_private": user.email_private,
        "address_private": user.address_private,
        "profession_private": getattr(user, "profession_private", False),
        "native_place_private": getattr(user, "native_place_private", False),
        "bio_private": getattr(user, "bio_private", False),
    }

    new_details = {
        "first_name": payload.first_name.strip(),
        "surname": payload.surname.strip(),
        "father_name": payload.father_name.strip() if payload.father_name else None,
        "profession": payload.profession.strip() if payload.profession else None,
        "native_place": payload.native_place.strip() if payload.native_place else None,
        "bio": payload.bio.strip() if payload.bio else None,
        "email": payload.email.strip().lower() if payload.email else None,
        "mobile": payload.mobile.strip() if payload.mobile else user.mobile,
        "address": payload.address.strip() if payload.address else None,
        "profile_photo": payload.profile_photo.strip() if payload.profile_photo else None,
        "mobile_private": payload.mobile_private,
        "email_private": payload.email_private,
        "address_private": payload.address_private,
        "profession_private": payload.profession_private,
        "native_place_private": payload.native_place_private,
        "bio_private": payload.bio_private,
    }

    req = ProfileUpdateRequest(
        user_id=user.user_id,
        old_details_json=json.dumps(old_details),
        new_details_json=json.dumps(new_details),
        status=RequestStatus.PENDING
    )
    db.add(req)
    await db.commit()
    return {"message": "Profile update request submitted successfully. Pending admin approval."}


@router.get("/update-profile/requests")
async def get_profile_update_requests(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(ProfileUpdateRequest, User)
        .join(User, ProfileUpdateRequest.user_id == User.user_id)
        .where(ProfileUpdateRequest.status == RequestStatus.PENDING)
        .order_by(ProfileUpdateRequest.created_at.desc())
    )
    requests_data = []
    for req, user in result.all():
        old_details = json.loads(req.old_details_json) if req.old_details_json else {}
        new_details = json.loads(req.new_details_json) if req.new_details_json else {}
        requests_data.append({
            "request_id": str(req.request_id),
            "created_at": req.created_at,
            "status": req.status,
            "user": {
                "id": str(user.user_id),
                "samaj_id": user.samaj_id,
                "name": f"{user.first_name} {user.surname}"
            },
            "old_details": old_details,
            "new_details": new_details
        })
    return requests_data


@router.post("/update-profile/requests/{request_id}/approve")
async def approve_profile_update(
    request_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    try:
        req_uuid = uuid.UUID(request_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid request ID format.")

    result = await db.execute(select(ProfileUpdateRequest).where(ProfileUpdateRequest.request_id == req_uuid))
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending profile update request not found.")

    user_res = await db.execute(select(User).where(User.user_id == req.user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_details = json.loads(req.new_details_json)
    user.first_name = new_details.get("first_name", user.first_name)
    user.surname = new_details.get("surname", user.surname)
    user.father_name = new_details.get("father_name", user.father_name)
    user.profession = new_details.get("profession", user.profession)
    user.native_place = new_details.get("native_place", user.native_place)
    user.bio = new_details.get("bio", user.bio)
    if "email" in new_details:
        email_val = new_details["email"]
        if email_val and not ("*" in email_val or "x" in email_val):
            user.email = email_val
    if "mobile" in new_details:
        mobile_val = new_details["mobile"]
        if mobile_val and not ("X" in mobile_val or "x" in mobile_val or "*" in mobile_val):
            user.mobile = mobile_val
    if "address" in new_details:
        user.address = new_details["address"]
    if "profile_photo" in new_details:
        user.profile_photo = new_details["profile_photo"]
    user.mobile_private = new_details.get("mobile_private", False)
    user.email_private = new_details.get("email_private", False)
    user.address_private = new_details.get("address_private", False)
    user.profession_private = new_details.get("profession_private", False)
    user.native_place_private = new_details.get("native_place_private", False)
    user.bio_private = new_details.get("bio_private", False)

    req.status = RequestStatus.APPROVED
    await db.commit()
    return {"message": "Profile update approved and applied successfully."}


@router.post("/update-profile/requests/{request_id}/reject")
async def reject_profile_update(
    request_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    try:
        req_uuid = uuid.UUID(request_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid request ID format.")

    result = await db.execute(select(ProfileUpdateRequest).where(ProfileUpdateRequest.request_id == req_uuid))
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending profile update request not found.")

    req.status = RequestStatus.REJECTED
    await db.commit()
    return {"message": "Profile update request rejected."}



@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    try:
        new_role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role.")

    if new_role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=403, detail="Cannot assign this role through this endpoint.")

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    result = await db.execute(select(User).where(User.user_id == user_uuid))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Cannot change the role of an admin through this endpoint.")

    user.role = new_role
    if new_role == UserRole.MEMBER:
        user.is_member = True
        if not user.samaj_id:
            user.samaj_id = f"SMJ-{str(user.user_id)[:6].upper()}"
    elif new_role == UserRole.GUEST:
        user.is_member = False

    await db.commit()
    return {"message": f"Role updated to {new_role.value}.", "user_id": str(user.user_id), "role": new_role.value}


class AdminUpdateMemberRequest(BaseModel):
    first_name: Optional[str] = None
    surname: Optional[str] = None
    father_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    family_relation: Optional[str] = None
    samaj_id: Optional[str] = None
    lm_no: Optional[int] = None
    zone: Optional[str] = None
    house_no: Optional[str] = None
    member_status: Optional[str] = None
    profession: Optional[str] = None
    native_place: Optional[str] = None
    bio: Optional[str] = None
    profile_photo: Optional[str] = None


@router.put("/users/{user_id}/admin-update")
async def admin_update_user(
    user_id: str,
    payload: AdminUpdateMemberRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    result = await db.execute(select(User).where(User.user_id == user_uuid))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found.")

    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if payload.surname is not None:
        user.surname = payload.surname.strip()
    if payload.father_name is not None:
        user.father_name = payload.father_name.strip() or None
    if payload.mobile is not None:
        mobile_val = payload.mobile.strip() or None
        if mobile_val:
            # If it's a masked placeholder, ignore it to prevent overwriting the real phone number
            if "X" in mobile_val or "x" in mobile_val or "*" in mobile_val:
                pass
            else:
                m_check = await db.execute(select(User).where(User.mobile == mobile_val, User.user_id != user_uuid))
                if m_check.scalars().first() is not None:
                    raise HTTPException(status_code=400, detail="Mobile number already registered by another member.")
                user.mobile = mobile_val
    if payload.email is not None:
        email_val = payload.email.strip().lower() or None
        if email_val:
            # If it's a masked placeholder, ignore it to prevent overwriting the real email
            if "*" in email_val or "x" in email_val:
                pass
            else:
                e_check = await db.execute(select(User).where(User.email == email_val, User.user_id != user_uuid))
                if e_check.scalars().first() is not None:
                    raise HTTPException(status_code=400, detail="Email already registered by another member.")
                user.email = email_val
    if payload.address is not None:
        user.address = payload.address.strip() or None
    if payload.family_relation is not None:
        user.family_relation = payload.family_relation.strip() or None
    if payload.samaj_id is not None:
        user.samaj_id = payload.samaj_id.strip() or None
    if payload.lm_no is not None:
        user.lm_no = payload.lm_no
    if payload.zone is not None:
        user.zone = payload.zone.strip() or None
    if payload.house_no is not None:
        user.house_no = payload.house_no.strip() or None
    if payload.member_status is not None:
        user.member_status = payload.member_status.strip() or "active"
    if payload.profession is not None:
        user.profession = payload.profession.strip() or None
    if payload.native_place is not None:
        user.native_place = payload.native_place.strip() or None
    if payload.bio is not None:
        user.bio = payload.bio.strip() or None
    if payload.profile_photo is not None:
        user.profile_photo = payload.profile_photo.strip() or None

    await db.commit()
    return {"status": "success", "message": "Member updated successfully."}


@router.get("/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    # Fetch all registered users who are not registered members and not admins
    # (volunteers are included so they remain visible in the directory after promotion)
    result = await db.execute(
        select(User).filter(
            (User.role.in_([UserRole.GUEST, UserRole.VOLUNTEER])) & (User.is_member == False)
        ).order_by(User.first_name, User.surname)
    )
    users = result.scalars().all()
    
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN) or getattr(current_user, "custom_role_id", None) is not None
    
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


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    user_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can delete members")

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    if current_user.user_id == user_uuid:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    stmt = select(User).where(User.user_id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(user)
    await db.commit()
    return None


