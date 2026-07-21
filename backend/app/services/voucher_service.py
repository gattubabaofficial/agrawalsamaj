"""Shared voucher validation/discount logic used by both Bhavan bookings and
event registrations, so the two checkout flows can't drift out of sync."""
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.voucher import Voucher, DiscountType, VoucherScope


def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


async def get_voucher_by_code(db: AsyncSession, code: str) -> Optional[Voucher]:
    if not code:
        return None
    result = await db.execute(select(Voucher).where(Voucher.code == code.strip().upper()))
    return result.scalar_one_or_none()


def voucher_error(voucher: Optional[Voucher], amount: float, scope: str) -> Optional[str]:
    """Return a human-readable reason the voucher can't be used, or None if it's valid."""
    if not voucher:
        return "Invalid voucher code."
    if not voucher.is_active:
        return "This voucher is no longer active."

    now = datetime.utcnow()
    valid_from = _naive(voucher.valid_from)
    valid_until = _naive(voucher.valid_until)
    if valid_from and now < valid_from:
        return "This voucher is not active yet."
    if valid_until and now > valid_until:
        return "This voucher has expired."

    if voucher.usage_limit is not None and voucher.used_count >= voucher.usage_limit:
        return "This voucher has reached its usage limit."

    if voucher.scope != VoucherScope.ALL and voucher.scope.value != scope:
        return f"This voucher is not valid for {scope} bookings."

    if voucher.min_order_amount and amount < float(voucher.min_order_amount):
        return f"Minimum order amount for this voucher is ₹{float(voucher.min_order_amount):,.2f}."

    return None


def compute_discount(voucher: Voucher, amount: float) -> float:
    """Rupee amount to knock off `amount`. Never exceeds the order total."""
    if voucher.discount_type == DiscountType.PERCENTAGE:
        discount = amount * float(voucher.discount_value) / 100.0
        if voucher.max_discount_amount is not None:
            discount = min(discount, float(voucher.max_discount_amount))
    else:
        discount = float(voucher.discount_value)
    return round(min(discount, amount), 2)


async def apply_voucher(db: AsyncSession, code: str, amount: float, scope: str):
    """Validate a voucher against an order and return (voucher, discount, error).

    Does NOT increment used_count — call `redeem_voucher` once the order this
    discount is attached to actually commits, so an abandoned checkout doesn't
    burn a redemption.
    """
    voucher = await get_voucher_by_code(db, code)
    error = voucher_error(voucher, amount, scope)
    if error:
        return None, 0.0, error
    return voucher, compute_discount(voucher, amount), None


def redeem_voucher(voucher: Voucher) -> None:
    voucher.used_count += 1
