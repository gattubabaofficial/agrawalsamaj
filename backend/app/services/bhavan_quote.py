"""Bhavan quote generation service.

Calculates line items, totals, and customer-safe public blockers based on effective day states
and committed inventory. Supports AsyncSession and Session.
"""

import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Union


from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, BhavanAccommodationType,
    BhavanAmenity, BhavanRuleAssignment, BhavanRuleAssignmentDate,
    BhavanSettings, BhavanVoucher,
)
from app.services.bhavan_availability import (
    get_accommodation_capacities, get_committed_accommodations,
    get_committed_amenities, get_effective_available_accommodations,
)
from app.services.bhavan_rules import (
    BaseAccommodationType, BaseAmenity, RuleConditions, resolve_date_range,
)


@dataclass
class AccommodationQuoteLine:
    type_id: uuid.UUID
    type_name: str
    quantity: int
    nights: int
    unit_price: Decimal
    line_total: Decimal


@dataclass
class AmenityQuoteLine:
    amenity_id: uuid.UUID
    amenity_name: str
    pricing_type: str
    quantity: int
    unit_price: Decimal
    multiplier_description: str
    line_total: Decimal


@dataclass
class QuoteResult:
    check_in: date
    check_out: date
    nights: int
    days: int
    accommodations: List[AccommodationQuoteLine]
    amenities: List[AmenityQuoteLine]
    estimated_total: Decimal
    blockers: List[str]
    public_message: Optional[str]
    subtotal: Decimal = Decimal("0.00")
    voucher_discount: Decimal = Decimal("0.00")
    applied_voucher: Optional[str] = None
    voucher_id: Optional[uuid.UUID] = None
    allowed_purpose_ids: Optional[List[str]] = None
    blocked_type_ids: Optional[List[str]] = None
    effective_type_prices: Optional[dict] = None  # type_id str -> Decimal price per night
    available_units: Optional[Dict[str, Optional[int]]] = None
    allocations: Optional[List[Dict[str, Any]]] = None
    rules_snapshot: dict = None
    quote_snapshot: dict = None


async def get_or_create_settings(db: Union[AsyncSession, Session]) -> BhavanSettings:
    if isinstance(db, AsyncSession):
        res = await db.execute(select(BhavanSettings))
        settings = res.scalar_one_or_none()
        if not settings:
            settings = BhavanSettings()
            db.add(settings)
            await db.commit()
            await db.refresh(settings)
    else:
        settings = db.execute(select(BhavanSettings)).scalar_one_or_none()
        if not settings:
            settings = BhavanSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
    return settings


def to_public_message(internal_code: str, extra: str = "") -> str:
    """Map internal blocker codes to clean customer-facing messages."""
    mapping = {
        "CLOSED": "The Bhavan is unavailable for the selected dates.",
        "MIN_NIGHTS": f"A minimum stay of {extra} night(s) is required for the selected dates.",
        "MAX_NIGHTS": f"A maximum stay of {extra} night(s) is allowed for the selected dates.",
        "MIN_UNITS": f"A minimum of {extra} unit(s) must be booked for the selected dates.",
        "MAX_UNITS": f"A maximum of {extra} unit(s) can be booked for the selected dates.",
        "PURPOSE_BLOCKED": "This type of event is not available for the selected dates.",
        "GUESTS_EXCEEDED": f"The selected accommodation holds up to {extra} guests. Please select more units or adjust guest count.",
        "INSUFFICIENT_STOCK": f"Requested quantity for {extra} exceeds available capacity for the selected dates.",
        "TYPE_NOT_ALLOWED": f"Selected accommodation ({extra}) is not available for the selected dates.",
        "AMENITY_NOT_ALLOWED": f"Selected facility ({extra}) is not available for the selected dates.",
    }
    return mapping.get(internal_code, extra or "The selected combination is unavailable.")


