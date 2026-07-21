import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Enum, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class DiscountType(str, PyEnum):
    PERCENTAGE = "percentage"
    FLAT = "flat"


class VoucherScope(str, PyEnum):
    ALL = "all"
    BOOKING = "booking"
    EVENT = "event"


class Voucher(Base, TimestampMixin):
    __tablename__ = "vouchers"

    voucher_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, name="voucher_discount_type"), nullable=False
    )
    # Percentage (0-100) or a flat rupee amount, depending on discount_type.
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    # Caps how much a percentage discount can knock off in rupees. Ignored for flat vouchers.
    max_discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    # Order must be at least this much (pre-discount) for the voucher to apply.
    min_order_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    scope: Mapped[VoucherScope] = mapped_column(
        Enum(VoucherScope, name="voucher_scope"), default=VoucherScope.ALL, nullable=False
    )

    # Total redemptions allowed across all users; null = unlimited.
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
