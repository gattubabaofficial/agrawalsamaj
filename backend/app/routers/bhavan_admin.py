"""Admin Bhavan router.

Provides endpoints for Bhavan administration: accommodation types, photos, units,
amenities, purposes, rule profiles & multi-date assignments, effective calendar,
Terms & Conditions management, enquiry review & manual entry, audit logs, and overview dashboard.
"""

import json
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_admin, get_optional_current_user, is_admin_level
from app.models.audit import AuditLog
from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, BhavanAccommodationImage,
    BhavanAccommodationType, BhavanAmenity, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanEnquiryNote,
    BhavanPurpose, BhavanRuleAssignment, BhavanRuleAssignmentDate,
    BhavanRuleProfile, BhavanSettings, BhavanTermsVersion, BhavanUnit,
    BhavanVoucher, EnquirySource, EnquiryStatus, RuleCategory, RuleStatus, UnitStatus,
)
from app.models.user import User, UserRole
from app.services.bhavan_rules import (
    BaseAccommodationType, BaseAmenity, RuleConditions, resolve_date_range,
)
from app.services.bhavan_quote import get_or_create_settings


router = APIRouter(prefix="/api/v1/admin/bhavan", tags=["bhavan-admin"])


async def get_bhavan_admin(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_optional_current_user),
):
    """Returns the authenticated admin, or the seeded admin user fallback for dev/testing."""
    if user and is_admin_level(user):
        return user
    res = await db.execute(select(User).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])))
    admin_user = res.scalars().first()
    if admin_user:
        return admin_user
    return User(
        user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        full_name="Admin User",
        mobile="9876543210",
        role=UserRole.ADMIN,
    )


# ─── Audit Helper ─────────────────────────────────────────────────────────────

def _make_json_safe(obj: Any) -> Any:
    if obj is None:
        return None
    try:
        return json.loads(json.dumps(obj, default=str))
    except Exception:
        return str(obj)


async def record_audit(
    db: AsyncSession,
    admin_or_id: Any,
    action: str,
    target_table: str,
    target_id: Optional[uuid.UUID] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
):
    admin_id = None
    if isinstance(admin_or_id, uuid.UUID):
        admin_id = admin_or_id
    elif admin_or_id and hasattr(admin_or_id, "user_id") and isinstance(getattr(admin_or_id, "user_id"), uuid.UUID):
        admin_id = getattr(admin_or_id, "user_id")
    elif admin_or_id and hasattr(admin_or_id, "id") and isinstance(getattr(admin_or_id, "id"), uuid.UUID):
        admin_id = getattr(admin_or_id, "id")

    audit = AuditLog(
        admin_id=admin_id,
        action=action,
        target_table=target_table,
        target_id=target_id,
        old_value=_make_json_safe(old_value),
        new_value=_make_json_safe(new_value),
        timestamp=datetime.utcnow(),
    )
    db.add(audit)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class AccommodationTypeCreate(BaseModel):
    name: str
    kind: AccommodationKind = AccommodationKind.ROOM
    description: Optional[str] = None
    capacity_per_unit: int = Field(default=1, ge=1)
    base_price_per_night: Decimal
    sort_order: int = 0
    is_active: bool = True
    allow_standalone_booking: bool = True
    composition_json: Optional[dict] = None
    total_units: Optional[int] = None


class UnitCreate(BaseModel):
    accommodation_type_id: uuid.UUID
    label: str
    capacity: Optional[int] = None
    status: UnitStatus = UnitStatus.AVAILABLE
    notes: Optional[str] = None


class UnitUpdate(BaseModel):
    label: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[UnitStatus] = None
    notes: Optional[str] = None


class BulkUnitCreate(BaseModel):
    accommodation_type_id: uuid.UUID
    prefix: str = "Room "
    start_number: int = Field(ge=1)
    count: int = Field(ge=1, le=100)
    capacity: Optional[int] = None


class AmenityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    pricing_type: AmenityPricingType = AmenityPricingType.PER_UNIT
    available_quantity: Optional[int] = None
    allow_over_request: bool = False
    is_active: bool = True
    allow_standalone_booking: bool = True
    is_compulsory: bool = False
    sort_order: int = 0


class PurposeCreate(BaseModel):
    name: str
    is_active: bool = True
    sort_order: int = 0


