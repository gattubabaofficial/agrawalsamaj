import os
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from datetime import datetime

def send_email(to_email: str, subject: str, message_body: str) -> bool:
    """
    Sends an HTML email using Resend API, SendGrid API, or SMTP relay.
    Falls back to console logging if dummy mode is active or no credentials are set.
    """
    # 1. Read configuration
    resend_key = os.getenv("RESEND_API_KEY")
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    brevo_key = os.getenv("BREVO_API_KEY")
    from_email = os.getenv("FROM_EMAIL")
    from_name = os.getenv("EMAIL_FROM_NAME", "Agrawal Samaj Mansrovar Jaipur")
    
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_APP_PASSWORD")

    # If FROM_EMAIL is not configured, or if we are using a personal Gmail SMTP account,
    # default to the authenticated SMTP user to prevent SPF/DMARC spoofing/misalignment flags
    if not from_email or (smtp_user and "gmail.com" in smtp_user):
        from_email = smtp_user
        
    if not from_email:
        from_email = "noreply@agrawalsamaj.org"

    # If dummy or not configured, print to console
    is_dummy = (
        not resend_key and not sendgrid_key and not brevo_key and
        (not smtp_user or smtp_user == "dummy@gmail.com" or not smtp_pass or smtp_pass == "dummy_app_password")
    )
    if is_dummy:
        print(f"\n==========================================")
        print(f"[DUMMY EMAIL DISPATCHED]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Message: {message_body}")
        print(f"==========================================\n")
        return True

    # 2. Extract OTP for structured rendering
    otp_code = None
    otp_match = re.search(r'\b\d{6}\b', message_body)
    if otp_match:
        otp_code = otp_match.group(0)

    # 3. Create minimal HTML email body to bypass spam filters
    if otp_code:
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 20px;">
    <div style="max-width: 500px; margin: 20px auto; background-color: #ffffff; padding: 30px; border: 1px solid #e4e4e7; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: bold; border-bottom: 1px solid #f4f4f5; padding-bottom: 15px;">{from_name}</h2>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.5; margin: 20px 0;">Please use the following verification code to complete your request:</p>
        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 18px; text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #18181b; font-family: monospace;">{otp_code}</span>
        </div>
        <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin-bottom: 0;">This code is valid for 5 minutes. For security, do not share it with anyone. If you did not make this request, you can safely ignore this email.</p>
    </div>
</body>
</html>"""
    else:
        html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #18181b; padding: 20px;">
    <h2 style="font-size: 18px; font-weight: bold; margin-top: 0;">{subject}</h2>
    <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">{message_body}</p>
</body>
</html>"""

    # 4. Attempt Resend API
    if resend_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "from": f"{from_name} <{from_email}>",
                "to": [to_email],
                "subject": subject,
                "text": message_body,
                "html": html_content
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.post("https://api.resend.com/emails", json=payload, headers=headers)
                if response.status_code in [200, 201, 202]:
                    return True
                else:
                    print(f"Resend API Error status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Failed to send email via Resend API: {e}")
            print("Falling back to next provider...")

    # 5. Attempt SendGrid API
    if sendgrid_key:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail as SGMail
            
            message = SGMail(
                from_email=(from_email, from_name),
                to_emails=to_email,
                subject=subject,
                plain_text_content=message_body,
                html_content=html_content
            )
            sg = SendGridAPIClient(sendgrid_key)
            response = sg.send(message)
            if response.status_code in [200, 201, 202]:
                return True
            else:
                print(f"SendGrid API Error status: {response.status_code}")
        except Exception as e:
            print(f"Failed to send email via SendGrid API: {e}")
            print("Falling back to next provider...")

    # 6. Attempt Brevo API
    if brevo_key:
        try:
            import httpx
            headers = {
                "api-key": brevo_key,
                "Content-Type": "application/json",
                "accept": "application/json"
            }
            payload = {
                "sender": {"name": from_name, "email": from_email},
                "to": [{"email": to_email}],
                "subject": subject,
                "textContent": message_body,
                "htmlContent": html_content
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
                if response.status_code in [200, 201, 202]:
                    return True
                else:
                    print(f"Brevo API Error status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Failed to send email via Brevo API: {e}")
            print("Falling back to next provider...")

    # 7. SMTP Relay
    try:
        # Determine sender domain for Message-ID
        sender_domain = "agrawalsamaj.org"
        if from_email and "@" in from_email:
            sender_domain = from_email.split("@")[-1]

        # Create message container
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg['Reply-To'] = from_email
        
        # Standard anti-spam headers
        msg['Date'] = formatdate(localtime=True)
        msg['Message-ID'] = make_msgid(domain=sender_domain)

        # Attach text and html parts
        part_text = MIMEText(message_body, 'plain')
        part_html = MIMEText(html_content, 'html')
        msg.attach(part_text)
        msg.attach(part_html)
        
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email via SMTP: {e}")
        return False
