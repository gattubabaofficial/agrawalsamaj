import uuid
from datetime import date
from decimal import Decimal

from app.services.bhavan_rules import (
    BaseAccommodationType, BaseAmenity, RuleConditions,
    calculate_price, resolve_day, resolve_date_range,
)


def test_calculate_price_modes():
    base = Decimal("1000.00")
    current = Decimal("1000.00")

    assert calculate_price("fixed", Decimal("1500.00"), current, base) == Decimal("1500.00")
    assert calculate_price("increase_percent", Decimal("20.00"), current, base) == Decimal("1200.00")
    assert calculate_price("increase_amount", Decimal("300.00"), current, base) == Decimal("1300.00")
    assert calculate_price("discount_percent", Decimal("15.00"), current, base) == Decimal("850.00")
    assert calculate_price("discount_amount", Decimal("200.00"), current, base) == Decimal("800.00")


def test_calculate_price_conflict_behaviour():
    base = Decimal("1000.00")
    # Suppose earlier rule increased price to 1500
    current = Decimal("1500.00")

    # replace_base: 20% discount applied to base 1000 => 800
    assert calculate_price("discount_percent", Decimal("20.00"), current, base, "replace_base") == Decimal("800.00")

    # adjust_current: 20% discount applied to current 1500 => 1200
    assert calculate_price("discount_percent", Decimal("20.00"), current, base, "adjust_current") == Decimal("1200.00")


def test_resolve_day_override_order():
    d = date(2027, 12, 15)
    type_id = uuid.uuid4()
    amenity_id = uuid.uuid4()

    base_types = [BaseAccommodationType(id=type_id, base_price=Decimal("1000.00"))]
    base_amenities = [BaseAmenity(id=amenity_id)]
    default_cond = RuleConditions()

    # Rule 1 applied at 10:00 (Wedding: price 3000)
    rule1 = {
        "id": uuid.uuid4(),
        "applied_at": "2027-01-01T10:00:00Z",
        "is_active": True,
        "config": {
            "pricing": {"mode": "fixed", "value": 3000},
            "conditions": {"min_nights": 2},
        },
    }

    # Rule 2 applied at 10:05 (Maintenance: closure)
    rule2 = {
        "id": uuid.uuid4(),
        "applied_at": "2027-01-01T10:05:00Z",
        "is_active": True,
        "config": {
            "availability": {"closed": True},
        },
    }

    # Order 1: Rule 1 then Rule 2 -> closed should be True
    res1 = resolve_day(d, base_types, base_amenities, default_cond, [rule1, rule2])
    assert res1.closed is True
    assert res1.accommodation[type_id].allowed is False
    assert res1.conditions.min_nights == 2


def test_resolve_date_range_multi_night():
    d1 = date(2027, 12, 10)
    d2 = date(2027, 12, 11)
    d3 = date(2027, 12, 12)
    type_id = uuid.uuid4()

    base_types = [BaseAccommodationType(id=type_id, base_price=Decimal("1000.00"))]
    base_amenities = []
    default_cond = RuleConditions()

    # Rule for d1 and d2 only
    assignments_by_date = {
        d1: [{
            "id": uuid.uuid4(),
            "applied_at": "2027-01-01T10:00:00Z",
            "is_active": True,
            "config": {"pricing": {"mode": "fixed", "value": 2000}},
        }],
    }

    states = resolve_date_range(
        check_in=d1,
        check_out=d3,
        base_types=base_types,
        base_amenities=base_amenities,
        default_conditions=default_cond,
        assignments_by_date=assignments_by_date,
    )

    assert len(states) == 2
    assert states[0].accommodation[type_id].effective_price == Decimal("2000.00")
    assert states[1].accommodation[type_id].effective_price == Decimal("1000.00")
