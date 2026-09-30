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
from db.client import get_db
from routers import recipe_image
from services import auth, recipe_image_client
from services.ai_client import AIServiceError
from services.auth import get_current_user_id
from services.recipe_image_prompt_builder import build_recipe_image_prompt

app = FastAPI()
app.include_router(recipe_image.router, prefix="/api")
# 認証とDBは差し替える。DBは中身を触らないダミー、利用回数は image_quota をモックして検証する
app.dependency_overrides[get_current_user_id] = lambda: USER_ID
app.dependency_overrides[get_db] = lambda: DB
client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
DB = object()

BODY = {"recipeName": "鶏もも肉の照り焼き", "ingredients": ["鶏もも肉 300g", "醤油 大さじ2"]}
IMAGE_BYTES = b"\x89PNG-fake"


@pytest.fixture(autouse=True)
def reset_config(monkeypatch):
    old = (app_config.api_key, app_config.provider)
    app_config.api_key, app_config.provider = "test-key", "gemini"
    # 既定はStorage未設定（data URLフォールバック）。必要なテストだけ上書きする
    monkeypatch.setattr(recipe_image.image_storage, "is_configured", lambda: False)
    # 既定は枠に余裕あり（何枚目かを返す）。上限テストなどで上書きする
    monkeypatch.setattr(recipe_image.image_quota, "reserve", lambda db, user_id, limit: 1)
    monkeypatch.setattr(recipe_image.image_quota, "release", lambda db, user_id: None)
    app.dependency_overrides[get_db] = lambda: DB
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


def test_prompt_endpoint_returns_prompt_without_api_key():
    app_config.api_key = ""
    res = client.post("/api/recipe-image-prompt", json=BODY)
    assert res.status_code == 200
    assert res.json() == {"prompt": build_recipe_image_prompt(BODY["recipeName"], BODY["ingredients"])}


# ---- ログイン必須・1日の上限 ----

def test_requires_login_without_override():
    """認証の差し替えを外すと、Authorizationヘッダー無しは401になる。"""
    saved = app.dependency_overrides.pop(get_current_user_id)
    try:
        assert client.post("/api/generate-recipe-image", json=BODY).status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = saved


def test_returns_remaining_after_generation(monkeypatch):
    monkeypatch.setattr(recipe_image, "generate_recipe_image", _fake_generate())
    monkeypatch.setattr(recipe_image.image_quota, "reserve", lambda db, user_id, limit: 3)

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.json()["remaining"] == recipe_image.IMAGE_DAILY_LIMIT - 3


def test_daily_limit_returns_429_without_generating(monkeypatch):
    async def must_not_generate(**kwargs):
        raise AssertionError("上限に達したら生成しない")

    monkeypatch.setattr(recipe_image.image_quota, "reserve", lambda db, user_id, limit: None)
    monkeypatch.setattr(recipe_image, "generate_recipe_image", must_not_generate)

    res = client.post("/api/generate-recipe-image", json=BODY)

    assert res.status_code == 429
    assert "上限" in res.json()["detail"]


def test_reserves_with_user_id_and_configured_limit(monkeypatch):
    seen = []

    def fake_reserve(db, user_id, limit):
        seen.append((user_id, limit))
        return 1

    monkeypatch.setattr(recipe_image.image_quota, "reserve", fake_reserve)
    monkeypatch.setattr(recipe_image, "generate_recipe_image", _fake_generate())

    client.post("/api/generate-recipe-image", json=BODY)

    assert seen == [(USER_ID, recipe_image.IMAGE_DAILY_LIMIT)]


def test_releases_quota_when_generation_fails(monkeypatch):
    released = []

    async def failing(recipe_name, ingredients, api_key):
        raise AIServiceError("画像が生成されませんでした。")

    monkeypatch.setattr(recipe_image, "generate_recipe_image", failing)
    monkeypatch.setattr(recipe_image.image_quota, "release", lambda db, user_id: released.append(user_id))

    assert client.post("/api/generate-recipe-image", json=BODY).status_code == 502
    assert released == [USER_ID]


def test_stored_image_reuse_does_not_consume_quota(monkeypatch):
    async def fake_find(key):
        return "https://example.supabase.co/public/" + key

    def must_not_reserve(db, user_id, limit):
        raise AssertionError("再利用は数えない")

    monkeypatch.setattr(recipe_image.image_storage, "is_configured", lambda: True)
    monkeypatch.setattr(recipe_image.image_storage, "find_image", fake_find)
    monkeypatch.setattr(recipe_image.image_quota, "reserve", must_not_reserve)

    assert client.post("/api/generate-recipe-image", json=BODY).status_code == 200


def test_no_db_returns_503_without_generating(monkeypatch):
    async def must_not_generate(**kwargs):
        raise AssertionError("利用回数を確認できないときは生成しない")

    app.dependency_overrides[get_db] = lambda: None
    monkeypatch.setattr(recipe_image, "generate_recipe_image", must_not_generate)

    assert client.post("/api/generate-recipe-image", json=BODY).status_code == 503


def test_quota_endpoint(monkeypatch):
    monkeypatch.setattr(recipe_image.image_quota, "used_today", lambda db, user_id: 4)

    res = client.get("/api/image-quota")

    limit = recipe_image.IMAGE_DAILY_LIMIT
    assert res.json() == {"limit": limit, "used": 4, "remaining": limit - 4}


def test_prompt_endpoint_needs_no_login():
    app.dependency_overrides.pop(get_current_user_id)
    try:
        assert client.post("/api/recipe-image-prompt", json=BODY).status_code == 200
    finally:
        app.dependency_overrides[get_current_user_id] = lambda: USER_ID


# ---- トークン検証（services/auth.py） ----

class _FakeAuthClient:
    """httpx.AsyncClient の代わり。Supabase Auth API の応答を固定する。"""

    def __init__(self, status_code=200, body=None, error=None):
        self.status_code, self.body, self.error = status_code, body or {}, error
        self.requests = []

    def __call__(self, *args, **kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, headers):
        self.requests.append((url, headers))
        if self.error:
            raise self.error
        return httpx.Response(self.status_code, json=self.body)


@pytest.fixture
def supabase_env(monkeypatch):
    monkeypatch.setattr(auth, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(auth, "SUPABASE_API_KEY", "service-key")


def _verify(header):
    import asyncio

    return asyncio.run(auth.get_current_user_id(header))


def test_auth_returns_user_id_for_valid_token(monkeypatch, supabase_env):
    fake = _FakeAuthClient(200, {"id": USER_ID})
    monkeypatch.setattr(auth.httpx, "AsyncClient", fake)

    assert _verify("Bearer user-token") == USER_ID
    url, headers = fake.requests[0]
    assert url == "https://example.supabase.co/auth/v1/user"
    assert headers["Authorization"] == "Bearer user-token"


@pytest.mark.parametrize("header", [None, "", "Basic abc", "Bearer"])
def test_auth_rejects_missing_or_malformed_header(supabase_env, header):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as e:
        _verify(header)
    assert e.value.status_code == 401


def test_auth_rejects_invalid_token(monkeypatch, supabase_env):
    from fastapi import HTTPException

    monkeypatch.setattr(auth.httpx, "AsyncClient", _FakeAuthClient(401))
    with pytest.raises(HTTPException) as e:
        _verify("Bearer bad")
    assert e.value.status_code == 401


def test_auth_503_when_supabase_unreachable_or_unconfigured(monkeypatch, supabase_env):
    from fastapi import HTTPException

    monkeypatch.setattr(auth.httpx, "AsyncClient", _FakeAuthClient(error=httpx.ConnectError("boom")))
    with pytest.raises(HTTPException) as e:
        _verify("Bearer t")
    assert e.value.status_code == 503

    monkeypatch.setattr(auth, "SUPABASE_URL", "")
    with pytest.raises(HTTPException) as e:
        _verify("Bearer t")
    assert e.value.status_code == 503
