from dotenv import load_dotenv
# Load environment variables before any other imports
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.membership import router as membership_router
from app.routers.family import router as family_router
from app.routers.events import router as events_router
from app.routers.bookings import router as bookings_router
from app.routers.donations import router as donations_router
from app.routers.dashboard import router as dashboard_router
from app.routers.passes import router as passes_router
from app.routers.chat import router as chat_router
from app.routers.blog import router as blog_router
from app.routers.admin import router as admin_router
from app.routers.receipts import router as receipts_router
from app.routers.vouchers import router as vouchers_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Agrawal Samaj Management Portal",
    version="1.0.0",
)


@app.on_event("startup")
async def on_startup():
    from app.database import engine, Base
    import app.models.user
    import app.models.requests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE users ADD COLUMN father_name VARCHAR(100)"))
        except Exception:
            pass


# CORS middleware configuration
local_origin_regex = r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?"

from fastapi.staticfiles import StaticFiles
from pathlib import Path

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=local_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve uploaded blog media files
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(membership_router)
app.include_router(family_router)
app.include_router(events_router)
app.include_router(bookings_router)
app.include_router(donations_router)
app.include_router(dashboard_router)
app.include_router(passes_router)
app.include_router(chat_router)
app.include_router(blog_router)
app.include_router(admin_router)
app.include_router(receipts_router)
app.include_router(vouchers_router)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to the {settings.APP_NAME} API",
        "environment": settings.ENVIRONMENT,
        "status": "healthy"
    }


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }
