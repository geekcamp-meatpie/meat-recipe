from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from services.image_recognition import recognize_ingredients

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class RecognizedIngredient(BaseModel):
    name: str
    amount: str
    confidence: float


@router.post("/recognize-ingredients", response_model=list[RecognizedIngredient])
async def recognize_ingredients_endpoint(image: UploadFile = File(...)):
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="対応していない画像形式です（jpeg / png / webpのみ）")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="画像データが空です")

    return await recognize_ingredients(image_bytes)
