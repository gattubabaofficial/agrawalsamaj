import os
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def test_current_env():
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_APP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL")
    
    print("--- TESTING CURRENT SMTP SETTINGS ---")
    print(f"Host: {smtp_host}")
    print(f"Port: {smtp_port}")
    print(f"User: {smtp_user}")
    print(f"Pass: {'configured' if smtp_pass else 'missing'}")
    print(f"From Email: {from_email}")
    
    if not smtp_host or not smtp_port or not smtp_user or not smtp_pass:
        print("Error: SMTP configuration is incomplete in .env.")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = from_email or smtp_user
        msg['To'] = smtp_user
        msg['Subject'] = "SMTP Connection Test"
        msg.attach(MIMEText("Test connection", 'plain'))
        
        print("\nConnecting to SMTP server...")
        server = smtplib.SMTP(smtp_host, int(smtp_port), timeout=10)
        print("Sending EHLO...")
        server.ehlo()
        print("Starting TLS...")
        server.starttls()
        print("Sending EHLO after TLS...")
        server.ehlo()
        print("Logging in...")
        server.login(smtp_user, smtp_pass)
        print("Sending test message...")
        server.send_message(msg)
        server.quit()
        print("\nSMTP TEST SUCCESSFUL!")
    except Exception as e:
        print("\nSMTP CONNECTION FAILED:")
        traceback.print_exc()

if __name__ == "__main__":
    test_current_env()
