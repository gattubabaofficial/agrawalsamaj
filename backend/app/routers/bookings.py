from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import date, datetime, timedelta
from pathlib import Path
import asyncio
import uuid
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user, get_optional_current_user, is_admin_level
from app.models.user import User, UserRole
from app.models.booking import (
    Room, Booking, BookingStatus, PaymentMode, PaymentStatus,
    RoomPricingRule, RoomBookingRule,
    SpecialEvent, SpecialEventDateRange, SpecialEventRoomConfig,
)
from app.models.receipt import Receipt, ReceiptType
from app.services.receipt_service import create_receipt
from app.services.whatsapp_service import send_whatsapp_document
from app.services.voucher_service import apply_voucher, redeem_voucher

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


async def _deliver_booking_receipt_whatsapp(receipt: Receipt, phone: Optional[str], room_name: str, amount: float):
    """Send the receipt PDF to the booker's WhatsApp number, if we have one."""
    if not phone or not receipt.pdf_url:
        return
    file_path = Path("static/receipts") / f"{receipt.receipt_number}.pdf"
    await asyncio.to_thread(
        send_whatsapp_document,
        to_number=phone,
        file_path=file_path,
        caption=(
            f"🧾 *Agrawal Samaj Mansrovar Jaipur Bhavan Booking*\n\n"
            f"Your receipt for {room_name} (₹{amount:,.2f}) is attached. Thank you!"
        ),
        filename=f"{receipt.receipt_number}.pdf",
    )


# ───────────── Pricing / min-stay / availability helpers ─────────────
async def _event_config_for_day(db: AsyncSession, room: Room, day: date):
    """Return the (SpecialEventRoomConfig, SpecialEvent) applying to this room on
    this single day, i.e. the highest-priority active event with a date range
    covering `day` and a config row for this room. None if no event applies."""
    result = await db.execute(
        select(SpecialEventRoomConfig, SpecialEvent)
        .join(SpecialEvent, SpecialEventRoomConfig.event_id == SpecialEvent.event_id)
        .join(SpecialEventDateRange, SpecialEventDateRange.event_id == SpecialEvent.event_id)
        .where(
            SpecialEventRoomConfig.room_id == room.room_id,
            SpecialEvent.is_active == True,  # noqa: E712
            SpecialEventDateRange.start_date <= day,
            SpecialEventDateRange.end_date >= day,
        )
        .order_by(SpecialEvent.priority.desc())
    )
    return result.first()


async def _price_for_day(db: AsyncSession, room: Room, day: date) -> float:
    """Return the price for a single day. Precedence: active special-event price
    (if the event's config for this room sets one) > date-range pricing rule
    (highest priority wins) > the room's default price_per_day."""
    event_row = await _event_config_for_day(db, room, day)
    if event_row and event_row[0].special_price_per_day is not None:
        return float(event_row[0].special_price_per_day)

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
    """Compute total price across the stay and the per-day breakdown. Nights
    that fall inside an active special event are automatically priced at the
    event rate, nights outside it at the normal rate — so bookings straddling
    both are split correctly without any extra logic here."""
    days = (end_date - start_date).days
    if days <= 0:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    total = 0.0
    breakdown = []
    event_name = None
    for i in range(days):
        d = start_date + timedelta(days=i)
        p = await _price_for_day(db, room, d)
        total += p
        event_row = await _event_config_for_day(db, room, d)
        day_event_name = event_row[1].name if event_row else None
        if day_event_name:
            event_name = day_event_name
        breakdown.append({"date": d.isoformat(), "price": p, "event_name": day_event_name})
    return total, days, breakdown, event_name


