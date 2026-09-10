import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import app_config
from db.client import get_db
from db.models import AppSettings

router = APIRouter()


class SettingsRequest(BaseModel):
    api_key: str = ""
    provider: str = "gemini"
    medicines: list[str] = []


def _load_row(db: Session | None) -> AppSettings | None:
    if db is None:
        return None
    return db.get(AppSettings, 1)


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    row = _load_row(db)
    if row is not None:
        app_config.api_key = row.api_key
        app_config.provider = row.provider
        app_config.medicines = json.loads(row.medicines)

    return {
        "api_key": app_config.api_key,
        "provider": app_config.provider,
        "medicines": app_config.medicines,
    }


@router.post("/settings")
def update_settings(req: SettingsRequest, db: Session = Depends(get_db)):
    app_config.api_key = req.api_key
    app_config.provider = req.provider
    app_config.medicines = req.medicines

    row = _load_row(db)
    if db is not None:
        if row is None:
            row = AppSettings(id=1)
            db.add(row)
        row.api_key = req.api_key
        row.provider = req.provider
        row.medicines = json.dumps(req.medicines, ensure_ascii=False)
        db.commit()

    return {"status": "ok"}