class SettingsUpdate(BaseModel):
    default_min_nights: Optional[int] = None
    default_max_nights: Optional[int] = None
    advance_booking_days: Optional[int] = None
    otp_ttl_seconds: Optional[int] = None
    otp_resend_cooldown_seconds: Optional[int] = None
    otp_max_attempts: Optional[int] = None
    contact_phone: Optional[str] = None
    intro_text: Optional[str] = None
    required_fields: Optional[dict] = None


class VoucherCreate(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: Decimal
    min_booking_amount: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    is_active: bool = True
    sort_order: int = 0


class VoucherUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    min_booking_amount: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class DateRangeItem(BaseModel):
    start: date
    end: date


class RuleProfileCreate(BaseModel):
    name: str
    category: str = "wedding"
    description: Optional[str] = None
    config: dict = {}
    is_template: bool = False
    is_public_visible: bool = True
    dates: Optional[List[date]] = None
    date_ranges: Optional[List[DateRangeItem]] = None


class RuleProfileUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    config: Optional[dict] = None
    is_public_visible: Optional[bool] = None
    dates: Optional[List[date]] = None
    date_ranges: Optional[List[DateRangeItem]] = None


class RuleAssignmentCreate(BaseModel):
    profile_id: uuid.UUID
    label: str
    dates: Optional[List[date]] = None
    date_ranges: Optional[List[DateRangeItem]] = None
    note: Optional[str] = None


class StatusChangeRequest(BaseModel):
    status: EnquiryStatus
    decision_reason: Optional[str] = None


class EnquiryNoteCreate(BaseModel):
    note: str


class ManualEnquiryCreate(BaseModel):
    check_in: date
    check_out: date
    purpose_id: Optional[uuid.UUID] = None
    full_name: str
    mobile: str
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    source: EnquirySource = EnquirySource.PHONE
    accommodations: List[dict]  # [{"type_id": str, "quantity": int}]
    amenities: List[dict] = []  # [{"amenity_id": str, "quantity": int}]


class TermsVersionCreate(BaseModel):
    version_label: str
    content: str


# ─── Dashboard Overview ───────────────────────────────────────────────────────

@router.get("/overview")
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    now_date = date.today()

    res_pending = await db.execute(
        select(func.count(BhavanEnquiry.id)).where(BhavanEnquiry.status == EnquiryStatus.PENDING)
    )
    pending_count = res_pending.scalar() or 0

    res_today = await db.execute(
        select(func.count(BhavanEnquiry.id)).where(
            func.date(BhavanEnquiry.created_at) == now_date
        )
    )
    today_count = res_today.scalar() or 0

    res_approved = await db.execute(
        select(func.count(BhavanEnquiry.id)).where(BhavanEnquiry.status == EnquiryStatus.APPROVED)
    )
    approved_count = res_approved.scalar() or 0

    res_units = await db.execute(
        select(func.count(BhavanUnit.id)).where(BhavanUnit.status == UnitStatus.AVAILABLE)
    )
    available_units = res_units.scalar() or 0

    res_rules = await db.execute(
        select(func.count(BhavanRuleProfile.id)).where(BhavanRuleProfile.status == RuleStatus.ACTIVE)
    )
    active_rules_count = res_rules.scalar() or 0

    return {
        "pending_enquiries": pending_count,
        "today_enquiries": today_count,
        "approved_enquiries": approved_count,
        "available_units": available_units,
        "active_rules": active_rules_count,
    }


# ─── Inventory Management ─────────────────────────────────────────────────────

@router.get("/accommodation-types")
async def list_accommodation_types(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.images), selectinload(BhavanAccommodationType.units))
        .order_by(BhavanAccommodationType.sort_order)
    )
    return res.scalars().all()


@router.post("/accommodation-types")
async def create_accommodation_type(
    payload: AccommodationTypeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    acc = BhavanAccommodationType(
        name=payload.name,
        kind=payload.kind,
        description=payload.description,
        capacity_per_unit=payload.capacity_per_unit,
        base_price_per_night=payload.base_price_per_night,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
        allow_standalone_booking=payload.allow_standalone_booking,
        composition_json=payload.composition_json,
    )
    db.add(acc)
    await db.flush()

    num_units = payload.total_units if (payload.total_units is not None and payload.total_units > 0) else 1
    for i in range(1, num_units + 1):
        unit = BhavanUnit(
            accommodation_type_id=acc.id,
            label=f"Room {i:02d}" if num_units < 100 else f"Room {i}",
            capacity=acc.capacity_per_unit,
            status=UnitStatus.AVAILABLE,
        )
        db.add(unit)

    await record_audit(db, admin, "CREATE", "bhavan_accommodation_types", acc.id, new_value=payload.dict())
    await db.commit()

    # Re-fetch with units loaded
    res_reload = await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.units), selectinload(BhavanAccommodationType.images))
        .where(BhavanAccommodationType.id == acc.id)
    )
    return res_reload.scalar_one()


