from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List

# ==============================================================================
# 1. AUTH & USER SCHEMAS
# ==============================================================================


class AddressBase(BaseModel):
    area: Optional[str] = None
    colony: Optional[str] = None
    address_text: Optional[str] = None

class AddressUpdate(AddressBase):
    pass

class AddressCreate(AddressBase):
    pass

class AddressResponse(AddressBase):
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    blood_group: Optional[str] = None
    dob: Optional[date] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    profession: Optional[str] = None
    blood_group: Optional[str] = None
    dob: Optional[date] = None
    show_phone: Optional[bool] = None
    show_email: Optional[bool] = None
    show_address: Optional[bool] = None

class UserResponse(UserBase):
    uuid: str
    samaj_id: str
    role: str
    status: str
    profile_photo: Optional[str] = None
    created_at: datetime
    approval_status: str
    show_phone: bool
    show_email: bool
    show_address: bool
    family_id: Optional[int] = None
    family_relationship: Optional[str] = None
    address: Optional[AddressResponse] = None

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

class LoginRequest(BaseModel):
    email: str
    password: str

# ==============================================================================
# 2. FAMILY SCHEMAS
# ==============================================================================

class FamilyCreate(BaseModel):
    family_name: str

class FamilyResponse(BaseModel):
    family_code: str
    family_name: str
    family_head_samaj_id: str
    address_id: Optional[int]
    members: List[UserResponse] = []
    class Config:
        from_attributes = True

class FamilyAddMember(BaseModel):
    samaj_id: str
    relationship: str

# ==============================================================================
# 3. FACILITY & BOOKING SCHEMAS
# ==============================================================================

class FacilityCreate(BaseModel):
    name: str
    type: str  # Room, Hall, Open Area
    price_per_day: float
    capacity: int
    floor: Optional[str] = None
    image_url: Optional[str] = None

class FacilityResponse(FacilityCreate):
    status: str
    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    facility_id: int
    booking_start: datetime
    booking_end: datetime

class BookingResponse(BaseModel):
    facility: FacilityResponse
    user: UserResponse
    booking_start: datetime
    booking_end: datetime
    status: str
    payment_id: Optional[int] = None
    class Config:
        from_attributes = True

# ==============================================================================
# 4. EVENT SCHEMAS
# ==============================================================================

class EventCreate(BaseModel):
    title: str
    description: str
    location: str
    start_date: datetime
    end_date: datetime
    visibility: str = "PUBLIC"  # PUBLIC, MEMBERS_ONLY, INVITE_ONLY
    capacity: int = 0
    is_paid: bool = False
    fee_amount: Optional[float] = None

class EventResponse(EventCreate):
    id: int
    banner: Optional[str] = None
    class Config:
        from_attributes = True

class EventRegistrationCreate(BaseModel):
    payment_mode: str  # ONLINE, OFFLINE

class EventRegistrationResponse(BaseModel):
    id: int
    event_id: int
    samaj_id: str
    payment_mode: Optional[str] = None
    payment_status: str
    class Config:
        from_attributes = True

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
    sender_id: str
    content: str
    type: str
    created_at: datetime
    attachments: List[ChatAttachmentSchema] = []
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    participant_one: str
    participant_two: str
    last_message: Optional[MessageResponse] = None
    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    group_name: str
    group_type: str
    class Config:
        from_attributes = True

# ==============================================================================
# 6. DONATION, PAYMENT & REFUND SCHEMAS
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
    samaj_id: Optional[str] = None
    purpose: str
    reference_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

class PaymentVerifyRequest(BaseModel):
    status: str  # COMPLETED or FAILED

class DonationResponse(BaseModel):
    category: str
    amount: float
    user: UserResponse
    payment: PaymentResponse
    class Config:
        from_attributes = True

class RefundResponse(BaseModel):
    payment_id: int
    refund_amount: float
    status: str
    class Config:
        from_attributes = True

# ==============================================================================
# 7. NOTIFICATIONS
# ==============================================================================

class NotificationResponse(BaseModel):
    title: str
    body: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True
