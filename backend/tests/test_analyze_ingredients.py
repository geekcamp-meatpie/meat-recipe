"""
POST /api/analyze-ingredients のルーター単体テスト。

Geminiの呼び出し自体は services/image_ai_client.py の責務なので、
ここでは analyze_image / has_api_key をモックし、ルーター
（analyze_ingredients.py）のリクエスト処理・レスポンス整形のみを検証する。
"""

import base64

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers import analyze_ingredients

# 1x1 の透過PNG（テスト用の仮画像）
FAKE_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

app = FastAPI()
app.include_router(analyze_ingredients.router, prefix="/api")
client = TestClient(app)


def test_success(monkeypatch):
    expected = [
        {"name": "鶏もも肉", "amount": "300g", "confidence": 0.95},
        {"name": "玉ねぎ", "amount": "1個", "confidence": 0.8},
    ]

    async def fake_analyze_image(image_bytes: bytes, mime_type: str):
        assert image_bytes == FAKE_PNG_BYTES
        assert mime_type == "image/png"
        return expected

    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    monkeypatch.setattr(analyze_ingredients, "analyze_image", fake_analyze_image)

    response = client.post(
        "/api/analyze-ingredients",
        files={"file": ("test.png", FAKE_PNG_BYTES, "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body == expected
    for item in body:
        assert set(item.keys()) == {"name", "amount", "confidence"}
        assert isinstance(item["name"], str) and item["name"]
        assert isinstance(item["amount"], str) and item["amount"]
        assert 0.0 <= item["confidence"] <= 1.0


def test_invalid_file(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)

    response = client.post(
        "/api/analyze-ingredients",
        files={"file": ("note.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 400


def test_missing_api_key(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: False)

    response = client.post(
        "/api/analyze-ingredients",
        files={"file": ("test.png", FAKE_PNG_BYTES, "image/png")},
    )

    assert response.status_code == 400
    assert "APIキー" in response.json()["detail"]


def test_ai_error_returns_500(monkeypatch):
    async def fake_analyze_image(image_bytes: bytes, mime_type: str):
        raise RuntimeError("Gemini APIエラー")

    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    monkeypatch.setattr(analyze_ingredients, "analyze_image", fake_analyze_image)

    response = client.post(
        "/api/analyze-ingredients",
        files={"file": ("test.png", FAKE_PNG_BYTES, "image/png")},
    )

    assert response.status_code == 500
