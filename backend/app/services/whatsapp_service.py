import os
import uuid
import json
import base64
import logging
import qrcode
import asyncio
from pathlib import Path

import httpx
from twilio.rest import Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.models.event import EventRegistration, EventPass, PassStatus, Event

logger = logging.getLogger(__name__)

# Ensure QR directory exists
QR_DIR = Path("static/qr")
QR_DIR.mkdir(parents=True, exist_ok=True)

def generate_qr_code(pass_id: uuid.UUID) -> tuple[str, Path]:
    """Generate a pass QR code.

    Returns ``(public_url, local_path)``. The URL is what we persist and show in
    the UI; the local path is what we hand to WhatsApp so delivery does not
    depend on the server being publicly reachable.
    """
    # /verify-pass/<id> is a Next.js page, so this must point at the FRONTEND
    # origin, not the API. It also has to be reachable from whichever phone
    # scans the code — a localhost URL resolves to the phone itself.
    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-pass/{str(pass_id)}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    filename = f"{str(pass_id)}.png"
    filepath = QR_DIR / filename
    img.save(filepath)

    return f"{settings.DOMAIN_URL}/static/qr/{filename}", filepath


def qr_path_for_pass(pass_id: uuid.UUID) -> Path:
    """Local path of a previously generated pass QR (used when resending)."""
    return QR_DIR / f"{str(pass_id)}.png"


