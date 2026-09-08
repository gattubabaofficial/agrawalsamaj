import pytest
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.bhavan import (
    AmenityPricingType, BhavanAccommodationType, BhavanAmenity,
    BhavanUnit, UnitStatus,
)
from app.services.bhavan_quote import calculate_quote


def setup_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


@pytest.mark.asyncio
async def test_calculate_quote_basic():
    db = setup_db()

    room_type = BhavanAccommodationType(
        name="AC Room",
        capacity_per_unit=2,
        base_price_per_night=Decimal("1500.00"),
        is_active=True,
    )
    db.add(room_type)
    db.commit()

    u1 = BhavanUnit(accommodation_type_id=room_type.id, label="101", status=UnitStatus.AVAILABLE)
    u2 = BhavanUnit(accommodation_type_id=room_type.id, label="102", status=UnitStatus.AVAILABLE)
    db.add_all([u1, u2])

    cooler = BhavanAmenity(
        name="Cooler",
        price=Decimal("500.00"),
        pricing_type=AmenityPricingType.PER_DAY,
        available_quantity=5,
        is_active=True,
    )
    db.add(cooler)
    db.commit()

    check_in = date(2027, 10, 1)
    check_out = date(2027, 10, 3)

    res = await calculate_quote(
        db=db,
        check_in=check_in,
        check_out=check_out,
        requested_accommodations=[{"type_id": str(room_type.id), "quantity": 1}],
        requested_amenities=[{"amenity_id": str(cooler.id), "quantity": 1}],
        guests_total=2,
    )

    assert res.nights == 2
    assert res.days == 3
    assert len(res.blockers) == 0
    assert res.estimated_total == Decimal("4000.00")


@pytest.mark.asyncio
async def test_calculate_quote_multi_date_allocation():
    db = setup_db()

    room_type = BhavanAccommodationType(
        name="Deluxe Room",
        capacity_per_unit=2,
        base_price_per_night=Decimal("2000.00"),
        is_active=True,
    )
    db.add(room_type)
    db.commit()

    # 10 units
    units = [
        BhavanUnit(accommodation_type_id=room_type.id, label=f"R{i}", status=UnitStatus.AVAILABLE)
        for i in range(1, 11)
    ]
    db.add_all(units)
    db.commit()

    check_in = date(2027, 9, 15)
    check_out = date(2027, 9, 20)  # 5 nights: 15, 16, 17, 18, 19

    # Allocations: Sep 15-17 (3 nights) -> 5 rooms, Sep 18-19 (2 nights) -> 2 rooms
    allocations = [
        {"from": "2027-09-15", "to": "2027-09-17", "rooms": 5},
        {"from": "2027-09-18", "to": "2027-09-19", "rooms": 2},
    ]

    res = await calculate_quote(
        db=db,
        check_in=check_in,
        check_out=check_out,
        requested_accommodations=[{"type_id": str(room_type.id), "quantity": 5}],
        requested_amenities=[],
        guests_total=4,
        allocations=allocations,
    )

    assert res.nights == 5
    assert len(res.blockers) == 0
    # (3 nights * 5 rooms * 2000) + (2 nights * 2 rooms * 2000) = 30000 + 8000 = 38000
    assert res.estimated_total == Decimal("38000.00")
    assert res.allocations is not None
    assert len(res.allocations) == 2
    assert res.allocations[0]["rooms"] == 5
    assert res.allocations[0]["nights"] == 3
    assert res.allocations[1]["rooms"] == 2
    assert res.allocations[1]["nights"] == 2


