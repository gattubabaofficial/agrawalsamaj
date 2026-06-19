import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional
from sqlalchemy import String, ForeignKey, DateTime, Enum, Boolean, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GroupType(str, PyEnum):
    MEMBER = "member"
    NON_MEMBER = "non_member"
    LOCATION = "location"


class Group(Base):
    __tablename__ = "groups"

    group_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[GroupType] = mapped_column(
        Enum(GroupType, name="group_type"),
        nullable=False
    )
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Colony or Area name
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    members: Mapped[List["GroupMember"]] = relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan"
    )
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="group",
        cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_members"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.group_id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    group: Mapped[Group] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    receiver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True
    )  # Null for group messages
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("groups.group_id", ondelete="CASCADE"),
        nullable=True
    )  # Null for direct private DMs
    content: Mapped[str] = mapped_column(String(2000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Constraints to ensure message goes to either a user OR a group (not both, and not neither)
    __table_args__ = (
        CheckConstraint(
            "(receiver_id IS NOT NULL AND group_id IS NULL) OR (receiver_id IS NULL AND group_id IS NOT NULL)",
            name="check_message_recipient"
        ),
    )

    # Relationships
    group: Mapped[Optional[Group]] = relationship("Group", back_populates="messages")
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[receiver_id])
