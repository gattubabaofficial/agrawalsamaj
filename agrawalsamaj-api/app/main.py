from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import socketio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import logging
from app.config import settings
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models.all_models import User, Family, Booking, Event, Donation, ChatGroup, Payment, Refund, Address, EventRegistration
from app.schemas.all_schemas import UserResponse, BookingResponse, BookingCreate, EventResponse, DonationResponse, DonationCreate, EventCreate, AddressUpdate, EventRegistrationCreate, EventRegistrationResponse, PaymentResponse, PaymentVerifyRequest
from sqlalchemy import func
from app.modules.auth.router import router as auth_router

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to '*' for ease of Hostycare development; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Router
app.include_router(auth_router, prefix=settings.API_V1_STR)

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# ==============================================================================
# MOCK / STUB ENDPOINTS FOR MEMBERS DIRECTORY & APPROVALS (PHASE 3)
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/members", response_model=List[UserResponse])
async def search_members(
        name: Optional[str] = None,
        colony: Optional[str] = None,
        area: Optional[str] = None,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Only approved Samaj Members can search members directory
    if current_user.role != "ADMIN" and current_user.role != "MEMBER":
        raise HTTPException(status_code=403, detail="Access restricted to Samaj Members only")

    query = select(User).options(selectinload(User.address))
    
    if current_user.role != "ADMIN":
        query = query.filter(
            User.role == "MEMBER",
            User.status == "APPROVED"
        )
    else:
        # Admin can see all users except other admins (or can see everyone)
        query = query.filter(User.role != "ADMIN")

    if name:
        query = query.filter(User.first_name.ilike(f"%{name}%") | User.last_name.ilike(f"%{name}%"))

    result = await db.execute(query)
    return result.scalars().all()

@app.post(f"{settings.API_V1_STR}/members/approve/{{samaj_id}}")
async def approve_member(
        samaj_id: str,
        role: str = "MEMBER",  # MEMBER (Samaj Member) or USER (Outsider)
        db: AsyncSession = Depends(get_db),
        admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    result = await db.execute(select(User).filter(User.samaj_id == samaj_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Classify Role:
    # Samaj Member = MEMBER (details shown in directory)
    # Outside User = USER (cannot access directory/member groups, but retains account)
    user.role = role
    user.status = "APPROVED"

    user.approval_status = "APPROVED"

    await db.commit()
    return {"message": f"User approved successfully as {role}"}

@app.post(f"{settings.API_V1_STR}/members/apply")
async def apply_membership(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.status == "PENDING" or current_user.status == "APPROVED":
        raise HTTPException(status_code=400, detail="Already applied or approved")
        
    result = await db.execute(select(User).filter(User.samaj_id == current_user.samaj_id))
    user = result.scalars().first()
    if user:
        user.status = "PENDING"
        user.approval_status = "PENDING"
        await db.commit()
    
    return {"message": "Membership application submitted successfully"}

@app.post(f"{settings.API_V1_STR}/members/reject/{{samaj_id}}")
async def reject_member(
        samaj_id: str,
        db: AsyncSession = Depends(get_db),
        admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    result = await db.execute(select(User).filter(User.samaj_id == samaj_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "REJECTED"
    user.approval_status = "REJECTED"
    await db.commit()
    return {"message": "User registration rejected"}

# ==============================================================================
# MOCK / STUB ENDPOINTS FOR EVENTS (PHASE 4)
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user



@app.put(f"{settings.API_V1_STR}/users/me/address")
async def update_user_address(
    payload: AddressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.address_id:
        new_address = Address(
            address_text=payload.address_text,
            colony=payload.colony,
            area=payload.area
        )
        db.add(new_address)
        await db.flush()
        current_user.address_id = new_address.id
    else:
        # Update existing
        result = await db.execute(select(Address).filter(Address.id == current_user.address_id))
        existing_address = result.scalars().first()
        if existing_address:
            existing_address.address_text = payload.address_text
            existing_address.colony = payload.colony
            existing_address.area = payload.area
            
    # Sync with family address if head
    if current_user.family_id and current_user.family_relationship == "Head":
        result = await db.execute(select(Family).filter(Family.id == current_user.family_id))
        family = result.scalars().first()
        if family:
            family.address_id = current_user.address_id
            
    await db.commit()
    return {"message": "Address updated successfully"}

@app.get(f"{settings.API_V1_STR}/events", response_model=List[EventResponse])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event))
    return result.scalars().all()

@app.post(f"{settings.API_V1_STR}/events", response_model=EventResponse)
async def create_event(
        payload: EventCreate,
        db: AsyncSession = Depends(get_db),
        admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    event = Event(
        title=payload.title, 
        description=payload.description, 
        location=payload.location, 
        start_date=payload.start_date, 
        end_date=payload.end_date,
        visibility=payload.visibility,
        capacity=payload.capacity,
        is_paid=payload.is_paid,
        fee_amount=payload.fee_amount
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

@app.get(f"{settings.API_V1_STR}/events/my-registrations", response_model=List[EventRegistrationResponse])
async def get_my_event_registrations(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EventRegistration).filter(EventRegistration.samaj_id == current_user.samaj_id))
    return result.scalars().all()

@app.post(f"{settings.API_V1_STR}/events/{{event_id}}/register", response_model=EventRegistrationResponse)
async def register_event(
        event_id: int,
        payload: EventRegistrationCreate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Check if already registered
    result = await db.execute(
        select(EventRegistration).filter(
            EventRegistration.samaj_id == current_user.samaj_id,
            EventRegistration.event_id == event_id
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Already registered for this event.")

    # Fetch event
    event_result = await db.execute(select(Event).filter(Event.id == event_id))
    event = event_result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if not event.is_paid:
        payment_mode = "FREE"
        payment_status = "COMPLETED"
    else:
        payment_mode = payload.payment_mode
        payment_status = "COMPLETED" if payment_mode == "ONLINE" else "PENDING"

    # Create registration
    registration = EventRegistration(
        event_id=event.id,
        samaj_id=current_user.samaj_id,
        payment_mode=payment_mode,
        payment_status=payment_status
    )
    db.add(registration)

    # If it's a paid event, track payment
    if event.is_paid and event.fee_amount:
        payment = Payment(
            amount=event.fee_amount,
            currency="INR",
            status=payment_status,
            payment_type=payload.payment_mode,
            samaj_id=current_user.samaj_id,
            purpose="EVENT",
            reference_id=event.id
        )
        db.add(payment)

    await db.commit()
    await db.refresh(registration)
    return registration

@app.get(f"{settings.API_V1_STR}/payments/pending", response_model=List[PaymentResponse])
async def get_pending_payments(
        db: AsyncSession = Depends(get_db),
        admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    result = await db.execute(
        select(Payment).filter(Payment.status == "PENDING")
    )
    return result.scalars().all()

@app.put(f"{settings.API_V1_STR}/payments/{{payment_id}}/verify", response_model=PaymentResponse)
async def verify_payment(
        payment_id: int,
        payload: PaymentVerifyRequest,
        db: AsyncSession = Depends(get_db),
        admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    result = await db.execute(select(Payment).filter(Payment.id == payment_id))
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")

    payment.status = payload.status
    
    # If payment was for an event, update registration
    if payment.purpose == "EVENT" and payment.reference_id:
        reg_result = await db.execute(
            select(EventRegistration).filter(
                EventRegistration.event_id == payment.reference_id,
                EventRegistration.samaj_id == payment.samaj_id
            )
        )
        registration = reg_result.scalars().first()
        if registration:
            registration.payment_status = payload.status

    await db.commit()
    await db.refresh(payment)
    return payment


# ==============================================================================
# MOCK / STUB ENDPOINTS FOR BHAVAN BOOKING & RAZORPAY (PHASE 5)
# ==============================================================================

@app.post(f"{settings.API_V1_STR}/bookings", response_model=BookingResponse)
async def create_booking(
        payload: BookingCreate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Check double booking
    overlap = await db.execute(
        select(Booking).filter(
            Booking.facility_id == payload.facility_id,
            Booking.status == "CONFIRMED",
            Booking.booking_start < payload.booking_end,
            Booking.booking_end > payload.booking_start
        )
    )
    if overlap.scalars().first():
        raise HTTPException(status_code=400, detail="Facility is already booked for these dates.")

    booking = Booking(
        facility_id=payload.facility_id,
        samaj_id=current_user.samaj_id,
        booking_start=payload.booking_start,
        booking_end=payload.booking_end,
        status="PENDING"
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


# ==============================================================================
# MOCK / STUB ENDPOINTS FOR DONATIONS (PHASE 5)
# ==============================================================================

@app.post(f"{settings.API_V1_STR}/donations", response_model=DonationResponse)
async def create_donation(
        payload: DonationCreate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Setup payment first
    from app.models.all_models import Payment
    payment = Payment(amount=payload.amount, payment_type="ONLINE", status="SUCCESS")
    db.add(payment)
    await db.flush()

    donation = Donation(
        donor_id=current_user.samaj_id,
        category=payload.category,
        amount=payload.amount,
        payment_id=payment.id
    )
    db.add(donation)
    await db.commit()
    await db.refresh(donation)
    return donation


# ==============================================================================
# SOCKET.IO REAL-TIME CHAT EVENTS (PHASE 6)
# ==============================================================================

@sio.event
async def connect(sid, environ):
    logger.info(f"Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")

@sio.event
async def send_message(sid, data):
    # data: { sender_id, receiver_id, content, group_id }
    content = data.get("content")
    sender_id = data.get("sender_id")
    group_id = data.get("group_id")

    # Broadcast to specific room/group or other user
    if group_id:
        await sio.emit("new_message", data, room=f"group_{group_id}")
    else:
        # Direct Message broadcast
        await sio.emit("new_message", data)

@sio.event
async def join_room(sid, data):
    # data: { group_id }
    group_id = data.get("group_id")
    await sio.enter_room(sid, f"group_{group_id}")
    return {"status": "joined", "room": f"group_{group_id}"}


# Resolve imports
from datetime import datetime
from typing import Optional


# ==============================================================================
# DYNAMIC DASHBOARD & FAMILY ENDPOINTS
# ==============================================================================

from app.schemas.all_schemas import FamilyCreate, FamilyResponse, FamilyAddMember
import uuid
from sqlalchemy.orm import selectinload

@app.get(f"{settings.API_V1_STR}/dashboard/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    total_members = await db.execute(select(User).filter(User.role == "MEMBER", User.status == "APPROVED"))
    total_members_count = len(total_members.scalars().all())

    total_families = await db.execute(select(Family))
    total_families_count = len(total_families.scalars().all())

    active_bookings = await db.execute(select(Booking).filter(Booking.status == "CONFIRMED"))
    active_bookings_count = len(active_bookings.scalars().all())

    # Calculate funds dynamically
    payment_sum = await db.execute(select(func.sum(Payment.amount)).filter(Payment.status == "SUCCESS"))
    total_payments = payment_sum.scalar() or 0
    refund_sum = await db.execute(select(func.sum(Refund.refund_amount)).filter(Refund.status == "COMPLETED"))
    total_refunds = refund_sum.scalar() or 0
    samaj_funds = float(total_payments - total_refunds)

    return {
        "total_members": total_members_count,
        "total_families": total_families_count,
        "active_bookings": active_bookings_count,
        "samaj_funds": samaj_funds
    }

@app.get(f"{settings.API_V1_STR}/family/my-family", response_model=Optional[FamilyResponse])
async def get_my_family(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        return None

    result = await db.execute(
        select(Family)
        .options(selectinload(Family.members))
        .filter(Family.id == current_user.family_id)
    )
    family = result.scalars().first()
    return family

@app.post(f"{settings.API_V1_STR}/family/register", response_model=FamilyResponse)
async def register_family(
    payload: FamilyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="User already belongs to a family.")
        
    family_code = f"FAM{str(uuid.uuid4())[:6].upper()}"
    
    family = Family(
        family_code=family_code,
        family_name=payload.family_name,
        family_head_samaj_id=current_user.samaj_id,
        address_id=current_user.address_id
    )
    db.add(family)
    await db.flush()
    
    current_user.family_id = family.id
    current_user.family_relationship = "Head"
    await db.commit()

    # Re-fetch with members loaded
    result = await db.execute(
        select(Family)
        .options(selectinload(Family.members))
        .filter(Family.id == family.id)
    )
    family_loaded = result.scalars().first()
    return family_loaded

@app.post(f"{settings.API_V1_STR}/family/add-member")
async def add_family_member(
        payload: FamilyAddMember,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You must register a family first.")

    result = await db.execute(select(User).filter(User.samaj_id == payload.samaj_id))
    target_user = result.scalars().first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User with this Samaj ID not found.")

    if target_user.family_id:
        raise HTTPException(status_code=400, detail="User already belongs to a family.")

    target_user.family_id = current_user.family_id
    target_user.family_relationship = payload.relationship
    await db.commit()
    return {"message": "Member added successfully"}

@app.delete(f"{settings.API_V1_STR}/family/remove")
async def delete_family(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family to delete.")

    members = await db.execute(select(User).filter(User.family_id == current_user.family_id))
    for member in members.scalars().all():
        member.family_id = None
        member.family_relationship = None

    await db.execute(Family.__table__.delete().where(Family.id == current_user.family_id))
    await db.commit()
    return {"message": "Family deleted successfully"}

@app.get("/api/v1/bookings/my-bookings", response_model=List[BookingResponse])
async def get_my_bookings(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Booking).options(selectinload(Booking.facility)).filter(Booking.samaj_id == current_user.samaj_id)
    )
    bookings = result.scalars().all()
    for b in bookings:
        b.user = current_user
    return bookings

from pydantic import BaseModel
class PrivacyUpdate(BaseModel):
    show_phone: bool
    show_email: bool
    show_address: bool

@app.put(f"{settings.API_V1_STR}/users/privacy")
async def update_privacy(
        payload: PrivacyUpdate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    current_user.show_phone = payload.show_phone
    current_user.show_email = payload.show_email
    current_user.show_address = payload.show_address
    result = await db.execute(select(Event))
    return result.scalars().all()