"""
画像認識のAI呼び出し（Gemini マルチモーダル）を行う。
"""

import json
import os
from typing import List

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from config import app_config
from services.image_prompt_builder import build_image_prompt


class IngredientDetection(BaseModel):
    name: str = Field(description="食材の名称（例: 鶏もも肉、玉ねぎ）")
    amount: str = Field(description="食材の量や個数（例: 300g、1個）。判別できない場合は「不明」とする")
    confidence: float = Field(description="識別精度の確信度（0.0 〜 1.0）")


class IngredientResponse(BaseModel):
    ingredients: List[IngredientDetection]


def has_api_key() -> bool:
    return bool(app_config.api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))


def _get_client() -> genai.Client:
    """Geminiクライアントを初期化する。
    設定画面（/api/settings）で保存されたAPIキーがあればそれを使い、
    無ければSDKのデフォルト挙動に従い環境変数（GEMINI_API_KEY等）から読み込む。
    リクエストごとに生成することで、設定画面でのキー変更を即座に反映する。
    """
    if app_config.api_key:
        return genai.Client(api_key=app_config.api_key)
    return genai.Client()


async def analyze_image(image_bytes: bytes, mime_type: str) -> list[dict]:
    """画像バイナリを受け取り、検出した食材のリスト（name, amount, confidence）を返す。"""
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    prompt = build_image_prompt()

    # 非同期エンドポイント内のため、同期版ではなく非同期版クライアントを使う
    # (同期版はイベントループ内で呼ぶとhttpxクライアントがクローズ済み扱いになり失敗する)
    response = await _get_client().aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=IngredientResponse,
            temperature=0.1,
        ),
    )

    result_json = json.loads(response.text)
    return result_json.get("ingredients", [])
