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


async def call_ai(prompt: str, provider: str, api_key: str) -> list[dict]:
    """AIにプロンプトを送信し、レシピのリストを返す。"""
    if not api_key:
        return _dummy_recipes()

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

        return json.loads(response.text)
    except Exception as e:
           print(f"Gemini API Error: {e}")
    return _dummy_recipes()


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
        return json.loads(response_text)

    except Exception as e:
        print(f"Claude API Error: {e}")
        return _dummy_recipes()


def _dummy_recipes() -> list[dict]:
    """APIキー未設定時やテスト用のダミーレシピ"""
    return [
        {
            "recipeName": "鶏もも肉の照り焼き",
            "cookingTime": 20,
            "difficulty": "簡単",
            "ingredients": ["鶏もも肉 300g", "醤油 大さじ2", "みりん 大さじ2", "砂糖 大さじ1", "油 適量"],
            "steps": [
                "鶏もも肉を一口大に切る",
                "フライパンに油を熱し、鶏肉を皮目から焼く",
                "焼き色がついたら裏返し、蓋をして5分蒸し焼き",
                "醤油・みりん・砂糖を合わせたタレを加え、絡めながら煮詰める",
            ],
            "point": "皮目からじっくり焼くとパリッと仕上がります。",
            "warnings": [],
        },
        {
            "recipeName": "ポテトと玉ねぎのコンソメスープ",
            "cookingTime": 25,
            "difficulty": "簡単",
            "ingredients": ["じゃがいも 2個", "玉ねぎ 1個", "水 600ml", "コンソメ 1個", "塩こしょう 少々"],
            "steps": [
                "じゃがいもは皮をむいて一口大、玉ねぎは薄切りにする",
                "鍋に水とコンソメを入れ、野菜を加えて中火で煮る",
                "じゃがいもが柔らかくなったら塩こしょうで味を調える",
            ],
            "point": "じゃがいもは煮崩れしやすいので大きめに切ると良いです。",
            "warnings": [],
        },
        {
            "recipeName": "チキンと野菜の炒め物",
            "cookingTime": 15,
            "difficulty": "簡単",
            "ingredients": ["鶏もも肉 200g", "玉ねぎ 1/2個", "じゃがいも 1個", "醤油 大さじ1", "塩こしょう 少々", "油 適量"],
            "steps": [
                "鶏肉は一口大、玉ねぎはくし切り、じゃがいもは細切りにする",
                "じゃがいもは電子レンジで2分加熱しておく",
                "フライパンで鶏肉を炒め、火が通ったら野菜を加える",
                "醤油と塩こしょうで味付けして完成",
            ],
            "point": "じゃがいもを先にレンジで加熱すると時短になります。",
            "warnings": [],
        },
    ]
