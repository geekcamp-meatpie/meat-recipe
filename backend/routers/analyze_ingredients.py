"""
担当: バックエンド（フロント連携）
フロントから送られてきた画像を受け取り、image_ai_client に解析を依頼して
結果をフロントに返す。AI呼び出しの中身（Gemini等）はここには書かない。
"""

from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field

from services.image_ai_client import analyze_image

router = APIRouter()


class IngredientDetection(BaseModel):
    name: str = Field(description="食材の名称（例: 鶏もも肉、玉ねぎ）")
    amount: str = Field(description="食材の量や個数（例: 300g、1個）。判別できない場合は「不明」とする")
    confidence: float = Field(description="識別精度の確信度（0.0〜1.0）")


@router.post("/analyze-ingredients", response_model=List[IngredientDetection])
async def analyze_ingredients(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="アップロードされたファイルは画像ではありません。")

    try:
        image_bytes = await file.read()
        return await analyze_image(image_bytes, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析中にエラーが発生しました: {str(e)}")
