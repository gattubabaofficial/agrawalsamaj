from dotenv import load_dotenv
# Load environment variables before any other imports
load_dotenv(override=True)

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.membership import router as membership_router
from app.routers.special_events import router as special_events_router
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
from app.routers.role import router as role_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Agrawal Samaj Mansrovar Jaipur Management Portal",
    version="1.0.0",
)


@app.on_event("startup")
async def on_startup():
    # SQLite's create_all only creates missing tables, never adds columns to an
    # existing one. Add newer columns idempotently (each ALTER fails harmlessly
    # once the column already exists).
    from app.database import engine, Base
    import app.models.user
    import app.models.requests
    import app.models.role
    import app.models.blog
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    from sqlalchemy import text
    for ddl in (
        "ALTER TABLE users ADD COLUMN father_name VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN lm_no INTEGER",
        "ALTER TABLE users ADD COLUMN zone VARCHAR(60)",
        "ALTER TABLE users ADD COLUMN house_no VARCHAR(60)",
        "ALTER TABLE users ADD COLUMN contact_mobile VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN member_status VARCHAR(30) DEFAULT 'active'",
        "ALTER TABLE users ADD COLUMN native_place VARCHAR(200)",
        "ALTER TABLE users ADD COLUMN bio VARCHAR(1000)",
        "ALTER TABLE users ADD COLUMN profession_private BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN native_place_private BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN bio_private BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN custom_role_id VARCHAR(36)",
        "ALTER TABLE blogs ADD COLUMN guest_name VARCHAR(200)",
        "ALTER TABLE blogs ADD COLUMN guest_email VARCHAR(300)",
        "ALTER TABLE blogs ADD COLUMN guest_phone VARCHAR(20)",
    ):
        try:
            async with engine.begin() as conn:
                await conn.execute(text(ddl))
        except Exception:
            pass


# CORS middleware configuration - allow all origins for online deployment (Vercel / Render / Custom Domain)
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agrawalsamaj.vercel.app",
        "https://agrawalsamaj-backend-production.up.railway.app",
        "http://localhost:3000", # Keeping localhost so your local development doesn't break!
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/uploads/{category}/{filename}")
async def serve_upload_file(category: str, filename: str):
    from app.models.blog import UploadedFile
    from app.database import get_db_session
    from sqlalchemy import select
    
    try:
        async for db in get_db_session():
            result = await db.execute(select(UploadedFile).where(UploadedFile.filename == filename))
            db_file = result.scalars().first()
            if db_file:
                return Response(content=db_file.data, media_type=db_file.mimetype)
    except Exception as e:
        print(f"Error reading file from DB: {e}")
            
    local_path = Path("uploads") / category / filename
    if local_path.exists():
        import mimetypes
        mimetype, _ = mimetypes.guess_type(str(local_path))
        return Response(content=local_path.read_bytes(), media_type=mimetype or "application/octet-stream")
        
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="File not found")


static_dir = Path("static")
static_dir.mkdir(parents=True, exist_ok=True)
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
app.include_router(special_events_router)
app.include_router(role_router)


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
