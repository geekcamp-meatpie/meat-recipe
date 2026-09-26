import os

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_API_KEY = os.getenv("SUPABASE_API", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")


class AppConfig:
    """アプリ全体の設定を保持する（メモリ上に保存）。
    DB担当者: 将来的にDBで永続化する場合はこのクラスをDB読み書きに置き換える。
    """

    def __init__(self):
        # 環境変数 GEMINI_API_KEY（.env）を初期値にする。設定画面で保存したキーがあればそちらが優先される。
        self.api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.provider: str = "gemini"  # "gemini" or "claude"
        self.medicines: list[str] = []


app_config = AppConfig()
