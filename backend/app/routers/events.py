from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

from datetime import datetime as _dt

from app.dependencies import get_db, get_current_user, get_optional_current_user, is_admin_level
from app.models.user import User, UserRole
from app.models.event import (
    Event, EventRegistration, EventCategory, EventStatus, PaymentStatus,
    EventVisibility, EventPricingType, EventPaymentMode, EventPass
)
from app.models.receipt import ReceiptType
from app.services.whatsapp_service import generate_and_send_passes
from app.services.receipt_service import create_receipt


async def _issue_event_receipt(db, registration, *, is_offline, issuer=None):
    """Create a receipt for an event registration payment."""
    event = (await db.execute(select(Event).where(Event.event_id == registration.event_id))).scalar_one_or_none()
    payer = None
    if registration.user_id:
        payer = (await db.execute(select(User).where(User.user_id == registration.user_id))).scalar_one_or_none()
    payer_name = (f"{payer.first_name} {payer.surname}" if payer else (registration.guest_name or "Guest"))
    mode = registration.payment_mode.value if hasattr(registration.payment_mode, "value") else str(registration.payment_mode or "")
    return await create_receipt(
        db,
        receipt_type=ReceiptType.EVENT,
        amount=float(registration.total_amount),
        payer_name=payer_name,
        payment_mode=mode,
        is_offline=is_offline,
        description=f"Event booking: {event.title if event else 'Event'}",
        registration_id=registration.registration_id,
        user_id=registration.user_id,
        issued_by=issuer.user_id if issuer else None,
        issued_by_name=(f"{issuer.first_name} {issuer.surname}" if issuer else None),
        extra_rows=[
            ("Event", event.title if event else "-"),
            ("Passes", registration.pass_count),
        ],
    )

router = APIRouter(prefix="/api/v1/events", tags=["Events"])

# Schemas
class EventCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    venue: Optional[str] = None
    category: EventCategory = EventCategory.OTHER
    start_datetime: datetime
    end_datetime: datetime
    pass_price: float = 0.0
    total_passes: Optional[int] = None
    max_per_user: int = 5
    visibility: EventVisibility = EventVisibility.OPEN_TO_ALL
    pricing_type: EventPricingType = EventPricingType.FREE
    timeline: Optional[list] = None

class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    venue: Optional[str] = None
    category: Optional[EventCategory] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    pass_price: Optional[float] = None
    total_passes: Optional[int] = None
    max_per_user: Optional[int] = None
    visibility: Optional[EventVisibility] = None
    pricing_type: Optional[EventPricingType] = None
    timeline: Optional[list] = None

class EventResponse(BaseModel):
    event_id: uuid.UUID
    title: str
    description: Optional[str]
    venue: Optional[str]
    category: EventCategory
    start_datetime: datetime
    end_datetime: datetime
    pass_price: float
    total_passes: Optional[int]
    passes_sold: int
    max_per_user: int
    status: EventStatus
    is_featured: bool
    visibility: EventVisibility
    pricing_type: EventPricingType
    timeline: Optional[list]

    class Config:
        from_attributes = True
        use_enum_values = True

class EventRegistrationRequest(BaseModel):
    pass_count: int = Field(default=1, gt=0)
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_email: Optional[str] = None
    payment_mode: Optional[EventPaymentMode] = None

class PaymentVerifyRequest(BaseModel):
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

# Routes
@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can create events")

    new_event = Event(
        created_by=current_user.user_id,
        title=event_data.title,
        description=event_data.description,
        venue=event_data.venue,
        category=event_data.category,
        start_datetime=event_data.start_datetime,
        end_datetime=event_data.end_datetime,
        pass_price=event_data.pass_price,
        total_passes=event_data.total_passes,
        max_per_user=event_data.max_per_user,
        visibility=event_data.visibility,
        pricing_type=event_data.pricing_type,
        timeline=event_data.timeline,
        status=EventStatus.UPCOMING
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    return new_event

@router.get("/", response_model=List[EventResponse])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).order_by(Event.start_datetime))
    return result.scalars().all()

