"""Seed script for Bhavan Booking Enquiry System.

Seeds default accommodation types, sample units, amenities, purposes,
global settings, default published Terms & Conditions, and 6 rule templates.
"""

import asyncio
import os
import sys
import uuid
from decimal import Decimal

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from sqlalchemy import select
from app.database import engine, SessionLocal
from app.models.bhavan import (
    AccommodationKind, AmenityPricingType, BhavanAccommodationType,
    BhavanAmenity, BhavanPurpose, BhavanRuleProfile, BhavanSettings,
    BhavanTermsVersion, BhavanUnit, RuleCategory, RuleStatus, UnitStatus,
)


async def seed_bhavan():
    async with SessionLocal() as db:
        print("[SEED] Seeding Bhavan Booking Enquiry System...")

        # 1. Accommodation Types
        acc_types_data = [
            {"name": "AC Room", "kind": AccommodationKind.ROOM, "cap": 2, "price": Decimal("1500.00"), "order": 1},
            {"name": "Non-AC Room", "kind": AccommodationKind.ROOM, "cap": 2, "price": Decimal("1000.00"), "order": 2},
            {"name": "AC Dormitory", "kind": AccommodationKind.DORMITORY, "cap": 10, "price": Decimal("3000.00"), "order": 3},
            {"name": "Non-AC Dormitory", "kind": AccommodationKind.DORMITORY, "cap": 10, "price": Decimal("2000.00"), "order": 4},
        ]

        acc_type_objs = {}
        for item in acc_types_data:
            res = await db.execute(select(BhavanAccommodationType).where(BhavanAccommodationType.name == item["name"]))
            existing = res.scalar_one_or_none()
            if not existing:
                existing = BhavanAccommodationType(
                    name=item["name"],
                    kind=item["kind"],
                    capacity_per_unit=item["cap"],
                    base_price_per_night=item["price"],
                    sort_order=item["order"],
                    is_active=True,
                )
                db.add(existing)
                await db.flush()
                print(f"  + Added accommodation type: {item['name']}")
            acc_type_objs[item["name"]] = existing

        # 2. Units
        units_to_create = [
            ("AC Room", "101"), ("AC Room", "102"), ("AC Room", "103"), ("AC Room", "104"), ("AC Room", "105"),
            ("Non-AC Room", "201"), ("Non-AC Room", "202"), ("Non-AC Room", "203"), ("Non-AC Room", "204"),
            ("AC Dormitory", "Dorm A"), ("AC Dormitory", "Dorm B"),
            ("Non-AC Dormitory", "Dorm C"), ("Non-AC Dormitory", "Dorm D"),
        ]
        for type_name, label in units_to_create:
            t_obj = acc_type_objs[type_name]
            res = await db.execute(
                select(BhavanUnit).where(
                    BhavanUnit.accommodation_type_id == t_obj.id,
                    BhavanUnit.label == label,
                )
            )
            if not res.scalar_one_or_none():
                u = BhavanUnit(
                    accommodation_type_id=t_obj.id,
                    label=label,
                    status=UnitStatus.AVAILABLE,
                )
                db.add(u)
                print(f"  + Added unit: {type_name} - {label}")

        # 3. Amenities
        amenities_data = [
            {"name": "Plastic Chair", "price": Decimal("10.00"), "ptype": AmenityPricingType.PER_UNIT, "stock": 200},
            {"name": "Cooler", "price": Decimal("500.00"), "ptype": AmenityPricingType.PER_DAY, "stock": 10},
            {"name": "Table", "price": Decimal("100.00"), "ptype": AmenityPricingType.PER_UNIT, "stock": 50},
            {"name": "Extra Mattress", "price": Decimal("250.00"), "ptype": AmenityPricingType.PER_NIGHT, "stock": 30},
            {"name": "One-Time Hall Cleaning", "price": Decimal("1000.00"), "ptype": AmenityPricingType.ONE_TIME, "stock": None},
        ]
        for idx, aitem in enumerate(amenities_data, start=1):
            res = await db.execute(select(BhavanAmenity).where(BhavanAmenity.name == aitem["name"]))
            if not res.scalar_one_or_none():
                amen = BhavanAmenity(
                    name=aitem["name"],
                    price=aitem["price"],
                    pricing_type=aitem["ptype"],
                    available_quantity=aitem["stock"],
                    sort_order=idx,
                    is_active=True,
                )
                db.add(amen)
                print(f"  + Added amenity: {aitem['name']}")

        # 4. Purposes
        purposes_list = [
            "Wedding", "Social Event", "Anniversary", "Camp",
            "Family Function", "Religious Event", "Community Event", "Other",
        ]
        for idx, pname in enumerate(purposes_list, start=1):
            res = await db.execute(select(BhavanPurpose).where(BhavanPurpose.name == pname))
            if not res.scalar_one_or_none():
                p = BhavanPurpose(name=pname, sort_order=idx, is_active=True)
                db.add(p)
                print(f"  + Added booking purpose: {pname}")

        # 5. Global Settings
        res_set = await db.execute(select(BhavanSettings))
        if not res_set.scalar_one_or_none():
            sett = BhavanSettings(
                default_min_nights=1,
                advance_booking_days=0,
                contact_phone="+91 98765 43210",
                intro_text="Welcome to Bhavan Booking. Select your dates and accommodation to submit an enquiry.",
                required_fields={"email": False, "address": False, "city": True, "state": True},
            )
            db.add(sett)
            print("  + Added global Bhavan settings")

        # 6. Terms & Conditions Version
        res_terms = await db.execute(select(BhavanTermsVersion).where(BhavanTermsVersion.is_published == True))
        if not res_terms.scalar_one_or_none():
            terms = BhavanTermsVersion(
                version_label="v1.0",
                content="""# Bhavan Terms & Conditions

1. **Enquiry Submission**: Submitting a booking enquiry does not constitute an automatically confirmed booking.
2. **Review & Confirmation**: All enquiries are subject to administrative review. Staff will contact you for confirmation.
3. **Check-in / Check-out**: Check-in time is 12:00 PM and check-out time is 11:00 AM unless otherwise agreed.
4. **Maintenance & Closure**: The management reserves the right to alter availability in emergency maintenance circumstances.
""",
                is_published=True,
            )
            db.add(terms)
            print("  + Published Terms & Conditions v1.0")

        # 7. Rule Templates
        templates_data = [
            {"name": "Wedding Template", "cat": RuleCategory.EVENT, "cfg": {"pricing": {"mode": "increase_percent", "value": 50}, "conditions": {"min_nights": 2, "min_units": 2}}},
            {"name": "Social Event Template", "cat": RuleCategory.DISCOUNT, "cfg": {"pricing": {"mode": "discount_percent", "value": 15}, "conditions": {"min_nights": 1}}},
            {"name": "Anniversary Template", "cat": RuleCategory.DISCOUNT, "cfg": {"pricing": {"mode": "discount_percent", "value": 10}}},
            {"name": "Camp Template", "cat": RuleCategory.EVENT, "cfg": {"pricing": {"mode": "discount_percent", "value": 20}, "conditions": {"min_nights": 3}}},
            {"name": "Festival Template", "cat": RuleCategory.PRICING, "cfg": {"pricing": {"mode": "increase_percent", "value": 25}}},
            {"name": "Maintenance Template", "cat": RuleCategory.CLOSURE, "cfg": {"availability": {"closed": True}, "public_message": "The Bhavan is unavailable for the selected dates."}},
        ]

        for tdata in templates_data:
            res = await db.execute(select(BhavanRuleProfile).where(BhavanRuleProfile.name == tdata["name"]))
            if not res.scalar_one_or_none():
                tmpl = BhavanRuleProfile(
                    name=tdata["name"],
                    category=tdata["cat"],
                    config=tdata["cfg"],
                    is_template=True,
                    status=RuleStatus.ACTIVE,
                )
                db.add(tmpl)
                print(f"  + Added rule template: {tdata['name']}")

        await db.commit()
        print("[SUCCESS] Bhavan Booking Enquiry System seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_bhavan())
