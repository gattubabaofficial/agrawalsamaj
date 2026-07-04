from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.event import PaymentStatus
from app.models.donation import Donation, DonationCategory

router = APIRouter(prefix="/api/v1/donations", tags=["Donations"])

# Schemas
class DonationCategoryResponse(BaseModel):
    category_id: uuid.UUID
    name: str
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class DonationCreate(BaseModel):
    category_id: uuid.UUID
    amount: float = Field(..., gt=0)
    message: Optional[str] = None

class GuestDonationCreate(BaseModel):
    category_id: uuid.UUID
    amount: float = Field(..., gt=0)
    message: Optional[str] = None
    guest_name: str
    guest_email: str
    guest_mobile: str

class DonationResponse(BaseModel):
    donation_id: uuid.UUID
    category_id: uuid.UUID
    amount: float
    payment_status: PaymentStatus
    message: Optional[str]
    donated_at: datetime
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_mobile: Optional[str] = None
    
    class Config:
        from_attributes = True

class AdminDonationResponse(DonationResponse):
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    user_mobile: Optional[str] = None
    user_email: Optional[str] = None
    category_name: str

# Routes
@router.get("/categories", response_model=List[DonationCategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DonationCategory).filter(DonationCategory.is_active == True))
    return result.scalars().all()

@router.post("/", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
async def create_donation(
    donation_data: DonationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify category
    result = await db.execute(select(DonationCategory).filter(DonationCategory.category_id == donation_data.category_id))
    category = result.scalar_one_or_none()
    if not category or not category.is_active:
        raise HTTPException(status_code=400, detail="Invalid donation category")
        
    # Mocking successful payment
    new_donation = Donation(
        user_id=current_user.user_id,
        category_id=category.category_id,
        amount=donation_data.amount,
        payment_status=PaymentStatus.PAID,
        message=donation_data.message
    )
    
    db.add(new_donation)
    await db.commit()
    await db.refresh(new_donation)
    return new_donation

@router.post("/guest", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
async def create_guest_donation(
    donation_data: GuestDonationCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DonationCategory).filter(DonationCategory.category_id == donation_data.category_id))
    category = result.scalar_one_or_none()
    if not category or not category.is_active:
        raise HTTPException(status_code=400, detail="Invalid donation category")
        
    new_donation = Donation(
        category_id=category.category_id,
        amount=donation_data.amount,
        payment_status=PaymentStatus.PAID,
        message=donation_data.message,
        guest_name=donation_data.guest_name,
        guest_email=donation_data.guest_email,
        guest_mobile=donation_data.guest_mobile
    )
    
    db.add(new_donation)
    await db.commit()
    await db.refresh(new_donation)
    return new_donation

@router.get("/", response_model=List[DonationResponse])
async def list_my_donations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Donation)
        .filter(Donation.user_id == current_user.user_id)
        .order_by(Donation.donated_at.desc())
    )
    return result.scalars().all()

@router.get("/all", response_model=List[AdminDonationResponse])
async def list_all_donations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(
        select(Donation, User, DonationCategory)
        .outerjoin(User, Donation.user_id == User.user_id)
        .join(DonationCategory, Donation.category_id == DonationCategory.category_id)
        .order_by(Donation.donated_at.desc())
    )
    
    donations_data = []
    for donation, user, category in result.all():
        data = {
            "donation_id": donation.donation_id,
            "category_id": donation.category_id,
            "amount": donation.amount,
            "payment_status": donation.payment_status,
            "message": donation.message,
            "donated_at": donation.donated_at,
            "guest_name": donation.guest_name,
            "guest_email": donation.guest_email,
            "guest_mobile": donation.guest_mobile,
            "category_name": category.name
        }
        if user:
            data["user_id"] = user.user_id
            data["user_name"] = f"{user.first_name} {user.surname}"
            data["user_mobile"] = user.mobile
            data["user_email"] = user.email
            
        donations_data.append(data)
        
    return donations_data
