from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
import random
import string

from app.database import get_db_session
from app.models.user import User, Family, UserRole
from app.models.requests import FamilyJoinRequest, RequestStatus
from app.dependencies import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/family", tags=["family"])

def generate_family_code():
    return "FAM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_family(
    family_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.is_member:
        raise HTTPException(status_code=403, detail="Only members can create families.")
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="You are already in a family.")

    new_family = Family(
        family_code=generate_family_code(),
        family_name=family_name,
        head_user_id=current_user.user_id
    )
    db.add(new_family)
    await db.commit()
    await db.refresh(new_family)

    current_user.family_id = new_family.family_id
    current_user.family_relation = "Head"
    await db.commit()

    return {"message": "Family created successfully", "family_code": new_family.family_code}

@router.post("/join")
async def request_join_family(
    family_code: str,
    relation: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.is_member:
        raise HTTPException(status_code=403, detail="Only members can join families.")
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="You are already in a family.")

    result = await db.execute(select(Family).where(Family.family_code == family_code))
    family = result.scalars().first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found with given code.")

    # Check for pending requests
    req_result = await db.execute(
        select(FamilyJoinRequest).where(
            FamilyJoinRequest.user_id == current_user.user_id,
            FamilyJoinRequest.status == RequestStatus.PENDING
        )
    )
    if req_result.scalars().first():
        raise HTTPException(status_code=400, detail="You already have a pending join request.")

    join_req = FamilyJoinRequest(
        user_id=current_user.user_id,
        family_id=family.family_id,
        relation=relation
    )
    db.add(join_req)
    await db.commit()
    return {"message": "Join request sent to family head."}

@router.get("/requests")
async def get_family_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You are not in a family.")
    
    # Verify user is head
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only family head can view requests.")

    result = await db.execute(
        select(FamilyJoinRequest, User)
        .join(User, FamilyJoinRequest.user_id == User.user_id)
        .where(
            FamilyJoinRequest.family_id == current_user.family_id,
            FamilyJoinRequest.status == RequestStatus.PENDING
        )
    )
    
    requests_data = []
    for req, user in result.all():
        requests_data.append({
            "request_id": str(req.request_id),
            "relation": req.relation,
            "created_at": req.created_at,
            "user": {
                "id": str(user.user_id),
                "name": f"{user.first_name} {user.surname}",
                "samaj_id": user.samaj_id
            }
        })
    return requests_data

@router.get("/me")
async def get_my_family(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="You are not in a family.")
        
    fam_result = await db.execute(select(Family).where(Family.family_id == current_user.family_id))
    family = fam_result.scalars().first()
    
    if not family:
        raise HTTPException(status_code=404, detail="Family not found.")
        
    members_result = await db.execute(select(User).where(User.family_id == family.family_id))
    members = members_result.scalars().all()
    
    members_data = []
    for m in members:
        members_data.append({
            "user_id": str(m.user_id),
            "name": f"{m.first_name} {m.surname}",
            "samaj_id": m.samaj_id,
            "relation": m.family_relation,
            "is_head": m.user_id == family.head_user_id
        })
        
    return {
        "family_id": str(family.family_id),
        "family_name": family.family_name,
        "family_code": family.family_code,
        "is_head": current_user.user_id == family.head_user_id,
        "members": members_data
    }

@router.post("/requests/{request_id}/approve")
async def approve_family_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(FamilyJoinRequest).where(FamilyJoinRequest.request_id == uuid.UUID(request_id))
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    # Verify user is head
    fam_result = await db.execute(select(Family).where(Family.family_id == req.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only family head can approve requests.")

    # Approve request
    req.status = RequestStatus.APPROVED
    
    # Update user
    user_result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = user_result.scalars().first()
    if user:
        user.family_id = req.family_id
        user.family_relation = req.relation

    await db.commit()
    return {"message": "Request approved. Member added to family."}

@router.post("/requests/{request_id}/reject")
async def reject_family_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(FamilyJoinRequest).where(FamilyJoinRequest.request_id == uuid.UUID(request_id))
    )
    req = result.scalars().first()
    if not req or req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    # Verify user is head
    fam_result = await db.execute(select(Family).where(Family.family_id == req.family_id))
    family = fam_result.scalars().first()
    if not family or family.head_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only family head can reject requests.")

    req.status = RequestStatus.REJECTED
    await db.commit()
    return {"message": "Request rejected."}

# Admin route
@router.get("/all")
async def get_all_families(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(select(Family))
    families = result.scalars().all()
    
    families_data = []
    for fam in families:
        members_result = await db.execute(select(User).where(User.family_id == fam.family_id))
        members = members_result.scalars().all()
        
        families_data.append({
            "family_id": str(fam.family_id),
            "family_code": fam.family_code,
            "family_name": fam.family_name,
            "head_user_id": str(fam.head_user_id) if fam.head_user_id else None,
            "member_count": len(members)
        })
    return families_data
