import re
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Determine database url and adjust for async if needed
db_url = (settings.DATABASE_URL or "").strip()

if not db_url:
    db_url = "sqlite+aiosqlite:///./test.db"

# Normalize driver for SQLAlchemy async engine
connect_args = {}
try:
    url_obj = make_url(db_url)
    if url_obj.drivername.startswith("postgres"):
        db_url = url_obj.set(drivername="postgresql+asyncpg").render_as_string(hide_password=False)
    elif url_obj.drivername.startswith("sqlite"):
        db_url = url_obj.set(drivername="sqlite+aiosqlite").render_as_string(hide_password=False)
        connect_args = {"check_same_thread": False}
except Exception:
    if re.match(r"^(postgres|postgresql)(\+[a-zA-Z0-9_-]+)?://", db_url, flags=re.IGNORECASE):
        db_url = re.sub(r"^(postgres|postgresql)(\+[a-zA-Z0-9_-]+)?://", "postgresql+asyncpg://", db_url, flags=re.IGNORECASE)
    elif db_url.lower().startswith("sqlite"):
        db_url = re.sub(r"^sqlite://", "sqlite+aiosqlite://", db_url, flags=re.IGNORECASE)
        connect_args = {"check_same_thread": False}

# Create async database engine
engine = create_async_engine(
    db_url,
    connect_args=connect_args,
    future=True,
    echo=settings.ENVIRONMENT == "development",
)

# Configure async session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db_session():
    """Dependency for getting database sessions"""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
