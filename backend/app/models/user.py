import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class UserRole(str, PyEnum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    VOLUNTEER = "VOLUNTEER"
    MEMBER = "MEMBER"
    GUEST = "GUEST"


class OtpType(str, PyEnum):
    REGISTRATION = "registration"
    LOGIN = "login"
    PASSWORD_RESET = "password_reset"


class Family(Base, TimestampMixin):
    __tablename__ = "families"

    family_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    family_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    family_name: Mapped[str] = mapped_column(String(200), nullable=False)
    head_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    member_limit: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Relationships
    members: Mapped[List["User"]] = relationship(
        "User",
        back_populates="family",
        foreign_keys="[User.family_id]"
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    family_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("families.family_id", ondelete="SET NULL"),
        nullable=True
    )
    samaj_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True) # Samaj ID for members
    lm_no: Mapped[Optional[int]] = mapped_column(index=True, nullable=True) # Life Member number (from voter/member list; not unique — a few numbers repeat)
    zone: Mapped[Optional[str]] = mapped_column(String(60), nullable=True) # Zone / colony from member list
    house_no: Mapped[Optional[str]] = mapped_column(String(60), nullable=True) # House No. from member list
    family_relation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # Relation to head
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    surname: Mapped[str] = mapped_column(String(100), nullable=False)
    father_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # Father's / Husband's name
    parent_relation: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # S/o, D/o, W/o, C/o relation
    mobile: Mapped[Optional[str]] = mapped_column(String(15), unique=True, index=True, nullable=True)
    # Display-only contact number from the imported member list. Kept separate from the
    # unique `mobile` (used for login/OTP) because the source list repeats numbers across
    # people, so they can't all live on a unique column.
    contact_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.GUEST,
        nullable=False
    )
    is_member: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Lifecycle status for members carried over from the printed list. We never delete
    # people who moved away or passed on — they stay in the directory flagged instead.
    # Values: active | shifted | expired | sold_out | shifted_sold_out | double_name
    member_status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    profession: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    native_place: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    profile_photo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Privacy controls
    mobile_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    address_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    profession_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    native_place_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bio_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    yahoo_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)

    # Admin management: which super admin created this admin account, and notes
    created_by_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True
    )
    admin_notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    custom_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("custom_roles.role_id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    custom_role: Mapped[Optional["CustomRole"]] = relationship(
        "CustomRole",
        back_populates="users"
    )
    family: Mapped[Optional[Family]] = relationship(
        "Family",
        back_populates="members",
        foreign_keys="[User.family_id]"
    )
    
    event_registrations: Mapped[List["EventRegistration"]] = relationship(
        "EventRegistration",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="[EventRegistration.user_id]"
    )
    
    bookings: Mapped[List["Booking"]] = relationship(
        "Booking",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="[Booking.user_id]"
    )
    
    donations: Mapped[List["Donation"]] = relationship(
        "Donation",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class OtpLog(Base):
    __tablename__ = "otp_logs"

    otp_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    target: Mapped[str] = mapped_column(String(255), index=True, nullable=False)  # Mobile or Email
    otp_code: Mapped[str] = mapped_column(String(10), nullable=False)
    otp_type: Mapped[OtpType] = mapped_column(
        Enum(OtpType, name="otp_type"),
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )


class PhoneOTPRequest(Base, TimestampMixin):
    __tablename__ = "phone_otp_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(String(15), index=True, nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class EmailOTPRequest(Base, TimestampMixin):
    __tablename__ = "email_otp_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
