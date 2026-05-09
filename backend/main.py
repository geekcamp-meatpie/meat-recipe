from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def health():
    return {"status": "ok"}
