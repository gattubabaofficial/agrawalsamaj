import pytest
from app.routers.bhavan import (
    PublicAccommodationTypeResponse, PublicAmenityResponse, PublicConfigResponse, PublicQuoteResponse
)


def test_public_models_do_not_contain_internal_rule_fields():
    # Assert public model fields do not expose sensitive internal keys
    quote_fields = set(PublicQuoteResponse.model_fields.keys())
    config_fields = set(PublicConfigResponse.model_fields.keys())

    prohibited_keys = {
        "rules_snapshot", "applied_at", "priority", "profile",
        "created_by", "admin_notes", "source_assignment_ids"
    }

    assert len(quote_fields.intersection(prohibited_keys)) == 0
    assert len(config_fields.intersection(prohibited_keys)) == 0