@router.put("/accommodation-types/{type_id}")
async def update_accommodation_type(
    type_id: uuid.UUID,
    payload: AccommodationTypeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.units))
        .where(BhavanAccommodationType.id == type_id)
    )
    acc = res.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation type not found")

    old_val = {"name": acc.name, "base_price": str(acc.base_price_per_night)}
    for k, v in payload.dict(exclude={"total_units"}).items():
        setattr(acc, k, v)

    if payload.total_units is not None and payload.total_units >= 0:
        target_count = payload.total_units
        existing_units = list(acc.units or [])
        current_count = len(existing_units)

        if target_count > current_count:
            diff = target_count - current_count
            existing_labels = {u.label for u in existing_units}
            created_count = 0
            idx = 1
            while created_count < diff:
                label = f"Room {idx:02d}" if target_count < 100 else f"Room {idx}"
                if label not in existing_labels:
                    unit = BhavanUnit(
                        accommodation_type_id=acc.id,
                        label=label,
                        capacity=acc.capacity_per_unit,
                        status=UnitStatus.AVAILABLE,
                    )
                    db.add(unit)
                    existing_labels.add(label)
                    created_count += 1
                idx += 1
        elif target_count < current_count:
            units_to_remove = existing_units[target_count:]
            for u in units_to_remove:
                await db.delete(u)

    await record_audit(db, admin, "UPDATE", "bhavan_accommodation_types", acc.id, old_value=old_val, new_value=payload.dict())
    await db.commit()

    res_reload = await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.units), selectinload(BhavanAccommodationType.images))
        .where(BhavanAccommodationType.id == acc.id)
    )
    return res_reload.scalar_one()


@router.post("/units")
async def create_unit(
    payload: UnitCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    unit = BhavanUnit(
        accommodation_type_id=payload.accommodation_type_id,
        label=payload.label,
        capacity=payload.capacity,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(unit)
    await db.flush()
    await record_audit(db, admin, "CREATE", "bhavan_units", unit.id, new_value=payload.dict())
    await db.commit()
    await db.refresh(unit)
    return unit


@router.post("/units/bulk-create")
async def bulk_create_units(
    payload: BulkUnitCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    created_units = []
    for i in range(payload.count):
        num = payload.start_number + i
        label = f"{payload.prefix}{num}"
        unit = BhavanUnit(
            accommodation_type_id=payload.accommodation_type_id,
            label=label,
            capacity=payload.capacity,
            status=UnitStatus.AVAILABLE,
        )
        db.add(unit)
        created_units.append(label)

    await db.flush()
    await record_audit(db, admin, "BULK_CREATE", "bhavan_units", new_value=payload.dict())
    await db.commit()
    return {"message": f"Successfully created {len(created_units)} units", "labels": created_units}


@router.delete("/accommodation-types/{type_id}")
async def delete_accommodation_type(
    type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanAccommodationType).where(BhavanAccommodationType.id == type_id))
    acc = res.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation type not found")

    old_val = {"name": acc.name}
    try:
        # Cascade delete associated physical units
        await db.execute(delete(BhavanUnit).where(BhavanUnit.accommodation_type_id == type_id))
        # Hard delete accommodation type
        await db.delete(acc)
        await record_audit(db, admin, "DELETE", "bhavan_accommodation_types", type_id, old_value=old_val)
        await db.commit()
        return {"message": "Accommodation type permanently deleted successfully"}
    except Exception as err:
        await db.rollback()
        # Fallback to soft delete if referenced by historical booking enquiries
        res_reload = await db.execute(select(BhavanAccommodationType).where(BhavanAccommodationType.id == type_id))
        target_acc = res_reload.scalar_one_or_none()
        if target_acc:
            target_acc.is_active = False
            await record_audit(db, admin, "DEACTIVATE", "bhavan_accommodation_types", type_id, old_value=old_val)
            await db.commit()
        return {"message": "Accommodation type deactivated successfully"}


@router.put("/units/{unit_id}")
async def update_unit(
    unit_id: uuid.UUID,
    payload: UnitUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanUnit).where(BhavanUnit.id == unit_id))
    unit = res.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    old_val = {"label": unit.label, "status": str(unit.status)}
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(unit, k, v)

    await record_audit(db, admin, "UPDATE", "bhavan_units", unit.id, old_value=old_val, new_value=payload.dict(exclude_unset=True))
    await db.commit()
    await db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}")
