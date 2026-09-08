"""Shared voucher validation/discount logic used by Bhavan bookings and
event registrations, so checkout flows remain consistent."""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Tuple, Any
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import BhavanVoucher


def _to_date(dt: Optional[Any]) -> Optional[date]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.date()
    if isinstance(dt, date):
        return dt
    return None


async def get_voucher_by_code(db: AsyncSession, code: str) -> Optional[BhavanVoucher]:
    if not code:
        return None
    result = await db.execute(select(BhavanVoucher).where(BhavanVoucher.code == code.strip().upper()))
    return result.scalar_one_or_none()


def voucher_error(voucher: Optional[BhavanVoucher], amount: float, scope: str = "all") -> Optional[str]:
    """Return a human-readable reason the voucher cannot be used, or None if valid."""
    if not voucher:
        return "Invalid voucher code."
    if not voucher.is_active:
        return "This voucher is no longer active."

    today = datetime.utcnow().date()
    valid_from = _to_date(voucher.valid_from)
    valid_until = _to_date(voucher.valid_until)

    if valid_from and today < valid_from:
        return "This voucher is not active yet."
    if valid_until and today > valid_until:
        return "This voucher has expired."

    if voucher.min_booking_amount and amount < float(voucher.min_booking_amount):
        return f"Minimum order amount for this voucher is ₹{float(voucher.min_booking_amount):,.2f}."

    return None


def compute_discount(voucher: BhavanVoucher, amount: float) -> float:
    """Calculate discount amount in rupees. Never exceeds order total."""
    val = float(voucher.discount_value)
    if voucher.discount_type == "percentage":
        discount = amount * val / 100.0
        if voucher.max_discount_amount is not None:
            discount = min(discount, float(voucher.max_discount_amount))
    else:
        discount = val
    return round(min(discount, amount), 2)


async def apply_voucher(
    db: AsyncSession,
    code: str,
    amount: float,
    scope: str = "all"
) -> Tuple[Optional[BhavanVoucher], float, Optional[str]]:
    """Validate a voucher against an order amount and return (voucher, discount, error)."""
    voucher = await get_voucher_by_code(db, code)
    error = voucher_error(voucher, amount, scope)
    if error:
        return None, 0.0, error
    return voucher, compute_discount(voucher, amount), None


def redeem_voucher(voucher: Any) -> None:
    """Record voucher usage if tracking is enabled."""
    if hasattr(voucher, "used_count"):
        voucher.used_count += 1
