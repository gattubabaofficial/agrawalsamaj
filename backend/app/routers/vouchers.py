import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, is_admin_level
from app.models.user import User
from app.models.voucher import Voucher, DiscountType, VoucherScope
from app.services.voucher_service import apply_voucher

router = APIRouter(prefix="/api/v1/vouchers", tags=["Vouchers"])


class VoucherCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=30)
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: float = Field(..., gt=0)
    max_discount_amount: Optional[float] = Field(None, gt=0)
    min_order_amount: Optional[float] = Field(None, ge=0)
    scope: VoucherScope = VoucherScope.ALL
    usage_limit: Optional[int] = Field(None, gt=0)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True


class VoucherUpdate(BaseModel):
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = Field(None, gt=0)
    max_discount_amount: Optional[float] = Field(None, gt=0)
    min_order_amount: Optional[float] = Field(None, ge=0)
    scope: Optional[VoucherScope] = None
    usage_limit: Optional[int] = Field(None, gt=0)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class VoucherResponse(BaseModel):
    voucher_id: uuid.UUID
    code: str
    description: Optional[str]
    discount_type: DiscountType
    discount_value: float
    max_discount_amount: Optional[float]
    min_order_amount: Optional[float]
    scope: VoucherScope
    usage_limit: Optional[int]
    used_count: int
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


class VoucherValidateRequest(BaseModel):
    code: str
    amount: float = Field(..., gt=0)
    scope: str = "all"  # "booking" | "event" — which checkout is asking


@router.post("", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    data: VoucherCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    code = data.code.strip().upper()
    existing = await db.execute(select(Voucher).where(Voucher.code == code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="A voucher with this code already exists.")

    if data.discount_type == DiscountType.PERCENTAGE and data.discount_value > 100:
        raise HTTPException(status_code=400, detail="Percentage discount cannot exceed 100.")

    voucher = Voucher(
        code=code,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        max_discount_amount=data.max_discount_amount,
        min_order_amount=data.min_order_amount,
        scope=data.scope,
        usage_limit=data.usage_limit,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
        is_active=data.is_active,
        created_by=current_user.user_id,
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.get("", response_model=List[VoucherResponse])
async def list_vouchers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(Voucher).order_by(Voucher.created_at.desc()))
    return result.scalars().all()


@router.put("/{voucher_id}", response_model=VoucherResponse)
async def update_voucher(
    voucher_id: uuid.UUID,
    data: VoucherUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    voucher = (await db.execute(select(Voucher).where(Voucher.voucher_id == voucher_id))).scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    update_data = data.dict(exclude_unset=True)
    new_type = update_data.get("discount_type", voucher.discount_type)
    new_value = update_data.get("discount_value", voucher.discount_value)
    if new_type == DiscountType.PERCENTAGE and float(new_value) > 100:
        raise HTTPException(status_code=400, detail="Percentage discount cannot exceed 100.")

    for key, value in update_data.items():
        setattr(voucher, key, value)

    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.delete("/{voucher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voucher(
    voucher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")

    voucher = (await db.execute(select(Voucher).where(Voucher.voucher_id == voucher_id))).scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    await db.delete(voucher)
    await db.commit()


@router.post("/validate")
async def validate_voucher(
    data: VoucherValidateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public preview endpoint — lets checkout pages show the discount before
    the booking/registration is actually created. Does not redeem the voucher."""
    voucher, discount, error = await apply_voucher(db, data.code, data.amount, data.scope)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {
        "valid": True,
        "code": voucher.code,
        "discount_amount": discount,
        "final_amount": round(data.amount - discount, 2),
    }
