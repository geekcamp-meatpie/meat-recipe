"""
DELETE /api/account
ログイン中のユーザー自身のアカウントを削除する（退会）。

Supabase Auth のユーザー削除には service_role キー（Admin API）が必要で、ブラウザからは実行できないため
バックエンドで行う。認証ユーザーに紐づくテーブルは auth.users への外部キー(on delete cascade)で一緒に消える設計。
外部キーを持たない image_usage だけは、ここで明示的に削除する。
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import SUPABASE_API_KEY, SUPABASE_URL
from db.client import get_db
from services.auth import get_current_user_id

router = APIRouter()

TIMEOUT_SECONDS = 10.0


async def _delete_auth_user(user_id: str) -> None:
    """Supabase Auth のユーザーを削除する。すでに存在しない(404)場合は成功扱い。"""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            res = await client.delete(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}",
                headers={"apikey": SUPABASE_API_KEY, "Authorization": f"Bearer {SUPABASE_API_KEY}"},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="退会処理を完了できませんでした。時間をおいて再度お試しください。")
    if res.status_code not in (200, 204, 404):
        raise HTTPException(status_code=502, detail="退会処理を完了できませんでした。時間をおいて再度お試しください。")


@router.delete("/account")
async def delete_account(user_id: str = Depends(get_current_user_id), db: Session | None = Depends(get_db)):
    # 先にログイン情報を消す。ここで失敗したら何も消えていないので、やり直せる
    await _delete_auth_user(user_id)

    # 利用回数の記録は退会後に残す理由が無いので消す。失敗してもアカウントはすでに削除済みなので、成功として返す
    if db is not None:
        try:
            db.execute(text("DELETE FROM image_usage WHERE user_id = CAST(:user_id AS uuid)"), {"user_id": user_id})
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            print(f"[warn] 退会時の image_usage 削除に失敗しました: user_id={user_id}")

    return {"status": "deleted"}
