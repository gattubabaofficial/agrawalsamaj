from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.event import Event, EventRegistration
from app.models.booking import Booking
from app.models.donation import Donation

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

class DashboardOverview(BaseModel):
    active_tickets: int
    upcoming_bookings: int
    total_donated: float
    
@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Active tickets
    tickets_result = await db.execute(
        select(func.sum(EventRegistration.pass_count))
        .filter(EventRegistration.user_id == current_user.user_id)
    )
    active_tickets = tickets_result.scalar() or 0
    
    # Upcoming bookings
    bookings_result = await db.execute(
        select(func.count(Booking.booking_id))
        .filter(Booking.user_id == current_user.user_id)
    )
    upcoming_bookings = bookings_result.scalar() or 0
    
    # Total donated
    donations_result = await db.execute(
        select(func.sum(Donation.amount))
        .filter(Donation.user_id == current_user.user_id)
    )
    total_donated = float(donations_result.scalar() or 0.0)
    
    return DashboardOverview(
        active_tickets=int(active_tickets),
        upcoming_bookings=upcoming_bookings,
        total_donated=total_donated
    )
