"""Public Bhavan API router.

Contains endpoints for public configuration, availability check, quote calculation,
published Terms & Conditions, WhatsApp OTP verification, and enquiry submission.

Data privacy guarantee: Zero leakage of internal rule names, priorities, or admin notes.
"""

import uuid
import calendar as py_calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.bhavan import (
    BhavanAccommodationType, BhavanAmenity, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanPurpose,
    BhavanRuleAssignment, BhavanRuleAssignmentDate,
    BhavanSettings, BhavanTermsVersion, BhavanVoucher, EnquirySource, EnquiryStatus,
)
from app.services.bhavan_availability import (
    get_accommodation_capacities, get_committed_accommodations,
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
    total_units: Optional[int] = None
    images: List[PublicImageResponse] = []
    model_config = ConfigDict(from_attributes=True)


class PublicAmenityResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    image_path: Optional[str] = None
    price: Decimal
    pricing_type: str
    available_quantity: Optional[int] = None
    allow_over_request: bool = False
    is_compulsory: bool = False
    sort_order: int
    model_config = ConfigDict(from_attributes=True)


class PublicPurposeResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int
    model_config = ConfigDict(from_attributes=True)


class PublicVoucherResponse(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    discount_type: str
    discount_value: Decimal
    min_booking_amount: Optional[Decimal] = None
    max_discount_amount: Optional[Decimal] = None
    model_config = ConfigDict(from_attributes=True)


class PublicConfigResponse(BaseModel):
    accommodation_types: List[PublicAccommodationTypeResponse]
    amenities: List[PublicAmenityResponse]
    purposes: List[PublicPurposeResponse]
    vouchers: List[PublicVoucherResponse] = []
    min_nights: int
    contact_phone: Optional[str] = None
    intro_text: Optional[str] = None
    required_fields: dict = {}


class DateAllocationRange(BaseModel):
    from_date: date = Field(alias="from")
    to_date: date = Field(alias="to")
    rooms: int = Field(ge=0)
    max_available: Optional[int] = None
    nights: Optional[int] = None
    line_total: Optional[str] = None
    type_id: Optional[uuid.UUID] = None
    type_name: Optional[str] = None
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


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
    voucher_code: Optional[str] = None
    voucher_id: Optional[uuid.UUID] = None
    allocations: Optional[List[DateAllocationRange]] = None
    date_allocations: Optional[Dict[str, Any]] = None
    date_amenity_allocations: Optional[Dict[str, Any]] = None


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
    subtotal: Optional[Decimal] = None
    voucher_discount: Optional[Decimal] = None
    applied_voucher: Optional[str] = None
    estimated_total: Decimal
    blockers: List[str]
    public_message: Optional[str] = None
    allowed_purpose_ids: Optional[List[str]] = None
    blocked_type_ids: Optional[List[str]] = None
    effective_type_prices: Optional[dict] = None
    available_units: Optional[Dict[str, Optional[int]]] = None
    allocations: Optional[List[dict]] = None
    date_allocations: Optional[Dict[str, Any]] = None
    date_amenity_allocations: Optional[Dict[str, Any]] = None


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
    voucher_code: Optional[str] = None
    voucher_id: Optional[uuid.UUID] = None
    allocations: Optional[List[DateAllocationRange]] = None
    date_allocations: Optional[Dict[str, Any]] = None
    date_amenity_allocations: Optional[Dict[str, Any]] = None
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
        )
        .order_by(BhavanAccommodationType.sort_order)
    )
    types = res_types.scalars().all()

    res_amenities = await db.execute(
        select(BhavanAmenity)
        .where(
            BhavanAmenity.is_active == True,
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

    res_vouchers = await db.execute(
        select(BhavanVoucher)
        .where(BhavanVoucher.is_active == True)
        .order_by(BhavanVoucher.sort_order.asc(), BhavanVoucher.title.asc())
    )
    vouchers = res_vouchers.scalars().all()

    capacities = await get_accommodation_capacities(db)
    for t in types:
        t.total_units = capacities.get(t.id)

    settings = await get_or_create_settings(db)

    return PublicConfigResponse(
        accommodation_types=types,
        amenities=amenities,
        purposes=purposes,
        vouchers=vouchers,
        min_nights=settings.default_min_nights,
        contact_phone=settings.contact_phone,
        intro_text=settings.intro_text,
        required_fields=settings.required_fields or {},
    )


@router.post("/quote", response_model=PublicQuoteResponse)
async def get_public_quote(req: QuoteRequest, db: AsyncSession = Depends(get_db)):
    alloc_list = None
    if req.allocations:
        alloc_list = [
            {
                "from": item.from_date.isoformat(),
                "to": item.to_date.isoformat(),
                "rooms": item.rooms,
                "type_id": str(item.type_id) if item.type_id else None,
                "max_available": item.max_available,
            }
            for item in req.allocations
        ]

    res = await calculate_quote(
        db=db,
        check_in=req.check_in,
        check_out=req.check_out,
        requested_accommodations=[{"type_id": str(item.type_id), "quantity": item.quantity} for item in req.accommodations],
        requested_amenities=[{"amenity_id": str(item.amenity_id), "quantity": item.quantity} for item in req.amenities],
        purpose_id=req.purpose_id,
        guests_total=req.guests_total,
        voucher_code=req.voucher_code,
        voucher_id=req.voucher_id,
        allocations=alloc_list,
        date_allocations=req.date_allocations,
        date_amenity_allocations=req.date_amenity_allocations,
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
        subtotal=res.subtotal,
        voucher_discount=res.voucher_discount,
        applied_voucher=res.applied_voucher,
        estimated_total=res.estimated_total,
        blockers=res.blockers,
        public_message=res.public_message,
        allowed_purpose_ids=getattr(res, "allowed_purpose_ids", None),
        blocked_type_ids=getattr(res, "blocked_type_ids", None),
        effective_type_prices=getattr(res, "effective_type_prices", None),
        available_units=getattr(res, "available_units", None),
        allocations=res.allocations,
        date_allocations=req.date_allocations,
        date_amenity_allocations=req.date_amenity_allocations,
    )


@router.get("/calendar")
async def get_public_calendar(
    month: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    if start_date and end_date:
        start = start_date
        end = end_date
    elif month:
        try:
            parts = month.strip().split("-")
            year, m = int(parts[0]), int(parts[1])
            _, last_day = py_calendar.monthrange(year, m)
            start = date(year, m, 1)
            end = date(year, m, last_day)
        except Exception:
            start = date(today.year, today.month, 1)
            _, last_day = py_calendar.monthrange(today.year, today.month)
            end = date(today.year, today.month, last_day)
    else:
        start = date(today.year, today.month, 1)
        end = today + timedelta(days=60)

    # 1. Fetch accommodation types
    res_types = await db.execute(
        select(BhavanAccommodationType)
        .where(BhavanAccommodationType.is_active == True)
        .order_by(BhavanAccommodationType.sort_order)
    )
    types = res_types.scalars().all()
    unit_capacities = await get_accommodation_capacities(db)

    # 2. Fetch committed units from approved enquiries
    committed_acc = await get_committed_accommodations(db, start, end + timedelta(days=1))

    # 3. Fetch active rule assignments
    stmt_dates = (
        select(BhavanRuleAssignmentDate.date, BhavanRuleAssignment)
        .join(BhavanRuleAssignment, BhavanRuleAssignmentDate.assignment_id == BhavanRuleAssignment.id)
        .where(
            BhavanRuleAssignment.is_active == True,
            BhavanRuleAssignmentDate.date >= start,
            BhavanRuleAssignmentDate.date <= end,
        )
        .order_by(BhavanRuleAssignmentDate.date, BhavanRuleAssignment.applied_at.asc())
    )
    res_rules = await db.execute(stmt_dates)
    rule_rows = res_rules.all()

    rules_by_date: Dict[date, List[BhavanRuleAssignment]] = {}
    for r_date, assignment in rule_rows:
        rules_by_date.setdefault(r_date, []).append(assignment)

    days_result = []
    curr = start
    while curr <= end:
        date_str = curr.isoformat()
        is_past = curr < today

        # Check rule assignments for this date
        day_rules = rules_by_date.get(curr, [])
        is_closed = False
        blocked_types = set()
        price_overrides = {}
        closure_msg = None

        for a in day_rules:
            cfg = a.config_snapshot or {}
            if cfg.get("is_closure") or cfg.get("availability", {}).get("closed"):
                is_closed = True
                closure_msg = cfg.get("block_reason") or "Bhavan is closed on this date."

            avail_acc = cfg.get("availability", {}).get("accommodation", {})
            for tid_str, status_val in avail_acc.items():
                if status_val == "blocked":
                    blocked_types.add(tid_str)
                elif status_val == "allowed" and tid_str in blocked_types:
                    blocked_types.remove(tid_str)

            pricing_map = cfg.get("accommodations", {})
            for tid_str, t_cfg in pricing_map.items():
                if isinstance(t_cfg, dict) and "price" in t_cfg:
                    price_overrides[tid_str] = Decimal(str(t_cfg["price"]))

        # Build room types availability for this date
        total_rooms_avail = 0
        total_rooms_cap = 0
        room_types_info = []
        lowest_price = None

        for t in types:
            tid_str = str(t.id)
            total_cap = unit_capacities.get(t.id) if t.id in unit_capacities else 10
            committed_qty = committed_acc.get(curr, {}).get(t.id, 0)
            avail_units = max(0, total_cap - committed_qty) if total_cap > 0 else 0
            is_allowed = not is_closed and tid_str not in blocked_types
            effective_price = price_overrides.get(tid_str, t.base_price_per_night)

            if is_allowed and avail_units > 0:
                total_rooms_avail += avail_units
                if lowest_price is None or effective_price < lowest_price:
                    lowest_price = effective_price

            total_rooms_cap += total_cap

            room_types_info.append({
                "type_id": tid_str,
                "name": t.name,
                "kind": t.kind,
                "total_units": total_cap,
                "available_units": avail_units if is_allowed else 0,
                "is_allowed": is_allowed,
                "price": float(effective_price),
            })

        # Calculate overall day status
        if is_closed:
            day_status = "closed"
        elif is_past:
            day_status = "past"
        elif total_rooms_avail == 0:
            day_status = "sold_out"
        elif total_rooms_avail <= 2:
            day_status = "limited"
        else:
            day_status = "available"

        days_result.append({
            "date": date_str,
            "status": day_status,
            "closed": is_closed,
            "is_past": is_past,
            "closure_reason": closure_msg,
            "available_rooms": total_rooms_avail,
            "total_rooms": total_rooms_cap,
            "min_price": float(lowest_price) if lowest_price is not None else float(types[0].base_price_per_night if types else 0),
            "room_types": room_types_info,
        })

        curr += timedelta(days=1)

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "days": days_result,
    }


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

    alloc_list = None
    if req.allocations:
        alloc_list = [
            {
                "from": item.from_date.isoformat(),
                "to": item.to_date.isoformat(),
                "rooms": item.rooms,
                "type_id": str(item.type_id) if item.type_id else None,
                "max_available": item.max_available,
            }
            for item in req.allocations
        ]

    quote_res = await calculate_quote(
        db=db,
        check_in=req.check_in,
        check_out=req.check_out,
        requested_accommodations=[{"type_id": str(item.type_id), "quantity": item.quantity} for item in req.accommodations],
        requested_amenities=[{"amenity_id": str(item.amenity_id), "quantity": item.quantity} for item in req.amenities],
        purpose_id=req.purpose_id,
        guests_total=req.guests_total,
        voucher_code=req.voucher_code,
        voucher_id=req.voucher_id,
        allocations=alloc_list,
        date_allocations=req.date_allocations,
        date_amenity_allocations=req.date_amenity_allocations,
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