@pytest.mark.asyncio
async def test_calculate_quote_multi_type_date_allocation():
    db = setup_db()

    room_type = BhavanAccommodationType(
        name="AC Room",
        capacity_per_unit=2,
        base_price_per_night=Decimal("1500.00"),
        is_active=True,
    )
    hall_type = BhavanAccommodationType(
        name="Banquet Hall",
        capacity_per_unit=100,
        base_price_per_night=Decimal("20000.00"),
        is_active=True,
    )
    db.add_all([room_type, hall_type])
    db.commit()

    # 15 AC Rooms and 1 Banquet Hall
    units = [
        BhavanUnit(accommodation_type_id=room_type.id, label=f"R{i}", status=UnitStatus.AVAILABLE)
        for i in range(1, 16)
    ]
    units.append(BhavanUnit(accommodation_type_id=hall_type.id, label="Hall1", status=UnitStatus.AVAILABLE))
    db.add_all(units)
    db.commit()

    check_in = date(2027, 9, 8)
    check_out = date(2027, 9, 10)  # 2 nights: Sep 8, Sep 9

    # Sep 8: 15 AC Rooms + 0 Halls
    # Sep 9: 3 AC Rooms + 1 Hall
    date_allocations = {
        "2027-09-08": {str(room_type.id): 15, str(hall_type.id): 0},
        "2027-09-09": {str(room_type.id): 3, str(hall_type.id): 1},
    }

    res = await calculate_quote(
        db=db,
        check_in=check_in,
        check_out=check_out,
        requested_accommodations=[],
        requested_amenities=[],
        date_allocations=date_allocations,
    )

    assert res.nights == 2
    assert len(res.blockers) == 0
    # Expected:
    # Sep 8: 15 * 1500 = 22500
    # Sep 9: (3 * 1500) + (1 * 20000) = 4500 + 20000 = 24500
    # Total = 22500 + 24500 = 47000
    assert res.estimated_total == Decimal("47000.00")
    assert len(res.accommodations) == 2


@pytest.mark.asyncio
async def test_calculate_quote_date_amenity_allocation():
    db = setup_db()

    room_type = BhavanAccommodationType(
        name="AC Room",
        capacity_per_unit=2,
        base_price_per_night=Decimal("1500.00"),
        is_active=True,
    )
    db.add(room_type)
    db.commit()

    u1 = BhavanUnit(accommodation_type_id=room_type.id, label="101", status=UnitStatus.AVAILABLE)
    db.add(u1)

    cooler = BhavanAmenity(
        name="Coolers",
        price=Decimal("100.00"),
        pricing_type=AmenityPricingType.PER_DAY,
        available_quantity=10,
        is_active=True,
    )
    chairs = BhavanAmenity(
        name="Plastic Chair",
        price=Decimal("10.00"),
        pricing_type=AmenityPricingType.PER_DAY,
        available_quantity=200,
        is_active=True,
    )
    db.add_all([cooler, chairs])
    db.commit()

    check_in = date(2026, 11, 19)
    check_out = date(2026, 11, 21)  # 2 days: Nov 19 and Nov 20

    # User selects 1 room for each night, 10 coolers on Nov 19, and 5 coolers + 50 chairs on Nov 20
    date_allocations = {
        "2026-11-19": {str(room_type.id): 1},
        "2026-11-20": {str(room_type.id): 1},
    }
    date_amenity_allocations = {
        "2026-11-19": {str(cooler.id): 10, str(chairs.id): 0},
        "2026-11-20": {str(cooler.id): 5, str(chairs.id): 50},
    }

    res = await calculate_quote(
        db=db,
        check_in=check_in,
        check_out=check_out,
        requested_accommodations=[],
        requested_amenities=[],
        date_allocations=date_allocations,
        date_amenity_allocations=date_amenity_allocations,
    )

    assert len(res.blockers) == 0
    # Expected:
    # Rooms: (1 * 1500) + (1 * 1500) = 3000
    # Nov 19 Amenities: (10 * 100) = 1000
    # Nov 20 Amenities: (5 * 100) + (50 * 10) = 500 + 500 = 1000
    # Total = 3000 + 1000 + 1000 = 5000.00
    assert res.estimated_total == Decimal("5000.00")
    assert len(res.amenities) == 2
    cooler_amen = next(a for a in res.amenities if a.amenity_id == cooler.id)
    assert cooler_amen.quantity == 10
    assert cooler_amen.line_total == Decimal("1500.00")
    chair_amen = next(a for a in res.amenities if a.amenity_id == chairs.id)
    assert chair_amen.quantity == 50
    assert chair_amen.line_total == Decimal("500.00")



