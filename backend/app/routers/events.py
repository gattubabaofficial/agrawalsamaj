from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.event import Event, EventRegistration, EventCategory, EventStatus, PaymentStatus

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
    status: EventStatus

    class Config:
        orm_mode = True

class EventRegistrationRequest(BaseModel):
    pass_count: int = Field(default=1, gt=0)

# Routes
@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
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

@router.post("/{event_id}/register", status_code=status.HTTP_201_CREATED)
async def register_event(
    event_id: uuid.UUID,
    reg_data: EventRegistrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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

    # Mock payment - directly setting to paid for demonstration based on user request
    total_amount = float(event.pass_price) * reg_data.pass_count
    
    registration = EventRegistration(
        user_id=current_user.user_id,
        event_id=event.event_id,
        pass_count=reg_data.pass_count,
        total_amount=total_amount,
        payment_status=PaymentStatus.PAID,
        qr_delivered=True
    )
    
    event.passes_sold += reg_data.pass_count
    
    db.add(registration)
    await db.commit()
    await db.refresh(registration)
    
    return {"message": "Successfully registered", "registration_id": registration.registration_id}

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
        registrations.append({
            "registration_id": reg.registration_id,
            "pass_count": reg.pass_count,
            "total_amount": reg.total_amount,
            "payment_status": reg.payment_status,
            "event_title": event.title,
            "event_start": event.start_datetime,
            "event_venue": event.venue,
        })
        
    return registrations
