"""Bhavan rule engine resolver.

Pure functional module — zero database I/O, zero network calls, zero side effects.
Takes pre-loaded assignment records (or dicts) and base inventory details, and
resolves effective day-by-day states (DayState) across a date range.

Layering order:
Rule assignments are processed in ascending order of `applied_at` (oldest first,
so newer assignments override older ones).
"""

import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Tuple


@dataclass(frozen=True)
class AccommodationTypeState:
    allowed: bool
    effective_price: Decimal


@dataclass(frozen=True)
class RuleConditions:
    min_nights: int = 1
    max_nights: Optional[int] = None
    min_units: int = 1
    max_units: Optional[int] = None
    min_guests: Optional[int] = None
    max_guests: Optional[int] = None
    advance_days: int = 0


@dataclass(frozen=True)
class DayState:
    date: date
    closed: bool
    accommodation: Dict[uuid.UUID, AccommodationTypeState]
    amenities: Dict[uuid.UUID, bool]
    conditions: RuleConditions
    allowed_purpose_ids: Optional[Set[uuid.UUID]]  # None means all purposes allowed
    public_message: Optional[str]
    source_assignment_ids: Tuple[uuid.UUID, ...]


@dataclass(frozen=True)
class BaseAccommodationType:
    id: uuid.UUID
    base_price: Decimal
    is_active: bool = True


@dataclass(frozen=True)
class BaseAmenity:
    id: uuid.UUID
    is_active: bool = True


def calculate_price(
    mode: str,
    value: Decimal,
    current_price: Decimal,
    base_price: Decimal,
    conflict_behaviour: str = "replace_base",
) -> Decimal:
    """Calculate price based on mode, value, pricing conflict behaviour."""
    starting_price = base_price if conflict_behaviour == "replace_base" else current_price

    if mode == "none" or mode is None:
        return current_price
    elif mode == "fixed":
        return max(Decimal("0.00"), value)
    elif mode == "increase_percent":
        adjustment = (starting_price * value) / Decimal("100")
        return max(Decimal("0.00"), starting_price + adjustment)
    elif mode == "increase_amount":
        return max(Decimal("0.00"), starting_price + value)
    elif mode == "discount_percent":
        discount = (starting_price * value) / Decimal("100")
        return max(Decimal("0.00"), starting_price - discount)
    elif mode == "discount_amount":
        return max(Decimal("0.00"), starting_price - value)

    return current_price


