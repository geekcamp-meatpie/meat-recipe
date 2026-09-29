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


def _png_file(name: str = "test.png"):
    return ("files", (name, FAKE_PNG_BYTES, "image/png"))


def test_success(monkeypatch):
    expected = [
        {"name": "鶏もも肉", "amount": "300g", "confidence": 0.95},
        {"name": "玉ねぎ", "amount": "1個", "confidence": 0.8},
    ]

    async def fake_analyze_image(images):
        assert images == [(FAKE_PNG_BYTES, "image/png")]
        return expected

    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    monkeypatch.setattr(analyze_ingredients, "analyze_image_ai", fake_analyze_image)

    response = client.post("/api/analyze-ingredients", files=[_png_file()])

    assert response.status_code == 200
    body = response.json()
    assert body == expected
    for item in body:
        assert set(item.keys()) == {"name", "amount", "confidence"}
        assert isinstance(item["name"], str) and item["name"]
        assert isinstance(item["amount"], str) and item["amount"]
        assert 0.0 <= item["confidence"] <= 1.0


def test_max_images_allowed(monkeypatch):
    received = {}

    async def fake_analyze_image(images):
        received["count"] = len(images)
        return []

    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    monkeypatch.setattr(analyze_ingredients, "analyze_image_ai", fake_analyze_image)

    response = client.post(
        "/api/analyze-ingredients",
        files=[_png_file(f"{i}.png") for i in range(analyze_ingredients.MAX_IMAGES)],
    )

    assert response.status_code == 200
    assert received["count"] == analyze_ingredients.MAX_IMAGES


def test_too_many_images(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)

    response = client.post(
        "/api/analyze-ingredients",
        files=[_png_file(f"{i}.png") for i in range(analyze_ingredients.MAX_IMAGES + 1)],
    )

    assert response.status_code == 400
    assert f"{analyze_ingredients.MAX_IMAGES}枚" in response.json()["detail"]


def test_total_size_too_large(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    # 1枚ずつは上限内だが、合計が上限を超える
    each = b"\x00" * analyze_ingredients.MAX_IMAGE_BYTES
    count = analyze_ingredients.MAX_TOTAL_BYTES // analyze_ingredients.MAX_IMAGE_BYTES + 1

    response = client.post(
        "/api/analyze-ingredients",
        files=[("files", (f"{i}.png", each, "image/png")) for i in range(count)],
    )

    assert response.status_code == 413
    assert "合計" in response.json()["detail"]


def test_image_too_large(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    too_big = b"\x00" * (analyze_ingredients.MAX_IMAGE_BYTES + 1)

    response = client.post(
        "/api/analyze-ingredients",
        files=[("files", ("big.png", too_big, "image/png"))],
    )

    assert response.status_code == 413


def test_invalid_file(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)

    response = client.post(
        "/api/analyze-ingredients",
        files=[("files", ("note.txt", b"not an image", "text/plain"))],
    )

    assert response.status_code == 400


def test_unsupported_image_type(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)

    response = client.post(
        "/api/analyze-ingredients",
        files=[("files", ("a.svg", b"<svg/>", "image/svg+xml"))],
    )

    assert response.status_code == 400


def test_missing_api_key(monkeypatch):
    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: False)

    response = client.post("/api/analyze-ingredients", files=[_png_file()])

    assert response.status_code == 400
    assert "APIキー" in response.json()["detail"]


def test_ai_error_returns_500(monkeypatch):
    async def fake_analyze_image(images):
        raise RuntimeError("Gemini APIエラー")

    monkeypatch.setattr(analyze_ingredients, "has_api_key", lambda: True)
    monkeypatch.setattr(analyze_ingredients, "analyze_image_ai", fake_analyze_image)

    response = client.post("/api/analyze-ingredients", files=[_png_file()])

    assert response.status_code == 500
