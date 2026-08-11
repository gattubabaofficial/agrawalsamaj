"""Super Admin router.

Provides super-admin-only management of admin accounts and per-admin
performance analytics (approvals handled and cash generated), plus an
endpoint for any admin to view their own stats.
"""
import re
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, get_current_super_admin
from app.models.user import User, UserRole
from app.models.event import EventRegistration, EventPaymentMode, PaymentStatus
from app.models.receipt import Receipt
from app.utils.security import hash_password

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin"])


# ─────────────────────────── Schemas ───────────────────────────
class AdminCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=255)
    mobile: Optional[str] = Field(None, max_length=15)
    password: str = Field(..., min_length=6)
    admin_notes: Optional[str] = None


class AdminUpdate(BaseModel):
    first_name: Optional[str] = None
    surname: Optional[str] = None
    mobile: Optional[str] = None
    is_active: Optional[bool] = None
    admin_notes: Optional[str] = None


class PasswordReset(BaseModel):
    new_password: str = Field(..., min_length=6)


class AdminStats(BaseModel):
    bookings_approved: int
    booking_cash_amount: float
    booking_total_amount: float
    events_approved: int
    event_cash_amount: float
    event_total_amount: float
    total_approvals: int
    total_cash_generated: float
    total_amount_generated: float


class AdminSummary(BaseModel):
    user_id: uuid.UUID
    first_name: str
    surname: str
    email: Optional[str]
    mobile: Optional[str]
    role: str
    is_active: bool
    admin_notes: Optional[str]
    created_at: Optional[datetime]
    created_by_admin_id: Optional[uuid.UUID]
    stats: AdminStats


# ─────────────────────────── Helpers ───────────────────────────
async def _compute_stats(db: AsyncSession, admin_id: uuid.UUID) -> AdminStats:
    # Bookings approved by this admin
    b_total = await db.execute(
        select(
            func.count(Booking.booking_id),
            func.coalesce(func.sum(Booking.total_amount), 0),
        ).where(Booking.approved_by == admin_id)
    )
    b_count, b_amount = b_total.one()

    b_cash = await db.execute(
        select(func.coalesce(func.sum(Booking.total_amount), 0)).where(
            Booking.approved_by == admin_id,
            Booking.payment_mode == PaymentMode.CASH,
        )
    )
    b_cash_amount = b_cash.scalar() or 0

    # Event registrations approved by this admin
    e_total = await db.execute(
        select(
            func.count(EventRegistration.registration_id),
            func.coalesce(func.sum(EventRegistration.total_amount), 0),
        ).where(EventRegistration.approved_by == admin_id)
    )
    e_count, e_amount = e_total.one()

    e_cash = await db.execute(
        select(func.coalesce(func.sum(EventRegistration.total_amount), 0)).where(
            EventRegistration.approved_by == admin_id,
            EventRegistration.payment_mode == EventPaymentMode.PAY_AT_VENUE,
        )
    )
    e_cash_amount = e_cash.scalar() or 0

    return AdminStats(
        bookings_approved=int(b_count or 0),
        booking_cash_amount=float(b_cash_amount or 0),
        booking_total_amount=float(b_amount or 0),
        events_approved=int(e_count or 0),
        event_cash_amount=float(e_cash_amount or 0),
        event_total_amount=float(e_amount or 0),
        total_approvals=int((b_count or 0) + (e_count or 0)),
        total_cash_generated=float((b_cash_amount or 0) + (e_cash_amount or 0)),
        total_amount_generated=float((b_amount or 0) + (e_amount or 0)),
    )


