"""
フロントから送られてきた画像（最大5枚）を受け取り、image_ai_client に解析を依頼して
結果をフロントに返す。AI呼び出しの中身（Gemini等）はここには書かない。
"""

from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from services.ai_credentials import AICredentials, get_gemini_credentials
from services.image_ai_client import IngredientDetection, analyze_image_ai

router = APIRouter()

# 1方向の写真では全食材が映らないことがあるため複数枚を許可するが、
# Geminiの無料枠・リクエスト上限（約20MB）を考慮して枚数とサイズに上限を設ける。
MAX_IMAGES = 3
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 1枚あたり5MB
MAX_TOTAL_BYTES = 20 * 1024 * 1024  # 合計20MB（3枚×5MB=15MB）
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/analyze-ingredients", response_model=List[IngredientDetection])
async def analyze_image(
    files: List[UploadFile] = File(...),
    creds: AICredentials = Depends(get_gemini_credentials),
):
    if len(files) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"アップロードできる画像は最大{MAX_IMAGES}枚です。")

    for file in files:
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail="アップロードできる画像形式は JPEG / PNG / WebP のみです。",
            )

    images: list[tuple[bytes, str]] = []
    total_bytes = 0
    for file in files:
        # 上限+1バイトまでしか読まないことで、巨大ファイルを丸ごとメモリに載せない
        image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"画像サイズは1枚あたり{MAX_IMAGE_BYTES // (1024 * 1024)}MB以下にしてください。",
            )
        total_bytes += len(image_bytes)
        if total_bytes > MAX_TOTAL_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"画像の合計サイズは{MAX_TOTAL_BYTES // (1024 * 1024)}MB以下にしてください。",
            )
        images.append((image_bytes, file.content_type))

    try:
        return await analyze_image_ai(images, creds.api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析中にエラーが発生しました: {str(e)}")
