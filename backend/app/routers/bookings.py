from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import date
import uuid
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.booking import Room, Booking, BookingStatus, PaymentMode, PaymentStatus

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])

# Schemas
class RoomResponse(BaseModel):
    room_id: uuid.UUID
    name: str
    type: str
    capacity: Optional[int]
    price_per_day: float
    description: Optional[str]
    is_available: bool

    class Config:
        orm_mode = True

class BookingCreate(BaseModel):
    room_id: uuid.UUID
    start_date: date
    end_date: date
    payment_mode: PaymentMode = PaymentMode.UPI
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    booking_id: uuid.UUID
    room_id: uuid.UUID
    start_date: date
    end_date: date
    total_amount: float
    payment_mode: PaymentMode
    payment_status: PaymentStatus
    booking_status: BookingStatus
    notes: Optional[str]
    
    class Config:
        orm_mode = True

# Routes
@router.get("/rooms", response_model=List[RoomResponse])
async def list_rooms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).filter(Room.is_available == True))
    return result.scalars().all()

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch room
    result = await db.execute(select(Room).filter(Room.room_id == booking_data.room_id))
    room = result.scalar_one_or_none()
    if not room or not room.is_available:
        raise HTTPException(status_code=400, detail="Room not available")
    
    # Calculate days
    days = (booking_data.end_date - booking_data.start_date).days
    if days <= 0:
        raise HTTPException(status_code=400, detail="End date must be after start date")
        
    total_amount = float(room.price_per_day) * days

    # Creating booking with SUCCESSFUL mock payment automatically based on user instruction
    new_booking = Booking(
        user_id=current_user.user_id,
        room_id=room.room_id,
        start_date=booking_data.start_date,
        end_date=booking_data.end_date,
        total_amount=total_amount,
        payment_mode=booking_data.payment_mode,
        payment_status=PaymentStatus.PAID,
        booking_status=BookingStatus.APPROVED,
        notes=booking_data.notes
    )
    
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)
    return new_booking

@router.get("/", response_model=List[BookingResponse])
async def list_my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Booking)
        .filter(Booking.user_id == current_user.user_id)
        .order_by(Booking.start_date.desc())
    )
    return result.scalars().all()

@router.put("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Booking).filter(Booking.booking_id == booking_id))
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.user_id != current_user.user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if booking.booking_status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")
        
    booking.booking_status = BookingStatus.CANCELLED
    await db.commit()
    return {"message": "Booking cancelled successfully"}