def resolve_day(
    target_date: date,
    base_types: List[BaseAccommodationType],
    base_amenities: List[BaseAmenity],
    default_conditions: RuleConditions,
    assignments_on_date: List[Dict[str, Any]],
) -> DayState:
    """Resolve a single day's state by applying assignments in applied_at order.

    assignments_on_date MUST be sorted by applied_at ASCENDING so newest rules
    are processed last and overwrite earlier ones.
    """
    closed = False

    type_allowed: Dict[uuid.UUID, bool] = {
        t.id: t.is_active for t in base_types
    }
    type_prices: Dict[uuid.UUID, Decimal] = {
        t.id: t.base_price for t in base_types
    }
    base_prices: Dict[uuid.UUID, Decimal] = {
        t.id: t.base_price for t in base_types
    }

    amenity_allowed: Dict[uuid.UUID, bool] = {
        a.id: a.is_active for a in base_amenities
    }

    min_nights = default_conditions.min_nights
    max_nights = default_conditions.max_nights
    min_units = default_conditions.min_units
    max_units = default_conditions.max_units
    min_guests = default_conditions.min_guests
    max_guests = default_conditions.max_guests
    advance_days = default_conditions.advance_days

    allowed_purpose_ids: Optional[Set[uuid.UUID]] = None
    public_message: Optional[str] = None
    applied_assignment_ids: List[uuid.UUID] = []

    for assignment in assignments_on_date:
        if not assignment.get("is_active", True):
            continue

        assignment_id = assignment.get("id")
        if assignment_id:
            applied_assignment_ids.append(uuid.UUID(str(assignment_id)))

        config = assignment.get("config", {})

        # 1. Availability
        avail = config.get("availability", {})
        if avail.get("closed", False):
            closed = True

        default_acc = avail.get("default_accommodation")
        if default_acc == "allowed":
            for tid in type_allowed:
                type_allowed[tid] = True
        elif default_acc == "blocked":
            for tid in type_allowed:
                type_allowed[tid] = False

        acc_overrides = avail.get("accommodation", {})
        for tid_str, status in acc_overrides.items():
            try:
                tid = uuid.UUID(str(tid_str))
                if tid in type_allowed:
                    type_allowed[tid] = (status == "allowed")
            except (ValueError, TypeError):
                pass

        default_amen = avail.get("default_amenities")
        if default_amen == "allowed":
            for aid in amenity_allowed:
                amenity_allowed[aid] = True
        elif default_amen == "blocked":
            for aid in amenity_allowed:
                amenity_allowed[aid] = False

        amen_overrides = avail.get("amenities", {})
        for aid_str, status in amen_overrides.items():
            try:
                aid = uuid.UUID(str(aid_str))
                if aid in amenity_allowed:
                    amenity_allowed[aid] = (status == "allowed")
            except (ValueError, TypeError):
                pass

        # 2. Pricing
        pricing = config.get("pricing", {})
        conflict_behaviour = pricing.get("conflict_behaviour", "replace_base")
        global_mode = pricing.get("mode", "none")
        global_val_raw = pricing.get("value", 0)
        global_val = Decimal(str(global_val_raw)) if global_val_raw is not None else Decimal(0)

        per_type = pricing.get("per_type", {})

        for tid in type_prices:
            tid_str = str(tid)
            if tid_str in per_type:
                t_mode = per_type[tid_str].get("mode", global_mode)
                t_val_raw = per_type[tid_str].get("value", global_val_raw)
                t_val = Decimal(str(t_val_raw)) if t_val_raw is not None else Decimal(0)
            else:
                t_mode = global_mode
                t_val = global_val

            if t_mode and t_mode != "none":
                type_prices[tid] = calculate_price(
                    mode=t_mode,
                    value=t_val,
                    current_price=type_prices[tid],
                    base_price=base_prices[tid],
                    conflict_behaviour=conflict_behaviour,
                )

        # 3. Conditions
        conds = config.get("conditions", {})
        if "min_nights" in conds and conds["min_nights"] is not None:
            min_nights = int(conds["min_nights"])
        if "max_nights" in conds and conds["max_nights"] is not None:
            max_nights = int(conds["max_nights"])
        if "min_units" in conds and conds["min_units"] is not None:
            min_units = int(conds["min_units"])
        if "max_units" in conds and conds["max_units"] is not None:
            max_units = int(conds["max_units"])
        if "min_guests" in conds and conds["min_guests"] is not None:
            min_guests = int(conds["min_guests"])
        if "max_guests" in conds and conds["max_guests"] is not None:
            max_guests = int(conds["max_guests"])
        if "advance_days" in conds and conds["advance_days"] is not None:
            advance_days = int(conds["advance_days"])

        # 4. Purposes
        purposes_cfg = config.get("purposes")
        if purposes_cfg is not None:
            p_default = purposes_cfg.get("default", "allowed")
            allowed_list = [uuid.UUID(str(pid)) for pid in purposes_cfg.get("allowed", [])]
            blocked_list = [uuid.UUID(str(pid)) for pid in purposes_cfg.get("blocked", [])]

            # Determine effective mode from intent:
            # - default == "blocked" → explicit whitelist
            # - default == "allowed" + both allowed_list AND blocked_list → old-format whitelist
            #   (admin explicitly chose which to allow; treat allowed_list as the whitelist)
            # - default == "allowed" + only blocked_list → deny those IDs (subtract)
            # - default == "allowed" + no blocked_list → no restriction

            is_whitelist_mode = (
                p_default == "blocked"
                or (allowed_list and blocked_list)  # old-format: both lists present = whitelist intent
            )

            if is_whitelist_mode:
                if allowed_purpose_ids is None:
                    # First restriction: set whitelist to allowed_list
                    allowed_purpose_ids = set(allowed_list)
                else:
                    # Stacking: intersect with previous allowed set
                    allowed_purpose_ids = allowed_purpose_ids.intersection(set(allowed_list))
            else:
                # Blacklist mode: default=allowed, only a blocked_list specified
                if blocked_list and allowed_purpose_ids is not None:
                    allowed_purpose_ids = allowed_purpose_ids - set(blocked_list)
                # If allowed_purpose_ids is None and only a blocked_list: cannot safely compute
                # the complement without the full universe — leave as None (no restriction)
                # This is only hit when admin blocks specific IDs without specifying any allowed ones,
                # which is an unusual/incomplete config. New frontend always uses whitelist mode.


        # 5. Public Message (Only if rule is publicly visible)
        if config.get("public_message") and assignment.get("is_public_visible", True):
            public_message = config["public_message"]


    acc_state: Dict[uuid.UUID, AccommodationTypeState] = {
        tid: AccommodationTypeState(
            allowed=(type_allowed[tid] if not closed else False),
            effective_price=type_prices[tid],
        )
        for tid in type_prices
    }

    cond_result = RuleConditions(
        min_nights=min_nights,
        max_nights=max_nights,
        min_units=min_units,
        max_units=max_units,
        min_guests=min_guests,
        max_guests=max_guests,
        advance_days=advance_days,
    )

    return DayState(
        date=target_date,
        closed=closed,
        accommodation=acc_state,
        amenities={aid: (amenity_allowed[aid] if not closed else False) for aid in amenity_allowed},
        conditions=cond_result,
        allowed_purpose_ids=allowed_purpose_ids,
        public_message=public_message,
        source_assignment_ids=tuple(applied_assignment_ids),
    )


def resolve_date_range(
    check_in: date,
    check_out: date,
    base_types: List[BaseAccommodationType],
    base_amenities: List[BaseAmenity],
    default_conditions: RuleConditions,
    assignments_by_date: Dict[date, List[Dict[str, Any]]],
) -> List[DayState]:
    """Resolve state for each night from check_in up to (check_out - 1 day)."""
    results: List[DayState] = []
    curr = check_in
    while curr < check_out:
        assignments = assignments_by_date.get(curr, [])
        sorted_assignments = sorted(
            assignments,
            key=lambda x: str(x.get("applied_at", ""))
        )
        day_state = resolve_day(
            target_date=curr,
            base_types=base_types,
            base_amenities=base_amenities,
            default_conditions=default_conditions,
            assignments_on_date=sorted_assignments,
        )
        results.append(day_state)
        curr += timedelta(days=1)

    return results
