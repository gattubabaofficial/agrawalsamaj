"""Bhavan availability calculation service.

Counts total available units per accommodation type and calculates committed
inventory from APPROVED enquiries across requested date ranges.
Supports composite unit packages (e.g., Package with 3 AC Rooms + 1 Kitchen + 1 Hall)
and automatically deducts component inventory.
Supports AsyncSession and Session.
"""

import math
import uuid
from datetime import date, timedelta
from typing import Dict, List, Set, Union, Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    BhavanAccommodationType, BhavanAmenity, BhavanEnquiry,
    BhavanEnquiryAccommodation, BhavanEnquiryAmenity, BhavanUnit,
    HOLDING_STATUSES, UnitStatus,
)


async def get_accommodation_capacities(db: Union[AsyncSession, Session]) -> Dict[uuid.UUID, int]:
    """Total unit capacity per accommodation type where status is AVAILABLE."""
    stmt = (
        select(BhavanUnit.accommodation_type_id, func.count(BhavanUnit.id))
        .where(BhavanUnit.status == UnitStatus.AVAILABLE)
        .group_by(BhavanUnit.accommodation_type_id)
    )
    if isinstance(db, AsyncSession):
        res = await db.execute(stmt)
        rows = res.all()
    else:
        rows = db.execute(stmt).all()
    return {row[0]: row[1] for row in rows}


async def get_accommodation_types_dict(db: Union[AsyncSession, Session]) -> Dict[uuid.UUID, BhavanAccommodationType]:
    """Load dictionary of all active accommodation types by ID."""
    stmt = select(BhavanAccommodationType).where(BhavanAccommodationType.is_active == True)
    if isinstance(db, AsyncSession):
        res = await db.execute(stmt)
        types = res.scalars().all()
    else:
        types = db.execute(stmt).scalars().all()
    return {t.id: t for t in types}


async def get_committed_accommodations(
    db: Union[AsyncSession, Session], check_in: date, check_out: date
) -> Dict[date, Dict[uuid.UUID, int]]:
    """Committed accommodation units per night for overlapping APPROVED enquiries,
    factoring in composite component compositions.
    """
    types_map = await get_accommodation_types_dict(db)

    stmt = (
        select(
            BhavanEnquiry.check_in,
            BhavanEnquiry.check_out,
            BhavanEnquiryAccommodation.accommodation_type_id,
            BhavanEnquiryAccommodation.quantity,
        )
        .join(BhavanEnquiryAccommodation, BhavanEnquiry.id == BhavanEnquiryAccommodation.enquiry_id)
        .where(
            BhavanEnquiry.status.in_(HOLDING_STATUSES),
            BhavanEnquiry.check_in < check_out,
            BhavanEnquiry.check_out > check_in,
        )
    )

    if isinstance(db, AsyncSession):
        res = await db.execute(stmt)
        rows = res.all()
    else:
        rows = db.execute(stmt).all()

    committed_by_night: Dict[date, Dict[uuid.UUID, int]] = {}
    curr = check_in
    while curr < check_out:
        committed_by_night[curr] = {}
        curr += timedelta(days=1)

    for enq_check_in, enq_check_out, type_id, qty in rows:
        if not type_id:
            continue

        night = max(check_in, enq_check_in)
        limit = min(check_out, enq_check_out)

        # Check if type_id has composition_json (e.g. {"components": [{"type_id": "...", "quantity": 3}]})
        acc_type = types_map.get(type_id)
        component_deductions = []
        if acc_type and acc_type.composition_json and "components" in acc_type.composition_json:
            for comp in acc_type.composition_json.get("components", []):
                try:
                    comp_uuid = uuid.UUID(str(comp["type_id"]))
                    comp_qty = int(comp.get("quantity", 1))
                    component_deductions.append((comp_uuid, comp_qty * qty))
                except (ValueError, KeyError):
                    pass

        while night < limit:
            if night in committed_by_night:
                # Direct type deduction
                committed_by_night[night][type_id] = (
                    committed_by_night[night].get(type_id, 0) + qty
                )
                # Composite component deductions (e.g. 3 rooms per unit)
                for comp_type_id, comp_total in component_deductions:
                    committed_by_night[night][comp_type_id] = (
                        committed_by_night[night].get(comp_type_id, 0) + comp_total
                    )
            night += timedelta(days=1)

    return committed_by_night


async def get_effective_available_accommodations(
    db: Union[AsyncSession, Session], check_in: date, check_out: date
) -> Dict[uuid.UUID, int]:
    """Calculates max bookable units per accommodation type for the stay duration,
    correctly handling composite unit bounds.
    """
    capacities = await get_accommodation_capacities(db)
    committed = await get_committed_accommodations(db, check_in, check_out)
    types_map = await get_accommodation_types_dict(db)

    # 1. Base net availability per type across stay nights
    base_net: Dict[uuid.UUID, int] = {}
    for tid, cap in capacities.items():
        max_comm = 0
        for night, night_comm in committed.items():
            if tid in night_comm:
                max_comm = max(max_comm, night_comm[tid])
        base_net[tid] = max(0, cap - max_comm)

    # 2. Composite net availability
    effective_avail: Dict[uuid.UUID, int] = {}
    for tid, acc_type in types_map.items():
        if acc_type.composition_json and "components" in acc_type.composition_json:
            # Package max units constrained by component capacities
            max_pkg = 999999
            for comp in acc_type.composition_json.get("components", []):
                try:
                    comp_uuid = uuid.UUID(str(comp["type_id"]))
                    comp_qty = int(comp.get("quantity", 1))
                    comp_net = base_net.get(comp_uuid, 0)
                    possible = comp_net // comp_qty if comp_qty > 0 else 0
                    max_pkg = min(max_pkg, possible)
                except (ValueError, KeyError):
                    pass
            effective_avail[tid] = max_pkg if max_pkg != 999999 else base_net.get(tid, 0)
        else:
            effective_avail[tid] = base_net.get(tid, 0)

    return effective_avail


async def get_committed_amenities(
    db: Union[AsyncSession, Session], check_in: date, check_out: date
) -> Dict[date, Dict[uuid.UUID, int]]:
    """Committed amenity quantities per night for overlapping APPROVED enquiries."""
    stmt = (
        select(
            BhavanEnquiry.check_in,
            BhavanEnquiry.check_out,
            BhavanEnquiryAmenity.amenity_id,
            BhavanEnquiryAmenity.quantity,
        )
        .join(BhavanEnquiryAmenity, BhavanEnquiry.id == BhavanEnquiryAmenity.enquiry_id)
        .where(
            BhavanEnquiry.status.in_(HOLDING_STATUSES),
            BhavanEnquiry.check_in < check_out,
            BhavanEnquiry.check_out > check_in,
        )
    )

    if isinstance(db, AsyncSession):
        res = await db.execute(stmt)
        rows = res.all()
    else:
        rows = db.execute(stmt).all()

    committed_by_night: Dict[date, Dict[uuid.UUID, int]] = {}
    curr = check_in
    while curr < check_out:
        committed_by_night[curr] = {}
        curr += timedelta(days=1)

    for enq_check_in, enq_check_out, amenity_id, qty in rows:
        if not amenity_id:
            continue
        night = max(check_in, enq_check_in)
        limit = min(check_out, enq_check_out)
        while night < limit:
            if night in committed_by_night:
                committed_by_night[night][amenity_id] = (
                    committed_by_night[night].get(amenity_id, 0) + qty
                )
            night += timedelta(days=1)

    return committed_by_night
