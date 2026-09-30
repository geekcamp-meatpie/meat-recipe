"""
POST /api/generate-recipe-image のテスト。

Gemini呼び出し（services/recipe_image_client.generate_recipe_image）とSupabase Storage
（services/image_storage）はモックし、ルーターの分岐（キャッシュ再利用・保存・フォールバック・エラー変換）を検証する。
"""

import base64

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from config import app_config
from routers import recipe_image
from services import recipe_image_client
from services.ai_client import AIServiceError
from services.recipe_image_prompt_builder import build_recipe_image_prompt

app = FastAPI()
app.include_router(recipe_image.router, prefix="/api")
client = TestClient(app)

BODY = {"recipeName": "鶏もも肉の照り焼き", "ingredients": ["鶏もも肉 300g", "醤油 大さじ2"]}
IMAGE_BYTES = b"\x89PNG-fake"


@pytest.fixture(autouse=True)
def reset_config(monkeypatch):
    old = (app_config.api_key, app_config.provider)
    app_config.api_key, app_config.provider = "test-key", "gemini"
    # 既定はStorage未設定（data URLフォールバック）。必要なテストだけ上書きする
    monkeypatch.setattr(recipe_image.image_storage, "is_configured", lambda: False)
    yield
    app_config.api_key, app_config.provider = old


def _fake_generate(calls=None):
    async def fake(recipe_name, ingredients, api_key):
        if calls is not None:
            calls.append((recipe_name, ingredients, api_key))
        return IMAGE_BYTES, "image/png"

    return fake


# ---- ルーター ----

def test_returns_data_url_when_storage_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr(recipe_image, "generate_recipe_image", _fake_generate(calls))

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.status_code == 200
    assert res.json()["imageUrl"] == "data:image/png;base64," + base64.b64encode(IMAGE_BYTES).decode()
    assert calls == [(BODY["recipeName"], BODY["ingredients"], "test-key")]


def test_reuses_stored_image_without_generating(monkeypatch):
    async def fake_find(key):
        return "https://example.supabase.co/storage/v1/object/public/recipe-images/" + key

    async def must_not_generate(**kwargs):
        raise AssertionError("保存済みなら生成しない")

    monkeypatch.setattr(recipe_image.image_storage, "is_configured", lambda: True)
    monkeypatch.setattr(recipe_image.image_storage, "find_image", fake_find)
    monkeypatch.setattr(recipe_image, "generate_recipe_image", must_not_generate)

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.status_code == 200
    assert res.json()["imageUrl"].startswith("https://example.supabase.co/")


def test_generates_and_uploads_when_not_stored(monkeypatch):
    uploaded = {}

    async def fake_find(key):
        return None

    async def fake_upload(key, data, mime_type):
        uploaded.update(key=key, data=data, mime_type=mime_type)
        return "https://example.supabase.co/public/" + key

    monkeypatch.setattr(recipe_image.image_storage, "is_configured", lambda: True)
    monkeypatch.setattr(recipe_image.image_storage, "find_image", fake_find)
    monkeypatch.setattr(recipe_image.image_storage, "upload_image", fake_upload)
    monkeypatch.setattr(recipe_image, "generate_recipe_image", _fake_generate())

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.status_code == 200
    assert res.json()["imageUrl"] == "https://example.supabase.co/public/" + uploaded["key"]
    assert uploaded["data"] == IMAGE_BYTES and uploaded["mime_type"] == "image/png"


def test_falls_back_to_data_url_when_upload_fails(monkeypatch):
    async def fake_find(key):
        return None

    async def failing_upload(key, data, mime_type):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(recipe_image.image_storage, "is_configured", lambda: True)
    monkeypatch.setattr(recipe_image.image_storage, "find_image", fake_find)
    monkeypatch.setattr(recipe_image.image_storage, "upload_image", failing_upload)
    monkeypatch.setattr(recipe_image, "generate_recipe_image", _fake_generate())

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.status_code == 200
    assert res.json()["imageUrl"].startswith("data:image/png;base64,")


def test_no_api_key_returns_400():
    app_config.api_key = ""
    assert client.post("/api/generate-recipe-image", json=BODY).status_code == 400


def test_non_gemini_provider_returns_400():
    app_config.provider = "claude"
    assert client.post("/api/generate-recipe-image", json=BODY).status_code == 400


def test_ai_error_returns_502(monkeypatch):
    async def failing(recipe_name, ingredients, api_key):
        raise AIServiceError("画像が生成されませんでした。")

    monkeypatch.setattr(recipe_image, "generate_recipe_image", failing)

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.status_code == 502
    assert "画像の生成に失敗しました" in res.json()["detail"]


def test_empty_recipe_name_returns_422():
    assert client.post("/api/generate-recipe-image", json={"recipeName": ""}).status_code == 422


# ---- プロンプト / レスポンス解析 ----

def test_prompt_contains_name_and_limits_ingredients():
    prompt = build_recipe_image_prompt("肉じゃが", [f"食材{i}" for i in range(10)])
    assert "肉じゃが" in prompt
    assert "食材4" in prompt and "食材5" not in prompt


class _Inline:
    def __init__(self, data, mime_type):
        self.data, self.mime_type = data, mime_type


class _Part:
    def __init__(self, inline_data=None):
        self.inline_data = inline_data


class _Content:
    def __init__(self, parts):
        self.parts = parts


class _Candidate:
    def __init__(self, content):
        self.content = content


class _Response:
    def __init__(self, candidates):
        self.candidates = candidates


def test_extract_image_skips_text_parts():
    resp = _Response([_Candidate(_Content([_Part(), _Part(_Inline(IMAGE_BYTES, "image/jpeg"))]))])
    assert recipe_image_client._extract_image(resp) == (IMAGE_BYTES, "image/jpeg")


@pytest.mark.parametrize(
    "resp",
    [_Response(None), _Response([]), _Response([_Candidate(None)]), _Response([_Candidate(_Content([_Part()]))])],
)
def test_extract_image_raises_when_no_image(resp):
    with pytest.raises(AIServiceError):
        recipe_image_client._extract_image(resp)
