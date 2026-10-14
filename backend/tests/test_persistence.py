"""
Tests for Responso Database Persistence Across Engine/Session Restarts
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import User, Warehouse, AssistanceRequest
from app.seeds.seed_data import seed_database

PERSIST_DB_PATH = "./test_persist.db"
PERSIST_DB_URL = f"sqlite:///{PERSIST_DB_PATH}"


def test_data_persists_across_restart():
    # 1. Clean previous file if exists
    if os.path.exists(PERSIST_DB_PATH):
        os.remove(PERSIST_DB_PATH)

    # 2. First session: Create tables, seed data
    engine1 = create_engine(PERSIST_DB_URL)
    Session1 = sessionmaker(bind=engine1)
    db1 = Session1()
    try:
        seed_database(db1, reset=True)
        user_count_session1 = db1.query(User).count()
        wh_count_session1 = db1.query(Warehouse).count()
        req_count_session1 = db1.query(AssistanceRequest).count()
        assert user_count_session1 >= 4
        assert wh_count_session1 >= 3
        assert req_count_session1 >= 5
    finally:
        db1.close()
        engine1.dispose()

    # 3. Simulate complete system/application restart: New engine, new session
    engine2 = create_engine(PERSIST_DB_URL)
    Session2 = sessionmaker(bind=engine2)
    db2 = Session2()
    try:
        # Verify data persisted without any in-memory state
        user_count_session2 = db2.query(User).count()
        wh_count_session2 = db2.query(Warehouse).count()
        req_count_session2 = db2.query(AssistanceRequest).count()

        assert user_count_session2 == user_count_session1
        assert wh_count_session2 == wh_count_session1
        assert req_count_session2 == req_count_session1

        # Check specific records
        tariq = db2.query(User).filter(User.email == "tariq.mansoor@responso.pk").first()
        assert tariq is not None
        assert tariq.role == "LOGISTICS_COORDINATOR"

        sukkur = db2.query(Warehouse).filter(Warehouse.code == "HUB-SUKKUR").first()
        assert sukkur is not None
        assert len(sukkur.inventory_items) == 5
    finally:
        db2.close()
        engine2.dispose()

        # Cleanup test db file
        if os.path.exists(PERSIST_DB_PATH):
            os.remove(PERSIST_DB_PATH)
