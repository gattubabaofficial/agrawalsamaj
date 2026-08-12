"""Bhavan OTP and verification token service.

Issues OTPs via WhatsApp/SMS for Bhavan enquiries and issues signed 15-minute
verification tokens bound to the applicant's mobile number.
"""

import random
from datetime import datetime, timedelta
from typing import Tuple

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import PhoneOTPRequest
from app.services.otp_delivery import send_otp_message
from app.utils.security import hash_password, verify_password, create_access_token


BHAVAN_OTP_PURPOSE = "bhavan_enquiry"


def request_bhavan_otp(db: Session, mobile: str) -> dict:
    """Generate and send OTP for Bhavan enquiry verification."""
    clean_mobile = mobile.strip()
    if not clean_mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is required.",
        )

    # Cooldown & rate limiting check
    existing = db.execute(
        select(PhoneOTPRequest).where(
            PhoneOTPRequest.phone == clean_mobile,
            PhoneOTPRequest.purpose == BHAVAN_OTP_PURPOSE,
        )
    ).scalar_one_or_none()

    now = datetime.utcnow()
    if existing and existing.created_at:
        seconds_since = (now - existing.created_at).total_seconds()
        if seconds_since < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(60 - seconds_since)} seconds before requesting another OTP.",
            )

    otp = f"{random.randint(100000, 999999)}"
    hashed_otp = hash_password(otp)
    expires_at = now + timedelta(minutes=10)

    if existing:
        existing.otp_hash = hashed_otp
        existing.expires_at = expires_at
        existing.attempts = 0
        existing.is_verified = False
        existing.created_at = now
    else:
        existing = PhoneOTPRequest(
            phone=clean_mobile,
            otp_hash=hashed_otp,
            purpose=BHAVAN_OTP_PURPOSE,
            expires_at=expires_at,
            attempts=0,
            is_verified=False,
            created_at=now,
        )
        db.add(existing)

    db.commit()

    # Deliver via WhatsApp/SMS
    channel, provider = send_otp_message(clean_mobile, otp, purpose=BHAVAN_OTP_PURPOSE)

    return {
        "message": f"OTP sent successfully via {channel.upper()}.",
        "channel": channel,
        "expires_in_seconds": 600,
    }


def verify_bhavan_otp(db: Session, mobile: str, otp: str) -> dict:
    """Verify OTP and return signed 15-minute verification token."""
    clean_mobile = mobile.strip()
    otp_code = otp.strip()

    otp_req = db.execute(
        select(PhoneOTPRequest).where(
            PhoneOTPRequest.phone == clean_mobile,
            PhoneOTPRequest.purpose == BHAVAN_OTP_PURPOSE,
        )
    ).scalar_one_or_none()

    if not otp_req:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP request found for this mobile number. Please request a new OTP.",
        )

    if otp_req.expires_at and datetime.utcnow() > otp_req.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP.",
        )

    if otp_req.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum verification attempts reached. Please request a new OTP.",
        )

    if not verify_password(otp_code, otp_req.otp_hash):
        otp_req.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {5 - otp_req.attempts} attempts remaining.",
        )

    otp_req.is_verified = True
    db.commit()

    # Mint 15-minute verification token
    verification_token = create_access_token(
        data={"sub": clean_mobile, "purpose": BHAVAN_OTP_PURPOSE},
        expires_delta=timedelta(minutes=15),
    )

    return {
        "verified": True,
        "verification_token": verification_token,
        "message": "Mobile number verified successfully.",
    }


def validate_enquiry_token(token: str, mobile: str) -> bool:
    """Validate that the token is valid, unexpired, and bound to this mobile number."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        purpose = payload.get("purpose")
        if purpose != BHAVAN_OTP_PURPOSE:
            return False
        if sub != mobile.strip():
            return False
        return True
    except JWTError:
        return False
