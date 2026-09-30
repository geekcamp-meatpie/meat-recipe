"""
ログインユーザーの特定（Supabase Auth）。

フロントが送る `Authorization: Bearer <アクセストークン>` を、SupabaseのAuth API（/auth/v1/user）に
問い合わせて検証し、ユーザーIDを返す。署名方式（HS256/非対称鍵）に依存せず、失効したトークンも弾ける。
ログインは任意機能なので、この依存関係を付けたエンドポイントだけがログイン必須になる。
"""

import httpx
from fastapi import Header, HTTPException

from config import SUPABASE_API_KEY, SUPABASE_URL

TIMEOUT_SECONDS = 10.0


async def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not (SUPABASE_URL and SUPABASE_API_KEY):
        raise HTTPException(status_code=503, detail="ログイン機能が設定されていないため、この機能は利用できません。")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="ログインが必要です。")
    token = authorization[7:].strip()

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            res = await client.get(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={"apikey": SUPABASE_API_KEY, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="ログイン状態を確認できませんでした。時間をおいて再度お試しください。")

    if res.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="ログインの有効期限が切れています。再度ログインしてください。")
    if res.status_code != 200:
        raise HTTPException(status_code=503, detail="ログイン状態を確認できませんでした。時間をおいて再度お試しください。")
    user_id = res.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="ログインが必要です。")
    return user_id