# ─────────────────────────── Routes ───────────────────────────
@router.post("/admins", response_model=AdminSummary, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreate,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin),
):
    email = data.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    if data.mobile:
        m = await db.execute(select(User).where(User.mobile == data.mobile))
        if m.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="A user with this mobile already exists")

    admin = User(
        first_name=data.first_name,
        surname=data.surname,
        email=email,
        mobile=data.mobile,
        password_hash=hash_password(data.password),
        role=UserRole.ADMIN,
        is_member=True,
        is_active=True,
        admin_notes=data.admin_notes,
        created_by_admin_id=super_admin.user_id,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    stats = await _compute_stats(db, admin.user_id)
    return AdminSummary(
        user_id=admin.user_id, first_name=admin.first_name, surname=admin.surname,
        email=admin.email, mobile=admin.mobile, role=admin.role.value if hasattr(admin.role, "value") else admin.role,
        is_active=admin.is_active, admin_notes=admin.admin_notes, created_at=admin.created_at,
        created_by_admin_id=admin.created_by_admin_id, stats=stats,
    )


@router.get("/admins", response_model=List[AdminSummary])
async def list_admins(
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin),
):
    result = await db.execute(
        select(User).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
        .order_by(User.created_at.desc())
    )
    admins = result.scalars().all()
    out = []
    for a in admins:
        stats = await _compute_stats(db, a.user_id)
        out.append(AdminSummary(
            user_id=a.user_id, first_name=a.first_name, surname=a.surname,
            email=a.email, mobile=a.mobile,
            role=a.role.value if hasattr(a.role, "value") else a.role,
            is_active=a.is_active, admin_notes=a.admin_notes, created_at=a.created_at,
            created_by_admin_id=a.created_by_admin_id, stats=stats,
        ))
    return out


@router.get("/me/stats", response_model=AdminStats)
async def my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return await _compute_stats(db, current_user.user_id)


@router.get("/admins/{admin_id}", response_model=AdminSummary)
async def get_admin(
    admin_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin),
):
    result = await db.execute(select(User).where(User.user_id == admin_id))
    a = result.scalar_one_or_none()
    if not a or a.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=404, detail="Admin not found")
    stats = await _compute_stats(db, a.user_id)
    return AdminSummary(
        user_id=a.user_id, first_name=a.first_name, surname=a.surname,
        email=a.email, mobile=a.mobile,
        role=a.role.value if hasattr(a.role, "value") else a.role,
        is_active=a.is_active, admin_notes=a.admin_notes, created_at=a.created_at,
        created_by_admin_id=a.created_by_admin_id, stats=stats,
    )


@router.put("/admins/{admin_id}", response_model=AdminSummary)
async def update_admin(
    admin_id: uuid.UUID,
    data: AdminUpdate,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin),
):
    result = await db.execute(select(User).where(User.user_id == admin_id))
    a = result.scalar_one_or_none()
    if not a or a.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=404, detail="Admin not found")
    if a.role == UserRole.SUPER_ADMIN and a.user_id != super_admin.user_id:
        raise HTTPException(status_code=403, detail="Cannot modify another super admin")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(a, key, value)
    await db.commit()
    await db.refresh(a)
    stats = await _compute_stats(db, a.user_id)
    return AdminSummary(
        user_id=a.user_id, first_name=a.first_name, surname=a.surname,
        email=a.email, mobile=a.mobile,
        role=a.role.value if hasattr(a.role, "value") else a.role,
        is_active=a.is_active, admin_notes=a.admin_notes, created_at=a.created_at,
        created_by_admin_id=a.created_by_admin_id, stats=stats,
    )


@router.post("/admins/{admin_id}/reset-password")
async def reset_admin_password(
    admin_id: uuid.UUID,
    data: PasswordReset,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin),
):
    result = await db.execute(select(User).where(User.user_id == admin_id))
    a = result.scalar_one_or_none()
    if not a or a.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=404, detail="Admin not found")
    if a.role == UserRole.SUPER_ADMIN and a.user_id != super_admin.user_id:
        raise HTTPException(status_code=403, detail="Cannot reset another super admin's password")
    a.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"message": f"Password updated for {a.first_name} {a.surname}"}


@router.delete("/admins/{admin_id}")
async def deactivate_admin(
    admin_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin),
):
    """Soft-deactivate an admin account (does not delete history/approvals)."""
    result = await db.execute(select(User).where(User.user_id == admin_id))
    a = result.scalar_one_or_none()
    if not a or a.role != UserRole.ADMIN:
        raise HTTPException(status_code=404, detail="Admin not found")
    a.is_active = False
    await db.commit()
    return {"message": f"Admin {a.first_name} {a.surname} deactivated"}
