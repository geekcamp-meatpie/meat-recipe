"""
画像生成の1日あたりの上限管理（image_usage テーブル、PostgreSQL 専用のSQL）。

並列リクエストでも上限を超えないよう、確認と加算は1つのSQL（UPSERT）でアトミックに行う。
方針: 生成の前に枠を確保（reserve）し、失敗したら返す（release）。保存済み画像の再利用は数えない。
日付の区切りは日本時間の0時。
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

# Windows等ではtzdataが無いことがあるため、日本時間は固定オフセット（サマータイムなし）で扱う
JST = timezone(timedelta(hours=9))


def today_jst() -> date:
    return datetime.now(JST).date()


def reserve(db: Session, user_id: str, limit: int) -> int | None:
    """枠を1つ確保し、確保後の利用枚数を返す。すでに上限なら None。"""
    row = db.execute(
        text(
            """
            INSERT INTO image_usage (user_id, usage_date, count)
            VALUES (CAST(:user_id AS uuid), :day, 1)
            ON CONFLICT (user_id, usage_date)
            DO UPDATE SET count = image_usage.count + 1
            WHERE image_usage.count < :limit
            RETURNING count
            """
        ),
        {"user_id": user_id, "day": today_jst(), "limit": limit},
    ).first()
    db.commit()
    return row[0] if row else None


def release(db: Session, user_id: str) -> None:
    """生成に失敗したときに、確保した枠を返す。"""
    db.execute(
        text(
            """
            UPDATE image_usage SET count = GREATEST(count - 1, 0)
            WHERE user_id = CAST(:user_id AS uuid) AND usage_date = :day
            """
        ),
        {"user_id": user_id, "day": today_jst()},
    )
    db.commit()


def used_today(db: Session, user_id: str) -> int:
    row = db.execute(
        text("SELECT count FROM image_usage WHERE user_id = CAST(:user_id AS uuid) AND usage_date = :day"),
        {"user_id": user_id, "day": today_jst()},
    ).first()
    return row[0] if row else 0
