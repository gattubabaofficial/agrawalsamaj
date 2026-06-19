import random
import re
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.user import User, OtpLog, OtpType, UserRole
from app.utils.security import hash_password

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


class SendOtpRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Mobile number")


class RegisterVerifyRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    identifier: str = Field(...)
    password: str = Field(..., min_length=6)
    otp_code: str = Field(..., min_length=6, max_length=6)


class OAuthRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    provider: str = Field(..., description="google or yahoo")
    provider_id: str = Field(..., min_length=1)


def parse_identifier(identifier: str):
    """
    Parse identifier and check if it is email or mobile.
    Returns: ('email' | 'mobile', normalized_value)
    Raises HTTP 400 if invalid format.
    """
    val = identifier.strip()
    
    # 1. Check if email
    if "@" in val:
        if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", val):
            return "email", val.lower()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format."
        )
        
    # 2. Check if mobile number (10 to 15 digits, optional + prefix)
    normalized_mobile = re.sub(r"[\s\-]", "", val)
    if re.match(r"^\+?[0-9]{10,15}$", normalized_mobile):
        return "mobile", normalized_mobile
        
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please enter a valid email address or 10-15 digit mobile number."
    )


@router.post("/register/send-otp")
async def send_otp(
    payload: SendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Parse and identify Email vs. Mobile
    id_type, normalized_val = parse_identifier(payload.identifier)

    # 2. Check uniqueness in users table
    if id_type == "email":
        user_result = await db.execute(select(User).where(User.email == normalized_val))
        if user_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already registered."
            )
    else:
        user_result = await db.execute(select(User).where(User.mobile == normalized_val))
        if user_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This mobile number is already registered."
            )

    # 3. Generate a 6-digit OTP code
    otp_code = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # 4. Save to otp_logs
    otp_log = OtpLog(
        target=normalized_val,
        otp_code=otp_code,
        otp_type=OtpType.REGISTRATION,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_log)
    await db.commit()

    # Log to terminal for debugging
    print(f"\n--- [OTP SENT] Target: {normalized_val} | OTP Code: {otp_code} ---\n")

    # In development, we return the OTP code in response for testing convenience
    return {
        "status": "success",
        "message": f"OTP sent successfully to your {id_type}.",
        "otp": otp_code  # Expose in dev environment
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def verify_otp_and_register(
    payload: RegisterVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Parse identifier
    id_type, normalized_val = parse_identifier(payload.identifier)

    # 2. Verify OTP
    otp_result = await db.execute(
        select(OtpLog)
        .where(OtpLog.target == normalized_val)
        .where(OtpLog.otp_code == payload.otp_code)
        .where(OtpLog.otp_type == OtpType.REGISTRATION)
        .where(OtpLog.is_used == False)
        .order_by(OtpLog.created_at.desc())
    )
    otp_log = otp_result.scalars().first()

    if otp_log is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please try again."
        )

    # Check if expired
    # Compare with timezone-naive utcnow (since OtpLog.expires_at is timezone-naive or tz-aware depending on DB)
    now = datetime.utcnow()
    # Remove timezone info for comparison if DB returns timezone-aware
    expires_naive = otp_log.expires_at.replace(tzinfo=None) if otp_log.expires_at.tzinfo else otp_log.expires_at
    if expires_naive < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired. Please request a new one."
        )

    # 3. Check uniqueness again (race condition check)
    if id_type == "email":
        user_result = await db.execute(select(User).where(User.email == normalized_val))
        if user_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already registered."
            )
    else:
        user_result = await db.execute(select(User).where(User.mobile == normalized_val))
        if user_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This mobile number is already registered."
            )

    # Mark OTP as used
    otp_log.is_used = True

    # 4. Create user
    hashed_pwd = hash_password(payload.password)
    
    email_val = normalized_val if id_type == "email" else None
    mobile_val = normalized_val if id_type == "mobile" else None

    new_user = User(
        first_name=payload.first_name.strip(),
        surname=payload.surname.strip(),
        email=email_val,
        mobile=mobile_val,
        password_hash=hashed_pwd,
        family_id=None,  # No family creation or assignment during registration
        role=UserRole.USER,
        is_active=True,
        is_member=False
    )
    db.add(new_user)
    await db.commit()

    return {
        "status": "success",
        "message": "User registered successfully.",
        "user_id": str(new_user.user_id)
    }


@router.post("/register/oauth", status_code=status.HTTP_201_CREATED)
async def register_oauth(
    payload: OAuthRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate provider
    provider = payload.provider.strip().lower()
    if provider not in ["google", "yahoo"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth provider. Supported providers: google, yahoo."
        )

    # 2. Check uniqueness of email
    email_val = payload.email.strip().lower()
    email_result = await db.execute(select(User).where(User.email == email_val))
    if email_result.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address is already registered."
        )

    # 3. Check uniqueness of provider ID
    if provider == "google":
        google_result = await db.execute(select(User).where(User.google_id == payload.provider_id))
        if google_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This Google account is already registered."
            )
        google_id_val = payload.provider_id
        yahoo_id_val = None
    else:
        yahoo_result = await db.execute(select(User).where(User.yahoo_id == payload.provider_id))
        if yahoo_result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This Yahoo account is already registered."
            )
        google_id_val = None
        yahoo_id_val = payload.provider_id

    # 4. Create User
    new_user = User(
        first_name=payload.first_name.strip(),
        surname=payload.surname.strip(),
        email=email_val,
        mobile=None,
        password_hash=None,  # Password is null for OAuth accounts
        family_id=None,      # No family creation or assignment during registration
        role=UserRole.USER,
        is_active=True,
        is_member=False,
        google_id=google_id_val,
        yahoo_id=yahoo_id_val
    )
    db.add(new_user)
    await db.commit()

    return {
        "status": "success",
        "message": "User registered successfully through social sign-in.",
        "user_id": str(new_user.user_id)
    }