@router.get("/my-registrations")
async def get_my_registrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Join with Event to get event details
    result = await db.execute(
        select(EventRegistration, Event)
        .join(Event, EventRegistration.event_id == Event.event_id)
        .filter(EventRegistration.user_id == current_user.user_id)
        .order_by(Event.start_datetime.desc())
    )
    
    registrations = []
    for reg, event in result.all():
        # Fetch passes for this registration
        pass_res = await db.execute(
            select(EventPass).filter(EventPass.registration_id == reg.registration_id)
        )
        passes = pass_res.scalars().all()
        passes_data = [{
            "pass_id": str(p.pass_id),
            "qr_image_url": p.qr_image_url,
            "status": p.status
        } for p in passes]

        registrations.append({
            "registration_id": reg.registration_id,
            "pass_count": reg.pass_count,
            "total_amount": reg.total_amount,
            "payment_status": reg.payment_status,
            "event_title": event.title,
            "event_start": event.start_datetime,
            "event_venue": event.venue,
            "passes": passes_data
        })
        
    return registrations

@router.get("/registrations/all")
async def get_all_registrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can view all registrations")

    result = await db.execute(
        select(EventRegistration, Event, User)
        .join(Event, EventRegistration.event_id == Event.event_id)
        .outerjoin(User, EventRegistration.user_id == User.user_id)
        .order_by(EventRegistration.created_at.desc())
    )
    
    registrations = []
    for reg, event, user in result.all():
        registrations.append({
            "registration_id": reg.registration_id,
            "pass_count": reg.pass_count,
            "total_amount": reg.total_amount,
            "payment_status": reg.payment_status,
            "payment_mode": reg.payment_mode,
            "event_title": event.title,
            "event_start": event.start_datetime,
            "user_name": f"{user.first_name} {user.surname}" if user else reg.guest_name,
            "user_email": user.email if user else reg.guest_email,
            "user_mobile": user.mobile if user else reg.guest_phone,
            "created_at": reg.created_at
        })
        
    return registrations

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).filter(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.post("/{event_id}/register", status_code=status.HTTP_201_CREATED)
async def register_event(
    event_id: uuid.UUID,
    reg_data: EventRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Fetch event
    result = await db.execute(select(Event).filter(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.status != EventStatus.UPCOMING:
        raise HTTPException(status_code=400, detail="Registration is closed for this event")
        
    if event.total_passes and (event.passes_sold + reg_data.pass_count > event.total_passes):
        raise HTTPException(status_code=400, detail="Not enough passes available")

    # 1. Visibility Check
    if event.visibility == EventVisibility.MEMBERS_ONLY:
        if not current_user:
            raise HTTPException(status_code=401, detail="This event is for members only. Please log in.")
    else:
        if not current_user and not (reg_data.guest_name and reg_data.guest_phone and reg_data.guest_email):
            raise HTTPException(status_code=400, detail="Guest name, phone, and email are required for non-logged in users")

    user_id = current_user.user_id if current_user else None

    # 2. Pricing & Payment Logic
    payment_status = PaymentStatus.PENDING
    payment_mode = None
    total_amount = float(event.pass_price) * reg_data.pass_count

    if event.pricing_type == EventPricingType.FREE:
        payment_status = PaymentStatus.NOT_APPLICABLE
        payment_mode = None
        total_amount = 0.0
    else:
        if not reg_data.payment_mode:
            raise HTTPException(status_code=400, detail="Payment mode is required for paid events")
            
        payment_mode = reg_data.payment_mode
        
        if payment_mode == EventPaymentMode.PAY_AT_VENUE:
            payment_status = PaymentStatus.PENDING
        elif payment_mode == EventPaymentMode.PAY_ONLINE:
            payment_status = PaymentStatus.PENDING

    # Store entered contact details, or fallback to current user's profile details
    guest_name = reg_data.guest_name or (f"{current_user.first_name} {current_user.surname}" if current_user else None)
    guest_phone = reg_data.guest_phone or (current_user.mobile if current_user else None)
    guest_email = reg_data.guest_email or (current_user.email if current_user else None)

    registration = EventRegistration(
        user_id=user_id,
        guest_name=guest_name,
        guest_phone=guest_phone,
        guest_email=guest_email,
        event_id=event.event_id,
        pass_count=reg_data.pass_count,
        total_amount=total_amount,
        payment_mode=payment_mode,
        payment_status=payment_status,
        qr_delivered=False
    )
    
    event.passes_sold += reg_data.pass_count
    
    db.add(registration)
    await db.commit()
    await db.refresh(registration)
    
    if payment_status == PaymentStatus.NOT_APPLICABLE:
        background_tasks.add_task(generate_and_send_passes, registration.registration_id)
    
    response = {
        "status": "success", 
        "message": "Successfully registered", 
        "registration_id": registration.registration_id,
        "payment_status": payment_status,
        "payment_mode": payment_mode
    }
    
    # Simulate Razorpay order if online
    if payment_mode == EventPaymentMode.PAY_ONLINE:
        response["razorpay_order_id"] = f"order_dummy_{uuid.uuid4().hex[:8]}"
        registration.razorpay_order_id = response["razorpay_order_id"]
        await db.commit()

    return response

@router.post("/{registration_id}/verify-payment")
async def verify_registration_payment(
    registration_id: uuid.UUID,
    verify_data: PaymentVerifyRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(EventRegistration).filter(EventRegistration.registration_id == registration_id))
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration booking not found")

    if registration.payment_status == PaymentStatus.VERIFIED:
        return {"status": "success", "message": "Payment already verified", "registration_id": registration_id}

    registration.payment_status = PaymentStatus.VERIFIED
    if verify_data.razorpay_payment_id:
        registration.razorpay_payment_id = verify_data.razorpay_payment_id

    await db.commit()

    # Issue an online receipt
    receipt = await _issue_event_receipt(db, registration, is_offline=False)

    # Trigger tickets QR delivery on WhatsApp
    background_tasks.add_task(generate_and_send_passes, registration.registration_id)

    return {
        "status": "success",
        "message": "Payment successfully verified and passes delivery triggered",
        "registration_id": registration_id,
        "receipt_number": receipt.receipt_number,
        "receipt_url": receipt.pdf_url,
    }



@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    event_data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can update events")

    result = await db.execute(select(Event).filter(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = event_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    await db.commit()
    await db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can delete events")

    result = await db.execute(select(Event).filter(Event.event_id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()



@router.get("/admin/events/{event_id}/bookings")
async def get_event_bookings(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can view bookings")

    result = await db.execute(
        select(EventRegistration, User)
        .outerjoin(User, EventRegistration.user_id == User.user_id)
        .filter(EventRegistration.event_id == event_id)
        .order_by(EventRegistration.created_at.desc())
    )
    
    bookings = []
    for reg, user in result.all():
        bookings.append({
            "registration_id": reg.registration_id,
            "name": f"{user.first_name} {user.surname}" if user else reg.guest_name,
            "phone": user.mobile if user else reg.guest_phone,
            "email": user.email if user else reg.guest_email,
            "pass_count": reg.pass_count,
            "payment_mode": reg.payment_mode,
            "payment_status": reg.payment_status,
            "amount": reg.total_amount,
            "created_at": reg.created_at
        })
    return bookings
@router.post("/admin/bookings/{booking_id}/mark-paid")
async def mark_booking_paid(
    booking_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can modify bookings")

    result = await db.execute(select(EventRegistration).filter(EventRegistration.registration_id == booking_id))
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Booking not found")

    if registration.payment_mode != EventPaymentMode.PAY_AT_VENUE:
        raise HTTPException(status_code=400, detail="Only PAY_AT_VENUE bookings can be manually marked as paid")

    if registration.payment_status == PaymentStatus.VERIFIED:
        return {"status": "success", "message": "Already verified"}

    registration.payment_status = PaymentStatus.VERIFIED
    # Record the approving admin (approver) for this cash / at-venue payment
    registration.approved_by = current_user.user_id
    registration.approved_at = _dt.utcnow()
    await db.commit()

    # Generate offline receipt now that the admin has approved the cash payment
    receipt = await _issue_event_receipt(db, registration, is_offline=True, issuer=current_user)

    background_tasks.add_task(generate_and_send_passes, registration.registration_id)

    return {
        "status": "success",
        "message": "Booking marked as paid and ticket generated",
        "receipt_number": receipt.receipt_number,
        "receipt_url": receipt.pdf_url,
    }

@router.post("/admin/bookings/{booking_id}/resend-qr")
async def resend_booking_qr(
    booking_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Only admins can resend tickets")

    result = await db.execute(select(EventRegistration).filter(EventRegistration.registration_id == booking_id))
    registration = result.scalar_one_or_none()
    if not registration:
        raise HTTPException(status_code=404, detail="Booking not found")

    if registration.payment_status not in [PaymentStatus.VERIFIED, PaymentStatus.PAID, PaymentStatus.NOT_APPLICABLE]:
        raise HTTPException(status_code=400, detail="Only verified, paid, or free bookings can have tickets resent")

    background_tasks.add_task(generate_and_send_passes, registration.registration_id, force=True)

    return {"status": "success", "message": "QR ticket resend triggered"}
