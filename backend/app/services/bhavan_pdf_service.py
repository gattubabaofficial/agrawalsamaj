"""Bhavan Booking Enquiry / Request PDF generation service.

Generates an official PDF for Bhavan booking enquiries / requests.
Uses ReportLab to render a clean, high-quality, professional document.
"""
import io
import os
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ENQUIRIES_PDF_DIR = Path("static/bhavan_enquiries")


def _ensure_dir() -> None:
    ENQUIRIES_PDF_DIR.mkdir(parents=True, exist_ok=True)


def _format_date(val: Any) -> str:
    if not val:
        return "—"
    if isinstance(val, (date, datetime)):
        return val.strftime("%d %b %Y")
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt.strftime("%d %b %Y")
        except Exception:
            return str(val)[:10]
    return str(val)


def _format_datetime(val: Any) -> str:
    if not val:
        return "—"
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y, %I:%M %p")
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt.strftime("%d %b %Y, %I:%M %p")
        except Exception:
            return str(val)
    return str(val)


def _format_currency(amount: Any) -> str:
    if amount is None or amount == "":
        return "₹0.00"
    try:
        val = float(amount)
        return f"₹{val:,.2f}"
    except (ValueError, TypeError):
        return f"₹{amount}"


def generate_bhavan_enquiry_pdf(
    enquiry: Any,
    save_to_file: bool = False,
) -> bytes:
    """
    Renders an official Bhavan Booking Application / Enquiry Form PDF.
    `enquiry` can be an ORM BhavanEnquiry instance or a dictionary.
    """
    # Extract fields safely from ORM or dict
    def get_val(key: str, default=None):
        if isinstance(enquiry, dict):
            return enquiry.get(key, default)
        return getattr(enquiry, key, default)

    reference = str(get_val("reference") or "BV-TEMP")
    full_name = str(get_val("full_name") or "Applicant")
    mobile = str(get_val("mobile") or "—")
    whatsapp_number = get_val("whatsapp_number") or mobile
    email = get_val("email") or "—"
    address = get_val("address") or "—"
    city = get_val("city") or "—"
    state = get_val("state") or "—"

    check_in = get_val("check_in")
    check_out = get_val("check_out")
    nights = get_val("nights") or 1
    purpose_name = get_val("purpose_name") or "General Stay / Event"
    guests_total = get_val("guests_total") or 0
    adults = get_val("adults") or 0
    children = get_val("children") or 0

    special_requirements = get_val("special_requirements")
    message = get_val("message")
    status_raw = get_val("status")
    status_val = status_raw.value if hasattr(status_raw, "value") else str(status_raw or "PENDING")
    source_raw = get_val("source")
    source_val = source_raw.value if hasattr(source_raw, "value") else str(source_raw or "ONLINE")

    created_at = get_val("created_at") or datetime.now()
    estimated_total = get_val("estimated_total") or 0
    quote_snapshot = get_val("quote_snapshot") or {}

    accommodations = get_val("accommodations") or []
    amenities = get_val("amenities") or []

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 14 * mm

    # 1. Outer Decorative Double Border
    c.setStrokeColor(colors.HexColor("#b45309"))
    c.setLineWidth(1.5)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    c.setStrokeColor(colors.HexColor("#fef3c7"))
    c.setLineWidth(0.75)
    c.rect(margin + 2 * mm, margin + 2 * mm, width - 2 * margin - 4 * mm, height - 2 * margin - 4 * mm)

    y = height - margin - 8 * mm

    # 2. Header Banner
    c.setFillColor(colors.HexColor("#fffbeb"))
    c.rect(margin + 3 * mm, y - 18 * mm, width - 2 * margin - 6 * mm, 24 * mm, fill=1, stroke=0)

    # Header Titles
    c.setFillColor(colors.HexColor("#78350f"))
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(width / 2.0, y + 1 * mm, "MANSROVAR AGRAWAL SAMAJ JAIPUR")

    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(colors.HexColor("#b45309"))
    c.drawCentredString(width / 2.0, y - 4 * mm, "AGRASEN BHAWAN, SECTOR 5, MANSAROVAR, JAIPUR - 302020")

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#6b7280"))
    c.drawCentredString(width / 2.0, y - 8.5 * mm, "Website: mansrovaragrawalsamaj.org | Bhavan Booking Administration")

    # Document Title Strip
    y -= 21 * mm
    c.setFillColor(colors.HexColor("#ea580c"))
    c.rect(margin + 3 * mm, y, width - 2 * margin - 6 * mm, 7.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawCentredString(width / 2.0, y + 2.2 * mm, "BHAVAN BOOKING REQUEST / APPLICATION SUMMARY")

    # 3. Metadata Bar (Ref, Date, Status, Source)
    y -= 7.5 * mm
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.rect(margin + 3 * mm, y - 1 * mm, width - 2 * margin - 6 * mm, 7 * mm, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin + 6 * mm, y + 1.2 * mm, f"Booking Ref: {reference}")

    c.setFont("Helvetica", 8.5)
    c.drawString(margin + 65 * mm, y + 1.2 * mm, f"Date: {_format_datetime(created_at)}")

    # Status Tag
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin + 125 * mm, y + 1.2 * mm, "Status:")
    status_upper = str(status_val).upper()
    if status_upper == "APPROVED":
        c.setFillColor(colors.HexColor("#059669"))
    elif status_upper in ("REJECTED", "CANCELLED"):
        c.setFillColor(colors.HexColor("#dc2626"))
    else:
        c.setFillColor(colors.HexColor("#d97706"))
    c.drawString(margin + 138 * mm, y + 1.2 * mm, status_upper)

    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("Helvetica", 8)
    c.drawRightString(width - margin - 6 * mm, y + 1.2 * mm, f"Source: {str(source_val).upper()}")

    y -= 4 * mm

    # 4. Two-Column Grid: Section 1 (Applicant) & Section 2 (Stay / Event)
    col_w = (width - 2 * margin - 10 * mm) / 2.0
    col1_x = margin + 4 * mm
    col2_x = margin + 6 * mm + col_w
    sec_h = 37 * mm

    y -= sec_h

    # Column 1: Applicant Details Box
    c.setFillColor(colors.HexColor("#ffffff"))
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.rect(col1_x, y, col_w, sec_h, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#fff7ed"))
    c.rect(col1_x, y + sec_h - 6 * mm, col_w, 6 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(col1_x + 3 * mm, y + sec_h - 4.2 * mm, "1. APPLICANT DETAILS (आवेदक विवरण)")

    def draw_col_row(base_x: float, base_y: float, label: str, value: Any):
        c.setFont("Helvetica-Bold", 7.5)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(base_x + 3 * mm, base_y, f"{label}:")
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#0f172a"))
        val_str = str(value).strip() if value is not None and str(value).strip() else "—"
        if len(val_str) > 34:
            val_str = val_str[:32] + ".."
        c.drawString(base_x + 28 * mm, base_y, val_str)

    row_y = y + sec_h - 10 * mm
    draw_col_row(col1_x, row_y, "Full Name", full_name)
    row_y -= 5 * mm
    draw_col_row(col1_x, row_y, "Mobile No.", mobile)
    row_y -= 5 * mm
    draw_col_row(col1_x, row_y, "WhatsApp", whatsapp_number)
    row_y -= 5 * mm
    draw_col_row(col1_x, row_y, "Email", email)
    row_y -= 5 * mm
    loc_str = f"{city}, {state}" if (city != "—" and state != "—") else (city if city != "—" else address)
    draw_col_row(col1_x, row_y, "Location", loc_str)

    # Column 2: Stay & Event Details Box
    c.setFillColor(colors.HexColor("#ffffff"))
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.rect(col2_x, y, col_w, sec_h, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#fff7ed"))
    c.rect(col2_x, y + sec_h - 6 * mm, col_w, 6 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(col2_x + 3 * mm, y + sec_h - 4.2 * mm, "2. STAY & EVENT DETAILS (प्रवास विवरण)")

    row2_y = y + sec_h - 10 * mm
    draw_col_row(col2_x, row2_y, "Check-in", f"{_format_date(check_in)} (12:00 PM)")
    row2_y -= 5 * mm
    draw_col_row(col2_x, row2_y, "Check-out", f"{_format_date(check_out)} (11:00 AM)")
    row2_y -= 5 * mm
    draw_col_row(col2_x, row2_y, "Duration", f"{nights} Night(s)")
    row2_y -= 5 * mm
    draw_col_row(col2_x, row2_y, "Purpose", purpose_name)
    row2_y -= 5 * mm
    guest_str = f"{guests_total} (Adults: {adults}, Kids: {children})" if guests_total else f"Adults: {adults}, Kids: {children}"
    draw_col_row(col2_x, row2_y, "Total Guests", guest_str)

    y -= 5 * mm

    # 5. Accommodations & Amenities Requested Section
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin + 4 * mm, y, "3. REQUESTED ACCOMMODATION & AMENITIES (आरक्षित आवास एवं सुविधाएं)")

    c.setStrokeColor(colors.HexColor("#fdba74"))
    c.setLineWidth(0.75)
    c.line(margin + 4 * mm, y - 1.5 * mm, width - margin - 4 * mm, y - 1.5 * mm)

    y -= 5 * mm

    # Table Header
    tbl_x = margin + 4 * mm
    tbl_w = width - 2 * margin - 8 * mm
    tbl_header_h = 6 * mm

    c.setFillColor(colors.HexColor("#f1f5f9"))
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.rect(tbl_x, y - tbl_header_h, tbl_w, tbl_header_h, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(tbl_x + 3 * mm, y - 4.2 * mm, "ITEM / FACILITY NAME")
    c.drawString(tbl_x + 65 * mm, y - 4.2 * mm, "TYPE")
    c.drawString(tbl_x + 95 * mm, y - 4.2 * mm, "QTY")
    c.drawString(tbl_x + 115 * mm, y - 4.2 * mm, "RATE / NIGHT")
    c.drawRightString(tbl_x + tbl_w - 3 * mm, y - 4.2 * mm, "AMOUNT (₹)")

    y -= tbl_header_h

    # Table Rows for Accommodations
    row_count = 0
    for acc in accommodations:
        row_count += 1
        acc_name = getattr(acc, "type_name_snapshot", None) or (acc.get("type_name_snapshot") if isinstance(acc, dict) else None) or (acc.get("type_name") if isinstance(acc, dict) else "Room / Hall")
        qty = getattr(acc, "quantity", None) or (acc.get("quantity") if isinstance(acc, dict) else 1)
        acc_nights = getattr(acc, "nights", None) or (acc.get("nights") if isinstance(acc, dict) else nights)
        unit_price = getattr(acc, "unit_price_snapshot", None) or (acc.get("unit_price_snapshot") if isinstance(acc, dict) else 0)
        line_total = getattr(acc, "line_total", None) or (acc.get("line_total") if isinstance(acc, dict) else 0)

        row_h = 5.5 * mm
        c.setFillColor(colors.white if row_count % 2 == 1 else colors.HexColor("#f8fafc"))
        c.rect(tbl_x, y - row_h, tbl_w, row_h, fill=1, stroke=1)

        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(tbl_x + 3 * mm, y - 3.8 * mm, str(acc_name)[:38])

        c.setFont("Helvetica", 7.5)
        c.drawString(tbl_x + 65 * mm, y - 3.8 * mm, "Accommodation")
        c.drawString(tbl_x + 95 * mm, y - 3.8 * mm, f"{qty} unit(s)")
        c.drawString(tbl_x + 115 * mm, y - 3.8 * mm, _format_currency(unit_price))
        c.drawRightString(tbl_x + tbl_w - 3 * mm, y - 3.8 * mm, _format_currency(line_total))
        y -= row_h

    # Table Rows for Amenities
    for amen in amenities:
        row_count += 1
        amen_name = getattr(amen, "name_snapshot", None) or (amen.get("name_snapshot") if isinstance(amen, dict) else None) or (amen.get("name") if isinstance(amen, dict) else "Amenity")
        qty = getattr(amen, "quantity", None) or (amen.get("quantity") if isinstance(amen, dict) else 1)
        pricing_type = getattr(amen, "pricing_type_snapshot", None) or (amen.get("pricing_type_snapshot") if isinstance(amen, dict) else "per_booking")
        unit_price = getattr(amen, "unit_price_snapshot", None) or (amen.get("unit_price_snapshot") if isinstance(amen, dict) else 0)
        line_total = getattr(amen, "line_total", None) or (amen.get("line_total") if isinstance(amen, dict) else 0)

        row_h = 5.5 * mm
        c.setFillColor(colors.white if row_count % 2 == 1 else colors.HexColor("#f8fafc"))
        c.rect(tbl_x, y - row_h, tbl_w, row_h, fill=1, stroke=1)

        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica", 7.5)
        c.drawString(tbl_x + 3 * mm, y - 3.8 * mm, str(amen_name)[:38])
        c.drawString(tbl_x + 65 * mm, y - 3.8 * mm, f"Amenity ({str(pricing_type).replace('_', ' ')})")
        c.drawString(tbl_x + 95 * mm, y - 3.8 * mm, f"{qty} unit(s)")
        c.drawString(tbl_x + 115 * mm, y - 3.8 * mm, _format_currency(unit_price))
        c.drawRightString(tbl_x + tbl_w - 3 * mm, y - 3.8 * mm, _format_currency(line_total))
        y -= row_h

    if row_count == 0:
        row_h = 6 * mm
        c.setFillColor(colors.white)
        c.rect(tbl_x, y - row_h, tbl_w, row_h, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica-Oblique", 7.5)
        c.drawString(tbl_x + 3 * mm, y - 4.2 * mm, "General Bhavan Booking (Room allocations assigned upon review)")
        c.drawRightString(tbl_x + tbl_w - 3 * mm, y - 4.2 * mm, _format_currency(estimated_total))
        y -= row_h

    y -= 4 * mm

    # 6. Pricing & Financial Summary (4. अनुमानित शुल्क विवरण)
    c.setFillColor(colors.HexColor("#fffbeb"))
    c.setStrokeColor(colors.HexColor("#fcd34d"))
    c.rect(tbl_x, y - 16 * mm, tbl_w, 16 * mm, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#78350f"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(tbl_x + 4 * mm, y - 4.5 * mm, "ESTIMATED TOTAL / अनुमानित कुल राशि:")

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#b45309"))
    c.drawRightString(tbl_x + tbl_w - 4 * mm, y - 5 * mm, _format_currency(estimated_total))

    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#92400e"))
    c.drawString(tbl_x + 4 * mm, y - 8.5 * mm, "* Note: This is an estimated application quote based on tariff rules at the time of submission.")
    c.drawString(tbl_x + 4 * mm, y - 12 * mm, "  Final confirmation, room allocation, security deposit & applicable taxes are finalized by Bhavan Management.")

    y -= 20 * mm

    # Special Requirements & Message (if provided)
    if special_requirements or message:
        req_text = " • ".join(filter(None, [
            f"Requirements: {special_requirements}" if special_requirements else "",
            f"Message: {message}" if message else "",
        ]))
        if req_text:
            c.setFillColor(colors.HexColor("#f8fafc"))
            c.setStrokeColor(colors.HexColor("#e2e8f0"))
            c.rect(tbl_x, y - 8 * mm, tbl_w, 8 * mm, fill=1, stroke=1)
            c.setFillColor(colors.HexColor("#475569"))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(tbl_x + 3 * mm, y - 3.5 * mm, "Notes / Special Requests:")
            c.setFont("Helvetica", 7.5)
            c.drawString(tbl_x + 38 * mm, y - 3.5 * mm, req_text[:90])
            y -= 10 * mm

    # 7. Terms & Digital Verification Note
    c.setFillColor(colors.HexColor("#9a3412"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin + 4 * mm, y, "4. APPLICANT UNDERTAKING & DECLARATION (घोषणा)")

    c.setStrokeColor(colors.HexColor("#fdba74"))
    c.setLineWidth(0.75)
    c.line(margin + 4 * mm, y - 1.5 * mm, width - margin - 4 * mm, y - 1.5 * mm)

    y -= 3 * mm
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica", 7.5)
    y -= 3.8 * mm
    c.drawString(margin + 6 * mm, y, "1. I / We agree to strictly abide by the rules, premises guidelines, and code of conduct of Agrasen Bhawan Jaipur.")
    y -= 3.5 * mm
    c.drawString(margin + 6 * mm, y, "2. Alcoholic beverages, smoking, non-vegetarian food, and unlawful activities are strictly prohibited in the Bhavan premises.")
    y -= 3.5 * mm
    c.drawString(margin + 6 * mm, y, "3. Identity verification completed via authenticated Mobile OTP verification on the official Samaj portal.")

    # 8. For Office / Bhavan Management Use (कार्यालय उपयोग हेतु)
    y -= 6 * mm
    c.setFillColor(colors.HexColor("#78350f"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(margin + 4 * mm, y, "5. FOR OFFICE & MANAGEMENT USE (कार्यालय उपयोग हेतु)")

    c.setStrokeColor(colors.HexColor("#b45309"))
    c.line(margin + 4 * mm, y - 1.5 * mm, width - margin - 4 * mm, y - 1.5 * mm)

    y -= 3 * mm
    c.setFillColor(colors.HexColor("#fffbeb"))
    c.setStrokeColor(colors.HexColor("#fde68a"))
    c.rect(margin + 4 * mm, y - 16 * mm, width - 2 * margin - 8 * mm, 16 * mm, fill=1, stroke=1)

    y -= 5 * mm
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(colors.HexColor("#78350f"))
    c.drawString(margin + 7 * mm, y, "Booking Status: [ APPROVED / PENDING / REJECTED ]")
    c.drawRightString(width - margin - 7 * mm, y, "Security Deposit Amount: ₹________________")

    y -= 6 * mm
    c.drawString(margin + 7 * mm, y, "Allocated Room / Hall Nos: _________________________")
    c.drawRightString(width - margin - 7 * mm, y, "Manager / In-charge Signature: ________________")

    # 9. Bottom Footer
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#9ca3af"))
    c.drawCentredString(width / 2.0, margin + 4 * mm, "Mansrovar Agrawal Samaj Jaipur • Agrasen Bhawan Booking Request Document • Generated via Samaj Portal")

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()

    if save_to_file:
        _ensure_dir()
        file_ref = reference.replace("/", "_").replace(" ", "_")
        filepath = ENQUIRIES_PDF_DIR / f"{file_ref}.pdf"
        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

    return pdf_bytes
