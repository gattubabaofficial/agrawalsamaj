# Bhavan Booking Enquiry System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login Bhavan booking *enquiry* system with an admin-configurable rule engine that decides availability, pricing and restrictions per date.

**Architecture:** A pure rule resolver (`services/bhavan_rules.py`, no I/O) layers dated rule assignments oldest-to-newest so the newest wins. A quote service wraps it with inventory counting and price calculation. Public and admin routers sit on top, sharing the same resolver so the customer view and the admin calendar can never disagree. Every enquiry stores a frozen snapshot of the prices, names and rules it depended on.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async (`Mapped`/`mapped_column`), Pydantic v2, pytest + pytest-asyncio (`asyncio_mode = auto`), Next.js 16 App Router, React 19, Tailwind v4, axios, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-08-11-bhavan-booking-enquiry-system-design.md`

## Global Constraints

- **All tables are prefixed `bhavan_`.** The live database still carries old `rooms`, `bookings`, `vouchers`, `special_events` tables whose models were deleted but whose tables were never dropped. Prefixing avoids collision.
- **Schema is created by `Base.metadata.create_all`** at startup (`backend/app/main.py`), *not* by Alembic alone. New models must be imported in `main.py:on_startup` AND `app/models/__init__.py`. Columns added to *pre-existing* tables need an idempotent `ALTER TABLE` string in the `for ddl in (...)` tuple in `main.py`.
- **Tests run against in-memory SQLite** (`conftest.py`). Every column type must work on SQLite: use `JSON`, `Numeric`, `Date`, `DateTime(timezone=True)`, and `Mapped[uuid.UUID]`. Do not use Postgres-only types (`ARRAY`, `JSONB`, `tsvector`).
- **Routers use `get_db` from `app.dependencies`** (not `get_db_session`). The `client` fixture overrides both, but staying on `get_db` matches the majority convention.
- **Pydantic schemas live in the router file** in this codebase. Bhavan is the one documented exception: it uses `backend/app/schemas/` because the public/admin response split is a security boundary the spec depends on, and burying it in a 2,000-line router works against that. Note the deviation in the module docstring.
- **Money is `Decimal`**, quantised to 2 places with `ROUND_HALF_UP`. Never `float`. Columns are `Numeric(10, 2)`.
- **Uploads** write bytes to the `uploaded_files` table (durable) *and* to `uploads/bhavan/` on disk (fast path). Hosting filesystems here are ephemeral — the DB copy is what survives a deploy. Return a server-relative path `/uploads/bhavan/<name>`; the frontend renders it through `mediaUrl()` from `@/utils/media`.
- **Admin permission key is `manage_bhavan`**, already present in `ALLOWED_PERMISSIONS` (`backend/app/routers/role.py:16`).
- **Public responses must never contain** `rule`, `assignment`, `applied_at`, `priority`, `profile`, `snapshot`, `internal` keys. Enforced by `test_bhavan_public_leakage.py`.
- **Customer-facing amount wording is "Estimated Booking Amount"** — never "Total" or "Price" in a way that implies confirmation.
- **Backend test command:** `cd backend && python -m pytest tests/<file> -v`
- **Frontend test command:** `cd frontend && npm test -- <path>`

---

# Phase 1 — Foundation

### Task 1: Bhavan data model

**Files:**
- Create: `backend/app/models/bhavan.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py:35-38` (startup imports), `backend/app/main.py:41+` (ALTER tuple)
- Test: `backend/tests/test_bhavan_models.py`

**Interfaces:**
- Consumes: `app.database.Base`, `app.models.base.TimestampMixin`
- Produces: model classes `BhavanAccommodationType`, `BhavanAccommodationImage`, `BhavanUnit`, `BhavanAmenity`, `BhavanPurpose`, `BhavanSettings`, `BhavanRuleProfile`, `BhavanRuleAssignment`, `BhavanRuleAssignmentDate`, `BhavanTermsVersion`, `BhavanEnquiry`, `BhavanEnquiryAccommodation`, `BhavanEnquiryAmenity`, `BhavanEnquiryNote`; enums `AccommodationKind`, `UnitStatus`, `AmenityPricingType`, `RuleCategory`, `RuleStatus`, `EnquiryStatus`, `EnquirySource`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_models.py`:

```python
"""The Bhavan schema must round-trip on SQLite, because that is what the test
suite runs on. A Postgres-only column type here fails every later test file."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind,
    AmenityPricingType,
    BhavanAccommodationType,
    BhavanAmenity,
    BhavanRuleAssignment,
    BhavanRuleAssignmentDate,
    BhavanRuleProfile,
    BhavanUnit,
    RuleCategory,
    RuleStatus,
    UnitStatus,
)


async def test_accommodation_type_with_units_round_trips(db_session: AsyncSession):
    ac_room = BhavanAccommodationType(
        name="AC Room",
        kind=AccommodationKind.ROOM,
        capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
        sort_order=1,
    )
    db_session.add(ac_room)
    await db_session.flush()

    db_session.add_all([
        BhavanUnit(accommodation_type_id=ac_room.id, label="101", status=UnitStatus.AVAILABLE),
        BhavanUnit(accommodation_type_id=ac_room.id, label="102", status=UnitStatus.MAINTENANCE),
    ])
    await db_session.commit()

    loaded = (await db_session.execute(
        select(BhavanAccommodationType).where(BhavanAccommodationType.id == ac_room.id)
    )).scalar_one()
    assert loaded.base_price_per_night == Decimal("1500.00")
    assert loaded.kind is AccommodationKind.ROOM

    units = (await db_session.execute(
        select(BhavanUnit).where(BhavanUnit.accommodation_type_id == ac_room.id)
    )).scalars().all()
    assert {u.label for u in units} == {"101", "102"}
    assert sum(1 for u in units if u.status is UnitStatus.AVAILABLE) == 1


async def test_amenity_pricing_types_are_distinct(db_session: AsyncSession):
    db_session.add_all([
        BhavanAmenity(name="Plastic Chair", price=Decimal("10.00"),
                      pricing_type=AmenityPricingType.PER_UNIT, available_quantity=500),
        BhavanAmenity(name="Cooler", price=Decimal("500.00"),
                      pricing_type=AmenityPricingType.PER_DAY, available_quantity=6),
        BhavanAmenity(name="Cleaning", price=Decimal("1000.00"),
                      pricing_type=AmenityPricingType.ONE_TIME, available_quantity=None),
    ])
    await db_session.commit()

    rows = (await db_session.execute(select(BhavanAmenity))).scalars().all()
    by_name = {a.name: a for a in rows}
    assert by_name["Plastic Chair"].pricing_type is AmenityPricingType.PER_UNIT
    assert by_name["Cooler"].pricing_type is AmenityPricingType.PER_DAY
    assert by_name["Cleaning"].available_quantity is None, "null = unlimited"


async def test_rule_assignment_stores_config_snapshot_and_dates(db_session: AsyncSession):
    """The snapshot is what makes profile edits non-retroactive."""
    profile = BhavanRuleProfile(
        name="Wedding",
        category=RuleCategory.EVENT,
        status=RuleStatus.ACTIVE,
        config={"conditions": {"min_nights": 2}},
    )
    db_session.add(profile)
    await db_session.flush()

    assignment = BhavanRuleAssignment(
        profile_id=profile.id,
        label="Wedding Dates 2027",
        config_snapshot={"conditions": {"min_nights": 2}},
        applied_at=datetime(2026, 8, 11, 10, 0, tzinfo=timezone.utc),
    )
    db_session.add(assignment)
    await db_session.flush()

    db_session.add_all([
        BhavanRuleAssignmentDate(assignment_id=assignment.id, date=date(2026, 12, 10)),
        BhavanRuleAssignmentDate(assignment_id=assignment.id, date=date(2026, 12, 11)),
    ])
    await db_session.commit()

    # Editing the profile must not touch the snapshot.
    profile.config = {"conditions": {"min_nights": 5}}
    await db_session.commit()

    loaded = (await db_session.execute(
        select(BhavanRuleAssignment).where(BhavanRuleAssignment.id == assignment.id)
    )).scalar_one()
    assert loaded.config_snapshot == {"conditions": {"min_nights": 2}}

    dates = (await db_session.execute(
        select(BhavanRuleAssignmentDate).where(
            BhavanRuleAssignmentDate.assignment_id == assignment.id
        )
    )).scalars().all()
    assert {d.date for d in dates} == {date(2026, 12, 10), date(2026, 12, 11)}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.bhavan'`

- [ ] **Step 3: Write the models**

Create `backend/app/models/bhavan.py`:

```python
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
    JSON, Numeric, String, Text, UniqueConstraint,
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False,
    )

    enquiry: Mapped[BhavanEnquiry] = relationship("BhavanEnquiry", back_populates="notes")
```

- [ ] **Step 4: Register the models**

In `backend/app/models/__init__.py`, add after the `blog` import line:

```python
from app.models.bhavan import (
    BhavanAccommodationType, BhavanAccommodationImage, BhavanUnit, BhavanAmenity,
    BhavanPurpose, BhavanSettings, BhavanRuleProfile, BhavanRuleAssignment,
    BhavanRuleAssignmentDate, BhavanTermsVersion, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanEnquiryNote,
    AccommodationKind, UnitStatus, AmenityPricingType, RuleCategory, RuleStatus,
    EnquiryStatus, EnquirySource,
)
```

and append every one of those names to the `__all__` list.

In `backend/app/main.py`, inside `on_startup`, add alongside the other model imports (currently `import app.models.blog` at line 38):

```python
    import app.models.bhavan
```

In the same function's `for ddl in (...)` tuple, add:

```python
        "ALTER TABLE phone_otp_requests ADD COLUMN purpose VARCHAR(40) DEFAULT 'generic'",
```

- [ ] **Step 5: Add the `purpose` column to the OTP model**

In `backend/app/models/user.py`, in `PhoneOTPRequest`, add after `verified`:

```python
    #: Scopes an OTP to a flow. A login OTP must never satisfy a Bhavan
    #: enquiry, and vice versa.
    purpose: Mapped[str] = mapped_column(String(40), default="generic", nullable=False)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_models.py -v`
Expected: 3 passed

Then confirm nothing else broke: `cd backend && python -m pytest tests/ -v`
Expected: all pass

- [ ] **Step 7: Add the Alembic revision**

Create `backend/alembic/versions/b1c2d3e4f5a6_add_bhavan_booking_enquiry_system.py` with `revision = "b1c2d3e4f5a6"`, `down_revision` set to the current head (find it with `cd backend && python -m alembic heads`), and an `upgrade()` that creates all fourteen `bhavan_*` tables plus the `phone_otp_requests.purpose` column, mirroring the model definitions above. `downgrade()` drops them in reverse dependency order.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/bhavan.py backend/app/models/__init__.py backend/app/models/user.py backend/app/main.py backend/alembic/versions/b1c2d3e4f5a6_add_bhavan_booking_enquiry_system.py backend/tests/test_bhavan_models.py
git commit -m "feat(bhavan): add booking enquiry data model"
```

---

### Task 2: Rule config schema

**Files:**
- Create: `backend/app/schemas/__init__.py`, `backend/app/schemas/bhavan_rules.py`
- Test: `backend/tests/test_bhavan_rule_config.py`

**Interfaces:**
- Consumes: nothing
- Produces: `RuleConfig`, `AvailabilityConfig`, `PricingConfig`, `ConditionsConfig`, `PurposesConfig`, `PricingMode` (str enum), `ConflictBehaviour` (str enum), and `parse_config(raw: dict) -> RuleConfig`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_rule_config.py`:

```python
"""The rule config is a JSON column, so validation is the only thing standing
between an admin typo and a wrong price for a customer."""

import pytest
from pydantic import ValidationError

from app.schemas.bhavan_rules import ConflictBehaviour, PricingMode, parse_config


def test_empty_config_is_valid_and_expresses_no_opinion():
    """A rule that sets nothing must leave every earlier layer standing."""
    config = parse_config({})
    assert config.availability.closed is False
    assert config.availability.default_accommodation is None
    assert config.pricing.mode is PricingMode.NONE
    assert config.conditions.min_nights is None
    assert config.purposes.expresses_opinion() is False


def test_full_wedding_config_parses():
    config = parse_config({
        "availability": {"closed": False, "accommodation": {}},
        "pricing": {"mode": "increase_percent", "value": 50,
                    "conflict_behaviour": "replace_base"},
        "conditions": {"min_nights": 2, "min_units": 2},
        "purposes": {"default": "blocked", "allowed": []},
        "public_message": "Wedding season rates apply.",
    })
    assert config.pricing.mode is PricingMode.INCREASE_PERCENT
    assert config.pricing.value == 50
    assert config.pricing.conflict_behaviour is ConflictBehaviour.REPLACE_BASE
    assert config.conditions.min_nights == 2
    assert config.public_message == "Wedding season rates apply."


def test_percentage_discount_above_100_is_rejected():
    with pytest.raises(ValidationError):
        parse_config({"pricing": {"mode": "discount_percent", "value": 150}})


def test_negative_condition_is_rejected():
    with pytest.raises(ValidationError):
        parse_config({"conditions": {"min_nights": -1}})


def test_unknown_pricing_mode_is_rejected():
    with pytest.raises(ValidationError):
        parse_config({"pricing": {"mode": "make_it_free"}})


def test_max_below_min_is_rejected():
    with pytest.raises(ValidationError):
        parse_config({"conditions": {"min_nights": 5, "max_nights": 2}})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_rule_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas'`

- [ ] **Step 3: Write the schema**

Create `backend/app/schemas/__init__.py` (empty file) and `backend/app/schemas/bhavan_rules.py`:

```python
"""Validation for the Bhavan rule config JSON column.

This module lives in ``app/schemas/`` rather than inline in the router — the
one place in this codebase that does. The public/admin response split is a
security boundary, and burying it in a 2,000-line router works against that.

Every field is optional by design. An absent field means "this rule expresses
no opinion", and the value from the layer beneath survives. That is what lets
a pure discount rule compose on top of a pricing rule.
"""

import uuid
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Allowance(str, Enum):
    ALLOWED = "allowed"
    BLOCKED = "blocked"


class PricingMode(str, Enum):
    NONE = "none"
    FIXED = "fixed"
    INCREASE_PERCENT = "increase_percent"
    INCREASE_AMOUNT = "increase_amount"
    DISCOUNT_PERCENT = "discount_percent"
    DISCOUNT_AMOUNT = "discount_amount"


class ConflictBehaviour(str, Enum):
    #: Compute from the accommodation type's base price, discarding earlier
    #: pricing layers.
    REPLACE_BASE = "replace_base"
    #: Compound on the price the earlier layers already produced.
    ADJUST_CURRENT = "adjust_current"


PERCENT_MODES = frozenset({PricingMode.INCREASE_PERCENT, PricingMode.DISCOUNT_PERCENT})


class AvailabilityConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    closed: bool = False
    #: None means "no opinion" — types not listed keep whatever the layer
    #: beneath decided. This matters: without it, a plain discount rule
    #: applied after a maintenance closure would silently re-open the rooms.
    default_accommodation: Optional[Allowance] = None
    accommodation: Dict[uuid.UUID, Allowance] = Field(default_factory=dict)
    default_amenities: Optional[Allowance] = None
    amenities: Dict[uuid.UUID, Allowance] = Field(default_factory=dict)


class TypePricing(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: PricingMode = PricingMode.NONE
    value: Decimal = Decimal("0")

    @model_validator(mode="after")
    def _check_percent_bounds(self) -> "TypePricing":
        return _validate_percent(self)


class PricingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: PricingMode = PricingMode.NONE
    value: Decimal = Decimal("0")
    #: Per-accommodation-type override of ``mode``/``value``.
    per_type: Dict[uuid.UUID, TypePricing] = Field(default_factory=dict)
    conflict_behaviour: ConflictBehaviour = ConflictBehaviour.REPLACE_BASE

    @model_validator(mode="after")
    def _check_percent_bounds(self) -> "PricingConfig":
        return _validate_percent(self)


def _validate_percent(obj):
    """A discount over 100% would produce a negative price; an increase over
    1000% is far likelier to be a typo than an intention."""
    if obj.mode in PERCENT_MODES:
        if obj.value < 0:
            raise ValueError("Percentage value cannot be negative")
        if obj.mode is PricingMode.DISCOUNT_PERCENT and obj.value > 100:
            raise ValueError("A discount cannot exceed 100%")
        if obj.mode is PricingMode.INCREASE_PERCENT and obj.value > 1000:
            raise ValueError("An increase above 1000% is almost certainly a typo")
    elif obj.value < 0:
        raise ValueError("Pricing value cannot be negative")
    return obj


class ConditionsConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min_nights: Optional[int] = Field(default=None, ge=0)
    max_nights: Optional[int] = Field(default=None, ge=0)
    min_units: Optional[int] = Field(default=None, ge=0)
    max_units: Optional[int] = Field(default=None, ge=0)
    min_guests: Optional[int] = Field(default=None, ge=0)
    max_guests: Optional[int] = Field(default=None, ge=0)
    advance_days: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _check_ranges(self) -> "ConditionsConfig":
        for lo, hi, label in (
            (self.min_nights, self.max_nights, "nights"),
            (self.min_units, self.max_units, "units"),
            (self.min_guests, self.max_guests, "guests"),
        ):
            if lo is not None and hi is not None and hi < lo:
                raise ValueError(f"Maximum {label} cannot be below minimum {label}")
        return self


class PurposesConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    #: None means "no opinion", same as AvailabilityConfig above.
    default: Optional[Allowance] = None
    allowed: List[uuid.UUID] = Field(default_factory=list)
    blocked: List[uuid.UUID] = Field(default_factory=list)

    def expresses_opinion(self) -> bool:
        return self.default is not None or bool(self.allowed) or bool(self.blocked)


class RuleConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    availability: AvailabilityConfig = Field(default_factory=AvailabilityConfig)
    pricing: PricingConfig = Field(default_factory=PricingConfig)
    conditions: ConditionsConfig = Field(default_factory=ConditionsConfig)
    purposes: PurposesConfig = Field(default_factory=PurposesConfig)
    #: The ONLY rule content a customer may ever see.
    public_message: Optional[str] = Field(default=None, max_length=500)


def parse_config(raw: Optional[dict]) -> RuleConfig:
    """Validate a stored or submitted rule config. Raises ValidationError."""
    return RuleConfig.model_validate(raw or {})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_rule_config.py -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/ backend/tests/test_bhavan_rule_config.py
git commit -m "feat(bhavan): add validated rule config schema"
```

---

# Phase 2 — Rule engine

### Task 3: Per-day rule resolver

The heart of the module. It takes **no database session** — it receives already-loaded rules and returns resolved state, so the whole override matrix is testable as pure input/output with no fixtures.

**Files:**
- Create: `backend/app/services/bhavan_rules.py`
- Test: `backend/tests/test_bhavan_rules.py`

**Interfaces:**
- Consumes: `app.schemas.bhavan_rules.RuleConfig`, `PricingMode`, `ConflictBehaviour`, `Allowance`
- Produces: dataclasses `TypeState`, `Conditions`, `DayState`, `AppliedRule`, `Baseline`; functions `resolve_day(day, rules, baseline) -> DayState`, `apply_pricing(base, current, mode, value, behaviour) -> Decimal`, `money(value) -> Decimal`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_rules.py`:

```python
"""Rule resolution, tested as pure input/output. No database, no fixtures.

The PRD's own worked examples (sections 19, 22, 25, 39) appear here verbatim
as test cases — they are the requirements' statement of correct behaviour.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.schemas.bhavan_rules import ConflictBehaviour, PricingMode, parse_config
from app.services.bhavan_rules import (
    AppliedRule, Baseline, apply_pricing, resolve_day,
)

AC_ROOM = uuid.uuid4()
NONAC_ROOM = uuid.uuid4()
AC_DORM = uuid.uuid4()
NONAC_DORM = uuid.uuid4()
CHAIRS = uuid.uuid4()
WEDDING_PURPOSE = uuid.uuid4()
SOCIAL_PURPOSE = uuid.uuid4()

BASE = datetime(2026, 8, 11, 10, 0, tzinfo=timezone.utc)
DAY = date(2026, 12, 15)

BASELINE = Baseline(
    base_prices={
        AC_ROOM: Decimal("1500.00"),
        NONAC_ROOM: Decimal("1000.00"),
        AC_DORM: Decimal("3000.00"),
        NONAC_DORM: Decimal("2000.00"),
    },
    amenity_ids=frozenset({CHAIRS}),
    purpose_ids=frozenset({WEDDING_PURPOSE, SOCIAL_PURPOSE}),
    default_min_nights=1,
)


def rule(label: str, config: dict, minutes_after_base: int = 0) -> AppliedRule:
    return AppliedRule(
        assignment_id=uuid.uuid4(),
        label=label,
        applied_at=BASE + timedelta(minutes=minutes_after_base),
        config=parse_config(config),
    )


# ─── Baseline behaviour (PRD section 47) ──────────────────────────────────────

def test_no_rules_gives_base_prices_and_everything_allowed():
    state = resolve_day(DAY, [], BASELINE)
    assert state.closed is False
    assert state.accommodation[AC_ROOM].allowed is True
    assert state.accommodation[AC_ROOM].price == Decimal("1500.00")
    assert state.conditions.min_nights == 1
    assert state.allowed_purpose_ids == BASELINE.purpose_ids
    assert state.source_assignment_ids == ()


# ─── Override ordering (PRD sections 19, 21) ──────────────────────────────────

def test_newer_maintenance_rule_beats_older_wedding_rule():
    wedding = rule("Wedding", {
        "pricing": {"mode": "increase_percent", "value": 50},
        "conditions": {"min_nights": 2},
    }, minutes_after_base=0)
    maintenance = rule("Maintenance", {"availability": {"closed": True}},
                       minutes_after_base=5)

    state = resolve_day(DAY, [wedding, maintenance], BASELINE)

    assert state.closed is True
    assert all(not t.allowed for t in state.accommodation.values())


def test_resolution_is_independent_of_input_order():
    """The resolver sorts by applied_at; callers must not have to."""
    wedding = rule("Wedding", {"availability": {"closed": False}}, 0)
    maintenance = rule("Maintenance", {"availability": {"closed": True}}, 5)

    assert resolve_day(DAY, [wedding, maintenance], BASELINE).closed is True
    assert resolve_day(DAY, [maintenance, wedding], BASELINE).closed is True


# ─── Selective blocking (PRD sections 16, 17) ─────────────────────────────────

def test_maintenance_can_close_only_rooms_and_leave_dormitories_open():
    partial = rule("Partial Maintenance", {
        "availability": {"accommodation": {
            str(AC_ROOM): "blocked",
            str(NONAC_ROOM): "blocked",
        }},
    })
    state = resolve_day(DAY, [partial], BASELINE)

    assert state.closed is False
    assert state.accommodation[AC_ROOM].allowed is False
    assert state.accommodation[NONAC_ROOM].allowed is False
    assert state.accommodation[AC_DORM].allowed is True
    assert state.accommodation[NONAC_DORM].allowed is True


def test_default_blocked_with_explicit_allowances_permits_only_those():
    """PRD section 17: 'only these can be booked'."""
    selective = rule("AC Only", {
        "availability": {
            "default_accommodation": "blocked",
            "accommodation": {str(AC_ROOM): "allowed", str(AC_DORM): "allowed"},
        },
    })
    state = resolve_day(DAY, [selective], BASELINE)

    assert state.accommodation[AC_ROOM].allowed is True
    assert state.accommodation[AC_DORM].allowed is True
    assert state.accommodation[NONAC_ROOM].allowed is False
    assert state.accommodation[NONAC_DORM].allowed is False


def test_a_later_rule_with_no_availability_opinion_does_not_reopen_blocked_types():
    """A discount rule applied after a closure must not undo the closure."""
    maintenance = rule("Maintenance", {"availability": {"closed": True}}, 0)
    discount = rule("Social Discount",
                    {"pricing": {"mode": "discount_percent", "value": 15}}, 5)

    state = resolve_day(DAY, [maintenance, discount], BASELINE)
    assert state.closed is True
    assert state.accommodation[AC_ROOM].allowed is False


# ─── Pricing (PRD sections 22, 25) ────────────────────────────────────────────

def test_percentage_increase_from_base():
    """PRD section 22: 1,500 + 50% = 2,250."""
    wedding = rule("Wedding", {
        "pricing": {"mode": "increase_percent", "value": 50,
                    "conflict_behaviour": "replace_base"},
    })
    state = resolve_day(DAY, [wedding], BASELINE)
    assert state.accommodation[AC_ROOM].price == Decimal("2250.00")


def test_fixed_price_replaces_base():
    wedding = rule("Wedding", {
        "pricing": {"per_type": {str(AC_ROOM): {"mode": "fixed", "value": 3000}}},
    })
    state = resolve_day(DAY, [wedding], BASELINE)
    assert state.accommodation[AC_ROOM].price == Decimal("3000.00")
    assert state.accommodation[NONAC_ROOM].price == Decimal("1000.00"), "untouched"


def test_adjust_current_compounds_on_the_running_price():
    """PRD section 25: wedding 3,000 then a 20% discount-on-current = 2,400."""
    wedding = rule("Wedding", {
        "pricing": {"per_type": {str(AC_ROOM): {"mode": "fixed", "value": 3000}}},
    }, 0)
    social = rule("Social", {
        "pricing": {"mode": "discount_percent", "value": 20,
                    "conflict_behaviour": "adjust_current"},
    }, 5)

    state = resolve_day(DAY, [wedding, social], BASELINE)
    assert state.accommodation[AC_ROOM].price == Decimal("2400.00")


def test_replace_base_discards_the_earlier_pricing_layer():
    wedding = rule("Wedding", {
        "pricing": {"per_type": {str(AC_ROOM): {"mode": "fixed", "value": 3000}}},
    }, 0)
    social = rule("Social", {
        "pricing": {"mode": "discount_percent", "value": 20,
                    "conflict_behaviour": "replace_base"},
    }, 5)

    state = resolve_day(DAY, [wedding, social], BASELINE)
    assert state.accommodation[AC_ROOM].price == Decimal("1200.00"), "20% off 1,500"


def test_price_never_goes_negative():
    absurd = rule("Absurd", {"pricing": {"mode": "discount_amount", "value": 99999}})
    state = resolve_day(DAY, [absurd], BASELINE)
    assert state.accommodation[AC_ROOM].price == Decimal("0.00")


def test_apply_pricing_modes():
    base, current = Decimal("1000"), Decimal("2000")
    replace = ConflictBehaviour.REPLACE_BASE
    adjust = ConflictBehaviour.ADJUST_CURRENT

    assert apply_pricing(base, current, PricingMode.NONE, Decimal(0), replace) == Decimal("2000.00")
    assert apply_pricing(base, current, PricingMode.FIXED, Decimal(750), adjust) == Decimal("750.00")
    assert apply_pricing(base, current, PricingMode.INCREASE_AMOUNT, Decimal(100), replace) == Decimal("1100.00")
    assert apply_pricing(base, current, PricingMode.INCREASE_AMOUNT, Decimal(100), adjust) == Decimal("2100.00")
    assert apply_pricing(base, current, PricingMode.DISCOUNT_PERCENT, Decimal(10), adjust) == Decimal("1800.00")


# ─── Conditions merge per field (spec section 4) ──────────────────────────────

def test_later_rule_overrides_only_the_conditions_it_specifies():
    wedding = rule("Wedding", {"conditions": {"min_nights": 2, "min_units": 2}}, 0)
    camp = rule("Camp", {"conditions": {"min_nights": 3}}, 5)

    state = resolve_day(DAY, [wedding, camp], BASELINE)
    assert state.conditions.min_nights == 3, "camp specified it"
    assert state.conditions.min_units == 2, "camp said nothing, wedding's survives"


# ─── Purposes (PRD section 27) ────────────────────────────────────────────────

def test_wedding_rule_can_block_social_events():
    wedding = rule("Wedding", {
        "purposes": {"default": "blocked", "allowed": [str(WEDDING_PURPOSE)]},
    })
    state = resolve_day(DAY, [wedding], BASELINE)
    assert state.allowed_purpose_ids == frozenset({WEDDING_PURPOSE})


def test_blocked_list_removes_from_the_default_allowed_set():
    wedding = rule("Wedding", {"purposes": {"blocked": [str(SOCIAL_PURPOSE)]}})
    state = resolve_day(DAY, [wedding], BASELINE)
    assert SOCIAL_PURPOSE not in state.allowed_purpose_ids
    assert WEDDING_PURPOSE in state.allowed_purpose_ids


# ─── Provenance ───────────────────────────────────────────────────────────────

def test_source_assignments_are_recorded_oldest_first():
    wedding = rule("Wedding", {}, 0)
    maintenance = rule("Maintenance", {}, 5)
    state = resolve_day(DAY, [maintenance, wedding], BASELINE)
    assert state.source_assignment_ids == (wedding.assignment_id, maintenance.assignment_id)


def test_public_message_from_the_newest_rule_that_sets_one_wins():
    older = rule("Wedding", {"public_message": "Wedding rates apply."}, 0)
    newer = rule("Festival", {"public_message": "Festival week."}, 5)
    silent = rule("Discount", {}, 10)

    state = resolve_day(DAY, [older, newer, silent], BASELINE)
    assert state.public_message == "Festival week."
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_rules.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.bhavan_rules'`

- [ ] **Step 3: Write the resolver**

Create `backend/app/services/bhavan_rules.py`:

```python
"""Bhavan rule resolution.

This module performs no I/O. It receives already-loaded rules and returns
resolved state, which is what makes the entire override, pricing and condition
matrix testable as a table of pure inputs and expected outputs.

