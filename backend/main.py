from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.client import engine
from db.models import Base
from routers import recipes, settings

app = FastAPI(title="Want Cooking API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """DB接続時は設定テーブルを用意する。DB未接続/接続失敗時はメモリ動作のまま起動を継続する。"""
    if engine is None:
        return
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[warn] DBへの接続に失敗したため、設定はメモリ上のみで保持されます: {exc}")


@app.get("/")
def health():
    return {"status": "ok"}
