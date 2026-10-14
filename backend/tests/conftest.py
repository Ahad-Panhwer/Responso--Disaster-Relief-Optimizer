"""
Pytest fixtures for Responso backend tests.
Uses a dedicated test database (sqlite:///./test_responso.db) to ensure total isolation.
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Force test database URL
os.environ["DATABASE_URL"] = "sqlite:///./test_responso.db"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.seeds.seed_data import seed_database, DEFAULT_PASSWORD

TEST_DATABASE_URL = "sqlite:///./test_responso.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create and seed the test database once per session."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        seed_database(db, reset=True)
    finally:
        db.close()
    yield
    # Cleanup after session
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_responso.db"):
        try:
            os.remove("./test_responso.db")
        except Exception:
            pass


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def coordinator_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "tariq.mansoor@responso.pk",
        "password": DEFAULT_PASSWORD,
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "farhan.ali@responso.pk",
        "password": DEFAULT_PASSWORD,
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def dispatcher_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "zainab.baloch@responso.pk",
        "password": DEFAULT_PASSWORD,
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def warehouse_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "imran.qureshi@responso.pk",
        "password": DEFAULT_PASSWORD,
    })
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
