from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agrawal Samaj API"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field("SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION", env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database
    DATABASE_URL: str = Field("sqlite+aiosqlite:///./test.db", env="DATABASE_URL")
    
    # Redis (For Socket.IO and Rate limiting, optional if not supplied)
    REDIS_URL: str = Field("redis://localhost:6379/0", env="REDIS_URL")
    
    # Razorpay (For Events and Bhavan booking)
    RAZORPAY_KEY_ID: str = Field("rzp_test_dummy_key_id", env="RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET: str = Field("rzp_test_dummy_key_secret", env="RAZORPAY_KEY_SECRET")
    RAZORPAY_CONVENIENCE_FEE_PCT: float = 2.0  # 2% Convenience fee for transaction recovery
    
    # SMTP Settings (Gmail)
    SMTP_HOST: str = Field("smtp.gmail.com", env="SMTP_HOST")
    SMTP_PORT: int = Field(587, env="SMTP_PORT")
    SMTP_USER: str = Field("noreply.agrawalsamaj@gmail.com", env="SMTP_USER")
    SMTP_PASSWORD: str = Field("dummy_app_password", env="SMTP_PASSWORD")
    SMTP_FROM: str = Field("Agrawal Samaj Community <noreply.agrawalsamaj@gmail.com>", env="SMTP_FROM")
    
    # Fast2SMS OTP
    FAST2SMS_API_KEY: str = Field("dummy_fast2sms_api_key", env="FAST2SMS_API_KEY")
    
    # Allowed CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
