from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.ai_client import AIServiceError, call_ai
from services.ai_credentials import AICredentials, get_ai_credentials
from services.prompt_builder import build_prompt

router = APIRouter()


class RecipeRequest(BaseModel):
    ingredients: str
    mode: str = "only"
    taste: str = "おまかせ"
    cooking: str = "おまかせ"
    genre: str = "おまかせ"
    volume: str = "普通"
    # 服用中の薬。端末（ブラウザ）にだけ保存されているものを、リクエストごとに受け取る
    medicines: list[str] = Field(default_factory=list, max_length=50)


@router.post("/suggest-recipes")
async def suggest_recipes(req: RecipeRequest, creds: AICredentials = Depends(get_ai_credentials)):
    prompt = build_prompt(
        ingredients=req.ingredients,
        mode=req.mode,
        taste=req.taste,
        cooking=req.cooking,
        genre=req.genre,
        volume=req.volume,
        medicines=[m.strip()[:100] for m in req.medicines if m.strip()],
    )

    try:
        recipes = await call_ai(
            prompt=prompt,
            provider=creds.provider,
            api_key=creds.api_key,
        )
    except AIServiceError as e:
        raise HTTPException(status_code=502, detail=f"レシピの生成に失敗しました: {e}")

    return {"recipes": recipes}
