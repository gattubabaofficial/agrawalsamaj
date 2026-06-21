from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from app.database import get_db_session
from app.models.user import User, UserRole
from app.models.requests import MembershipRequest, RequestStatus
from app.dependencies import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/membership", tags=["membership"])

@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_membership(
    message: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if current_user.is_member or current_user.role != UserRole.GUEST:
        raise HTTPException(status_code=400, detail="You are already a member or admin.")
        
    # Check if a pending request already exists
    existing_req = await db.execute(
        select(MembershipRequest).where(
            MembershipRequest.user_id == current_user.user_id,
            MembershipRequest.status == RequestStatus.PENDING
        )
    )
    if existing_req.scalars().first():
        raise HTTPException(status_code=400, detail="Membership request already pending.")

    new_request = MembershipRequest(
        user_id=current_user.user_id,
        message=message
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)
    return {"message": "Membership application submitted successfully."}

@router.get("/requests")
async def get_membership_requests(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(MembershipRequest, User)
        .join(User, MembershipRequest.user_id == User.user_id)
        .where(MembershipRequest.status == RequestStatus.PENDING)
    )
    
    requests_data = []
    for req, user in result.all():
        requests_data.append({
            "request_id": str(req.request_id),
            "message": req.message,
            "created_at": req.created_at,
            "user": {
                "id": str(user.user_id),
                "name": f"{user.first_name} {user.surname}",
                "email": user.email,
                "mobile": user.mobile
            }
        })
    return requests_data

@router.post("/requests/{request_id}/approve")
async def approve_membership(
    request_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(MembershipRequest).where(MembershipRequest.request_id == uuid.UUID(request_id))
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    user_result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Approve request and upgrade user
    req.status = RequestStatus.APPROVED
    user.role = UserRole.MEMBER
    user.is_member = True
    
    # Generate Samaj ID (Simple logic: SMJ-XXXX)
    # In production, this would be a robust sequence
    user.samaj_id = f"SMJ-{str(user.user_id)[:6].upper()}"
    
    await db.commit()
    return {"message": "Membership approved successfully."}

@router.post("/requests/{request_id}/reject")
async def reject_membership(
    request_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(MembershipRequest).where(MembershipRequest.request_id == uuid.UUID(request_id))
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    req.status = RequestStatus.REJECTED
    await db.commit()
    return {"message": "Membership rejected."}
