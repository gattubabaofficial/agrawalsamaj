import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Enum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class ReceiptType(str, PyEnum):
    BOOKING = "BOOKING"          # Bhavan booking receipt
    EVENT = "EVENT"              # Event registration / pass
    DONATION = "DONATION"        # Donation receipt


class Receipt(Base, TimestampMixin):
    """A payment receipt for event registration or donation.
    Generated automatically when a payment is verified."""
    __tablename__ = "receipts"

    receipt_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    receipt_type: Mapped[ReceiptType] = mapped_column(
        Enum(ReceiptType, name="receipt_type"),
        nullable=False
    )

    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bookings.booking_id", ondelete="CASCADE"),
        nullable=True
    )

    registration_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("event_registrations.registration_id", ondelete="CASCADE"),
        nullable=True
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    payer_name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_offline: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Admin who issued/approved (for offline payments)
    issued_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    issued_by_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
    issuer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[issued_by])