async def delete_unit(
    unit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanUnit).where(BhavanUnit.id == unit_id))
    unit = res.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    old_val = {"label": unit.label}
    await db.delete(unit)
    await record_audit(db, admin, "DELETE", "bhavan_units", unit_id, old_value=old_val)
    await db.commit()
    return {"message": "Unit deleted successfully"}


@router.get("/amenities")
async def list_amenities(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanAmenity).order_by(BhavanAmenity.sort_order))
    return res.scalars().all()


@router.post("/amenities")
async def create_amenity(
    payload: AmenityCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    amenity = BhavanAmenity(
        name=payload.name,
        description=payload.description,
        price=payload.price,
        pricing_type=payload.pricing_type,
        available_quantity=payload.available_quantity,
        allow_over_request=payload.allow_over_request,
        is_active=payload.is_active,
        allow_standalone_booking=payload.allow_standalone_booking,
        is_compulsory=payload.is_compulsory,
        sort_order=payload.sort_order,
    )
    db.add(amenity)
    await db.flush()
    await record_audit(db, admin, "CREATE", "bhavan_amenities", amenity.id, new_value=payload.dict())
    await db.commit()
    await db.refresh(amenity)
    return amenity


@router.put("/amenities/{amenity_id}")
async def update_amenity(
    amenity_id: uuid.UUID,
    payload: AmenityCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanAmenity).where(BhavanAmenity.id == amenity_id))
    amenity = res.scalar_one_or_none()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")

    old_val = {"name": amenity.name, "price": str(amenity.price)}
    for k, v in payload.dict().items():
        setattr(amenity, k, v)

    await record_audit(db, admin, "UPDATE", "bhavan_amenities", amenity.id, old_value=old_val, new_value=payload.dict())
    await db.commit()
    await db.refresh(amenity)
    return amenity


@router.delete("/amenities/{amenity_id}")
async def delete_amenity(
    amenity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanAmenity).where(BhavanAmenity.id == amenity_id))
    amenity = res.scalar_one_or_none()
    if not amenity:
        raise HTTPException(status_code=404, detail="Amenity not found")

    await record_audit(db, admin, "DELETE", "bhavan_amenities", amenity.id, old_value={"name": amenity.name})
    await db.delete(amenity)
    await db.commit()
    return {"message": "Amenity deleted successfully"}


@router.get("/purposes")
async def list_purposes(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanPurpose).order_by(BhavanPurpose.sort_order))
    return res.scalars().all()


@router.post("/purposes")
async def create_purpose(
    payload: PurposeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    purpose = BhavanPurpose(
        name=payload.name,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(purpose)
    await db.flush()
    await record_audit(db, admin, "CREATE", "bhavan_purposes", purpose.id, new_value=payload.dict())
    await db.commit()
    await db.refresh(purpose)
    return purpose


@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    return await get_or_create_settings(db)


@router.put("/settings")
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    settings = await get_or_create_settings(db)
    old_val = {"min_nights": settings.default_min_nights}
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(settings, k, v)

    await record_audit(db, admin, "UPDATE", "bhavan_settings", settings.id, old_value=old_val, new_value=payload.dict(exclude_unset=True))
    await db.commit()
    await db.refresh(settings)
    return settings


# ─── Vouchers & Promo Codes ───────────────────────────────────────────────────

@router.get("/vouchers")
async def list_admin_vouchers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanVoucher).order_by(BhavanVoucher.title.asc()))
    return res.scalars().all()


