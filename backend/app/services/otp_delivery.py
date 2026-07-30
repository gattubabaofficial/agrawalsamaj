"""Delivery of phone OTPs.

WhatsApp is tried first, because a whatsapp-web.js message costs nothing and
arrives on a phone people already have open. SMS stays as the fallback: not
every number has a WhatsApp account, and the sidecar needs a linked device to
be up. An OTP that silently fails to arrive locks someone out of the portal,
so the fallback is not optional.
"""

import asyncio
import logging

from app.config import settings
from app.services.sms_service import send_sms, is_dummy_sms_mode
from app.services.whatsapp_service import send_whatsapp_text

logger = logging.getLogger(__name__)

# What actually carried the code, for the caller to report back to the user.
CHANNEL_WHATSAPP = "whatsapp"
CHANNEL_SMS = "sms"
# Printed to the server console and nowhere else. This is NOT delivery — the
# caller must decide whether that is acceptable (local development) or a
# failure (anywhere else).
CHANNEL_CONSOLE = "console"
CHANNEL_NONE = "none"

#: Channels where a real device actually received something.
DELIVERED_CHANNELS = frozenset({CHANNEL_WHATSAPP, CHANNEL_SMS})


async def send_otp_message(phone: str, message: str) -> str:
    """Send an OTP to `phone`, returning the channel that carried it.

    Returns one of CHANNEL_WHATSAPP, CHANNEL_SMS, CHANNEL_CONSOLE or
    CHANNEL_NONE. Never raises: a delivery failure is reported through the
    return value so the endpoint can decide what to tell the user.

    Check the result against DELIVERED_CHANNELS rather than truthiness —
    CHANNEL_CONSOLE means the code went to a log file, not a phone.
    """
    if settings.OTP_PREFER_WHATSAPP:
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
            logger.info(
                "WhatsApp OTP delivery to %s did not succeed; falling back to SMS.",
                phone,
            )
        except Exception as exc:
            # Includes the threadpool being saturated and anything the sidecar
            # client failed to swallow itself.
            logger.warning("WhatsApp OTP delivery raised for %s: %s", phone, exc)

    # send_sms returns True in dummy mode, so ask separately whether anything
    # could have left the machine before believing it.
    sms_is_console_only = is_dummy_sms_mode()
    try:
        if await send_sms(phone, message):
            if sms_is_console_only:
                logger.warning(
                    "OTP for %s was only printed to the console — no SMS provider "
                    "is configured (set SMS_PROVIDER and its API key).",
                    phone,
                )
                return CHANNEL_CONSOLE
            return CHANNEL_SMS
    except Exception as exc:
        logger.warning("SMS OTP delivery raised for %s: %s", phone, exc)

    logger.error("Could not deliver OTP to %s over any channel.", phone)
    return CHANNEL_NONE
