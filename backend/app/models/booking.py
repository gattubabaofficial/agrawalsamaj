import uuid
from datetime import date, datetime
from enum import Enum as PyEnum
from typing import List, Optional
from sqlalchemy import String, Boolean, ForeignKey, Date, DateTime, Enum, Numeric, Integer, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.event import PaymentStatus


class PaymentMode(str, PyEnum):
    UPI = "upi"
    CARD = "card"
    NETBANKING = "netbanking"
    CASH = "cash"


class BookingStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Room(Base, TimestampMixin):
    __tablename__ = "rooms"

    room_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    room_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    floor: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="room")  # 'hall', 'room', 'facility'
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    floor_plan_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    amenities: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    bookings: Mapped[List["Booking"]] = relationship(
        "Booking",
        back_populates="room",
        cascade="all, delete-orphan"
    )
    pricing_rules: Mapped[List["RoomPricingRule"]] = relationship(
        "RoomPricingRule",
        back_populates="room",
        cascade="all, delete-orphan"
    )
    booking_rules: Mapped[List["RoomBookingRule"]] = relationship(
        "RoomBookingRule",
        back_populates="room",
        cascade="all, delete-orphan"
    )


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True
    )
    guest_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    guest_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rooms.room_id", ondelete="CASCADE"),
        nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_mode: Mapped[PaymentMode] = mapped_column(
        Enum(PaymentMode, name="payment_mode"),
        default=PaymentMode.UPI,
        nullable=False
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False
    )
    booking_status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status"),
        default=BookingStatus.PENDING,
        nullable=False
    )
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Voucher applied at checkout, if any. total_amount above is already net
    # of this discount; discount_amount is kept for display/audit purposes.
    voucher_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    # Approver tracking (admin who approved/verified the payment)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    room: Mapped[Room] = relationship("Room", back_populates="bookings")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="bookings", foreign_keys=[user_id])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by])


class RoomPricingRule(Base, TimestampMixin):
    """Date-range based custom pricing for a room. Overrides the room's default
    price_per_day for bookings whose dates fall inside [start_date, end_date]."""
    __tablename__ = "room_pricing_rules"

    rule_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rooms.room_id", ondelete="CASCADE"),
        nullable=False
    )
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # e.g. "Diwali season"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    price_per_day: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # higher wins on overlap
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    room: Mapped[Room] = relationship("Room", back_populates="pricing_rules")


class RoomBookingRule(Base, TimestampMixin):
    """Minimum-stay rule: for bookings overlapping [start_date, end_date] the guest
    must book at least `min_days` days."""
    __tablename__ = "room_booking_rules"

    rule_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("rooms.room_id", ondelete="CASCADE"),
        nullable=True  # null = applies to all rooms
    )
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    min_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    room: Mapped[Optional[Room]] = relationship("Room", back_populates="booking_rules")


class SpecialEvent(Base, TimestampMixin):
    """A named window (e.g. 'New Year Special') that groups one or more date
    ranges with shared per-room special pricing/availability/stay rules.
    Takes precedence over RoomPricingRule/RoomBookingRule during its dates."""
    __tablename__ = "special_events"

    event_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Above RoomPricingRule's default priority (0), so events win on overlap.
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    # When true, rooms with no SpecialEventRoomConfig row are blocked during
    # this event's dates ("only selected room types allowed").
    block_unlisted_rooms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )

    date_ranges: Mapped[List["SpecialEventDateRange"]] = relationship(
        "SpecialEventDateRange",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    room_configs: Mapped[List["SpecialEventRoomConfig"]] = relationship(
        "SpecialEventRoomConfig",
        back_populates="event",
        cascade="all, delete-orphan"
    )


class SpecialEventDateRange(Base, TimestampMixin):
    """One of an event's date ranges (inclusive on both ends). An event can
    have several of these; they all share the event's room configs."""
    __tablename__ = "special_event_date_ranges"

    range_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("special_events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    event: Mapped[SpecialEvent] = relationship("SpecialEvent", back_populates="date_ranges")


class SpecialEventRoomConfig(Base, TimestampMixin):
    """Per-room special price/availability/stay-rules for a SpecialEvent,
    applying across all of that event's date ranges. A null special_price_per_day
    means "keep the normal price, only apply the restrictions"."""
    __tablename__ = "special_event_room_configs"
    __table_args__ = (UniqueConstraint("event_id", "room_id", name="uq_event_room_config"),)

    config_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("special_events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rooms.room_id", ondelete="CASCADE"),
        nullable=False
    )
    special_price_per_day: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    event: Mapped[SpecialEvent] = relationship("SpecialEvent", back_populates="room_configs")
    room: Mapped[Room] = relationship("Room")


class SaavaDate(Base, TimestampMixin):
    __tablename__ = "saava_dates"

    date_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    saava_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    rate_category: Mapped[str] = mapped_column(String(50), default="saava", nullable=False)
    disable_social_discount: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    disable_individual_rooms: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    disable_member_discount: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    min_stay_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    custom_rule_notice: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    date_ranges: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


