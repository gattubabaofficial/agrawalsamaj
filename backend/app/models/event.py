import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum, Numeric, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class EventStatus(str, PyEnum):
    DRAFT = "draft"
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventCategory(str, PyEnum):
    CULTURAL = "cultural"
    RELIGIOUS = "religious"
    SPORTS = "sports"
    SOCIAL = "social"
    EDUCATIONAL = "educational"
    OTHER = "other"


class EventVisibility(str, PyEnum):
    OPEN_TO_ALL = "open_to_all"
    MEMBERS_ONLY = "members_only"


class EventPricingType(str, PyEnum):
    FREE = "free"
    PAID = "paid"


class EventPaymentMode(str, PyEnum):
    PAY_ONLINE = "pay_online"
    PAY_AT_VENUE = "pay_at_venue"


class PaymentStatus(str, PyEnum):
    NOT_APPLICABLE = "not_applicable"
    PENDING = "pending"
    PAID = "paid"
    VERIFIED = "verified"
    FAILED = "failed"
    REFUNDED = "refunded"


class PassStatus(str, PyEnum):
    UNUSED = "unused"
    USED = "used"


class MediaType(str, PyEnum):
    PHOTO = "photo"
    VIDEO = "video"


class DocType(str, PyEnum):
    BROCHURE = "brochure"
    INSTRUCTIONS = "instructions"
    RULES = "rules"


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    event_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    banner_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    organizer_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    venue: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    category: Mapped[EventCategory] = mapped_column(
        Enum(EventCategory, name="event_category"),
        default=EventCategory.OTHER,
        nullable=False
    )
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    registration_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pass_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    total_passes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    passes_sold: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_per_user: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"),
        default=EventStatus.DRAFT,
        nullable=False
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    visibility: Mapped[EventVisibility] = mapped_column(
        Enum(EventVisibility, name="event_visibility"),
        default=EventVisibility.OPEN_TO_ALL,
        nullable=False
    )
    pricing_type: Mapped[EventPricingType] = mapped_column(
        Enum(EventPricingType, name="event_pricing_type"),
        default=EventPricingType.FREE,
        nullable=False
    )
    
    timeline: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Relationships
    schedule: Mapped[Optional["EventSchedule"]] = relationship(
        "EventSchedule",
        back_populates="event",
        uselist=False,
        cascade="all, delete-orphan"
    )
    gallery: Mapped[List["EventGallery"]] = relationship(
        "EventGallery",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    documents: Mapped[List["EventDocument"]] = relationship(
        "EventDocument",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    registrations: Mapped[List["EventRegistration"]] = relationship(
        "EventRegistration",
        back_populates="event",
        cascade="all, delete-orphan"
    )


class EventSchedule(Base):
    __tablename__ = "event_schedules"

    schedule_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    program_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    guest_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cultural_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    food_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closing_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    custom_slots: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    event: Mapped[Event] = relationship("Event", back_populates="schedule")


class EventGallery(Base):
    __tablename__ = "event_gallery"

    gallery_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    media_url: Mapped[str] = mapped_column(String(500), nullable=False)
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type"),
        default=MediaType.PHOTO,
        nullable=False
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    event: Mapped[Event] = relationship("Event", back_populates="gallery")


class EventDocument(Base):
    __tablename__ = "event_documents"

    doc_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    doc_type: Mapped[DocType] = mapped_column(
        Enum(DocType, name="doc_type"),
        nullable=False
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    event: Mapped[Event] = relationship("Event", back_populates="documents")


class EventRegistration(Base, TimestampMixin):
    __tablename__ = "event_registrations"

    registration_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True
    )
    guest_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    guest_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    guest_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    pass_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    payment_mode: Mapped[Optional[EventPaymentMode]] = mapped_column(
        Enum(EventPaymentMode, name="event_payment_mode"),
        nullable=True
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False
    )
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    qr_code: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    qr_delivered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Voucher applied at checkout, if any. total_amount above is already net
    # of this discount; discount_amount is kept for display/audit purposes.
    voucher_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    # Approver tracking (admin who approved/verified a cash / pay-at-venue payment)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Check-in / Attendance
    attended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scanned_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    event: Mapped[Event] = relationship("Event", back_populates="registrations")
    user: Mapped["User"] = relationship("User", back_populates="event_registrations", foreign_keys=[user_id])
    passes: Mapped[List["EventPass"]] = relationship(
        "EventPass",
        back_populates="registration",
        cascade="all, delete-orphan"
    )

class EventPass(Base, TimestampMixin):
    __tablename__ = "event_passes"

    pass_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    registration_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("event_registrations.registration_id", ondelete="CASCADE"),
        nullable=False
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.event_id", ondelete="CASCADE"),
        nullable=False
    )
    qr_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[PassStatus] = mapped_column(
        Enum(PassStatus, name="pass_status"),
        default=PassStatus.UNUSED,
        nullable=False
    )
    whatsapp_message_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    delivery_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    registration: Mapped[EventRegistration] = relationship("EventRegistration", back_populates="passes")
    event: Mapped[Event] = relationship("Event")
