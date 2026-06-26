import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String, ForeignKey, DateTime, Enum, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.database import Base


class RequestStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MembershipRequest(Base):
    __tablename__ = "membership_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="membership_request_status"),
        default=RequestStatus.PENDING,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user: Mapped["User"] = relationship("User")
    family_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("families.family_id", ondelete="SET NULL"),
        nullable=True
    )
    family_relation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    family: Mapped[Optional["Family"]] = relationship("Family")


class FamilyJoinRequest(Base):
    __tablename__ = "family_join_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.family_id", ondelete="CASCADE"),
        nullable=False
    )
    relation: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="family_join_request_status"),
        default=RequestStatus.PENDING,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user: Mapped["User"] = relationship("User")
    family: Mapped["Family"] = relationship("Family")


class FamilyCreationRequest(Base):
    """Stores a pending 'Create Family' form submission awaiting admin approval.
    On approval, the family is physically created and the head user's family_id is assigned.
    """
    __tablename__ = "family_creation_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    # Proposed family details
    family_name: Mapped[str] = mapped_column(String(200), nullable=False)
    member_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Head's profile details to apply on approval
    head_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    head_surname: Mapped[str] = mapped_column(String(100), nullable=False)
    head_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    head_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    head_profession: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    head_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    head_profile_photo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Serialized JSON list of placeholder members to create on approval
    members_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="family_creation_request_status"),
        default=RequestStatus.PENDING,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user: Mapped["User"] = relationship("User")
