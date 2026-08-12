"""Bhavan booking enquiry system.

Every table is prefixed ``bhavan_`` on purpose: the live database still carries
the previous module's ``rooms``, ``bookings``, ``vouchers`` and
``special_events`` tables, whose models were deleted but whose tables were
never dropped.

Column types are constrained to what SQLite supports, because the test suite
runs entirely on in-memory SQLite.
"""

import uuid
from datetime import date as date_type, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKey, Index, Integer,
    JSON, Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


# ─── Enums ────────────────────────────────────────────────────────────────────

class AccommodationKind(str, PyEnum):
    ROOM = "room"
    DORMITORY = "dormitory"


class UnitStatus(str, PyEnum):
    AVAILABLE = "available"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"


class AmenityPricingType(str, PyEnum):
    PER_UNIT = "per_unit"
    PER_DAY = "per_day"
    PER_NIGHT = "per_night"
    PER_BOOKING = "per_booking"
    ONE_TIME = "one_time"


class RuleCategory(str, PyEnum):
    EVENT = "event"
    PRICING = "pricing"
    DISCOUNT = "discount"
    CLOSURE = "closure"
    CUSTOM = "custom"


class RuleStatus(str, PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class EnquiryStatus(str, PyEnum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    EXPIRED = "expired"


class EnquirySource(str, PyEnum):
    ONLINE = "online"
    PHONE = "phone"
    WALK_IN = "walk_in"
    ADMIN = "admin"


#: Statuses that hold inventory. Only approved enquiries reduce what a public
#: customer can request — a pending enquiry is a request, not a claim.
HOLDING_STATUSES = (EnquiryStatus.APPROVED,)


# ─── Inventory ────────────────────────────────────────────────────────────────

class BhavanAccommodationType(Base, TimestampMixin):
    __tablename__ = "bhavan_accommodation_types"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[AccommodationKind] = mapped_column(
        Enum(AccommodationKind, name="bhavan_accommodation_kind"),
        default=AccommodationKind.ROOM, nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    capacity_per_unit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    base_price_per_night: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_standalone_booking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    composition_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    images: Mapped[List["BhavanAccommodationImage"]] = relationship(
        "BhavanAccommodationImage", back_populates="accommodation_type",
        cascade="all, delete-orphan", order_by="BhavanAccommodationImage.sort_order",
    )
    units: Mapped[List["BhavanUnit"]] = relationship(
        "BhavanUnit", back_populates="accommodation_type", cascade="all, delete-orphan",
    )


class BhavanAccommodationImage(Base, TimestampMixin):
    """Uploaded photo. ``path`` is server-relative (/uploads/bhavan/<name>);
    the bytes live in ``uploaded_files`` because the host filesystem is
    ephemeral."""
    __tablename__ = "bhavan_accommodation_images"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    accommodation_type_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_accommodation_types.id", ondelete="CASCADE"), nullable=False,
    )
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    accommodation_type: Mapped[BhavanAccommodationType] = relationship(
        "BhavanAccommodationType", back_populates="images",
    )


class BhavanUnit(Base, TimestampMixin):
    """An individual room or dormitory. The count of units with status
    AVAILABLE is the capacity used for availability maths."""
    __tablename__ = "bhavan_units"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    accommodation_type_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_accommodation_types.id", ondelete="CASCADE"), nullable=False,
    )
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[UnitStatus] = mapped_column(
        Enum(UnitStatus, name="bhavan_unit_status"),
        default=UnitStatus.AVAILABLE, nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    accommodation_type: Mapped[BhavanAccommodationType] = relationship(
        "BhavanAccommodationType", back_populates="units",
    )

    __table_args__ = (
        UniqueConstraint("accommodation_type_id", "label", name="uq_bhavan_unit_label"),
    )


class BhavanAmenity(Base, TimestampMixin):
    __tablename__ = "bhavan_amenities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    pricing_type: Mapped[AmenityPricingType] = mapped_column(
        Enum(AmenityPricingType, name="bhavan_amenity_pricing_type"),
        default=AmenityPricingType.PER_UNIT, nullable=False,
    )
    #: None means unlimited stock.
    available_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    allow_over_request: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_standalone_booking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class BhavanPurpose(Base, TimestampMixin):
    __tablename__ = "bhavan_purposes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class BhavanSettings(Base, TimestampMixin):
    """Singleton. Always read with ``get_settings_row(db)``, which creates the
    row on first access so no migration has to seed it."""
    __tablename__ = "bhavan_settings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    default_min_nights: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    default_max_nights: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    advance_booking_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    otp_ttl_seconds: Mapped[int] = mapped_column(Integer, default=600, nullable=False)
    otp_resend_cooldown_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    otp_max_attempts: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    #: {"email": false, "address": false, "city": true, ...}
    required_fields: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    intro_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ─── Rule engine ──────────────────────────────────────────────────────────────

class BhavanRuleProfile(Base, TimestampMixin):
    """A reusable rule configuration. ``config`` is validated by
    ``app.schemas.bhavan_rules.RuleConfig`` on every write."""
    __tablename__ = "bhavan_rule_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[RuleCategory] = mapped_column(
        Enum(RuleCategory, name="bhavan_rule_category"),
        default=RuleCategory.CUSTOM, nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[RuleStatus] = mapped_column(
        Enum(RuleStatus, name="bhavan_rule_status"),
        default=RuleStatus.ACTIVE, nullable=False,
    )
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_public_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )


