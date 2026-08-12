"""The Bhavan schema must round-trip on SQLite, because that is what the test
suite runs on. A Postgres-only column type here fails every later test file."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bhavan import (
    AccommodationKind,
    AmenityPricingType,
    BhavanAccommodationType,
    BhavanAmenity,
    BhavanRuleAssignment,
    BhavanRuleAssignmentDate,
    BhavanRuleProfile,
    BhavanUnit,
    RuleCategory,
    RuleStatus,
    UnitStatus,
)


async def test_accommodation_type_with_units_round_trips(db_session: AsyncSession):
    ac_room = BhavanAccommodationType(
        name="AC Room",
        kind=AccommodationKind.ROOM,
        capacity_per_unit=4,
        base_price_per_night=Decimal("1500.00"),
        sort_order=1,
    )
    db_session.add(ac_room)
    await db_session.flush()

    db_session.add_all([
        BhavanUnit(accommodation_type_id=ac_room.id, label="101", status=UnitStatus.AVAILABLE),
        BhavanUnit(accommodation_type_id=ac_room.id, label="102", status=UnitStatus.MAINTENANCE),
    ])
    await db_session.commit()

    loaded = (await db_session.execute(
        select(BhavanAccommodationType).where(BhavanAccommodationType.id == ac_room.id)
    )).scalar_one()
    assert loaded.base_price_per_night == Decimal("1500.00")
    assert loaded.kind is AccommodationKind.ROOM

    units = (await db_session.execute(
        select(BhavanUnit).where(BhavanUnit.accommodation_type_id == ac_room.id)
    )).scalars().all()
    assert {u.label for u in units} == {"101", "102"}
    assert sum(1 for u in units if u.status is UnitStatus.AVAILABLE) == 1


async def test_amenity_pricing_types_are_distinct(db_session: AsyncSession):
    db_session.add_all([
        BhavanAmenity(name="Plastic Chair", price=Decimal("10.00"),
                      pricing_type=AmenityPricingType.PER_UNIT, available_quantity=500),
        BhavanAmenity(name="Cooler", price=Decimal("500.00"),
                      pricing_type=AmenityPricingType.PER_DAY, available_quantity=6),
        BhavanAmenity(name="Cleaning", price=Decimal("1000.00"),
                      pricing_type=AmenityPricingType.ONE_TIME, available_quantity=None),
    ])
    await db_session.commit()

    rows = (await db_session.execute(select(BhavanAmenity))).scalars().all()
    by_name = {a.name: a for a in rows}
    assert by_name["Plastic Chair"].pricing_type is AmenityPricingType.PER_UNIT
    assert by_name["Cooler"].pricing_type is AmenityPricingType.PER_DAY
    assert by_name["Cleaning"].available_quantity is None, "null = unlimited"


async def test_rule_assignment_stores_config_snapshot_and_dates(db_session: AsyncSession):
    """The snapshot is what makes profile edits non-retroactive."""
    profile = BhavanRuleProfile(
        name="Wedding",
        category=RuleCategory.EVENT,
        status=RuleStatus.ACTIVE,
        config={"conditions": {"min_nights": 2}},
    )
    db_session.add(profile)
    await db_session.flush()

    assignment = BhavanRuleAssignment(
        profile_id=profile.id,
        label="Wedding Dates 2027",
        config_snapshot={"conditions": {"min_nights": 2}},
        applied_at=datetime(2026, 8, 11, 10, 0, tzinfo=timezone.utc),
    )
    db_session.add(assignment)
    await db_session.flush()

    db_session.add_all([
        BhavanRuleAssignmentDate(assignment_id=assignment.id, date=date(2026, 12, 10)),
        BhavanRuleAssignmentDate(assignment_id=assignment.id, date=date(2026, 12, 11)),
    ])
    await db_session.commit()

    # Editing the profile must not touch the snapshot.
    profile.config = {"conditions": {"min_nights": 5}}
    await db_session.commit()

    loaded = (await db_session.execute(
        select(BhavanRuleAssignment).where(BhavanRuleAssignment.id == assignment.id)
    )).scalar_one()
    assert loaded.config_snapshot == {"conditions": {"min_nights": 2}}

    dates = (await db_session.execute(
        select(BhavanRuleAssignmentDate).where(
            BhavanRuleAssignmentDate.assignment_id == assignment.id
        )
    )).scalars().all()
    assert {d.date for d in dates} == {date(2026, 12, 10), date(2026, 12, 11)}
