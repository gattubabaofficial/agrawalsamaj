import re
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Determine database url and adjust for async if needed
db_url = (settings.DATABASE_URL or "").strip()

if not db_url:
    db_url = "sqlite+aiosqlite:///./data/agrasamaj.db"

# Normalize driver for SQLAlchemy async engine
connect_args = {}
is_sqlite = False

try:
    url_obj = make_url(db_url)
    if url_obj.drivername.startswith("postgres"):
        db_url = url_obj.set(drivername="postgresql+asyncpg").render_as_string(hide_password=False)
        db_url = db_url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=disable", "ssl=disable")
    elif url_obj.drivername.startswith("sqlite"):
        is_sqlite = True
        db_url = url_obj.set(drivername="sqlite+aiosqlite").render_as_string(hide_password=False)
        connect_args = {"check_same_thread": False}
except Exception:
    if re.match(r"^(postgres|postgresql)(\+[a-zA-Z0-9_-]+)?://", db_url, flags=re.IGNORECASE):
        db_url = re.sub(r"^(postgres|postgresql)(\+[a-zA-Z0-9_-]+)?://", "postgresql+asyncpg://", db_url, flags=re.IGNORECASE)
        db_url = db_url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=disable", "ssl=disable")
    elif db_url.lower().startswith("sqlite"):
        is_sqlite = True
        db_url = re.sub(r"^sqlite://", "sqlite+aiosqlite://", db_url, flags=re.IGNORECASE)
        connect_args = {"check_same_thread": False}

# Ensure directory exists and resolve relative path for local SQLite file
if is_sqlite:
    import os
    try:
        raw_path = db_url.split("sqlite+aiosqlite:///")[-1].split("?")[0]
        if raw_path and raw_path != ":memory:":
            if not os.path.isabs(raw_path):
                backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                clean_rel = raw_path
                if clean_rel.startswith("./"):
                    clean_rel = clean_rel[2:]
                abs_db_path = os.path.abspath(os.path.join(backend_dir, clean_rel))
                db_url = f"sqlite+aiosqlite:///{abs_db_path.replace(os.sep, '/')}"
                db_dir = os.path.dirname(abs_db_path)
            else:
                db_dir = os.path.dirname(raw_path)
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)
    except Exception:
        pass

# Create async database engine with appropriate pooling
engine_kwargs = {
    "connect_args": connect_args,
    "future": True,
    "echo": settings.ENVIRONMENT == "development",
}

if not is_sqlite:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_async_engine(
    db_url,
    **engine_kwargs
)

# Enable WAL mode, foreign keys, and postgres compatibility functions for SQLite
if is_sqlite:
    from sqlalchemy import event
    import datetime as _dt
    import uuid as _uuid

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        # Register postgres compatibility functions
        try:
            dbapi_connection.create_function("now", 0, lambda: _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f"))
            dbapi_connection.create_function("gen_random_uuid", 0, lambda: str(_uuid.uuid4()))
        except Exception:
            pass

        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.close()

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
