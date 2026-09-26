"""
担当D: AI API呼び出し
Gemini / Claude の切り替えと、レスポンスのパースを行う。
APIキー取得後にここを実装する。
"""

import json
import os
from anthropic import AsyncAnthropic
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class AIServiceError(Exception):
    """AI API呼び出し・レスポンス解析に失敗したことを表す。"""


async def call_ai(prompt: str, provider: str, api_key: str) -> list[dict]:
    """AIにプロンプトを送信し、レシピのリストを返す。失敗時は AIServiceError を送出する。"""
    if not api_key:
        raise AIServiceError("APIキーが設定されていません。")

    if provider == "gemini":
        return await _call_gemini(prompt, api_key)
    else:
        return await _call_claude(prompt, api_key)


async def _call_gemini(prompt: str, api_key: str) -> list[dict]:
    """Gemini API呼び出し（型定義なし・JSON Mode使用）"""
    try:
        client = genai.Client(api_key=api_key)

        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",  # JSON形式での出力を強制
                temperature=0.3,
            ),
        )

        return _parse_recipes(response.text)
    except AIServiceError:
        raise
    except Exception as e:
        raise AIServiceError(f"Gemini API Error: {e}") from e


async def _call_claude(prompt: str, api_key: str) -> list[dict]:
    """Claude API呼び出し（型定義なし）"""
    try:
        client = AsyncAnthropic(api_key=api_key)

        system_instruction = (
            "あなたはレシピ提案AIです。回答は余計な解説文やMarkdownの枠組み（```json など）を一切含めず、"
            "純粋なJSON配列（またはJSONオブジェクト）のみを出力してください。"
        )

        message = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            system=system_instruction,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text
        return _parse_recipes(response_text)
    except AIServiceError:
        raise
    except Exception as e:
        raise AIServiceError(f"Claude API Error: {e}") from e


def _parse_recipes(text: str) -> list[dict]:
    """AIの返答テキストをレシピ配列にパースする。JSONでない/配列でない場合は AIServiceError。"""
    try:
        recipes = json.loads(text)
    except (json.JSONDecodeError, TypeError) as e:
        raise AIServiceError(f"AIの返答をJSONとして解析できませんでした: {e}") from e
    if not isinstance(recipes, list):
        raise AIServiceError("AIの返答がレシピの配列ではありません。")
    return recipes
