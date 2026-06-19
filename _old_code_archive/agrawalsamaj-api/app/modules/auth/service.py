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
    User, ChatGroup, ChatGroupMember
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

def generate_samaj_id() -> str:
    return "".join(random.choices("0123456789", k=16))

async def register_user_service(db: AsyncSession, payload: UserCreate) -> User:
    # Check if user already exists
    phone_check = await db.execute(select(User).filter(User.phone == payload.phone))
    if phone_check.scalars().first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    if payload.email:
        email_check = await db.execute(select(User).filter(User.email == payload.email))
        if email_check.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

    # Generate unique 16-digit samaj_id
    while True:
        new_samaj_id = str(uuid.uuid4().int)[:16]
        existing = await db.execute(select(User).filter(User.samaj_id == new_samaj_id))
        if not existing.scalars().first():
            break

    from app.models.all_models import Address
    new_address = Address()
    db.add(new_address)
    await db.flush()

    # 2. Create User
    new_user = User(
        uuid=str(uuid.uuid4()),
        samaj_id=new_samaj_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        email=payload.email,
        password_hash=get_password_hash(payload.password) if payload.password else None,
        role="USER",
        status="NOT_APPLIED",
        profession=payload.profession,
        approval_status="NOT_APPLIED",
        address_id=new_address.id,
        show_phone=False,
        show_email=False,
        show_address=False
    )
    db.add(new_user)
    await db.flush()

    # 3. Join Community Group
    # Also add automatically to standard "Community Group" (which holds all users)
    community_group_query = await db.execute(select(ChatGroup).filter(ChatGroup.group_name == "Agrawal Samaj Community Group"))
    community_group = community_group_query.scalars().first()
    if not community_group:
        community_group = ChatGroup(group_name="Agrawal Samaj Community Group", group_type="COMMUNITY")
        db.add(community_group)
        await db.flush()
    db.add(ChatGroupMember(group_id=community_group.id, samaj_id=new_user.samaj_id))

    await db.commit()
    await db.refresh(new_user)
    
    # Attach address manually to avoid lazy-loading error on serialization
    new_user.address = new_address
    
    return new_user