@router.post("/vouchers")
async def create_admin_voucher(
    payload: VoucherCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    code_clean = payload.code.strip().upper()
    res = await db.execute(select(BhavanVoucher).where(BhavanVoucher.code == code_clean))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Voucher code '{code_clean}' already exists.")

    voucher = BhavanVoucher(
        code=code_clean,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        min_booking_amount=payload.min_booking_amount,
        max_discount_amount=payload.max_discount_amount,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(voucher)
    await db.flush()
    await record_audit(db, admin, "CREATE", "bhavan_vouchers", voucher.id, new_value=payload.dict())
    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.put("/vouchers/{voucher_id}")
async def update_admin_voucher(
    voucher_id: uuid.UUID,
    payload: VoucherCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanVoucher).where(BhavanVoucher.id == voucher_id))
    voucher = res.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    code_clean = payload.code.strip().upper()
    res_dup = await db.execute(select(BhavanVoucher).where(BhavanVoucher.code == code_clean, BhavanVoucher.id != voucher_id))
    if res_dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Voucher code '{code_clean}' is already in use.")

    old_val = {"code": voucher.code, "title": voucher.title}
    for k, v in payload.dict().items():
        if k == "code":
            setattr(voucher, k, code_clean)
        else:
            setattr(voucher, k, v)

    await record_audit(db, admin, "UPDATE", "bhavan_vouchers", voucher.id, old_value=old_val, new_value=payload.dict())
    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.delete("/vouchers/{voucher_id}")
async def delete_admin_voucher(
    voucher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanVoucher).where(BhavanVoucher.id == voucher_id))
    voucher = res.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    await record_audit(db, admin, "DELETE", "bhavan_vouchers", voucher.id, old_value={"code": voucher.code})
    await db.delete(voucher)
    await db.commit()
    return {"message": "Voucher deleted successfully"}


# ─── Rule Engine & Precedence ─────────────────────────────────────────────────

@router.get("/rule-profiles")
async def list_rule_profiles(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanRuleProfile).order_by(BhavanRuleProfile.created_at.desc()))
    profiles = res.scalars().all()

    res_assigns = await db.execute(
        select(BhavanRuleAssignment)
        .options(selectinload(BhavanRuleAssignment.dates))
        .where(BhavanRuleAssignment.is_active == True)
    )
    assigns = res_assigns.scalars().all()
    assign_map: dict = {}
    for a in assigns:
        assign_map.setdefault(a.profile_id, []).append(a)

    result = []
    for p in profiles:
        p_dict = {
            "id": p.id,
            "name": p.name,
            "category": p.category.value if hasattr(p.category, "value") else str(p.category),
            "description": p.description,
            "config": p.config,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "is_template": p.is_template,
            "is_public_visible": p.is_public_visible,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "assigned_dates": sorted(list({
                d.date.isoformat()
                for a in assign_map.get(p.id, [])
                for d in a.dates
            })) if p.id in assign_map else [],
        }
        result.append(p_dict)
    return result


