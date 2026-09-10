from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL

# DATABASE_URL未設定の環境（.env未配布のメンバー等）でも起動時にクラッシュしないよう、
# 未設定時はengine/SessionLocalをNoneのままにしておく。
engine = create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
SessionLocal = (
    sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
)


def get_db():
    """FastAPIのDependsで使うDBセッション取得用ジェネレータ。
    DB未接続の環境ではNoneを渡し、呼び出し側でメモリ動作にフォールバックさせる。
    """
    if SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