def send_whatsapp_web_qr(
    to_number: str,
    qr_file_path: Path,
    event_name: str,
    pass_number: int,
    total_passes: int,
) -> str:
    """Send the pass QR through the whatsapp-web.js sidecar.

    The PNG is uploaded inline as base64, so this works on localhost and behind
    NAT — unlike the Twilio path, which needs a publicly downloadable media URL.
    Returns a message id on success, or ``"failed_sid"``.
    """
    if not qr_file_path or not Path(qr_file_path).exists():
        logger.error("QR image not found at %s; cannot send pass.", qr_file_path)
        return "failed_sid"

    caption = (
        f"🎟️ *{event_name}*\n\n"
        f"Your entry pass {pass_number} of {total_passes} is attached.\n"
        f"Please show this QR code at the venue entrance.\n\n"
        f"— Agrawal Samaj"
    )

    try:
        encoded = base64.b64encode(Path(qr_file_path).read_bytes()).decode("ascii")
    except Exception as e:
        logger.error("Could not read QR image %s: %s", qr_file_path, e)
        return "failed_sid"

    headers = {"Content-Type": "application/json"}
    if settings.WHATSAPP_WEB_API_KEY:
        headers["x-api-key"] = settings.WHATSAPP_WEB_API_KEY

    payload = {
        "phone": to_number,
        "caption": caption,
        "media": {
            "base64": encoded,
            "mimetype": "image/png",
            "filename": f"pass-{pass_number}.png",
        },
    }

    url = f"{settings.WHATSAPP_WEB_URL.rstrip('/')}/send-media"
    try:
        with httpx.Client(timeout=settings.WHATSAPP_WEB_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id", "sent")
            logger.info("Sent WhatsApp pass to %s via whatsapp-web.js (%s)", to_number, message_id)
            return message_id

        # Surface the sidecar's own error message — it distinguishes
        # "session not linked" from "number not on WhatsApp".
        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text
        logger.error(
            "whatsapp-web.js rejected the send to %s (HTTP %s): %s",
            to_number, response.status_code, detail,
        )
        return "failed_sid"

    except httpx.ConnectError:
        logger.error(
            "Could not reach the whatsapp-web.js sidecar at %s. "
            "Is it running? (cd whatsapp-service && npm start)",
            settings.WHATSAPP_WEB_URL,
        )
        return "failed_sid"
    except Exception as e:
        logger.error("Failed to send WhatsApp pass via whatsapp-web.js: %s", e)
        return "failed_sid"

def send_whatsapp_qr(
    to_number: str,
    qr_image_url: str,
    event_name: str,
    pass_number: int,
    total_passes: int,
    qr_file_path: Path | None = None,
) -> str:
    """Deliver a pass QR over WhatsApp using the configured provider.

    Returns a provider message id, or ``"failed_sid"`` on failure.
    """
    if not to_number:
        logger.error("Recipient phone number is empty.")
        return "failed_sid"

    whatsapp_provider = getattr(settings, "WHATSAPP_PROVIDER", "whatsapp_web").lower()

    # Dummy mode: just log, no send.
    if whatsapp_provider == "dummy":
        logger.info(
            f"[WHATSAPP DUMMY] To: {to_number} | Event: {event_name} "
            f"| Pass {pass_number}/{total_passes} | QR: {qr_image_url}"
        )
        return "dummy_sid"

    if whatsapp_provider in ("whatsapp_web", "whatsapp-web", "whatsappweb"):
        return send_whatsapp_web_qr(
            to_number=to_number,
            qr_file_path=qr_file_path,
            event_name=event_name,
            pass_number=pass_number,
            total_passes=total_passes,
        )

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured. Skipping WhatsApp send.")
        return "mock_sid"

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Ensure number is E.164 formatted for WhatsApp (e.g., whatsapp:+919876543210)
        formatted_number = to_number.strip()
        if not formatted_number.startswith("whatsapp:"):
            if not formatted_number.startswith("+"):
                formatted_number = f"+91{formatted_number}" # Assuming India default if no country code
            formatted_number = f"whatsapp:{formatted_number}"

        # Check if local address (localhost / 127.0.0.1) is used for media URL
        # Twilio cannot download media from localhost, so we omit media_url and include link in body text
        is_local = "localhost" in qr_image_url or "127.0.0.1" in qr_image_url

        whatsapp_from = settings.TWILIO_WHATSAPP_FROM or "whatsapp:+14155238886"

        message_kwargs = {
            "from_": whatsapp_from,
            "to": formatted_number
        }

        if not is_local:
            message_kwargs["media_url"] = [qr_image_url]
        else:
            logger.info("Local environment detected. Omitted media_url to avoid Twilio 400 error.")

        # If a Content SID is provided, use it (required for production/out-of-session)
        if settings.TWILIO_CONTENT_SID:
            message_kwargs["content_sid"] = settings.TWILIO_CONTENT_SID
            message_kwargs["content_variables"] = json.dumps({
                "1": event_name,
                "2": str(pass_number),
                "3": str(total_passes)
            })
        else:
            # Fallback for sandbox testing without approved template
            body_text = f"Your ticket for {event_name} - pass {pass_number} of {total_passes}. See you there!"
            if is_local:
                body_text += f"\nView Ticket QR code: {qr_image_url}"
            message_kwargs["body"] = body_text

        if settings.TWILIO_STATUS_CALLBACK_URL:
            message_kwargs["status_callback"] = settings.TWILIO_STATUS_CALLBACK_URL

        message = client.messages.create(**message_kwargs)
        logger.info(f"Sent WhatsApp QR to {formatted_number}, SID: {message.sid}")
        return message.sid

    except Exception as e:
        logger.error(f"Failed to send WhatsApp message: {str(e)}")
        return "failed_sid"

from app.database import SessionLocal

async def generate_and_send_passes(registration_id: uuid.UUID, force: bool = False):
    """Generates QRs, creates EventPass records, and sends them via WhatsApp.
    If passes already exist, it resends them instead of creating duplicates.
    """
    async with SessionLocal() as db:
        # Fetch registration and event
        result = await db.execute(
            select(EventRegistration, Event)
            .join(Event, EventRegistration.event_id == Event.event_id)
            .filter(EventRegistration.registration_id == registration_id)
        )
        row = result.first()
        if not row:
            logger.error(f"Registration {registration_id} not found.")
            return
            
        registration, event = row
        
        # We only generate passes if they haven't been generated yet (or if we are forcing a resend)
        if registration.qr_delivered and not force:
            logger.info(f"Passes already delivered for {registration_id}")
            return

        # Determine phone number
        user_phone = registration.guest_phone
        if not user_phone and registration.user_id:
            from app.models.user import User
            user_res = await db.execute(select(User).filter(User.user_id == registration.user_id))
            user = user_res.scalar_one_or_none()
            if user:
                user_phone = user.mobile
                
        user_phone = user_phone.strip() if user_phone else None
        if not user_phone:
            logger.warning(f"No phone number found for registration {registration_id}")
            return

        # Check if we already have passes for this registration
        pass_result = await db.execute(
            select(EventPass).filter(EventPass.registration_id == registration_id)
        )
        existing_passes = pass_result.scalars().all()

        success_count = 0
        if existing_passes:
            logger.info(f"Resending existing {len(existing_passes)} passes for registration {registration_id}")
            for idx, event_pass in enumerate(existing_passes):
                pass_number = idx + 1

                # Re-create the PNG if it was cleaned up since the first send,
                # otherwise the resend would have nothing to attach.
                qr_file = qr_path_for_pass(event_pass.pass_id)
                if not qr_file.exists():
                    logger.info("QR image missing for pass %s, regenerating.", event_pass.pass_id)
                    _, qr_file = generate_qr_code(event_pass.pass_id)

                # Resend WhatsApp
                message_sid = await asyncio.to_thread(
                    send_whatsapp_qr,
                    to_number=user_phone,
                    qr_image_url=event_pass.qr_image_url,
                    event_name=event.title,
                    pass_number=pass_number,
                    total_passes=len(existing_passes),
                    qr_file_path=qr_file,
                )
                
                event_pass.whatsapp_message_sid = message_sid
                if message_sid not in ("failed_sid", None):
                    event_pass.delivery_status = "queued"
                    success_count += 1
                else:
                    event_pass.delivery_status = "failed"
            
            if success_count > 0:
                registration.qr_delivered = True
            await db.commit()
            logger.info(f"Successfully resent {success_count} of {len(existing_passes)} passes for registration {registration_id}")
            return

        # Generate new passes if none exist
        passes_created = 0
        pass_records = []
        for i in range(registration.pass_count):
            new_pass_id = uuid.uuid4()

            # 1. Generate QR Code (fast local generation)
            qr_url, qr_file = generate_qr_code(new_pass_id)

            # 2. Add pass record
            new_pass = EventPass(
                pass_id=new_pass_id,
                registration_id=registration.registration_id,
                event_id=event.event_id,
                qr_image_url=qr_url,
                status=PassStatus.UNUSED,
                whatsapp_message_sid=None,
                delivery_status="pending"
            )
            db.add(new_pass)
            pass_records.append((new_pass, qr_url, qr_file))
            passes_created += 1
            
        # Commit immediately so the passes exist in DB and are visible in UI right away
        await db.commit()
        logger.info(f"Committed {passes_created} passes for registration {registration_id}. Sending WhatsApp notifications in background...")

        # Now send WhatsApp notifications
        for idx, (event_pass, qr_url, qr_file) in enumerate(pass_records):
            pass_number = idx + 1
            message_sid = await asyncio.to_thread(
                send_whatsapp_qr,
                to_number=user_phone,
                qr_image_url=qr_url,
                event_name=event.title,
                pass_number=pass_number,
                total_passes=registration.pass_count,
                qr_file_path=qr_file,
            )

            event_pass.whatsapp_message_sid = message_sid
            if message_sid != "failed_sid":
                event_pass.delivery_status = "queued"
                success_count += 1
            else:
                event_pass.delivery_status = "failed"
                
        if success_count > 0:
            registration.qr_delivered = True
        await db.commit()
        logger.info(f"Successfully generated and sent {success_count} of {passes_created} passes for registration {registration_id}")
