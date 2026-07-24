import random
import re
import string
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi.security import OAuth2PasswordRequestForm

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User, Family, OtpLog, OtpType, UserRole, PhoneOTPRequest, EmailOTPRequest
from app.models.requests import MembershipRequest
from app.utils.security import hash_password, verify_password, create_access_token
from app.services.sms_service import send_sms
from app.services.email_service import send_email
import hashlib
import os
import asyncio
import time

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# In-memory brute-force guard for password login. Unlike the OTP endpoints
# (which persist attempts to the DB), this resets on restart and doesn't
# span multiple worker processes — acceptable for this single-instance
# deployment, but the first thing to replace with a persisted/shared store
# if this is ever run behind more than one process.
_login_attempts: dict[str, list[float]] = {}
_LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
_LOGIN_LOCKOUT_SECONDS = int(os.getenv("LOGIN_LOCKOUT_SECONDS", "300"))


def _check_login_rate_limit(key: str):
    now = time.time()
    attempts = [t for t in _login_attempts.get(key, []) if now - t < _LOGIN_LOCKOUT_SECONDS]
    _login_attempts[key] = attempts
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again in a few minutes.",
        )


def _record_login_failure(key: str):
    _login_attempts.setdefault(key, []).append(time.time())


def _clear_login_failures(key: str):
    _login_attempts.pop(key, None)


class SendOtpRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Mobile number")

class PhoneOtpSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="10-15 digit mobile number")

class PhoneOtpVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)


class EmailOtpSendRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address")

class EmailOtpVerifyRequest(BaseModel):
    email: EmailStr = Field(...)
    otp: str = Field(..., min_length=6, max_length=6)

class RegisterVerifyRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    identifier: str = Field(...)
    password: str = Field(..., min_length=6)
    verification_token: Optional[str] = Field(None, description="Returned by /email/verify-otp")
    otp_code: Optional[str] = Field(None, description="For legacy/mobile registration if applicable")
    family_code: Optional[str] = None
    family_relation: Optional[str] = None


class OAuthRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    provider: str = Field(..., description="google or yahoo")
    provider_id: str = Field(..., min_length=1)
    family_code: Optional[str] = None
    family_relation: Optional[str] = None


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


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    username field should contain email or mobile.
    """
    id_type, normalized_val = parse_identifier(form_data.username)

    _check_login_rate_limit(normalized_val)

    if id_type == "email":
        user_result = await db.execute(select(User).where(User.email == normalized_val))
    else:
        user_result = await db.execute(select(User).where(User.mobile == normalized_val))

    user = user_result.scalars().first()

    if not user or not user.password_hash:
        _record_login_failure(normalized_val)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        _record_login_failure(normalized_val)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _clear_login_failures(normalized_val)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role.value})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": str(user.user_id),
        "role": user.role.value,
        "first_name": user.first_name,
        "surname": user.surname,
    }

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

@router.post("/phone/send-otp")
async def phone_send_otp(payload: PhoneOtpSendRequest, db: AsyncSession = Depends(get_db)):
    id_type, normalized_mobile = parse_identifier(payload.phone)
    if id_type != "mobile":
        raise HTTPException(status_code=400, detail="Invalid mobile number format.")

    # 1. Rate limiting
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    
    recent_requests_query = await db.execute(
        select(PhoneOTPRequest)
        .where(PhoneOTPRequest.phone == normalized_mobile)
        .where(PhoneOTPRequest.created_at >= one_hour_ago)
        .order_by(PhoneOTPRequest.created_at.desc())
    )
    recent_requests = recent_requests_query.scalars().all()
    
    max_attempts = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    if len(recent_requests) >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")
        
    cooldown = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    if recent_requests and (now - recent_requests[0].created_at).total_seconds() < cooldown:
        raise HTTPException(status_code=429, detail=f"Please wait {cooldown} seconds before requesting a new OTP.")

    # 2. Generate and store OTP
    otp_code = "".join(random.choices(string.digits, k=6))
    otp_hash = hash_otp(otp_code)
    expiry_minutes = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    expires_at = now + timedelta(minutes=expiry_minutes)

    # Invalidate previous unverified OTPs
    for req in recent_requests:
        if not req.verified:
            req.expires_at = now
            
    otp_request = PhoneOTPRequest(
        phone=normalized_mobile,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        verified=False
    )
    db.add(otp_request)
    await db.commit()

    # 3. Send SMS
    message = f"Your Agrawal Samaj verification code is {otp_code}. Valid for {expiry_minutes} minutes. Do not share this with anyone."
    sms_sent = await send_sms(normalized_mobile, message)
    
    if not sms_sent:
        # We don't necessarily fail the API if dummy mode is on, but in prod we might.
        pass

    return {
        "status": "success",
        "message": "OTP sent successfully."
    }

@router.post("/phone/verify-otp")
async def phone_verify_otp(payload: PhoneOtpVerifyRequest, db: AsyncSession = Depends(get_db)):
    id_type, normalized_mobile = parse_identifier(payload.phone)
    if id_type != "mobile":
        raise HTTPException(status_code=400, detail="Invalid mobile number.")

    # 1. Get the most recent active OTP request
    otp_query = await db.execute(
        select(PhoneOTPRequest)
        .where(PhoneOTPRequest.phone == normalized_mobile)
        .where(PhoneOTPRequest.verified == False)
        .order_by(PhoneOTPRequest.created_at.desc())
        .limit(1)
    )
    otp_req = otp_query.scalars().first()

    if not otp_req:
        raise HTTPException(status_code=400, detail="No pending OTP request found.")

    if otp_req.attempts >= 5:
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded. Request a new OTP.")

    now = datetime.utcnow()
    expires_naive = otp_req.expires_at.replace(tzinfo=None) if otp_req.expires_at.tzinfo else otp_req.expires_at
    if expires_naive < now:
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

    # 2. Verify hash
    if hash_otp(payload.otp) != otp_req.otp_hash:
        otp_req.attempts += 1
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    # Mark as verified
    otp_req.verified = True
    await db.commit()

    # 3. Handle User Session (Auto-register if not found)
    user_query = await db.execute(select(User).where(User.mobile == normalized_mobile))
    user = user_query.scalars().first()

    if not user:
        user = User(
            first_name="User",
            surname="",
            mobile=normalized_mobile,
            role=UserRole.GUEST,
            is_active=True,
            is_member=False
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account.")

    # 4. Generate Token
    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role.value})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": str(user.user_id),
        "role": user.role.value,
        "first_name": user.first_name,
        "surname": user.surname,
    }



@router.post("/email/send-otp")
async def email_send_otp(payload: EmailOtpSendRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = payload.email.lower()

    # 1. Check uniqueness in users table
    user_result = await db.execute(select(User).where(User.email == normalized_email))
    existing_user = user_result.scalars().first()
    if existing_user is not None and existing_user.password_hash is not None:
        raise HTTPException(status_code=400, detail="This email address is already registered.")

    # 2. Rate limiting
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    
    recent_requests_query = await db.execute(
        select(EmailOTPRequest)
        .where(EmailOTPRequest.email == normalized_email)
        .where(EmailOTPRequest.created_at >= one_hour_ago)
        .order_by(EmailOTPRequest.created_at.desc())
    )
    recent_requests = recent_requests_query.scalars().all()
    
    max_attempts = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    if len(recent_requests) >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")
        
    cooldown = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    if recent_requests and (now - recent_requests[0].created_at).total_seconds() < cooldown:
        raise HTTPException(status_code=429, detail=f"Please wait {cooldown} seconds before requesting a new OTP.")

    # 3. Generate and store OTP
    otp_code = "".join(random.choices(string.digits, k=6))
    otp_hash = hash_otp(otp_code)
    expiry_minutes = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    expires_at = now + timedelta(minutes=expiry_minutes)

    # Invalidate previous unverified OTPs
    for req in recent_requests:
        if not req.verified:
            req.expires_at = now
            
    otp_request = EmailOTPRequest(
        email=normalized_email,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        verified=False
    )
    db.add(otp_request)
    await db.commit()

    # 4. Send Email
    subject = "Your Verification Code"
    message = f"Your verification code is {otp_code}. It expires in {expiry_minutes} minutes."
    email_sent = await asyncio.to_thread(send_email, normalized_email, subject, message)
    
    if not email_sent:
        if os.getenv("ENVIRONMENT") == "development":
            print(f"\n==========================================")
            print(f"[DEVELOPMENT FALLBACK: EMAIL SEND FAILED]")
            print(f"To: {normalized_email}")
            print(f"Subject: {subject}")
            print(f"OTP Code: {otp_code}")
            print(f"==========================================\n")
            return {
                "status": "success",
                "message": "OTP generated successfully (Development Fallback). Check terminal console.",
                "otp": otp_code
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please check your backend terminal logs for SMTP error details."
        )

    res_data = {
        "status": "success",
        "message": "OTP sent successfully to your email."
    }
    if os.getenv("ENVIRONMENT") == "development":
        res_data["otp"] = otp_code

    return res_data

@router.post("/email/verify-otp")
async def email_verify_otp(payload: EmailOtpVerifyRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = payload.email.lower()

    # 1. Get the most recent active OTP request
    otp_query = await db.execute(
        select(EmailOTPRequest)
        .where(EmailOTPRequest.email == normalized_email)
        .where(EmailOTPRequest.verified == False)
        .order_by(EmailOTPRequest.created_at.desc())
        .limit(1)
    )
    otp_req = otp_query.scalars().first()

    if not otp_req:
        raise HTTPException(status_code=400, detail="No pending OTP request found.")

    if otp_req.attempts >= 5:
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded. Request a new OTP.")

    now = datetime.utcnow()
    expires_naive = otp_req.expires_at.replace(tzinfo=None) if otp_req.expires_at.tzinfo else otp_req.expires_at
    if expires_naive < now:
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

    # 2. Verify hash
    if hash_otp(payload.otp) != otp_req.otp_hash:
        otp_req.attempts += 1
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    # Mark as verified
    otp_req.verified = True
    await db.commit()

    return {
        "status": "success",
        "message": "Email verified successfully.",
        "email_verification_token": str(otp_req.id)
    }

@router.post("/register/send-otp")
async def send_otp(
    payload: SendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    # This is retained for Mobile registration fallback if needed
    id_type, normalized_val = parse_identifier(payload.identifier)

    if id_type == "email":
        raise HTTPException(status_code=400, detail="Use /email/send-otp for email verification.")

    user_result = await db.execute(select(User).where(User.mobile == normalized_val))
    existing_user = user_result.scalars().first()
    if existing_user is not None and existing_user.password_hash is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This mobile number is already registered."
        )

    otp_code = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    otp_log = OtpLog(
        target=normalized_val,
        otp_code=otp_code,
        otp_type=OtpType.REGISTRATION,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_log)
    await db.commit()

    if os.getenv("ENVIRONMENT") == "development":
        print(f"\n--- [OTP SENT] Target: {normalized_val} | OTP Code: {otp_code} ---\n")

    # Send real SMS
    message = f"Your Agrawal Samaj registration verification code is {otp_code}. Valid for 10 minutes."
    await send_sms(normalized_val, message)

    response_data = {
        "status": "success",
        "message": f"OTP sent successfully to your {id_type}."
    }

    # Only return the otp in the response body if in dummy mode
    provider = os.getenv("SMS_PROVIDER", "msg91").lower()
    is_dummy_provider = provider == "dummy"
    is_dummy_msg91 = (provider == "msg91" and (not os.getenv("SMS_API_KEY") or os.getenv("SMS_API_KEY") == "dummy_key"))
    is_dummy_twilio = (provider == "twilio" and (not os.getenv("TWILIO_ACCOUNT_SID") or os.getenv("TWILIO_ACCOUNT_SID") == "dummy_sid" or "your_" in os.getenv("TWILIO_ACCOUNT_SID")))
    is_dummy_2factor = (provider == "2factor" and (not os.getenv("TWOFACTOR_API_KEY") and (not os.getenv("SMS_API_KEY") or os.getenv("SMS_API_KEY") == "dummy_key")))
    
    if is_dummy_provider or is_dummy_msg91 or is_dummy_twilio or is_dummy_2factor:
        response_data["otp"] = otp_code

    return response_data

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def verify_otp_and_register(
    payload: RegisterVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    id_type, normalized_val = parse_identifier(payload.identifier)

    # 2. Verify Token or OTP
    if id_type == "email":
        if not payload.verification_token:
            raise HTTPException(status_code=400, detail="Email verification token required.")
        
        try:
            token_uuid = uuid.UUID(payload.verification_token)
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid verification token format.")

        # Verify token in email_otp_requests
        otp_result = await db.execute(
            select(EmailOTPRequest)
            .where(EmailOTPRequest.id == token_uuid)
            .where(EmailOTPRequest.email == normalized_val)
            .where(EmailOTPRequest.verified == True)
        )
        otp_req = otp_result.scalars().first()
        if not otp_req:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
    else:
        if not payload.otp_code:
            raise HTTPException(status_code=400, detail="OTP code required for mobile registration.")
            
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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code.")

        now = datetime.utcnow()
        expires_naive = otp_log.expires_at.replace(tzinfo=None) if otp_log.expires_at.tzinfo else otp_log.expires_at
        if expires_naive < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP code has expired.")
        
        otp_log.is_used = True

    # 3. Check uniqueness again (race condition check)
    existing_user = None
    if id_type == "email":
        user_result = await db.execute(select(User).where(User.email == normalized_val))
        existing_user = user_result.scalars().first()
        if existing_user is not None and existing_user.password_hash is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already registered."
            )
    else:
        user_result = await db.execute(select(User).where(User.mobile == normalized_val))
        existing_user = user_result.scalars().first()
        if existing_user is not None and existing_user.password_hash is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This mobile number is already registered."
            )

    # Mark OTP as used
    if id_type == "mobile":
        otp_log.is_used = True

    # 4. Create or update user
    hashed_pwd = hash_password(payload.password)
    
    target_family_id = None
    target_relation = None
    if payload.family_code:
        fam_result = await db.execute(select(Family).where(Family.family_code == payload.family_code))
        family = fam_result.scalars().first()
        if not family:
            raise HTTPException(status_code=400, detail="Invalid Family Code.")
        target_family_id = family.family_id
        target_relation = payload.family_relation or "Member"

    if existing_user:
        existing_user.first_name = payload.first_name.strip()
        existing_user.surname = payload.surname.strip()
        existing_user.password_hash = hashed_pwd
        existing_user.is_active = True
        
        # Capture placeholder family details if not overridden by a new family_code
        if not target_family_id and existing_user.family_id:
            target_family_id = existing_user.family_id
            target_relation = existing_user.family_relation
            
        existing_user.family_id = None
        existing_user.family_relation = None
        
        await db.commit()
        await db.refresh(existing_user)
        new_user = existing_user
    else:
        email_val = normalized_val if id_type == "email" else None
        mobile_val = normalized_val if id_type == "mobile" else None

        new_user = User(
            first_name=payload.first_name.strip(),
            surname=payload.surname.strip(),
            email=email_val,
            mobile=mobile_val,
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

    # Automatically create a pending MembershipRequest if one doesn't exist
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
    else:
        if target_family_id and not existing_req.family_id:
            existing_req.family_id = target_family_id
            existing_req.family_relation = target_relation
            await db.commit()

    return {
        "status": "success",
        "message": "User registered successfully.",
        "user_id": str(new_user.user_id)
    }


@router.post("/register/oauth")
async def register_oauth(
    payload: OAuthRegisterRequest,
    db: AsyncSession = Depends(get_db),
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    # This endpoint trusts the caller's `email` + `provider_id` outright — it's
    # meant to be called only by the Next.js server, after NextAuth has already
    # verified the OAuth handshake with Google/Yahoo. Without this check, anyone
    # could POST an arbitrary existing user's email here and walk away with a
    # valid access token for that account (see NextAuth's signIn callback for
    # the legitimate caller).
    if settings.INTERNAL_API_SECRET and x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized OAuth bridge call.",
        )

    # 1. Validate provider
    provider = payload.provider.strip().lower()
    if provider not in ["google", "yahoo"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth provider. Supported providers: google, yahoo."
        )

    email_val = payload.email.strip().lower()
    provider_id_val = payload.provider_id.strip()

    # 2. Check if user already exists by provider ID
    if provider == "google":
        user_result = await db.execute(select(User).where(User.google_id == provider_id_val))
    else:
        user_result = await db.execute(select(User).where(User.yahoo_id == provider_id_val))
    
    user = user_result.scalars().first()

    # 3. If not found by provider ID, check if user exists by email
    if not user:
        email_result = await db.execute(select(User).where(User.email == email_val))
        user = email_result.scalars().first()
        
        if user:
            # User exists by email, link their provider ID
            if provider == "google":
                # Check if someone else has this google_id
                alt_google = await db.execute(select(User).where(User.google_id == provider_id_val))
                if alt_google.scalars().first() is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This Google account is already linked to another user."
                    )
                user.google_id = provider_id_val
            else:
                alt_yahoo = await db.execute(select(User).where(User.yahoo_id == provider_id_val))
                if alt_yahoo.scalars().first() is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This Yahoo account is already linked to another user."
                    )
                user.yahoo_id = provider_id_val
            await db.commit()

    # 4. If still not found, create a new user
    if not user:
        if provider == "google":
            alt_google = await db.execute(select(User).where(User.google_id == provider_id_val))
            if alt_google.scalars().first() is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This Google account is already registered."
                )
            google_id_val = provider_id_val
            yahoo_id_val = None
        else:
            alt_yahoo = await db.execute(select(User).where(User.yahoo_id == provider_id_val))
            if alt_yahoo.scalars().first() is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This Yahoo account is already registered."
                )
            google_id_val = None
            yahoo_id_val = provider_id_val

        family_id_val = None
        relation_val = None
        if payload.family_code:
            fam_result = await db.execute(select(Family).where(Family.family_code == payload.family_code))
            family = fam_result.scalars().first()
            if not family:
                raise HTTPException(status_code=400, detail="Invalid Family Code.")
            family_id_val = family.family_id
            relation_val = payload.family_relation or "Member"

        user = User(
            first_name=payload.first_name.strip(),
            surname=payload.surname.strip(),
            email=email_val,
            mobile=None,
            password_hash=None,
            family_id=None,
            family_relation=None,
            role=UserRole.GUEST,
            is_active=True,
            is_member=False,
            google_id=google_id_val,
            yahoo_id=yahoo_id_val
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Automatically create a pending MembershipRequest if one doesn't exist
    req_check = await db.execute(select(MembershipRequest).where(MembershipRequest.user_id == user.user_id))
    existing_req = req_check.scalars().first()
    if not existing_req:
        new_m_request = MembershipRequest(
            user_id=user.user_id,
            family_id=family_id_val,
            family_relation=relation_val,
            message="Submitted automatically during OAuth registration."
        )
        db.add(new_m_request)
        await db.commit()
    else:
        if family_id_val and not existing_req.family_id:
            existing_req.family_id = family_id_val
            existing_req.family_relation = relation_val
            await db.commit()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account.",
        )

    # 5. Generate access token
    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role.value})
    
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.user_id),
        "role": user.role.value,
        "first_name": user.first_name,
        "surname": user.surname,
        "email": user.email,
    }

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    surname: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    profession: Optional[str] = None
    address: Optional[str] = None
    email_private: Optional[bool] = None
    mobile_private: Optional[bool] = None
    address_private: Optional[bool] = None
    profile_photo: Optional[str] = None

class ProfileResponse(BaseModel):
    first_name: str
    surname: str
    email: Optional[str]
    mobile: Optional[str]
    profession: Optional[str]
    address: Optional[str]
    email_private: bool
    mobile_private: bool
    address_private: bool
    family_id: Optional[uuid.UUID] = None
    profile_photo: Optional[str] = None
    is_member: bool
    role: str
    
    class Config:
        from_attributes = True

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=ProfileResponse)
async def update_my_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce validation: If the profession is NOT "student", mobile and email are compulsory.
    profession_val = payload.profession if payload.profession is not None else current_user.profession
    is_student = profession_val and profession_val.strip().lower() == "student"
    if not is_student:
        mobile_val = payload.mobile if payload.mobile is not None else current_user.mobile
        email_val = payload.email if payload.email is not None else current_user.email
        if not mobile_val or not email_val:
            raise HTTPException(status_code=400, detail="Mobile and Email are compulsory for non-students.")

    update_data = payload.dict(exclude_unset=True)

    # email/mobile are unique columns — check before committing so a collision
    # surfaces as a clean 400 instead of an unhandled IntegrityError (500).
    if update_data.get("email") and update_data["email"] != current_user.email:
        clash = await db.execute(
            select(User).where(User.email == update_data["email"], User.user_id != current_user.user_id)
        )
        if clash.scalars().first():
            raise HTTPException(status_code=400, detail="This email address is already in use.")

    if update_data.get("mobile") and update_data["mobile"] != current_user.mobile:
        clash = await db.execute(
            select(User).where(User.mobile == update_data["mobile"], User.user_id != current_user.user_id)
        )
        if clash.scalars().first():
            raise HTTPException(status_code=400, detail="This mobile number is already in use.")

    for key, value in update_data.items():
        setattr(current_user, key, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email or mobile number is already in use.")

    await db.refresh(current_user)
    return current_user