Rules are layered oldest-first, so the most recently applied assignment lands
on top and wins any conflict (PRD sections 19 and 21).
"""

import uuid
from dataclasses import dataclass, field
from datetime import date as date_type, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, FrozenSet, Mapping, Optional, Sequence, Tuple

from app.schemas.bhavan_rules import (
    Allowance, ConflictBehaviour, PricingMode, RuleConfig,
)

CENTS = Decimal("0.01")
ZERO = Decimal("0.00")


def money(value: Decimal) -> Decimal:
    """Quantise to paise, never below zero. A discount larger than the price
    would otherwise produce a negative charge."""
    quantised = Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)
    return quantised if quantised > ZERO else ZERO


@dataclass(frozen=True)
class TypeState:
    allowed: bool
    price: Decimal


@dataclass(frozen=True)
class Conditions:
    min_nights: Optional[int] = None
    max_nights: Optional[int] = None
    min_units: Optional[int] = None
    max_units: Optional[int] = None
    min_guests: Optional[int] = None
    max_guests: Optional[int] = None
    advance_days: Optional[int] = None


@dataclass(frozen=True)
class AppliedRule:
    """One rule assignment covering a date, as loaded from the database."""
    assignment_id: uuid.UUID
    label: str
    applied_at: datetime
    config: RuleConfig


@dataclass(frozen=True)
class Baseline:
    """System defaults when no rule expresses an opinion (PRD section 47)."""
    base_prices: Mapping[uuid.UUID, Decimal]
    amenity_ids: FrozenSet[uuid.UUID]
    purpose_ids: FrozenSet[uuid.UUID]
    default_min_nights: int = 1
    default_max_nights: Optional[int] = None


@dataclass(frozen=True)
class DayState:
    date: date_type
    closed: bool
    accommodation: Dict[uuid.UUID, TypeState]
    amenities: Dict[uuid.UUID, bool]
    conditions: Conditions
    allowed_purpose_ids: FrozenSet[uuid.UUID]
    public_message: Optional[str]
    #: ADMIN ONLY. Powers the "why does this date behave this way?" panel and
    #: must never be serialised into a public response.
    source_assignment_ids: Tuple[uuid.UUID, ...] = field(default=())


def apply_pricing(
    base: Decimal,
    current: Decimal,
    mode: PricingMode,
    value: Decimal,
    behaviour: ConflictBehaviour,
) -> Decimal:
    """Compute a new price from one pricing layer.

    ``behaviour`` decides the anchor: REPLACE_BASE discards earlier pricing
    layers and works from the accommodation type's base rate; ADJUST_CURRENT
    compounds on whatever the layers beneath already produced (PRD section 25).
    """
    if mode is PricingMode.NONE:
        return money(current)

    if mode is PricingMode.FIXED:
        return money(value)

    anchor = base if behaviour is ConflictBehaviour.REPLACE_BASE else current

    if mode is PricingMode.INCREASE_PERCENT:
        return money(anchor * (Decimal(1) + value / Decimal(100)))
    if mode is PricingMode.DISCOUNT_PERCENT:
        return money(anchor * (Decimal(1) - value / Decimal(100)))
    if mode is PricingMode.INCREASE_AMOUNT:
        return money(anchor + value)
    if mode is PricingMode.DISCOUNT_AMOUNT:
        return money(anchor - value)

    raise ValueError(f"Unhandled pricing mode: {mode}")


def resolve_day(
    day: date_type,
    rules: Sequence[AppliedRule],
    baseline: Baseline,
) -> DayState:
    """Layer every rule covering ``day`` and return the effective state.

    Callers need not pre-sort ``rules``; this sorts by ``applied_at``.
    """
    ordered = sorted(rules, key=lambda r: (r.applied_at, str(r.assignment_id)))

    closed = False
    allowed_types: Dict[uuid.UUID, bool] = {tid: True for tid in baseline.base_prices}
    prices: Dict[uuid.UUID, Decimal] = {
        tid: money(base) for tid, base in baseline.base_prices.items()
    }
    allowed_amenities: Dict[uuid.UUID, bool] = {aid: True for aid in baseline.amenity_ids}
    conditions = Conditions(
        min_nights=baseline.default_min_nights,
        max_nights=baseline.default_max_nights,
    )
    allowed_purposes: FrozenSet[uuid.UUID] = baseline.purpose_ids
    public_message: Optional[str] = None
    sources: list[uuid.UUID] = []

    for applied in ordered:
        config: RuleConfig = applied.config
        sources.append(applied.assignment_id)

        # ── Availability ──────────────────────────────────────────────────
        availability = config.availability
        if availability.closed:
            closed = True
            allowed_types = {tid: False for tid in allowed_types}
            allowed_amenities = {aid: False for aid in allowed_amenities}
        else:
            if availability.default_accommodation is not None:
                default_allowed = availability.default_accommodation is Allowance.ALLOWED
                allowed_types = {
                    tid: default_allowed for tid in allowed_types
                }
            for tid, allowance in availability.accommodation.items():
                if tid in allowed_types:
                    allowed_types[tid] = allowance is Allowance.ALLOWED

            if availability.default_amenities is not None:
                default_allowed = availability.default_amenities is Allowance.ALLOWED
                allowed_amenities = {aid: default_allowed for aid in allowed_amenities}
            for aid, allowance in availability.amenities.items():
                if aid in allowed_amenities:
                    allowed_amenities[aid] = allowance is Allowance.ALLOWED

            # An explicit re-opening lifts a previous closure.
            if closed and any(allowed_types.values()):
                closed = False

        # ── Pricing ───────────────────────────────────────────────────────
        pricing = config.pricing
        for tid, base in baseline.base_prices.items():
            override = pricing.per_type.get(tid)
            mode = override.mode if override else pricing.mode
            value = override.value if override else pricing.value
            if mode is PricingMode.NONE:
                continue
            prices[tid] = apply_pricing(
                money(base), prices[tid], mode, value, pricing.conflict_behaviour,
            )

        # ── Conditions: per field, last opinion wins ──────────────────────
        incoming = config.conditions
        conditions = Conditions(
            min_nights=_pick(incoming.min_nights, conditions.min_nights),
            max_nights=_pick(incoming.max_nights, conditions.max_nights),
            min_units=_pick(incoming.min_units, conditions.min_units),
            max_units=_pick(incoming.max_units, conditions.max_units),
            min_guests=_pick(incoming.min_guests, conditions.min_guests),
            max_guests=_pick(incoming.max_guests, conditions.max_guests),
            advance_days=_pick(incoming.advance_days, conditions.advance_days),
        )

        # ── Purposes ──────────────────────────────────────────────────────
        purposes = config.purposes
        if purposes.expresses_opinion():
            if purposes.default is Allowance.BLOCKED:
                resolved = set()
            else:
                resolved = set(baseline.purpose_ids)
            resolved |= {pid for pid in purposes.allowed if pid in baseline.purpose_ids}
            resolved -= set(purposes.blocked)
            allowed_purposes = frozenset(resolved)

        if config.public_message:
            public_message = config.public_message

    return DayState(
        date=day,
        closed=closed,
        accommodation={
            tid: TypeState(allowed=allowed_types[tid], price=prices[tid])
            for tid in baseline.base_prices
        },
        amenities=dict(allowed_amenities),
        conditions=conditions,
        allowed_purpose_ids=allowed_purposes,
        public_message=public_message,
        source_assignment_ids=tuple(sources),
    )


def _pick(incoming: Optional[int], existing: Optional[int]) -> Optional[int]:
    """A rule that omits a field expresses no opinion about it."""
    return incoming if incoming is not None else existing
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_rules.py -v`
Expected: 17 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/bhavan_rules.py backend/tests/test_bhavan_rules.py
git commit -m "feat(bhavan): add pure per-day rule resolver"
```

---

### Task 4: Stay resolution and rule loading

A stay spans several dates that can resolve differently. This task adds the stay-level aggregation and the one function that talks to the database to load assignments.

**Files:**
- Modify: `backend/app/services/bhavan_rules.py` (append)
- Test: `backend/tests/test_bhavan_stay.py`

**Interfaces:**
- Consumes: `resolve_day`, `DayState`, `Baseline`, `Conditions` from Task 3
- Produces: `StayState` dataclass; `stay_dates(check_in, check_out) -> list[date]`; `resolve_stay(check_in, check_out, rules_by_date, baseline) -> StayState`; `load_baseline(db) -> Baseline`; `load_rules_for_dates(db, dates) -> dict[date, list[AppliedRule]]`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_stay.py`:

```python
"""A stay spanning several dates must take the strictest condition and charge
each night at its own rate."""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.schemas.bhavan_rules import parse_config
from app.services.bhavan_rules import (
    AppliedRule, Baseline, resolve_stay, stay_dates,
)

AC_ROOM = uuid.uuid4()
NONAC_ROOM = uuid.uuid4()
WEDDING_PURPOSE = uuid.uuid4()
SOCIAL_PURPOSE = uuid.uuid4()
BASE = datetime(2026, 8, 11, 10, 0, tzinfo=timezone.utc)

BASELINE = Baseline(
    base_prices={AC_ROOM: Decimal("1500.00"), NONAC_ROOM: Decimal("1000.00")},
    amenity_ids=frozenset(),
    purpose_ids=frozenset({WEDDING_PURPOSE, SOCIAL_PURPOSE}),
    default_min_nights=1,
)


def rule(label, config, minutes=0):
    return AppliedRule(uuid.uuid4(), label, BASE + timedelta(minutes=minutes),
                       parse_config(config))


def test_stay_dates_counts_nights_not_calendar_days():
    """20 Dec to 22 Dec is two nights: the 20th and the 21st."""
    nights = stay_dates(date(2026, 12, 20), date(2026, 12, 22))
    assert nights == [date(2026, 12, 20), date(2026, 12, 21)]


def test_price_is_summed_per_night_at_that_night_s_rate():
    wedding = rule("Wedding", {"pricing": {"mode": "increase_percent", "value": 50}})
    stay = resolve_stay(
        date(2026, 12, 20), date(2026, 12, 22),
        {date(2026, 12, 20): [wedding], date(2026, 12, 21): []},
        BASELINE,
    )
    assert stay.nights == 2
    # 2,250 on the wedding night + 1,500 on the normal night.
    assert stay.price_by_type[AC_ROOM] == Decimal("3750.00")


def test_a_type_blocked_on_any_night_is_unavailable_for_the_whole_stay():
    block = rule("Block", {"availability": {"accommodation": {str(AC_ROOM): "blocked"}}})
    stay = resolve_stay(
        date(2026, 12, 20), date(2026, 12, 22),
        {date(2026, 12, 20): [], date(2026, 12, 21): [block]},
        BASELINE,
    )
    assert AC_ROOM not in stay.allowed_type_ids
    assert NONAC_ROOM in stay.allowed_type_ids


def test_any_closed_night_closes_the_whole_stay():
    maintenance = rule("Maintenance", {"availability": {"closed": True}})
    stay = resolve_stay(
        date(2026, 12, 20), date(2026, 12, 22),
        {date(2026, 12, 20): [], date(2026, 12, 21): [maintenance]},
        BASELINE,
    )
    assert stay.closed is True
    assert stay.closed_dates == (date(2026, 12, 21),)


def test_strictest_conditions_win_across_nights():
    two_nights = rule("Wedding", {"conditions": {"min_nights": 2, "max_units": 10}})
    three_nights = rule("Camp", {"conditions": {"min_nights": 3, "max_units": 4}})
    stay = resolve_stay(
        date(2026, 12, 20), date(2026, 12, 22),
        {date(2026, 12, 20): [two_nights], date(2026, 12, 21): [three_nights]},
        BASELINE,
    )
    assert stay.conditions.min_nights == 3, "strictest minimum"
    assert stay.conditions.max_units == 4, "strictest maximum"


def test_a_purpose_must_be_allowed_on_every_night():
    wedding_only = rule("Wedding", {
        "purposes": {"default": "blocked", "allowed": [str(WEDDING_PURPOSE)]},
    })
    stay = resolve_stay(
        date(2026, 12, 20), date(2026, 12, 22),
        {date(2026, 12, 20): [], date(2026, 12, 21): [wedding_only]},
        BASELINE,
    )
    assert stay.allowed_purpose_ids == frozenset({WEDDING_PURPOSE})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_stay.py -v`
Expected: FAIL — `ImportError: cannot import name 'resolve_stay'`

- [ ] **Step 3: Append the stay resolver**

Add to the end of `backend/app/services/bhavan_rules.py`:

```python
@dataclass(frozen=True)
class StayState:
    check_in: date_type
    check_out: date_type
    nights: int
    days: Tuple[DayState, ...]
    closed: bool
    closed_dates: Tuple[date_type, ...]
    allowed_type_ids: FrozenSet[uuid.UUID]
    #: Total price per accommodation unit for the whole stay, summed per night.
    price_by_type: Dict[uuid.UUID, Decimal]
    allowed_amenity_ids: FrozenSet[uuid.UUID]
    conditions: Conditions
    allowed_purpose_ids: FrozenSet[uuid.UUID]
    public_messages: Tuple[str, ...]


def stay_dates(check_in: date_type, check_out: date_type) -> list[date_type]:
    """The nights of a stay. 20 Dec to 22 Dec is two nights: 20th and 21st."""
    if check_out <= check_in:
        return []
    span = (check_out - check_in).days
    return [check_in + timedelta(days=offset) for offset in range(span)]


def resolve_stay(
    check_in: date_type,
    check_out: date_type,
    rules_by_date: Mapping[date_type, Sequence[AppliedRule]],
    baseline: Baseline,
) -> StayState:
    """Aggregate per-night states into one stay-level answer.

    Availability intersects (a type must be open every night), price sums
    per night at that night's rate, and conditions take the strictest value.
    """
    nights = stay_dates(check_in, check_out)
    days = tuple(
        resolve_day(day, rules_by_date.get(day, ()), baseline) for day in nights
    )

    allowed_types = {tid for tid in baseline.base_prices}
    allowed_amenities = set(baseline.amenity_ids)
    allowed_purposes = set(baseline.purpose_ids)
    totals: Dict[uuid.UUID, Decimal] = {tid: ZERO for tid in baseline.base_prices}
    conditions = Conditions()
    messages: list[str] = []
    closed_dates: list[date_type] = []

    for state in days:
        if state.closed:
            closed_dates.append(state.date)
        allowed_types &= {tid for tid, t in state.accommodation.items() if t.allowed}
        allowed_amenities &= {aid for aid, ok in state.amenities.items() if ok}
        allowed_purposes &= set(state.allowed_purpose_ids)
        for tid, t in state.accommodation.items():
            totals[tid] = money(totals[tid] + t.price)
        conditions = _strictest(conditions, state.conditions)
        if state.public_message and state.public_message not in messages:
            messages.append(state.public_message)

    return StayState(
        check_in=check_in,
        check_out=check_out,
        nights=len(nights),
        days=days,
        closed=bool(closed_dates),
        closed_dates=tuple(closed_dates),
        allowed_type_ids=frozenset(allowed_types),
        price_by_type=totals,
        allowed_amenity_ids=frozenset(allowed_amenities),
        conditions=conditions,
        allowed_purpose_ids=frozenset(allowed_purposes),
        public_messages=tuple(messages),
    )


def _strictest(a: Conditions, b: Conditions) -> Conditions:
    """Minimums take the larger value, maximums the smaller. A stay crossing a
    2-night-minimum date and a 3-night-minimum date requires 3."""
    def hi(x, y):
        return max([v for v in (x, y) if v is not None], default=None)

    def lo(x, y):
        return min([v for v in (x, y) if v is not None], default=None)

    return Conditions(
        min_nights=hi(a.min_nights, b.min_nights),
        max_nights=lo(a.max_nights, b.max_nights),
        min_units=hi(a.min_units, b.min_units),
        max_units=lo(a.max_units, b.max_units),
        min_guests=hi(a.min_guests, b.min_guests),
        max_guests=lo(a.max_guests, b.max_guests),
        advance_days=hi(a.advance_days, b.advance_days),
    )
```

Add `timedelta` to the `datetime` import at the top of the file:

```python
from datetime import date as date_type, datetime, timedelta
```

- [ ] **Step 4: Add the database loaders**

Append to `backend/app/services/bhavan_rules.py`:

```python
# ─── Database loaders ─────────────────────────────────────────────────────────
# The only I/O in this module. Kept here so callers get rules in exactly the
# shape resolve_day expects.

async def load_baseline(db) -> Baseline:
    """System defaults: active accommodation types, amenities and purposes."""
    from sqlalchemy import select

    from app.models.bhavan import (
        BhavanAccommodationType, BhavanAmenity, BhavanPurpose,
    )
    from app.services.bhavan_settings import get_settings_row

    types = (await db.execute(
        select(BhavanAccommodationType).where(BhavanAccommodationType.is_active.is_(True))
    )).scalars().all()
    amenities = (await db.execute(
        select(BhavanAmenity).where(BhavanAmenity.is_active.is_(True))
    )).scalars().all()
    purposes = (await db.execute(
        select(BhavanPurpose).where(BhavanPurpose.is_active.is_(True))
    )).scalars().all()
    settings_row = await get_settings_row(db)

    return Baseline(
        base_prices={t.id: Decimal(t.base_price_per_night) for t in types},
        amenity_ids=frozenset(a.id for a in amenities),
        purpose_ids=frozenset(p.id for p in purposes),
        default_min_nights=settings_row.default_min_nights,
        default_max_nights=settings_row.default_max_nights,
    )


async def load_rules_for_dates(db, dates: Sequence[date_type]):
    """Load every active, unrevoked assignment covering any of ``dates``.

    Returns {date: [AppliedRule, ...]}. Revoked and inactive assignments, and
    assignments whose profile is not ACTIVE, are excluded — PRD section 55
    requires that inactive rules never affect a new enquiry.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models.bhavan import (
        BhavanRuleAssignment, BhavanRuleAssignmentDate, BhavanRuleProfile, RuleStatus,
    )
    from app.schemas.bhavan_rules import parse_config

    result: Dict[date_type, list[AppliedRule]] = {day: [] for day in dates}
    if not dates:
        return result

    rows = (await db.execute(
        select(BhavanRuleAssignmentDate, BhavanRuleAssignment)
        .join(BhavanRuleAssignment,
              BhavanRuleAssignment.id == BhavanRuleAssignmentDate.assignment_id)
        .join(BhavanRuleProfile, BhavanRuleProfile.id == BhavanRuleAssignment.profile_id)
        .where(
            BhavanRuleAssignmentDate.date.in_(list(dates)),
            BhavanRuleAssignment.is_active.is_(True),
            BhavanRuleAssignment.revoked_at.is_(None),
            BhavanRuleProfile.status == RuleStatus.ACTIVE,
        )
    )).all()

    for date_row, assignment in rows:
        result[date_row.date].append(AppliedRule(
            assignment_id=assignment.id,
            label=assignment.label,
            applied_at=assignment.applied_at,
            config=parse_config(assignment.config_snapshot),
        ))

    return result
```

- [ ] **Step 5: Create the settings accessor**

Create `backend/app/services/bhavan_settings.py`:

```python
"""Singleton access to Bhavan settings.

The row is created on first read so no migration has to seed it and no code
path has to cope with its absence.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import BhavanSettings

DEFAULT_REQUIRED_FIELDS = {
    "email": False,
    "address": False,
    "city": True,
    "state": True,
    "whatsapp_number": False,
    "adults": True,
    "children": False,
    "special_requirements": False,
    "message": False,
}


async def get_settings_row(db: AsyncSession) -> BhavanSettings:
    row = (await db.execute(select(BhavanSettings).limit(1))).scalars().first()
    if row is None:
        row = BhavanSettings(required_fields=dict(DEFAULT_REQUIRED_FIELDS))
        db.add(row)
        await db.flush()
    return row
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_stay.py tests/test_bhavan_rules.py -v`
Expected: 23 passed

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/bhavan_rules.py backend/app/services/bhavan_settings.py backend/tests/test_bhavan_stay.py
git commit -m "feat(bhavan): add stay resolution and rule loading"
```

---

### Task 5: Availability counting

**Files:**
- Create: `backend/app/services/bhavan_availability.py`
- Test: `backend/tests/test_bhavan_availability.py`

**Interfaces:**
- Consumes: models from Task 1, `stay_dates` from Task 4
- Produces: `capacity_by_type(db) -> dict[UUID, int]`; `committed_units(db, dates, exclude_enquiry_id=None) -> dict[UUID, dict[date, int]]`; `available_units(db, check_in, check_out, exclude_enquiry_id=None) -> dict[UUID, int]`; `committed_amenities(db, dates, exclude_enquiry_id=None) -> dict[UUID, int]`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_availability.py`:

```python
"""Only approved enquiries hold inventory. A pending enquiry is a request, not
a claim, and must never block another customer."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind, BhavanAccommodationType, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanUnit, EnquiryStatus, UnitStatus,
)
from app.services.bhavan_availability import available_units, capacity_by_type


async def _make_type(db: AsyncSession, name: str, units: int, maintenance: int = 0):
    acc = BhavanAccommodationType(
        name=name, kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
    )
    db.add(acc)
    await db.flush()
    for i in range(units):
        db.add(BhavanUnit(accommodation_type_id=acc.id, label=f"{name}-{i}",
                          status=UnitStatus.AVAILABLE))
    for i in range(maintenance):
        db.add(BhavanUnit(accommodation_type_id=acc.id, label=f"{name}-m{i}",
                          status=UnitStatus.MAINTENANCE))
    await db.flush()
    return acc


async def _make_enquiry(db, acc, qty, check_in, check_out, status):
    enquiry = BhavanEnquiry(
        reference=f"BV-TEST-{uuid.uuid4().hex[:6]}",
        check_in=check_in, check_out=check_out,
        nights=(check_out - check_in).days,
        full_name="Test", mobile="9999999999", status=status,
    )
    db.add(enquiry)
    await db.flush()
    db.add(BhavanEnquiryAccommodation(
        enquiry_id=enquiry.id, accommodation_type_id=acc.id,
        type_name_snapshot=acc.name, quantity=qty,
        nights=(check_out - check_in).days,
        unit_price_snapshot=Decimal("1500.00"), line_total=Decimal("0"),
    ))
    await db.flush()
    return enquiry


async def test_capacity_counts_only_available_units(db_session: AsyncSession):
    acc = await _make_type(db_session, "AC Room", units=11, maintenance=1)
    await db_session.commit()

    capacity = await capacity_by_type(db_session)
    assert capacity[acc.id] == 11, "the unit in maintenance does not count"


async def test_approved_enquiries_reduce_availability(db_session: AsyncSession):
    acc = await _make_type(db_session, "AC Room", units=12)
    await _make_enquiry(db_session, acc, 9, date(2026, 12, 20), date(2026, 12, 22),
                        EnquiryStatus.APPROVED)
    await db_session.commit()

    available = await available_units(db_session, date(2026, 12, 20), date(2026, 12, 22))
    assert available[acc.id] == 3


async def test_pending_enquiries_do_not_hold_inventory(db_session: AsyncSession):
    acc = await _make_type(db_session, "AC Room", units=12)
    await _make_enquiry(db_session, acc, 9, date(2026, 12, 20), date(2026, 12, 22),
                        EnquiryStatus.PENDING)
    await db_session.commit()

    available = await available_units(db_session, date(2026, 12, 20), date(2026, 12, 22))
    assert available[acc.id] == 12


async def test_a_non_overlapping_stay_does_not_reduce_availability(db_session: AsyncSession):
    acc = await _make_type(db_session, "AC Room", units=12)
    # Checks out on the 20th, so it occupies no night the new stay wants.
    await _make_enquiry(db_session, acc, 12, date(2026, 12, 18), date(2026, 12, 20),
                        EnquiryStatus.APPROVED)
    await db_session.commit()

    available = await available_units(db_session, date(2026, 12, 20), date(2026, 12, 22))
    assert available[acc.id] == 12


async def test_availability_is_the_worst_night_of_the_stay(db_session: AsyncSession):
    acc = await _make_type(db_session, "AC Room", units=12)
    await _make_enquiry(db_session, acc, 10, date(2026, 12, 20), date(2026, 12, 21),
                        EnquiryStatus.APPROVED)
    await _make_enquiry(db_session, acc, 2, date(2026, 12, 21), date(2026, 12, 22),
                        EnquiryStatus.APPROVED)
    await db_session.commit()

    available = await available_units(db_session, date(2026, 12, 20), date(2026, 12, 22))
    assert available[acc.id] == 2, "the 20th is the tightest night"


async def test_availability_never_goes_negative(db_session: AsyncSession):
    acc = await _make_type(db_session, "AC Room", units=2)
    await _make_enquiry(db_session, acc, 5, date(2026, 12, 20), date(2026, 12, 22),
                        EnquiryStatus.APPROVED)
    await db_session.commit()

    available = await available_units(db_session, date(2026, 12, 20), date(2026, 12, 22))
    assert available[acc.id] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_availability.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.bhavan_availability'`

- [ ] **Step 3: Write the availability service**

Create `backend/app/services/bhavan_availability.py`:

```python
"""Inventory counting.

Capacity is the number of units in the AVAILABLE state; a unit in maintenance
does not count. Only approved enquiries consume that capacity — a pending
enquiry is a request, not a claim, so it never blocks another customer
(spec section 5).
"""

import uuid
from collections import defaultdict
from datetime import date as date_type
from typing import Dict, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    BhavanAccommodationType, BhavanAmenity, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanUnit,
    HOLDING_STATUSES, UnitStatus,
)
from app.services.bhavan_rules import stay_dates


async def capacity_by_type(db: AsyncSession) -> Dict[uuid.UUID, int]:
    """Bookable units per accommodation type."""
    rows = (await db.execute(
        select(BhavanUnit.accommodation_type_id, func.count(BhavanUnit.id))
        .join(BhavanAccommodationType,
              BhavanAccommodationType.id == BhavanUnit.accommodation_type_id)
        .where(
            BhavanUnit.status == UnitStatus.AVAILABLE,
            BhavanAccommodationType.is_active.is_(True),
        )
        .group_by(BhavanUnit.accommodation_type_id)
    )).all()
    capacity = {type_id: count for type_id, count in rows}

    active_ids = (await db.execute(
        select(BhavanAccommodationType.id)
        .where(BhavanAccommodationType.is_active.is_(True))
    )).scalars().all()
    for type_id in active_ids:
        capacity.setdefault(type_id, 0)
    return capacity


async def committed_units(
    db: AsyncSession,
    dates: Sequence[date_type],
    exclude_enquiry_id: Optional[uuid.UUID] = None,
) -> Dict[uuid.UUID, Dict[date_type, int]]:
    """Units held by approved enquiries, per type, per night.

    ``exclude_enquiry_id`` lets an enquiry be re-validated without competing
    with itself — needed when an admin edits an already-approved enquiry.
    """
    committed: Dict[uuid.UUID, Dict[date_type, int]] = defaultdict(
        lambda: defaultdict(int)
    )
    if not dates:
        return committed

    window_start, window_end = min(dates), max(dates)

    query = (
        select(
            BhavanEnquiryAccommodation.accommodation_type_id,
            BhavanEnquiryAccommodation.quantity,
            BhavanEnquiry.check_in,
            BhavanEnquiry.check_out,
        )
        .join(BhavanEnquiry, BhavanEnquiry.id == BhavanEnquiryAccommodation.enquiry_id)
        .where(
            BhavanEnquiry.status.in_(HOLDING_STATUSES),
            BhavanEnquiry.check_in <= window_end,
            BhavanEnquiry.check_out > window_start,
        )
    )
    if exclude_enquiry_id is not None:
        query = query.where(BhavanEnquiry.id != exclude_enquiry_id)

    wanted = set(dates)
    for type_id, quantity, check_in, check_out in (await db.execute(query)).all():
        if type_id is None:
            continue
        for night in stay_dates(check_in, check_out):
            if night in wanted:
                committed[type_id][night] += quantity
    return committed


async def available_units(
    db: AsyncSession,
    check_in: date_type,
    check_out: date_type,
    exclude_enquiry_id: Optional[uuid.UUID] = None,
) -> Dict[uuid.UUID, int]:
    """How many units of each type can be requested for the whole stay.

    A unit must be free on every night, so the answer is the tightest night.
    Never negative: an over-committed type reports zero, not a deficit.
    """
    nights = stay_dates(check_in, check_out)
    capacity = await capacity_by_type(db)
    if not nights:
        return {type_id: 0 for type_id in capacity}

    committed = await committed_units(db, nights, exclude_enquiry_id)

    available: Dict[uuid.UUID, int] = {}
    for type_id, total in capacity.items():
        per_night = committed.get(type_id, {})
        worst = max((per_night.get(night, 0) for night in nights), default=0)
        available[type_id] = max(total - worst, 0)
    return available


async def committed_amenities(
    db: AsyncSession,
    dates: Sequence[date_type],
    exclude_enquiry_id: Optional[uuid.UUID] = None,
) -> Dict[uuid.UUID, int]:
    """Peak amenity quantity held by approved enquiries across ``dates``."""
    if not dates:
        return {}

    window_start, window_end = min(dates), max(dates)
    query = (
        select(
            BhavanEnquiryAmenity.amenity_id,
            BhavanEnquiryAmenity.quantity,
            BhavanEnquiry.check_in,
            BhavanEnquiry.check_out,
        )
        .join(BhavanEnquiry, BhavanEnquiry.id == BhavanEnquiryAmenity.enquiry_id)
        .where(
            BhavanEnquiry.status.in_(HOLDING_STATUSES),
            BhavanEnquiry.check_in <= window_end,
            BhavanEnquiry.check_out > window_start,
        )
    )
    if exclude_enquiry_id is not None:
        query = query.where(BhavanEnquiry.id != exclude_enquiry_id)

    wanted = set(dates)
    per_night: Dict[uuid.UUID, Dict[date_type, int]] = defaultdict(
        lambda: defaultdict(int)
    )
    for amenity_id, quantity, check_in, check_out in (await db.execute(query)).all():
        if amenity_id is None:
            continue
        for night in stay_dates(check_in, check_out):
            if night in wanted:
                per_night[amenity_id][night] += quantity

    return {
        amenity_id: max(nights.values(), default=0)
        for amenity_id, nights in per_night.items()
    }


async def amenity_stock(db: AsyncSession) -> Dict[uuid.UUID, Optional[int]]:
    """Configured stock per amenity. None means unlimited."""
    rows = (await db.execute(
        select(BhavanAmenity.id, BhavanAmenity.available_quantity)
        .where(BhavanAmenity.is_active.is_(True))
    )).all()
    return {amenity_id: quantity for amenity_id, quantity in rows}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_availability.py -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/bhavan_availability.py backend/tests/test_bhavan_availability.py
git commit -m "feat(bhavan): add inventory availability counting"
```

---

### Task 6: Quote builder

**Files:**
- Create: `backend/app/services/bhavan_quote.py`
- Test: `backend/tests/test_bhavan_quote.py`

**Interfaces:**
- Consumes: `resolve_stay`, `load_baseline`, `load_rules_for_dates`, `money` (Task 3/4); `available_units`, `amenity_stock`, `committed_amenities` (Task 5)
- Produces: dataclasses `QuoteRequest`, `QuoteLine`, `Quote`; `build_quote(db, request) -> Quote`; `public_message_for(blocker) -> str`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_quote.py`:

```python
"""Quote calculation: line items, the five amenity pricing formulas, and the
customer-safe blocker messages."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, BhavanAccommodationType, BhavanAmenity,
    BhavanPurpose, BhavanRuleAssignment, BhavanRuleAssignmentDate, BhavanRuleProfile,
    BhavanUnit, RuleCategory, RuleStatus, UnitStatus,
)
from app.services.bhavan_quote import QuoteRequest, build_quote

from datetime import datetime, timezone


async def _seed_inventory(db: AsyncSession):
    ac = BhavanAccommodationType(
        name="AC Room", kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
    )
    db.add(ac)
    await db.flush()
    for i in range(12):
        db.add(BhavanUnit(accommodation_type_id=ac.id, label=f"1{i:02d}",
                          status=UnitStatus.AVAILABLE))

    chairs = BhavanAmenity(name="Plastic Chair", price=Decimal("10.00"),
                           pricing_type=AmenityPricingType.PER_UNIT,
                           available_quantity=500)
    cooler = BhavanAmenity(name="Cooler", price=Decimal("500.00"),
                           pricing_type=AmenityPricingType.PER_DAY,
                           available_quantity=6)
    db.add_all([chairs, cooler])

    purpose = BhavanPurpose(name="Wedding")
    db.add(purpose)
    await db.flush()
    await db.commit()
    return ac, chairs, cooler, purpose


async def _apply_rule(db, config: dict, days: list[date], label="Rule"):
    profile = BhavanRuleProfile(name=label, category=RuleCategory.EVENT,
                                status=RuleStatus.ACTIVE, config=config)
    db.add(profile)
    await db.flush()
    assignment = BhavanRuleAssignment(
        profile_id=profile.id, label=label, config_snapshot=config,
        applied_at=datetime.now(timezone.utc),
    )
    db.add(assignment)
    await db.flush()
    for day in days:
        db.add(BhavanRuleAssignmentDate(assignment_id=assignment.id, date=day))
    await db.commit()
    return assignment


async def test_accommodation_line_uses_nights_and_quantity(db_session: AsyncSession):
    ac, _, _, _ = await _seed_inventory(db_session)

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 2}, amenities={}, guests_total=8,
    ))

    # 2 rooms x 2 nights x 1,500
    assert quote.accommodation_total == Decimal("6000.00")
    assert quote.estimated_total == Decimal("6000.00")
    assert quote.blockers == []


async def test_per_unit_and_per_day_amenities_use_different_multipliers(db_session: AsyncSession):
    ac, chairs, cooler, _ = await _seed_inventory(db_session)

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 1}, amenities={chairs.id: 50, cooler.id: 2},
        guests_total=4,
    ))

    lines = {line.label: line for line in quote.lines if line.kind == "amenity"}
    # 50 chairs x 10 = 500, charged once regardless of nights.
    assert lines["Plastic Chair"].total == Decimal("500.00")
    # 2 coolers x 500 x 3 days (2 nights + the departure day) = 3,000.
    assert lines["Cooler"].total == Decimal("3000.00")
    assert "3 days" in lines["Cooler"].detail


async def test_wedding_surcharge_reaches_the_total(db_session: AsyncSession):
    ac, _, _, _ = await _seed_inventory(db_session)
    await _apply_rule(db_session,
                      {"pricing": {"mode": "increase_percent", "value": 50}},
                      [date(2026, 12, 20)], label="Wedding")

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 1}, amenities={}, guests_total=2,
    ))

    # 2,250 on the wedding night + 1,500 on the normal night.
    assert quote.accommodation_total == Decimal("3750.00")


async def test_closed_dates_block_with_a_generic_message(db_session: AsyncSession):
    ac, _, _, _ = await _seed_inventory(db_session)
    await _apply_rule(db_session, {"availability": {"closed": True}},
                      [date(2026, 12, 21)], label="Maintenance")

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 1}, amenities={}, guests_total=2,
    ))

    assert "The Bhavan is unavailable for the selected dates." in quote.blockers
    for blocker in quote.blockers:
        assert "Maintenance" not in blocker, "internal rule name must not leak"


async def test_minimum_stay_produces_a_plain_message(db_session: AsyncSession):
    ac, _, _, _ = await _seed_inventory(db_session)
    await _apply_rule(db_session, {"conditions": {"min_nights": 2}},
                      [date(2026, 12, 20)], label="Wedding")

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 21),
        accommodation={ac.id: 1}, amenities={}, guests_total=2,
    ))

    assert "A minimum stay of 2 nights is required for the selected dates." in quote.blockers


async def test_blocked_purpose_produces_a_plain_message(db_session: AsyncSession):
    ac, _, _, purpose = await _seed_inventory(db_session)
    await _apply_rule(db_session,
                      {"purposes": {"default": "blocked"}},
                      [date(2026, 12, 20)], label="Wedding")

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 1}, amenities={}, guests_total=2,
        purpose_id=purpose.id,
    ))

    assert "This type of event is not available for the selected dates." in quote.blockers


async def test_requesting_more_units_than_exist_is_blocked(db_session: AsyncSession):
    ac, _, _, _ = await _seed_inventory(db_session)

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 20}, amenities={}, guests_total=40,
    ))

    assert any("Only 12 AC Room" in b for b in quote.blockers)


async def test_guest_count_beyond_capacity_is_blocked(db_session: AsyncSession):
    ac, _, _, _ = await _seed_inventory(db_session)

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 1}, amenities={}, guests_total=10,
    ))

    assert any("holds up to 4 guests" in b for b in quote.blockers)


async def test_amenity_over_request_is_blocked_when_not_permitted(db_session: AsyncSession):
    ac, _, cooler, _ = await _seed_inventory(db_session)

    quote = await build_quote(db_session, QuoteRequest(
        check_in=date(2026, 12, 20), check_out=date(2026, 12, 22),
        accommodation={ac.id: 1}, amenities={cooler.id: 50}, guests_total=2,
    ))

    assert any("Only 6 Cooler" in b for b in quote.blockers)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_quote.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.bhavan_quote'`

- [ ] **Step 3: Write the quote builder**

Create `backend/app/services/bhavan_quote.py`:

```python
"""Quote calculation.

