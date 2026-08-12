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
    assert res.estimated_total == Decimal("4500.00")
