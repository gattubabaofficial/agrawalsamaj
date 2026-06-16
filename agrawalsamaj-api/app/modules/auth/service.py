import random
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

from app.core.security import get_password_hash, create_access_token, create_refresh_token
from app.core.email import send_otp_email
from app.schemas.all_schemas import UserCreate, OTPVerify
from app.models.all_models import (
    User, MemberProfile, UserPrivacySettings, Area, Colony, 
    ChatGroup, ChatGroupMember
)

logger = logging.getLogger(__name__)

# Simple in-memory storage for OTP verification:
# { email_or_phone: (otp_code, expires_at, attempts_count) }
otp_store: Dict[str, Tuple[str, datetime, int]] = {}

def generate_otp(length: int = 6) -> str:
    return "".join(random.choices("0123456789", k=length))

async def request_otp_service(email_or_phone: str) -> str:
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # Store OTP
    otp_store[email_or_phone] = (otp, expires_at, 0)
    
    # If it is email, send it
    if "@" in email_or_phone:
        sent = await send_otp_email(email_or_phone, otp)
        if not sent:
            logger.warning(f"Failed to dispatch OTP email, but OTP generated: {otp}")
    else:
        # For phone OTP, we just log it in console as a free alternative
        logger.info(f"SMS OTP generated for {email_or_phone}: {otp} (Simulated via Fast2SMS free routes)")
        
    return otp

async def verify_otp_service(payload: OTPVerify) -> bool:
    target = payload.email_or_phone
    if target not in otp_store:
        raise HTTPException(status_code=400, detail="OTP request not found")
        
    otp, expires_at, attempts = otp_store[target]
    
    if datetime.utcnow() > expires_at:
        otp_store.pop(target, None)
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    if attempts >= 5:
        otp_store.pop(target, None)
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded. Try requesting a new OTP.")
        
    if otp != payload.otp:
        # Increment attempts
        otp_store[target] = (otp, expires_at, attempts + 1)
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # Verification successful
    otp_store.pop(target, None)
    return True

async def register_user_service(db: AsyncSession, payload: UserCreate) -> User:
    # Check if user already exists
    phone_check = await db.execute(select(User).filter(User.phone == payload.phone))
    if phone_check.scalars().first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    if payload.email:
        email_check = await db.execute(select(User).filter(User.email == payload.email))
        if email_check.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

    # 1. Resolve Area & Colony (Create them if they don't exist)
    area_name_stripped = payload.area_name.strip().title()
    colony_name_stripped = payload.colony_name.strip().title()
    
    area_query = await db.execute(select(Area).filter(Area.area_name == area_name_stripped))
    area_obj = area_query.scalars().first()
    if not area_obj:
        area_obj = Area(area_name=area_name_stripped)
        db.add(area_obj)
        await db.flush()  # populate ID
        
    colony_query = await db.execute(select(Colony).filter(Colony.colony_name == colony_name_stripped))
    colony_obj = colony_query.scalars().first()
    if not colony_obj:
        colony_obj = Colony(colony_name=colony_name_stripped, area_id=area_obj.id)
        db.add(colony_obj)
        await db.flush()  # populate ID

    # 2. Create User
    new_user = User(
        uuid=str(uuid.uuid4()),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        email=payload.email,
        password_hash=get_password_hash(payload.password) if payload.password else None,
        role="USER",  # Starts as outsider USER
        status="PENDING"  # Awaiting Admin review to check if Samaj Member or Outsider
    )
    db.add(new_user)
    await db.flush()

    # 3. Create Member Profile
    new_profile = MemberProfile(
        user_id=new_user.id,
        profession=payload.profession,
        approval_status="PENDING"
    )
    db.add(new_profile)

    # 4. Create Privacy Settings (Default to show nothing to other users except name)
    new_privacy = UserPrivacySettings(
        user_id=new_user.id,
        show_phone=False,
        show_email=False,
        show_address=False
    )
    db.add(new_privacy)

    # 5. Join Colony & Area chat groups (Auto-creates the chat groups if missing)
    area_group_name = f"{area_name_stripped} Area Group"
    colony_group_name = f"{colony_name_stripped} Colony Group"
    
    # Area group lookup
    area_group_query = await db.execute(select(ChatGroup).filter(ChatGroup.group_name == area_group_name))
    area_group = area_group_query.scalars().first()
    if not area_group:
        area_group = ChatGroup(group_name=area_group_name, group_type="AREA")
        db.add(area_group)
        await db.flush()
        
    # Colony group lookup
    colony_group_query = await db.execute(select(ChatGroup).filter(ChatGroup.group_name == colony_group_name))
    colony_group = colony_group_query.scalars().first()
    if not colony_group:
        colony_group = ChatGroup(group_name=colony_group_name, group_type="COLONY")
        db.add(colony_group)
        await db.flush()

    # Add memberships
    db.add(ChatGroupMember(group_id=area_group.id, user_id=new_user.id))
    db.add(ChatGroupMember(group_id=colony_group.id, user_id=new_user.id))
    
    # Also add automatically to standard "Community Group" (which holds all users)
    community_group_query = await db.execute(select(ChatGroup).filter(ChatGroup.group_name == "Agrawal Samaj Community Group"))
    community_group = community_group_query.scalars().first()
    if not community_group:
        community_group = ChatGroup(group_name="Agrawal Samaj Community Group", group_type="COMMUNITY")
        db.add(community_group)
        await db.flush()
    db.add(ChatGroupMember(group_id=community_group.id, user_id=new_user.id))

    await db.commit()
    await db.refresh(new_user)
    return new_user
