"""Tests for phone-number masking in the member directory."""

from app.routers.membership import mask_phone_number


def test_mask_returns_none_for_empty_input():
    assert mask_phone_number(None) is None
    assert mask_phone_number("") is None


def test_mask_hides_all_but_the_visible_tail():
    masked = mask_phone_number("9876543210")
    assert masked.endswith("210")
    assert masked.startswith("X")
    assert len(masked) == len("9876543210")


def test_mask_leaves_very_short_numbers_alone():
    assert mask_phone_number("12") == "12"


def test_mask_strips_surrounding_whitespace():
    assert mask_phone_number("  9876543210  ") == mask_phone_number("9876543210")
