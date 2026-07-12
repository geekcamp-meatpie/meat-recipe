import json
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from fastapi import APIRouter

router = APIRouter()

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Geminiクライアントを遅延初期化する（環境変数 GEMINI_API_KEY が自動で読み込まれます）。
    起動時ではなくリクエスト時に初期化することで、キー未設定でもアプリ自体は起動できるようにする。
    """
    global _client
    if _client is None:
        _client = genai.Client()
    return _client

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
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="アップロードされたファイルは画像ではありません。")

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
        response = _get_client().models.generate_content(
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