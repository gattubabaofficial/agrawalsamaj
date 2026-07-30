import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.role import CustomRole

router = APIRouter(prefix="/api/v1/roles", tags=["Custom Roles"])

ALLOWED_PERMISSIONS = [
    "manage_bhavan",
    "manage_events",
    "manage_blogs",
    "manage_members",
    "manage_donations",
    "scan_passes",
    "manage_roles",
]

class RoleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    permissions: List[str] = Field(default_factory=list)

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    permissions: Optional[List[str]] = None

class AssignRoleRequest(BaseModel):
    user_id: str
    custom_role_id: Optional[str] = None  # None to unassign

def role_dict(role: CustomRole, user_count: int = 0) -> dict:
    return {
        "role_id": str(role.role_id),
        "name": role.name,
        "description": role.description,
        "permissions": role.permissions or [],
        "user_count": user_count,
        "created_at": role.created_at.isoformat() if role.created_at else None,
        "updated_at": role.updated_at.isoformat() if role.updated_at else None,
    }

@router.get("/")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all custom roles and count of assigned users."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(select(CustomRole).order_by(CustomRole.name.asc()))
    roles = result.scalars().all()

    items = []
    for r in roles:
        count_res = await db.execute(
            select(func.count(User.user_id)).where(User.custom_role_id == r.role_id)
        )
        user_count = count_res.scalar() or 0
        items.append(role_dict(r, user_count))

    return {"items": items, "total": len(items)}

@router.post("/", status_code=201)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom role with specific permissions."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check for existing name
    existing = await db.scalar(select(CustomRole).where(CustomRole.name == data.name.strip()))
    if existing:
        raise HTTPException(status_code=400, detail=f"Role '{data.name}' already exists.")

    invalid_perms = [p for p in data.permissions if p not in ALLOWED_PERMISSIONS]
    if invalid_perms:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {', '.join(invalid_perms)}")

    role = CustomRole(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        permissions=data.permissions,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role_dict(role, 0)

@router.put("/{role_id}")
async def update_role(
    role_id: str,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a custom role name, description, or permissions."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        r_uuid = uuid.UUID(role_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role ID format")

    role = await db.get(CustomRole, r_uuid)
    if not role:
        raise HTTPException(status_code=404, detail="Custom role not found")

    if data.name and data.name.strip() != role.name:
        existing = await db.scalar(select(CustomRole).where(CustomRole.name == data.name.strip()))
        if existing:
            raise HTTPException(status_code=400, detail=f"Role '{data.name}' already exists.")
        role.name = data.name.strip()

    if data.description is not None:
        role.description = data.description.strip() if data.description else None

    if data.permissions is not None:
        invalid_perms = [p for p in data.permissions if p not in ALLOWED_PERMISSIONS]
        if invalid_perms:
            raise HTTPException(status_code=400, detail=f"Invalid permissions: {', '.join(invalid_perms)}")
        role.permissions = data.permissions

    await db.commit()
    await db.refresh(role)

    count_res = await db.execute(
        select(func.count(User.user_id)).where(User.custom_role_id == role.role_id)
    )
    user_count = count_res.scalar() or 0
    return role_dict(role, user_count)

@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom role."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        r_uuid = uuid.UUID(role_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role ID format")

    role = await db.get(CustomRole, r_uuid)
    if not role:
        raise HTTPException(status_code=404, detail="Custom role not found")

    await db.delete(role)
    await db.commit()
    return {"status": "success", "message": f"Role '{role.name}' deleted successfully."}

@router.post("/assign")
async def assign_custom_role(
    data: AssignRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign or unassign a custom role to a user."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        u_uuid = uuid.UUID(data.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    target_user = await db.get(User, u_uuid)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.custom_role_id:
        try:
            r_uuid = uuid.UUID(data.custom_role_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role ID format")
        role = await db.get(CustomRole, r_uuid)
        if not role:
            raise HTTPException(status_code=404, detail="Custom role not found")
        target_user.custom_role_id = role.role_id
    else:
        target_user.custom_role_id = None

    await db.commit()
    return {
        "status": "success",
        "message": f"Assigned role to {target_user.first_name} {target_user.surname}",
        "user_id": str(target_user.user_id),
        "custom_role_id": str(target_user.custom_role_id) if target_user.custom_role_id else None,
    }
