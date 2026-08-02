import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.event import EventPass, PassStatus

router = APIRouter(prefix="/api/v1/passes", tags=["Passes & Webhooks"])

from sqlalchemy.orm import joinedload
from app.models.event import EventRegistration

@router.get("/{pass_id}")
async def get_pass_details(
    pass_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to view pass details."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VOLUNTEER):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(
        select(EventPass)
        .options(
            joinedload(EventPass.event),
            joinedload(EventPass.registration).joinedload(EventRegistration.user)
        )
        .filter(EventPass.pass_id == pass_id)
    )
    event_pass = result.scalar_one_or_none()
    
    if not event_pass:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    registration = event_pass.registration
    event = event_pass.event
    
    g_name = registration.guest_name
    g_phone = registration.guest_phone
    g_email = registration.guest_email
    samaj_id = None
    if registration.user:
        if not g_name:
            g_name = f"{registration.user.first_name} {registration.user.surname}"
        if not g_phone:
            g_phone = registration.user.mobile
        if not g_email:
            g_email = registration.user.email
        samaj_id = registration.user.samaj_id
        
    return {
        "pass_id": event_pass.pass_id,
        "registration_id": event_pass.registration_id,
        "event_id": event_pass.event_id,
        "event_title": event.title if event else "Unknown Event",
        "event_start_datetime": event.start_datetime if event else None,
        "event_venue": event.venue if event else "Unknown Venue",
        "guest_name": event_pass.guest_name or g_name or "Guest",
        "guest_phone": g_phone or "N/A",
        "guest_email": g_email or "N/A",
        "primary_contact_name": g_name or "Guest",
        "samaj_id": samaj_id,
        "payment_status": registration.payment_status if registration else "PENDING",
        "payment_mode": registration.payment_mode if registration else None,
        "status": event_pass.status,
        "delivery_status": event_pass.delivery_status,
        "scanned_at": event_pass.scanned_at
    }

@router.post("/admin/{pass_id}/check-in")
async def check_in_pass(
    pass_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a pass as used at the venue."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VOLUNTEER):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(select(EventPass).filter(EventPass.pass_id == pass_id))
    event_pass = result.scalar_one_or_none()
    
    if not event_pass:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    if event_pass.status == PassStatus.USED:
        raise HTTPException(status_code=400, detail="This pass has already been used!")
        
    event_pass.status = PassStatus.USED
    event_pass.scanned_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "success", "message": "Pass successfully checked in"}
