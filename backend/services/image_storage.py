"""
生成した料理画像の保存（Supabase Storage、REST API経由）。

同じレシピ名の画像は保存済みのものを再利用し、Geminiの再生成（トークン消費）を避ける。
SUPABASE_URL / SUPABASE_API が未設定なら is_configured() が False になり、
呼び出し側（routers/recipe_image.py）は保存せずdata URLを返すフォールバックに切り替える。

事前準備: Supabaseで公開(public)バケットを作成しておく（バケット名は SUPABASE_IMAGE_BUCKET、既定 recipe-images）。
SUPABASE_API にはアップロード権限のあるキー（service_role キー等）が必要。
"""

import hashlib

import httpx

from config import SUPABASE_API_KEY, SUPABASE_IMAGE_BUCKET, SUPABASE_URL

TIMEOUT_SECONDS = 10.0


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_API_KEY)


def image_key(recipe_name: str) -> str:
    """レシピ名から保存キーを作る（日本語や記号をパスに使わないためハッシュ化する）。"""
    return hashlib.sha256(recipe_name.strip().encode("utf-8")).hexdigest()[:32]


def public_url(key: str) -> str:
    return f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_IMAGE_BUCKET}/{key}"


async def find_image(key: str) -> str | None:
    """保存済みなら公開URLを返す。無い・確認に失敗した場合は None（→再生成に進む）。"""
    url = public_url(key)
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            res = await client.head(url)
        return url if res.status_code == 200 else None
    except httpx.HTTPError:
        return None


async def upload_image(key: str, data: bytes, mime_type: str) -> str:
    """画像を保存して公開URLを返す。失敗時は httpx.HTTPError を送出する。"""
    upload_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_IMAGE_BUCKET}/{key}"
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": mime_type,
        "x-upsert": "true",
    }
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        res = await client.post(upload_url, content=data, headers=headers)
        res.raise_for_status()
    return public_url(key)
