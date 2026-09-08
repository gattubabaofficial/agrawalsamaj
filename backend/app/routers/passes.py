import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.dependencies import get_db, get_current_user, is_admin_level
from app.models.user import User, UserRole
from app.models.event import EventPass, PassStatus, EventRegistration

router = APIRouter(prefix="/api/v1/passes", tags=["Passes & Webhooks"])


@router.get("/{pass_id}")
async def get_pass_details(
    pass_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to view pass details."""
    if not is_admin_level(current_user) and current_user.role != UserRole.VOLUNTEER:
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
    
    # Calculate amount paid per pass
    pass_price = 0.0
    if registration and registration.pass_count > 0:
        pass_price = float(registration.total_amount) / registration.pass_count

    return {
        "pass_id": str(event_pass.pass_id),
        "registration_id": str(event_pass.registration_id),
        "event_id": str(event_pass.event_id),
        "event_title": event.title if event else "Event",
        "event_date": event.start_datetime if event else None,
        "event_venue": event.venue if event else None,
        "guest_name": event_pass.guest_name or (f"{registration.user.first_name} {registration.user.surname}" if registration and registration.user else (registration.guest_name if registration else "Guest")),
        "guest_phone": event_pass.guest_phone or (registration.user.mobile if registration and registration.user else (registration.guest_phone if registration else "N/A")),
        "status": event_pass.status,
        "scanned_at": event_pass.scanned_at,
        "pass_price": pass_price,
        "payment_status": registration.payment_status if registration else None,
        "payment_mode": registration.payment_mode if registration else None,
        "cancelled_at": event_pass.cancelled_at,
        "cancelled_by": str(event_pass.cancelled_by) if event_pass.cancelled_by else None,
        "cancel_reason": event_pass.cancel_reason,
        "refund_amount": float(event_pass.refund_amount) if event_pass.refund_amount else 0.0,
        "refund_status": event_pass.refund_status or "not_applicable",
    }


@router.post("/{pass_id}/check-in")
async def check_in_pass(
    pass_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a pass as used at the venue."""
    if not is_admin_level(current_user) and current_user.role != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(select(EventPass).filter(EventPass.pass_id == pass_id))
    event_pass = result.scalar_one_or_none()
    
    if not event_pass:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    if event_pass.status == PassStatus.USED:
        raise HTTPException(status_code=400, detail="This pass has already been used!")
    if event_pass.status == PassStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="This pass has been cancelled and cannot be used!")

    event_pass.status = PassStatus.USED
    event_pass.scanned_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "success", "message": "Pass successfully checked in"}


class CancelPassRequest(BaseModel):
    reason: Optional[str] = "Cancelled by admin"
    refund_amount: Optional[float] = 0.0
    refund_status: Optional[str] = "not_applicable"



@router.post("/admin/{pass_id}/cancel")
async def cancel_pass(
    pass_id: uuid.UUID,
    payload: CancelPassRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to cancel an event pass."""
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(EventPass)
        .options(joinedload(EventPass.event))
        .filter(EventPass.pass_id == pass_id)
    )
    event_pass = result.scalar_one_or_none()

    if not event_pass:
        raise HTTPException(status_code=404, detail="Pass not found")

    if event_pass.status == PassStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="This pass is already cancelled")

    event_pass.status = PassStatus.CANCELLED
    event_pass.cancelled_by = current_user.user_id
    event_pass.cancelled_at = datetime.utcnow()
    event_pass.cancel_reason = payload.get("reason", "Cancelled by Admin")
    event_pass.refund_amount = payload.get("refund_amount", 0.0)
    event_pass.refund_status = payload.get("refund_status", "not_applicable")

    if event_pass.event and event_pass.event.passes_sold > 0:
        event_pass.event.passes_sold -= 1

    await db.commit()

    return {"status": "success", "message": "Pass cancelled successfully"}
