from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import date, datetime, timedelta
import uuid
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user, is_admin_level
from app.models.user import User, UserRole
from app.models.booking import (
    Room, Booking, BookingStatus, PaymentMode, PaymentStatus,
    RoomPricingRule, RoomBookingRule,
)
from app.models.receipt import ReceiptType
from app.services.receipt_service import create_receipt

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


# ───────────── Pricing / min-stay helpers ─────────────
async def _price_for_day(db: AsyncSession, room: Room, day: date) -> float:
    """Return the price for a single day, honouring active date-range pricing
    rules (highest priority wins), falling back to the room default."""
    result = await db.execute(
        select(RoomPricingRule)
        .where(
            RoomPricingRule.room_id == room.room_id,
            RoomPricingRule.is_active == True,  # noqa: E712
            RoomPricingRule.start_date <= day,
            RoomPricingRule.end_date >= day,
        )
        .order_by(RoomPricingRule.priority.desc())
    )
    rule = result.scalars().first()
    return float(rule.price_per_day) if rule else float(room.price_per_day)


async def _quote(db: AsyncSession, room: Room, start_date: date, end_date: date):
    """Compute total price across the stay and the per-day breakdown."""
    days = (end_date - start_date).days
    if days <= 0:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    total = 0.0
    breakdown = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        p = await _price_for_day(db, room, d)
        total += p
        breakdown.append({"date": d.isoformat(), "price": p})
    return total, days, breakdown