async def _stay_violations(db: AsyncSession, room: Room, start_date: date, end_date: date) -> List[str]:
    """Collect every min-stay/max-stay violation message for the requested range,
    from both the existing RoomBookingRule (min-stay only) and any overlapping
    special-event's per-room min/max stay configuration. Empty list = no violations."""
    days = (end_date - start_date).days
    violations: List[str] = []

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
            violations.append(
                f"For dates between {rule.start_date.isoformat()} and "
                f"{rule.end_date.isoformat()}{label}, a minimum stay of "
                f"{rule.min_days} day(s) is required. You selected {days} day(s)."
            )

    event_result = await db.execute(
        select(SpecialEventRoomConfig, SpecialEvent)
        .join(SpecialEvent, SpecialEventRoomConfig.event_id == SpecialEvent.event_id)
        .join(SpecialEventDateRange, SpecialEventDateRange.event_id == SpecialEvent.event_id)
        .where(
            SpecialEventRoomConfig.room_id == room.room_id,
            SpecialEvent.is_active == True,  # noqa: E712
            SpecialEventDateRange.start_date < end_date,
            SpecialEventDateRange.end_date >= start_date,
        )
    )
    for config, event in event_result.all():
        if config.min_days is not None and days < config.min_days:
            violations.append(
                f"'{event.name}' requires a minimum stay of {config.min_days} "
                f"day(s). You selected {days} day(s)."
            )
        if config.max_days is not None and days > config.max_days:
            violations.append(
                f"'{event.name}' allows a maximum stay of {config.max_days} "
                f"day(s). You selected {days} day(s)."
            )
    return violations


async def _enforce_min_stay(db: AsyncSession, room: Room, start_date: date, end_date: date):
    """Raise 400 with the first stay-rule violation, if any. Hard gate used by
    booking creation; `_stay_violations` above is used where a soft/full list is wanted."""
    violations = await _stay_violations(db, room, start_date, end_date)
    if violations:
        raise HTTPException(status_code=400, detail=violations[0])


async def _check_room_available(
    db: AsyncSession,
    room: Room,
    start_date: date,
    end_date: date,
    exclude_booking_id: Optional[uuid.UUID] = None,
):
    """Backend-authoritative availability check for the given stay window.
    Returns (available: bool, reason: Optional[str], event_name: Optional[str]).
    Checked: (1) an overlapping existing PENDING/APPROVED booking for this room
    (no overbooking), (2) the room explicitly marked unavailable by an active
    special event, (3) the room not in an active event's allow-list when that
    event restricts bookings to selected rooms only."""
    # (1) Double-booking: bookings are [start_date, end_date) stay intervals.
    booking_q = select(Booking).where(
        Booking.room_id == room.room_id,
        Booking.booking_status.in_([BookingStatus.PENDING, BookingStatus.APPROVED]),
        Booking.start_date < end_date,
        Booking.end_date > start_date,
    )
    if exclude_booking_id is not None:
        booking_q = booking_q.where(Booking.booking_id != exclude_booking_id)
    if (await db.execute(booking_q)).scalars().first():
        return False, "These dates are already booked for this room.", None

    # (2) Explicitly blocked for this room during an overlapping active event.
    blocked_result = await db.execute(
        select(SpecialEvent)
        .join(SpecialEventDateRange, SpecialEventDateRange.event_id == SpecialEvent.event_id)
        .join(
            SpecialEventRoomConfig,
            (SpecialEventRoomConfig.event_id == SpecialEvent.event_id)
            & (SpecialEventRoomConfig.room_id == room.room_id),
        )
        .where(
            SpecialEvent.is_active == True,  # noqa: E712
            SpecialEventDateRange.start_date < end_date,
            SpecialEventDateRange.end_date >= start_date,
            SpecialEventRoomConfig.is_available == False,  # noqa: E712
        )
    )
    blocked_event = blocked_result.scalars().first()
    if blocked_event:
        return False, f"Not available during '{blocked_event.name}'.", blocked_event.name

    # (3) Event restricts bookings to selected rooms only, and this room isn't one of them.
    allowlist_result = await db.execute(
        select(SpecialEvent)
        .join(SpecialEventDateRange, SpecialEventDateRange.event_id == SpecialEvent.event_id)
        .where(
            SpecialEvent.is_active == True,  # noqa: E712
            SpecialEvent.block_unlisted_rooms == True,  # noqa: E712
            SpecialEventDateRange.start_date < end_date,
            SpecialEventDateRange.end_date >= start_date,
            ~SpecialEvent.room_configs.any(SpecialEventRoomConfig.room_id == room.room_id),
        )
    )
    allowlist_event = allowlist_result.scalars().first()
    if allowlist_event:
        return False, f"Not available during '{allowlist_event.name}'.", allowlist_event.name

    return True, None, None

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
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    voucher_code: Optional[str] = None

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
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    voucher_code: Optional[str] = None
    discount_amount: Optional[float] = None

    class Config:
        from_attributes = True

