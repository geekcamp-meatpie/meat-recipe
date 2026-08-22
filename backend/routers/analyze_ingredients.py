"""
フロントから送られてきた画像を受け取り、image_ai_client に解析を依頼して
結果をフロントに返す。AI呼び出しの中身（Gemini等）はここには書かない。
"""

from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

from services.image_ai_client import IngredientDetection, analyze_image, has_api_key

router = APIRouter()


@router.post("/analyze-ingredients", response_model=List[IngredientDetection])
async def analyze_ingredients(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="アップロードされたファイルは画像ではありません。")

    if not has_api_key():
        raise HTTPException(status_code=400, detail="APIキーが設定されていません。設定画面からAPIキーを入力してください。")

    try:
        image_bytes = await file.read()
        return await analyze_image(image_bytes, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析中にエラーが発生しました: {str(e)}")
