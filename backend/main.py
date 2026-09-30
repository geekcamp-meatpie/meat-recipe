from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from db.client import engine
from db.models import Base
from routers import account, analyze_ingredients, recipe_image, recipes

app = FastAPI(title="Want Cooking API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"http://192\.168\.\d+\.\d+:3000",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes.router, prefix="/api")
app.include_router(analyze_ingredients.router, prefix="/api")
app.include_router(recipe_image.router, prefix="/api")
app.include_router(account.router, prefix="/api")

#起動イベント方式で書いてます。起動処理だけで、終了処理は書く必要がない。
#なにかしら起動したときに常時接続するものがある場合はlifespan方式で書くのが良い。
@app.on_event("startup")
def on_startup():
    """DB接続時は設定テーブルを用意する。DB未接続/接続失敗時はメモリ動作のまま起動を継続する。"""
    if engine is None:
        return
    try:
        Base.metadata.create_all(bind=engine)
        # image_usage は書き込みをバックエンドだけに限定する。SupabaseのAPI（anonキー）から
        # 読み書きされないよう、RLSを有効にする（ポリシー無し＝anon/authenticatedは全拒否。
        # バックエンドはRLSをバイパスするpostgresロールで接続する）。何度実行しても安全。
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE image_usage ENABLE ROW LEVEL SECURITY"))
    except Exception as exc:
        print(f"[warn] DBへの接続に失敗したため、設定はメモリ上のみで保持されます: {exc}")


@app.get("/")
def health():
    return {"status": "ok"}
