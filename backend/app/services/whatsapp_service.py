import os
import uuid
import json
import logging
import qrcode
import asyncio
from pathlib import Path
from twilio.rest import Client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.models.event import EventRegistration, EventPass, PassStatus, Event

logger = logging.getLogger(__name__)

# Ensure QR directory exists
QR_DIR = Path("static/qr")
QR_DIR.mkdir(parents=True, exist_ok=True)

def generate_qr_code(pass_id: uuid.UUID) -> str:
    """Generates a QR code and saves it to static folder, returning the public URL."""
    verify_url = f"{settings.DOMAIN_URL}/verify-pass/{str(pass_id)}"
    
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
    
    return f"{settings.DOMAIN_URL}/static/qr/{filename}"

def send_whatsapp_qr(to_number: str, qr_image_url: str, event_name: str, pass_number: int, total_passes: int) -> str:
    """Sends the WhatsApp message with QR using Twilio SDK and returns the Message SID."""
    if not to_number:
        logger.error("Recipient phone number is empty.")
        return "failed_sid"

    # Dummy mode: just log and skip Twilio call
    whatsapp_provider = getattr(settings, "WHATSAPP_PROVIDER", "twilio").lower()
    if whatsapp_provider == "dummy":
        logger.info(
            f"[WHATSAPP DUMMY] To: {to_number} | Event: {event_name} "
            f"| Pass {pass_number}/{total_passes} | QR: {qr_image_url}"
        )
        return "dummy_sid"

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
                
                # Resend WhatsApp
                message_sid = await asyncio.to_thread(
                    send_whatsapp_qr,
                    to_number=user_phone,
                    qr_image_url=event_pass.qr_image_url,
                    event_name=event.title,
                    pass_number=pass_number,
                    total_passes=len(existing_passes)
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
            qr_url = generate_qr_code(new_pass_id)
            
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
            pass_records.append((new_pass, qr_url))
            passes_created += 1
            
        # Commit immediately so the passes exist in DB and are visible in UI right away
        await db.commit()
        logger.info(f"Committed {passes_created} passes for registration {registration_id}. Sending WhatsApp notifications in background...")

        # Now send WhatsApp notifications
        for idx, (event_pass, qr_url) in enumerate(pass_records):
            pass_number = idx + 1
            message_sid = await asyncio.to_thread(
                send_whatsapp_qr,
                to_number=user_phone,
                qr_image_url=qr_url,
                event_name=event.title,
                pass_number=pass_number,
                total_passes=registration.pass_count
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
