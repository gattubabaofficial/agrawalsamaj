from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta

from app.database import get_db
from app.schemas.all_schemas import UserCreate, UserResponse, Token, OTPRequest, OTPVerify
from app.models.all_models import User, UserSession
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.modules.auth.service import register_user_service, request_otp_service, verify_otp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/otp", status_code=status.HTTP_200_OK)
async def request_otp(payload: OTPRequest):
    otp = await request_otp_service(payload.email_or_phone)
    # In production we don't return the OTP in the API response, but for testing convenience:
    return {"message": "OTP sent successfully", "test_otp": otp}

@router.post("/verify-otp")
async def verify_otp(payload: OTPVerify):
    valid = await verify_otp_service(payload)
    return {"success": valid, "message": "OTP verified successfully"}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await register_user_service(db, payload)
    return user

@router.post("/login", response_model=Token)
async def login(payload: OTPVerify, db: AsyncSession = Depends(get_db)):
    # Verify OTP first
    await verify_otp_service(payload)
    
    # Retrieve user
    email_or_phone = payload.email_or_phone
    result = await db.execute(
        select(User).filter((User.phone == email_or_phone) | (User.email == email_or_phone))
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please register first."
        )
        
    if user.status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended."
        )

    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    # Save session
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(session)
    await db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = int(user_id_str)
    
    # Check if session exists in DB
    result = await db.execute(
        select(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.refresh_token == refresh_token
        )
    )
    session = result.scalars().first()
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")
        
    # Get user
    user_result = await db.execute(select(User).filter(User.id == user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Generate new tokens
    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)
    
    # Rotate session
    session.refresh_token = new_refresh_token
    session.expires_at = datetime.utcnow() + timedelta(days=30)
    await db.commit()
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user
    }

# Mock datetime import inside router file to resolve runtime reference
from datetime import datetime