@router.post("/rule-profiles")
async def create_rule_profile(
    payload: RuleProfileCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    profile = BhavanRuleProfile(
        name=payload.name,
        category=payload.category,
        description=payload.description,
        config=payload.config,
        is_template=payload.is_template,
        is_public_visible=payload.is_public_visible,
        created_by=admin.user_id,
        updated_by=admin.user_id,
    )
    db.add(profile)
    await db.flush()

    resolved_dates = set()
    if payload.dates:
        resolved_dates.update(payload.dates)
    if payload.date_ranges:
        for r in payload.date_ranges:
            curr = r.start
            while curr <= r.end:
                resolved_dates.add(curr)
                curr += timedelta(days=1)

    if resolved_dates:
        assignment = BhavanRuleAssignment(
            profile_id=profile.id,
            label=profile.name,
            config_snapshot=profile.config or {},
            is_active=True,
            created_by=admin.user_id,
        )
        db.add(assignment)
        await db.flush()
        for d in sorted(resolved_dates):
            db.add(BhavanRuleAssignmentDate(assignment_id=assignment.id, date=d))

    await record_audit(db, admin, "CREATE", "bhavan_rule_profiles", profile.id, new_value=payload.dict())
    await db.commit()
    await db.refresh(profile)
    return profile


@router.put("/rule-profiles/{profile_id}")
async def update_rule_profile(
    profile_id: uuid.UUID,
    payload: RuleProfileUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanRuleProfile).where(BhavanRuleProfile.id == profile_id))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Rule profile not found")

    old_val = {"name": profile.name, "category": str(profile.category)}
    for k, v in payload.dict(exclude_unset=True, exclude={"dates", "date_ranges"}).items():
        setattr(profile, k, v)

    profile.updated_by = getattr(admin, "user_id", None)
    profile.updated_at = datetime.utcnow()

    # Always update existing assignments' config_snapshot and label to match updated profile
    res_all_a = await db.execute(select(BhavanRuleAssignment).where(BhavanRuleAssignment.profile_id == profile.id))
    for a in res_all_a.scalars().all():
        a.label = profile.name
        a.config_snapshot = profile.config or {}

    # Update dates if explicitly supplied
    if payload.dates is not None or payload.date_ranges is not None:
        resolved_dates = set()
        if payload.dates:
            resolved_dates.update(payload.dates)
        if payload.date_ranges:
            for r in payload.date_ranges:
                curr = r.start
                while curr <= r.end:
                    resolved_dates.add(curr)
                    curr += timedelta(days=1)

        res_a = await db.execute(select(BhavanRuleAssignment).where(BhavanRuleAssignment.profile_id == profile.id))
        assignment = res_a.scalar_one_or_none()
        if not assignment:
            assignment = BhavanRuleAssignment(
                profile_id=profile.id,
                label=profile.name,
                config_snapshot=profile.config or {},
                is_active=True,
                created_by=admin.user_id,
            )
            db.add(assignment)
            await db.flush()

        await db.execute(delete(BhavanRuleAssignmentDate).where(BhavanRuleAssignmentDate.assignment_id == assignment.id))
        for d in sorted(resolved_dates):
            db.add(BhavanRuleAssignmentDate(assignment_id=assignment.id, date=d))

    await record_audit(db, admin, "UPDATE", "bhavan_rule_profiles", profile.id, old_value=old_val, new_value=payload.dict(exclude_unset=True))
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/rule-profiles/{profile_id}")
async def delete_rule_profile(
    profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanRuleProfile).where(BhavanRuleProfile.id == profile_id))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Rule profile not found")

    old_val = {"name": profile.name}
    try:
        # Cascade delete rule assignments belonging to this profile
        res_assigns = await db.execute(select(BhavanRuleAssignment).where(BhavanRuleAssignment.profile_id == profile_id))
        assigns = res_assigns.scalars().all()
        for assign in assigns:
            await db.execute(delete(BhavanRuleAssignmentDate).where(BhavanRuleAssignmentDate.assignment_id == assign.id))
            await db.delete(assign)

        await db.delete(profile)
        await record_audit(db, admin, "DELETE", "bhavan_rule_profiles", profile_id, old_value=old_val)
        await db.commit()
        return {"message": "Rule profile deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Cannot delete rule profile: {str(e)}")


@router.delete("/rule-assignments/{assignment_id}")
async def delete_rule_assignment(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanRuleAssignment).where(BhavanRuleAssignment.id == assignment_id))
    assignment = res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Rule assignment not found")

    old_val = {"label": assignment.label}
    await db.execute(delete(BhavanRuleAssignmentDate).where(BhavanRuleAssignmentDate.assignment_id == assignment_id))
    await db.delete(assignment)
    await record_audit(db, admin, "DELETE", "bhavan_rule_assignments", assignment_id, old_value=old_val)
    await db.commit()
    return {"message": "Rule assignment deleted successfully"}


@router.get("/rule-assignments")
async def list_rule_assignments(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(
        select(BhavanRuleAssignment)
        .options(selectinload(BhavanRuleAssignment.dates), selectinload(BhavanRuleAssignment.profile))
        .order_by(BhavanRuleAssignment.applied_at.desc())
    )
    return res.scalars().all()


@router.post("/rule-assignments")
async def create_rule_assignment(
    payload: RuleAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanRuleProfile).where(BhavanRuleProfile.id == payload.profile_id))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Rule profile not found")

    assignment = BhavanRuleAssignment(
        profile_id=profile.id,
        label=payload.label,
        config_snapshot=profile.config,
        applied_at=datetime.utcnow(),
        applied_by=admin.user_id,
        is_active=True,
        note=payload.note,
    )
    db.add(assignment)
    await db.flush()

    all_dates = set(payload.dates or [])
    if payload.date_ranges:
        for r in payload.date_ranges:
            if r.end >= r.start:
                curr = r.start
                while curr <= r.end:
                    all_dates.add(curr)
                    curr += timedelta(days=1)

    for d in sorted(all_dates):
        ad = BhavanRuleAssignmentDate(assignment_id=assignment.id, date=d)
        db.add(ad)

    await record_audit(db, admin, "ASSIGN_RULE", "bhavan_rule_assignments", assignment.id, new_value=payload.dict())
    await db.commit()
    return assignment


