"""
レシピの料理イメージ画像を生成するAI呼び出し（Gemini 画像生成）を行う。
画像認識（写真→食材）は image_ai_client.py、レシピ生成は ai_client.py が担当する。
"""

from google import genai
from google.genai import types

from services.ai_client import AIServiceError
from services.recipe_image_prompt_builder import build_recipe_image_prompt

# 画像生成に対応したモデル。提供終了などで404になった場合はここだけ差し替える。
IMAGE_MODEL = "gemini-2.5-flash-image"


async def generate_recipe_image(
    recipe_name: str, ingredients: list[str], api_key: str
) -> tuple[bytes, str]:
    """料理イメージ画像を1枚生成し、(画像バイナリ, MIMEタイプ) を返す。失敗時は AIServiceError を送出する。"""
    if not api_key:
        raise AIServiceError("APIキーが設定されていません。")

    prompt = build_recipe_image_prompt(recipe_name, ingredients)

    try:
        # 非同期エンドポイント内のため、同期版ではなく非同期版クライアントを使う
        response = await genai.Client(api_key=api_key).aio.models.generate_content(
            model=IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
    except Exception as e:
        raise AIServiceError(f"Gemini 画像生成 API Error: {e}") from e

    return _extract_image(response)


def _extract_image(response) -> tuple[bytes, str]:
    """レスポンスから画像パートを取り出す。安全性フィルタ等で画像が無い場合は AIServiceError。"""
    for candidate in response.candidates or []:
        for part in (candidate.content.parts if candidate.content else None) or []:
            inline = part.inline_data
            if inline and inline.data:
                return inline.data, inline.mime_type or "image/png"
    raise AIServiceError("画像が生成されませんでした。")
