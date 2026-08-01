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

    # Shared secret the Next.js server must present (via X-Internal-Secret) when
    # bridging an already-verified OAuth sign-in to /auth/register/oauth. Without
    # this, that endpoint would trust a client-supplied email + provider_id with
    # no proof the caller ever authenticated with Google/Yahoo — letting anyone
    # hijack an existing account by email. Empty = open (dev only).
    INTERNAL_API_SECRET: str = ""

    # Database
    # Default to sqlite locally if postgres is not configured
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"

    # Redis
    REDIS_URL: Optional[str] = None

    # Razorpay Settings
    RAZORPAY_KEY_ID: str = "rzp_test_123"
    RAZORPAY_KEY_SECRET: str = "rzp_test_secret"

    # Twilio Settings (SMS OTP only — WhatsApp delivery uses the whatsapp-web.js
    # sidecar below; the old Twilio WhatsApp path was removed since it couldn't
    # reach localhost media and its "auth" was Account SID/Token, not a real key)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # Public base URL of THIS backend — used to build /static/... media links.
    DOMAIN_URL: str = "http://localhost:8000"
    # Public base URL of the Next.js frontend — used to build links that a human
    # opens, e.g. the /verify-pass/<id> target encoded into pass QR codes.
    # Must be reachable from the device scanning the QR, so never "localhost"
    # when serving over a network.
    FRONTEND_URL: str = "http://localhost:3000"

    # WhatsApp provider: 'whatsapp_web' (whatsapp-web.js sidecar) or 'dummy'
    # (just logs, no actual send). Twilio WhatsApp support was removed — see
    # whatsapp-service/README.md for why.
    WHATSAPP_PROVIDER: str = "whatsapp_web"

    # whatsapp-web.js sidecar (see /whatsapp-service)
    WHATSAPP_WEB_URL: str = "http://localhost:3001"
    WHATSAPP_WEB_API_KEY: str = ""
    WHATSAPP_WEB_TIMEOUT: int = 300

    # Deliver phone OTPs over WhatsApp, falling back to SMS when the sidecar
    # is down or the number has no WhatsApp account. Set false to go back to
    # SMS only.
    OTP_PREFER_WHATSAPP: bool = True
    # Separate, much shorter timeout for OTP sends. Someone is sitting on a
    # login screen waiting: better to give up quickly and fall back to SMS
    # than to hold the request open for WHATSAPP_WEB_TIMEOUT seconds.
    OTP_WHATSAPP_TIMEOUT: int = 12

    # Local development only: return the OTP in the API response and accept a
    # console-only "send" as delivered.
    #
    # Defaults to False deliberately, and is NOT keyed off ENVIRONMENT —
    # ENVIRONMENT itself defaults to "development", so anything derived from it
    # would expose OTPs on any deployment that forgot to set it. Leaking
    # verification codes has to require someone explicitly opting in.
    OTP_DEBUG_RETURN_CODE: bool = False

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
