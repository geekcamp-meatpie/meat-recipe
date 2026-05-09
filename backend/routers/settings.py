from fastapi import APIRouter
from pydantic import BaseModel
from config import app_config

router = APIRouter()


class SettingsRequest(BaseModel):
    api_key: str = ""
    provider: str = "gemini"
    medicines: list[str] = []


@router.get("/settings")
def get_settings():
    return {
        "api_key": app_config.api_key,
        "provider": app_config.provider,
        "medicines": app_config.medicines,
    }


@router.post("/settings")
def update_settings(req: SettingsRequest):
    app_config.api_key = req.api_key
    app_config.provider = req.provider
    app_config.medicines = req.medicines
    return {"status": "ok"}
