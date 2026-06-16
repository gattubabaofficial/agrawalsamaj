from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List

# ==============================================================================
# 1. AUTH & USER SCHEMAS
# ==============================================================================

class UserBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    password: Optional[str] = None
    colony_name: str  # Mandatory for auto-group assignment
    area_name: str    # Mandatory for auto-group assignment
    profession: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    blood_group: Optional[str] = None
    dob: Optional[date] = None

class PrivacyUpdate(BaseModel):
    show_phone: bool
    show_email: bool
    show_address: bool

class UserResponse(UserBase):
    id: int
    uuid: str
    role: str
    status: str
    profile_photo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class OTPRequest(BaseModel):
    email_or_phone: str

class OTPVerify(BaseModel):
    email_or_phone: str
    otp: str


# ==============================================================================
# 2. GEOGRAPHY & FAMILY SCHEMAS
# ==============================================================================

class AreaResponse(BaseModel):
    id: int
    area_name: str
    class Config:
        from_attributes = True

class ColonyResponse(BaseModel):
    id: int
    colony_name: str
    area_id: int
    class Config:
        from_attributes = True

class FamilyCreate(BaseModel):
    family_name: str
    colony_id: int
    area_id: int
    address: str

class FamilyAddMember(BaseModel):
    phone_number: str  # User must be pre-registered by phone
    relationship: str  # Father, Mother, Son, Spouse, etc.

class FamilyMemberResponse(BaseModel):
    id: int
    user: UserResponse
    relationship: str
    class Config:
        from_attributes = True

class FamilyResponse(BaseModel):
    id: int
    family_code: str
    family_name: str
    family_head_id: int
    address: str
    area: AreaResponse
    colony: ColonyResponse
    members: List[FamilyMemberResponse] = []
    class Config:
        from_attributes = True


# ==============================================================================
# 3. FACILITY & BOOKING SCHEMAS
# ==============================================================================

class FacilityCreate(BaseModel):
    name: str
    type: str  # Room, Hall, Open Area
    price_per_day: float
    floor: str
    capacity: int
    amenities: str

class FacilityResponse(FacilityCreate):
    id: int
    status: str
    images: List[str] = []
    floor_plans: List[str] = []
    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    facility_id: int
    booking_start: datetime
    booking_end: datetime

class BookingResponse(BaseModel):
    id: int
    facility: FacilityResponse
    user: UserResponse
    booking_start: datetime
    booking_end: datetime
    status: str
    payment_status: Optional[str] = None
    total_amount: Optional[float] = None
    class Config:
        from_attributes = True


# ==============================================================================
# 4. EVENT & PASS SCHEMAS
# ==============================================================================

class ScheduleItem(BaseModel):
    activity_name: str
    start_time: datetime
    end_time: datetime

class EventCreate(BaseModel):
    title: str
    description: str
    location: str
    start_date: datetime
    end_date: datetime
    visibility: str = "PUBLIC"  # PUBLIC, MEMBERS_ONLY, INVITE_ONLY
    capacity: int = 0
    schedules: List[ScheduleItem] = []

class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    banner: Optional[str] = None
    location: str
    start_date: datetime
    end_date: datetime
    visibility: str
    capacity: int
    schedules: List[ScheduleItem] = []
    class Config:
        from_attributes = True

class PassCreate(BaseModel):
    pass_type: str  # General, VIP, Family
    amount: float
    quantity: int

class PassResponse(PassCreate):
    id: int
    event_id: int
    class Config:
        from_attributes = True

class PassPurchaseRequest(BaseModel):
    pass_id: int
    quantity: int


# ==============================================================================
# 5. CHAT SCHEMAS
# ==============================================================================

class MessageSend(BaseModel):
    conversation_id: Optional[int] = None
    receiver_id: Optional[int] = None  # For starting direct chat
    group_id: Optional[int] = None     # For group chat
    content: str
    type: str = "TEXT"

class ChatAttachmentSchema(BaseModel):
    file_url: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    content: str
    type: str
    created_at: datetime
    attachments: List[ChatAttachmentSchema] = []
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: int
    participant_one: int
    participant_two: int
    last_message: Optional[MessageResponse] = None
    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    id: int
    group_name: str
    group_type: str
    class Config:
        from_attributes = True


# ==============================================================================
# 6. DONATION & PAYMENT SCHEMAS
# ==============================================================================

class DonationCreate(BaseModel):
    category: str
    amount: float

class PaymentResponse(BaseModel):
    id: int
    amount: float
    currency: str
    status: str
    gateway_reference: Optional[str] = None
    payment_type: str
    created_at: datetime
    class Config:
        from_attributes = True

class DonationResponse(BaseModel):
    id: int
    category: str
    amount: float
    user: UserResponse
    payment: PaymentResponse
    receipt_number: Optional[str] = None
    class Config:
        from_attributes = True


# ==============================================================================
# 7. CMS & GENERAL SCHEMAS
# ==============================================================================

class PageResponse(BaseModel):
    id: int
    slug: str
    title: str
    content: str
    class Config:
        from_attributes = True

class GalleryResponse(BaseModel):
    id: int
    media_url: str
    media_type: str
    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    title: str
    body: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    action: str
    metadata: Optional[str] = None
    ip_address: Optional[str] = None
    device: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    class Config:
        from_attributes = True
