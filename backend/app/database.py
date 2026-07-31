from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Determine database url and adjust for async if needed
db_url = (settings.DATABASE_URL or "").strip()

if not db_url:
    db_url = "sqlite+aiosqlite:///./test.db"

# Normalize PostgreSQL scheme for SQLAlchemy async engine
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# For SQLite, ensure we are using aiosqlite and check same thread config
connect_args = {}
if db_url.startswith("sqlite"):
    if not db_url.startswith("sqlite+aiosqlite"):
        db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
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
