import pytest
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.bhavan import (
    BhavanAccommodationType, BhavanEnquiry, BhavanEnquiryAccommodation,
    EnquiryStatus,
)
from app.services.bhavan_otp import validate_enquiry_token
from app.utils.security import create_access_token


def setup_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_token_binding_validation():
    mobile = "9876543210"
    valid_token = create_access_token(
        data={"sub": mobile, "purpose": "bhavan_enquiry"}
    )
    invalid_token = create_access_token(
        data={"sub": "9999999999", "purpose": "bhavan_enquiry"}
    )
    login_token = create_access_token(
        data={"sub": mobile, "purpose": "login"}
    )

    assert validate_enquiry_token(valid_token, mobile) is True
    assert validate_enquiry_token(invalid_token, mobile) is False
    assert validate_enquiry_token(login_token, mobile) is False


def test_enquiry_snapshot_immutability():
    db = setup_db()

    room = BhavanAccommodationType(
        name="AC Room",
        base_price_per_night=Decimal("1500.00"),
        is_active=True,
    )
    db.add(room)
    db.commit()

    # Submit enquiry with snapshot
    snapshot = {
        "check_in": "2027-10-01",
        "check_out": "2027-10-03",
        "estimated_total": "3000.00",
    }
    enq = BhavanEnquiry(
        reference="BV-2027-01001",
        check_in=date(2027, 10, 1),
        check_out=date(2027, 10, 3),
        nights=2,
        full_name="Rahul Agrawal",
        mobile="9876543210",
        quote_snapshot=snapshot,
        estimated_total=Decimal("3000.00"),
        status=EnquiryStatus.PENDING,
    )
    db.add(enq)
    db.commit()

    # Change base rate for room
    room.base_price_per_night = Decimal("5000.00")
    db.commit()

    # Verify historical enquiry quote snapshot is unaffected
    saved_enq = db.query(BhavanEnquiry).filter_by(reference="BV-2027-01001").first()
    assert saved_enq.estimated_total == Decimal("3000.00")
    assert saved_enq.quote_snapshot["estimated_total"] == "3000.00"