Produces the customer-facing breakdown and, critically, translates internal
rule state into plain messages. Nothing here may name a rule, a profile or a
priority — PRD section 48 and the leakage test both depend on that.
"""

import uuid
from dataclasses import dataclass, field
from datetime import date as date_type
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AmenityPricingType, BhavanAccommodationType, BhavanAmenity, BhavanPurpose,
)
from app.services.bhavan_availability import (
    amenity_stock, available_units, committed_amenities,
)
from app.services.bhavan_rules import (
    ZERO, StayState, load_baseline, load_rules_for_dates, money, resolve_stay,
    stay_dates,
)

CLOSED_MESSAGE = "The Bhavan is unavailable for the selected dates."
PURPOSE_BLOCKED_MESSAGE = "This type of event is not available for the selected dates."


@dataclass
class QuoteRequest:
    check_in: date_type
    check_out: date_type
    accommodation: Dict[uuid.UUID, int]
    amenities: Dict[uuid.UUID, int]
    guests_total: int = 0
    purpose_id: Optional[uuid.UUID] = None
    #: Set when re-validating an existing enquiry so it does not compete with
    #: its own held inventory.
    exclude_enquiry_id: Optional[uuid.UUID] = None


@dataclass
class QuoteLine:
    kind: str          # "accommodation" | "amenity"
    label: str
    detail: str        # "2 units x 2 nights x Rs 1,500"
    quantity: int
    unit_price: Decimal
    total: Decimal


@dataclass
class Quote:
    check_in: date_type
    check_out: date_type
    nights: int
    days: int
    lines: List[QuoteLine] = field(default_factory=list)
    accommodation_total: Decimal = ZERO
    amenity_total: Decimal = ZERO
    estimated_total: Decimal = ZERO
    #: Customer-safe. Never contains a rule name, id or priority.
    blockers: List[str] = field(default_factory=list)
    available_by_type: Dict[uuid.UUID, int] = field(default_factory=dict)
    price_by_type: Dict[uuid.UUID, Decimal] = field(default_factory=dict)
    allowed_type_ids: List[uuid.UUID] = field(default_factory=list)
    allowed_amenity_ids: List[uuid.UUID] = field(default_factory=list)
    allowed_purpose_ids: List[uuid.UUID] = field(default_factory=list)
    notices: List[str] = field(default_factory=list)

    @property
    def is_bookable(self) -> bool:
        return not self.blockers


def amenity_multiplier(pricing_type: AmenityPricingType, nights: int, days: int) -> tuple[int, str]:
    """How many times an amenity's price applies, and how to describe it.

    ``per_day`` and ``per_night`` are deliberately different: a 20 to 22 Dec
    stay is 2 nights but 3 calendar days. The description is shown to the
    customer so the difference is never something they have to infer.
    """
    if pricing_type is AmenityPricingType.PER_UNIT:
        return 1, ""
    if pricing_type is AmenityPricingType.PER_NIGHT:
        return nights, f"{nights} nights"
    if pricing_type is AmenityPricingType.PER_DAY:
        return days, f"{days} days"
    return 1, ""   # per_booking and one_time


async def build_quote(db: AsyncSession, request: QuoteRequest) -> Quote:
    nights_list = stay_dates(request.check_in, request.check_out)
    nights = len(nights_list)
    days = nights + 1 if nights else 0

    quote = Quote(
        check_in=request.check_in, check_out=request.check_out,
        nights=nights, days=days,
    )

    if nights <= 0:
        quote.blockers.append("Please select a check-out date after the check-in date.")
        return quote

    baseline = await load_baseline(db)
    rules_by_date = await load_rules_for_dates(db, nights_list)
    stay: StayState = resolve_stay(request.check_in, request.check_out,
                                   rules_by_date, baseline)

    types = {
        t.id: t for t in (await db.execute(select(BhavanAccommodationType))).scalars().all()
    }
    amenities = {
        a.id: a for a in (await db.execute(select(BhavanAmenity))).scalars().all()
    }

    quote.price_by_type = dict(stay.price_by_type)
    quote.allowed_type_ids = sorted(stay.allowed_type_ids, key=str)
    quote.allowed_amenity_ids = sorted(stay.allowed_amenity_ids, key=str)
    quote.allowed_purpose_ids = sorted(stay.allowed_purpose_ids, key=str)
    quote.notices = list(stay.public_messages)

    availability = await available_units(
        db, request.check_in, request.check_out, request.exclude_enquiry_id,
    )
    quote.available_by_type = {
        type_id: (0 if type_id not in stay.allowed_type_ids else count)
        for type_id, count in availability.items()
    }

    # ── Closure ───────────────────────────────────────────────────────────
    if stay.closed:
        quote.blockers.append(CLOSED_MESSAGE)

    # ── Purpose ───────────────────────────────────────────────────────────
    if request.purpose_id is not None and request.purpose_id not in stay.allowed_purpose_ids:
        quote.blockers.append(PURPOSE_BLOCKED_MESSAGE)

    # ── Stay-length conditions ────────────────────────────────────────────
    conditions = stay.conditions
    if conditions.min_nights is not None and nights < conditions.min_nights:
        quote.blockers.append(
            f"A minimum stay of {conditions.min_nights} nights is required "
            "for the selected dates."
        )
    if conditions.max_nights is not None and nights > conditions.max_nights:
        quote.blockers.append(
            f"A maximum stay of {conditions.max_nights} nights is allowed "
            "for the selected dates."
        )

    # ── Accommodation lines ───────────────────────────────────────────────
    total_units = 0
    total_capacity = 0
    for type_id, quantity in request.accommodation.items():
        if quantity <= 0:
            continue
        acc = types.get(type_id)
        if acc is None:
            continue

        total_units += quantity

        if type_id not in stay.allowed_type_ids:
            quote.blockers.append(
                f"{acc.name} is not available for the selected dates."
            )
            continue

        free = quote.available_by_type.get(type_id, 0)
        if quantity > free:
            quote.blockers.append(
                f"Only {free} {acc.name} "
                f"{'is' if free == 1 else 'are'} available for the selected dates."
            )
            continue

        total_capacity += acc.capacity_per_unit * quantity
        stay_price = stay.price_by_type.get(type_id, ZERO)
        line_total = money(stay_price * quantity)
        per_night = money(stay_price / nights) if nights else ZERO

        quote.lines.append(QuoteLine(
            kind="accommodation",
            label=acc.name,
            detail=f"{quantity} x {nights} nights",
            quantity=quantity,
            unit_price=per_night,
            total=line_total,
        ))
        quote.accommodation_total = money(quote.accommodation_total + line_total)

    # ── Unit-count conditions ─────────────────────────────────────────────
    if conditions.min_units is not None and 0 < total_units < conditions.min_units:
        quote.blockers.append(
            f"A minimum of {conditions.min_units} units must be booked "
            "for the selected dates."
        )
    if conditions.max_units is not None and total_units > conditions.max_units:
        quote.blockers.append(
            f"A maximum of {conditions.max_units} units may be booked "
            "for the selected dates."
        )

    # ── Guest capacity ────────────────────────────────────────────────────
    if request.guests_total > 0 and total_capacity > 0 and request.guests_total > total_capacity:
        quote.blockers.append(
            f"The selected accommodation holds up to {total_capacity} guests. "
            "Please select more units or reduce the guest count."
        )
    if conditions.max_guests is not None and request.guests_total > conditions.max_guests:
        quote.blockers.append(
            f"A maximum of {conditions.max_guests} guests is allowed "
            "for the selected dates."
        )

    # ── Amenity lines ─────────────────────────────────────────────────────
    stock = await amenity_stock(db)
    held = await committed_amenities(db, nights_list, request.exclude_enquiry_id)

    for amenity_id, quantity in request.amenities.items():
        if quantity <= 0:
            continue
        amenity = amenities.get(amenity_id)
        if amenity is None:
            continue

        if amenity_id not in stay.allowed_amenity_ids:
            quote.blockers.append(
                f"{amenity.name} is not available for the selected dates."
            )
            continue

        configured = stock.get(amenity_id)
        if configured is not None and not amenity.allow_over_request:
            free = max(configured - held.get(amenity_id, 0), 0)
            if quantity > free:
                quote.blockers.append(
                    f"Only {free} {amenity.name} "
                    f"{'is' if free == 1 else 'are'} available for the selected dates."
                )
                continue

        multiplier, span = amenity_multiplier(amenity.pricing_type, nights, days)
        unit_price = money(Decimal(amenity.price))

        if amenity.pricing_type in (AmenityPricingType.PER_BOOKING,
                                    AmenityPricingType.ONE_TIME):
            line_total = unit_price
            detail = "one-time"
        else:
            line_total = money(unit_price * quantity * multiplier)
            detail = f"{quantity} x {span}" if span else f"{quantity} units"

        quote.lines.append(QuoteLine(
            kind="amenity",
            label=amenity.name,
            detail=detail,
            quantity=quantity,
            unit_price=unit_price,
            total=line_total,
        ))
        quote.amenity_total = money(quote.amenity_total + line_total)

    quote.estimated_total = money(quote.accommodation_total + quote.amenity_total)
    return quote
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_quote.py -v`
Expected: 9 passed

- [ ] **Step 5: Run the whole backend suite**

Run: `cd backend && python -m pytest tests/ -v`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/bhavan_quote.py backend/tests/test_bhavan_quote.py
git commit -m "feat(bhavan): add quote builder with customer-safe blockers"
```

---

# Phase 3 — Admin API

### Task 7: Admin inventory API

**Files:**
- Create: `backend/app/services/bhavan_audit.py`, `backend/app/schemas/bhavan_admin.py`, `backend/app/routers/bhavan_admin.py`
- Modify: `backend/app/main.py` (import + `include_router`)
- Test: `backend/tests/test_bhavan_admin_inventory.py`

**Interfaces:**
- Consumes: `get_current_admin` (`app.dependencies`), models from Task 1, `get_settings_row` (Task 4)
- Produces: `record_audit(db, admin, action, target_table, target_id, old, new)`; router mounted at `/api/v1/admin/bhavan`; schemas `AccommodationTypeIn/Out`, `UnitIn/Out`, `AmenityIn/Out`, `PurposeIn/Out`, `SettingsIn/Out`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_admin_inventory.py`:

```python
"""Admin inventory CRUD, permission gating, and audit trail."""

import uuid
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.audit import AuditLog
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        first_name="Admin", surname="User", mobile="9000000001",
        role=UserRole.ADMIN, is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def test_creating_an_accommodation_type_writes_an_audit_row(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    response = await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00", "description": "Air-conditioned room",
    })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == "AC Room"
    assert body["available_units"] == 0

    logs = (await db_session.execute(select(AuditLog))).scalars().all()
    assert any(log.target_table == "bhavan_accommodation_types" for log in logs)


async def test_bulk_creating_units_reports_capacity(
    client: AsyncClient, admin_user: User
):
    created = (await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00",
    })).json()

    response = await client.post(
        f"/api/v1/admin/bhavan/accommodation-types/{created['id']}/units/bulk",
        json={"prefix": "1", "start": 1, "count": 3},
    )
    assert response.status_code == 201, response.text
    assert len(response.json()) == 3

    listed = (await client.get("/api/v1/admin/bhavan/accommodation-types")).json()
    assert listed[0]["available_units"] == 3


async def test_marking_a_unit_for_maintenance_reduces_capacity(
    client: AsyncClient, admin_user: User
):
    acc = (await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00",
    })).json()
    units = (await client.post(
        f"/api/v1/admin/bhavan/accommodation-types/{acc['id']}/units/bulk",
        json={"prefix": "1", "start": 1, "count": 2},
    )).json()

    patched = await client.patch(
        f"/api/v1/admin/bhavan/units/{units[0]['id']}",
        json={"status": "maintenance"},
    )
    assert patched.status_code == 200

    listed = (await client.get("/api/v1/admin/bhavan/accommodation-types")).json()
    assert listed[0]["available_units"] == 1


async def test_amenity_requires_a_valid_pricing_type(client: AsyncClient, admin_user: User):
    bad = await client.post("/api/v1/admin/bhavan/amenities", json={
        "name": "Chair", "price": "10.00", "pricing_type": "per_fortnight",
    })
    assert bad.status_code == 422


async def test_amenity_round_trips_with_its_pricing_type(client: AsyncClient, admin_user: User):
    response = await client.post("/api/v1/admin/bhavan/amenities", json={
        "name": "Cooler", "price": "500.00", "pricing_type": "per_day",
        "available_quantity": 6,
    })
    assert response.status_code == 201, response.text
    assert response.json()["pricing_type"] == "per_day"


async def test_settings_singleton_updates_in_place(client: AsyncClient, admin_user: User):
    first = (await client.get("/api/v1/admin/bhavan/settings")).json()
    updated = await client.put("/api/v1/admin/bhavan/settings", json={
        "default_min_nights": 2, "advance_booking_days": 3,
        "otp_ttl_seconds": 300, "otp_resend_cooldown_seconds": 60,
        "otp_max_attempts": 5, "required_fields": {"email": True},
    })
    assert updated.status_code == 200
    assert updated.json()["default_min_nights"] == 2
    assert updated.json()["id"] == first["id"], "must not create a second row"


async def test_anonymous_requests_are_rejected(client: AsyncClient):
    response = await client.get("/api/v1/admin/bhavan/accommodation-types")
    assert response.status_code in (401, 403)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_admin_inventory.py -v`
Expected: FAIL — 404 on every route (router not mounted)

- [ ] **Step 3: Write the audit helper**

Create `backend/app/services/bhavan_audit.py`:

```python
"""Audit trail for Bhavan admin actions (PRD section 42).

Reuses the existing AuditLog model rather than adding a Bhavan-specific one,
so the admin audit view can eventually cover the whole portal.
"""

import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


def _serialisable(value: Any) -> Any:
    """AuditLog.old_value/new_value are JSON columns; UUIDs, Decimals and
    dates are not JSON-native."""
    if value is None:
        return None
    if isinstance(value, dict):
        return {str(k): _serialisable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialisable(v) for v in value]
    if isinstance(value, (uuid.UUID,)):
        return str(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "value"):          # enum
        return value.value
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


async def record_audit(
    db: AsyncSession,
    admin,
    action: str,
    target_table: str,
    target_id: Optional[uuid.UUID] = None,
    old: Optional[dict] = None,
    new: Optional[dict] = None,
) -> None:
    """Append an audit entry. Never raises — an audit failure must not roll
    back the change the admin actually asked for."""
    try:
        db.add(AuditLog(
            admin_id=admin.user_id,
            action=action,
            target_table=target_table,
            target_id=target_id,
            old_value=_serialisable(old),
            new_value=_serialisable(new),
        ))
        await db.flush()
    except Exception:                     # pragma: no cover - defensive
        import logging
        logging.getLogger(__name__).exception("Failed to write Bhavan audit entry")
```

- [ ] **Step 4: Write the admin schemas**

Create `backend/app/schemas/bhavan_admin.py`:

```python
"""Admin-facing request and response models.

Separate from app/schemas/bhavan_public.py on purpose: these carry rule names,
timestamps and internal notes that must never reach a customer.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, EnquirySource, EnquiryStatus,
    RuleCategory, RuleStatus, UnitStatus,
)


class AccommodationImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    path: str
    sort_order: int


class AccommodationTypeIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: AccommodationKind = AccommodationKind.ROOM
    description: Optional[str] = None
    capacity_per_unit: int = Field(default=1, ge=1)
    base_price_per_night: Decimal = Field(ge=0)
    sort_order: int = 0
    is_active: bool = True


class AccommodationTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    kind: AccommodationKind
    description: Optional[str]
    capacity_per_unit: int
    base_price_per_night: Decimal
    sort_order: int
    is_active: bool
    images: List[AccommodationImageOut] = []
    available_units: int = 0
    total_units: int = 0


class UnitIn(BaseModel):
    label: str = Field(min_length=1, max_length=50)
    capacity: Optional[int] = Field(default=None, ge=1)
    status: UnitStatus = UnitStatus.AVAILABLE
    notes: Optional[str] = None


class UnitPatch(BaseModel):
    label: Optional[str] = Field(default=None, min_length=1, max_length=50)
    capacity: Optional[int] = Field(default=None, ge=1)
    status: Optional[UnitStatus] = None
    notes: Optional[str] = None


class UnitBulkIn(BaseModel):
    prefix: str = ""
    start: int = Field(default=1, ge=0)
    count: int = Field(ge=1, le=200)


class UnitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    accommodation_type_id: uuid.UUID
    label: str
    capacity: Optional[int]
    status: UnitStatus
    notes: Optional[str]


class AmenityIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    image_path: Optional[str] = None
    price: Decimal = Field(ge=0)
    pricing_type: AmenityPricingType = AmenityPricingType.PER_UNIT
    available_quantity: Optional[int] = Field(default=None, ge=0)
    allow_over_request: bool = False
    is_active: bool = True
    sort_order: int = 0


class AmenityOut(AmenityIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class PurposeIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    is_active: bool = True
    sort_order: int = 0


class PurposeOut(PurposeIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class SettingsIn(BaseModel):
    default_min_nights: int = Field(ge=1)
    default_max_nights: Optional[int] = Field(default=None, ge=1)
    advance_booking_days: int = Field(default=0, ge=0)
    otp_ttl_seconds: int = Field(default=600, ge=60, le=3600)
    otp_resend_cooldown_seconds: int = Field(default=60, ge=15, le=600)
    otp_max_attempts: int = Field(default=5, ge=1, le=20)
    required_fields: Dict[str, bool] = Field(default_factory=dict)
    contact_phone: Optional[str] = None
    intro_text: Optional[str] = None


class SettingsOut(SettingsIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
```

- [ ] **Step 5: Write the admin router**

Create `backend/app/routers/bhavan_admin.py`:

```python
"""Bhavan admin API.

Every mutation writes an audit entry. Response models come from
app/schemas/bhavan_admin.py and may contain internal detail — this router is
behind get_current_admin and is never reachable by a customer.
"""

import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_admin, get_db
from app.models.bhavan import (
    BhavanAccommodationImage, BhavanAccommodationType, BhavanAmenity,
    BhavanPurpose, BhavanUnit, UnitStatus,
)
from app.schemas.bhavan_admin import (
    AccommodationTypeIn, AccommodationTypeOut, AmenityIn, AmenityOut, PurposeIn,
    PurposeOut, SettingsIn, SettingsOut, UnitBulkIn, UnitIn, UnitOut, UnitPatch,
)
from app.services.bhavan_audit import record_audit
from app.services.bhavan_settings import get_settings_row

router = APIRouter(
    prefix="/api/v1/admin/bhavan",
    tags=["Bhavan Admin"],
    dependencies=[Depends(get_current_admin)],
)

UPLOAD_DIR = Path("uploads") / "bhavan"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


# ─── Accommodation types ──────────────────────────────────────────────────────

async def _unit_counts(db: AsyncSession) -> dict:
    """{type_id: (total_units, available_units)}."""
    rows = (await db.execute(
        select(
            BhavanUnit.accommodation_type_id,
            func.count(BhavanUnit.id),
            func.sum(case((BhavanUnit.status == UnitStatus.AVAILABLE, 1), else_=0)),
        ).group_by(BhavanUnit.accommodation_type_id)
    )).all()
    return {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in rows}


def _type_out(acc: BhavanAccommodationType, counts: dict) -> AccommodationTypeOut:
    total, available = counts.get(acc.id, (0, 0))
    out = AccommodationTypeOut.model_validate(acc)
    out.total_units = total
    out.available_units = available
    return out


@router.get("/accommodation-types", response_model=List[AccommodationTypeOut])
async def list_accommodation_types(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.images))
        .order_by(BhavanAccommodationType.sort_order, BhavanAccommodationType.name)
    )).scalars().all()
    counts = await _unit_counts(db)
    return [_type_out(acc, counts) for acc in rows]


@router.post("/accommodation-types", response_model=AccommodationTypeOut,
             status_code=status.HTTP_201_CREATED)
