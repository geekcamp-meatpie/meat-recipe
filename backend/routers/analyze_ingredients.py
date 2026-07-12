import json
import os
from typing import List
from fastapi import UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from fastapi import APIRouter

from config import app_config

router = APIRouter()


def _get_client() -> genai.Client:
    """Geminiクライアントを初期化する。
    設定画面（/api/settings）で保存されたAPIキーがあればそれを使い、
    無ければSDKのデフォルト挙動に従い環境変数（GEMINI_API_KEY等）から読み込む。
    リクエストごとに生成することで、設定画面でのキー変更を即座に反映する。
    """
    if app_config.api_key:
        return genai.Client(api_key=app_config.api_key)
    return genai.Client()


def _has_api_key() -> bool:
    return bool(app_config.api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))

# ==========================================
# 1. Pydanticでのレスポンススキーマ定義
# ==========================================
class IngredientDetection(BaseModel):
    name: str = Field(description="食材の名称（例: 鶏もも肉、玉ねぎ）")
    amount: str = Field(description="食材の量や個数（例: 300g、1個）。判別できない場合は「不明」とする")
    confidence: float = Field(description="識別精度の確信度（0.0 〜 1.0）")

# 最終的にフロントに返す配列の形
class IngredientResponse(BaseModel):
    ingredients: List[IngredientDetection]


# ==========================================
# 2. エンドポイントの実装
# ==========================================
@router.post("/analyze-ingredients", response_model=List[IngredientDetection])
async def analyze_ingredients(file: UploadFile = File(...)):
    # 拡張子の簡易チェック
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="アップロードされたファイルは画像ではありません。")

    if not _has_api_key():
        raise HTTPException(status_code=400, detail="APIキーが設定されていません。設定画面からAPIキーを入力してください。")

    try:
        # 画像バイナリを読み込む
        image_bytes = await file.read()
        
        # Gemini APIに渡す画像データの作成
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=file.content_type
        )

        # プロンプトの作成
        prompt = "画像に写っている食材をすべて検出し、その名前、量、確信度（confidence）を抽出してください。"

        # Gemini APIを呼び出す（Structured OutputsでPydanticの型を強制指定）
        # 非同期エンドポイント内のため、同期版ではなく非同期版クライアントを使う
        # (同期版はイベントループ内で呼ぶとhttpxクライアントがクローズ済み扱いになり失敗する)
        response = await _get_client().aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=IngredientResponse, # ここでPydanticモデルを適用
                temperature=0.1, # 揺らぎを抑えて安定させる
            ),
        )

        # Geminiから返ってきたテキスト（JSON）をパースする
        # Structured Outputsを使っているため、確実にIngredientResponseの構造で返ってきます
        result_json = json.loads(response.text)
        
        # リストの部分だけをフロントに返却
        return result_json.get("ingredients", [])

    except Exception as e:
        # 実際の運用ではログ出力などを挟んでください
        raise HTTPException(status_code=500, detail=f"解析中にエラーが発生しました: {str(e)}")