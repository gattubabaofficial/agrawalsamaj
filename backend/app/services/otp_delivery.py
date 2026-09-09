"""Delivery of phone OTPs exclusively via WhatsApp.
"""

import asyncio
import logging

from app.config import settings
from app.services.whatsapp_service import send_whatsapp_text

logger = logging.getLogger(__name__)

# What actually carried the code, for the caller to report back to the user.
CHANNEL_WHATSAPP = "whatsapp"
CHANNEL_CONSOLE = "console"
CHANNEL_NONE = "none"

#: Channels where a real device actually received something.
DELIVERED_CHANNELS = frozenset({CHANNEL_WHATSAPP})


async def send_otp_message(phone: str, message: str) -> str:
    """Send an OTP to `phone` exclusively through WhatsApp.

    Returns CHANNEL_WHATSAPP on success, CHANNEL_CONSOLE in local debug dummy mode,
    or CHANNEL_NONE on delivery failure.
    """
    try:
        # send_whatsapp_text blocks on httpx; keep it off the event loop.
        result = await asyncio.to_thread(
            send_whatsapp_text,
            phone,
            message,
            settings.OTP_WHATSAPP_TIMEOUT,
        )
        if result and result != "failed_sid":
            return CHANNEL_WHATSAPP
        logger.warning(
            "WhatsApp OTP delivery to %s failed (sidecar status/error).",
            phone,
        )
    except Exception as exc:
        logger.warning("WhatsApp OTP delivery raised for %s: %s", phone, exc)

    logger.error("Could not deliver OTP to %s over WhatsApp.", phone)
    return CHANNEL_NONE

