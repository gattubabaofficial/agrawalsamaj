import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.event import EventPass, PassStatus

router = APIRouter(prefix="/api/v1/passes", tags=["Passes & Webhooks"])

@router.post("/webhooks/twilio/status")
async def twilio_status_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook to receive message delivery status from Twilio."""
    # Twilio sends data as form-urlencoded
    form_data = await request.form()
    
    message_sid = form_data.get("MessageSid")
    message_status = form_data.get("MessageStatus")
    
    if not message_sid or not message_status:
        return {"status": "ignored"}
        
    result = await db.execute(select(EventPass).filter(EventPass.whatsapp_message_sid == message_sid))
    event_pass = result.scalar_one_or_none()
    
    if event_pass:
        event_pass.delivery_status = message_status
        await db.commit()
        
    return {"status": "success"}

@router.get("/{pass_id}")
async def get_pass_details(
    pass_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to view pass details."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(select(EventPass).filter(EventPass.pass_id == pass_id))
    event_pass = result.scalar_one_or_none()
    
    if not event_pass:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    return {
        "pass_id": event_pass.pass_id,
        "registration_id": event_pass.registration_id,
        "event_id": event_pass.event_id,
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
    if current_user.role != UserRole.ADMIN:
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
