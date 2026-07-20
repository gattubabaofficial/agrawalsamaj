import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Agrawal Samaj Portal"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "super-secret-development-key-that-is-very-long-and-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    # Default to sqlite locally if postgres is not configured
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"

    # Redis
    REDIS_URL: Optional[str] = None

    # Razorpay Settings
    RAZORPAY_KEY_ID: str = "rzp_test_123"
    RAZORPAY_KEY_SECRET: str = "rzp_test_secret"

    # Twilio Settings
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = None
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"
    TWILIO_CONTENT_SID: str = ""
    TWILIO_STATUS_CALLBACK_URL: str = ""

    # Public base URL of THIS backend — used to build /static/... media links.
    DOMAIN_URL: str = "http://localhost:8000"
    # Public base URL of the Next.js frontend — used to build links that a human
    # opens, e.g. the /verify-pass/<id> target encoded into pass QR codes.
    # Must be reachable from the device scanning the QR, so never "localhost"
    # when serving over a network.
    FRONTEND_URL: str = "http://localhost:3000"

    # WhatsApp provider: 'whatsapp_web' (whatsapp-web.js sidecar), 'twilio',
    # or 'dummy' (just logs, no actual send)
    WHATSAPP_PROVIDER: str = "whatsapp_web"

    # whatsapp-web.js sidecar (see /whatsapp-service)
    WHATSAPP_WEB_URL: str = "http://localhost:3001"
    WHATSAPP_WEB_API_KEY: str = ""
    WHATSAPP_WEB_TIMEOUT: int = 60

    # Email
    FROM_EMAIL: str = "noreply@agrawalsamaj.org"
    SENDGRID_API_KEY: Optional[str] = None
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Object Storage (MinIO / S3)
    MINIO_ENDPOINT: Optional[str] = None
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_BUCKET: str = "samaj-media"
    MINIO_SECURE: bool = False

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
