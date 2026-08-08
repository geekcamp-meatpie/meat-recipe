"""
担当: AI・画像認識
Gemini（マルチモーダル）を使って画像から食材を検出する。
image_prompt_builder.build_image_prompt() で組み立てたプロンプトと画像を渡し、
レスポンスをパースして食材リストを返す。
APIキー取得後にここを実装する。
"""

from services.image_prompt_builder import build_image_prompt


async def analyze_image(image_bytes: bytes, mime_type: str) -> list[dict]:
    """
    画像バイナリを受け取り、検出した食材のリストを返す。
    各要素の形式: {"name": str, "amount": str, "confidence": float}

    現在はスタブ。AI担当が実装する。

    実装例:
        import json
        from google import genai
        from google.genai import types
        from pydantic import BaseModel, Field
        from typing import List

        class IngredientDetection(BaseModel):
            name: str = Field(description="食材の名称（例: 鶏もも肉、玉ねぎ）")
            amount: str = Field(description="食材の量や個数（例: 300g、1個）。判別できない場合は「不明」とする")
            confidence: float = Field(description="識別精度の確信度（0.0〜1.0）")

        class IngredientResponse(BaseModel):
            ingredients: List[IngredientDetection]

        client = genai.Client()
        prompt = build_image_prompt()
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=IngredientResponse,
                temperature=0.1,
            ),
        )

        result = json.loads(response.text)
        return result["ingredients"]
    """
    raise NotImplementedError("担当: AI - analyze_image を実装してください")
