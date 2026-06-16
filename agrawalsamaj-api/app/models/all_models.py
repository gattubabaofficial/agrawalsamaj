from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, Numeric, Boolean, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

# ==============================================================================
# 1. GEOGRAPHY / MASTER DATA MODELS
# ==============================================================================

class Area(Base):
    __tablename__ = "areas"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    area_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    
    colonies: Mapped[List["Colony"]] = relationship(back_populates="area")
    families: Mapped[List["Family"]] = relationship(back_populates="area")


class Colony(Base):
    __tablename__ = "colonies"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    colony_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id", ondelete="CASCADE"))
    
    area: Mapped["Area"] = relationship(back_populates="colonies")
    families: Mapped[List["Family"]] = relationship(back_populates="colony")


# ==============================================================================
# 2. USER & MEMBERSHIP MODELS
# ==============================================================================

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="USER")  # ADMIN, MEMBER, USER
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED, SUSPENDED
    profile_photo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    sessions: Mapped[List["UserSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    family_membership: Mapped[Optional["FamilyMember"]] = relationship(back_populates="user", uselist=False)
    profile: Mapped[Optional["MemberProfile"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    privacy_settings: Mapped[Optional["UserPrivacySettings"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    event_registrations: Mapped[List["EventRegistration"]] = relationship(back_populates="user")
    volunteered_events: Mapped[List["EventVolunteer"]] = relationship(back_populates="user")
    bookings: Mapped[List["Booking"]] = relationship(back_populates="user")
    donations: Mapped[List["Donation"]] = relationship(back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="user")


class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    refresh_token: Mapped[str] = mapped_column(String(255), index=True)
    device_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    
    user: Mapped["User"] = relationship(back_populates="sessions")


class UserPrivacySettings(Base):
    __tablename__ = "user_privacy_settings"
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    show_phone: Mapped[bool] = mapped_column(Boolean, default=True)
    show_email: Mapped[bool] = mapped_column(Boolean, default=True)
    show_address: Mapped[bool] = mapped_column(Boolean, default=True)
    
    user: Mapped["User"] = relationship(back_populates="privacy_settings")


class Family(Base):
    __tablename__ = "families"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g., FAM000001
    family_name: Mapped[str] = mapped_column(String(100))
    family_head_id: Mapped[int] = mapped_column(Integer)  # User ID of head
    colony_id: Mapped[int] = mapped_column(ForeignKey("colonies.id"))
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"))
    address: Mapped[str] = mapped_column(Text)
    
    area: Mapped["Area"] = relationship(back_populates="families")
    colony: Mapped["Colony"] = relationship(back_populates="families")
    members: Mapped[List["FamilyMember"]] = relationship(back_populates="family", cascade="all, delete-orphan")


class FamilyMember(Base):
    __tablename__ = "family_members"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Define relationships first before masking the name
    family: Mapped["Family"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="family_membership")
    
    relationship: Mapped[str] = mapped_column(String(50))  # Father, Mother, Son, Spouse, etc.


class MemberProfile(Base):
    __tablename__ = "member_profiles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    family_id: Mapped[Optional[int]] = mapped_column(ForeignKey("families.id", ondelete="SET NULL"), nullable=True)
    profession: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED
    
    user: Mapped["User"] = relationship(back_populates="profile")


# ==============================================================================
# 3. EVENT MANAGEMENT MODELS
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
    
    schedules: Mapped[List["EventSchedule"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    registrations: Mapped[List["EventRegistration"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    volunteers: Mapped[List["EventVolunteer"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    passes: Mapped[List["Pass"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class EventSchedule(Base):
    __tablename__ = "event_schedules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    activity_name: Mapped[str] = mapped_column(String(150))
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    
    event: Mapped["Event"] = relationship(back_populates="schedules")


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED")  # CONFIRMED, WAITLISTED, CANCELLED
    
    event: Mapped["Event"] = relationship(back_populates="registrations")
    user: Mapped["User"] = relationship(back_populates="event_registrations")


class EventVolunteer(Base):
    __tablename__ = "event_volunteers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(50))  # Desk, Scanner, Support, etc.
    
    event: Mapped["Event"] = relationship(back_populates="volunteers")
    user: Mapped["User"] = relationship(back_populates="volunteered_events")


class EventAttendance(Base):
    __tablename__ = "event_attendance"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    entry_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# ==============================================================================
# 4. PASSES & QR SYSTEM
# ==============================================================================

class Pass(Base):
    __tablename__ = "passes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    pass_type: Mapped[str] = mapped_column(String(50))  # General, VIP, Family
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer)
    
    event: Mapped["Event"] = relationship(back_populates="passes")
    purchases: Mapped[List["PassPurchase"]] = relationship(back_populates="pass_info")


class PassPurchase(Base):
    __tablename__ = "pass_purchases"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pass_id: Mapped[int] = mapped_column(ForeignKey("passes.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"))
    qr_code: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    
    pass_info: Mapped["Pass"] = relationship(back_populates="purchases")
    payment: Mapped["Payment"] = relationship("Payment")


class QRValidation(Base):
    __tablename__ = "qr_validations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    qr_code: Mapped[str] = mapped_column(String(255), ForeignKey("pass_purchases.qr_code"), unique=True)
    scanner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    scan_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ==============================================================================
# 5. BHAVAN MODULE
# ==============================================================================

class Facility(Base):
    __tablename__ = "facilities"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    type: Mapped[str] = mapped_column(String(50))  # Room, Hall, Open Area
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")  # AVAILABLE, MAINTENANCE, DISABLED
    price_per_day: Mapped[float] = mapped_column(Numeric(10, 2))
    floor: Mapped[str] = mapped_column(String(20))
    capacity: Mapped[int] = mapped_column(Integer)
    amenities: Mapped[str] = mapped_column(Text)  # Comma separated or JSON string
    
    images: Mapped[List["FacilityImage"]] = relationship(back_populates="facility", cascade="all, delete-orphan")
    floor_plans: Mapped[List["FloorPlan"]] = relationship(back_populates="facility", cascade="all, delete-orphan")
    bookings: Mapped[List["Booking"]] = relationship(back_populates="facility", cascade="all, delete-orphan")


class FacilityImage(Base):
    __tablename__ = "facility_images"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(String(255))
    
    facility: Mapped["Facility"] = relationship(back_populates="images")


class FloorPlan(Base):
    __tablename__ = "floor_plans"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(String(255))
    
    facility: Mapped["Facility"] = relationship(back_populates="floor_plans")


class Booking(Base):
    __tablename__ = "bookings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    booking_start: Mapped[datetime] = mapped_column(DateTime)
    booking_end: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, CONFIRMED, CANCELLED
    
    facility: Mapped["Facility"] = relationship(back_populates="bookings")
    user: Mapped["User"] = relationship(back_populates="bookings")
    payment: Mapped[Optional["BookingPayment"]] = relationship(back_populates="booking", uselist=False, cascade="all, delete-orphan")


class BookingPayment(Base):
    __tablename__ = "booking_payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), unique=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"))
    
    booking: Mapped["Booking"] = relationship(back_populates="payment")
    payment: Mapped["Payment"] = relationship("Payment")


# ==============================================================================
# 6. CHAT MODULE
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
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    
    group: Mapped["ChatGroup"] = relationship(back_populates="members")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    participant_one: Mapped[int] = mapped_column(ForeignKey("users.id"))
    participant_two: Mapped[int] = mapped_column(ForeignKey("users.id"))
    
    messages: Mapped[List["ChatMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("chat_conversations.id", ondelete="CASCADE"))
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(20), default="TEXT")  # TEXT, IMAGE, DOCUMENT, AUDIO
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    conversation: Mapped["ChatConversation"] = relationship(back_populates="messages")
    attachments: Mapped[List["ChatAttachment"]] = relationship(back_populates="message", cascade="all, delete-orphan")


class ChatAttachment(Base):
    __tablename__ = "chat_attachments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id", ondelete="CASCADE"))
    file_url: Mapped[str] = mapped_column(String(255))
    
    message: Mapped["ChatMessage"] = relationship(back_populates="attachments")


# ==============================================================================
# 7. DONATIONS & PAYMENTS
# ==============================================================================

class Donation(Base):
    __tablename__ = "donations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    donor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String(100))  # General, Building, Charity, Sponsor
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"))
    
    user: Mapped["User"] = relationship(back_populates="donations")
    payment: Mapped["Payment"] = relationship("Payment")
    receipt: Mapped[Optional["DonationReceipt"]] = relationship(back_populates="donation", uselist=False, cascade="all, delete-orphan")


class DonationReceipt(Base):
    __tablename__ = "donation_receipts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    donation_id: Mapped[int] = mapped_column(ForeignKey("donations.id", ondelete="CASCADE"), unique=True)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    
    donation: Mapped["Donation"] = relationship(back_populates="receipt")


class Payment(Base):
    __tablename__ = "payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, SUCCESS, FAILED, REFUNDED, CANCELLED
    gateway_reference: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)  # Razorpay ID / Offline txn ID
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


# ==============================================================================
# 8. CMS & NOTIFICATIONS
# ==============================================================================

class Page(Base):
    __tablename__ = "pages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text)


class Gallery(Base):
    __tablename__ = "gallery"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    media_url: Mapped[str] = mapped_column(String(255))
    media_type: Mapped[str] = mapped_column(String(20))  # IMAGE, VIDEO


class Notification(Base):
    __tablename__ = "notifications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User"] = relationship(back_populates="notifications")
    logs: Mapped[List["NotificationLog"]] = relationship(back_populates="notification", cascade="all, delete-orphan")


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    notification_id: Mapped[int] = mapped_column(ForeignKey("notifications.id", ondelete="CASCADE"))
    channel: Mapped[str] = mapped_column(String(20))  # IN_APP, EMAIL, SMS, WHATSAPP
    status: Mapped[str] = mapped_column(String(20), default="SENT")  # SENT, FAILED
    
    notification: Mapped["Notification"] = relationship(back_populates="logs")


# ==============================================================================
# 9. SYSTEM AUDITING
# ==============================================================================

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    log_metadata: Mapped[Optional[str]] = mapped_column("metadata", Text, nullable=True)  # JSON formatted metadata
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    device: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")