async def create_accommodation_type(
    payload: AccommodationTypeIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    acc = BhavanAccommodationType(**payload.model_dump())
    db.add(acc)
    await db.flush()
    await record_audit(db, admin, "create", "bhavan_accommodation_types", acc.id,
                       None, payload.model_dump())
    await db.commit()
    await db.refresh(acc, ["images"])
    return _type_out(acc, await _unit_counts(db))


@router.put("/accommodation-types/{type_id}", response_model=AccommodationTypeOut)
async def update_accommodation_type(
    type_id: uuid.UUID,
    payload: AccommodationTypeIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    acc = await db.get(BhavanAccommodationType, type_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Accommodation type not found")

    old = {
        "name": acc.name,
        "base_price_per_night": acc.base_price_per_night,
        "capacity_per_unit": acc.capacity_per_unit,
        "is_active": acc.is_active,
    }
    for key, value in payload.model_dump().items():
        setattr(acc, key, value)
    await record_audit(db, admin, "update", "bhavan_accommodation_types", acc.id,
                       old, payload.model_dump())
    await db.commit()
    await db.refresh(acc, ["images"])
    return _type_out(acc, await _unit_counts(db))


@router.delete("/accommodation-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_accommodation_type(
    type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Deactivates rather than deletes: historical enquiries reference the type."""
    acc = await db.get(BhavanAccommodationType, type_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Accommodation type not found")
    acc.is_active = False
    await record_audit(db, admin, "deactivate", "bhavan_accommodation_types", acc.id,
                       {"is_active": True}, {"is_active": False})
    await db.commit()


# ─── Image upload ─────────────────────────────────────────────────────────────

@router.post("/accommodation-types/{type_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_accommodation_image(
    type_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Store an uploaded photo.

    Bytes go to the uploaded_files table AND to disk. The host filesystem is
    ephemeral, so the database copy is the one that survives a deploy; the
    /uploads/{category}/{filename} route in main.py checks the table first.
    """
    acc = await db.get(BhavanAccommodationType, type_id)
    if acc is None:
        raise HTTPException(status_code=404, detail="Accommodation type not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: "
                   f"{', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large. Max 8 MB.")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / unique_name).write_bytes(contents)

    from app.models.blog import UploadedFile
    db.add(UploadedFile(
        filename=unique_name,
        mimetype=file.content_type or "application/octet-stream",
        data=contents,
    ))

    next_order = (await db.execute(
        select(func.coalesce(func.max(BhavanAccommodationImage.sort_order), -1))
        .where(BhavanAccommodationImage.accommodation_type_id == type_id)
    )).scalar_one() + 1

    image = BhavanAccommodationImage(
        accommodation_type_id=type_id,
        path=f"/uploads/bhavan/{unique_name}",
        sort_order=next_order,
    )
    db.add(image)
    await db.flush()
    await record_audit(db, admin, "upload_image", "bhavan_accommodation_images",
                       image.id, None, {"path": image.path})
    await db.commit()
    return {"id": str(image.id), "path": image.path, "sort_order": image.sort_order}


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_accommodation_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    image = await db.get(BhavanAccommodationImage, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    await record_audit(db, admin, "delete", "bhavan_accommodation_images", image.id,
                       {"path": image.path}, None)
    await db.delete(image)
    await db.commit()


# ─── Units ────────────────────────────────────────────────────────────────────

@router.get("/accommodation-types/{type_id}/units", response_model=List[UnitOut])
async def list_units(type_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(BhavanUnit)
        .where(BhavanUnit.accommodation_type_id == type_id)
        .order_by(BhavanUnit.label)
    )).scalars().all()


@router.post("/accommodation-types/{type_id}/units", response_model=UnitOut,
             status_code=status.HTTP_201_CREATED)
async def create_unit(
    type_id: uuid.UUID,
    payload: UnitIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if await db.get(BhavanAccommodationType, type_id) is None:
        raise HTTPException(status_code=404, detail="Accommodation type not found")
    unit = BhavanUnit(accommodation_type_id=type_id, **payload.model_dump())
    db.add(unit)
    await db.flush()
    await record_audit(db, admin, "create", "bhavan_units", unit.id, None,
                       payload.model_dump())
    await db.commit()
    return unit


@router.post("/accommodation-types/{type_id}/units/bulk", response_model=List[UnitOut],
             status_code=status.HTTP_201_CREATED)
async def bulk_create_units(
    type_id: uuid.UUID,
    payload: UnitBulkIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Twelve rooms should not mean twelve form submissions."""
    if await db.get(BhavanAccommodationType, type_id) is None:
        raise HTTPException(status_code=404, detail="Accommodation type not found")

    existing = set((await db.execute(
        select(BhavanUnit.label).where(BhavanUnit.accommodation_type_id == type_id)
    )).scalars().all())

    created = []
    for offset in range(payload.count):
        label = f"{payload.prefix}{payload.start + offset:02d}"
        if label in existing:
            continue
        unit = BhavanUnit(accommodation_type_id=type_id, label=label)
        db.add(unit)
        created.append(unit)

    await db.flush()
    await record_audit(db, admin, "bulk_create", "bhavan_units", type_id, None,
                       {"labels": [u.label for u in created]})
    await db.commit()
    return created


@router.patch("/units/{unit_id}", response_model=UnitOut)
async def update_unit(
    unit_id: uuid.UUID,
    payload: UnitPatch,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    unit = await db.get(BhavanUnit, unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")

    old = {"label": unit.label, "status": unit.status}
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, key, value)
    await record_audit(db, admin, "update", "bhavan_units", unit.id, old,
                       payload.model_dump(exclude_unset=True))
    await db.commit()
    return unit


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    unit = await db.get(BhavanUnit, unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    await record_audit(db, admin, "delete", "bhavan_units", unit.id,
                       {"label": unit.label}, None)
    await db.delete(unit)
    await db.commit()


# ─── Amenities ────────────────────────────────────────────────────────────────

@router.get("/amenities", response_model=List[AmenityOut])
async def list_amenities(db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(BhavanAmenity).order_by(BhavanAmenity.sort_order, BhavanAmenity.name)
    )).scalars().all()


@router.post("/amenities", response_model=AmenityOut, status_code=status.HTTP_201_CREATED)
async def create_amenity(
    payload: AmenityIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    amenity = BhavanAmenity(**payload.model_dump())
    db.add(amenity)
    await db.flush()
    await record_audit(db, admin, "create", "bhavan_amenities", amenity.id, None,
                       payload.model_dump())
    await db.commit()
    return amenity


@router.put("/amenities/{amenity_id}", response_model=AmenityOut)
async def update_amenity(
    amenity_id: uuid.UUID,
    payload: AmenityIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    amenity = await db.get(BhavanAmenity, amenity_id)
    if amenity is None:
        raise HTTPException(status_code=404, detail="Amenity not found")
    old = {"name": amenity.name, "price": amenity.price,
           "pricing_type": amenity.pricing_type}
    for key, value in payload.model_dump().items():
        setattr(amenity, key, value)
    await record_audit(db, admin, "update", "bhavan_amenities", amenity.id, old,
                       payload.model_dump())
    await db.commit()
    return amenity


@router.post("/amenities/{amenity_id}/image", status_code=status.HTTP_201_CREATED)
async def upload_amenity_image(
    amenity_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    amenity = await db.get(BhavanAmenity, amenity_id)
    if amenity is None:
        raise HTTPException(status_code=404, detail="Amenity not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed")
    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large. Max 8 MB.")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / unique_name).write_bytes(contents)

    from app.models.blog import UploadedFile
    db.add(UploadedFile(filename=unique_name,
                        mimetype=file.content_type or "application/octet-stream",
                        data=contents))
    amenity.image_path = f"/uploads/bhavan/{unique_name}"
    await db.commit()
    return {"path": amenity.image_path}


@router.delete("/amenities/{amenity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_amenity(
    amenity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    amenity = await db.get(BhavanAmenity, amenity_id)
    if amenity is None:
        raise HTTPException(status_code=404, detail="Amenity not found")
    amenity.is_active = False
    await record_audit(db, admin, "deactivate", "bhavan_amenities", amenity.id,
                       {"is_active": True}, {"is_active": False})
    await db.commit()


# ─── Purposes ─────────────────────────────────────────────────────────────────

@router.get("/purposes", response_model=List[PurposeOut])
async def list_purposes(db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(BhavanPurpose).order_by(BhavanPurpose.sort_order, BhavanPurpose.name)
    )).scalars().all()


@router.post("/purposes", response_model=PurposeOut, status_code=status.HTTP_201_CREATED)
async def create_purpose(
    payload: PurposeIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    purpose = BhavanPurpose(**payload.model_dump())
    db.add(purpose)
    await db.flush()
    await record_audit(db, admin, "create", "bhavan_purposes", purpose.id, None,
                       payload.model_dump())
    await db.commit()
    return purpose


@router.put("/purposes/{purpose_id}", response_model=PurposeOut)
async def update_purpose(
    purpose_id: uuid.UUID,
    payload: PurposeIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    purpose = await db.get(BhavanPurpose, purpose_id)
    if purpose is None:
        raise HTTPException(status_code=404, detail="Purpose not found")
    old = {"name": purpose.name, "is_active": purpose.is_active}
    for key, value in payload.model_dump().items():
        setattr(purpose, key, value)
    await record_audit(db, admin, "update", "bhavan_purposes", purpose.id, old,
                       payload.model_dump())
    await db.commit()
    return purpose


# ─── Settings ─────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=SettingsOut)
async def read_settings(db: AsyncSession = Depends(get_db)):
    row = await get_settings_row(db)
    await db.commit()
    return row


@router.put("/settings", response_model=SettingsOut)
async def update_settings(
    payload: SettingsIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    row = await get_settings_row(db)
    old = {"default_min_nights": row.default_min_nights,
           "advance_booking_days": row.advance_booking_days}
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    await record_audit(db, admin, "update", "bhavan_settings", row.id, old,
                       payload.model_dump())
    await db.commit()
    return row
```

- [ ] **Step 6: Mount the router**

In `backend/app/main.py`, add to the imports near the other routers:

```python
from app.routers.bhavan_admin import router as bhavan_admin_router
```

and after `app.include_router(role_router)`:

```python
app.include_router(bhavan_admin_router)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_admin_inventory.py -v`
Expected: 7 passed

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/bhavan_audit.py backend/app/schemas/bhavan_admin.py backend/app/routers/bhavan_admin.py backend/app/main.py backend/tests/test_bhavan_admin_inventory.py
git commit -m "feat(bhavan): add admin inventory API with image upload"
```

---

### Task 8: Admin rules API

**Files:**
- Modify: `backend/app/routers/bhavan_admin.py` (append), `backend/app/schemas/bhavan_admin.py` (append)
- Test: `backend/tests/test_bhavan_admin_rules.py`

**Interfaces:**
- Consumes: `record_audit`, `parse_config`, models from Task 1
- Produces: endpoints `GET/POST/PUT /rule-profiles`, `POST /rule-profiles/{id}/duplicate`, `GET/POST /rule-assignments`, `POST /rule-assignments/{id}/dates`, `DELETE /rule-assignments/{id}/dates`, `POST /rule-assignments/{id}/revoke`; schemas `RuleProfileIn/Out`, `RuleAssignmentIn/Out`, `DateSetIn`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_admin_rules.py`:

```python
"""Rule profiles, date sets and the add/remove-dates operations the PRD's
section 8.1 requires."""

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(first_name="Admin", surname="User", mobile="9000000002",
                role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def _create_profile(client, name="Wedding", config=None):
    response = await client.post("/api/v1/admin/bhavan/rule-profiles", json={
        "name": name, "category": "event",
        "config": config or {"conditions": {"min_nights": 2}},
    })
    assert response.status_code == 201, response.text
    return response.json()


async def test_invalid_config_is_rejected_before_it_reaches_the_database(
    client: AsyncClient, admin_user: User
):
    response = await client.post("/api/v1/admin/bhavan/rule-profiles", json={
        "name": "Broken", "category": "event",
        "config": {"pricing": {"mode": "discount_percent", "value": 150}},
    })
    assert response.status_code == 422


async def test_applying_a_profile_expands_ranges_and_singles(
    client: AsyncClient, admin_user: User
):
    profile = await _create_profile(client)

    response = await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": profile["id"],
        "label": "Wedding Dates 2027",
        "dates": ["2027-01-05", "2027-01-18"],
        "ranges": [{"start": "2027-02-02", "end": "2027-02-05"}],
    })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["label"] == "Wedding Dates 2027"
    assert body["date_count"] == 6, "2 singles + a 4-day inclusive range"
    assert "2027-02-03" in body["dates"]


async def test_the_snapshot_is_frozen_against_later_profile_edits(
    client: AsyncClient, admin_user: User
):
    profile = await _create_profile(client)
    assignment = (await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": profile["id"], "label": "Set", "dates": ["2027-01-05"],
    })).json()

    await client.put(f"/api/v1/admin/bhavan/rule-profiles/{profile['id']}", json={
        "name": "Wedding", "category": "event",
        "config": {"conditions": {"min_nights": 9}},
    })

    reloaded = (await client.get(
        f"/api/v1/admin/bhavan/rule-assignments/{assignment['id']}"
    )).json()
    assert reloaded["config_snapshot"]["conditions"]["min_nights"] == 2


async def test_removing_one_date_leaves_the_rest_intact(
    client: AsyncClient, admin_user: User
):
    """PRD section 8.1 — this is why dates are stored one row per day."""
    profile = await _create_profile(client)
    assignment = (await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": profile["id"], "label": "Set",
        "ranges": [{"start": "2026-12-10", "end": "2026-12-20"}],
    })).json()
    assert assignment["date_count"] == 11

    response = await client.request(
        "DELETE", f"/api/v1/admin/bhavan/rule-assignments/{assignment['id']}/dates",
        json={"dates": ["2026-12-15"]},
    )
    assert response.status_code == 200
    assert response.json()["date_count"] == 10
    assert "2026-12-15" not in response.json()["dates"]


async def test_adding_dates_to_an_existing_assignment_is_idempotent(
    client: AsyncClient, admin_user: User
):
    profile = await _create_profile(client)
    assignment = (await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": profile["id"], "label": "Set", "dates": ["2027-01-05"],
    })).json()

    first = await client.post(
        f"/api/v1/admin/bhavan/rule-assignments/{assignment['id']}/dates",
        json={"dates": ["2027-01-06", "2027-01-05"]},
    )
    assert first.json()["date_count"] == 2, "the duplicate is ignored"


async def test_revoking_keeps_the_assignment_in_history(
    client: AsyncClient, admin_user: User
):
    profile = await _create_profile(client)
    assignment = (await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": profile["id"], "label": "Set", "dates": ["2027-01-05"],
    })).json()

    revoked = await client.post(
        f"/api/v1/admin/bhavan/rule-assignments/{assignment['id']}/revoke",
        json={"note": "Superseded"},
    )
    assert revoked.status_code == 200
    assert revoked.json()["revoked_at"] is not None

    listed = (await client.get(
        "/api/v1/admin/bhavan/rule-assignments?include_revoked=true"
    )).json()
    assert any(a["id"] == assignment["id"] for a in listed)


async def test_duplicating_a_template_copies_its_config(
    client: AsyncClient, admin_user: User
):
    template = await _create_profile(client, name="Wedding Template")
    response = await client.post(
        f"/api/v1/admin/bhavan/rule-profiles/{template['id']}/duplicate",
        json={"name": "Diwali Wedding"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Diwali Wedding"
    assert response.json()["config"] == template["config"]
    assert response.json()["id"] != template["id"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_admin_rules.py -v`
Expected: FAIL — 404 on `/rule-profiles`

- [ ] **Step 3: Append the rule schemas**

Add to `backend/app/schemas/bhavan_admin.py`:

```python
class RuleProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: RuleCategory = RuleCategory.CUSTOM
    description: Optional[str] = None
    config: dict = Field(default_factory=dict)
    status: RuleStatus = RuleStatus.ACTIVE
    is_template: bool = False


class RuleProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    category: RuleCategory
    description: Optional[str]
    config: dict
    status: RuleStatus
    is_template: bool
    created_at: datetime
    updated_at: datetime


class DuplicateProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class DateRangeIn(BaseModel):
    start: date
    end: date


class RuleAssignmentIn(BaseModel):
    profile_id: uuid.UUID
    label: str = Field(min_length=1, max_length=200)
    dates: List[date] = Field(default_factory=list)
    ranges: List[DateRangeIn] = Field(default_factory=list)
    note: Optional[str] = None


class DateSetIn(BaseModel):
    dates: List[date] = Field(default_factory=list)
    ranges: List[DateRangeIn] = Field(default_factory=list)


class RevokeIn(BaseModel):
    note: Optional[str] = None


class RuleAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    profile_id: uuid.UUID
    profile_name: Optional[str] = None
    label: str
    config_snapshot: dict
    applied_at: datetime
    is_active: bool
    revoked_at: Optional[datetime]
    note: Optional[str]
    dates: List[date] = []
    date_count: int = 0
```

- [ ] **Step 4: Append the rule endpoints**

Add to `backend/app/routers/bhavan_admin.py`:

```python
# ─── Rule profiles ────────────────────────────────────────────────────────────

from datetime import date as date_type, datetime, timedelta, timezone

from pydantic import ValidationError

from app.models.bhavan import (
    BhavanRuleAssignment, BhavanRuleAssignmentDate, BhavanRuleProfile,
)
from app.schemas.bhavan_admin import (
    DateSetIn, DuplicateProfileIn, RevokeIn, RuleAssignmentIn, RuleAssignmentOut,
    RuleProfileIn, RuleProfileOut,
)
from app.schemas.bhavan_rules import parse_config


def _validated_config(raw: dict) -> dict:
    """Reject a malformed rule before it can price anything wrongly."""
    try:
        parse_config(raw)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    return raw


def _expand_dates(dates, ranges) -> list:
    """Singles plus inclusive ranges, de-duplicated and sorted."""
    collected = set(dates or [])
    for span in ranges or []:
        if span.end < span.start:
            raise HTTPException(
                status_code=422,
                detail="A date range must end on or after it starts.",
            )
        if (span.end - span.start).days > 730:
            raise HTTPException(
                status_code=422,
                detail="A single range may not exceed two years.",
            )
        cursor = span.start
        while cursor <= span.end:
            collected.add(cursor)
            cursor += timedelta(days=1)
    return sorted(collected)


@router.get("/rule-profiles", response_model=List[RuleProfileOut])
async def list_rule_profiles(
    include_templates: bool = True,
    db: AsyncSession = Depends(get_db),
):
    query = select(BhavanRuleProfile).order_by(BhavanRuleProfile.name)
    if not include_templates:
        query = query.where(BhavanRuleProfile.is_template.is_(False))
    return (await db.execute(query)).scalars().all()


@router.post("/rule-profiles", response_model=RuleProfileOut,
             status_code=status.HTTP_201_CREATED)
async def create_rule_profile(
    payload: RuleProfileIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    data = payload.model_dump()
    data["config"] = _validated_config(data["config"])
    profile = BhavanRuleProfile(**data, created_by=admin.user_id, updated_by=admin.user_id)
    db.add(profile)
    await db.flush()
    await record_audit(db, admin, "create", "bhavan_rule_profiles", profile.id, None, data)
    await db.commit()
    return profile


@router.put("/rule-profiles/{profile_id}", response_model=RuleProfileOut)
async def update_rule_profile(
    profile_id: uuid.UUID,
    payload: RuleProfileIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Editing a profile does NOT change any assignment already applied — each
    assignment carries its own config snapshot."""
    profile = await db.get(BhavanRuleProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Rule profile not found")

    old = {"name": profile.name, "config": profile.config, "status": profile.status}
    data = payload.model_dump()
    data["config"] = _validated_config(data["config"])
    for key, value in data.items():
        setattr(profile, key, value)
    profile.updated_by = admin.user_id
    await record_audit(db, admin, "update", "bhavan_rule_profiles", profile.id, old, data)
    await db.commit()
    return profile


@router.post("/rule-profiles/{profile_id}/duplicate", response_model=RuleProfileOut,
             status_code=status.HTTP_201_CREATED)
async def duplicate_rule_profile(
    profile_id: uuid.UUID,
    payload: DuplicateProfileIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """PRD section 46: start a new rule from an existing template."""
    source = await db.get(BhavanRuleProfile, profile_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Rule profile not found")

    copy = BhavanRuleProfile(
        name=payload.name,
        category=source.category,
        description=source.description,
        config=dict(source.config or {}),
        status=source.status,
        is_template=False,
        created_by=admin.user_id,
        updated_by=admin.user_id,
    )
    db.add(copy)
    await db.flush()
    await record_audit(db, admin, "duplicate", "bhavan_rule_profiles", copy.id,
                       {"source": str(profile_id)}, {"name": copy.name})
    await db.commit()
    return copy


# ─── Rule assignments ─────────────────────────────────────────────────────────

async def _assignment_out(db: AsyncSession, assignment) -> RuleAssignmentOut:
    dates = (await db.execute(
        select(BhavanRuleAssignmentDate.date)
        .where(BhavanRuleAssignmentDate.assignment_id == assignment.id)
        .order_by(BhavanRuleAssignmentDate.date)
    )).scalars().all()
    profile = await db.get(BhavanRuleProfile, assignment.profile_id)
    out = RuleAssignmentOut.model_validate(assignment)
    out.dates = list(dates)
    out.date_count = len(dates)
    out.profile_name = profile.name if profile else None
    return out


@router.get("/rule-assignments", response_model=List[RuleAssignmentOut])
async def list_rule_assignments(
    include_revoked: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(BhavanRuleAssignment).order_by(BhavanRuleAssignment.applied_at.desc())
    if not include_revoked:
        query = query.where(BhavanRuleAssignment.revoked_at.is_(None))
    rows = (await db.execute(query)).scalars().all()
    return [await _assignment_out(db, row) for row in rows]


@router.get("/rule-assignments/{assignment_id}", response_model=RuleAssignmentOut)
async def read_rule_assignment(
    assignment_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    assignment = await db.get(BhavanRuleAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Rule assignment not found")
    return await _assignment_out(db, assignment)


@router.post("/rule-assignments", response_model=RuleAssignmentOut,
             status_code=status.HTTP_201_CREATED)
async def create_rule_assignment(
    payload: RuleAssignmentIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Apply a profile to a set of dates.

    applied_at is set to now, which is the priority key: this assignment now
    outranks every earlier one on any date they share.
    """
    profile = await db.get(BhavanRuleProfile, payload.profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Rule profile not found")

    days = _expand_dates(payload.dates, payload.ranges)
    if not days:
        raise HTTPException(status_code=422, detail="Select at least one date.")

    assignment = BhavanRuleAssignment(
        profile_id=profile.id,
        label=payload.label,
        config_snapshot=dict(profile.config or {}),
        applied_at=datetime.now(timezone.utc),
        applied_by=admin.user_id,
        note=payload.note,
    )
    db.add(assignment)
    await db.flush()

    for day in days:
        db.add(BhavanRuleAssignmentDate(assignment_id=assignment.id, date=day))

    await record_audit(db, admin, "apply_rule", "bhavan_rule_assignments",
                       assignment.id, None,
                       {"label": payload.label, "profile": profile.name,
                        "date_count": len(days)})
    await db.commit()
    return await _assignment_out(db, assignment)


@router.post("/rule-assignments/{assignment_id}/dates", response_model=RuleAssignmentOut)
async def add_assignment_dates(
    assignment_id: uuid.UUID,
    payload: DateSetIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    assignment = await db.get(BhavanRuleAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Rule assignment not found")

    existing = set((await db.execute(
        select(BhavanRuleAssignmentDate.date)
        .where(BhavanRuleAssignmentDate.assignment_id == assignment_id)
    )).scalars().all())

    added = [d for d in _expand_dates(payload.dates, payload.ranges) if d not in existing]
    for day in added:
        db.add(BhavanRuleAssignmentDate(assignment_id=assignment_id, date=day))

    await record_audit(db, admin, "add_dates", "bhavan_rule_assignments",
                       assignment_id, None, {"added": [d.isoformat() for d in added]})
    await db.commit()
    return await _assignment_out(db, assignment)


@router.delete("/rule-assignments/{assignment_id}/dates", response_model=RuleAssignmentOut)
async def remove_assignment_dates(
    assignment_id: uuid.UUID,
    payload: DateSetIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Remove individual dates. One delete per day, because dates are stored
    expanded rather than as ranges."""
    assignment = await db.get(BhavanRuleAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Rule assignment not found")

    removing = _expand_dates(payload.dates, payload.ranges)
    rows = (await db.execute(
        select(BhavanRuleAssignmentDate).where(
            BhavanRuleAssignmentDate.assignment_id == assignment_id,
            BhavanRuleAssignmentDate.date.in_(removing),
        )
    )).scalars().all()
    for row in rows:
        await db.delete(row)

    await record_audit(db, admin, "remove_dates", "bhavan_rule_assignments",
                       assignment_id,
                       {"removed": [d.isoformat() for d in removing]}, None)
    await db.commit()
    return await _assignment_out(db, assignment)


@router.post("/rule-assignments/{assignment_id}/revoke", response_model=RuleAssignmentOut)
async def revoke_rule_assignment(
    assignment_id: uuid.UUID,
    payload: RevokeIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Revoked, never deleted: PRD section 20 requires the history to survive."""
    assignment = await db.get(BhavanRuleAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Rule assignment not found")

    assignment.is_active = False
    assignment.revoked_at = datetime.now(timezone.utc)
    assignment.revoked_by = admin.user_id
    if payload.note:
        assignment.note = payload.note

    await record_audit(db, admin, "revoke", "bhavan_rule_assignments", assignment_id,
                       {"is_active": True}, {"is_active": False, "note": payload.note})
    await db.commit()
    return await _assignment_out(db, assignment)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_admin_rules.py -v`
Expected: 7 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/bhavan_admin.py backend/app/schemas/bhavan_admin.py backend/tests/test_bhavan_admin_rules.py
git commit -m "feat(bhavan): add admin rule profile and date-set API"
```

---

### Task 9: Admin calendar API

**Files:**
- Modify: `backend/app/routers/bhavan_admin.py` (append), `backend/app/schemas/bhavan_admin.py` (append)
- Test: `backend/tests/test_bhavan_calendar.py`

**Interfaces:**
- Consumes: `resolve_day`, `load_baseline`, `load_rules_for_dates`, `available_units`
- Produces: `GET /calendar?year=&month=` returning `CalendarDayOut[]`; `GET /calendar/{day}` returning `CalendarDayDetailOut` with the full layer stack

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_calendar.py`:

```python
"""The admin calendar shows effective state, and the day detail explains why.

This encodes the PRD section 39 conflict example exactly: Wedding 10-20 Dec,
then Maintenance on 15 Dec, then a Social Event on 18 Dec.
"""

from datetime import date

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(first_name="Admin", surname="User", mobile="9000000003",
                role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def _apply(client, name, config, dates=None, ranges=None):
    profile = (await client.post("/api/v1/admin/bhavan/rule-profiles", json={
        "name": name, "category": "event", "config": config,
    })).json()
    return (await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": profile["id"], "label": name,
        "dates": dates or [], "ranges": ranges or [],
    })).json()


async def test_prd_section_39_conflict_resolution(client: AsyncClient, admin_user: User):
    await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00",
    })

    await _apply(client, "Wedding", {"conditions": {"min_nights": 2}},
                 ranges=[{"start": "2026-12-10", "end": "2026-12-20"}])
    await _apply(client, "Maintenance", {"availability": {"closed": True}},
                 dates=["2026-12-15"])
    await _apply(client, "Social Event",
                 {"pricing": {"mode": "discount_percent", "value": 15}},
                 dates=["2026-12-18"])

    response = await client.get("/api/v1/admin/bhavan/calendar?year=2026&month=12")
    assert response.status_code == 200, response.text
    by_date = {row["date"]: row for row in response.json()}

    assert by_date["2026-12-14"]["effective_rule"] == "Wedding"
    assert by_date["2026-12-14"]["status"] == "restricted"

    assert by_date["2026-12-15"]["effective_rule"] == "Maintenance"
    assert by_date["2026-12-15"]["status"] == "closed"

    assert by_date["2026-12-16"]["effective_rule"] == "Wedding"
    assert by_date["2026-12-18"]["effective_rule"] == "Social Event"

    assert by_date["2026-12-25"]["effective_rule"] is None
    assert by_date["2026-12-25"]["status"] == "open"


async def test_day_detail_lists_every_layer_oldest_first(
    client: AsyncClient, admin_user: User
):
    await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00",
    })
    await _apply(client, "Wedding", {"conditions": {"min_nights": 2}},
                 dates=["2026-12-15"])
    await _apply(client, "Maintenance", {"availability": {"closed": True}},
                 dates=["2026-12-15"])

    response = await client.get("/api/v1/admin/bhavan/calendar/2026-12-15")
    assert response.status_code == 200, response.text
    body = response.json()

    assert [layer["label"] for layer in body["layers"]] == ["Wedding", "Maintenance"]
    assert body["layers"][-1]["wins"] is True
    assert body["closed"] is True
    assert body["conditions"]["min_nights"] == 2


async def test_calendar_rejects_a_nonsense_month(client: AsyncClient, admin_user: User):
    response = await client.get("/api/v1/admin/bhavan/calendar?year=2026&month=13")
    assert response.status_code == 422
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_calendar.py -v`
Expected: FAIL — 404 on `/calendar`

- [ ] **Step 3: Append the calendar schemas**

Add to `backend/app/schemas/bhavan_admin.py`:

```python
class CalendarDayOut(BaseModel):
    date: date
    status: str                       # "open" | "restricted" | "closed"
    effective_rule: Optional[str]     # label of the winning assignment
    rule_count: int
    min_nights: Optional[int]
    available_units: Dict[uuid.UUID, int] = Field(default_factory=dict)
    enquiry_count: int = 0


class CalendarLayerOut(BaseModel):
    assignment_id: uuid.UUID
    label: str
    profile_name: Optional[str]
    applied_at: datetime
    applied_by_name: Optional[str]
    config_snapshot: dict
    wins: bool


class CalendarDayDetailOut(BaseModel):
    date: date
    closed: bool
    status: str
    layers: List[CalendarLayerOut]
    accommodation: List[dict]
    conditions: dict
    allowed_purpose_ids: List[uuid.UUID]
    public_message: Optional[str]
```

- [ ] **Step 4: Append the calendar endpoints**

Add to `backend/app/routers/bhavan_admin.py`:

```python
# ─── Calendar ─────────────────────────────────────────────────────────────────

import calendar as calendar_module

from fastapi import Query

from app.models.bhavan import BhavanEnquiry, EnquiryStatus
from app.models.user import User
from app.schemas.bhavan_admin import (
    CalendarDayDetailOut, CalendarDayOut, CalendarLayerOut,
)
from app.services.bhavan_availability import available_units
from app.services.bhavan_rules import load_baseline, load_rules_for_dates, resolve_day


def _day_status(state) -> str:
    if state.closed:
        return "closed"
    if state.source_assignment_ids:
        return "restricted"
    return "open"


@router.get("/calendar", response_model=List[CalendarDayOut])
async def read_calendar(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    """Effective state for every date in a month (PRD section 38).

    Shows what a date currently does, not a list of every historical rule.
    """
    days_in_month = calendar_module.monthrange(year, month)[1]
    days = [date_type(year, month, day) for day in range(1, days_in_month + 1)]

    baseline = await load_baseline(db)
    rules_by_date = await load_rules_for_dates(db, days)

    labels = {}
    for day_rules in rules_by_date.values():
        for applied in day_rules:
            labels[applied.assignment_id] = (applied.label, applied.applied_at)

    enquiry_rows = (await db.execute(
        select(BhavanEnquiry.check_in, BhavanEnquiry.check_out)
        .where(
            BhavanEnquiry.status.in_(
                (EnquiryStatus.PENDING, EnquiryStatus.UNDER_REVIEW,
                 EnquiryStatus.APPROVED)
            ),
            BhavanEnquiry.check_in <= days[-1],
            BhavanEnquiry.check_out > days[0],
        )
    )).all()

    out: List[CalendarDayOut] = []
    for day in days:
        day_rules = rules_by_date.get(day, [])
        state = resolve_day(day, day_rules, baseline)

        winner = None
        if state.source_assignment_ids:
            newest = max(day_rules, key=lambda r: (r.applied_at, str(r.assignment_id)))
            winner = newest.label

        occupancy = sum(
            1 for check_in, check_out in enquiry_rows if check_in <= day < check_out
        )

        out.append(CalendarDayOut(
            date=day,
            status=_day_status(state),
            effective_rule=winner,
            rule_count=len(day_rules),
            min_nights=state.conditions.min_nights,
            available_units={},
            enquiry_count=occupancy,
        ))
    return out


@router.get("/calendar/{day}", response_model=CalendarDayDetailOut)
async def read_calendar_day(day: date_type, db: AsyncSession = Depends(get_db)):
    """Why does this date behave this way? (PRD section 20)

    Returns every applicable assignment in applied_at order, oldest first, with
    the last one flagged as the winner.
    """
    baseline = await load_baseline(db)
    rules_by_date = await load_rules_for_dates(db, [day])
    day_rules = sorted(
        rules_by_date.get(day, []),
        key=lambda r: (r.applied_at, str(r.assignment_id)),
    )
    state = resolve_day(day, day_rules, baseline)

    assignments = {}
    if day_rules:
        rows = (await db.execute(
            select(BhavanRuleAssignment, BhavanRuleProfile, User)
            .join(BhavanRuleProfile, BhavanRuleProfile.id == BhavanRuleAssignment.profile_id)
            .outerjoin(User, User.user_id == BhavanRuleAssignment.applied_by)
            .where(BhavanRuleAssignment.id.in_([r.assignment_id for r in day_rules]))
        )).all()
        assignments = {
            assignment.id: (profile, user) for assignment, profile, user in rows
        }

    layers = []
    for index, applied in enumerate(day_rules):
        profile, user = assignments.get(applied.assignment_id, (None, None))
        layers.append(CalendarLayerOut(
            assignment_id=applied.assignment_id,
            label=applied.label,
            profile_name=profile.name if profile else None,
            applied_at=applied.applied_at,
            applied_by_name=(f"{user.first_name} {user.surname}".strip() if user else None),
            config_snapshot=applied.config.model_dump(mode="json"),
            wins=(index == len(day_rules) - 1),
        ))

    types = {
        t.id: t for t in (await db.execute(select(BhavanAccommodationType))).scalars().all()
    }
    free = await available_units(db, day, day + timedelta(days=1))

    accommodation = [
        {
            "id": str(type_id),
            "name": types[type_id].name if type_id in types else "",
            "allowed": type_state.allowed,
            "price": str(type_state.price),
            "available": free.get(type_id, 0),
        }
        for type_id, type_state in state.accommodation.items()
    ]

    return CalendarDayDetailOut(
        date=day,
        closed=state.closed,
        status=_day_status(state),
        layers=layers,
        accommodation=accommodation,
        conditions=state.conditions.__dict__,
        allowed_purpose_ids=sorted(state.allowed_purpose_ids, key=str),
        public_message=state.public_message,
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_calendar.py -v`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/bhavan_admin.py backend/app/schemas/bhavan_admin.py backend/tests/test_bhavan_calendar.py
git commit -m "feat(bhavan): add admin availability calendar with layer stack"
```

---

### Task 10: Terms & Conditions versioning

**Files:**
- Modify: `backend/app/routers/bhavan_admin.py` (append), `backend/app/schemas/bhavan_admin.py` (append)
- Test: `backend/tests/test_bhavan_terms.py`

**Interfaces:**
- Consumes: `BhavanTermsVersion`, `record_audit`
- Produces: `GET/POST /terms`, `PUT /terms/{id}`, `POST /terms/{id}/publish`; helper `get_published_terms(db) -> BhavanTermsVersion | None` in `app/services/bhavan_terms.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_terms.py`:

```python
"""Exactly one Terms version may be published at a time, and publishing a new
one must not disturb enquiries that accepted an older one."""

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.bhavan import BhavanTermsVersion
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(first_name="Admin", surname="User", mobile="9000000004",
                role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def test_publishing_a_new_version_unpublishes_the_previous_one(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    first = (await client.post("/api/v1/admin/bhavan/terms", json={
        "version_label": "v1.0", "content": "# Terms\nOriginal.",
    })).json()
    await client.post(f"/api/v1/admin/bhavan/terms/{first['id']}/publish")

    second = (await client.post("/api/v1/admin/bhavan/terms", json={
        "version_label": "v2.1", "content": "# Terms\nRevised.",
    })).json()
    await client.post(f"/api/v1/admin/bhavan/terms/{second['id']}/publish")

    rows = (await db_session.execute(select(BhavanTermsVersion))).scalars().all()
    published = [r for r in rows if r.is_published]
    assert len(published) == 1
    assert published[0].version_label == "v2.1"


async def test_the_public_terms_endpoint_returns_the_published_version(
    client: AsyncClient, admin_user: User
):
    draft = (await client.post("/api/v1/admin/bhavan/terms", json={
        "version_label": "v1.0", "content": "# Terms\nHello.",
    })).json()

    before = await client.get("/api/v1/bhavan/terms")
    assert before.status_code == 404, "nothing published yet"

    await client.post(f"/api/v1/admin/bhavan/terms/{draft['id']}/publish")

    after = await client.get("/api/v1/bhavan/terms")
    assert after.status_code == 200
    assert after.json()["version_label"] == "v1.0"
    assert "Hello" in after.json()["content"]


async def test_version_history_is_listed_newest_first(
    client: AsyncClient, admin_user: User
):
    await client.post("/api/v1/admin/bhavan/terms",
                      json={"version_label": "v1.0", "content": "One"})
    await client.post("/api/v1/admin/bhavan/terms",
                      json={"version_label": "v2.0", "content": "Two"})

    listed = (await client.get("/api/v1/admin/bhavan/terms")).json()
    assert [row["version_label"] for row in listed] == ["v2.0", "v1.0"]


async def test_a_published_version_cannot_be_edited(client: AsyncClient, admin_user: User):
    """Editing published Terms in place would silently change what past
    customers agreed to."""
    version = (await client.post("/api/v1/admin/bhavan/terms", json={
        "version_label": "v1.0", "content": "Original",
    })).json()
    await client.post(f"/api/v1/admin/bhavan/terms/{version['id']}/publish")

    response = await client.put(f"/api/v1/admin/bhavan/terms/{version['id']}", json={
        "version_label": "v1.0", "content": "Sneaky edit",
    })
    assert response.status_code == 409
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_terms.py -v`
Expected: FAIL — 404 on `/terms`

- [ ] **Step 3: Write the terms service**

Create `backend/app/services/bhavan_terms.py`:

```python
"""Terms & Conditions versioning (PRD sections 33 and 34)."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import BhavanTermsVersion


async def get_published_terms(db: AsyncSession) -> Optional[BhavanTermsVersion]:
    return (await db.execute(
        select(BhavanTermsVersion).where(BhavanTermsVersion.is_published.is_(True))
    )).scalars().first()
```

- [ ] **Step 4: Append the terms schemas and endpoints**

Add to `backend/app/schemas/bhavan_admin.py`:

```python
class TermsIn(BaseModel):
    version_label: str = Field(min_length=1, max_length=30)
    content: str = Field(min_length=1)


class TermsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    version_label: str
    content: str
    is_published: bool
    published_at: Optional[datetime]
    created_at: datetime
```

Add to `backend/app/routers/bhavan_admin.py`:

```python
# ─── Terms & Conditions ───────────────────────────────────────────────────────

from app.models.bhavan import BhavanTermsVersion
from app.schemas.bhavan_admin import TermsIn, TermsOut


@router.get("/terms", response_model=List[TermsOut])
async def list_terms_versions(db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(BhavanTermsVersion).order_by(BhavanTermsVersion.created_at.desc())
    )).scalars().all()


@router.post("/terms", response_model=TermsOut, status_code=status.HTTP_201_CREATED)
async def create_terms_version(
    payload: TermsIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    version = BhavanTermsVersion(**payload.model_dump())
    db.add(version)
    await db.flush()
    await record_audit(db, admin, "create", "bhavan_terms_versions", version.id, None,
                       {"version_label": payload.version_label})
    await db.commit()
    return version


@router.put("/terms/{version_id}", response_model=TermsOut)
async def update_terms_version(
    version_id: uuid.UUID,
    payload: TermsIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    version = await db.get(BhavanTermsVersion, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Terms version not found")
    if version.is_published:
        raise HTTPException(
            status_code=409,
            detail="A published version cannot be edited. Create a new version instead.",
        )
    old = {"content": version.content}
    version.version_label = payload.version_label
    version.content = payload.content
    await record_audit(db, admin, "update", "bhavan_terms_versions", version.id,
                       old, {"version_label": payload.version_label})
    await db.commit()
    return version


@router.post("/terms/{version_id}/publish", response_model=TermsOut)
async def publish_terms_version(
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Publishing unpublishes the previous version in the same transaction, so
    there is never a moment with two live sets of Terms."""
    version = await db.get(BhavanTermsVersion, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Terms version not found")

    current = (await db.execute(
        select(BhavanTermsVersion).where(BhavanTermsVersion.is_published.is_(True))
    )).scalars().all()
    for row in current:
        row.is_published = False

    version.is_published = True
    version.published_at = datetime.now(timezone.utc)
    version.published_by = admin.user_id

    await record_audit(db, admin, "publish", "bhavan_terms_versions", version.id,
                       {"previous": [r.version_label for r in current]},
                       {"version_label": version.version_label})
    await db.commit()
    return version
```

- [ ] **Step 5: Run tests to verify they pass**

Note: two of these tests hit `/api/v1/bhavan/terms`, which Task 11 creates. Run the admin-only subset now:

Run: `cd backend && python -m pytest tests/test_bhavan_terms.py -v -k "not public_terms_endpoint"`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/bhavan_terms.py backend/app/routers/bhavan_admin.py backend/app/schemas/bhavan_admin.py backend/tests/test_bhavan_terms.py
git commit -m "feat(bhavan): add versioned terms and conditions"
```

---

# Phase 4 — Public API

### Task 11: Public config, availability and quote

**Files:**
- Create: `backend/app/schemas/bhavan_public.py`, `backend/app/routers/bhavan.py`
- Modify: `backend/app/main.py` (import + `include_router`)
- Test: `backend/tests/test_bhavan_public.py`, `backend/tests/test_bhavan_public_leakage.py`

**Interfaces:**
- Consumes: `build_quote`, `QuoteRequest`, `get_published_terms`, `get_settings_row`
- Produces: public router at `/api/v1/bhavan`; schemas `PublicConfigOut`, `PublicAvailabilityIn/Out`, `PublicQuoteIn/Out`, `PublicTermsOut`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_bhavan_public_leakage.py`:

```python
"""Nothing internal may reach a customer.

This test is the enforcement mechanism for PRD sections 23, 28 and 48. It
walks every public response body looking for internal vocabulary.
"""

import json
from datetime import date

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind, BhavanAccommodationType, BhavanRuleAssignment,
    BhavanRuleAssignmentDate, BhavanRuleProfile, BhavanUnit, RuleCategory,
    RuleStatus, UnitStatus,
)
from datetime import datetime, timezone
from decimal import Decimal

FORBIDDEN_KEYS = {
    "rule", "rules", "assignment", "assignment_id", "assignments", "applied_at",
    "applied_by", "priority", "profile", "profile_id", "profile_name",
    "config", "config_snapshot", "rules_snapshot", "source_assignment_ids",
    "is_template", "internal_notes", "note",
}
FORBIDDEN_VALUES = {"Wedding Surcharge Rule", "Maintenance", "replace_base"}


def walk(payload, path="root"):
    """Yield (path, key, value) for every key in a nested JSON structure."""
    if isinstance(payload, dict):
        for key, value in payload.items():
            yield path, key, value
            yield from walk(value, f"{path}.{key}")
    elif isinstance(payload, list):
        for index, item in enumerate(payload):
            yield from walk(item, f"{path}[{index}]")


async def _seed(db: AsyncSession):
    acc = BhavanAccommodationType(
        name="AC Room", kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
    )
    db.add(acc)
    await db.flush()
    db.add(BhavanUnit(accommodation_type_id=acc.id, label="101",
                      status=UnitStatus.AVAILABLE))

    config = {
        "pricing": {"mode": "increase_percent", "value": 50,
                    "conflict_behaviour": "replace_base"},
        "conditions": {"min_nights": 2},
    }
    profile = BhavanRuleProfile(name="Maintenance", category=RuleCategory.EVENT,
                                status=RuleStatus.ACTIVE, config=config)
    db.add(profile)
    await db.flush()
    assignment = BhavanRuleAssignment(
        profile_id=profile.id, label="Wedding Surcharge Rule",
        config_snapshot=config, applied_at=datetime.now(timezone.utc),
    )
    db.add(assignment)
    await db.flush()
    db.add(BhavanRuleAssignmentDate(assignment_id=assignment.id,
                                    date=date(2026, 12, 20)))
    await db.commit()
    return acc


async def test_public_config_leaks_nothing(client: AsyncClient, db_session: AsyncSession):
    await _seed(db_session)
    body = (await client.get("/api/v1/bhavan/config")).json()
    _assert_clean(body, "config")


async def test_public_availability_leaks_nothing(
    client: AsyncClient, db_session: AsyncSession
):
    acc = await _seed(db_session)
    body = (await client.post("/api/v1/bhavan/availability", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
    })).json()
    _assert_clean(body, "availability")


async def test_public_quote_leaks_nothing(client: AsyncClient, db_session: AsyncSession):
    acc = await _seed(db_session)
    body = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
        "accommodation": {str(acc.id): 1}, "amenities": {}, "guests_total": 2,
    })).json()
    _assert_clean(body, "quote")


def _assert_clean(body, label):
    serialised = json.dumps(body)
    for path, key, _ in walk(body):
        assert key.lower() not in FORBIDDEN_KEYS, (
            f"{label}: internal key '{key}' exposed at {path}"
        )
    for forbidden in FORBIDDEN_VALUES:
        assert forbidden not in serialised, (
            f"{label}: internal value '{forbidden}' leaked into the response"
        )
```

Create `backend/tests/test_bhavan_public.py`:

```python
"""The public endpoints a customer actually uses."""

from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, BhavanAccommodationType, BhavanAmenity,
    BhavanPurpose, BhavanUnit, UnitStatus,
)


async def _seed(db: AsyncSession):
    acc = BhavanAccommodationType(
        name="AC Room", kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"), description="Air-conditioned",
    )
    db.add(acc)
    await db.flush()
    for i in range(4):
        db.add(BhavanUnit(accommodation_type_id=acc.id, label=f"10{i}",
                          status=UnitStatus.AVAILABLE))
    chairs = BhavanAmenity(name="Plastic Chair", price=Decimal("10.00"),
                           pricing_type=AmenityPricingType.PER_UNIT,
                           available_quantity=500)
    db.add(chairs)
    db.add(BhavanPurpose(name="Wedding"))
    await db.commit()
    return acc, chairs


async def test_config_lists_active_inventory(client: AsyncClient, db_session: AsyncSession):
    await _seed(db_session)
    body = (await client.get("/api/v1/bhavan/config")).json()

    assert body["accommodation_types"][0]["name"] == "AC Room"
    assert body["accommodation_types"][0]["from_price_per_night"] == "1500.00"
    assert body["amenities"][0]["pricing_type"] == "per_unit"
    assert body["purposes"][0]["name"] == "Wedding"


async def test_availability_reports_per_type_counts_and_prices(
    client: AsyncClient, db_session: AsyncSession
):
    acc, _ = await _seed(db_session)
    body = (await client.post("/api/v1/bhavan/availability", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
    })).json()

    entry = next(e for e in body["accommodation"] if e["id"] == str(acc.id))
    assert entry["available"] == 4
    assert entry["price_per_night"] == "1500.00"
    assert entry["total_price"] == "3000.00"
    assert body["nights"] == 2


async def test_quote_returns_an_estimated_total_and_the_enquiry_disclaimer(
    client: AsyncClient, db_session: AsyncSession
):
    acc, chairs = await _seed(db_session)
    body = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
        "accommodation": {str(acc.id): 2}, "amenities": {str(chairs.id): 50},
        "guests_total": 8,
    })).json()

    assert body["estimated_total"] == "6500.00", "6,000 rooms + 500 chairs"
    assert body["is_bookable"] is True
    assert body["blockers"] == []


async def test_quote_rejects_a_backwards_date_range(
    client: AsyncClient, db_session: AsyncSession
):
    acc, _ = await _seed(db_session)
    body = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-22", "check_out": "2026-12-20",
        "accommodation": {str(acc.id): 1}, "amenities": {}, "guests_total": 2,
    })).json()

    assert body["is_bookable"] is False
    assert any("check-out" in b for b in body["blockers"])
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_bhavan_public.py tests/test_bhavan_public_leakage.py -v`
Expected: FAIL — 404 on every public route

- [ ] **Step 3: Write the public schemas**

Create `backend/app/schemas/bhavan_public.py`:

```python
"""Public-facing response models.

These deliberately have NO field for rule names, ids, priorities, timestamps,
admin notes or pricing formulas. Leakage is prevented by the type rather than
by remembering to filter, which is what test_bhavan_public_leakage.py checks.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class PublicImageOut(BaseModel):
    path: str


class PublicAccommodationOut(BaseModel):
    id: uuid.UUID
    name: str
    kind: str
    description: Optional[str]
    capacity_per_unit: int
    from_price_per_night: Decimal
    images: List[PublicImageOut] = []


class PublicAmenityOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    image_path: Optional[str]
    price: Decimal
    pricing_type: str
    available_quantity: Optional[int]


class PublicPurposeOut(BaseModel):
    id: uuid.UUID
    name: str


class PublicConfigOut(BaseModel):
    accommodation_types: List[PublicAccommodationOut]
    amenities: List[PublicAmenityOut]
    purposes: List[PublicPurposeOut]
    required_fields: Dict[str, bool]
    advance_booking_days: int
    contact_phone: Optional[str]
    intro_text: Optional[str]
    has_published_terms: bool


class AvailabilityIn(BaseModel):
    check_in: date
    check_out: date
    purpose_id: Optional[uuid.UUID] = None


class AvailabilityEntryOut(BaseModel):
    id: uuid.UUID
    name: str
    available: int
    capacity_per_unit: int
    price_per_night: Decimal
    total_price: Decimal


class AvailabilityOut(BaseModel):
    check_in: date
    check_out: date
    nights: int
    days: int
    accommodation: List[AvailabilityEntryOut]
    available_amenity_ids: List[uuid.UUID]
    allowed_purpose_ids: List[uuid.UUID]
    blockers: List[str]
    notices: List[str]
    is_bookable: bool


class QuoteIn(BaseModel):
    check_in: date
    check_out: date
    accommodation: Dict[uuid.UUID, int] = Field(default_factory=dict)
    amenities: Dict[uuid.UUID, int] = Field(default_factory=dict)
    guests_total: int = 0
    purpose_id: Optional[uuid.UUID] = None


class QuoteLineOut(BaseModel):
    kind: str
    label: str
    detail: str
    quantity: int
    unit_price: Decimal
    total: Decimal


class QuoteOut(BaseModel):
    check_in: date
    check_out: date
    nights: int
    days: int
    lines: List[QuoteLineOut]
    accommodation_total: Decimal
    amenity_total: Decimal
    #: Wording is fixed by PRD section 23 — an enquiry is not a confirmed price.
    estimated_total: Decimal
    blockers: List[str]
    notices: List[str]
    is_bookable: bool


class PublicTermsOut(BaseModel):
    id: uuid.UUID
    version_label: str
    content: str
    published_at: Optional[datetime]
```

- [ ] **Step 4: Write the public router**

Create `backend/app/routers/bhavan.py`:

```python
"""Bhavan public API. No authentication.

Every response model comes from app/schemas/bhavan_public.py, which has no
field capable of carrying internal rule data.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.bhavan import (
    BhavanAccommodationType, BhavanAmenity, BhavanPurpose,
)
from app.schemas.bhavan_public import (
    AvailabilityEntryOut, AvailabilityIn, AvailabilityOut, PublicAccommodationOut,
    PublicAmenityOut, PublicConfigOut, PublicImageOut, PublicPurposeOut,
    PublicTermsOut, QuoteIn, QuoteLineOut, QuoteOut,
)
from app.services.bhavan_quote import QuoteRequest, build_quote
from app.services.bhavan_rules import money
from app.services.bhavan_settings import get_settings_row
from app.services.bhavan_terms import get_published_terms

router = APIRouter(prefix="/api/v1/bhavan", tags=["Bhavan"])


@router.get("/config", response_model=PublicConfigOut)
async def read_config(db: AsyncSession = Depends(get_db)):
    """Everything the booking form needs to render, and nothing more."""
    types = (await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.images))
        .where(BhavanAccommodationType.is_active.is_(True))
        .order_by(BhavanAccommodationType.sort_order, BhavanAccommodationType.name)
    )).scalars().all()
    amenities = (await db.execute(
        select(BhavanAmenity)
        .where(BhavanAmenity.is_active.is_(True))
        .order_by(BhavanAmenity.sort_order, BhavanAmenity.name)
    )).scalars().all()
    purposes = (await db.execute(
        select(BhavanPurpose)
        .where(BhavanPurpose.is_active.is_(True))
        .order_by(BhavanPurpose.sort_order, BhavanPurpose.name)
    )).scalars().all()

    settings_row = await get_settings_row(db)
    terms = await get_published_terms(db)
    await db.commit()

    return PublicConfigOut(
        accommodation_types=[
            PublicAccommodationOut(
                id=t.id, name=t.name, kind=t.kind.value, description=t.description,
                capacity_per_unit=t.capacity_per_unit,
                from_price_per_night=t.base_price_per_night,
                images=[PublicImageOut(path=i.path) for i in t.images],
            )
            for t in types
        ],
        amenities=[
            PublicAmenityOut(
                id=a.id, name=a.name, description=a.description,
                image_path=a.image_path, price=a.price,
                pricing_type=a.pricing_type.value,
                available_quantity=a.available_quantity,
            )
            for a in amenities
        ],
        purposes=[PublicPurposeOut(id=p.id, name=p.name) for p in purposes],
        required_fields=settings_row.required_fields or {},
        advance_booking_days=settings_row.advance_booking_days,
        contact_phone=settings_row.contact_phone,
        intro_text=settings_row.intro_text,
        has_published_terms=terms is not None,
    )


@router.post("/availability", response_model=AvailabilityOut)
async def check_availability(payload: AvailabilityIn, db: AsyncSession = Depends(get_db)):
    """What can be booked on these dates, and at what price."""
    quote = await build_quote(db, QuoteRequest(
        check_in=payload.check_in,
        check_out=payload.check_out,
        accommodation={},
        amenities={},
        purpose_id=payload.purpose_id,
    ))

    types = {
        t.id: t
        for t in (await db.execute(
            select(BhavanAccommodationType)
            .where(BhavanAccommodationType.is_active.is_(True))
        )).scalars().all()
    }

    entries: List[AvailabilityEntryOut] = []
    for type_id, acc in types.items():
        if type_id not in quote.allowed_type_ids:
            continue
        total = quote.price_by_type.get(type_id)
        if total is None:
            continue
        # `total` is the whole-stay price; divide back out for display.
        per_night = money(total / quote.nights) if quote.nights else total
        entries.append(AvailabilityEntryOut(
            id=type_id,
            name=acc.name,
            available=quote.available_by_type.get(type_id, 0),
            capacity_per_unit=acc.capacity_per_unit,
            price_per_night=per_night,
            total_price=total,
        ))

    return AvailabilityOut(
        check_in=payload.check_in,
        check_out=payload.check_out,
        nights=quote.nights,
        days=quote.days,
        accommodation=sorted(entries, key=lambda e: e.name),
        available_amenity_ids=quote.allowed_amenity_ids,
        allowed_purpose_ids=quote.allowed_purpose_ids,
        blockers=quote.blockers,
        notices=quote.notices,
        is_bookable=quote.is_bookable,
    )


@router.post("/quote", response_model=QuoteOut)
async def create_quote(payload: QuoteIn, db: AsyncSession = Depends(get_db)):
    """The running estimate. Called on every step of the booking form."""
    quote = await build_quote(db, QuoteRequest(
        check_in=payload.check_in,
        check_out=payload.check_out,
        accommodation=payload.accommodation,
        amenities=payload.amenities,
        guests_total=payload.guests_total,
        purpose_id=payload.purpose_id,
    ))

    return QuoteOut(
        check_in=quote.check_in,
        check_out=quote.check_out,
        nights=quote.nights,
        days=quote.days,
        lines=[
            QuoteLineOut(
                kind=line.kind, label=line.label, detail=line.detail,
                quantity=line.quantity, unit_price=line.unit_price, total=line.total,
            )
            for line in quote.lines
        ],
        accommodation_total=quote.accommodation_total,
        amenity_total=quote.amenity_total,
        estimated_total=quote.estimated_total,
        blockers=quote.blockers,
        notices=quote.notices,
        is_bookable=quote.is_bookable,
    )


@router.get("/terms", response_model=PublicTermsOut)
async def read_terms(db: AsyncSession = Depends(get_db)):
    terms = await get_published_terms(db)
    if terms is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Terms & Conditions have not been published yet.",
        )
    return PublicTermsOut(
        id=terms.id, version_label=terms.version_label,
        content=terms.content, published_at=terms.published_at,
    )
```

- [ ] **Step 5: Mount the public router**

In `backend/app/main.py`:

```python
from app.routers.bhavan import router as bhavan_router
```

and after `app.include_router(bhavan_admin_router)`:

```python
app.include_router(bhavan_router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_public.py tests/test_bhavan_public_leakage.py tests/test_bhavan_terms.py -v`
Expected: 11 passed (the previously skipped public-terms test now runs)

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/bhavan_public.py backend/app/routers/bhavan.py backend/app/main.py backend/tests/test_bhavan_public.py backend/tests/test_bhavan_public_leakage.py
git commit -m "feat(bhavan): add public config, availability and quote endpoints"
```

---

### Task 12: WhatsApp OTP and the verification token

**Files:**
- Create: `backend/app/services/bhavan_otp.py`
- Modify: `backend/app/routers/bhavan.py` (append), `backend/app/schemas/bhavan_public.py` (append)
- Test: `backend/tests/test_bhavan_otp.py`

**Interfaces:**
- Consumes: `PhoneOTPRequest`, `otp_delivery.send_otp_message`, `get_settings_row`, `settings.SECRET_KEY`
- Produces: `request_enquiry_otp(db, phone) -> tuple[str, str]`; `verify_enquiry_otp(db, phone, code) -> str` (returns token); `decode_verification_token(token) -> str` (returns phone); endpoints `POST /otp/request`, `POST /otp/verify`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_otp.py`:

```python
"""OTP verification, and the token that binds it to a submission.

Without the binding, a caller verifies their own number and then submits an
enquiry carrying someone else's details — the verification would prove nothing
about the enquiry it is attached to.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import PhoneOTPRequest
from app.services.bhavan_otp import (
    BHAVAN_OTP_PURPOSE, decode_verification_token, verify_enquiry_otp,
)


async def _latest_otp(db: AsyncSession) -> PhoneOTPRequest:
    return (await db.execute(
        select(PhoneOTPRequest).order_by(PhoneOTPRequest.created_at.desc())
    )).scalars().first()


async def test_requesting_an_otp_creates_a_scoped_record(
    client: AsyncClient, db_session: AsyncSession
):
    response = await client.post("/api/v1/bhavan/otp/request",
                                 json={"mobile": "9876543210"})
    assert response.status_code == 200, response.text
    assert response.json()["sent"] is True

    record = await _latest_otp(db_session)
    assert record.phone == "9876543210"
    assert record.purpose == BHAVAN_OTP_PURPOSE
    assert record.otp_hash != "", "the code must never be stored in clear text"


async def test_a_login_otp_cannot_satisfy_a_bhavan_enquiry(
    client: AsyncClient, db_session: AsyncSession
):
    """Scope separation is the whole point of the purpose column."""
    from app.utils.security import hash_password

    db_session.add(PhoneOTPRequest(
        phone="9876543210",
        otp_hash=hash_password("123456"),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        purpose="login",
    ))
    await db_session.commit()

    response = await client.post("/api/v1/bhavan/otp/verify", json={
        "mobile": "9876543210", "code": "123456",
    })
    assert response.status_code == 400


async def test_verifying_returns_a_token_bound_to_that_phone(
    client: AsyncClient, db_session: AsyncSession
):
    from app.utils.security import hash_password

    db_session.add(PhoneOTPRequest(
        phone="9876543210",
        otp_hash=hash_password("123456"),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        purpose=BHAVAN_OTP_PURPOSE,
    ))
    await db_session.commit()

    response = await client.post("/api/v1/bhavan/otp/verify", json={
        "mobile": "9876543210", "code": "123456",
    })
    assert response.status_code == 200, response.text
    token = response.json()["verification_token"]
    assert decode_verification_token(token) == "9876543210"


async def test_an_expired_otp_is_refused(client: AsyncClient, db_session: AsyncSession):
    from app.utils.security import hash_password

    db_session.add(PhoneOTPRequest(
        phone="9876543210",
        otp_hash=hash_password("123456"),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        purpose=BHAVAN_OTP_PURPOSE,
    ))
    await db_session.commit()

    response = await client.post("/api/v1/bhavan/otp/verify", json={
        "mobile": "9876543210", "code": "123456",
    })
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


async def test_attempts_are_capped(client: AsyncClient, db_session: AsyncSession):
    from app.utils.security import hash_password

    db_session.add(PhoneOTPRequest(
        phone="9876543210",
        otp_hash=hash_password("123456"),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        purpose=BHAVAN_OTP_PURPOSE,
        attempts=5,
    ))
    await db_session.commit()

    response = await client.post("/api/v1/bhavan/otp/verify", json={
        "mobile": "9876543210", "code": "123456",
    })
    assert response.status_code == 429


async def test_resend_is_rate_limited(client: AsyncClient, db_session: AsyncSession):
    first = await client.post("/api/v1/bhavan/otp/request", json={"mobile": "9876543210"})
    assert first.status_code == 200

    second = await client.post("/api/v1/bhavan/otp/request", json={"mobile": "9876543210"})
    assert second.status_code == 429
    assert "wait" in second.json()["detail"].lower()


def test_a_tampered_token_is_rejected():
    with pytest.raises(ValueError):
        decode_verification_token("not.a.jwt")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_otp.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.bhavan_otp'`

- [ ] **Step 3: Write the OTP service**

Create `backend/app/services/bhavan_otp.py`:

```python
"""Enquiry mobile verification.

Verification produces a short-lived signed token bound to the phone number.
The submit endpoint requires it and rejects a mismatch, so verifying one
number and submitting with another is impossible.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import PhoneOTPRequest
from app.services.bhavan_settings import get_settings_row
from app.services.otp_delivery import DELIVERED_CHANNELS, send_otp_message
from app.utils.security import hash_password, verify_password

logger = logging.getLogger(__name__)

#: Scopes these OTPs. A login OTP must never satisfy an enquiry.
BHAVAN_OTP_PURPOSE = "bhavan_enquiry"
TOKEN_TTL_MINUTES = 15
TOKEN_AUDIENCE = "bhavan-enquiry"


class OtpError(Exception):
    """Carries the HTTP status the endpoint should return."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def _latest_request(db: AsyncSession, phone: str) -> PhoneOTPRequest | None:
    return (await db.execute(
        select(PhoneOTPRequest)
        .where(
            PhoneOTPRequest.phone == phone,
            PhoneOTPRequest.purpose == BHAVAN_OTP_PURPOSE,
        )
        .order_by(PhoneOTPRequest.created_at.desc())
    )).scalars().first()


async def request_enquiry_otp(db: AsyncSession, phone: str) -> Tuple[bool, str]:
    """Send a code. Returns (delivered, channel).

    Raises OtpError(429) when the caller is inside the resend cooldown.
    """
    config = await get_settings_row(db)

    previous = await _latest_request(db, phone)
    if previous is not None:
        created = previous.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - created).total_seconds()
        if elapsed < config.otp_resend_cooldown_seconds:
            wait = int(config.otp_resend_cooldown_seconds - elapsed)
            raise OtpError(
                f"Please wait {wait} seconds before requesting another code.",
                status_code=429,
            )

    code = f"{secrets.randbelow(1000000):06d}"
    db.add(PhoneOTPRequest(
        phone=phone,
        otp_hash=hash_password(code),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=config.otp_ttl_seconds),
        purpose=BHAVAN_OTP_PURPOSE,
    ))
    await db.commit()

    message = (
        f"{code} is your verification code for your Bhavan booking enquiry. "
        f"It is valid for {config.otp_ttl_seconds // 60} minutes."
    )
    channel = await send_otp_message(phone, message)
    return channel in DELIVERED_CHANNELS, channel


async def verify_enquiry_otp(db: AsyncSession, phone: str, code: str) -> str:
    """Check a code and return a verification token. Raises OtpError."""
    config = await get_settings_row(db)
    record = await _latest_request(db, phone)

    if record is None:
        raise OtpError("No verification code was requested for this number.")

    if record.verified:
        return issue_verification_token(phone)

    if record.attempts >= config.otp_max_attempts:
        raise OtpError(
            "Too many incorrect attempts. Please request a new code.",
            status_code=429,
        )

    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise OtpError("This code has expired. Please request a new one.")

    if not verify_password(code, record.otp_hash):
        record.attempts += 1
        await db.commit()
        raise OtpError("The code you entered is incorrect.")

    record.verified = True
    await db.commit()
    return issue_verification_token(phone)


def issue_verification_token(phone: str) -> str:
    payload = {
        "sub": phone,
        "aud": TOKEN_AUDIENCE,
        "purpose": BHAVAN_OTP_PURPOSE,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_verification_token(token: str) -> str:
    """Return the verified phone number. Raises ValueError if unusable."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM], audience=TOKEN_AUDIENCE,
        )
    except JWTError as exc:
        raise ValueError("Mobile verification has expired. Please verify again.") from exc

    if payload.get("purpose") != BHAVAN_OTP_PURPOSE:
        raise ValueError("This verification cannot be used for a booking enquiry.")

    phone = payload.get("sub")
    if not phone:
        raise ValueError("Mobile verification is invalid. Please verify again.")
    return phone
```

- [ ] **Step 4: Append the OTP endpoints**

Add to `backend/app/schemas/bhavan_public.py`:

```python
class OtpRequestIn(BaseModel):
    mobile: str = Field(min_length=10, max_length=15, pattern=r"^\+?\d{10,15}$")


class OtpRequestOut(BaseModel):
    sent: bool
    channel: str
    message: str


class OtpVerifyIn(BaseModel):
    mobile: str = Field(min_length=10, max_length=15, pattern=r"^\+?\d{10,15}$")
    code: str = Field(min_length=4, max_length=8)


class OtpVerifyOut(BaseModel):
    verified: bool
    verification_token: str
```

Add to `backend/app/routers/bhavan.py`:

```python
# ─── Mobile verification ──────────────────────────────────────────────────────

from app.schemas.bhavan_public import (
    OtpRequestIn, OtpRequestOut, OtpVerifyIn, OtpVerifyOut,
)
from app.services.bhavan_otp import OtpError, request_enquiry_otp, verify_enquiry_otp


@router.post("/otp/request", response_model=OtpRequestOut)
async def request_otp(payload: OtpRequestIn, db: AsyncSession = Depends(get_db)):
    try:
        delivered, channel = await request_enquiry_otp(db, payload.mobile)
    except OtpError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return OtpRequestOut(
        sent=delivered,
        channel=channel,
        message=(
            "We have sent a verification code to your WhatsApp."
            if channel == "whatsapp"
            else "We have sent a verification code to your mobile number."
            if delivered
            else "We could not deliver the code. Please check the number and try again."
        ),
    )


@router.post("/otp/verify", response_model=OtpVerifyOut)
async def verify_otp(payload: OtpVerifyIn, db: AsyncSession = Depends(get_db)):
    try:
        token = await verify_enquiry_otp(db, payload.mobile, payload.code)
    except OtpError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return OtpVerifyOut(verified=True, verification_token=token)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_otp.py -v`
Expected: 7 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/bhavan_otp.py backend/app/routers/bhavan.py backend/app/schemas/bhavan_public.py backend/tests/test_bhavan_otp.py
git commit -m "feat(bhavan): add WhatsApp OTP with phone-bound verification token"
```

---

### Task 13: Enquiry submission

**Files:**
- Create: `backend/app/services/bhavan_enquiry.py`
- Modify: `backend/app/routers/bhavan.py` (append), `backend/app/schemas/bhavan_public.py` (append)
- Test: `backend/tests/test_bhavan_enquiry.py`

**Interfaces:**
- Consumes: `build_quote`, `decode_verification_token`, `get_published_terms`, `resolve_stay`
- Produces: `next_reference(db) -> str`; `create_enquiry(db, payload, quote, terms, source, actor) -> BhavanEnquiry`; endpoint `POST /enquiries`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_enquiry.py`:

```python
"""Submission rules and snapshot immutability.

The snapshot test is the important one: PRD sections 41 and 55 require that
changing a rate never alters an enquiry that was already submitted.
"""

from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind, BhavanAccommodationType, BhavanEnquiry, BhavanPurpose,
    BhavanTermsVersion, BhavanUnit, EnquiryStatus, EnquirySource, UnitStatus,
)
from app.services.bhavan_otp import issue_verification_token


async def _seed(db: AsyncSession):
    acc = BhavanAccommodationType(
        name="AC Room", kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
    )
    db.add(acc)
    await db.flush()
    for i in range(4):
        db.add(BhavanUnit(accommodation_type_id=acc.id, label=f"10{i}",
                          status=UnitStatus.AVAILABLE))
    purpose = BhavanPurpose(name="Wedding")
    terms = BhavanTermsVersion(version_label="v1.0", content="Be nice.",
                               is_published=True)
    db.add_all([purpose, terms])
    await db.commit()
    return acc, purpose, terms


def _payload(acc, purpose, token, **overrides):
    body = {
        "check_in": "2026-12-20",
        "check_out": "2026-12-22",
        "accommodation": {str(acc.id): 2},
        "amenities": {},
        "purpose_id": str(purpose.id),
        "full_name": "Rajesh Goyal",
        "mobile": "9876543210",
        "whatsapp_number": "9876543210",
        "email": "rajesh@example.com",
        "city": "Jaipur",
        "state": "Rajasthan",
        "guests_total": 8,
        "adults": 6,
        "children": 2,
        "verification_token": token,
        "terms_accepted": True,
    }
    body.update(overrides)
    return body


async def test_a_valid_submission_returns_a_reference(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, _ = await _seed(db_session)
    token = issue_verification_token("9876543210")

    response = await client.post("/api/v1/bhavan/enquiries",
                                 json=_payload(acc, purpose, token))
    assert response.status_code == 201, response.text
    body = response.json()

    assert body["reference"].startswith("BV-")
    assert body["status"] == "pending"
    assert body["estimated_total"] == "6000.00"
    assert "not" in body["message"].lower(), "must say it is not a confirmed booking"


async def test_submission_without_a_verification_token_is_refused(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, _ = await _seed(db_session)
    response = await client.post("/api/v1/bhavan/enquiries", json=_payload(
        acc, purpose, token="", verification_token="",
    ))
    assert response.status_code in (401, 422)


async def test_a_token_for_a_different_number_is_refused(
    client: AsyncClient, db_session: AsyncSession
):
    """The binding that makes verification mean something."""
    acc, purpose, _ = await _seed(db_session)
    token = issue_verification_token("9000000000")

    response = await client.post("/api/v1/bhavan/enquiries",
                                 json=_payload(acc, purpose, token))
    assert response.status_code == 401
    assert "verify" in response.json()["detail"].lower()


async def test_submission_without_accepting_terms_is_refused(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, _ = await _seed(db_session)
    token = issue_verification_token("9876543210")

    response = await client.post("/api/v1/bhavan/enquiries", json=_payload(
        acc, purpose, token, terms_accepted=False,
    ))
    assert response.status_code == 422


async def test_a_blocked_selection_cannot_be_submitted(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, _ = await _seed(db_session)
    token = issue_verification_token("9876543210")

    response = await client.post("/api/v1/bhavan/enquiries", json=_payload(
        acc, purpose, token, accommodation={str(acc.id): 99},
    ))
    assert response.status_code == 409
    assert "available" in response.json()["detail"][0].lower()


async def test_the_price_snapshot_survives_a_later_rate_change(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, _ = await _seed(db_session)
    token = issue_verification_token("9876543210")

    created = (await client.post("/api/v1/bhavan/enquiries",
                                 json=_payload(acc, purpose, token))).json()

    acc.base_price_per_night = Decimal("9999.00")
    await db_session.commit()

    enquiry = (await db_session.execute(
        select(BhavanEnquiry).where(BhavanEnquiry.reference == created["reference"])
    )).scalar_one()

    assert enquiry.estimated_total == Decimal("6000.00")
    assert enquiry.quote_snapshot["estimated_total"] == "6000.00"
    assert enquiry.accommodations[0].unit_price_snapshot == Decimal("1500.00")
    assert enquiry.accommodations[0].type_name_snapshot == "AC Room"


async def test_the_accepted_terms_version_is_recorded(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, terms = await _seed(db_session)
    token = issue_verification_token("9876543210")

    created = (await client.post("/api/v1/bhavan/enquiries",
                                 json=_payload(acc, purpose, token))).json()

    enquiry = (await db_session.execute(
        select(BhavanEnquiry).where(BhavanEnquiry.reference == created["reference"])
    )).scalar_one()

    assert enquiry.terms_version_id == terms.id
    assert enquiry.terms_accepted is True
    assert enquiry.terms_accepted_at is not None
    assert enquiry.source is EnquirySource.ONLINE
    assert enquiry.mobile_verified is True


async def test_references_are_unique_across_submissions(
    client: AsyncClient, db_session: AsyncSession
):
    acc, purpose, _ = await _seed(db_session)
    references = set()
    for _ in range(3):
        token = issue_verification_token("9876543210")
        body = (await client.post("/api/v1/bhavan/enquiries",
                                  json=_payload(acc, purpose, token))).json()
        references.add(body["reference"])
    assert len(references) == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_enquiry.py -v`
Expected: FAIL — 404 on `/enquiries`

- [ ] **Step 3: Write the enquiry service**

Create `backend/app/services/bhavan_enquiry.py`:

```python
"""Enquiry creation and reference numbering."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    BhavanEnquiry, BhavanEnquiryAccommodation, BhavanEnquiryAmenity,
    EnquirySource, EnquiryStatus,
)
from app.services.bhavan_quote import Quote


async def next_reference(db: AsyncSession, when: Optional[datetime] = None) -> str:
    """BV-<year>-<5 digits>, counting within the year (PRD section 34)."""
    when = when or datetime.now(timezone.utc)
    prefix = f"BV-{when.year}-"

    used = (await db.execute(
        select(BhavanEnquiry.reference)
        .where(BhavanEnquiry.reference.like(f"{prefix}%"))
    )).scalars().all()

    highest = 0
    for reference in used:
        tail = reference.rsplit("-", 1)[-1]
        if tail.isdigit():
            highest = max(highest, int(tail))
    return f"{prefix}{highest + 1:05d}"


def quote_to_snapshot(quote: Quote) -> dict:
    """JSON-safe copy of the computed quote, frozen at submit time."""
    return {
        "check_in": quote.check_in.isoformat(),
        "check_out": quote.check_out.isoformat(),
        "nights": quote.nights,
        "days": quote.days,
        "lines": [
            {
                "kind": line.kind, "label": line.label, "detail": line.detail,
                "quantity": line.quantity, "unit_price": str(line.unit_price),
                "total": str(line.total),
            }
            for line in quote.lines
        ],
        "accommodation_total": str(quote.accommodation_total),
        "amenity_total": str(quote.amenity_total),
        "estimated_total": str(quote.estimated_total),
    }


async def rules_snapshot_for(db: AsyncSession, check_in, check_out) -> dict:
    """Which assignments were effective on each night. Admin-only."""
    from app.services.bhavan_rules import load_rules_for_dates, stay_dates

    nights = stay_dates(check_in, check_out)
    rules_by_date = await load_rules_for_dates(db, nights)
    return {
        night.isoformat(): [
            {"assignment_id": str(r.assignment_id), "label": r.label,
             "applied_at": r.applied_at.isoformat()}
            for r in sorted(rules_by_date.get(night, []), key=lambda r: r.applied_at)
        ]
        for night in nights
    }


async def create_enquiry(
    db: AsyncSession,
    *,
    payload,
    quote: Quote,
    terms_version_id: Optional[uuid.UUID],
    source: EnquirySource,
    purpose_name: Optional[str],
    accommodation_names: dict,
    amenity_details: dict,
    user_id: Optional[uuid.UUID] = None,
    created_by: Optional[uuid.UUID] = None,
    mobile_verified: bool = False,
    status: EnquiryStatus = EnquiryStatus.PENDING,
) -> BhavanEnquiry:
    """Persist an enquiry together with every snapshot it depends on."""
    now = datetime.now(timezone.utc)

    enquiry = BhavanEnquiry(
        reference=await next_reference(db, now),
        check_in=payload.check_in,
        check_out=payload.check_out,
        nights=quote.nights,
        purpose_id=payload.purpose_id,
        purpose_name=purpose_name,
        full_name=payload.full_name,
        mobile=payload.mobile,
        whatsapp_number=getattr(payload, "whatsapp_number", None),
        email=getattr(payload, "email", None),
        address=getattr(payload, "address", None),
        city=getattr(payload, "city", None),
        state=getattr(payload, "state", None),
        guests_total=payload.guests_total,
        adults=getattr(payload, "adults", 0),
        children=getattr(payload, "children", 0),
        special_requirements=getattr(payload, "special_requirements", None),
        message=getattr(payload, "message", None),
        status=status,
        source=source,
        mobile_verified=mobile_verified,
        verified_at=now if mobile_verified else None,
        terms_version_id=terms_version_id,
        terms_accepted=bool(getattr(payload, "terms_accepted", False)),
        terms_accepted_at=now if getattr(payload, "terms_accepted", False) else None,
        quote_snapshot=quote_to_snapshot(quote),
        rules_snapshot=await rules_snapshot_for(db, payload.check_in, payload.check_out),
        estimated_total=quote.estimated_total,
        user_id=user_id,
        created_by=created_by,
    )
    db.add(enquiry)
    await db.flush()

    for line in quote.lines:
        if line.kind != "accommodation":
            continue
        type_id = accommodation_names.get(line.label)
        db.add(BhavanEnquiryAccommodation(
            enquiry_id=enquiry.id,
            accommodation_type_id=type_id,
            type_name_snapshot=line.label,
            quantity=line.quantity,
            nights=quote.nights,
            unit_price_snapshot=line.unit_price,
            line_total=line.total,
        ))

    for line in quote.lines:
        if line.kind != "amenity":
            continue
        amenity_id, pricing_type = amenity_details.get(line.label, (None, ""))
        db.add(BhavanEnquiryAmenity(
            enquiry_id=enquiry.id,
            amenity_id=amenity_id,
            name_snapshot=line.label,
            pricing_type_snapshot=pricing_type,
            quantity=line.quantity,
            unit_price_snapshot=line.unit_price,
            line_total=line.total,
        ))

    await db.flush()
    return enquiry
```

- [ ] **Step 4: Append the submission endpoint**

Add to `backend/app/schemas/bhavan_public.py`:

```python
class EnquiryIn(BaseModel):
    check_in: date
    check_out: date
    accommodation: Dict[uuid.UUID, int] = Field(default_factory=dict)
    amenities: Dict[uuid.UUID, int] = Field(default_factory=dict)
    purpose_id: Optional[uuid.UUID] = None

    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=10, max_length=15, pattern=r"^\+?\d{10,15}$")
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    guests_total: int = Field(default=0, ge=0)
    adults: int = Field(default=0, ge=0)
    children: int = Field(default=0, ge=0)

    special_requirements: Optional[str] = None
    message: Optional[str] = None

    verification_token: str = Field(min_length=1)
    terms_accepted: bool


class EnquiryCreatedOut(BaseModel):
    reference: str
    status: str
    estimated_total: Decimal
    check_in: date
    check_out: date
    message: str
```

Add to `backend/app/routers/bhavan.py`:

```python
# ─── Enquiry submission ───────────────────────────────────────────────────────

from app.models.bhavan import EnquirySource, EnquiryStatus
from app.schemas.bhavan_public import EnquiryCreatedOut, EnquiryIn
from app.services.bhavan_enquiry import create_enquiry
from app.services.bhavan_otp import decode_verification_token

SUBMITTED_MESSAGE = (
    "Your enquiry has been received. This is not a confirmed booking - our "
    "team will contact you to confirm availability and next steps."
)


@router.post("/enquiries", response_model=EnquiryCreatedOut,
             status_code=status.HTTP_201_CREATED)
async def submit_enquiry(payload: EnquiryIn, db: AsyncSession = Depends(get_db)):
    """Submit an enquiry.

    Requires a verification token whose phone matches the enquiry, and
    acceptance of the currently published Terms. Availability is re-checked
    here rather than trusted from the browser.
    """
    # ── Verification, bound to this phone number ──────────────────────────
    try:
        verified_phone = decode_verification_token(payload.verification_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    if verified_phone != payload.mobile:
        raise HTTPException(
            status_code=401,
            detail="Please verify the mobile number you are submitting with.",
        )

    # ── Terms ─────────────────────────────────────────────────────────────
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=422,
            detail="You must accept the Terms & Conditions to submit an enquiry.",
        )
    terms = await get_published_terms(db)
    if terms is None:
        raise HTTPException(
            status_code=409,
            detail="Enquiries are temporarily unavailable. Please try again later.",
        )

    # ── Re-price and re-validate server-side ──────────────────────────────
    quote = await build_quote(db, QuoteRequest(
        check_in=payload.check_in,
        check_out=payload.check_out,
        accommodation=payload.accommodation,
        amenities=payload.amenities,
        guests_total=payload.guests_total,
        purpose_id=payload.purpose_id,
    ))
    if not quote.is_bookable:
        raise HTTPException(status_code=409, detail=quote.blockers)
    if not quote.lines:
        raise HTTPException(
            status_code=422,
            detail="Please select at least one room or dormitory.",
        )

    # ── Snapshot lookups ──────────────────────────────────────────────────
    types = {
        t.name: t.id
        for t in (await db.execute(select(BhavanAccommodationType))).scalars().all()
    }
    amenity_rows = (await db.execute(select(BhavanAmenity))).scalars().all()
    amenity_details = {a.name: (a.id, a.pricing_type.value) for a in amenity_rows}

    purpose_name = None
    if payload.purpose_id is not None:
        purpose = await db.get(BhavanPurpose, payload.purpose_id)
        purpose_name = purpose.name if purpose else None

    enquiry = await create_enquiry(
        db,
        payload=payload,
        quote=quote,
        terms_version_id=terms.id,
        source=EnquirySource.ONLINE,
        purpose_name=purpose_name,
        accommodation_names=types,
        amenity_details=amenity_details,
        mobile_verified=True,
        status=EnquiryStatus.PENDING,
    )
    await db.commit()

    return EnquiryCreatedOut(
        reference=enquiry.reference,
        status=enquiry.status.value,
        estimated_total=enquiry.estimated_total,
        check_in=enquiry.check_in,
        check_out=enquiry.check_out,
        message=SUBMITTED_MESSAGE,
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_enquiry.py -v`
Expected: 8 passed

- [ ] **Step 6: Run the whole backend suite**

Run: `cd backend && python -m pytest tests/ -v`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/bhavan_enquiry.py backend/app/routers/bhavan.py backend/app/schemas/bhavan_public.py backend/tests/test_bhavan_enquiry.py
git commit -m "feat(bhavan): add enquiry submission with price and terms snapshots"
```

---

# Phase 5 — Admin enquiry management

### Task 14: Enquiry list, detail, decisions and manual entry

**Files:**
- Modify: `backend/app/routers/bhavan_admin.py` (append), `backend/app/schemas/bhavan_admin.py` (append)
- Create: `backend/app/services/bhavan_status.py`
- Test: `backend/tests/test_bhavan_admin_enquiries.py`

**Interfaces:**
- Consumes: `build_quote`, `create_enquiry`, `available_units`, `record_audit`
- Produces: `sweep_time_driven_statuses(db) -> int`; endpoints `GET /enquiries`, `GET /enquiries/{id}`, `POST /enquiries/{id}/status`, `POST /enquiries/{id}/notes`, `POST /enquiries/manual`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_admin_enquiries.py`:

```python
"""Admin enquiry management, approval capacity checks, and the derived
expired/completed statuses."""

from datetime import date, timedelta
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.bhavan import (
    AccommodationKind, BhavanAccommodationType, BhavanEnquiry, BhavanPurpose,
    BhavanTermsVersion, BhavanUnit, EnquiryStatus, EnquirySource, UnitStatus,
)
from app.models.user import User, UserRole
from app.services.bhavan_otp import issue_verification_token


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(first_name="Admin", surname="User", mobile="9000000005",
                role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def _seed(db: AsyncSession, units: int = 4):
    acc = BhavanAccommodationType(
        name="AC Room", kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
    )
    db.add(acc)
    await db.flush()
    for i in range(units):
        db.add(BhavanUnit(accommodation_type_id=acc.id, label=f"10{i}",
                          status=UnitStatus.AVAILABLE))
    purpose = BhavanPurpose(name="Wedding")
    db.add_all([purpose, BhavanTermsVersion(version_label="v1.0", content="T",
                                            is_published=True)])
    await db.commit()
    return acc, purpose


async def _submit(client, acc, purpose, qty=1, mobile="9876543210"):
    token = issue_verification_token(mobile)
    return (await client.post("/api/v1/bhavan/enquiries", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
        "accommodation": {str(acc.id): qty}, "amenities": {},
        "purpose_id": str(purpose.id), "full_name": "Rajesh Goyal",
        "mobile": mobile, "guests_total": 2, "adults": 2, "children": 0,
        "verification_token": token, "terms_accepted": True,
    })).json()


async def test_enquiries_can_be_filtered_by_status(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    acc, purpose = await _seed(db_session)
    await _submit(client, acc, purpose)

    listed = (await client.get("/api/v1/admin/bhavan/enquiries?status=pending")).json()
    assert listed["total"] == 1
    assert listed["items"][0]["full_name"] == "Rajesh Goyal"

    empty = (await client.get("/api/v1/admin/bhavan/enquiries?status=approved")).json()
    assert empty["total"] == 0


async def test_search_matches_reference_name_and_mobile(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    acc, purpose = await _seed(db_session)
    created = await _submit(client, acc, purpose)

    for term in (created["reference"], "Rajesh", "9876543210"):
        found = (await client.get(
            f"/api/v1/admin/bhavan/enquiries?search={term}"
        )).json()
        assert found["total"] == 1, f"search for {term!r} found nothing"


async def test_detail_includes_the_admin_only_rules_snapshot(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    acc, purpose = await _seed(db_session)
    created = await _submit(client, acc, purpose)

    enquiry = (await db_session.execute(
        select(BhavanEnquiry).where(BhavanEnquiry.reference == created["reference"])
    )).scalar_one()

    detail = (await client.get(f"/api/v1/admin/bhavan/enquiries/{enquiry.id}")).json()
    assert "rules_snapshot" in detail
    # 1 AC Room x 2 nights x 1,500
    assert detail["quote_snapshot"]["estimated_total"] == "3000.00"
    assert detail["accommodations"][0]["type_name_snapshot"] == "AC Room"


async def test_approval_is_refused_when_capacity_is_gone(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    """No negative inventory (PRD section 55)."""
    acc, purpose = await _seed(db_session, units=2)
    first = await _submit(client, acc, purpose, qty=2, mobile="9876543210")
    second = await _submit(client, acc, purpose, qty=2, mobile="9876543211")

    ids = {}
    for reference in (first["reference"], second["reference"]):
        row = (await db_session.execute(
            select(BhavanEnquiry).where(BhavanEnquiry.reference == reference)
        )).scalar_one()
        ids[reference] = row.id

    ok = await client.post(
        f"/api/v1/admin/bhavan/enquiries/{ids[first['reference']]}/status",
        json={"status": "approved"},
    )
    assert ok.status_code == 200

    refused = await client.post(
        f"/api/v1/admin/bhavan/enquiries/{ids[second['reference']]}/status",
        json={"status": "approved"},
    )
    assert refused.status_code == 409


async def test_a_manual_enquiry_holds_inventory_immediately(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    """PRD section 37: phone and walk-in bookings must affect availability."""
    acc, purpose = await _seed(db_session, units=2)

    response = await client.post("/api/v1/admin/bhavan/enquiries/manual", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
        "accommodation": {str(acc.id): 2}, "amenities": {},
        "purpose_id": str(purpose.id), "full_name": "Walk In",
        "mobile": "9000000009", "guests_total": 4, "adults": 4, "children": 0,
        "source": "walk_in",
    })
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "approved"

    public = (await client.post("/api/v1/bhavan/availability", json={
        "check_in": "2026-12-20", "check_out": "2026-12-22",
    })).json()
    entry = next(e for e in public["accommodation"] if e["id"] == str(acc.id))
    assert entry["available"] == 0


async def test_notes_are_appended_with_their_author(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    acc, purpose = await _seed(db_session)
    created = await _submit(client, acc, purpose)
    enquiry = (await db_session.execute(
        select(BhavanEnquiry).where(BhavanEnquiry.reference == created["reference"])
    )).scalar_one()

    await client.post(f"/api/v1/admin/bhavan/enquiries/{enquiry.id}/notes",
                      json={"note": "Called the customer."})

    detail = (await client.get(f"/api/v1/admin/bhavan/enquiries/{enquiry.id}")).json()
    assert detail["notes"][0]["note"] == "Called the customer."
    assert detail["notes"][0]["admin_name"] == "Admin User"


async def test_past_pending_enquiries_are_swept_to_expired(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    acc, purpose = await _seed(db_session)
    yesterday = date.today() - timedelta(days=3)
    db_session.add(BhavanEnquiry(
        reference="BV-2020-00001", check_in=yesterday,
        check_out=yesterday + timedelta(days=1), nights=1,
        full_name="Old", mobile="9000000000", status=EnquiryStatus.PENDING,
    ))
    await db_session.commit()

    listed = (await client.get("/api/v1/admin/bhavan/enquiries")).json()
    old = next(i for i in listed["items"] if i["reference"] == "BV-2020-00001")
    assert old["status"] == "expired"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_admin_enquiries.py -v`
Expected: FAIL — 404 on `/enquiries`

- [ ] **Step 3: Write the status sweep**

Create `backend/app/services/bhavan_status.py`:

```python
"""Time-driven enquiry statuses.

`expired` and `completed` are derived from dates rather than set by an admin.
Sweeping on admin list reads keeps the module free of a cron dependency, which
this deployment does not have.
"""

from datetime import date

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import BhavanEnquiry, EnquiryStatus


async def sweep_time_driven_statuses(db: AsyncSession, today: date | None = None) -> int:
    """Mark past-dated enquiries. Returns how many rows changed."""
    today = today or date.today()

    expired = await db.execute(
        update(BhavanEnquiry)
        .where(
            BhavanEnquiry.status.in_((EnquiryStatus.PENDING, EnquiryStatus.UNDER_REVIEW)),
            BhavanEnquiry.check_in < today,
        )
        .values(status=EnquiryStatus.EXPIRED)
    )

    completed = await db.execute(
        update(BhavanEnquiry)
        .where(
            BhavanEnquiry.status == EnquiryStatus.APPROVED,
            BhavanEnquiry.check_out < today,
        )
        .values(status=EnquiryStatus.COMPLETED)
    )

    changed = (expired.rowcount or 0) + (completed.rowcount or 0)
    if changed:
        await db.commit()
    return changed
```

- [ ] **Step 4: Append the enquiry schemas**

Add to `backend/app/schemas/bhavan_admin.py`:

```python
class EnquiryLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    type_name_snapshot: str
    quantity: int
    nights: int
    unit_price_snapshot: Decimal
    line_total: Decimal


class EnquiryAmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name_snapshot: str
    pricing_type_snapshot: str
    quantity: int
    unit_price_snapshot: Decimal
    line_total: Decimal


class EnquiryNoteOut(BaseModel):
    id: uuid.UUID
    note: str
    admin_name: Optional[str]
    created_at: datetime


class EnquiryListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    reference: str
    full_name: str
    mobile: str
    check_in: date
    check_out: date
    nights: int
    purpose_name: Optional[str]
    status: EnquiryStatus
    source: EnquirySource
    estimated_total: Decimal
    created_at: datetime


class EnquiryPageOut(BaseModel):
    items: List[EnquiryListItemOut]
    total: int
    page: int
    per_page: int


class EnquiryDetailOut(EnquiryListItemOut):
    whatsapp_number: Optional[str]
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    guests_total: int
    adults: int
    children: int
    special_requirements: Optional[str]
    message: Optional[str]
    mobile_verified: bool
    terms_accepted: bool
    terms_accepted_at: Optional[datetime]
    quote_snapshot: dict
    #: Admin-only. Never present in a public response.
    rules_snapshot: dict
    decision_reason: Optional[str]
    accommodations: List[EnquiryLineOut] = []
    amenities: List[EnquiryAmenityOut] = []
    notes: List[EnquiryNoteOut] = []


class EnquiryStatusIn(BaseModel):
    status: EnquiryStatus
    reason: Optional[str] = None


class EnquiryNoteIn(BaseModel):
    note: str = Field(min_length=1)


class ManualEnquiryIn(BaseModel):
    check_in: date
    check_out: date
    accommodation: Dict[uuid.UUID, int] = Field(default_factory=dict)
    amenities: Dict[uuid.UUID, int] = Field(default_factory=dict)
    purpose_id: Optional[uuid.UUID] = None
    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=10, max_length=15)
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    guests_total: int = Field(default=0, ge=0)
    adults: int = Field(default=0, ge=0)
    children: int = Field(default=0, ge=0)
    special_requirements: Optional[str] = None
    message: Optional[str] = None
    source: EnquirySource = EnquirySource.ADMIN
    terms_accepted: bool = True
```

- [ ] **Step 5: Append the enquiry endpoints**

Add to `backend/app/routers/bhavan_admin.py`:

```python
# ─── Enquiries ────────────────────────────────────────────────────────────────

from sqlalchemy import func as sa_func, or_

from app.models.bhavan import (
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanEnquiryNote,
    BhavanPurpose as _BhavanPurpose, EnquirySource,
)
from app.schemas.bhavan_admin import (
    EnquiryDetailOut, EnquiryListItemOut, EnquiryNoteIn, EnquiryNoteOut,
    EnquiryPageOut, EnquiryStatusIn, ManualEnquiryIn,
)
from app.services.bhavan_enquiry import create_enquiry
from app.services.bhavan_quote import QuoteRequest, build_quote
from app.services.bhavan_status import sweep_time_driven_statuses


@router.get("/enquiries", response_model=EnquiryPageOut)
async def list_enquiries(
    status_filter: Optional[EnquiryStatus] = Query(default=None, alias="status"),
    search: Optional[str] = None,
    from_date: Optional[date_type] = None,
    to_date: Optional[date_type] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    await sweep_time_driven_statuses(db)

    query = select(BhavanEnquiry)
    if status_filter is not None:
        query = query.where(BhavanEnquiry.status == status_filter)
    if from_date is not None:
        query = query.where(BhavanEnquiry.check_out >= from_date)
    if to_date is not None:
        query = query.where(BhavanEnquiry.check_in <= to_date)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(
            BhavanEnquiry.reference.ilike(pattern),
            BhavanEnquiry.full_name.ilike(pattern),
            BhavanEnquiry.mobile.ilike(pattern),
        ))

    total = (await db.execute(
        select(sa_func.count()).select_from(query.subquery())
    )).scalar_one()

    rows = (await db.execute(
        query.order_by(BhavanEnquiry.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return EnquiryPageOut(
        items=[EnquiryListItemOut.model_validate(row) for row in rows],
        total=total, page=page, per_page=per_page,
    )


@router.get("/enquiries/{enquiry_id}", response_model=EnquiryDetailOut)
async def read_enquiry(enquiry_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    enquiry = (await db.execute(
        select(BhavanEnquiry)
        .options(
            selectinload(BhavanEnquiry.accommodations),
            selectinload(BhavanEnquiry.amenities),
            selectinload(BhavanEnquiry.notes),
        )
        .where(BhavanEnquiry.id == enquiry_id)
    )).scalars().first()
    if enquiry is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    authors = {}
    author_ids = [n.admin_id for n in enquiry.notes if n.admin_id]
    if author_ids:
        for user in (await db.execute(
            select(User).where(User.user_id.in_(author_ids))
        )).scalars().all():
            authors[user.user_id] = f"{user.first_name} {user.surname}".strip()

    detail = EnquiryDetailOut.model_validate(enquiry)
    detail.notes = [
        EnquiryNoteOut(
            id=note.id, note=note.note,
            admin_name=authors.get(note.admin_id),
            created_at=note.created_at,
        )
        for note in sorted(enquiry.notes, key=lambda n: n.created_at)
    ]
    return detail


@router.post("/enquiries/{enquiry_id}/status", response_model=EnquiryDetailOut)
async def change_enquiry_status(
    enquiry_id: uuid.UUID,
    payload: EnquiryStatusIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Approving re-checks capacity: an enquiry may have been submitted when
    rooms were free and approved after they were taken."""
    enquiry = await db.get(BhavanEnquiry, enquiry_id)
    if enquiry is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if payload.status is EnquiryStatus.APPROVED:
        wanted = {
            line.accommodation_type_id: line.quantity
            for line in (await db.execute(
                select(BhavanEnquiryAccommodation)
                .where(BhavanEnquiryAccommodation.enquiry_id == enquiry_id)
            )).scalars().all()
            if line.accommodation_type_id is not None
        }
        free = await available_units(db, enquiry.check_in, enquiry.check_out,
                                     exclude_enquiry_id=enquiry_id)
        short = [
            type_id for type_id, quantity in wanted.items()
            if quantity > free.get(type_id, 0)
        ]
        if short:
            names = (await db.execute(
                select(BhavanAccommodationType.name)
                .where(BhavanAccommodationType.id.in_(short))
            )).scalars().all()
            raise HTTPException(
                status_code=409,
                detail=f"Not enough availability to approve: {', '.join(names)}.",
            )

    old = enquiry.status
    enquiry.status = payload.status
    enquiry.decision_reason = payload.reason
    enquiry.reviewed_by = admin.user_id
    enquiry.reviewed_at = datetime.now(timezone.utc)

    await record_audit(db, admin, "status_change", "bhavan_enquiries", enquiry_id,
                       {"status": old}, {"status": payload.status,
                                         "reason": payload.reason})
    await db.commit()
    return await read_enquiry(enquiry_id, db)


@router.post("/enquiries/{enquiry_id}/notes", response_model=EnquiryDetailOut)
async def add_enquiry_note(
    enquiry_id: uuid.UUID,
    payload: EnquiryNoteIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if await db.get(BhavanEnquiry, enquiry_id) is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    db.add(BhavanEnquiryNote(enquiry_id=enquiry_id, admin_id=admin.user_id,
                             note=payload.note))
    await db.commit()
    return await read_enquiry(enquiry_id, db)


@router.post("/enquiries/manual", response_model=EnquiryDetailOut,
             status_code=status.HTTP_201_CREATED)
async def create_manual_enquiry(
    payload: ManualEnquiryIn,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Phone, walk-in and office bookings (PRD section 37).

    Created as APPROVED so it immediately holds inventory — otherwise an
    online customer would see a committed room as free.
    """
    quote = await build_quote(db, QuoteRequest(
        check_in=payload.check_in, check_out=payload.check_out,
        accommodation=payload.accommodation, amenities=payload.amenities,
        guests_total=payload.guests_total, purpose_id=payload.purpose_id,
    ))
    if not quote.is_bookable:
        raise HTTPException(status_code=409, detail=quote.blockers)

    types = {
        t.name: t.id
        for t in (await db.execute(select(BhavanAccommodationType))).scalars().all()
    }
    amenity_details = {
        a.name: (a.id, a.pricing_type.value)
        for a in (await db.execute(select(BhavanAmenity))).scalars().all()
    }

    purpose_name = None
    if payload.purpose_id is not None:
        purpose = await db.get(_BhavanPurpose, payload.purpose_id)
        purpose_name = purpose.name if purpose else None

    from app.services.bhavan_terms import get_published_terms
    terms = await get_published_terms(db)

    enquiry = await create_enquiry(
        db,
        payload=payload,
        quote=quote,
        terms_version_id=terms.id if terms else None,
        source=payload.source,
        purpose_name=purpose_name,
        accommodation_names=types,
        amenity_details=amenity_details,
        created_by=admin.user_id,
        mobile_verified=False,
        status=EnquiryStatus.APPROVED,
    )
    await record_audit(db, admin, "manual_create", "bhavan_enquiries", enquiry.id,
                       None, {"reference": enquiry.reference,
                              "source": payload.source.value})
    await db.commit()
    return await read_enquiry(enquiry.id, db)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_admin_enquiries.py -v`
Expected: 7 passed

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/bhavan_admin.py backend/app/schemas/bhavan_admin.py backend/app/services/bhavan_status.py backend/tests/test_bhavan_admin_enquiries.py
git commit -m "feat(bhavan): add admin enquiry management and manual entry"
```

---

### Task 15: Admin overview and audit log

**Files:**
- Modify: `backend/app/routers/bhavan_admin.py` (append), `backend/app/schemas/bhavan_admin.py` (append)
- Test: `backend/tests/test_bhavan_overview.py`

**Interfaces:**
- Produces: `GET /overview` returning `OverviewOut`; `GET /audit-log` returning `AuditEntryOut[]`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_bhavan_overview.py`:

```python
"""The dashboard counts from PRD section 43, and the audit feed from 42."""

from datetime import date, timedelta
from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.bhavan import (
    AccommodationKind, BhavanAccommodationType, BhavanEnquiry, BhavanUnit,
    EnquiryStatus, UnitStatus,
)
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(first_name="Admin", surname="User", mobile="9000000006",
                role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def test_overview_counts_pending_and_upcoming(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    acc = BhavanAccommodationType(
        name="AC Room", kind=AccommodationKind.ROOM, capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
    )
    db_session.add(acc)
    await db_session.flush()
    db_session.add(BhavanUnit(accommodation_type_id=acc.id, label="101",
                              status=UnitStatus.AVAILABLE))

    soon = date.today() + timedelta(days=10)
    db_session.add_all([
        BhavanEnquiry(reference="BV-2026-00001", check_in=soon,
                      check_out=soon + timedelta(days=2), nights=2,
                      full_name="A", mobile="9000000001",
                      status=EnquiryStatus.PENDING,
                      estimated_total=Decimal("3000.00")),
        BhavanEnquiry(reference="BV-2026-00002", check_in=soon,
                      check_out=soon + timedelta(days=1), nights=1,
                      full_name="B", mobile="9000000002",
                      status=EnquiryStatus.APPROVED,
                      estimated_total=Decimal("1500.00")),
    ])
    await db_session.commit()

    body = (await client.get("/api/v1/admin/bhavan/overview")).json()
    assert body["pending_enquiries"] == 1
    assert body["approved_enquiries"] == 1
    assert body["upcoming_enquiries"] == 2
    assert body["total_units"] == 1
    assert body["estimated_approved_value"] == "1500.00"


async def test_audit_log_returns_bhavan_entries_newest_first(
    client: AsyncClient, admin_user: User
):
    await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00",
    })
    await client.post("/api/v1/admin/bhavan/amenities", json={
        "name": "Chair", "price": "10.00", "pricing_type": "per_unit",
    })

    entries = (await client.get("/api/v1/admin/bhavan/audit-log")).json()
    assert len(entries) >= 2
    assert entries[0]["target_table"] == "bhavan_amenities"
    assert entries[0]["admin_name"] == "Admin User"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_bhavan_overview.py -v`
Expected: FAIL — 404 on `/overview`

- [ ] **Step 3: Append the schemas and endpoints**

Add to `backend/app/schemas/bhavan_admin.py`:

```python
class OverviewOut(BaseModel):
    pending_enquiries: int
    under_review_enquiries: int
    approved_enquiries: int
    todays_enquiries: int
    upcoming_enquiries: int
    total_units: int
    units_in_maintenance: int
    active_rule_assignments: int
    blocked_dates_next_90: int
    estimated_approved_value: Decimal


class AuditEntryOut(BaseModel):
    id: uuid.UUID
    admin_name: Optional[str]
    action: str
    target_table: Optional[str]
    target_id: Optional[uuid.UUID]
    old_value: Optional[dict]
    new_value: Optional[dict]
    timestamp: datetime
```

Add to `backend/app/routers/bhavan_admin.py`:

```python
# ─── Overview and audit ───────────────────────────────────────────────────────

from app.models.audit import AuditLog
from app.schemas.bhavan_admin import AuditEntryOut, OverviewOut


@router.get("/overview", response_model=OverviewOut)
async def read_overview(db: AsyncSession = Depends(get_db)):
    await sweep_time_driven_statuses(db)
    today = date_type.today()
    horizon = today + timedelta(days=90)

    async def count_status(value) -> int:
        return (await db.execute(
            select(sa_func.count()).select_from(BhavanEnquiry)
            .where(BhavanEnquiry.status == value)
        )).scalar_one()

    todays = (await db.execute(
        select(sa_func.count()).select_from(BhavanEnquiry)
        .where(sa_func.date(BhavanEnquiry.created_at) == today)
    )).scalar_one()

    upcoming = (await db.execute(
        select(sa_func.count()).select_from(BhavanEnquiry)
        .where(
            BhavanEnquiry.check_in >= today,
            BhavanEnquiry.status.in_(
                (EnquiryStatus.PENDING, EnquiryStatus.UNDER_REVIEW,
                 EnquiryStatus.APPROVED)
            ),
        )
    )).scalar_one()

    total_units = (await db.execute(
        select(sa_func.count()).select_from(BhavanUnit)
        .where(BhavanUnit.status == UnitStatus.AVAILABLE)
    )).scalar_one()
    maintenance_units = (await db.execute(
        select(sa_func.count()).select_from(BhavanUnit)
        .where(BhavanUnit.status == UnitStatus.MAINTENANCE)
    )).scalar_one()

    active_assignments = (await db.execute(
        select(sa_func.count()).select_from(BhavanRuleAssignment)
        .where(BhavanRuleAssignment.revoked_at.is_(None),
               BhavanRuleAssignment.is_active.is_(True))
    )).scalar_one()

    horizon_days = [today + timedelta(days=n) for n in range((horizon - today).days)]
    baseline = await load_baseline(db)
    rules_by_date = await load_rules_for_dates(db, horizon_days)
    blocked = sum(
        1 for day in horizon_days
        if resolve_day(day, rules_by_date.get(day, []), baseline).closed
    )

    approved_value = (await db.execute(
        select(sa_func.coalesce(sa_func.sum(BhavanEnquiry.estimated_total), 0))
        .where(BhavanEnquiry.status == EnquiryStatus.APPROVED)
    )).scalar_one()

    await db.commit()

    return OverviewOut(
        pending_enquiries=await count_status(EnquiryStatus.PENDING),
        under_review_enquiries=await count_status(EnquiryStatus.UNDER_REVIEW),
        approved_enquiries=await count_status(EnquiryStatus.APPROVED),
        todays_enquiries=todays,
        upcoming_enquiries=upcoming,
        total_units=total_units,
        units_in_maintenance=maintenance_units,
        active_rule_assignments=active_assignments,
        blocked_dates_next_90=blocked,
        estimated_approved_value=approved_value,
    )


@router.get("/audit-log", response_model=List[AuditEntryOut])
async def read_audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(AuditLog, User)
        .outerjoin(User, User.user_id == AuditLog.admin_id)
        .where(AuditLog.target_table.like("bhavan_%"))
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )).all()

    return [
        AuditEntryOut(
            id=log.log_id,
            admin_name=(f"{user.first_name} {user.surname}".strip() if user else None),
            action=log.action,
            target_table=log.target_table,
            target_id=log.target_id,
            old_value=log.old_value,
            new_value=log.new_value,
            timestamp=log.timestamp,
        )
        for log, user in rows
    ]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_bhavan_overview.py -v`
Expected: 2 passed

- [ ] **Step 5: Run the whole backend suite**

Run: `cd backend && python -m pytest tests/ -v`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/bhavan_admin.py backend/app/schemas/bhavan_admin.py backend/tests/test_bhavan_overview.py
git commit -m "feat(bhavan): add admin overview and audit log endpoints"
```

---

# Phase 6 — Public frontend

### Task 16: API client and booking state reducer

**Files:**
- Create: `frontend/src/utils/bhavan.ts`, `frontend/src/utils/bhavanBooking.ts`
- Test: `frontend/src/utils/bhavanBooking.test.ts`

**Interfaces:**
- Consumes: `getApiBaseUrl` (`@/utils/api`)
- Produces: types `BhavanConfig`, `AccommodationType`, `Amenity`, `Purpose`, `Quote`, `QuoteLine`; API functions `fetchConfig`, `fetchQuote`, `requestOtp`, `verifyOtp`, `submitEnquiry`, `fetchTerms`; reducer `bookingReducer`, `initialBookingState`, `canAdvance(state, step)`, `nightsBetween(a, b)`, `STEPS`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/bhavanBooking.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  bookingReducer,
  canAdvance,
  initialBookingState,
  nightsBetween,
  STEPS,
} from "./bhavanBooking";

const AC_ROOM = "11111111-1111-1111-1111-111111111111";
const CHAIRS = "22222222-2222-2222-2222-222222222222";
const WEDDING = "33333333-3333-3333-3333-333333333333";

describe("nightsBetween", () => {
  it("counts nights, not calendar days", () => {
    expect(nightsBetween("2026-12-20", "2026-12-22")).toBe(2);
  });

  it("returns 0 when check-out is not after check-in", () => {
    expect(nightsBetween("2026-12-22", "2026-12-20")).toBe(0);
    expect(nightsBetween("2026-12-20", "2026-12-20")).toBe(0);
  });

  it("returns 0 for missing dates", () => {
    expect(nightsBetween("", "2026-12-22")).toBe(0);
  });
});

describe("bookingReducer", () => {
  it("clears the quote when dates change so a stale total is never shown", () => {
    const withQuote = {
      ...initialBookingState,
      quote: { estimated_total: "6000.00", lines: [], blockers: [] } as never,
    };
    const next = bookingReducer(withQuote, {
      type: "SET_DATES", checkIn: "2026-12-20", checkOut: "2026-12-22",
    });
    expect(next.quote).toBeNull();
    expect(next.checkIn).toBe("2026-12-20");
  });

  it("removes an accommodation entry when its quantity reaches zero", () => {
    let state = bookingReducer(initialBookingState, {
      type: "SET_ACCOMMODATION", id: AC_ROOM, quantity: 2,
    });
    expect(state.accommodation[AC_ROOM]).toBe(2);

    state = bookingReducer(state, {
      type: "SET_ACCOMMODATION", id: AC_ROOM, quantity: 0,
    });
    expect(AC_ROOM in state.accommodation).toBe(false);
  });

  it("never stores a negative quantity", () => {
    const seeded = bookingReducer(initialBookingState, {
      type: "SET_AMENITY", id: CHAIRS, quantity: 10,
    });
    const state = bookingReducer(seeded, {
      type: "SET_AMENITY", id: CHAIRS, quantity: -5,
    });
    expect(CHAIRS in state.amenities).toBe(false);
  });

  it("drops the verification token when the mobile number changes", () => {
    const verified = {
      ...initialBookingState,
      customer: { ...initialBookingState.customer, mobile: "9876543210" },
      verificationToken: "a.token.here",
    };
    const next = bookingReducer(verified, {
      type: "SET_CUSTOMER_FIELD", field: "mobile", value: "9876543211",
    });
    expect(next.verificationToken).toBeNull();
  });

  it("keeps the verification token when an unrelated field changes", () => {
    const verified = { ...initialBookingState, verificationToken: "a.token.here" };
    const next = bookingReducer(verified, {
      type: "SET_CUSTOMER_FIELD", field: "city", value: "Jaipur",
    });
    expect(next.verificationToken).toBe("a.token.here");
  });
});

describe("canAdvance", () => {
  const dated = {
    ...initialBookingState,
    checkIn: "2026-12-20",
    checkOut: "2026-12-22",
    purposeId: WEDDING,
  };

  it("blocks the dates step until both dates and a purpose are chosen", () => {
    expect(canAdvance(initialBookingState, "dates")).toBe(false);
    expect(canAdvance(dated, "dates")).toBe(true);
  });

  it("blocks the accommodation step until something is selected", () => {
    expect(canAdvance(dated, "accommodation")).toBe(false);
    const chosen = { ...dated, accommodation: { [AC_ROOM]: 1 } };
    expect(canAdvance(chosen, "accommodation")).toBe(true);
  });

  it("blocks accommodation when the quote reports a blocker", () => {
    const blocked = {
      ...dated,
      accommodation: { [AC_ROOM]: 1 },
      quote: { blockers: ["The Bhavan is unavailable for the selected dates."] } as never,
    };
    expect(canAdvance(blocked, "accommodation")).toBe(false);
  });

  it("allows amenities to be skipped", () => {
    expect(canAdvance(dated, "amenities")).toBe(true);
  });

  it("requires name and a valid mobile on the details step", () => {
    const partial = {
      ...dated,
      customer: { ...dated.customer, full_name: "Rajesh Goyal", mobile: "98765" },
    };
    expect(canAdvance(partial, "details")).toBe(false);

    const complete = {
      ...partial,
      customer: { ...partial.customer, mobile: "9876543210" },
    };
    expect(canAdvance(complete, "details")).toBe(true);
  });

  it("requires a verification token on the verify step", () => {
    expect(canAdvance(dated, "verify")).toBe(false);
    expect(canAdvance({ ...dated, verificationToken: "t" }, "verify")).toBe(true);
  });

  it("requires accepted terms on the review step", () => {
    const verified = { ...dated, verificationToken: "t" };
    expect(canAdvance(verified, "review")).toBe(false);
    expect(canAdvance({ ...verified, termsAccepted: true }, "review")).toBe(true);
  });
});

describe("STEPS", () => {
  it("runs in the order the PRD's flow diagram specifies", () => {
    expect(STEPS.map((s) => s.id)).toEqual([
      "dates", "accommodation", "amenities", "details", "verify", "review",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/utils/bhavanBooking.test.ts`
Expected: FAIL — cannot resolve `./bhavanBooking`

- [ ] **Step 3: Write the API client**

Create `frontend/src/utils/bhavan.ts`:

```typescript
/**
 * Bhavan booking API client.
 *
 * All amounts arrive as strings because the backend uses Decimal. Do not
 * parse them into JavaScript numbers for arithmetic — display them as sent,
 * and let the server do the maths.
 */
import axios from "axios";
import { getApiBaseUrl } from "./api";

export interface AccommodationType {
  id: string;
  name: string;
  kind: "room" | "dormitory";
  description: string | null;
  capacity_per_unit: number;
  from_price_per_night: string;
  images: { path: string }[];
}

export interface Amenity {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  price: string;
  pricing_type: "per_unit" | "per_day" | "per_night" | "per_booking" | "one_time";
  available_quantity: number | null;
}

export interface Purpose {
  id: string;
  name: string;
}

export interface BhavanConfig {
  accommodation_types: AccommodationType[];
  amenities: Amenity[];
  purposes: Purpose[];
  required_fields: Record<string, boolean>;
  advance_booking_days: number;
  contact_phone: string | null;
  intro_text: string | null;
  has_published_terms: boolean;
}

export interface QuoteLine {
  kind: "accommodation" | "amenity";
  label: string;
  detail: string;
  quantity: number;
  unit_price: string;
  total: string;
}

export interface Quote {
  check_in: string;
  check_out: string;
  nights: number;
  days: number;
  lines: QuoteLine[];
  accommodation_total: string;
  amenity_total: string;
  estimated_total: string;
  blockers: string[];
  notices: string[];
  is_bookable: boolean;
}

export interface AvailabilityEntry {
  id: string;
  name: string;
  available: number;
  capacity_per_unit: number;
  price_per_night: string;
  total_price: string;
}

export interface Availability {
  check_in: string;
  check_out: string;
  nights: number;
  days: number;
  accommodation: AvailabilityEntry[];
  available_amenity_ids: string[];
  allowed_purpose_ids: string[];
  blockers: string[];
  notices: string[];
  is_bookable: boolean;
}

export interface Terms {
  id: string;
  version_label: string;
  content: string;
  published_at: string | null;
}

const base = () => `${getApiBaseUrl()}/bhavan`;

export async function fetchConfig(): Promise<BhavanConfig> {
  return (await axios.get(`${base()}/config`)).data;
}

export async function fetchAvailability(payload: {
  check_in: string;
  check_out: string;
  purpose_id?: string | null;
}): Promise<Availability> {
  return (await axios.post(`${base()}/availability`, payload)).data;
}

export async function fetchQuote(payload: {
  check_in: string;
  check_out: string;
  accommodation: Record<string, number>;
  amenities: Record<string, number>;
  guests_total: number;
  purpose_id?: string | null;
}): Promise<Quote> {
  return (await axios.post(`${base()}/quote`, payload)).data;
}

export async function requestOtp(mobile: string) {
  return (await axios.post(`${base()}/otp/request`, { mobile })).data as {
    sent: boolean;
    channel: string;
    message: string;
  };
}

export async function verifyOtp(mobile: string, code: string) {
  return (await axios.post(`${base()}/otp/verify`, { mobile, code })).data as {
    verified: boolean;
    verification_token: string;
  };
}

export async function submitEnquiry(payload: Record<string, unknown>) {
  return (await axios.post(`${base()}/enquiries`, payload)).data as {
    reference: string;
    status: string;
    estimated_total: string;
    check_in: string;
    check_out: string;
    message: string;
  };
}

export async function fetchTerms(): Promise<Terms | null> {
  try {
    return (await axios.get(`${base()}/terms`)).data;
  } catch {
    return null;
  }
}

/** Pull a readable message out of an axios error without leaking a stack. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail.map((d) => (typeof d === "string" ? d : d?.msg ?? "")).join(" ");
    }
  }
  return fallback;
}
```

- [ ] **Step 4: Write the booking reducer**

Create `frontend/src/utils/bhavanBooking.ts`:

```typescript
/**
 * Booking form state.
 *
 * Kept out of the component so the step-gating rules can be tested directly.
 * Two invariants matter: a stale quote must never be displayed after the
 * selection changes, and a verification token must never survive a change of
 * mobile number.
 */
import type { Quote } from "./bhavan";

export type StepId =
  | "dates" | "accommodation" | "amenities" | "details" | "verify" | "review";

export const STEPS: { id: StepId; title: string }[] = [
  { id: "dates", title: "Dates & Purpose" },
  { id: "accommodation", title: "Accommodation" },
  { id: "amenities", title: "Amenities" },
  { id: "details", title: "Your Details" },
  { id: "verify", title: "Verify Mobile" },
  { id: "review", title: "Review & Submit" },
];

export interface CustomerDetails {
  full_name: string;
  mobile: string;
  whatsapp_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  adults: number;
  children: number;
  special_requirements: string;
  message: string;
}

export interface BookingState {
  step: StepId;
  checkIn: string;
  checkOut: string;
  purposeId: string | null;
  accommodation: Record<string, number>;
  amenities: Record<string, number>;
  customer: CustomerDetails;
  verificationToken: string | null;
  termsAccepted: boolean;
  quote: Quote | null;
}

export type BookingAction =
  | { type: "SET_STEP"; step: StepId }
  | { type: "SET_DATES"; checkIn: string; checkOut: string }
  | { type: "SET_PURPOSE"; purposeId: string | null }
  | { type: "SET_ACCOMMODATION"; id: string; quantity: number }
  | { type: "SET_AMENITY"; id: string; quantity: number }
  | { type: "SET_CUSTOMER_FIELD"; field: keyof CustomerDetails; value: string | number }
  | { type: "SET_VERIFICATION_TOKEN"; token: string | null }
  | { type: "SET_TERMS_ACCEPTED"; accepted: boolean }
  | { type: "SET_QUOTE"; quote: Quote | null };

export const initialBookingState: BookingState = {
  step: "dates",
  checkIn: "",
  checkOut: "",
  purposeId: null,
  accommodation: {},
  amenities: {},
  customer: {
    full_name: "", mobile: "", whatsapp_number: "", email: "", address: "",
    city: "", state: "", adults: 1, children: 0,
    special_requirements: "", message: "",
  },
  verificationToken: null,
  termsAccepted: false,
  quote: null,
};

function withQuantity(
  current: Record<string, number>,
  id: string,
  quantity: number,
): Record<string, number> {
  const next = { ...current };
  if (quantity > 0) {
    next[id] = quantity;
  } else {
    delete next[id];
  }
  return next;
}

export function bookingReducer(
  state: BookingState,
  action: BookingAction,
): BookingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };

    case "SET_DATES":
      // Dropping the quote here is deliberate: showing yesterday's total
      // against today's dates would be a lie the customer cannot detect.
      return {
        ...state,
        checkIn: action.checkIn,
        checkOut: action.checkOut,
        quote: null,
      };

    case "SET_PURPOSE":
      return { ...state, purposeId: action.purposeId, quote: null };

    case "SET_ACCOMMODATION":
      return {
        ...state,
        accommodation: withQuantity(state.accommodation, action.id, action.quantity),
      };

    case "SET_AMENITY":
      return {
        ...state,
        amenities: withQuantity(state.amenities, action.id, action.quantity),
      };

    case "SET_CUSTOMER_FIELD": {
      const customer = { ...state.customer, [action.field]: action.value };
      // A token proves one specific number was verified. Changing the number
      // invalidates that proof, and the server would reject it anyway.
      const verificationToken =
        action.field === "mobile" ? null : state.verificationToken;
      return { ...state, customer, verificationToken };
    }

    case "SET_VERIFICATION_TOKEN":
      return { ...state, verificationToken: action.token };

    case "SET_TERMS_ACCEPTED":
      return { ...state, termsAccepted: action.accepted };

    case "SET_QUOTE":
      return { ...state, quote: action.quote };

    default:
      return state;
  }
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? nights : 0;
}

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

export function canAdvance(state: BookingState, step: StepId): boolean {
  const hasBlockers = (state.quote?.blockers?.length ?? 0) > 0;

  switch (step) {
    case "dates":
      return nightsBetween(state.checkIn, state.checkOut) > 0 && !!state.purposeId;

    case "accommodation":
      return Object.keys(state.accommodation).length > 0 && !hasBlockers;

    case "amenities":
      return !hasBlockers;

    case "details":
      return (
        state.customer.full_name.trim().length >= 2 &&
        MOBILE_PATTERN.test(state.customer.mobile.trim())
      );

    case "verify":
      return !!state.verificationToken;

    case "review":
      return !!state.verificationToken && state.termsAccepted && !hasBlockers;

    default:
      return false;
  }
}

export function totalGuests(state: BookingState): number {
  return Number(state.customer.adults || 0) + Number(state.customer.children || 0);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- src/utils/bhavanBooking.test.ts`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/bhavan.ts frontend/src/utils/bhavanBooking.ts frontend/src/utils/bhavanBooking.test.ts
git commit -m "feat(bhavan): add public API client and booking state reducer"
```

---

### Task 17: Public landing and Terms pages

**Files:**
- Create: `frontend/src/app/(public)/bhavan/page.tsx`, `frontend/src/app/(public)/bhavan/terms-and-conditions/page.tsx`
- Modify: `frontend/src/components/layout/Navbar.tsx:15-21`, `frontend/src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `fetchConfig`, `fetchTerms` (`@/utils/bhavan`), `mediaUrl` (`@/utils/media`)
- Produces: routes `/bhavan` and `/bhavan/terms-and-conditions`

- [ ] **Step 1: Write the landing page**

Create `frontend/src/app/(public)/bhavan/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Loader2, Package, Phone, Users } from "lucide-react";
import { fetchConfig, type BhavanConfig } from "@/utils/bhavan";
import { mediaUrl } from "@/utils/media";

const PRICING_LABEL: Record<string, string> = {
  per_unit: "per item",
  per_day: "per day",
  per_night: "per night",
  per_booking: "per booking",
  one_time: "one-time",
};

export default function BhavanPage() {
  const [config, setConfig] = useState<BhavanConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((error) => console.error("Failed to load Bhavan config", error))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vermilion" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="display text-4xl font-bold text-ink md:text-5xl">
          Bhavan Booking
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-600">
          {config?.intro_text ??
            "Rooms and dormitories for weddings, family functions, camps and community events."}
        </p>
        <Link
          href="/bhavan/booking"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Check availability <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-sm text-zinc-500">
          Submitting the form sends an enquiry. It is not a confirmed booking.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-ink">
          <BedDouble className="h-5 w-5 text-vermilion" /> Accommodation
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {config?.accommodation_types.map((type) => (
            <article
              key={type.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              {type.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(type.images[0].path) ?? ""}
                  alt={type.name}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-zinc-100">
                  <BedDouble className="h-10 w-10 text-zinc-300" />
                </div>
              )}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-ink">{type.name}</h3>
                {type.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                    {type.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Users className="h-4 w-4" /> Up to {type.capacity_per_unit}
                  </span>
                  <span className="font-semibold text-ink">
                    From &#8377;{type.from_price_per_night} / night
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {config && config.amenities.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-ink">
            <Package className="h-5 w-5 text-vermilion" /> Additional facilities
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <span className="font-medium text-ink">{amenity.name}</span>
                <span className="text-sm text-zinc-600">
                  &#8377;{amenity.price} {PRICING_LABEL[amenity.pricing_type]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="rounded-2xl bg-zinc-50 p-6 text-center">
        <p className="text-zinc-700">
          Ready to enquire? Availability and pricing depend on the dates you choose.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/bhavan/booking"
            className="rounded-full bg-vermilion px-6 py-2.5 font-semibold text-white"
          >
            Start an enquiry
          </Link>
          <Link
            href="/bhavan/terms-and-conditions"
            className="rounded-full border border-zinc-300 px-6 py-2.5 font-medium text-ink"
          >
            Terms &amp; Conditions
          </Link>
          {config?.contact_phone && (
            <a
              href={`tel:${config.contact_phone}`}
              className="flex items-center gap-2 text-zinc-600"
            >
              <Phone className="h-4 w-4" /> {config.contact_phone}
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Write the Terms page**

Create `frontend/src/app/(public)/bhavan/terms-and-conditions/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fetchTerms, type Terms } from "@/utils/bhavan";

export default function BhavanTermsPage() {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTerms()
      .then(setTerms)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/bhavan/booking"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to booking
      </Link>

      <h1 className="display text-3xl font-bold text-ink">Terms &amp; Conditions</h1>

      {isLoading ? (
        <Loader2 className="mt-8 h-6 w-6 animate-spin text-vermilion" />
      ) : terms ? (
        <>
          <p className="mt-1 text-sm text-zinc-500">Version {terms.version_label}</p>
          <article className="prose prose-zinc mt-6 max-w-none">
            <ReactMarkdown>{terms.content}</ReactMarkdown>
          </article>
        </>
      ) : (
        <p className="mt-8 text-zinc-600">
          Terms &amp; Conditions have not been published yet. Please contact the
          office for details.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add the navigation entry**

In `frontend/src/components/layout/Navbar.tsx`, add `Building2` to the `lucide-react` import and insert into the nav array after the Events entry (line 19):

```tsx
  { name: "Bhavan", href: "/bhavan", icon: Building2 },
```

In `frontend/src/components/layout/Footer.tsx`, add a `/bhavan` link alongside the existing quick links, matching their markup.

- [ ] **Step 4: Verify the pages render**

Run: `cd frontend && npm run build`
Expected: build succeeds with no type errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/\(public\)/bhavan/ frontend/src/components/layout/Navbar.tsx frontend/src/components/layout/Footer.tsx
git commit -m "feat(bhavan): add public landing and terms pages"
```

---

### Task 18: Booking stepper

**Files:**
- Create: `frontend/src/app/(public)/bhavan/booking/page.tsx`, `frontend/src/app/(public)/bhavan/enquiry/success/page.tsx`
- Create: `frontend/src/components/bhavan/StepIndicator.tsx`, `frontend/src/components/bhavan/QuoteSummary.tsx`, `frontend/src/components/bhavan/QuantityPicker.tsx`

**Interfaces:**
- Consumes: everything from Task 16, `mediaUrl`
- Produces: routes `/bhavan/booking` and `/bhavan/enquiry/success`

- [ ] **Step 1: Write the shared components**

Create `frontend/src/components/bhavan/StepIndicator.tsx`:

```tsx
"use client";

import { Check } from "lucide-react";
import { STEPS, type StepId } from "@/utils/bhavanBooking";

export function StepIndicator({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isDone
                  ? "bg-vermilion text-white"
                  : isCurrent
                    ? "border-2 border-vermilion text-vermilion"
                    : "border border-zinc-300 text-zinc-400"
              }`}
            >
              {isDone ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                isCurrent ? "font-semibold text-ink" : "text-zinc-500"
              }`}
            >
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <span className="mx-1 h-px w-4 bg-zinc-300 sm:w-6" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

Create `frontend/src/components/bhavan/QuantityPicker.tsx`:

```tsx
"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityPicker({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
```

Create `frontend/src/components/bhavan/QuoteSummary.tsx`:

```tsx
"use client";

import { AlertCircle, Info } from "lucide-react";
import type { Quote } from "@/utils/bhavan";

export function QuoteSummary({ quote }: { quote: Quote | null }) {
  if (!quote) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
        Select your dates to see an estimate.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="font-semibold text-ink">Your enquiry</h3>
      <p className="mt-1 text-sm text-zinc-500">
        {quote.check_in} &rarr; {quote.check_out} &middot; {quote.nights} nights
      </p>

      {quote.lines.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
          {quote.lines.map((line, index) => (
            <li key={`${line.label}-${index}`} className="flex justify-between gap-3 text-sm">
              <span className="text-zinc-700">
                {line.label}
                <span className="ml-1 text-zinc-400">{line.detail}</span>
              </span>
              <span className="shrink-0 tabular-nums text-ink">
                &#8377;{line.total}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-zinc-100 pt-4">
        <span className="font-semibold text-ink">Estimated Booking Amount</span>
        <span className="text-xl font-bold tabular-nums text-vermilion">
          &#8377;{quote.estimated_total}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        This is an estimate for an enquiry, not a confirmed booking or a final price.
      </p>

      {quote.notices.map((notice) => (
        <p key={notice} className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
        </p>
      ))}

      {quote.blockers.map((blocker) => (
        <p key={blocker} className="mt-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {blocker}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write the booking page**

Create `frontend/src/app/(public)/bhavan/booking/page.tsx`. It renders the six steps against `bookingReducer`, re-fetching the quote whenever the selection changes:

```tsx
"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { QuantityPicker } from "@/components/bhavan/QuantityPicker";
import { QuoteSummary } from "@/components/bhavan/QuoteSummary";
import { StepIndicator } from "@/components/bhavan/StepIndicator";
import {
  apiErrorMessage, fetchAvailability, fetchConfig, fetchQuote, requestOtp,
  submitEnquiry, verifyOtp, type Availability, type BhavanConfig,
} from "@/utils/bhavan";
import {
  bookingReducer, canAdvance, initialBookingState, nightsBetween, STEPS,
  totalGuests, type StepId,
} from "@/utils/bhavanBooking";

const today = () => new Date().toISOString().slice(0, 10);

export default function BhavanBookingPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
  const [config, setConfig] = useState<BhavanConfig | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpStatus, setOtpStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => setError("Could not load booking options."));
  }, []);

  const nights = nightsBetween(state.checkIn, state.checkOut);

  // Refresh availability whenever the dates or purpose change.
  useEffect(() => {
    if (nights <= 0) {
      setAvailability(null);
      return;
    }
    fetchAvailability({
      check_in: state.checkIn,
      check_out: state.checkOut,
      purpose_id: state.purposeId,
    })
      .then(setAvailability)
      .catch(() => setAvailability(null));
  }, [state.checkIn, state.checkOut, state.purposeId, nights]);

  // Refresh the estimate whenever the selection changes.
  const refreshQuote = useCallback(async () => {
    if (nights <= 0) return;
    try {
      const quote = await fetchQuote({
        check_in: state.checkIn,
        check_out: state.checkOut,
        accommodation: state.accommodation,
        amenities: state.amenities,
        guests_total: totalGuests(state),
        purpose_id: state.purposeId,
      });
      dispatch({ type: "SET_QUOTE", quote });
    } catch {
      dispatch({ type: "SET_QUOTE", quote: null });
    }
  }, [state, nights]);

  useEffect(() => {
    void refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.checkIn, state.checkOut, state.purposeId, state.accommodation,
      state.amenities, state.customer.adults, state.customer.children]);

  const stepIndex = STEPS.findIndex((s) => s.id === state.step);
  const goTo = (step: StepId) => {
    setError(null);
    dispatch({ type: "SET_STEP", step });
  };
  const next = () => stepIndex < STEPS.length - 1 && goTo(STEPS[stepIndex + 1].id);
  const back = () => stepIndex > 0 && goTo(STEPS[stepIndex - 1].id);

  const handleSendOtp = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await requestOtp(state.customer.mobile);
      setOtpStatus(result.message);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send the verification code."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await verifyOtp(state.customer.mobile, otpCode);
      dispatch({ type: "SET_VERIFICATION_TOKEN", token: result.verification_token });
      setOtpStatus("Mobile number verified.");
    } catch (err) {
      setError(apiErrorMessage(err, "That code was not correct."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await submitEnquiry({
        check_in: state.checkIn,
        check_out: state.checkOut,
        accommodation: state.accommodation,
        amenities: state.amenities,
        purpose_id: state.purposeId,
        ...state.customer,
        guests_total: totalGuests(state),
        verification_token: state.verificationToken,
        terms_accepted: state.termsAccepted,
      });
      router.push(
        `/bhavan/enquiry/success?reference=${encodeURIComponent(result.reference)}` +
        `&total=${encodeURIComponent(result.estimated_total)}`,
      );
    } catch (err) {
      setError(apiErrorMessage(err, "We could not submit your enquiry."));
    } finally {
      setIsBusy(false);
    }
  };

  const setField = (field: keyof typeof state.customer, value: string | number) =>
    dispatch({ type: "SET_CUSTOMER_FIELD", field, value });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="display mb-2 text-3xl font-bold text-ink">Bhavan Booking Enquiry</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Submitting this form sends an enquiry to our team. It does not confirm a booking.
      </p>

      <StepIndicator current={state.step} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          {state.step === "dates" && (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold text-ink">When and what for?</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">Check-in</span>
                  <input
                    type="date" min={today()} value={state.checkIn}
                    onChange={(e) => dispatch({
                      type: "SET_DATES", checkIn: e.target.value, checkOut: state.checkOut,
                    })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">Check-out</span>
                  <input
                    type="date" min={state.checkIn || today()} value={state.checkOut}
                    onChange={(e) => dispatch({
                      type: "SET_DATES", checkIn: state.checkIn, checkOut: e.target.value,
                    })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>
              </div>
              {nights > 0 && (
                <p className="text-sm text-zinc-500">{nights} nights selected.</p>
              )}
              <div>
                <span className="mb-2 block text-sm font-medium text-zinc-700">
                  Purpose of booking
                </span>
                <div className="flex flex-wrap gap-2">
                  {config?.purposes.map((purpose) => {
                    const allowed =
                      !availability || availability.allowed_purpose_ids.includes(purpose.id);
                    return (
                      <button
                        key={purpose.id} type="button" disabled={!allowed}
                        onClick={() => dispatch({ type: "SET_PURPOSE", purposeId: purpose.id })}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          state.purposeId === purpose.id
                            ? "border-vermilion bg-vermilion text-white"
                            : "border-zinc-300 text-zinc-700 disabled:opacity-40"
                        }`}
                      >
                        {purpose.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {state.step === "accommodation" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">Choose accommodation</h2>
              {availability?.accommodation.length ? (
                availability.accommodation.map((entry) => (
                  <div key={entry.id}
                       className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                    <div>
                      <p className="font-medium text-ink">{entry.name}</p>
                      <p className="text-sm text-zinc-500">
                        Holds {entry.capacity_per_unit} &middot; {entry.available} available
                        &middot; &#8377;{entry.price_per_night} / night
                      </p>
                    </div>
                    <QuantityPicker
                      label={entry.name}
                      value={state.accommodation[entry.id] ?? 0}
                      max={entry.available}
                      onChange={(quantity) => dispatch({
                        type: "SET_ACCOMMODATION", id: entry.id, quantity,
                      })}
                    />
                  </div>
                ))
              ) : (
                <p className="text-zinc-600">
                  No accommodation is available for the selected dates.
                </p>
              )}
            </section>
          )}

          {state.step === "amenities" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">Additional facilities</h2>
              <p className="text-sm text-zinc-500">Optional — you can skip this step.</p>
              {config?.amenities
                .filter((a) => !availability || availability.available_amenity_ids.includes(a.id))
                .map((amenity) => (
                  <div key={amenity.id}
                       className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                    <div>
                      <p className="font-medium text-ink">{amenity.name}</p>
                      <p className="text-sm text-zinc-500">
                        &#8377;{amenity.price} {amenity.pricing_type.replace("_", " ")}
                        {amenity.available_quantity !== null &&
                          ` · ${amenity.available_quantity} available`}
                      </p>
                    </div>
                    <QuantityPicker
                      label={amenity.name}
                      value={state.amenities[amenity.id] ?? 0}
                      max={amenity.available_quantity ?? 999}
                      onChange={(quantity) => dispatch({
                        type: "SET_AMENITY", id: amenity.id, quantity,
                      })}
                    />
                  </div>
                ))}
            </section>
          )}

          {state.step === "details" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">Your details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required value={state.customer.full_name}
                       onChange={(v) => setField("full_name", v)} />
                <Field label="Mobile number" required value={state.customer.mobile}
                       onChange={(v) => setField("mobile", v)} />
                <Field label="WhatsApp number" value={state.customer.whatsapp_number}
                       onChange={(v) => setField("whatsapp_number", v)} />
                <Field label="Email" type="email" value={state.customer.email}
                       onChange={(v) => setField("email", v)} />
                <Field label="City" value={state.customer.city}
                       onChange={(v) => setField("city", v)} />
                <Field label="State" value={state.customer.state}
                       onChange={(v) => setField("state", v)} />
                <Field label="Adults" type="number" value={String(state.customer.adults)}
                       onChange={(v) => setField("adults", Number(v) || 0)} />
                <Field label="Children" type="number" value={String(state.customer.children)}
                       onChange={(v) => setField("children", Number(v) || 0)} />
              </div>
              <Field label="Address" value={state.customer.address}
                     onChange={(v) => setField("address", v)} />
              <Field label="Special requirements" value={state.customer.special_requirements}
                     onChange={(v) => setField("special_requirements", v)} />
            </section>
          )}

          {state.step === "verify" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">Verify your mobile number</h2>
              <p className="text-sm text-zinc-600">
                We will send a code to <strong>{state.customer.mobile}</strong> on WhatsApp.
              </p>
              {state.verificationToken ? (
                <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-800">
                  <ShieldCheck className="h-5 w-5" /> Mobile number verified.
                </p>
              ) : (
                <>
                  <button type="button" onClick={handleSendOtp} disabled={isBusy}
                          className="rounded-full bg-vermilion px-5 py-2.5 font-semibold text-white disabled:opacity-60">
                    {isBusy ? "Sending…" : "Send code"}
                  </button>
                  {otpStatus && <p className="text-sm text-zinc-600">{otpStatus}</p>}
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-zinc-700">
                        Enter code
                      </span>
                      <input value={otpCode} inputMode="numeric" maxLength={6}
                             onChange={(e) => setOtpCode(e.target.value)}
                             className="w-40 rounded-lg border border-zinc-300 px-3 py-2 tracking-widest" />
                    </label>
                    <button type="button" onClick={handleVerifyOtp}
                            disabled={isBusy || otpCode.length < 4}
                            className="rounded-full border border-zinc-300 px-5 py-2.5 font-medium disabled:opacity-50">
                      Verify
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {state.step === "review" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">Review and submit</h2>
              <dl className="grid gap-2 text-sm">
                <Row label="Name" value={state.customer.full_name} />
                <Row label="Mobile" value={state.customer.mobile} />
                <Row label="Dates" value={`${state.checkIn} → ${state.checkOut}`} />
                <Row label="Guests" value={String(totalGuests(state))} />
              </dl>

              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4">
                <input type="checkbox" checked={state.termsAccepted} className="mt-1"
                       onChange={(e) => dispatch({
                         type: "SET_TERMS_ACCEPTED", accepted: e.target.checked,
                       })} />
                <span className="text-sm text-zinc-700">
                  I have read and agree to the{" "}
                  <Link href="/bhavan/terms-and-conditions" target="_blank"
                        className="inline-flex items-center gap-1 font-medium text-vermilion underline">
                    Terms &amp; Conditions <ExternalLink className="h-3 w-3" />
                  </Link>
                </span>
              </label>

              <button type="button" onClick={handleSubmit}
                      disabled={isBusy || !canAdvance(state, "review")}
                      className="flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-white disabled:opacity-50">
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />} Submit enquiry
              </button>
            </section>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>
          )}

          <div className="mt-8 flex justify-between border-t border-zinc-100 pt-6">
            <button type="button" onClick={back} disabled={stepIndex === 0}
                    className="flex items-center gap-2 text-zinc-600 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {state.step !== "review" && (
              <button type="button" onClick={next} disabled={!canAdvance(state, state.step)}
                      className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-white disabled:opacity-40">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <QuoteSummary quote={state.quote} />
        </aside>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">
        {label}{required && <span className="text-vermilion"> *</span>}
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
             className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-zinc-100 py-1.5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Write the success page**

Create `frontend/src/app/(public)/bhavan/enquiry/success/page.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const total = params.get("total") ?? "";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
      <h1 className="display mt-4 text-3xl font-bold text-ink">Enquiry received</h1>
      <p className="mt-2 text-zinc-600">
        Thank you. Our team will contact you to confirm availability and next steps.
      </p>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-500">Your reference number</p>
        <p className="mt-1 text-2xl font-bold tracking-wide text-ink">{reference}</p>
        {total && (
          <p className="mt-4 text-sm text-zinc-600">
            Estimated Booking Amount: <strong>&#8377;{total}</strong>
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        This is an enquiry, not a confirmed booking. Please quote your reference
        number when you contact the office.
      </p>

      <Link href="/bhavan"
            className="mt-8 inline-block rounded-full bg-vermilion px-6 py-3 font-semibold text-white">
        Back to Bhavan
      </Link>
    </div>
  );
}

export default function BhavanEnquirySuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build && npm test`
Expected: build succeeds, all tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/\(public\)/bhavan/ frontend/src/components/bhavan/
git commit -m "feat(bhavan): add public booking stepper and success page"
```

---

# Phase 7 — Admin frontend

### Task 19: Admin shell, navigation and overview

**Files:**
- Create: `frontend/src/utils/bhavanAdmin.ts`, `frontend/src/app/admin/bhavan/page.tsx`
- Modify: `frontend/src/app/admin/layout.tsx:106-129`

**Interfaces:**
- Produces: `adminGet`, `adminPost`, `adminPut`, `adminPatch`, `adminDelete`, `adminUpload` in `bhavanAdmin.ts`; route `/admin/bhavan`

- [ ] **Step 1: Write the admin API helper**

Create `frontend/src/utils/bhavanAdmin.ts`:

```typescript
/**
 * Authenticated Bhavan admin API helpers.
 *
 * The token lives in localStorage under "token", matching every other admin
 * page in this app.
 */
import axios from "axios";
import { getApiBaseUrl } from "./api";

const base = () => `${getApiBaseUrl()}/admin/bhavan`;

function authHeaders() {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export async function adminGet<T>(path: string): Promise<T> {
  return (await axios.get(`${base()}${path}`, { headers: authHeaders() })).data;
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  return (await axios.post(`${base()}${path}`, body ?? {}, { headers: authHeaders() })).data;
}

export async function adminPut<T>(path: string, body: unknown): Promise<T> {
  return (await axios.put(`${base()}${path}`, body, { headers: authHeaders() })).data;
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  return (await axios.patch(`${base()}${path}`, body, { headers: authHeaders() })).data;
}

/** DELETE with a body — used by the remove-dates endpoint. */
export async function adminDelete<T>(path: string, body?: unknown): Promise<T> {
  return (await axios.delete(`${base()}${path}`, {
    headers: authHeaders(), data: body,
  })).data;
}

export async function adminUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return (await axios.post(`${base()}${path}`, form, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  })).data;
}
```

- [ ] **Step 2: Add the sidebar entries**

In `frontend/src/app/admin/layout.tsx`, add `Building2`, `CalendarDays`, `ScrollText` to the `lucide-react` import, then insert into `managementItems` after the Donations block:

```tsx
    ...((isSuperAdmin || isAdmin || hasPermission("manage_bhavan")) ? [
      { name: "Bhavan Overview", href: "/admin/bhavan", icon: Building2 },
      { name: "Bhavan Enquiries", href: "/admin/bhavan/enquiries", icon: ScrollText },
      { name: "Bhavan Calendar", href: "/admin/bhavan/calendar", icon: CalendarDays },
    ] : []),
```

Note: `manage_bhavan` is already a valid key in `ALLOWED_PERMISSIONS` (`backend/app/routers/role.py:16`), so no backend change is needed.

- [ ] **Step 3: Write the overview page**

Create `frontend/src/app/admin/bhavan/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BedDouble, CalendarDays, ClipboardList, Loader2, Package, ScrollText,
  Settings, ShieldCheck, Wrench,
} from "lucide-react";
import { adminGet } from "@/utils/bhavanAdmin";

interface Overview {
  pending_enquiries: number;
  under_review_enquiries: number;
  approved_enquiries: number;
  todays_enquiries: number;
  upcoming_enquiries: number;
  total_units: number;
  units_in_maintenance: number;
  active_rule_assignments: number;
  blocked_dates_next_90: number;
  estimated_approved_value: string;
}

const LINKS = [
  { href: "/admin/bhavan/enquiries", label: "Enquiries", icon: ClipboardList },
  { href: "/admin/bhavan/calendar", label: "Availability Calendar", icon: CalendarDays },
  { href: "/admin/bhavan/accommodation", label: "Accommodation", icon: BedDouble },
  { href: "/admin/bhavan/amenities", label: "Amenities", icon: Package },
  { href: "/admin/bhavan/rules", label: "Rules", icon: ShieldCheck },
  { href: "/admin/bhavan/terms", label: "Terms & Conditions", icon: ScrollText },
  { href: "/admin/bhavan/settings", label: "Settings", icon: Settings },
  { href: "/admin/bhavan/audit-log", label: "Audit Log", icon: Wrench },
];

export default function AdminBhavanOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminGet<Overview>("/overview")
      .then(setOverview)
      .catch((error) => console.error("Failed to load Bhavan overview", error))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <Loader2 className="m-12 h-8 w-8 animate-spin text-vermilion" />;
  }

  const stats = overview
    ? [
        { label: "Pending enquiries", value: overview.pending_enquiries, tone: "amber" },
        { label: "Under review", value: overview.under_review_enquiries, tone: "blue" },
        { label: "Approved", value: overview.approved_enquiries, tone: "green" },
        { label: "Today's enquiries", value: overview.todays_enquiries, tone: "zinc" },
        { label: "Upcoming", value: overview.upcoming_enquiries, tone: "zinc" },
        { label: "Bookable units", value: overview.total_units, tone: "zinc" },
        { label: "In maintenance", value: overview.units_in_maintenance, tone: "red" },
        { label: "Active rules", value: overview.active_rule_assignments, tone: "zinc" },
        { label: "Blocked dates (90d)", value: overview.blocked_dates_next_90, tone: "red" },
      ]
    : [];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-ink">Bhavan Overview</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{stat.value}</p>
          </div>
        ))}
        {overview && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">Approved enquiry value</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
              &#8377;{overview.estimated_approved_value}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-vermilion">
            <link.icon className="h-5 w-5 text-vermilion" />
            <span className="font-medium text-ink">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/bhavanAdmin.ts frontend/src/app/admin/bhavan/page.tsx frontend/src/app/admin/layout.tsx
git commit -m "feat(bhavan): add admin overview page and navigation"
```

---

### Task 20: Multi-date picker component

The interaction the rule system depends on. Built and tested on its own before any page uses it.

**Files:**
- Create: `frontend/src/components/bhavan/MultiDatePicker.tsx`, `frontend/src/utils/bhavanDates.ts`
- Test: `frontend/src/utils/bhavanDates.test.ts`

**Interfaces:**
- Produces: `toISO(date)`, `monthGrid(year, month)`, `expandRange(start, end)`, `toggleDate(selected, iso)`, `groupIntoRanges(dates)`; component `MultiDatePicker`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/bhavanDates.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { expandRange, groupIntoRanges, monthGrid, toISO, toggleDate } from "./bhavanDates";

describe("expandRange", () => {
  it("includes both endpoints", () => {
    expect(expandRange("2027-02-02", "2027-02-05")).toEqual([
      "2027-02-02", "2027-02-03", "2027-02-04", "2027-02-05",
    ]);
  });

  it("handles a single-day range", () => {
    expect(expandRange("2027-02-02", "2027-02-02")).toEqual(["2027-02-02"]);
  });

  it("swaps reversed endpoints rather than returning nothing", () => {
    expect(expandRange("2027-02-05", "2027-02-02")).toHaveLength(4);
  });

  it("crosses a month boundary", () => {
    expect(expandRange("2027-01-30", "2027-02-02")).toEqual([
      "2027-01-30", "2027-01-31", "2027-02-01", "2027-02-02",
    ]);
  });
});

describe("toggleDate", () => {
  it("adds a date that is not selected", () => {
    expect(toggleDate(["2027-01-05"], "2027-01-06")).toEqual(["2027-01-05", "2027-01-06"]);
  });

  it("removes a date that is already selected", () => {
    expect(toggleDate(["2027-01-05", "2027-01-06"], "2027-01-05")).toEqual(["2027-01-06"]);
  });

  it("keeps the result sorted", () => {
    expect(toggleDate(["2027-01-06"], "2027-01-05")).toEqual(["2027-01-05", "2027-01-06"]);
  });
});

describe("groupIntoRanges", () => {
  it("collapses consecutive dates and keeps singles separate", () => {
    expect(groupIntoRanges([
      "2027-01-05", "2027-01-12", "2027-01-13", "2027-01-14", "2027-02-15",
    ])).toEqual([
      { start: "2027-01-05", end: "2027-01-05" },
      { start: "2027-01-12", end: "2027-01-14" },
      { start: "2027-02-15", end: "2027-02-15" },
    ]);
  });

  it("returns nothing for an empty selection", () => {
    expect(groupIntoRanges([])).toEqual([]);
  });

  it("joins a run across a month boundary", () => {
    expect(groupIntoRanges(["2027-01-31", "2027-02-01"])).toEqual([
      { start: "2027-01-31", end: "2027-02-01" },
    ]);
  });
});

describe("monthGrid", () => {
  it("pads to whole weeks starting on Monday", () => {
    const grid = monthGrid(2027, 1);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter((cell) => cell !== null)).toHaveLength(31);
  });

  it("puts the first day in the right weekday slot", () => {
    // 1 Feb 2027 is a Monday, so it must be the first cell.
    expect(monthGrid(2027, 2)[0]).toBe("2027-02-01");
  });
});

describe("toISO", () => {
  it("formats without drifting across a timezone boundary", () => {
    expect(toISO(new Date(2027, 0, 5))).toBe("2027-01-05");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/utils/bhavanDates.test.ts`
Expected: FAIL — cannot resolve `./bhavanDates`

- [ ] **Step 3: Write the date helpers**

Create `frontend/src/utils/bhavanDates.ts`:

```typescript
/**
 * Calendar maths for the admin rule date picker.
 *
 * Everything is handled as a "YYYY-MM-DD" string built from local date parts.
 * Using toISOString() here would shift the day backwards for anyone east of
 * UTC, which includes every user of this application.
 */

export interface DateRange {
  start: string;
  end: string;
}

export function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function expandRange(start: string, end: string): string[] {
  const [from, to] = start <= end ? [start, end] : [end, start];
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function toggleDate(selected: string[], iso: string): string[] {
  const next = selected.includes(iso)
    ? selected.filter((d) => d !== iso)
    : [...selected, iso];
  return next.sort();
}

export function addDates(selected: string[], incoming: string[]): string[] {
  return Array.from(new Set([...selected, ...incoming])).sort();
}

export function removeDates(selected: string[], outgoing: string[]): string[] {
  const drop = new Set(outgoing);
  return selected.filter((d) => !drop.has(d));
}

/** Collapse a sorted date list into contiguous ranges for compact display. */
export function groupIntoRanges(dates: string[]): DateRange[] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const ranges: DateRange[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (const current of sorted.slice(1)) {
    if (current === addDays(previous, 1)) {
      previous = current;
      continue;
    }
    ranges.push({ start, end: previous });
    start = current;
    previous = current;
  }
  ranges.push({ start, end: previous });
  return ranges;
}

/**
 * A month as whole weeks starting Monday. Null cells are the leading and
 * trailing padding days.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay() is 0 for Sunday; shift so Monday is 0.
  const leading = (first.getDay() + 6) % 7;

  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISO(new Date(year, month - 1, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
```

- [ ] **Step 4: Write the picker component**

Create `frontend/src/components/bhavan/MultiDatePicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  addDates, expandRange, groupIntoRanges, monthGrid, removeDates, toggleDate,
} from "@/utils/bhavanDates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Click a day to toggle it; click one day then shift-click another to select
 * the whole range. Selections may be disjoint, which is the point — one rule
 * covers thirty scattered wedding dates.
 */
export function MultiDatePicker({
  selected,
  onChange,
  highlighted = {},
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
  highlighted?: Record<string, string>;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [anchor, setAnchor] = useState<string | null>(null);

  const step = (delta: number) => {
    const next = month + delta;
    if (next < 1) {
      setMonth(12);
      setYear(year - 1);
    } else if (next > 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(next);
    }
  };

  const handleClick = (iso: string, shiftKey: boolean) => {
    if (shiftKey && anchor) {
      onChange(addDates(selected, expandRange(anchor, iso)));
      setAnchor(null);
      return;
    }
    setAnchor(iso);
    onChange(toggleDate(selected, iso));
  };

  const ranges = groupIntoRanges(selected);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} aria-label="Previous month"
                className="rounded p-1 hover:bg-zinc-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-ink">{MONTHS[month - 1]} {year}</span>
        <button type="button" onClick={() => step(1)} aria-label="Next month"
                className="rounded p-1 hover:bg-zinc-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(year, month).map((iso, index) => {
          if (iso === null) return <span key={`pad-${index}`} />;
          const isSelected = selected.includes(iso);
          const note = highlighted[iso];
          return (
            <button
              key={iso}
              type="button"
              title={note}
              onClick={(event) => handleClick(iso, event.shiftKey)}
              className={`aspect-square rounded-lg text-sm transition ${
                isSelected
                  ? "bg-vermilion font-semibold text-white"
                  : note
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "hover:bg-zinc-100"
              }`}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Click to toggle a date. Shift-click to select a range.
      </p>

      {ranges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
          {ranges.map((range) => {
            const label = range.start === range.end
              ? range.start
              : `${range.start} → ${range.end}`;
            return (
              <span key={label}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                {label}
                <button type="button" aria-label={`Remove ${label}`}
                        onClick={() => onChange(
                          removeDates(selected, expandRange(range.start, range.end)),
                        )}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <span className="px-2 py-1 text-xs font-medium text-zinc-500">
            {selected.length} dates selected
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- src/utils/bhavanDates.test.ts`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/bhavanDates.ts frontend/src/utils/bhavanDates.test.ts frontend/src/components/bhavan/MultiDatePicker.tsx
git commit -m "feat(bhavan): add multi-date picker for rule assignment"
```

---

### Task 21: Admin inventory pages

**Files:**
- Create: `frontend/src/app/admin/bhavan/accommodation/page.tsx`, `frontend/src/app/admin/bhavan/amenities/page.tsx`, `frontend/src/app/admin/bhavan/settings/page.tsx`

**Interfaces:**
- Consumes: `adminGet/Post/Put/Patch/Delete/Upload` (Task 19), `mediaUrl`
- Produces: routes `/admin/bhavan/accommodation`, `/amenities`, `/settings`

- [ ] **Step 1: Build the accommodation page**

Create `frontend/src/app/admin/bhavan/accommodation/page.tsx` with:

- A list of accommodation types showing name, kind, capacity, base price, and `available_units` / `total_units`.
- A create/edit form posting to `POST /accommodation-types` and `PUT /accommodation-types/{id}` with fields `name`, `kind` (`room` | `dormitory`), `description`, `capacity_per_unit`, `base_price_per_night`, `sort_order`, `is_active`.
- An **image uploader** per type: a `<input type="file" accept="image/*">` whose `onChange` calls
  `adminUpload(`/accommodation-types/${id}/images`, file)`, then re-fetches the list. Existing images render via `mediaUrl(image.path)` with a delete button calling `adminDelete(`/images/${imageId}`)`. There is no URL text field anywhere on this page — images are uploaded only.
- A units panel per type listing units with their status, a status `<select>` (`available` / `maintenance` / `inactive`) calling `adminPatch(`/units/${unitId}`, { status })`, a single-unit add form, and a **bulk add** form posting `{ prefix, start, count }` to `/accommodation-types/{id}/units/bulk`.
- After every mutation, re-fetch so `available_units` reflects maintenance changes immediately.

- [ ] **Step 2: Build the amenities page**

Create `frontend/src/app/admin/bhavan/amenities/page.tsx` with a table of amenities and a create/edit form. The `pricing_type` control is a `<select>` with all five options and a worked example rendered beneath it so the per-day / per-night difference is explicit:

```tsx
const PRICING_HELP: Record<string, string> = {
  per_unit: "Charged once per item. 50 chairs × ₹10 = ₹500.",
  per_day: "Charged per calendar day of the stay, including departure day. A 2-night stay is 3 days.",
  per_night: "Charged per night. A 2-night stay is 2 nights.",
  per_booking: "A single charge for the whole booking, regardless of quantity.",
  one_time: "A single fixed charge, regardless of quantity or length of stay.",
};
```

Include `available_quantity` (blank means unlimited), `allow_over_request`, `is_active`, `sort_order`, and an image upload calling `adminUpload(`/amenities/${id}/image`, file)`.

- [ ] **Step 3: Build the settings page**

Create `frontend/src/app/admin/bhavan/settings/page.tsx` loading `GET /settings` and saving with `PUT /settings`: `default_min_nights`, `default_max_nights`, `advance_booking_days`, `otp_ttl_seconds`, `otp_resend_cooldown_seconds`, `otp_max_attempts`, `contact_phone`, `intro_text`, plus a checkbox per key in `required_fields`.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/bhavan/accommodation frontend/src/app/admin/bhavan/amenities frontend/src/app/admin/bhavan/settings
git commit -m "feat(bhavan): add admin inventory and settings pages"
```

---

### Task 22: Admin rules and calendar pages

**Files:**
- Create: `frontend/src/app/admin/bhavan/rules/page.tsx`, `frontend/src/app/admin/bhavan/rules/create/page.tsx`, `frontend/src/app/admin/bhavan/calendar/page.tsx`

**Interfaces:**
- Consumes: `MultiDatePicker` (Task 20), admin API helpers
- Produces: routes `/admin/bhavan/rules`, `/rules/create`, `/calendar`

- [ ] **Step 1: Build the rules list**

Create `frontend/src/app/admin/bhavan/rules/page.tsx` showing two tables:

- **Rule profiles** — name, category, status, template flag, with Edit and "Duplicate" (posting `{name}` to `/rule-profiles/{id}/duplicate`) actions and a "Create rule" link to `/admin/bhavan/rules/create`.
- **Applied date sets** — from `GET /rule-assignments`, showing label, profile name, `date_count`, `applied_at`, and a Revoke button posting to `/rule-assignments/{id}/revoke`. A toggle switches to `?include_revoked=true` so history stays visible.

- [ ] **Step 2: Build the rule creation page**

Create `frontend/src/app/admin/bhavan/rules/create/page.tsx`. It builds a `RuleConfig` object and posts it, then applies it to dates. The form maps one-to-one onto the config schema:

- **Start from**: blank, or a template selected from `GET /rule-profiles?include_templates=true` (duplicates its config into the form).
- **Name**, **category** (`event` / `pricing` / `discount` / `closure` / `custom`), **description**.
- **Availability**: a "Close the Bhavan entirely" checkbox setting `availability.closed`; a three-way control per accommodation type writing `"allowed"`, `"blocked"`, or omitting the key entirely, with the omitted state labelled **"No change"** so the admin can see that a rule may decline to have an opinion; the same for amenities; and `default_accommodation` as a "types not listed" selector offering No change / Allowed / Blocked.
- **Pricing**: `mode` select, `value` number, `conflict_behaviour` radio with the two options spelled out — *"Recalculate from the base price"* (`replace_base`) and *"Apply on top of the current price"* (`adjust_current`) — plus optional per-type overrides.
- **Conditions**: number inputs for the seven condition fields, blank meaning "no opinion".
- **Purposes**: `default` selector plus allow/block checkboxes per purpose.
- **Public message**: free text, with the caption *"The only rule text a customer can see. Leave blank to show nothing."*
- **Dates**: the `MultiDatePicker` from Task 20, plus a **label** field defaulting to the rule name (this is the date-set name, e.g. "Wedding Dates 2027").

On save it calls `adminPost("/rule-profiles", {...})` then `adminPost("/rule-assignments", { profile_id, label, dates })`, and redirects to `/admin/bhavan/rules`. A 422 response renders the returned Pydantic errors inline against their fields.

- [ ] **Step 3: Build the calendar page**

Create `frontend/src/app/admin/bhavan/calendar/page.tsx`:

- Month navigation calling `GET /calendar?year=&month=`.
- A month grid colouring each day by `status`: `open` neutral, `restricted` amber, `closed` red, with the `effective_rule` label and `enquiry_count` shown in the cell.
- Clicking a day calls `GET /calendar/{date}` and opens a side panel titled **"Why this date behaves this way"**, listing each layer oldest-first with its label, profile name, `applied_at`, who applied it, and a "Wins" badge on the final entry; below that, the resolved accommodation table (name, allowed, price, available) and the effective conditions.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/bhavan/rules frontend/src/app/admin/bhavan/calendar
git commit -m "feat(bhavan): add admin rule management and availability calendar"
```

---

### Task 23: Admin enquiries, terms and audit pages

**Files:**
- Create: `frontend/src/app/admin/bhavan/enquiries/page.tsx`, `frontend/src/app/admin/bhavan/terms/page.tsx`, `frontend/src/app/admin/bhavan/audit-log/page.tsx`

**Interfaces:**
- Produces: routes `/admin/bhavan/enquiries`, `/terms`, `/audit-log`

- [ ] **Step 1: Build the enquiries page**

Create `frontend/src/app/admin/bhavan/enquiries/page.tsx`:

- Filter bar: status `<select>` (all seven statuses), search box (reference, name, mobile), `from_date` / `to_date`, feeding `GET /enquiries` with pagination from `{ total, page, per_page }`.
- Table: reference, name, mobile, dates, nights, purpose, status badge, source badge, estimated total.
- Clicking a row opens a detail drawer from `GET /enquiries/{id}` showing customer details, the accommodation and amenity snapshot lines, the quote snapshot totals, terms version and acceptance time, and the internal notes thread.
- **Approve / Reject / Under review / Cancel** buttons posting to `/enquiries/{id}/status`, placed **below** the detail content rather than at the top (matching `changes.txt` item 9). Rejecting prompts for a reason and sends it as `reason`. A 409 response renders its message inline — that is the capacity check refusing to overbook.
- A notes box posting to `/enquiries/{id}/notes`.
- A "Create manual enquiry" modal posting to `/enquiries/manual` with a `source` selector (`phone` / `walk_in` / `admin`), warning that a manual enquiry is created as approved and will hold inventory immediately.

- [ ] **Step 2: Build the terms page**

Create `frontend/src/app/admin/bhavan/terms/page.tsx`:

- Version list from `GET /terms` newest first, with the published one badged.
- A markdown editor for new versions reusing `@uiw/react-md-editor` (already a dependency, used by the blog editor), posting to `POST /terms`.
- Edit is available only on unpublished versions; the published one shows the message *"Published versions cannot be edited. Create a new version instead."* because past enquiries reference the exact text that was accepted.
- Preview rendered with `react-markdown`, and a Publish button posting to `/terms/{id}/publish` behind a confirmation.

- [ ] **Step 3: Build the audit log page**

Create `frontend/src/app/admin/bhavan/audit-log/page.tsx` rendering `GET /audit-log` as a reverse-chronological list: timestamp, admin name, a human phrasing of `action` + `target_table` (for example *"Admin User updated an amenity"*), and an expandable diff of `old_value` / `new_value` shown as two `<pre>` blocks inside an `overflow-x-auto` container.

- [ ] **Step 4: Verify the build and the full test suites**

Run: `cd frontend && npm run build && npm test`
Expected: build succeeds, all tests pass

Run: `cd backend && python -m pytest tests/ -v`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/bhavan/enquiries frontend/src/app/admin/bhavan/terms frontend/src/app/admin/bhavan/audit-log
git commit -m "feat(bhavan): add admin enquiry, terms and audit pages"
```

---

# Phase 8 — Seed data and end-to-end verification

### Task 24: Seed script

**Files:**
- Create: `backend/scripts/seed_bhavan.py`

**Interfaces:**
- Produces: an idempotent `seed()` coroutine creating the four accommodation types, sample amenities, the eight purposes, six rule templates and a starter Terms version

- [ ] **Step 1: Write the seed script**

Create `backend/scripts/seed_bhavan.py`:

```python
"""Seed the Bhavan module with a usable starting point.

Idempotent: re-running it will not duplicate rows. The rule profiles are
created as TEMPLATES, not applied to any date. PRD section 57 is explicit that
"Wedding = 2 nights, +50%" is only an example — the admin defines what Wedding
means. These exist so the admin has something to copy rather than a blank form.

Run with:  cd backend && python -m scripts.seed_bhavan
"""

import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, BhavanAccommodationType, BhavanAmenity,
    BhavanPurpose, BhavanRuleProfile, BhavanTermsVersion, BhavanUnit,
    RuleCategory, RuleStatus, UnitStatus,
)
from app.services.bhavan_settings import get_settings_row

ACCOMMODATION = [
    ("AC Room", AccommodationKind.ROOM, 4, "1500.00", 12, "1"),
    ("Non-AC Room", AccommodationKind.ROOM, 4, "1000.00", 8, "2"),
    ("AC Dormitory", AccommodationKind.DORMITORY, 20, "3000.00", 2, "AC-D"),
    ("Non-AC Dormitory", AccommodationKind.DORMITORY, 20, "2000.00", 2, "D"),
]

AMENITIES = [
    ("Plastic Chair", "10.00", AmenityPricingType.PER_UNIT, 500),
    ("Table", "100.00", AmenityPricingType.PER_UNIT, 60),
    ("Cooler", "500.00", AmenityPricingType.PER_DAY, 6),
    ("Mattress", "50.00", AmenityPricingType.PER_NIGHT, 100),
    ("Blanket", "30.00", AmenityPricingType.PER_NIGHT, 100),
    ("Deep Cleaning", "1500.00", AmenityPricingType.ONE_TIME, None),
]

PURPOSES = [
    "Wedding", "Social Event", "Anniversary", "Camp",
    "Family Function", "Religious Event", "Community Event", "Other",
]

TEMPLATES = [
    ("Wedding", RuleCategory.EVENT, {
        "pricing": {"mode": "increase_percent", "value": 50,
                    "conflict_behaviour": "replace_base"},
        "conditions": {"min_nights": 2, "min_units": 2},
    }),
    ("Social Event", RuleCategory.DISCOUNT, {
        "pricing": {"mode": "discount_percent", "value": 15,
                    "conflict_behaviour": "adjust_current"},
        "conditions": {"min_nights": 1},
    }),
    ("Anniversary", RuleCategory.DISCOUNT, {
        "pricing": {"mode": "discount_percent", "value": 10,
                    "conflict_behaviour": "adjust_current"},
        "conditions": {"min_nights": 1},
    }),
    ("Camp", RuleCategory.EVENT, {
        "pricing": {"mode": "discount_percent", "value": 20,
                    "conflict_behaviour": "replace_base"},
        "conditions": {"min_nights": 3},
    }),
    ("Festival", RuleCategory.PRICING, {
        "pricing": {"mode": "increase_percent", "value": 25,
                    "conflict_behaviour": "replace_base"},
    }),
    ("Maintenance", RuleCategory.CLOSURE, {
        "availability": {"closed": True},
    }),
]

STARTER_TERMS = """# Bhavan Booking Terms & Conditions

1. Submitting this form creates an **enquiry**. It is not a confirmed booking.
2. Our team will contact you to confirm availability and the final amount.
3. The amount shown is an estimate based on the rates applicable to the dates selected.
4. Accommodation is held only once an enquiry has been approved by the office.
5. Please quote your enquiry reference number in all correspondence.
"""


async def seed() -> None:
    async with SessionLocal() as db:
        for name, kind, capacity, price, unit_count, prefix in ACCOMMODATION:
            existing = (await db.execute(
                select(BhavanAccommodationType)
                .where(BhavanAccommodationType.name == name)
            )).scalars().first()
            if existing:
                print(f"  = {name} already exists")
                continue

            acc = BhavanAccommodationType(
                name=name, kind=kind, capacity_per_unit=capacity,
                base_price_per_night=Decimal(price),
                sort_order=ACCOMMODATION.index(
                    (name, kind, capacity, price, unit_count, prefix)
                ),
            )
            db.add(acc)
            await db.flush()
            for index in range(unit_count):
                db.add(BhavanUnit(
                    accommodation_type_id=acc.id,
                    label=f"{prefix}{index + 1:02d}",
                    status=UnitStatus.AVAILABLE,
                ))
            print(f"  + {name} with {unit_count} units")

        for name, price, pricing_type, quantity in AMENITIES:
            if (await db.execute(
                select(BhavanAmenity).where(BhavanAmenity.name == name)
            )).scalars().first():
                continue
            db.add(BhavanAmenity(
                name=name, price=Decimal(price), pricing_type=pricing_type,
                available_quantity=quantity,
                sort_order=[a[0] for a in AMENITIES].index(name),
            ))
            print(f"  + amenity {name}")

        for index, name in enumerate(PURPOSES):
            if (await db.execute(
                select(BhavanPurpose).where(BhavanPurpose.name == name)
            )).scalars().first():
                continue
            db.add(BhavanPurpose(name=name, sort_order=index))
            print(f"  + purpose {name}")

        for name, category, config in TEMPLATES:
            if (await db.execute(
                select(BhavanRuleProfile)
                .where(BhavanRuleProfile.name == name,
                       BhavanRuleProfile.is_template.is_(True))
            )).scalars().first():
                continue
            db.add(BhavanRuleProfile(
                name=name, category=category, config=config,
                status=RuleStatus.ACTIVE, is_template=True,
                description="Starting point only - edit before applying to dates.",
            ))
            print(f"  + template {name}")

        if not (await db.execute(select(BhavanTermsVersion))).scalars().first():
            db.add(BhavanTermsVersion(
                version_label="v1.0", content=STARTER_TERMS, is_published=False,
            ))
            print("  + starter Terms v1.0 (unpublished - review and publish it)")

        await get_settings_row(db)
        await db.commit()
        print("Bhavan seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 2: Confirm the session maker name**

Run: `cd backend && grep -n "async_session_maker\|sessionmaker" app/database.py`

If the exported name differs, update the import in the script to match. Then run it twice to prove idempotency:

Run: `cd backend && python -m scripts.seed_bhavan && python -m scripts.seed_bhavan`
Expected: the first run prints `+` lines; the second prints `=` / no new rows and completes without error

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/seed_bhavan.py
git commit -m "feat(bhavan): add idempotent seed script with rule templates"
```

---

### Task 25: End-to-end PRD scenario test

The PRD's own worked scenario, run through the real HTTP surface. This is the acceptance test for the whole module.

**Files:**
- Test: `backend/tests/test_bhavan_e2e.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_bhavan_e2e.py`:

```python
"""PRD section 53, end to end, through the real HTTP API.

Admin sets up inventory, applies a Wedding rule to a range, blocks one date
for maintenance, discounts another for a social event; then a customer walks
the public flow and submits an enquiry; then the admin approves it and the
inventory it consumed disappears from the public view.
"""

from decimal import Decimal

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin
from app.main import app
from app.models.bhavan import BhavanEnquiry, EnquiryStatus
from app.models.user import User, UserRole
from app.services.bhavan_otp import issue_verification_token


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(first_name="Admin", surname="User", mobile="9000000007",
                role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()

    async def _override():
        return user

    app.dependency_overrides[get_current_admin] = _override
    yield user
    app.dependency_overrides.pop(get_current_admin, None)


async def test_full_admin_setup_then_customer_enquiry_then_approval(
    client: AsyncClient, db_session: AsyncSession, admin_user: User
):
    # ── Admin sets up inventory ───────────────────────────────────────────
    ac_room = (await client.post("/api/v1/admin/bhavan/accommodation-types", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "1500.00",
    })).json()
    await client.post(
        f"/api/v1/admin/bhavan/accommodation-types/{ac_room['id']}/units/bulk",
        json={"prefix": "1", "start": 1, "count": 4},
    )
    chairs = (await client.post("/api/v1/admin/bhavan/amenities", json={
        "name": "Plastic Chair", "price": "10.00", "pricing_type": "per_unit",
        "available_quantity": 500,
    })).json()
    wedding_purpose = (await client.post("/api/v1/admin/bhavan/purposes", json={
        "name": "Wedding",
    })).json()
    social_purpose = (await client.post("/api/v1/admin/bhavan/purposes", json={
        "name": "Social Event",
    })).json()

    terms = (await client.post("/api/v1/admin/bhavan/terms", json={
        "version_label": "v1.0", "content": "Please be considerate.",
    })).json()
    await client.post(f"/api/v1/admin/bhavan/terms/{terms['id']}/publish")

    # ── Admin applies a Wedding rule to 10-20 Dec ─────────────────────────
    wedding = (await client.post("/api/v1/admin/bhavan/rule-profiles", json={
        "name": "Wedding", "category": "event",
        "config": {
            "pricing": {"mode": "increase_percent", "value": 50,
                        "conflict_behaviour": "replace_base"},
            "conditions": {"min_nights": 2},
            "purposes": {"default": "blocked", "allowed": [wedding_purpose["id"]]},
        },
    })).json()
    await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": wedding["id"], "label": "Wedding Dates",
        "ranges": [{"start": "2026-12-10", "end": "2026-12-20"}],
    })

    # ── Then blocks 15 Dec for maintenance ────────────────────────────────
    maintenance = (await client.post("/api/v1/admin/bhavan/rule-profiles", json={
        "name": "Maintenance", "category": "closure",
        "config": {"availability": {"closed": True}},
    })).json()
    await client.post("/api/v1/admin/bhavan/rule-assignments", json={
        "profile_id": maintenance["id"], "label": "December Maintenance",
        "dates": ["2026-12-15"],
    })

    # ── The calendar reflects both ────────────────────────────────────────
    calendar = {
        row["date"]: row
        for row in (await client.get(
            "/api/v1/admin/bhavan/calendar?year=2026&month=12"
        )).json()
    }
    assert calendar["2026-12-14"]["effective_rule"] == "Wedding Dates"
    assert calendar["2026-12-15"]["status"] == "closed"
    assert calendar["2026-12-16"]["effective_rule"] == "Wedding Dates"

    # ── A customer cannot book across the closed date ─────────────────────
    blocked = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-14", "check_out": "2026-12-16",
        "accommodation": {ac_room["id"]: 1}, "amenities": {}, "guests_total": 2,
        "purpose_id": wedding_purpose["id"],
    })).json()
    assert blocked["is_bookable"] is False
    assert "The Bhavan is unavailable for the selected dates." in blocked["blockers"]

    # ── A social event is refused on a wedding date, without saying why ───
    wrong_purpose = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-11", "check_out": "2026-12-13",
        "accommodation": {ac_room["id"]: 1}, "amenities": {}, "guests_total": 2,
        "purpose_id": social_purpose["id"],
    })).json()
    assert "This type of event is not available for the selected dates." in \
        wrong_purpose["blockers"]
    assert not any("Wedding" in b for b in wrong_purpose["blockers"])

    # ── A one-night stay trips the minimum ────────────────────────────────
    too_short = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-11", "check_out": "2026-12-12",
        "accommodation": {ac_room["id"]: 1}, "amenities": {}, "guests_total": 2,
        "purpose_id": wedding_purpose["id"],
    })).json()
    assert "A minimum stay of 2 nights is required for the selected dates." in \
        too_short["blockers"]

    # ── A valid enquiry prices at the wedding rate ────────────────────────
    quote = (await client.post("/api/v1/bhavan/quote", json={
        "check_in": "2026-12-11", "check_out": "2026-12-13",
        "accommodation": {ac_room["id"]: 2}, "amenities": {chairs["id"]: 50},
        "guests_total": 8, "purpose_id": wedding_purpose["id"],
    })).json()
    # 2 rooms x 2 nights x 2,250 = 9,000, plus 50 chairs x 10 = 500.
    assert quote["accommodation_total"] == "9000.00"
    assert quote["estimated_total"] == "9500.00"
    assert quote["is_bookable"] is True

    # ── Submit it ─────────────────────────────────────────────────────────
    token = issue_verification_token("9876543210")
    created = (await client.post("/api/v1/bhavan/enquiries", json={
        "check_in": "2026-12-11", "check_out": "2026-12-13",
        "accommodation": {ac_room["id"]: 2}, "amenities": {chairs["id"]: 50},
        "purpose_id": wedding_purpose["id"], "full_name": "Rajesh Goyal",
        "mobile": "9876543210", "city": "Jaipur", "state": "Rajasthan",
        "guests_total": 8, "adults": 6, "children": 2,
        "verification_token": token, "terms_accepted": True,
    })).json()
    assert created["reference"].startswith("BV-")
    assert created["estimated_total"] == "9500.00"

    # ── Pending holds nothing ─────────────────────────────────────────────
    still_free = (await client.post("/api/v1/bhavan/availability", json={
        "check_in": "2026-12-11", "check_out": "2026-12-13",
    })).json()
    entry = next(e for e in still_free["accommodation"] if e["id"] == ac_room["id"])
    assert entry["available"] == 4, "a pending enquiry must not block anyone"

    # ── Approving does hold it ────────────────────────────────────────────
    enquiry = (await db_session.execute(
        select(BhavanEnquiry).where(BhavanEnquiry.reference == created["reference"])
    )).scalar_one()
    approved = await client.post(
        f"/api/v1/admin/bhavan/enquiries/{enquiry.id}/status",
        json={"status": "approved"},
    )
    assert approved.status_code == 200

    after = (await client.post("/api/v1/bhavan/availability", json={
        "check_in": "2026-12-11", "check_out": "2026-12-13",
    })).json()
    entry = next(e for e in after["accommodation"] if e["id"] == ac_room["id"])
    assert entry["available"] == 2

    # ── Changing the rate later must not rewrite the enquiry ──────────────
    await client.put(f"/api/v1/admin/bhavan/accommodation-types/{ac_room['id']}", json={
        "name": "AC Room", "kind": "room", "capacity_per_unit": 4,
        "base_price_per_night": "9999.00",
    })
    await db_session.refresh(enquiry)
    assert enquiry.estimated_total == Decimal("9500.00")
    assert enquiry.quote_snapshot["estimated_total"] == "9500.00"
```

- [ ] **Step 2: Run the test**

Run: `cd backend && python -m pytest tests/test_bhavan_e2e.py -v`
Expected: PASS

- [ ] **Step 3: Run everything**

Run: `cd backend && python -m pytest tests/ -v`
Expected: all pass

Run: `cd frontend && npm test && npm run build`
Expected: all pass, build succeeds

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_bhavan_e2e.py
git commit -m "test(bhavan): add end-to-end PRD scenario coverage"
```

---

## Spec coverage

| Spec section | Covered by |
|---|---|
| 3.1 Inventory (types, images, units, amenities, purposes, settings) | Tasks 1, 7, 21 |
| 3.2 Rule engine tables | Tasks 1, 8 |
| 3.3 Rule config schema | Task 2 |
| 3.4 Enquiries, status lifecycle, terms | Tasks 1, 10, 13, 14 |
| 3.5 Reuse of AuditLog, PhoneOTPRequest, upload convention | Tasks 7, 12 |
| 4 Rule resolution, layering, multi-night | Tasks 3, 4 |
| 5 Booking calculation, availability counting, guest capacity | Tasks 5, 6 |
| 6 Public flow, OTP binding, API surface | Tasks 11, 12, 13, 16, 17, 18 |
| 7 Admin routes, calendar, rule creation, enquiries, terms | Tasks 7–10, 14, 15, 19–23 |
| 8 Privacy, public messages, integrity guarantees | Tasks 6, 11 (leakage test), 13 |
| 9 Testing | Every task; end-to-end in Task 25 |
| 10 Build sequence, seed script | Task 24 |



