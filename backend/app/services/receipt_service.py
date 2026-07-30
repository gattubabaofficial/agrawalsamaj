"""Receipt generation service.

Generates a unique receipt number and a PDF receipt for Bhavan bookings and
event registrations. PDFs are written to ``static/receipts`` and served via the
``/static`` mount, so ``pdf_url`` is a relative path like ``/static/receipts/<file>.pdf``.
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.receipt import Receipt, ReceiptType

RECEIPTS_DIR = Path("static/receipts")


def _ensure_dir() -> None:
    RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)


async def _next_receipt_number(db: AsyncSession, receipt_type: ReceiptType) -> str:
    """Human-readable sequential receipt number, e.g. AGS-BKG-2026-000042."""
    prefix = "BKG" if receipt_type == ReceiptType.BOOKING else "EVT"
    year = datetime.utcnow().year
    count_result = await db.execute(
        select(func.count(Receipt.receipt_id)).where(Receipt.receipt_type == receipt_type)
    )
    seq = (count_result.scalar() or 0) + 1
    return f"AGS-{prefix}-{year}-{seq:06d}"


def _render_pdf(receipt: Receipt, extra: dict) -> Optional[str]:
    """Render a PDF and return its relative URL, or None if reportlab is unavailable."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
    except Exception:
        return None

    _ensure_dir()
    filename = f"{receipt.receipt_number}.pdf"
    filepath = RECEIPTS_DIR / filename

    c = canvas.Canvas(str(filepath), pagesize=A4)
    width, height = A4
    left = 20 * mm
    y = height - 30 * mm

    # Header
    c.setFillColor(colors.HexColor("#b45309"))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(left, y, "Agrawal Samaj Mansrovar Jaipur")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#6b7280"))
    y -= 6 * mm
    c.drawString(left, y, "Community Management Portal")
    c.setFillColor(colors.black)

    # Title band
    y -= 14 * mm
    c.setFont("Helvetica-Bold", 14)
    title = "BHAVAN BOOKING RECEIPT" if receipt.receipt_type == ReceiptType.BOOKING else "EVENT BOOKING RECEIPT"
    c.drawString(left, y, title)
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    y -= 3 * mm
    c.line(left, y, width - left, y)

    def row(label, value):
        nonlocal y
        y -= 9 * mm
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#374151"))
        c.drawString(left, y, f"{label}")
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        c.drawString(left + 55 * mm, y, str(value) if value is not None else "-")

    y -= 4 * mm
    row("Receipt No.", receipt.receipt_number)
    row("Date", receipt.issued_at.strftime("%d %b %Y, %I:%M %p") if receipt.issued_at else "-")
    row("Received From", receipt.payer_name)
    row("Description", receipt.description or extra.get("description", "-"))
    for k, v in extra.get("rows", []):
        row(k, v)
    row("Payment Mode", (receipt.payment_mode or "-").upper())
    row("Payment Type", "Offline (approved by admin)" if receipt.is_offline else "Online")
    if receipt.issued_by_name:
        row("Approved By", receipt.issued_by_name)

    # Amount box
    y -= 16 * mm
    c.setFillColor(colors.HexColor("#fef3c7"))
    c.rect(left, y - 4 * mm, width - 2 * left, 14 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#92400e"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(left + 4 * mm, y + 2 * mm, "TOTAL PAID")
    c.drawRightString(width - left - 4 * mm, y + 2 * mm, f"Rs. {float(receipt.amount):,.2f}")

    # Footer
    c.setFillColor(colors.HexColor("#9ca3af"))
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(left, 20 * mm, "This is a computer-generated receipt and does not require a physical signature.")
    c.drawString(left, 15 * mm, f"Generated on {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}")

    c.showPage()
    c.save()
    return f"/static/receipts/{filename}"


async def create_receipt(
    db: AsyncSession,
    *,
    receipt_type: ReceiptType,
    amount: float,
    payer_name: str,
    payment_mode: Optional[str],
    is_offline: bool,
    description: Optional[str] = None,
    booking_id: Optional[uuid.UUID] = None,
    registration_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    issued_by: Optional[uuid.UUID] = None,
    issued_by_name: Optional[str] = None,
    extra_rows: Optional[list] = None,
) -> Receipt:
    """Create (or return existing) receipt for a booking / registration and render its PDF."""
    # Idempotency: don't create a second receipt for the same source
    if booking_id is not None:
        existing = await db.execute(select(Receipt).where(Receipt.booking_id == booking_id))
    elif registration_id is not None:
        existing = await db.execute(select(Receipt).where(Receipt.registration_id == registration_id))
    else:
        existing = None
    if existing is not None:
        found = existing.scalar_one_or_none()
        if found:
            return found

    number = await _next_receipt_number(db, receipt_type)
    receipt = Receipt(
        receipt_number=number,
        receipt_type=receipt_type,
        booking_id=booking_id,
        registration_id=registration_id,
        user_id=user_id,
        payer_name=payer_name,
        description=description,
        amount=amount,
        payment_mode=payment_mode,
        is_offline=is_offline,
        issued_by=issued_by,
        issued_by_name=issued_by_name,
        issued_at=datetime.utcnow(),
    )
    db.add(receipt)
    await db.flush()

    pdf_url = _render_pdf(receipt, {"rows": extra_rows or [], "description": description})
    receipt.pdf_url = pdf_url
    await db.commit()
    await db.refresh(receipt)
    return receipt
