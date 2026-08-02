import os
import uuid
import base64
import logging
import qrcode
import asyncio
from pathlib import Path

import httpx
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
    caption: str | None = None,
) -> str:
    """Send the pass QR through the whatsapp-web.js sidecar.

    The PNG is uploaded inline as base64, so this works on localhost and behind
    NAT — unlike the Twilio path, which needs a publicly downloadable media URL.
    Returns a message id on success, or ``"failed_sid"``.
    """
    if not qr_file_path or not Path(qr_file_path).exists():
        logger.error("QR image not found at %s; cannot send pass.", qr_file_path)
        return "failed_sid"

    if not caption:
        caption = (
            f"🎟️ *{event_name}*\n\n"
            f"Your entry pass {pass_number} of {total_passes} is attached.\n"
            f"Please show this QR code at the venue entrance.\n\n"
            f"— Agrawal Samaj Mansrovar Jaipur"
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

        # Surface the sidecar's own error message — fallback gracefully if sidecar issue
        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text
        logger.warning(
            "whatsapp-web.js sidecar status HTTP %s for %s: %s. QR pass generated locally.",
            response.status_code, to_number, detail,
        )
        return "qr_generated_sid"

    except httpx.ConnectError:
        logger.warning(
            "Could not reach whatsapp-web.js sidecar at %s. QR pass generated locally.",
            settings.WHATSAPP_WEB_URL,
        )
        return "qr_generated_sid"
    except Exception as e:
        logger.warning("WhatsApp sidecar dispatch error (%s). QR pass generated locally.", e)
        return "qr_generated_sid"

def send_whatsapp_web_document(
    to_number: str,
    file_path: Path,
    caption: str,
    filename: str,
    mimetype: str = "application/pdf",
) -> str:
    """Send an arbitrary document (e.g. a receipt PDF) through the whatsapp-web.js
    sidecar. Same transport as send_whatsapp_web_qr, generalized beyond QR PNGs."""
    if not file_path or not Path(file_path).exists():
        logger.error("Document not found at %s; cannot send.", file_path)
        return "failed_sid"

    try:
        encoded = base64.b64encode(Path(file_path).read_bytes()).decode("ascii")
    except Exception as e:
        logger.error("Could not read document %s: %s", file_path, e)
        return "failed_sid"

    headers = {"Content-Type": "application/json"}
    if settings.WHATSAPP_WEB_API_KEY:
        headers["x-api-key"] = settings.WHATSAPP_WEB_API_KEY

    payload = {
        "phone": to_number,
        "caption": caption,
        "media": {
            "base64": encoded,
            "mimetype": mimetype,
            "filename": filename,
        },
    }

    url = f"{settings.WHATSAPP_WEB_URL.rstrip('/')}/send-media"
    try:
        with httpx.Client(timeout=settings.WHATSAPP_WEB_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id", "sent")
            logger.info("Sent WhatsApp document to %s via whatsapp-web.js (%s)", to_number, message_id)
            return message_id

        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text
        logger.error(
            "whatsapp-web.js rejected the document send to %s (HTTP %s): %s",
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
        logger.error("Failed to send WhatsApp document via whatsapp-web.js: %s", e)
        return "failed_sid"


def send_whatsapp_document(
    to_number: str,
    file_path: Path | None,
    caption: str,
    filename: str,
    mimetype: str = "application/pdf",
) -> str:
    """Deliver an arbitrary document (e.g. a receipt PDF) over WhatsApp using the
    configured provider. Mirrors send_whatsapp_qr's provider branching.

    Returns a provider message id, or ``"failed_sid"`` on failure.
    """
    if not to_number:
        logger.error("Recipient phone number is empty.")
        return "failed_sid"

    whatsapp_provider = getattr(settings, "WHATSAPP_PROVIDER", "whatsapp_web").lower()

    if whatsapp_provider == "dummy":
        logger.info(f"[WHATSAPP DUMMY] To: {to_number} | Document: {filename} | {caption}")
        return "dummy_sid"

    if whatsapp_provider not in ("whatsapp_web", "whatsapp-web", "whatsappweb"):
        logger.error(
            "Unknown WHATSAPP_PROVIDER=%r (expected 'whatsapp_web' or 'dummy'). "
            "Skipping WhatsApp document send.", whatsapp_provider,
        )
        return "failed_sid"

    return send_whatsapp_web_document(
        to_number=to_number,
        file_path=file_path,
        caption=caption,
        filename=filename,
        mimetype=mimetype,
    )


def send_whatsapp_text(to_number: str, message: str, timeout: int | None = None) -> str:
    """Deliver a text message over WhatsApp using whatsapp-web.js sidecar or dummy mode.

    `timeout` overrides WHATSAPP_WEB_TIMEOUT for this send. Callers on a
    latency-sensitive path (OTP, for instance) should pass a short one so a
    stalled sidecar does not hold the request open.

    NOTE: this is a blocking call. From async code, run it in a threadpool
    (`asyncio.to_thread`) rather than awaiting the event loop into a stall.
    """
    if not to_number:
        logger.error("Recipient phone number is empty.")
        return "failed_sid"

    whatsapp_provider = getattr(settings, "WHATSAPP_PROVIDER", "whatsapp_web").lower()

    if whatsapp_provider == "dummy":
        logger.info(f"[WHATSAPP DUMMY] To: {to_number} | Message: {message}")
        return "dummy_sid"

    headers = {"Content-Type": "application/json"}
    if settings.WHATSAPP_WEB_API_KEY:
        headers["x-api-key"] = settings.WHATSAPP_WEB_API_KEY

    payload = {
        "phone": to_number,
        "message": message,
    }

    url = f"{settings.WHATSAPP_WEB_URL.rstrip('/')}/send-text"
    try:
        with httpx.Client(timeout=timeout or settings.WHATSAPP_WEB_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id", "sent")
            logger.info("Sent WhatsApp text to %s via whatsapp-web.js (%s)", to_number, message_id)
            return message_id

        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text
        logger.warning(
            "whatsapp-web.js rejected text send to %s (HTTP %s): %s",
            to_number, response.status_code, detail,
        )
        return "failed_sid"

    except httpx.ConnectError:
        logger.warning(
            "Could not reach whatsapp-web.js sidecar at %s.",
            settings.WHATSAPP_WEB_URL,
        )
        return "failed_sid"
    except Exception as e:
        logger.warning("WhatsApp sidecar dispatch error: %s", e)
        return "failed_sid"


def send_whatsapp_qr(
    to_number: str,
    qr_image_url: str,
    event_name: str,
    pass_number: int,
    total_passes: int,
    qr_file_path: Path | None = None,
    caption: str | None = None,
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

    if whatsapp_provider not in ("whatsapp_web", "whatsapp-web", "whatsappweb"):
        logger.error(
            "Unknown WHATSAPP_PROVIDER=%r (expected 'whatsapp_web' or 'dummy'). "
            "Skipping WhatsApp send.", whatsapp_provider,
        )
        return "failed_sid"

    return send_whatsapp_web_qr(
        to_number=to_number,
        qr_file_path=qr_file_path,
        event_name=event_name,
        pass_number=pass_number,
        total_passes=total_passes,
        caption=caption,
    )

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

        # Determine phone number & attendee name
        user_phone = registration.guest_phone
        attendee_name = registration.guest_name
        
        if registration.user_id:
            from app.models.user import User
            user_res = await db.execute(select(User).filter(User.user_id == registration.user_id))
            user = user_res.scalar_one_or_none()
            if user:
                if not user_phone:
                    user_phone = user.mobile
                if not attendee_name:
                    attendee_name = f"{user.first_name} {user.surname or ''}".strip()
                    
        user_phone = user_phone.strip() if user_phone else None
        if not attendee_name:
            attendee_name = "Valued Guest"

        # Format Event Date
        event_date_str = event.start_datetime.strftime("%d %B %Y at %I:%M %p")
        
        # Format Venue/Address
        venue_str = event.venue or ""
        if event.address:
            venue_str += f" ({event.address})"
        if not venue_str:
            venue_str = "Not Specified"

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

                target_phone = event_pass.guest_phone or user_phone
                if not target_phone:
                    continue

                qr_file = qr_path_for_pass(event_pass.pass_id)
                if not qr_file.exists():
                    logger.info("QR image missing for pass %s, regenerating.", event_pass.pass_id)
                    _, qr_file = generate_qr_code(event_pass.pass_id)

                caption = (
                    f"🎟️ *{event.title}*\n\n"
                    f"Hello *{event_pass.guest_name or attendee_name}*,\n"
                    f"Your entry pass {pass_number} of {len(existing_passes)} is attached.\n\n"
                    f"📅 *Date:* {event_date_str}\n"
                    f"📍 *Venue:* {venue_str}\n\n"
                    f"Please show this QR code at the venue entrance.\n\n"
                    f"— Agrawal Samaj Mansrovar Jaipur"
                )

                message_sid = await asyncio.to_thread(
                    send_whatsapp_qr,
                    to_number=target_phone.strip(),
                    qr_image_url=event_pass.qr_image_url,
                    event_name=event.title,
                    pass_number=pass_number,
                    total_passes=len(existing_passes),
                    qr_file_path=qr_file,
                    caption=caption,
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
            return

        # Generate new passes if none exist
        import json
        names_list = []
        if registration.attendee_names:
            try:
                names_list = json.loads(registration.attendee_names)
            except Exception:
                pass

        passes_created = 0
        pass_records = []
        for i in range(registration.pass_count):
            new_pass_id = uuid.uuid4()

            # Assign guest name, user_id, and phone for this specific ticket
            ticket_guest_name = attendee_name
            ticket_user_id = None
            ticket_phone = None
            if i < len(names_list) and names_list[i]:
                item = names_list[i]
                if isinstance(item, dict):
                    ticket_guest_name = item.get("name") or attendee_name
                    ticket_phone = item.get("phone")
                    
                    user_id_str = item.get("user_id")
                    if user_id_str:
                        try:
                            ticket_user_id = uuid.UUID(user_id_str)
                        except Exception:
                            pass
                else:
                    ticket_guest_name = item

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
                delivery_status="pending",
                guest_name=ticket_guest_name,
                user_id=ticket_user_id,
                guest_phone=ticket_phone
            )
            db.add(new_pass)
            pass_records.append((new_pass, qr_url, qr_file, ticket_guest_name, ticket_phone))
            passes_created += 1
            
        # Mark registration QR as generated and commit immediately so passes exist in DB and are visible in UI right away
        registration.qr_delivered = True
        await db.commit()
        logger.info(f"Committed {passes_created} passes for registration {registration_id}.")

        # Now send WhatsApp notifications
        for idx, (event_pass, qr_url, qr_file, ticket_guest_name, ticket_phone) in enumerate(pass_records):
            pass_number = idx + 1
            
            target_phone = ticket_phone or user_phone
            if not target_phone:
                continue
                
            caption = (
                f"🎟️ *{event.title}*\n\n"
                f"Hello *{ticket_guest_name}*,\n"
                f"Your entry pass {pass_number} of {registration.pass_count} is attached.\n\n"
                f"📅 *Date:* {event_date_str}\n"
                f"📍 *Venue:* {venue_str}\n\n"
                f"Please show this QR code at the venue entrance.\n\n"
                f"— Agrawal Samaj Mansrovar Jaipur"
            )

            message_sid = await asyncio.to_thread(
                send_whatsapp_qr,
                to_number=target_phone.strip(),
                qr_image_url=qr_url,
                event_name=event.title,
                pass_number=pass_number,
                total_passes=registration.pass_count,
                qr_file_path=qr_file,
                caption=caption,
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

