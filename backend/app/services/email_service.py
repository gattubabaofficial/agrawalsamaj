import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email: str, subject: str, message_body: str) -> bool:
    """
    Sends an email using the configured SMTP server (e.g., Gmail).
    Fallback to console logging if dummy mode is active or credentials are not set.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_APP_PASSWORD")
    from_name = os.getenv("EMAIL_FROM_NAME", "Agrawal Samaj")
    
    if not smtp_user or smtp_user == "dummy@gmail.com" or not smtp_pass or smtp_pass == "dummy_app_password":
        # Simulate Email sending in development
        print(f"\n==========================================")
        print(f"📧 DUMMY EMAIL DISPATCHED")
        print(f"✉️ To: {to_email}")
        print(f"🏷️ Subject: {subject}")
        print(f"💬 Message: {message_body}")
        print(f"==========================================\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = f"{from_name} <{smtp_user}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(message_body, 'plain'))
        
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email via SMTP: {e}")
        return False
