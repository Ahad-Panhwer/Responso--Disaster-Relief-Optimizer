"""SQLAlchemy database engine and session factory."""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator
from app.core.config import settings

# SQLite-specific: enable WAL mode for better concurrency and foreign keys
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

connect_args = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    echo=settings.APP_ENV == "development",
)

# Enable SQLite foreign key enforcement and WAL mode
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
