"""
POST /api/generate-recipe-image
レシピ1件分の料理イメージ画像を返す。フロントはレシピ詳細画面で、ユーザーが「生成する」を選んだときに1枚ずつ呼び出す。
ログイン必須で、1ユーザーあたり1日 IMAGE_DAILY_LIMIT 枚まで（保存済み画像の再利用は数えない）。
AI呼び出しの中身は services/recipe_image_client.py、保存は services/image_storage.py、
ユーザー特定は services/auth.py、上限管理は services/image_quota.py に任せる。
"""

import asyncio
import base64

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import IMAGE_DAILY_LIMIT, app_config
from db.client import get_db
from services import image_quota, image_storage
from services.ai_client import AIServiceError
from services.auth import get_current_user_id
from services.recipe_image_client import generate_recipe_image
from services.recipe_image_prompt_builder import build_recipe_image_prompt

router = APIRouter()

# 同時にGeminiへ投げる生成数を絞り、レート制限に当たりにくくする
_generation_slots = asyncio.Semaphore(2)

_QUOTA_UNAVAILABLE = "画像生成の利用状況を確認できないため、現在は画像を生成できません。"


class RecipeImageRequest(BaseModel):
    recipeName: str = Field(min_length=1)
    ingredients: list[str] = []


@router.post("/recipe-image-prompt")
async def recipe_image_prompt_endpoint(req: RecipeImageRequest):
    """画像生成を使わないユーザーが、Geminiアプリに貼って画像を作るためのプロンプトを返す（AI呼び出し・ログインなし）。"""
    return {"prompt": build_recipe_image_prompt(req.recipeName, req.ingredients)}


@router.get("/image-quota")
def image_quota_endpoint(user_id: str = Depends(get_current_user_id), db: Session | None = Depends(get_db)):
    """今日の画像生成の利用状況（上限・利用済み・残り）を返す。"""
    if db is None:
        raise HTTPException(status_code=503, detail=_QUOTA_UNAVAILABLE)
    try:
        used = image_quota.used_today(db, user_id)
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail=_QUOTA_UNAVAILABLE)
    return {"limit": IMAGE_DAILY_LIMIT, "used": used, "remaining": max(IMAGE_DAILY_LIMIT - used, 0)}


@router.post("/generate-recipe-image")
async def generate_recipe_image_endpoint(
    req: RecipeImageRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session | None = Depends(get_db),
):
    if not app_config.api_key:
        raise HTTPException(status_code=400, detail="APIキーが設定されていません。設定画面からAPIキーを入力してください。")
    if app_config.provider != "gemini":
        # Claudeは画像を生成できない
        raise HTTPException(status_code=400, detail="画像生成はGeminiのみ対応しています。")

    use_storage = image_storage.is_configured()
    key = image_storage.image_key(req.recipeName)

    # 保存済みなら再利用して、画像生成のトークン消費を避ける（上限にも数えない）
    if use_storage:
        cached_url = await image_storage.find_image(key)
        if cached_url:
            return {"imageUrl": cached_url}

    # 利用回数を確認できない状態で生成させると、上限が効かず課金が膨らむため、DB未接続なら生成しない
    if db is None:
        raise HTTPException(status_code=503, detail=_QUOTA_UNAVAILABLE)
    try:
        used = image_quota.reserve(db, user_id, IMAGE_DAILY_LIMIT)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=503, detail=_QUOTA_UNAVAILABLE)
    if used is None:
        raise HTTPException(
            status_code=429,
            detail=f"本日の画像生成の上限（{IMAGE_DAILY_LIMIT}枚）に達しました。明日また生成できます。",
        )

    try:
        async with _generation_slots:
            data, mime_type = await generate_recipe_image(
                recipe_name=req.recipeName,
                ingredients=req.ingredients,
                api_key=app_config.api_key,
            )
    except AIServiceError as e:
        # 生成できなかった分は数えない
        try:
            image_quota.release(db, user_id)
        except SQLAlchemyError:
            db.rollback()
        raise HTTPException(status_code=502, detail=f"画像の生成に失敗しました: {e}")

    remaining = max(IMAGE_DAILY_LIMIT - used, 0)

    if use_storage:
        try:
            return {"imageUrl": await image_storage.upload_image(key, data, mime_type), "remaining": remaining}
        except httpx.HTTPError as e:
            # 保存に失敗しても、生成済みの画像は返す（DB無しでも動かす方針と同じ）
            print(f"[warn] 画像の保存に失敗したためdata URLで返します: {e}")

    encoded = base64.b64encode(data).decode("ascii")
    return {"imageUrl": f"data:{mime_type};base64,{encoded}", "remaining": remaining}
