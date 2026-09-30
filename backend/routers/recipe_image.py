"""
POST /api/generate-recipe-image
レシピ1件分の料理イメージ画像を返す。フロントは提案されたレシピごとに並列で呼び出す。
AI呼び出しの中身は services/recipe_image_client.py、保存は services/image_storage.py に任せる。
"""

import asyncio
import base64

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import app_config
from services import image_storage
from services.ai_client import AIServiceError
from services.recipe_image_client import generate_recipe_image

router = APIRouter()

# フロントが5件を同時に呼んでもGeminiのレート制限に当たりにくいよう、同時生成数を絞る
_generation_slots = asyncio.Semaphore(2)


class RecipeImageRequest(BaseModel):
    recipeName: str = Field(min_length=1)
    ingredients: list[str] = []


@router.post("/generate-recipe-image")
async def generate_recipe_image_endpoint(req: RecipeImageRequest):
    if not app_config.api_key:
        raise HTTPException(status_code=400, detail="APIキーが設定されていません。設定画面からAPIキーを入力してください。")
    if app_config.provider != "gemini":
        # Claudeは画像を生成できない
        raise HTTPException(status_code=400, detail="画像生成はGeminiのみ対応しています。")

    use_storage = image_storage.is_configured()
    key = image_storage.image_key(req.recipeName)

    # 保存済みなら再利用して、画像生成のトークン消費を避ける
    if use_storage:
        cached_url = await image_storage.find_image(key)
        if cached_url:
            return {"imageUrl": cached_url}

    try:
        async with _generation_slots:
            data, mime_type = await generate_recipe_image(
                recipe_name=req.recipeName,
                ingredients=req.ingredients,
                api_key=app_config.api_key,
            )
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"画像の生成に失敗しました: {e}")

    if use_storage:
        try:
            return {"imageUrl": await image_storage.upload_image(key, data, mime_type)}
        except httpx.HTTPError as e:
            # 保存に失敗しても、生成済みの画像は返す（DB無しでも動かす方針と同じ）
            print(f"[warn] 画像の保存に失敗したためdata URLで返します: {e}")

    encoded = base64.b64encode(data).decode("ascii")
    return {"imageUrl": f"data:{mime_type};base64,{encoded}"}
