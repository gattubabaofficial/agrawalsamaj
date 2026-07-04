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
    room_number: Optional[str]
    floor: Optional[str]
    description: Optional[str]
    amenities: Optional[dict]
    is_available: bool

    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    name: str
    type: str = "room"
    capacity: Optional[int] = None
    price_per_day: float
    room_number: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    amenities: Optional[dict] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    capacity: Optional[int] = None
    price_per_day: Optional[float] = None
    room_number: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    amenities: Optional[dict] = None
    is_available: Optional[bool] = None

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
        from_attributes = True

class AdminBookingResponse(BookingResponse):
    user_id: uuid.UUID
    user_name: str
    user_mobile: Optional[str]
    room_name: str

# Routes
@router.get("/rooms", response_model=List[RoomResponse])
async def list_rooms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).filter(Room.is_available == True))
    return result.scalars().all()

@router.get("/rooms/{room_id}", response_model=RoomResponse)
async def get_room(room_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).filter(Room.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    new_room = Room(**room_data.dict())
    db.add(new_room)
    await db.commit()
    await db.refresh(new_room)
    return new_room

@router.put("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: uuid.UUID,
    room_data: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Room).filter(Room.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    update_data = room_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(room, key, value)

    await db.commit()
    await db.refresh(room)
    return room

@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Room).filter(Room.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    await db.delete(room)
    await db.commit()


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

    payment_status = PaymentStatus.PENDING
    
    new_booking = Booking(
        user_id=current_user.user_id,
        room_id=room.room_id,
        start_date=booking_data.start_date,
        end_date=booking_data.end_date,
        total_amount=total_amount,
        payment_mode=booking_data.payment_mode,
        payment_status=payment_status,
        booking_status=BookingStatus.PENDING,
        notes=booking_data.notes
    )
    
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)
    
    response = BookingResponse.from_orm(new_booking).dict()
    
    if booking_data.payment_mode != PaymentMode.CASH:
        # Simulate razorpay online payment
        order_id = f"order_room_{uuid.uuid4().hex[:8]}"
        new_booking.razorpay_order_id = order_id
        await db.commit()
        response["razorpay_order_id"] = order_id
        
    return response

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

@router.get("/all", response_model=List[AdminBookingResponse])
async def list_all_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(
        select(Booking, User, Room)
        .join(User, Booking.user_id == User.user_id)
        .join(Room, Booking.room_id == Room.room_id)
        .order_by(Booking.start_date.desc())
    )
    
    bookings_data = []
    for booking, user, room in result.all():
        data = {
            "booking_id": booking.booking_id,
            "room_id": booking.room_id,
            "start_date": booking.start_date,
            "end_date": booking.end_date,
            "total_amount": booking.total_amount,
            "payment_mode": booking.payment_mode,
            "payment_status": booking.payment_status,
            "booking_status": booking.booking_status,
            "notes": booking.notes,
            "user_id": user.user_id,
            "user_name": f"{user.first_name} {user.surname}",
            "user_mobile": user.mobile,
            "room_name": room.name
        }
        bookings_data.append(data)
        
    return bookings_data

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

@router.post("/{booking_id}/approve")
async def approve_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Booking).filter(Booking.booking_id == booking_id))
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    booking.booking_status = BookingStatus.APPROVED
    booking.payment_status = PaymentStatus.PAID
    await db.commit()
    return {"message": "Booking approved and marked as paid"}