async def calculate_quote(
    db: Union[AsyncSession, Session],
    check_in: date,
    check_out: date,
    requested_accommodations: List[Dict[str, Any]],  # [{"type_id": UUID, "quantity": int}]
    requested_amenities: List[Dict[str, Any]],        # [{"amenity_id": UUID, "quantity": int}]
    purpose_id: Optional[uuid.UUID] = None,
    guests_total: int = 1,
    voucher_code: Optional[str] = None,
    voucher_id: Optional[uuid.UUID] = None,
    allocations: Optional[List[Dict[str, Any]]] = None,
    date_allocations: Optional[Dict[str, Any]] = None,
    date_amenity_allocations: Optional[Dict[str, Any]] = None,
) -> QuoteResult:
    nights = (check_out - check_in).days
    days = nights + 1 if nights > 0 else 0

    blockers: List[str] = []

    if check_out <= check_in:
        blockers.append("Check-out date must be after check-in date.")
        return QuoteResult(
            check_in=check_in, check_out=check_out, nights=0, days=0,
            accommodations=[], amenities=[], estimated_total=Decimal("0.00"),
            blockers=blockers, public_message=None, rules_snapshot={}, quote_snapshot={},
        )

    # 1. Fetch base types & amenities
    if isinstance(db, AsyncSession):
        res_types = await db.execute(
            select(BhavanAccommodationType).where(BhavanAccommodationType.is_active == True)
        )
        base_types_db = res_types.scalars().all()

        res_amen = await db.execute(
            select(BhavanAmenity).where(BhavanAmenity.is_active == True)
        )
        base_amenities_db = res_amen.scalars().all()
    else:
        base_types_db = db.execute(
            select(BhavanAccommodationType).where(BhavanAccommodationType.is_active == True)
        ).scalars().all()

        base_amenities_db = db.execute(
            select(BhavanAmenity).where(BhavanAmenity.is_active == True)
        ).scalars().all()

    settings = await get_or_create_settings(db)
    default_conds = RuleConditions(
        min_nights=settings.default_min_nights,
        max_nights=settings.default_max_nights,
        advance_days=settings.advance_booking_days,
    )

    base_types = [
        BaseAccommodationType(id=t.id, base_price=t.base_price_per_night, is_active=t.is_active)
        for t in base_types_db
    ]
    base_amenities = [
        BaseAmenity(id=a.id, is_active=a.is_active) for a in base_amenities_db
    ]

    type_map = {t.id: t for t in base_types_db}
    amenity_map = {a.id: a for a in base_amenities_db}

    # 2. Fetch active rule assignments covering [check_in, check_out)
    from app.models.bhavan import BhavanRuleProfile, RuleStatus
    from sqlalchemy.orm import selectinload

    stmt_dates = (
        select(BhavanRuleAssignmentDate.date, BhavanRuleAssignment)
        .join(BhavanRuleAssignment, BhavanRuleAssignmentDate.assignment_id == BhavanRuleAssignment.id)
        .options(selectinload(BhavanRuleAssignment.profile))
        .where(
            BhavanRuleAssignmentDate.date >= check_in,
            BhavanRuleAssignmentDate.date < check_out,
            BhavanRuleAssignment.is_active == True,
        )
    )
    if isinstance(db, AsyncSession):
        date_rows = (await db.execute(stmt_dates)).all()
    else:
        date_rows = db.execute(stmt_dates).all()

    assignments_by_date: Dict[date, List[Dict[str, Any]]] = {}
    for d, assignment in date_rows:
        if d not in assignments_by_date:
            assignments_by_date[d] = []
        is_pub = getattr(assignment.profile, "is_public_visible", True) if getattr(assignment, "profile", None) else True
        profile_cfg = getattr(assignment.profile, "config", {}) if getattr(assignment, "profile", None) else {}
        cfg = assignment.config_snapshot if (assignment.config_snapshot and assignment.config_snapshot != {}) else profile_cfg
        assignments_by_date[d].append({
            "id": str(assignment.id),
            "applied_at": assignment.applied_at.isoformat() if assignment.applied_at else "",
            "is_active": assignment.is_active,
            "is_public_visible": is_pub,
            "config": cfg or {},
        })

    # 2b. Fetch active Rule Profiles with NO assigned dates (Global Default Rules for ALL dates)
    stmt_unassigned_profiles = (
        select(BhavanRuleProfile)
        .where(
            BhavanRuleProfile.status == RuleStatus.ACTIVE,
            BhavanRuleProfile.is_template == False,
        )
    )
    if isinstance(db, AsyncSession):
        all_active_profiles = (await db.execute(stmt_unassigned_profiles)).scalars().all()
    else:
        all_active_profiles = db.execute(stmt_unassigned_profiles).scalars().all()

    # Find profiles that have 0 assignments
    stmt_assigned_profile_ids = select(BhavanRuleAssignment.profile_id).where(BhavanRuleAssignment.is_active == True)
    if isinstance(db, AsyncSession):
        assigned_pids = set((await db.execute(stmt_assigned_profile_ids)).scalars().all())
    else:
        assigned_pids = set(db.execute(stmt_assigned_profile_ids).scalars().all())

    all_date_profiles = [p for p in all_active_profiles if p.id not in assigned_pids]

    if all_date_profiles:
        curr_d = check_in
        while curr_d < check_out:
            if curr_d not in assignments_by_date:
                assignments_by_date[curr_d] = []
            for p in all_date_profiles:
                assignments_by_date[curr_d].append({
                    "id": str(p.id),
                    "applied_at": p.created_at.isoformat() if p.created_at else "",
                    "is_active": True,
                    "is_public_visible": getattr(p, "is_public_visible", True),
                    "config": p.config or {},
                })
            curr_d += timedelta(days=1)


    # 3. Resolve day states
    day_states = resolve_date_range(
        check_in=check_in,
        check_out=check_out,
        base_types=base_types,
        base_amenities=base_amenities,
        default_conditions=default_conds,
        assignments_by_date=assignments_by_date,
    )

    # 4. Global closure & public message
    public_message: Optional[str] = None
    for ds in day_states:
        if ds.public_message and not public_message:
            public_message = ds.public_message
        if ds.closed:
            blockers.append(to_public_message("CLOSED"))
            break

    # 5. Strictest conditions & purpose check
    strictest_min_nights = max((ds.conditions.min_nights for ds in day_states), default=1)
    strictest_min_units = max((ds.conditions.min_units for ds in day_states), default=1)

    if nights < strictest_min_nights:
        blockers.append(to_public_message("MIN_NIGHTS", str(strictest_min_nights)))

    total_requested_units = sum(int(req.get("quantity", 0)) for req in requested_accommodations)
    if date_allocations:
        date_units_sum = 0
        for val in date_allocations.values():
            if isinstance(val, dict):
                date_units_sum += sum(int(q) for q in val.values() if isinstance(q, (int, float, str)) and int(q) > 0)
            elif isinstance(val, (int, float, str)):
                date_units_sum += max(0, int(val))
        total_requested_units = max(total_requested_units, date_units_sum)
    elif allocations:
        alloc_units_sum = sum(int(a.get("rooms", 0)) for a in allocations)
        total_requested_units = max(total_requested_units, alloc_units_sum)

    if strictest_min_units > 1 and total_requested_units < strictest_min_units:
        blockers.append(to_public_message("MIN_UNITS", str(strictest_min_units)))
    elif total_requested_units > 0 and total_requested_units < strictest_min_units:
        blockers.append(to_public_message("MIN_UNITS", str(strictest_min_units)))

    effective_allowed_purposes: Optional[Set[str]] = None
    for ds in day_states:
        if ds.allowed_purpose_ids is not None:
            ds_purps = {str(pid) for pid in ds.allowed_purpose_ids}
            if effective_allowed_purposes is None:
                effective_allowed_purposes = set(ds_purps)
            else:
                effective_allowed_purposes = effective_allowed_purposes.intersection(ds_purps)

    allowed_purpose_list = list(effective_allowed_purposes) if effective_allowed_purposes is not None else None

    if purpose_id:
        for ds in day_states:
            if ds.allowed_purpose_ids is not None and purpose_id not in ds.allowed_purpose_ids:
                blockers.append(to_public_message("PURPOSE_BLOCKED"))
                break


    # Compute which accommodation types are blocked on any selected night
    blocked_type_ids: List[str] = []
    for bt in base_types:
        for ds in day_states:
            st = ds.accommodation.get(bt.id)
            if not st or not st.allowed:
                blocked_type_ids.append(str(bt.id))
                break  # enough to know it's blocked on at least one night

    # Compute effective per-night prices per type (max across selected nights, reflects rules)
    # Use MAX instead of avg so rule-adjusted nights show their price correctly
    effective_type_prices: dict = {}
    for bt in base_types:
        max_price = Decimal("0.00")
        for ds in day_states:
            st = ds.accommodation.get(bt.id)
            night_p = st.effective_price if st else bt.base_price
            if night_p > max_price:
                max_price = night_p
        # Fall back to base price if max is still 0
        if max_price == Decimal("0.00"):
            max_price = bt.base_price
        effective_type_prices[str(bt.id)] = str(max_price)

    # 6. Availability & stock check

    unit_capacities = await get_accommodation_capacities(db)
    committed_acc = await get_committed_accommodations(db, check_in, check_out, types_map=type_map)
    committed_amen = await get_committed_amenities(db, check_in, check_out)
    effective_avail_acc = await get_effective_available_accommodations(
        db, check_in, check_out, capacities=unit_capacities, committed=committed_acc, types_map=type_map
    )
    available_units_dict: Dict[str, Optional[int]] = {str(tid): count for tid, count in effective_avail_acc.items()}

    total_guest_capacity = 0

    # Build date-wise allocation map for any accommodation type if provided
    # Structure: Dict[date, Dict[UUID, int]]
    date_type_alloc_map: Dict[date, Dict[uuid.UUID, int]] = {}
    if date_allocations:
        for d_k, val in date_allocations.items():
            try:
                d_obj = date.fromisoformat(str(d_k)) if isinstance(d_k, str) else d_k
                if isinstance(val, dict):
                    for t_k, q_v in val.items():
                        try:
                            t_uuid = uuid.UUID(str(t_k))
                            date_type_alloc_map.setdefault(d_obj, {})[t_uuid] = int(q_v)
                        except Exception:
                            continue
                else:
                    # Flat integer room count (legacy support)
                    r_count = int(val)
                    if base_types:
                        primary_id = base_types[0].id
                        date_type_alloc_map.setdefault(d_obj, {})[primary_id] = r_count
            except Exception:
                continue
    elif allocations:
        for alloc in allocations:
            try:
                from_raw = alloc.get("from") or alloc.get("from_date")
                to_raw = alloc.get("to") or alloc.get("to_date")
                from_d = date.fromisoformat(str(from_raw)) if isinstance(from_raw, str) else from_raw
                to_d = date.fromisoformat(str(to_raw)) if isinstance(to_raw, str) else to_raw
                r_count = int(alloc.get("rooms", alloc.get("requestedRooms", alloc.get("requested_rooms", 0))))
                tid_raw = alloc.get("type_id")
                t_uuid = uuid.UUID(str(tid_raw)) if tid_raw else (base_types[0].id if base_types else None)
                if t_uuid:
                    cur_d = from_d
                    while cur_d <= to_d:
                        date_type_alloc_map.setdefault(cur_d, {})[t_uuid] = r_count
                        cur_d += timedelta(days=1)
            except Exception:
                continue

    total_guest_capacity = 0
    acc_quote_lines: List[AccommodationQuoteLine] = []
    estimated_total = Decimal("0.00")
    computed_allocations: List[Dict[str, Any]] = []

    # Determine which accommodation types need to be processed
    if date_type_alloc_map:
        # Collect all type IDs that have at least 1 unit requested on any date
        active_type_ids_set = set()
        for d_obj, types_in_date in date_type_alloc_map.items():
            for tid_item, qty_item in types_in_date.items():
                if qty_item > 0:
                    active_type_ids_set.add(tid_item)
        
        # If no types have qty > 0, fallback to requested_accommodations or primary type with 0
        if not active_type_ids_set and requested_accommodations:
            for req in requested_accommodations:
                try:
                    active_type_ids_set.add(uuid.UUID(str(req["type_id"])))
                except Exception:
                    pass

        effective_req_accommodations = [
            {"type_id": str(tid), "quantity": max((date_type_alloc_map.get(d, {}).get(tid, 0) for d in date_type_alloc_map), default=0)}
            for tid in active_type_ids_set
        ]
    else:
        effective_req_accommodations = list(requested_accommodations)

    for req in effective_req_accommodations:
        try:
            tid = uuid.UUID(str(req["type_id"]))
        except Exception:
            continue
        base_qty = int(req.get("quantity", 0))

        if tid not in type_map:
            continue

        acc_type = type_map[tid]

        for ds in day_states:
            st = ds.accommodation.get(tid)
            if not st or not st.allowed:
                blockers.append(to_public_message("TYPE_NOT_ALLOWED", acc_type.name))
                break

        total_units = unit_capacities.get(tid, 0)
        type_best_price_str = effective_type_prices.get(str(tid))
        type_best_price = Decimal(str(type_best_price_str)) if type_best_price_str else acc_type.base_price_per_night

        acc_total_price = Decimal("0.00")
        total_room_nights = 0
        min_night_qty = None
        max_night_qty = 0

        # Day by day stock & price accumulation for this type
        for ds in day_states:
            st = ds.accommodation.get(tid)
            night_price = st.effective_price if st else acc_type.base_price_per_night
            if night_price == Decimal("0.00") and type_best_price > Decimal("0.00"):
                night_price = type_best_price

            if date_type_alloc_map:
                night_qty = date_type_alloc_map.get(ds.date, {}).get(tid, 0)
            else:
                night_qty = base_qty

            max_night_qty = max(max_night_qty, night_qty)
            min_night_qty = night_qty if min_night_qty is None else min(min_night_qty, night_qty)

            if total_units > 0 and night_qty > 0:
                committed = committed_acc.get(ds.date, {}).get(tid, 0)
                avail_units = max(0, total_units - committed)
                if night_qty > avail_units:
                    blockers.append(
                        f"Requested {acc_type.name} ({night_qty}) exceeds available capacity ({avail_units}) on {ds.date.strftime('%b %d')}."
                    )

            acc_total_price += night_price * night_qty
            total_room_nights += night_qty

        # Skip if zero units requested across all nights
        if total_room_nights == 0 and date_type_alloc_map:
            continue

        # Build clean allocation groups for reporting
        if day_states:
            cur_group_start = day_states[0].date
            cur_group_qty = date_type_alloc_map.get(cur_group_start, {}).get(tid, base_qty) if date_type_alloc_map else base_qty
            cur_min_avail = total_units - committed_acc.get(cur_group_start, {}).get(tid, 0) if total_units > 0 else 999
            cur_group_cost = Decimal("0.00")
            cur_nights = 0

            for idx, ds in enumerate(day_states):
                n_qty = date_type_alloc_map.get(ds.date, {}).get(tid, base_qty) if date_type_alloc_map else base_qty
                d_avail = max(0, total_units - committed_acc.get(ds.date, {}).get(tid, 0)) if total_units > 0 else 999
                st = ds.accommodation.get(tid)
                n_price = st.effective_price if st else acc_type.base_price_per_night
                if n_price == Decimal("0.00") and type_best_price > Decimal("0.00"):
                    n_price = type_best_price

                if n_qty == cur_group_qty:
                    cur_nights += 1
                    cur_min_avail = min(cur_min_avail, d_avail)
                    cur_group_cost += n_price * n_qty
                else:
                    # Flush previous group
                    prev_end = day_states[idx - 1].date
                    if cur_group_qty > 0:
                        computed_allocations.append({
                            "from": cur_group_start.isoformat(),
                            "to": prev_end.isoformat(),
                            "rooms": cur_group_qty,
                            "max_available": max(0, cur_min_avail) if total_units > 0 else None,
                            "nights": cur_nights,
                            "line_total": str(cur_group_cost),
                            "type_id": str(tid),
                            "type_name": acc_type.name,
                        })
                    cur_group_start = ds.date
                    cur_group_qty = n_qty
                    cur_min_avail = d_avail
                    cur_group_cost = n_price * n_qty
                    cur_nights = 1

            if cur_nights > 0 and cur_group_qty > 0:
                computed_allocations.append({
                    "from": cur_group_start.isoformat(),
                    "to": day_states[-1].date.isoformat(),
                    "rooms": cur_group_qty,
                    "max_available": max(0, cur_min_avail) if total_units > 0 else None,
                    "nights": cur_nights,
                    "line_total": str(cur_group_cost),
                    "type_id": str(tid),
                    "type_name": acc_type.name,
                })

        unit_price_avg = acc_total_price / Decimal(str(total_room_nights)) if total_room_nights > 0 else type_best_price

        acc_quote_lines.append(AccommodationQuoteLine(
            type_id=tid,
            type_name=acc_type.name,
            quantity=max_night_qty if date_type_alloc_map else base_qty,
            nights=nights,
            unit_price=unit_price_avg,
            line_total=acc_total_price,
        ))
        estimated_total += acc_total_price

        cap_per_unit = acc_type.capacity_per_unit
        effective_allocated_units = max_night_qty if date_type_alloc_map else base_qty
        total_guest_capacity += (cap_per_unit * effective_allocated_units)

    if guests_total > 0 and total_guest_capacity < guests_total and acc_quote_lines:
        blockers.append(to_public_message("GUESTS_EXCEEDED", str(total_guest_capacity)))

    # 7. Amenity Quote Lines
    # Build a map of requested amenities (from date_amenity_allocations or flat requested_amenities)
    date_amenity_alloc_map: Dict[date, Dict[uuid.UUID, int]] = {}
    if date_amenity_allocations and isinstance(date_amenity_allocations, dict):
        for d_str, a_map in date_amenity_allocations.items():
            try:
                d_obj = date.fromisoformat(str(d_str)) if isinstance(d_str, str) else d_str
                date_amenity_alloc_map[d_obj] = {}
                if isinstance(a_map, dict):
                    for aid_str, q in a_map.items():
                        try:
                            aid_obj = uuid.UUID(str(aid_str))
                            date_amenity_alloc_map[d_obj][aid_obj] = int(q)
                        except Exception:
                            pass
            except Exception:
                pass

    req_amenity_dict: Dict[uuid.UUID, int] = {}
    if date_amenity_alloc_map:
        active_amen_ids: Set[uuid.UUID] = set()
        for d_obj, a_dict in date_amenity_alloc_map.items():
            for aid_obj, q in a_dict.items():
                if q > 0:
                    active_amen_ids.add(aid_obj)
        for aid_obj in active_amen_ids:
            max_q = max((date_amenity_alloc_map.get(d, {}).get(aid_obj, 0) for d in date_amenity_alloc_map), default=0)
            if max_q > 0:
                req_amenity_dict[aid_obj] = max_q
    else:
        for req in requested_amenities:
            try:
                aid = uuid.UUID(str(req["amenity_id"]))
                qty = int(req.get("quantity", 1))
                if qty > 0:
                    req_amenity_dict[aid] = qty
            except (ValueError, KeyError):
                continue

    # Automatically add active compulsory amenities if not explicitly provided
    for aid, amenity in amenity_map.items():
        if getattr(amenity, "is_compulsory", False) and aid not in req_amenity_dict:
            req_amenity_dict[aid] = 1

    amenity_quote_lines: List[AmenityQuoteLine] = []
    for aid, qty in req_amenity_dict.items():
        if aid not in amenity_map:
            continue

        amenity = amenity_map[aid]

        for ds in day_states:
            if not ds.amenities.get(aid, True):
                blockers.append(to_public_message("AMENITY_NOT_ALLOWED", amenity.name))
                break

        ptype = amenity.pricing_type
        ptype_str = ptype.value if hasattr(ptype, "value") else str(ptype)
        price = amenity.price
        billing_days = max(nights, 1)

        if date_amenity_alloc_map:
            amenity_total_cost = Decimal("0.00")
            total_amenity_units_across_days = 0
            for ds in day_states:
                day_qty = date_amenity_alloc_map.get(ds.date, {}).get(aid, 0)
                if amenity.available_quantity is not None and not amenity.allow_over_request:
                    committed = committed_amen.get(ds.date, {}).get(aid, 0)
                    avail_stock = amenity.available_quantity - committed
                    if day_qty > avail_stock:
                        blockers.append(
                            f"Requested {amenity.name} ({day_qty}) exceeds available stock ({avail_stock}) on {ds.date.strftime('%b %d')}."
                        )

                if ptype_str in ("per_booking", "one_time"):
                    pass
                else:
                    amenity_total_cost += price * Decimal(str(day_qty))
                    total_amenity_units_across_days += day_qty

            if ptype_str in ("per_booking", "one_time"):
                max_q = max((date_amenity_alloc_map.get(ds.date, {}).get(aid, 0) for ds in day_states), default=0)
                line_total = price * Decimal(str(max_q))
                desc = f"{max_q} unit(s) · Flat charge · ₹{price}"
            else:
                line_total = amenity_total_cost
                desc = f"{total_amenity_units_across_days} total unit-day(s) (@ ₹{price}/day)"

            if line_total == 0 and total_amenity_units_across_days == 0 and ptype_str not in ("per_booking", "one_time"):
                continue
        else:
            if amenity.available_quantity is not None and not amenity.allow_over_request:
                for ds in day_states:
                    committed = committed_amen.get(ds.date, {}).get(aid, 0)
                    avail_stock = amenity.available_quantity - committed
                    if qty > avail_stock:
                        blockers.append(to_public_message("INSUFFICIENT_STOCK", amenity.name))
                        break

            if ptype_str in ("per_booking", "one_time"):
                line_total = price * qty
                desc = f"{qty} unit(s) · Flat charge · ₹{price}"
            else:
                line_total = price * qty * Decimal(str(billing_days))
                desc = f"{qty} unit(s) · {billing_days} day(s) · ₹{price}/day"

        amenity_quote_lines.append(AmenityQuoteLine(
            amenity_id=aid,
            amenity_name=amenity.name,
            pricing_type=ptype_str,
            quantity=qty,
            unit_price=price,
            multiplier_description=desc,
            line_total=line_total,
        ))
        estimated_total += line_total

    acc_subtotal = sum(line.line_total for line in acc_quote_lines)
    amenity_subtotal = sum(line.line_total for line in amenity_quote_lines)
    subtotal = acc_subtotal + amenity_subtotal
    voucher_discount = Decimal("0.00")
    applied_voucher_code = None
    applied_voucher_id = None

    target_voucher = None
    if voucher_id or voucher_code:
        stmt_v = select(BhavanVoucher).where(BhavanVoucher.is_active == True)
        if voucher_id:
            stmt_v = stmt_v.where(BhavanVoucher.id == voucher_id)
        elif voucher_code:
            stmt_v = stmt_v.where(BhavanVoucher.code == voucher_code.strip().upper())

        if isinstance(db, AsyncSession):
            target_voucher = (await db.execute(stmt_v)).scalar_one_or_none()
        else:
            target_voucher = db.execute(stmt_v).scalar_one_or_none()

    if target_voucher:
        # Check if target_voucher is blocked by any active rule config on these stay dates
        is_blocked_by_rule = False
        target_v_id_str = str(target_voucher.id)
        target_v_code = target_voucher.code.strip().upper()

        for d_assignments in assignments_by_date.values():
            for a in d_assignments:
                cfg = a.get("config") or {}
                blocked_list = cfg.get("blocked_vouchers") or []
                blocked_normalized = [str(x).strip().upper() for x in blocked_list]
                if target_v_id_str.upper() in blocked_normalized or target_v_code in blocked_normalized:
                    is_blocked_by_rule = True
                    break
            if is_blocked_by_rule:
                break

        if is_blocked_by_rule:
            blockers.append(f"Voucher '{target_voucher.code}' cannot be applied during the selected peak/event dates.")
        elif target_voucher.min_booking_amount and subtotal < target_voucher.min_booking_amount:
            blockers.append(f"Voucher '{target_voucher.code}' requires a minimum booking subtotal of ₹{target_voucher.min_booking_amount}")
        elif acc_subtotal <= Decimal("0.00"):
            blockers.append(f"Voucher '{target_voucher.code}' applies only on accommodation/room bookings.")
        else:
            # Discount strictly applies to accommodation/room charges only
            if target_voucher.discount_type == "percentage":
                disc = (acc_subtotal * target_voucher.discount_value) / Decimal("100.00")
                if target_voucher.max_discount_amount and disc > target_voucher.max_discount_amount:
                    disc = target_voucher.max_discount_amount
                voucher_discount = disc.quantize(Decimal("0.01"))
            else:
                voucher_discount = min(target_voucher.discount_value, acc_subtotal).quantize(Decimal("0.01"))

            estimated_total = max(Decimal("0.00"), (acc_subtotal - voucher_discount) + amenity_subtotal)
            applied_voucher_code = target_voucher.code
            applied_voucher_id = target_voucher.id

    rules_snapshot = {
        str(ds.date): [str(aid) for aid in ds.source_assignment_ids]
        for ds in day_states
    }

    quote_snapshot = {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "nights": nights,
        "days": days,
        "subtotal": str(subtotal),
        "voucher_discount": str(voucher_discount),
        "applied_voucher": applied_voucher_code,
        "estimated_total": str(estimated_total),
        "accommodations": [
            {
                "type_id": str(line.type_id),
                "type_name": line.type_name,
                "quantity": line.quantity,
                "nights": line.nights,
                "unit_price": str(line.unit_price),
                "line_total": str(line.line_total),
            }
            for line in acc_quote_lines
        ],
        "amenities": [
            {
                "amenity_id": str(line.amenity_id),
                "amenity_name": line.amenity_name,
                "pricing_type": line.pricing_type,
                "quantity": line.quantity,
                "unit_price": str(line.unit_price),
                "line_total": str(line.line_total),
            }
            for line in amenity_quote_lines
        ],
        "allocations": computed_allocations if computed_allocations else None,
        "date_allocations": {
            str(k): {str(tid): q for tid, q in type_dict.items()}
            for k, type_dict in date_type_alloc_map.items()
        } if date_type_alloc_map else None,
    }

    return QuoteResult(
        check_in=check_in,
        check_out=check_out,
        nights=nights,
        days=days,
        accommodations=acc_quote_lines,
        amenities=amenity_quote_lines,
        estimated_total=estimated_total,
        subtotal=subtotal,
        voucher_discount=voucher_discount,
        applied_voucher=applied_voucher_code,
        voucher_id=applied_voucher_id,
        blockers=list(dict.fromkeys(blockers)),
        public_message=public_message,
        allowed_purpose_ids=allowed_purpose_list,
        blocked_type_ids=blocked_type_ids if blocked_type_ids else None,
        effective_type_prices=effective_type_prices if effective_type_prices else None,
        available_units=available_units_dict,
        allocations=computed_allocations if computed_allocations else None,
        rules_snapshot=rules_snapshot,
        quote_snapshot=quote_snapshot,
    )