async def _enforce_min_stay(db: AsyncSession, room: Room, start_date: date, end_date: date):
    """Raise 400 if a min-stay rule overlaps the requested range and the booking
    is shorter than the required minimum."""
    days = (end_date - start_date).days
    result = await db.execute(
        select(RoomBookingRule).where(
            RoomBookingRule.is_active == True,  # noqa: E712
            ((RoomBookingRule.room_id == room.room_id) | (RoomBookingRule.room_id.is_(None))),
            RoomBookingRule.start_date <= end_date,
            RoomBookingRule.end_date >= start_date,
        )
    )
    for rule in result.scalars().all():
        if days < rule.min_days:
            label = f" ({rule.label})" if rule.label else ""
            raise HTTPException(
                status_code=400,
                detail=(
                    f"For dates between {rule.start_date.isoformat()} and "
                    f"{rule.end_date.isoformat()}{label}, a minimum stay of "
                    f"{rule.min_days} day(s) is required. You selected {days} day(s)."
                ),
            )

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
    if not is_admin_level(current_user):
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
    if not is_admin_level(current_user):
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
    if not is_admin_level(current_user):
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

    # Enforce minimum-stay rules for the requested window
    await _enforce_min_stay(db, room, booking_data.start_date, booking_data.end_date)

    # Dynamic, date-range aware pricing
    total_amount, days, _breakdown = await _quote(db, room, booking_data.start_date, booking_data.end_date)

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
    if not is_admin_level(current_user):
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
        
    if booking.user_id != current_user.user_id and not is_admin_level(current_user):
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
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Booking).filter(Booking.booking_id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.booking_status = BookingStatus.APPROVED
    booking.payment_status = PaymentStatus.PAID
    # Record the approving admin (approver) for cash / offline payments
    booking.approved_by = current_user.user_id
    booking.approved_at = datetime.utcnow()
    await db.commit()

    # Fetch payer for receipt
    user_result = await db.execute(select(User).where(User.user_id == booking.user_id))
    payer = user_result.scalar_one_or_none()
    room_result = await db.execute(select(Room).where(Room.room_id == booking.room_id))
    room = room_result.scalar_one_or_none()

    # Generate receipt now that the (offline) payment is approved
    receipt = await create_receipt(
        db,
        receipt_type=ReceiptType.BOOKING,
        amount=float(booking.total_amount),
        payer_name=f"{payer.first_name} {payer.surname}" if payer else "Guest",
        payment_mode=booking.payment_mode.value if hasattr(booking.payment_mode, "value") else str(booking.payment_mode),
        is_offline=(booking.payment_mode == PaymentMode.CASH),
        description=f"Bhavan booking: {room.name if room else 'Room'}",
        booking_id=booking.booking_id,
        user_id=booking.user_id,
        issued_by=current_user.user_id,
        issued_by_name=f"{current_user.first_name} {current_user.surname}",
        extra_rows=[
            ("Room", room.name if room else "-"),
            ("Check-in", booking.start_date.isoformat()),
            ("Check-out", booking.end_date.isoformat()),
        ],
    )
    return {
        "message": "Booking approved and marked as paid",
        "receipt_number": receipt.receipt_number,
        "receipt_url": receipt.pdf_url,
    }


class BookingPaymentVerify(BaseModel):
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


@router.post("/{booking_id}/verify-payment")
async def verify_booking_payment(
    booking_id: uuid.UUID,
    data: BookingPaymentVerify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm an ONLINE (razorpay) Bhavan booking payment and issue the receipt."""
    result = await db.execute(select(Booking).filter(Booking.booking_id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.user_id and not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    booking.payment_status = PaymentStatus.PAID
    booking.booking_status = BookingStatus.APPROVED
    if data.razorpay_payment_id:
        booking.razorpay_payment_id = data.razorpay_payment_id
    await db.commit()

    payer = (await db.execute(select(User).where(User.user_id == booking.user_id))).scalar_one_or_none()
    room = (await db.execute(select(Room).where(Room.room_id == booking.room_id))).scalar_one_or_none()
    receipt = await create_receipt(
        db,
        receipt_type=ReceiptType.BOOKING,
        amount=float(booking.total_amount),
        payer_name=f"{payer.first_name} {payer.surname}" if payer else "Guest",
        payment_mode=booking.payment_mode.value if hasattr(booking.payment_mode, "value") else str(booking.payment_mode),
        is_offline=False,
        description=f"Bhavan booking: {room.name if room else 'Room'}",
        booking_id=booking.booking_id,
        user_id=booking.user_id,
        extra_rows=[
            ("Room", room.name if room else "-"),
            ("Check-in", booking.start_date.isoformat()),
            ("Check-out", booking.end_date.isoformat()),
        ],
    )
    return {
        "status": "success",
        "receipt_number": receipt.receipt_number,
        "receipt_url": receipt.pdf_url,
    }


# ───────────────────────── Quote (price + min-stay preview) ─────────────────────────
class QuoteRequest(BaseModel):
    start_date: date
    end_date: date


@router.post("/rooms/{room_id}/quote")
async def quote_room(
    room_id: uuid.UUID,
    data: QuoteRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Room).filter(Room.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    # Surface min-stay violations as a soft warning rather than an error here
    min_stay_error = None
    try:
        await _enforce_min_stay(db, room, data.start_date, data.end_date)
    except HTTPException as e:
        min_stay_error = e.detail
    total, days, breakdown = await _quote(db, room, data.start_date, data.end_date)
    return {
        "room_id": room_id,
        "days": days,
        "total_amount": total,
        "default_price_per_day": float(room.price_per_day),
        "breakdown": breakdown,
        "min_stay_error": min_stay_error,
    }


# ───────────────────────── Pricing Rules (admin) ─────────────────────────
class PricingRuleCreate(BaseModel):
    label: Optional[str] = None
    start_date: date
    end_date: date
    price_per_day: float
    priority: int = 0
    is_active: bool = True


class PricingRuleResponse(BaseModel):
    rule_id: uuid.UUID
    room_id: uuid.UUID
    label: Optional[str]
    start_date: date
    end_date: date
    price_per_day: float
    priority: int
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/rooms/{room_id}/pricing-rules", response_model=List[PricingRuleResponse])
async def list_pricing_rules(room_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RoomPricingRule).where(RoomPricingRule.room_id == room_id).order_by(RoomPricingRule.start_date)
    )
    return result.scalars().all()


@router.post("/rooms/{room_id}/pricing-rules", response_model=PricingRuleResponse, status_code=201)
async def create_pricing_rule(
    room_id: uuid.UUID,
    data: PricingRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    room = (await db.execute(select(Room).where(Room.room_id == room_id))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    rule = RoomPricingRule(room_id=room_id, **data.dict())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/pricing-rules/{rule_id}", status_code=204)
async def delete_pricing_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    rule = (await db.execute(select(RoomPricingRule).where(RoomPricingRule.rule_id == rule_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    await db.delete(rule)
    await db.commit()


# ───────────────────────── Min-stay Booking Rules (admin) ─────────────────────────
class BookingRuleCreate(BaseModel):
    room_id: Optional[uuid.UUID] = None  # null = applies to all rooms
    label: Optional[str] = None
    start_date: date
    end_date: date
    min_days: int = Field(..., ge=1)
    is_active: bool = True


class BookingRuleResponse(BaseModel):
    rule_id: uuid.UUID
    room_id: Optional[uuid.UUID]
    label: Optional[str]
    start_date: date
    end_date: date
    min_days: int
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/booking-rules", response_model=List[BookingRuleResponse])
async def list_booking_rules(
    room_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RoomBookingRule).order_by(RoomBookingRule.start_date)
    if room_id is not None:
        stmt = stmt.where((RoomBookingRule.room_id == room_id) | (RoomBookingRule.room_id.is_(None)))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/booking-rules", response_model=BookingRuleResponse, status_code=201)
async def create_booking_rule(
    data: BookingRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    rule = RoomBookingRule(**data.dict())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/booking-rules/{rule_id}", status_code=204)
async def delete_booking_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    rule = (await db.execute(select(RoomBookingRule).where(RoomBookingRule.rule_id == rule_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Booking rule not found")
    await db.delete(rule)
    await db.commit()
