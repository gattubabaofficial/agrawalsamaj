import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.SMTP_FROM
        msg['To'] = to_email
        
        # Attach HTML body
        part = MIMEText(html_content, 'html')
        msg.attach(part)
        
        # Connect to server and send
        # If port is 465 use SMTP_SSL, if 587 use STARTTLS
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # Continue execution, return false instead of raising error
        return False

async def send_otp_email(to_email: str, otp: str) -> bool:
    subject = "Agrawal Samaj Community Portal - OTP Verification"
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 40px; text-align: center;">
                <h2 style="color: #FF9933; margin-bottom: 20px;">Agrawal Samaj Portal</h2>
                <p style="font-size: 16px; color: #1f2937;">Use the OTP below to complete registration or login:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #000000; margin: 30px 0; background-color: #f3f4f6; padding: 15px; border-radius: 6px; display: inline-block;">
                    {otp}
                </div>
                <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
        </body>
    </html>
    """
    return await send_email(to_email, subject, html_content)
