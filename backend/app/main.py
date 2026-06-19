from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.auth import router as auth_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Agrawal Samaj Management Portal",
    version="1.0.0",
)

# CORS middleware configuration
local_origin_regex = r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=local_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


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
        "database": "connected"  # Simple health check endpoint
    }
