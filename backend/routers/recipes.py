from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import app_config
from services.ai_client import call_ai
from services.prompt_builder import build_prompt

router = APIRouter()


class RecipeRequest(BaseModel):
    ingredients: str
    mode: str = "only"
    taste: str = "おまかせ"
    cooking: str = "おまかせ"
    genre: str = "おまかせ"
    volume: str = "普通"


@router.post("/suggest-recipes")
async def suggest_recipes(req: RecipeRequest):
    if not app_config.api_key:
        raise HTTPException(status_code=400, detail="APIキーが設定されていません。設定画面からAPIキーを入力してください。")

    prompt = build_prompt(
        ingredients=req.ingredients,
        mode=req.mode,
        taste=req.taste,
        cooking=req.cooking,
        genre=req.genre,
        volume=req.volume,
        medicines=app_config.medicines,
    )

    recipes = await call_ai(
        prompt=prompt,
        provider=app_config.provider,
        api_key=app_config.api_key,
    )

    return {"recipes": recipes}
