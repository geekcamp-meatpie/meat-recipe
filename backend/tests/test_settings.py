"""
APIキーの初期値（環境変数 GEMINI_API_KEY）と、設定APIでの優先順位のテスト。
DBには接続せず、get_db を差し替えて検証する。
"""

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from config import AppConfig, app_config
from db.client import get_db
from routers import settings


def _client(row):
    """get_db が返すセッションを差し替える。row は db.get(AppSettings, 1) の戻り値。"""
    app = FastAPI()
    app.include_router(settings.router, prefix="/api")

    class FakeDB:
        def get(self, model, pk):
            return row

    app.dependency_overrides[get_db] = lambda: FakeDB()
    return TestClient(app)


def _restore(monkeypatch):
    monkeypatch.setattr(app_config, "api_key", app_config.api_key)
    monkeypatch.setattr(app_config, "provider", app_config.provider)
    monkeypatch.setattr(app_config, "medicines", app_config.medicines)


def test_api_key_defaults_to_env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "env-key")
    assert AppConfig().api_key == "env-key"


def test_api_key_defaults_to_empty_without_env(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert AppConfig().api_key == ""


def test_saved_db_key_overrides_env(monkeypatch):
    _restore(monkeypatch)
    app_config.api_key = "env-key"
    row = SimpleNamespace(api_key="db-key", provider="gemini", medicines="[]")

    res = _client(row).get("/api/settings")

    assert res.json()["api_key"] == "db-key"
    assert app_config.api_key == "db-key"


def test_empty_db_key_keeps_env_key(monkeypatch):
    _restore(monkeypatch)
    app_config.api_key = "env-key"
    row = SimpleNamespace(api_key="", provider="gemini", medicines="[]")

    res = _client(row).get("/api/settings")

    assert res.json()["api_key"] == "env-key"
