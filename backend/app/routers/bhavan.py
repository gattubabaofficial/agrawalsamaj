"""Public Bhavan API router.

Contains endpoints for public configuration, availability check, quote calculation,
published Terms & Conditions, WhatsApp OTP verification, and enquiry submission.

Data privacy guarantee: Zero leakage of internal rule names, priorities, or admin notes.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.bhavan import (
    BhavanAccommodationType, BhavanAmenity, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanPurpose,
    BhavanSettings, BhavanTermsVersion, EnquirySource, EnquiryStatus,
)
from app.services.bhavan_otp import (
    request_bhavan_otp, validate_enquiry_token, verify_bhavan_otp,
)
from app.services.bhavan_quote import calculate_quote, get_or_create_settings


router = APIRouter(prefix="/api/v1/bhavan", tags=["bhavan-public"])


# ─── Pydantic Request/Response Models (Strict Public Privacy) ────────────────

class PublicImageResponse(BaseModel):
    id: uuid.UUID
    path: str
    sort_order: int
    model_config = ConfigDict(from_attributes=True)


class PublicAccommodationTypeResponse(BaseModel):
    id: uuid.UUID
    name: str
    kind: str
    description: Optional[str] = None
    capacity_per_unit: int
    base_price_per_night: Decimal
    sort_order: int
    images: List[PublicImageResponse] = []
    model_config = ConfigDict(from_attributes=True)


class PublicAmenityResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    image_path: Optional[str] = None
    price: Decimal
    pricing_type: str
    sort_order: int
    model_config = ConfigDict(from_attributes=True)


class PublicPurposeResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int
    model_config = ConfigDict(from_attributes=True)


class PublicConfigResponse(BaseModel):
    accommodation_types: List[PublicAccommodationTypeResponse]
    amenities: List[PublicAmenityResponse]
    purposes: List[PublicPurposeResponse]
    min_nights: int
    contact_phone: Optional[str] = None
    intro_text: Optional[str] = None
    required_fields: dict = {}


class QuoteRequestItem(BaseModel):
    type_id: uuid.UUID
    quantity: int = Field(ge=1)


class QuoteAmenityRequestItem(BaseModel):
    amenity_id: uuid.UUID
    quantity: int = Field(ge=1)


class QuoteRequest(BaseModel):
    check_in: date
    check_out: date
    accommodations: List[QuoteRequestItem] = []
    amenities: List[QuoteAmenityRequestItem] = []
    purpose_id: Optional[uuid.UUID] = None
    guests_total: int = Field(default=1, ge=1)


class PublicAccommodationLine(BaseModel):
    type_id: uuid.UUID
    type_name: str
    quantity: int
    nights: int
    unit_price: Decimal
    line_total: Decimal


class PublicAmenityLine(BaseModel):
    amenity_id: uuid.UUID
    amenity_name: str
    pricing_type: str
    quantity: int
    unit_price: Decimal
    multiplier_description: str
    line_total: Decimal


class PublicQuoteResponse(BaseModel):
    check_in: date
    check_out: date
    nights: int
    days: int
    accommodations: List[PublicAccommodationLine]
    amenities: List[PublicAmenityLine]
    estimated_total: Decimal
    blockers: List[str]
    public_message: Optional[str] = None
    allowed_purpose_ids: Optional[List[str]] = None
    blocked_type_ids: Optional[List[str]] = None
    effective_type_prices: Optional[dict] = None  # type_id -> effective per-night price


class OTPRequestPayload(BaseModel):
    mobile: str


class OTPVerifyPayload(BaseModel):
    mobile: str
    otp: str


class EnquirySubmitRequest(BaseModel):
    check_in: date
    check_out: date
    purpose_id: Optional[uuid.UUID] = None
    full_name: str
    mobile: str
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    guests_total: int = Field(default=1, ge=1)
    adults: int = Field(default=1, ge=0)
    children: int = Field(default=0, ge=0)
    special_requirements: Optional[str] = None
    message: Optional[str] = None
    accommodations: List[QuoteRequestItem] = []
    amenities: List[QuoteAmenityRequestItem] = []
    terms_accepted: bool


class EnquirySubmitResponse(BaseModel):
    reference: str
    status: str
    message: str


# ─── Public Endpoints ─────────────────────────────────────────────────────────

@router.get("/config", response_model=PublicConfigResponse)
async def get_public_config(db: AsyncSession = Depends(get_db)):
    res_types = await db.execute(
        select(BhavanAccommodationType)
        .options(selectinload(BhavanAccommodationType.images))
        .where(
            BhavanAccommodationType.is_active == True,
            BhavanAccommodationType.allow_standalone_booking == True,
        )
        .order_by(BhavanAccommodationType.sort_order)
    )
    types = res_types.scalars().all()

    res_amenities = await db.execute(
        select(BhavanAmenity)
        .where(
            BhavanAmenity.is_active == True,
            BhavanAmenity.allow_standalone_booking == True,
        )
        .order_by(BhavanAmenity.sort_order)
    )
    amenities = res_amenities.scalars().all()

    res_purposes = await db.execute(
        select(BhavanPurpose)
        .where(BhavanPurpose.is_active == True)
        .order_by(BhavanPurpose.sort_order)
    )
    purposes = res_purposes.scalars().all()

    settings = await get_or_create_settings(db)

    return PublicConfigResponse(
        accommodation_types=types,
        amenities=amenities,
        purposes=purposes,
        min_nights=settings.default_min_nights,
        contact_phone=settings.contact_phone,
        intro_text=settings.intro_text,
        required_fields=settings.required_fields or {},
    )


@router.post("/quote", response_model=PublicQuoteResponse)
async def get_public_quote(req: QuoteRequest, db: AsyncSession = Depends(get_db)):
    res = await calculate_quote(
        db=db,
        check_in=req.check_in,
        check_out=req.check_out,
        requested_accommodations=[{"type_id": str(item.type_id), "quantity": item.quantity} for item in req.accommodations],
        requested_amenities=[{"amenity_id": str(item.amenity_id), "quantity": item.quantity} for item in req.amenities],
        purpose_id=req.purpose_id,
        guests_total=req.guests_total,
    )

    acc_lines = [
        PublicAccommodationLine(
            type_id=line.type_id,
            type_name=line.type_name,
            quantity=line.quantity,
            nights=line.nights,
            unit_price=line.unit_price,
            line_total=line.line_total,
        )
        for line in res.accommodations
    ]

    amen_lines = [
        PublicAmenityLine(
            amenity_id=line.amenity_id,
            amenity_name=line.amenity_name,
            pricing_type=line.pricing_type,
            quantity=line.quantity,
            unit_price=line.unit_price,
            multiplier_description=line.multiplier_description,
            line_total=line.line_total,
        )
        for line in res.amenities
    ]

    return PublicQuoteResponse(
        check_in=res.check_in,
        check_out=res.check_out,
        nights=res.nights,
        days=res.days,
        accommodations=acc_lines,
        amenities=amen_lines,
        estimated_total=res.estimated_total,
        blockers=res.blockers,
        public_message=res.public_message,
        allowed_purpose_ids=getattr(res, "allowed_purpose_ids", None),
        blocked_type_ids=getattr(res, "blocked_type_ids", None),
        effective_type_prices=getattr(res, "effective_type_prices", None),
    )




@router.get("/terms")
async def get_published_terms(db: AsyncSession = Depends(get_db)):
    res_terms = await db.execute(
        select(BhavanTermsVersion).where(BhavanTermsVersion.is_published == True)
    )
    terms = res_terms.scalar_one_or_none()

    if not terms:
        return {
            "version_label": "v1.0",
            "content": "### Bhavan Terms & Conditions\n\n1. All enquiries are subject to admin review and approval.\n2. Submitting an enquiry does not guarantee booking confirmation.\n3. Check-in time is 12:00 PM and check-out time is 11:00 AM.",
            "published_at": datetime.utcnow().isoformat(),
        }

    return {
        "id": str(terms.id),
        "version_label": terms.version_label,
        "content": terms.content,
        "published_at": terms.published_at.isoformat() if terms.published_at else None,
    }


@router.post("/otp/request")
async def send_otp(payload: OTPRequestPayload, db: AsyncSession = Depends(get_db)):
    return request_bhavan_otp(db, payload.mobile)


@router.post("/otp/verify")
async def verify_otp(payload: OTPVerifyPayload, db: AsyncSession = Depends(get_db)):
    return verify_bhavan_otp(db, payload.mobile, payload.otp)


@router.post("/enquiries", response_model=EnquirySubmitResponse)
async def submit_enquiry(
    req: EnquirySubmitRequest,
    x_verification_token: Optional[str] = Header(None, alias="X-Verification-Token"),
    db: AsyncSession = Depends(get_db),
):
    if not req.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms & Conditions to submit an enquiry.",
        )

    if not x_verification_token or not validate_enquiry_token(x_verification_token, req.mobile):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number verification required before submitting enquiry.",
        )

    quote_res = await calculate_quote(
        db=db,
        check_in=req.check_in,
        check_out=req.check_out,
        requested_accommodations=[{"type_id": str(item.type_id), "quantity": item.quantity} for item in req.accommodations],
        requested_amenities=[{"amenity_id": str(item.amenity_id), "quantity": item.quantity} for item in req.amenities],
        purpose_id=req.purpose_id,
        guests_total=req.guests_total,
    )

    if quote_res.blockers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to submit enquiry: {quote_res.blockers[0]}",
        )

    purpose_name = None
    if req.purpose_id:
        p_res = await db.execute(select(BhavanPurpose).where(BhavanPurpose.id == req.purpose_id))
        p_obj = p_res.scalar_one_or_none()
        if p_obj:
            purpose_name = p_obj.name

    t_res = await db.execute(
        select(BhavanTermsVersion).where(BhavanTermsVersion.is_published == True)
    )
    published_terms = t_res.scalar_one_or_none()

    year = datetime.utcnow().year
    ref_res = await db.execute(select(BhavanEnquiry))
    ref_count = len(ref_res.scalars().all())
    seq_num = ref_count + 1001
    reference = f"BV-{year}-{seq_num:05d}"

    enquiry = BhavanEnquiry(
        reference=reference,
        check_in=req.check_in,
        check_out=req.check_out,
        nights=quote_res.nights,
        purpose_id=req.purpose_id,
        purpose_name=purpose_name,
        full_name=req.full_name,
        mobile=req.mobile.strip(),
        whatsapp_number=req.whatsapp_number,
        email=req.email,
        address=req.address,
        city=req.city,
        state=req.state,
        guests_total=req.guests_total,
        adults=req.adults,
        children=req.children,
        special_requirements=req.special_requirements,
        message=req.message,
        status=EnquiryStatus.PENDING,
        source=EnquirySource.ONLINE,
        mobile_verified=True,
        verified_at=datetime.utcnow(),
        terms_version_id=published_terms.id if published_terms else None,
        terms_accepted=True,
        terms_accepted_at=datetime.utcnow(),
        quote_snapshot=quote_res.quote_snapshot,
        rules_snapshot=quote_res.rules_snapshot,
        estimated_total=quote_res.estimated_total,
    )
    db.add(enquiry)
    await db.flush()

    for line in quote_res.accommodations:
        enq_acc = BhavanEnquiryAccommodation(
            enquiry_id=enquiry.id,
            accommodation_type_id=line.type_id,
            type_name_snapshot=line.type_name,
            quantity=line.quantity,
            nights=line.nights,
            unit_price_snapshot=line.unit_price,
            line_total=line.line_total,
        )
        db.add(enq_acc)

    for line in quote_res.amenities:
        enq_amen = BhavanEnquiryAmenity(
            enquiry_id=enquiry.id,
            amenity_id=line.amenity_id,
            name_snapshot=line.amenity_name,
            pricing_type_snapshot=line.pricing_type,
            quantity=line.quantity,
            unit_price_snapshot=line.unit_price,
            line_total=line.line_total,
        )
        db.add(enq_amen)

    await db.commit()

    return EnquirySubmitResponse(
        reference=reference,
        status=EnquiryStatus.PENDING.value,
        message="Your Bhavan booking enquiry has been submitted successfully! An administrator will contact you shortly.",
    )