class AdminBookingResponse(BookingResponse):
    user_id: Optional[uuid.UUID]
    user_name: str
    user_mobile: Optional[str]
    room_name: str
    approved_by_name: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_url: Optional[str] = None

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
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Fetch room
    result = await db.execute(select(Room).filter(Room.room_id == booking_data.room_id))
    room = result.scalar_one_or_none()
    if not room or not room.is_available:
        raise HTTPException(status_code=400, detail="Room not available")

    if not current_user and not (booking_data.guest_name and booking_data.guest_phone):
        raise HTTPException(status_code=400, detail="Guest name and WhatsApp number are required for non-logged in users")

    # Enforce minimum/maximum-stay rules for the requested window (normal + event)
    await _enforce_min_stay(db, room, booking_data.start_date, booking_data.end_date)

    # Dynamic, date-range and special-event aware pricing
    total_amount, days, _breakdown, _event_name = await _quote(db, room, booking_data.start_date, booking_data.end_date)

    # Voucher, if provided — validated fresh here so a stale/expired code
    # can't slip through even if the frontend's earlier preview allowed it.
    voucher = None
    discount_amount = None
    if booking_data.voucher_code:
        voucher, discount_amount, voucher_err = await apply_voucher(db, booking_data.voucher_code, total_amount, "booking")
        if voucher_err:
            raise HTTPException(status_code=400, detail=voucher_err)
        total_amount = round(total_amount - discount_amount, 2)

    payment_status = PaymentStatus.PENDING

    # Store entered contact details, or fall back to the logged-in user's profile
    guest_name = booking_data.guest_name or (f"{current_user.first_name} {current_user.surname}" if current_user else None)
    guest_phone = booking_data.guest_phone or (current_user.mobile if current_user else None)

    # Final backend-authoritative availability gate, run as late as possible
    # (right before the row is created) to minimize the check-then-insert window.
    # Never trust the frontend's earlier availability display.
    available, block_reason, _blocking_event = await _check_room_available(
        db, room, booking_data.start_date, booking_data.end_date
    )
    if not available:
        raise HTTPException(status_code=400, detail=block_reason)

    new_booking = Booking(
        user_id=current_user.user_id if current_user else None,
        guest_name=guest_name,
        guest_phone=guest_phone,
        room_id=room.room_id,
        start_date=booking_data.start_date,
        end_date=booking_data.end_date,
        total_amount=total_amount,
        payment_mode=booking_data.payment_mode,
        payment_status=payment_status,
        booking_status=BookingStatus.PENDING,
        notes=booking_data.notes,
        voucher_code=voucher.code if voucher else None,
        discount_amount=discount_amount,
    )

    db.add(new_booking)
    if voucher:
        redeem_voucher(voucher)
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
        .outerjoin(User, Booking.user_id == User.user_id)
        .join(Room, Booking.room_id == Room.room_id)
        .order_by(Booking.start_date.desc())
    )

    all_rows = result.all()
    if not all_rows:
        return []

    # Fetch all receipts linked to these bookings
    booking_ids = [b.booking_id for b, _, _ in all_rows]
    receipts_result = await db.execute(
        select(Receipt).where(Receipt.booking_id.in_(booking_ids))
    )
    receipts_by_booking = {r.booking_id: r for r in receipts_result.scalars().all()}

    # Fetch approving users
    approver_ids = [b.approved_by for b, _, _ in all_rows if b.approved_by]
    approvers_by_id = {}
    if approver_ids:
        approvers_result = await db.execute(select(User).where(User.user_id.in_(approver_ids)))
        approvers_by_id = {u.user_id: f"{u.first_name} {u.surname}" for u in approvers_result.scalars().all()}

    bookings_data = []
    for booking, user, room in all_rows:
        receipt = receipts_by_booking.get(booking.booking_id)
        approver_name = approvers_by_id.get(booking.approved_by) if booking.approved_by else (receipt.issued_by_name if receipt else None)

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
            "guest_name": booking.guest_name,
            "guest_phone": booking.guest_phone,
            "user_id": user.user_id if user else None,
            "user_name": f"{user.first_name} {user.surname}" if user else (booking.guest_name or "Guest"),
            "user_mobile": user.mobile if user else booking.guest_phone,
            "room_name": room.name,
            "approved_by_name": approver_name,
            "receipt_number": receipt.receipt_number if receipt else None,
            "receipt_url": receipt.pdf_url if receipt else None,
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
    background_tasks: BackgroundTasks,
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
    payer = None
    if booking.user_id:
        user_result = await db.execute(select(User).where(User.user_id == booking.user_id))
        payer = user_result.scalar_one_or_none()
    room_result = await db.execute(select(Room).where(Room.room_id == booking.room_id))
    room = room_result.scalar_one_or_none()

    # Generate receipt now that the (offline) payment is approved
    receipt = await create_receipt(
        db,
        receipt_type=ReceiptType.BOOKING,
        amount=float(booking.total_amount),
        payer_name=f"{payer.first_name} {payer.surname}" if payer else (booking.guest_name or "Guest"),
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

    background_tasks.add_task(
        _deliver_booking_receipt_whatsapp,
        receipt, booking.guest_phone, room.name if room else "your booking", float(booking.total_amount),
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Confirm an ONLINE (razorpay) Bhavan booking payment and issue the receipt."""
    result = await db.execute(select(Booking).filter(Booking.booking_id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Guest bookings (user_id is None) have no account to authenticate as, so
    # this call is trusted the same way the guest event-pass flow is: only the
    # unguessable booking_id gates it. Logged-in bookings still require the
    # owner or an admin.
    if booking.user_id is not None:
        if not current_user or (booking.user_id != current_user.user_id and not is_admin_level(current_user)):
            raise HTTPException(status_code=403, detail="Not authorized")

    booking.payment_status = PaymentStatus.PAID
    booking.booking_status = BookingStatus.APPROVED
    if data.razorpay_payment_id:
        booking.razorpay_payment_id = data.razorpay_payment_id
    await db.commit()

    payer = None
    if booking.user_id:
        payer = (await db.execute(select(User).where(User.user_id == booking.user_id))).scalar_one_or_none()
    room = (await db.execute(select(Room).where(Room.room_id == booking.room_id))).scalar_one_or_none()
    receipt = await create_receipt(
        db,
        receipt_type=ReceiptType.BOOKING,
        amount=float(booking.total_amount),
        payer_name=f"{payer.first_name} {payer.surname}" if payer else (booking.guest_name or "Guest"),
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

    background_tasks.add_task(
        _deliver_booking_receipt_whatsapp,
        receipt, booking.guest_phone, room.name if room else "your booking", float(booking.total_amount),
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

    # Surface stay-rule violations and availability as soft warnings/flags here
    # rather than hard errors — the frontend decides how to present them, and
    # create_booking() re-enforces everything for real regardless.
    stay_errors = await _stay_violations(db, room, data.start_date, data.end_date)
    dynamically_available, blocked_reason, blocking_event_name = await _check_room_available(
        db, room, data.start_date, data.end_date
    )
    full = not dynamically_available and blocking_event_name is None
    available = dynamically_available and room.is_available

    total, days, breakdown, event_name = await _quote(db, room, data.start_date, data.end_date)
    return {
        "room_id": room_id,
        "days": days,
        "total_amount": total,
        "default_price_per_day": float(room.price_per_day),
        "breakdown": breakdown,
        "event_name": event_name,
        "available": available,
        "full": full,
        "blocked_reason": blocked_reason if not full else None,
        "min_stay_error": stay_errors[0] if stay_errors else None,
        "stay_errors": stay_errors,
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
