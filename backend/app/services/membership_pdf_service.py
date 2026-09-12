"""Membership Application PDF generation service.

Generates an official PDF for membership applications / member profile records.
Uses ReportLab to render a clean, high-quality document.
"""
import os
import io
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

APPLICATIONS_PDF_DIR = Path("static/membership_applications")


def _ensure_dir() -> None:
    APPLICATIONS_PDF_DIR.mkdir(parents=True, exist_ok=True)


def generate_membership_application_pdf(data: Dict[str, Any], save_to_file: bool = False) -> bytes:
    """
    Renders an official Membership Application Form PDF.
    `data` contains:
      - application_id / request_id
      - created_at (datetime or str)
      - first_name, surname, father_name, parent_relation
      - mobile, email, address, profession, native_place, bio
      - samaj_id, lm_no, member_status, role
      - profile_photo (optional path or url)
      - message (optional)
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 15 * mm

    # 1. Outer Decorative Border
    c.setStrokeColor(colors.HexColor("#b45309"))
    c.setLineWidth(1.5)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    c.setStrokeColor(colors.HexColor("#fef3c7"))
    c.setLineWidth(0.5)
    c.rect(margin + 2 * mm, margin + 2 * mm, width - 2 * margin - 4 * mm, height - 2 * margin - 4 * mm)

    y = height - margin - 12 * mm

    # 2. Header Box
    c.setFillColor(colors.HexColor("#fffbeb"))
    c.rect(margin + 3 * mm, y - 18 * mm, width - 2 * margin - 6 * mm, 26 * mm, fill=1, stroke=0)

    # Header Titles
    c.setFillColor(colors.HexColor("#78350f"))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2.0, y + 2 * mm, "MANSROVAR AGRAWAL SAMAJ JAIPUR")

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#b45309"))
    c.drawCentredString(width / 2.0, y - 3.5 * mm, "AGRASEN BHAWAN, SECTOR 5, MANSAROVAR, JAIPUR - 302020")

    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.HexColor("#6b7280"))
    c.drawCentredString(width / 2.0, y - 8 * mm, "Website: mansrovaragrawalsamaj.org | WhatsApp: Samaj Community Portal")

    # Title Banner
    y -= 22 * mm
    c.setFillColor(colors.HexColor("#ea580c"))
    c.rect(margin + 3 * mm, y, width - 2 * margin - 6 * mm, 8 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2.0, y + 2.2 * mm, "MEMBERSHIP APPLICATION FORM / REGISTRATION RECORD")

    # 3. Application Metadata Row
    y -= 7 * mm
    c.setFillColor(colors.HexColor("#1f2937"))
    c.setFont("Helvetica-Bold", 9)
    app_id = str(data.get("application_id") or data.get("request_id") or "APP-NEW").upper()
    if len(app_id) > 18 and "-" in app_id:
        app_id = app_id.split("-")[0]
    
    c.drawString(margin + 5 * mm, y, f"Ref / App ID: {app_id}")

    created_date = data.get("created_at")
    if isinstance(created_date, datetime):
        date_str = created_date.strftime("%d %b %Y, %I:%M %p")
    elif isinstance(created_date, str) and created_date:
        try:
            dt = datetime.fromisoformat(created_date.replace("Z", "+00:00"))
            date_str = dt.strftime("%d %b %Y")
        except Exception:
            date_str = str(created_date)[:10]
    else:
        date_str = datetime.now().strftime("%d %b %Y")

    c.drawRightString(width - margin - 5 * mm, y, f"Date: {date_str}")

    # Separator line
    y -= 3 * mm
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(1)
    c.line(margin + 3 * mm, y, width - margin - 3 * mm, y)

    # 4. Photo Box (Right side)
    photo_w = 30 * mm
    photo_h = 36 * mm
    photo_x = width - margin - photo_w - 5 * mm
    photo_y = y - photo_h - 4 * mm

    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=1)

    photo_loaded = False
    profile_photo = data.get("profile_photo")
    if profile_photo:
        try:
            # Check local file path
            photo_path = profile_photo.lstrip("/")
            if os.path.exists(photo_path):
                c.drawImage(photo_path, photo_x + 1, photo_y + 1, width=photo_w - 2, height=photo_h - 2, preserveAspectRatio=True)
                photo_loaded = True
        except Exception:
            pass

    if not photo_loaded:
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(photo_x + photo_w / 2.0, photo_y + photo_h / 2.0 - 2 * mm, "AFFIX PHOTO")
        c.drawCentredString(photo_x + photo_w / 2.0, photo_y + photo_h / 2.0 - 6 * mm, "(Passport Size)")

    # 5. Applicant Particulars
    y -= 5 * mm
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 5 * mm, y, "1. APPLICANT DETAILS (आवेदक विवरण)")

    c.setStrokeColor(colors.HexColor("#fdba74"))
    c.setLineWidth(0.75)
    c.line(margin + 5 * mm, y - 1.5 * mm, photo_x - 4 * mm, y - 1.5 * mm)

    y -= 3 * mm

    def field_row(label: str, value: Any, max_val_w: float = 75 * mm):
        nonlocal y
        y -= 6.5 * mm
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(colors.HexColor("#4b5563"))
        c.drawString(margin + 5 * mm, y, f"{label}:")
        
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#111827"))
        val_str = str(value).strip() if value is not None and str(value).strip() else "—"
        if len(val_str) > 55:
            val_str = val_str[:52] + "..."
        c.drawString(margin + 42 * mm, y, val_str)

    full_name = f"{data.get('first_name', '')} {data.get('surname', '')}".strip()
    field_row("Full Name", full_name)

    parent_rel = data.get("parent_relation") or "Father / Husband"
    field_row(f"{parent_rel} Name", data.get("father_name"))

    field_row("Mobile No (WhatsApp)", data.get("mobile"))
    field_row("Email Address", data.get("email"))
    field_row("Profession / Business", data.get("profession"))
    field_row("Native Place (मूल निवास)", data.get("native_place"))

    # Samaj ID / LM No (if available)
    lm_no = data.get("lm_no")
    samaj_id = data.get("samaj_id")
    if lm_no or samaj_id:
        lm_str = f"LM No: {lm_no}" if lm_no else ""
        sid_str = f"Samaj ID: {samaj_id}" if samaj_id else ""
        combined = " | ".join(filter(None, [lm_str, sid_str]))
        field_row("Membership ID", combined)

    # Adjust y below the photo if needed
    if y > photo_y:
        y = photo_y - 3 * mm
    else:
        y -= 4 * mm

    # 6. Address Section
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 5 * mm, y, "2. RESIDENTIAL ADDRESS & CONTACT (निवास पता)")

    c.setStrokeColor(colors.HexColor("#fdba74"))
    c.line(margin + 5 * mm, y - 1.5 * mm, width - margin - 5 * mm, y - 1.5 * mm)

    y -= 3 * mm
    address = data.get("address") or "—"
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.HexColor("#4b5563"))
    y -= 6 * mm
    c.drawString(margin + 5 * mm, y, "Present Address:")

    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.HexColor("#111827"))
    
    # Wrap address into up to 2 lines
    if len(address) > 75:
        line1 = address[:75]
        line2 = address[75:150]
        c.drawString(margin + 42 * mm, y, line1)
        y -= 5 * mm
        c.drawString(margin + 42 * mm, y, line2)
    else:
        c.drawString(margin + 42 * mm, y, address)

    bio = data.get("bio")
    if bio:
        y -= 5.5 * mm
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(colors.HexColor("#4b5563"))
        c.drawString(margin + 5 * mm, y, "Additional Notes:")
        c.setFont("Helvetica-Oblique", 8.5)
        c.setFillColor(colors.HexColor("#374151"))
        c.drawString(margin + 42 * mm, y, str(bio)[:80])

    # 7. Declaration / Undertaking
    y -= 10 * mm
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 5 * mm, y, "3. APPLICANT DECLARATION (घोषणा पत्र)")

    c.setStrokeColor(colors.HexColor("#fdba74"))
    c.line(margin + 5 * mm, y - 1.5 * mm, width - margin - 5 * mm, y - 1.5 * mm)

    y -= 3 * mm
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.rect(margin + 5 * mm, y - 22 * mm, width - 2 * margin - 10 * mm, 22 * mm, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica", 8)
    y -= 5 * mm
    c.drawString(margin + 8 * mm, y, "1. I hereby solemnly declare that I belong to the Agrawal / Vaishya community.")
    y -= 4 * mm
    c.drawString(margin + 8 * mm, y, "2. All details provided in this application are correct and verified to the best of my knowledge.")
    y -= 4 * mm
    c.drawString(margin + 8 * mm, y, "3. I pledge to adhere to the constitution, rules, and moral traditions of Mansrovar Agrawal Samaj Jaipur.")
    y -= 4 * mm
    c.drawString(margin + 8 * mm, y, "4. Verification was completed via authenticated WhatsApp Mobile OTP verification.")

    y -= 10 * mm
    # Signatures
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(margin + 10 * mm, y, f"Applicant: {full_name}")
    c.drawRightString(width - margin - 10 * mm, y, "Signature / Digital Verification: [ VERIFIED ]")

    # 8. For Office Use Only (कार्यालय उपयोग हेतु)
    y -= 12 * mm
    c.setFillColor(colors.HexColor("#78350f"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 5 * mm, y, "4. FOR OFFICE / EXECUTIVE COMMITTEE USE (कार्यालय उपयोग हेतु)")

    c.setStrokeColor(colors.HexColor("#b45309"))
    c.line(margin + 5 * mm, y - 1.5 * mm, width - margin - 5 * mm, y - 1.5 * mm)

    y -= 3 * mm
    c.setFillColor(colors.HexColor("#fffbeb"))
    c.setStrokeColor(colors.HexColor("#fde68a"))
    c.rect(margin + 5 * mm, y - 20 * mm, width - 2 * margin - 10 * mm, 20 * mm, fill=1, stroke=1)

    y -= 6 * mm
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.HexColor("#78350f"))
    c.drawString(margin + 8 * mm, y, f"Allocated Life Member No (LM No.): {lm_no or '___________________'}")
    c.drawRightString(width - margin - 8 * mm, y, "Approval Status: [ APPROVED / PENDING ]")

    y -= 7 * mm
    c.drawString(margin + 8 * mm, y, "Verified by Executive Committee: ___________________")
    c.drawRightString(width - margin - 8 * mm, y, "President / Gen. Secretary Signature")

    # Footer note
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#9ca3af"))
    c.drawCentredString(width / 2.0, margin + 4 * mm, "Mansrovar Agrawal Samaj Jaipur • Official Membership Application Record • Generated by Portal")

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()

    if save_to_file:
        _ensure_dir()
        file_id = app_id.replace("/", "_").replace(" ", "_")
        filepath = APPLICATIONS_PDF_DIR / f"{file_id}.pdf"
        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

    return pdf_bytes