class BhavanRuleAssignment(Base, TimestampMixin):
    """A profile applied to a named set of dates.

    ``applied_at`` is the priority key: when several assignments cover one
    date, the newest wins. ``config_snapshot`` freezes the profile as it was,
    so editing a profile never rewrites history.
    """
    __tablename__ = "bhavan_rule_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_rule_profiles.id", ondelete="RESTRICT"), nullable=False,
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    applied_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    profile: Mapped[BhavanRuleProfile] = relationship("BhavanRuleProfile")
    dates: Mapped[List["BhavanRuleAssignmentDate"]] = relationship(
        "BhavanRuleAssignmentDate", back_populates="assignment", cascade="all, delete-orphan",
    )


class BhavanRuleAssignmentDate(Base):
    """One row per calendar day. Expanding ranges this way makes 'which rules
    apply to 15 Dec' a single indexed query and 'remove 15 Dec from this rule'
    a single delete rather than a range split."""
    __tablename__ = "bhavan_rule_assignment_dates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_rule_assignments.id", ondelete="CASCADE"), nullable=False,
    )
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)

    assignment: Mapped[BhavanRuleAssignment] = relationship(
        "BhavanRuleAssignment", back_populates="dates",
    )

    __table_args__ = (
        UniqueConstraint("assignment_id", "date", name="uq_bhavan_assignment_date"),
        Index("ix_bhavan_assignment_dates_date_assignment", "date", "assignment_id"),
    )


# ─── Terms & Conditions ───────────────────────────────────────────────────────

class BhavanTermsVersion(Base, TimestampMixin):
    __tablename__ = "bhavan_terms_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    version_label: Mapped[str] = mapped_column(String(30), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )


# ─── Enquiries ────────────────────────────────────────────────────────────────

class BhavanEnquiry(Base, TimestampMixin):
    __tablename__ = "bhavan_enquiries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)

    check_in: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    check_out: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    nights: Mapped[int] = mapped_column(Integer, nullable=False)

    purpose_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bhavan_purposes.id", ondelete="SET NULL"), nullable=True,
    )
    purpose_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    guests_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    adults: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    children: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    special_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[EnquiryStatus] = mapped_column(
        Enum(EnquiryStatus, name="bhavan_enquiry_status"),
        default=EnquiryStatus.PENDING, nullable=False, index=True,
    )
    source: Mapped[EnquirySource] = mapped_column(
        Enum(EnquirySource, name="bhavan_enquiry_source"),
        default=EnquirySource.ONLINE, nullable=False,
    )

    mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    terms_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bhavan_terms_versions.id", ondelete="SET NULL"), nullable=True,
    )
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    terms_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    #: Full computed breakdown, frozen at submit time.
    quote_snapshot: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    #: Effective assignments per date. ADMIN ONLY — never serialised publicly.
    rules_snapshot: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    estimated_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    accommodations: Mapped[List["BhavanEnquiryAccommodation"]] = relationship(
        "BhavanEnquiryAccommodation", back_populates="enquiry", cascade="all, delete-orphan",
    )
    amenities: Mapped[List["BhavanEnquiryAmenity"]] = relationship(
        "BhavanEnquiryAmenity", back_populates="enquiry", cascade="all, delete-orphan",
    )
    notes: Mapped[List["BhavanEnquiryNote"]] = relationship(
        "BhavanEnquiryNote", back_populates="enquiry", cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_bhavan_enquiry_dates"),
    )


class BhavanEnquiryAccommodation(Base):
    __tablename__ = "bhavan_enquiry_accommodations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_enquiries.id", ondelete="CASCADE"), nullable=False,
    )
    accommodation_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bhavan_accommodation_types.id", ondelete="SET NULL"), nullable=True,
    )
    type_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    nights: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    enquiry: Mapped[BhavanEnquiry] = relationship("BhavanEnquiry", back_populates="accommodations")


class BhavanEnquiryAmenity(Base):
    __tablename__ = "bhavan_enquiry_amenities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_enquiries.id", ondelete="CASCADE"), nullable=False,
    )
    amenity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bhavan_amenities.id", ondelete="SET NULL"), nullable=True,
    )
    name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    pricing_type_snapshot: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    enquiry: Mapped[BhavanEnquiry] = relationship("BhavanEnquiry", back_populates="amenities")


class BhavanEnquiryNote(Base):
    __tablename__ = "bhavan_enquiry_notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bhavan_enquiries.id", ondelete="CASCADE"), nullable=False,
    )
    admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True,
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    # server_default, not default=datetime.utcnow: utcnow() returns a NAIVE
    # datetime, and storing that in a timezone=True column makes it
    # incomparable with every other timestamp in this module (all of which
    # come from TimestampMixin). It is also deprecated on Python 3.12+.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    enquiry: Mapped[BhavanEnquiry] = relationship("BhavanEnquiry", back_populates="notes")