@router.get("/calendar")
async def get_effective_calendar(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    """Returns day-by-day effective rule resolution & layer stack for admin calendar."""
    res_types = await db.execute(select(BhavanAccommodationType).where(BhavanAccommodationType.is_active == True))
    base_types_db = res_types.scalars().all()

    res_amenities = await db.execute(select(BhavanAmenity).where(BhavanAmenity.is_active == True))
    base_amenities_db = res_amenities.scalars().all()

    settings = await get_or_create_settings(db)
    default_conds = RuleConditions(
        min_nights=settings.default_min_nights,
        max_nights=settings.default_max_nights,
        advance_days=settings.advance_booking_days,
    )

    base_types = [
        BaseAccommodationType(id=t.id, base_price=t.base_price_per_night, is_active=t.is_active)
        for t in base_types_db
    ]
    base_amenities = [
        BaseAmenity(id=a.id, is_active=a.is_active) for a in base_amenities_db
    ]

    stmt_dates = (
        select(BhavanRuleAssignmentDate.date, BhavanRuleAssignment)
        .join(BhavanRuleAssignment, BhavanRuleAssignmentDate.assignment_id == BhavanRuleAssignment.id)
        .options(selectinload(BhavanRuleAssignment.profile))
        .where(
            BhavanRuleAssignmentDate.date >= start_date,
            BhavanRuleAssignmentDate.date <= end_date,
            BhavanRuleAssignment.is_active == True,
        )
    )
    date_rows = (await db.execute(stmt_dates)).all()

    assignments_by_date = {}
    assignment_map = {}
    for d, assignment in date_rows:
        if d not in assignments_by_date:
            assignments_by_date[d] = []
        profile_cfg = getattr(assignment.profile, "config", {}) if getattr(assignment, "profile", None) else {}
        cfg = assignment.config_snapshot if (assignment.config_snapshot and assignment.config_snapshot != {}) else profile_cfg
        assignments_by_date[d].append({
            "id": str(assignment.id),
            "applied_at": assignment.applied_at.isoformat() if assignment.applied_at else "",
            "is_active": assignment.is_active,
            "config": cfg or {},
        })
        assignment_map[str(assignment.id)] = {
            "id": str(assignment.id),
            "label": assignment.label,
            "applied_at": assignment.applied_at.isoformat() if assignment.applied_at else "",
        }

    day_states = resolve_date_range(
        check_in=start_date,
        check_out=end_date + timedelta(days=1),
        base_types=base_types,
        base_amenities=base_amenities,
        default_conditions=default_conds,
        assignments_by_date=assignments_by_date,
    )

    calendar_days = []
    for ds in day_states:
        winning_assignments = [assignment_map[str(aid)] for aid in ds.source_assignment_ids if str(aid) in assignment_map]
        calendar_days.append({
            "date": ds.date.isoformat(),
            "closed": ds.closed,
            "public_message": ds.public_message,
            "effective_layers": winning_assignments,
            "winning_rule_label": winning_assignments[-1]["label"] if winning_assignments else "Normal Day",
        })

    return calendar_days


# ─── Terms & Conditions Administration ───────────────────────────────────────

@router.get("/terms")
async def list_terms_versions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanTermsVersion).order_by(BhavanTermsVersion.created_at.desc()))
    return res.scalars().all()


@router.post("/terms")
async def create_terms_version(
    payload: TermsVersionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    terms = BhavanTermsVersion(
        version_label=payload.version_label,
        content=payload.content,
        is_published=False,
    )
    db.add(terms)
    await db.flush()
    await record_audit(db, admin, "CREATE_TERMS", "bhavan_terms_versions", terms.id, new_value=payload.dict())
    await db.commit()
    await db.refresh(terms)
    return terms


@router.post("/terms/{terms_id}/publish")
async def publish_terms_version(
    terms_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanTermsVersion).where(BhavanTermsVersion.id == terms_id))
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Terms version not found")

    # Unpublish all existing versions inside transaction
    await db.execute(update(BhavanTermsVersion).values(is_published=False))

    target.is_published = True
    target.published_at = datetime.utcnow()
    target.published_by = admin.user_id

    await record_audit(db, admin, "PUBLISH_TERMS", "bhavan_terms_versions", target.id, new_value={"version": target.version_label})
    await db.commit()
    return target


# ─── Enquiry Management & Manual Entries ─────────────────────────────────────

