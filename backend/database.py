import os
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _default_data_dir() -> Path:
    # Frozen Windows builds keep user data outside the bundled executable.
    if getattr(sys, "frozen", False):
        local_app_data = os.getenv("LOCALAPPDATA")
        if local_app_data:
            return Path(local_app_data) / "FamilyTree"
        return Path.home() / "AppData" / "Local" / "FamilyTree"
    return Path(__file__).resolve().parent


DATA_DIR = Path(os.getenv("FAMILYTREE_DATA_DIR", _default_data_dir()))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB = DATA_DIR / "family_tree.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB.as_posix()}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
