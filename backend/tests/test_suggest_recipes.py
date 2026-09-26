"""
POST /api/suggest-recipes のテスト。

AI呼び出し（services/ai_client.call_ai）はモックし、ルーターの
リクエスト処理・エラー変換と、prompt_builder / ai_client の解析ロジックを検証する。
"""

import asyncio
import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from config import app_config
from routers import recipes
from services import ai_client
from services.ai_client import AIServiceError
from services.prompt_builder import build_prompt

app = FastAPI()
app.include_router(recipes.router, prefix="/api")
client = TestClient(app)

SAMPLE_RECIPES = [
    {
        "recipeName": "鶏もも肉の照り焼き",
        "cookingTime": 20,
        "difficulty": "簡単",
        "ingredients": ["鶏もも肉 300g", "醤油 大さじ2"],
        "steps": ["切る", "焼く"],
        "point": "皮目からじっくり焼く",
        "warnings": [],
    }
]


@pytest.fixture(autouse=True)
def reset_config():
    old = (app_config.api_key, app_config.provider, app_config.medicines)
    app_config.api_key, app_config.provider, app_config.medicines = "test-key", "gemini", []
    yield
    app_config.api_key, app_config.provider, app_config.medicines = old


# ---- ルーター ----

def test_success(monkeypatch):
    captured = {}

    async def fake_call_ai(prompt, provider, api_key):
        captured.update(prompt=prompt, provider=provider, api_key=api_key)
        return SAMPLE_RECIPES

    monkeypatch.setattr(recipes, "call_ai", fake_call_ai)

    res = client.post("/api/suggest-recipes", json={"ingredients": "鶏もも肉、玉ねぎ"})

    assert res.status_code == 200
    assert res.json() == {"recipes": SAMPLE_RECIPES}
    assert "鶏もも肉、玉ねぎ" in captured["prompt"]
    assert captured["provider"] == "gemini"
    assert captured["api_key"] == "test-key"


def test_missing_api_key_returns_400(monkeypatch):
    app_config.api_key = ""

    async def fake_call_ai(*args, **kwargs):
        raise AssertionError("APIキー未設定ではAIを呼ばないこと")

    monkeypatch.setattr(recipes, "call_ai", fake_call_ai)

    res = client.post("/api/suggest-recipes", json={"ingredients": "卵"})

    assert res.status_code == 400
    assert "APIキー" in res.json()["detail"]


def test_ai_failure_returns_502_not_dummy(monkeypatch):
    async def fake_call_ai(*args, **kwargs):
        raise AIServiceError("boom")

    monkeypatch.setattr(recipes, "call_ai", fake_call_ai)

    res = client.post("/api/suggest-recipes", json={"ingredients": "卵"})

    assert res.status_code == 502
    assert "boom" in res.json()["detail"]
    assert "recipes" not in res.json()


def test_missing_ingredients_returns_422():
    assert client.post("/api/suggest-recipes", json={}).status_code == 422


def test_medicines_are_passed_to_prompt(monkeypatch):
    app_config.medicines = ["ワルファリン"]
    captured = {}

    async def fake_call_ai(prompt, provider, api_key):
        captured["prompt"] = prompt
        return []

    monkeypatch.setattr(recipes, "call_ai", fake_call_ai)
    client.post("/api/suggest-recipes", json={"ingredients": "納豆"})

    assert "ワルファリン" in captured["prompt"]


# ---- prompt_builder ----

def _prompt(**kw):
    args = dict(ingredients="卵", mode="only", taste="おまかせ", cooking="おまかせ",
                genre="おまかせ", volume="普通", medicines=[])
    args.update(kw)
    return build_prompt(**args)


def test_prompt_mode_only_vs_other():
    assert "追加で購入が必要な食材は使わない" in _prompt(mode="only")
    assert "追加で必要な食材" in _prompt(mode="omakase")


def test_prompt_omits_omakase_preferences():
    p = _prompt()
    assert "【味の方向性】" not in p and "【調理法】" not in p and "【ジャンル】" not in p
    p = _prompt(taste="味噌系", cooking="煮る", genre="和食")
    assert "【味の方向性】味噌系" in p and "【調理法】煮る" in p and "【ジャンル】和食" in p


def test_prompt_without_medicines_has_no_medicine_section():
    assert "【服用中の薬】" not in _prompt()


# ---- ai_client ----

def test_call_ai_without_key_raises():
    with pytest.raises(AIServiceError):
        asyncio.run(ai_client.call_ai("p", "gemini", ""))


def test_parse_recipes_ok():
    assert ai_client._parse_recipes(json.dumps(SAMPLE_RECIPES)) == SAMPLE_RECIPES


@pytest.mark.parametrize("text", ["not json", "{\"a\": 1}", None])
def test_parse_recipes_invalid_raises(text):
    with pytest.raises(AIServiceError):
        ai_client._parse_recipes(text)


def test_call_gemini_wraps_sdk_exception(monkeypatch):
    class BrokenClient:
        def __init__(self, api_key):
            raise RuntimeError("network")

    monkeypatch.setattr(ai_client.genai, "Client", BrokenClient)
    with pytest.raises(AIServiceError):
        asyncio.run(ai_client.call_ai("p", "gemini", "k"))


def test_call_gemini_invalid_json_raises(monkeypatch):
    class FakeResponse:
        text = "これはJSONではありません"

    class FakeModels:
        async def generate_content(self, **kwargs):
            return FakeResponse()

    class FakeClient:
        def __init__(self, api_key):
            self.aio = type("Aio", (), {"models": FakeModels()})()

    monkeypatch.setattr(ai_client.genai, "Client", FakeClient)
    with pytest.raises(AIServiceError):
        asyncio.run(ai_client.call_ai("p", "gemini", "k"))


def test_call_gemini_success(monkeypatch):
    class FakeResponse:
        text = json.dumps(SAMPLE_RECIPES)

    class FakeModels:
        async def generate_content(self, **kwargs):
            return FakeResponse()

    class FakeClient:
        def __init__(self, api_key):
            self.aio = type("Aio", (), {"models": FakeModels()})()

    monkeypatch.setattr(ai_client.genai, "Client", FakeClient)
    assert asyncio.run(ai_client.call_ai("p", "gemini", "k")) == SAMPLE_RECIPES