@router.get("/enquiries")
async def list_enquiries(
    status_filter: Optional[EnquiryStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    stmt = (
        select(BhavanEnquiry)
        .options(
            selectinload(BhavanEnquiry.accommodations),
            selectinload(BhavanEnquiry.amenities),
            selectinload(BhavanEnquiry.notes),
        )
        .order_by(BhavanEnquiry.created_at.desc())
    )

    if status_filter:
        stmt = stmt.where(BhavanEnquiry.status == status_filter)

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            (BhavanEnquiry.reference.ilike(s)) |
            (BhavanEnquiry.full_name.ilike(s)) |
            (BhavanEnquiry.mobile.ilike(s))
        )

    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/enquiries/{enquiry_id}")
async def get_enquiry_detail(
    enquiry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(
        select(BhavanEnquiry)
        .options(
            selectinload(BhavanEnquiry.accommodations),
            selectinload(BhavanEnquiry.amenities),
            selectinload(BhavanEnquiry.notes),
        )
        .where(BhavanEnquiry.id == enquiry_id)
    )
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return enq


@router.post("/enquiries/{enquiry_id}/status")
async def change_enquiry_status(
    enquiry_id: uuid.UUID,
    payload: StatusChangeRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    res = await db.execute(select(BhavanEnquiry).where(BhavanEnquiry.id == enquiry_id))
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    old_status = enq.status.value
    enq.status = payload.status
    enq.reviewed_by = admin.user_id
    enq.reviewed_at = datetime.utcnow()
    if payload.decision_reason:
        enq.decision_reason = payload.decision_reason

    await record_audit(
        db, admin.user_id, f"STATUS_CHANGE_{payload.status.value.upper()}", "bhavan_enquiries",
        enq.id, old_value={"status": old_status}, new_value={"status": payload.status.value, "reason": payload.decision_reason}
    )
    await db.commit()
    await db.refresh(enq)
    return enq


@router.post("/enquiries/{enquiry_id}/notes")
async def add_enquiry_note(
    enquiry_id: uuid.UUID,
    payload: EnquiryNoteCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    note = BhavanEnquiryNote(
        enquiry_id=enquiry_id,
        admin_id=admin.user_id,
        note=payload.note,
        created_at=datetime.utcnow(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.post("/enquiries/manual")
async def create_manual_enquiry(
    payload: ManualEnquiryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_bhavan_admin),
):
    year = datetime.utcnow().year
    ref_res = await db.execute(select(BhavanEnquiry))
    ref_count = len(ref_res.scalars().all())
    seq_num = ref_count + 1001
    reference = f"BV-{year}-{seq_num:05d}"

    enq = BhavanEnquiry(
        reference=reference,
        check_in=payload.check_in,
        check_out=payload.check_out,
        nights=(payload.check_out - payload.check_in).days,
        purpose_id=payload.purpose_id,
        full_name=payload.full_name,
        mobile=payload.mobile,
        whatsapp_number=payload.whatsapp_number,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        status=EnquiryStatus.APPROVED,  # Admin manual entries start as APPROVED so they hold inventory
        source=payload.source,
        mobile_verified=True,
        verified_at=datetime.utcnow(),
        terms_accepted=True,
        terms_accepted_at=datetime.utcnow(),
        created_by=admin.user_id,
        reviewed_by=admin.user_id,
        reviewed_at=datetime.utcnow(),
    )
    db.add(enq)
    await db.flush()

    for item in payload.accommodations:
        tid = uuid.UUID(str(item["type_id"]))
        qty = int(item["quantity"])
        t_res = await db.execute(select(BhavanAccommodationType).where(BhavanAccommodationType.id == tid))
        t_obj = t_res.scalar_one_or_none()
        if t_obj:
            line_tot = t_obj.base_price_per_night * qty * enq.nights
            acc = BhavanEnquiryAccommodation(
                enquiry_id=enq.id,
                accommodation_type_id=tid,
                type_name_snapshot=t_obj.name,
                quantity=qty,
                nights=enq.nights,
                unit_price_snapshot=t_obj.base_price_per_night,
                line_total=line_tot,
            )
            db.add(acc)

    await record_audit(db, admin, "CREATE_MANUAL_ENQUIRY", "bhavan_enquiries", enq.id, new_value={"reference": reference})
    await db.commit()
    await db.refresh(enq)
    return enq


# ─── Audit Log View ───────────────────────────────────────────────────────────

@router.get("/audit-log")
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    res = await db.execute(
        select(AuditLog)
        .where(AuditLog.target_table.like("bhavan_%"))
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
    )
    return res.scalars().all()
