from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, Numeric, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

# ==============================================================================
# 1. USER & FAMILY MODELS
# ==============================================================================

class Address(Base):
    __tablename__ = "addresses"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    colony: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    users: Mapped[List["User"]] = relationship(back_populates="address")
    families: Mapped[List["Family"]] = relationship(back_populates="address")


class Family(Base):
    __tablename__ = "families"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    family_name: Mapped[str] = mapped_column(String(100))
    family_head_samaj_id: Mapped[str] = mapped_column(String(16))
    address_id: Mapped[Optional[int]] = mapped_column(ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    
    address: Mapped[Optional["Address"]] = relationship(back_populates="families")
    members: Mapped[List["User"]] = relationship(back_populates="family")


class User(Base):
    __tablename__ = "users"
    
    samaj_id: Mapped[str] = mapped_column(String(16), primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="USER")
    status: Mapped[str] = mapped_column(String(20), default="NOT_APPLIED")
    profile_photo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    profession: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(20), default="NOT_APPLIED")
    
    address_id: Mapped[Optional[int]] = mapped_column(ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    
    family_id: Mapped[Optional[int]] = mapped_column(ForeignKey("families.id", ondelete="SET NULL"), nullable=True)
    family_relationship: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    show_phone: Mapped[bool] = mapped_column(Boolean, default=True)
    show_email: Mapped[bool] = mapped_column(Boolean, default=True)
    show_address: Mapped[bool] = mapped_column(Boolean, default=True)
    
    address: Mapped[Optional["Address"]] = relationship(back_populates="users")
    family: Mapped[Optional["Family"]] = relationship(back_populates="members")
    event_registrations: Mapped[List["EventRegistration"]] = relationship(back_populates="user")
    bookings: Mapped[List["Booking"]] = relationship(back_populates="user")
    donations: Mapped[List["Donation"]] = relationship(back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user")


# ==============================================================================
# 2. EVENT MANAGEMENT MODELS
# ==============================================================================

class Event(Base):
    __tablename__ = "events"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str] = mapped_column(Text)
    banner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime] = mapped_column(DateTime)
    visibility: Mapped[str] = mapped_column(String(20), default="PUBLIC")  # PUBLIC, MEMBERS_ONLY, INVITE_ONLY
    capacity: Mapped[int] = mapped_column(Integer, default=0)  # 0 = unlimited
    
    registrations: Mapped[List["EventRegistration"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    samaj_id: Mapped[str] = mapped_column(ForeignKey("users.samaj_id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED")  # CONFIRMED, WAITLISTED, CANCELLED
    
    event: Mapped["Event"] = relationship(back_populates="registrations")
    user: Mapped["User"] = relationship(back_populates="event_registrations")


# ==============================================================================
# 3. BHAVAN / FACILITY BOOKING
# ==============================================================================

class Facility(Base):
    __tablename__ = "facilities"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    type: Mapped[str] = mapped_column(String(50))  # Room, Hall, Open Area
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")  # AVAILABLE, MAINTENANCE, DISABLED
    floor: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    price_per_day: Mapped[float] = mapped_column(Numeric(10, 2))
    capacity: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    bookings: Mapped[List["Booking"]] = relationship(back_populates="facility", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    samaj_id: Mapped[str] = mapped_column(ForeignKey("users.samaj_id"))
    booking_start: Mapped[datetime] = mapped_column(DateTime)
    booking_end: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, CONFIRMED, CANCELLED
    payment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("payments.id"), nullable=True)
    
    facility: Mapped["Facility"] = relationship(back_populates="bookings")
    user: Mapped["User"] = relationship(back_populates="bookings")
    payment: Mapped[Optional["Payment"]] = relationship("Payment")


# ==============================================================================
# 4. DONATIONS, PAYMENTS & REFUNDS
# ==============================================================================

class Payment(Base):
    __tablename__ = "payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, SUCCESS, FAILED, REFUNDED, CANCELLED
    gateway_reference: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    payment_type: Mapped[str] = mapped_column(String(20))  # ONLINE, CASH
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    refunds: Mapped[List["Refund"]] = relationship(back_populates="payment", cascade="all, delete-orphan")


class Refund(Base):
    __tablename__ = "refunds"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id", ondelete="CASCADE"))
    refund_amount: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(20), default="REQUESTED")  # REQUESTED, APPROVED, REJECTED, COMPLETED
    
    payment: Mapped["Payment"] = relationship(back_populates="refunds")


class Donation(Base):
    __tablename__ = "donations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    donor_samaj_id: Mapped[str] = mapped_column(ForeignKey("users.samaj_id"))
    category: Mapped[str] = mapped_column(String(100))  # General, Charity, Sponsor
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"))
    
    user: Mapped["User"] = relationship(back_populates="donations")
    payment: Mapped["Payment"] = relationship("Payment")


# ==============================================================================
# 5. CHAT MODULE
# ==============================================================================

class ChatGroup(Base):
    __tablename__ = "chat_groups"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_name: Mapped[str] = mapped_column(String(100), unique=True)
    group_type: Mapped[str] = mapped_column(String(20))  # COMMUNITY, MEMBER, COLONY, AREA
    
    members: Mapped[List["ChatGroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class ChatGroupMember(Base):
    __tablename__ = "chat_group_members"
    
    group_id: Mapped[int] = mapped_column(ForeignKey("chat_groups.id", ondelete="CASCADE"), primary_key=True)
    samaj_id: Mapped[str] = mapped_column(ForeignKey("users.samaj_id", ondelete="CASCADE"), primary_key=True)
    
    group: Mapped["ChatGroup"] = relationship(back_populates="members")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    participant_one: Mapped[str] = mapped_column(ForeignKey("users.samaj_id"))
    participant_two: Mapped[str] = mapped_column(ForeignKey("users.samaj_id"))
    
    messages: Mapped[List["ChatMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=True)
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("chat_groups.id", ondelete="CASCADE"), nullable=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.samaj_id"))
    content: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(20), default="TEXT")  # TEXT, IMAGE, DOCUMENT, AUDIO
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    conversation: Mapped[Optional["ChatConversation"]] = relationship(back_populates="messages")
    group: Mapped[Optional["ChatGroup"]] = relationship()
    attachments: Mapped[List["ChatAttachment"]] = relationship(back_populates="message", cascade="all, delete-orphan")


class ChatAttachment(Base):
    __tablename__ = "chat_attachments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id", ondelete="CASCADE"))
    file_url: Mapped[str] = mapped_column(String(255))
    
    message: Mapped["ChatMessage"] = relationship(back_populates="attachments")


# ==============================================================================
# 6. NOTIFICATIONS
# ==============================================================================

class Notification(Base):
    __tablename__ = "notifications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    samaj_id: Mapped[str] = mapped_column(ForeignKey("users.samaj_id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User"] = relationship(back_populates="notifications")
