from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import socketio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.config import settings
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models.all_models import User, MemberProfile, Family, Booking, Event, Donation, ChatGroup
from app.schemas.all_schemas import UserResponse, BookingResponse, BookingCreate, EventResponse, DonationResponse, DonationCreate
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
        
    query = select(User).join(MemberProfile).filter(
        User.role == "MEMBER",
        User.status == "APPROVED"
    )
    if name:
        query = query.filter(User.first_name.ilike(f"%{name}%") | User.last_name.ilike(f"%{name}%"))
        
    result = await db.execute(query)
    return result.scalars().all()

@app.post(f"{settings.API_V1_STR}/members/approve/{{user_id}}")
async def approve_member(
    user_id: int, 
    role: str = "MEMBER",  # MEMBER (Samaj Member) or USER (Outsider)
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Classify Role:
    # Samaj Member = MEMBER (details shown in directory)
    # Outside User = USER (cannot access directory/member groups, but retains account)
    user.role = role
    user.status = "APPROVED"
    
    # Update Member Profile
    profile_result = await db.execute(select(MemberProfile).filter(MemberProfile.user_id == user_id))
    profile = profile_result.scalars().first()
    if profile:
        profile.approval_status = "APPROVED"
        
    await db.commit()
    return {"message": f"User approved successfully as {role}"}


# ==============================================================================
# MOCK / STUB ENDPOINTS FOR EVENTS (PHASE 4)
# ==============================================================================

@app.get(f"{settings.API_V1_STR}/events", response_model=List[EventResponse])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event))
    return result.scalars().all()

@app.post(f"{settings.API_V1_STR}/events")
async def create_event(
    title: str, description: str, location: str, start_date: datetime, end_date: datetime,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(RoleChecker(["ADMIN"]))
):
    event = Event(title=title, description=description, location=location, start_date=start_date, end_date=end_date)
    db.add(event)
    await db.commit()
    return event


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
        user_id=current_user.id,
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
        donor_id=current_user.id,
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
