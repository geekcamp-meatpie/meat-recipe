"""
DELETE /api/account のテスト。Supabase Admin API（httpx）とDBはモックし、
処理の順序（先にAuth削除→後から利用回数削除）とエラー変換を検証する。
"""

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from db.client import get_db
from routers import account
from services.auth import get_current_user_id

USER_ID = "11111111-1111-1111-1111-111111111111"


class _FakeDB:
    def __init__(self, fail=False):
        self.fail, self.executed, self.committed, self.rolled_back = fail, [], False, False

    def execute(self, stmt, params):
        if self.fail:
            from sqlalchemy.exc import SQLAlchemyError

            raise SQLAlchemyError("boom")
        self.executed.append(params)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class _FakeAdminClient:
    def __init__(self, status_code=200, error=None):
        self.status_code, self.error, self.requests = status_code, error, []

    def __call__(self, *args, **kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def delete(self, url, headers):
        self.requests.append((url, headers))
        if self.error:
            raise self.error
        return httpx.Response(self.status_code)


def _client(db):
    app = FastAPI()
    app.include_router(account.router, prefix="/api")
    app.dependency_overrides[get_current_user_id] = lambda: USER_ID
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


@pytest.fixture(autouse=True)
def supabase_env(monkeypatch):
    monkeypatch.setattr(account, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(account, "SUPABASE_API_KEY", "service-key")


def test_deletes_auth_user_and_usage(monkeypatch):
    fake, db = _FakeAdminClient(200), _FakeDB()
    monkeypatch.setattr(account.httpx, "AsyncClient", fake)

    res = _client(db).delete("/api/account")

    assert res.status_code == 200 and res.json() == {"status": "deleted"}
    url, headers = fake.requests[0]
    assert url == f"https://example.supabase.co/auth/v1/admin/users/{USER_ID}"
    assert headers["Authorization"] == "Bearer service-key"
    assert db.executed == [{"user_id": USER_ID}] and db.committed


def test_already_deleted_user_is_success(monkeypatch):
    monkeypatch.setattr(account.httpx, "AsyncClient", _FakeAdminClient(404))
    assert _client(_FakeDB()).delete("/api/account").status_code == 200


def test_auth_deletion_failure_keeps_usage_records(monkeypatch):
    db = _FakeDB()
    monkeypatch.setattr(account.httpx, "AsyncClient", _FakeAdminClient(500))

    res = _client(db).delete("/api/account")

    assert res.status_code == 502
    assert db.executed == []


def test_unreachable_supabase_returns_503(monkeypatch):
    monkeypatch.setattr(account.httpx, "AsyncClient", _FakeAdminClient(error=httpx.ConnectError("boom")))
    assert _client(_FakeDB()).delete("/api/account").status_code == 503


def test_usage_deletion_failure_still_succeeds(monkeypatch):
    db = _FakeDB(fail=True)
    monkeypatch.setattr(account.httpx, "AsyncClient", _FakeAdminClient(200))

    assert _client(db).delete("/api/account").status_code == 200
    assert db.rolled_back


def test_works_without_db(monkeypatch):
    monkeypatch.setattr(account.httpx, "AsyncClient", _FakeAdminClient(200))
    assert _client(None).delete("/api/account").status_code == 200


def test_requires_login():
    app = FastAPI()
    app.include_router(account.router, prefix="/api")
    assert TestClient(app).delete("/api/account").status_code in (401, 503)
