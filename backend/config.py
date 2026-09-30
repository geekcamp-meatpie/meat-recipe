import os

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_API_KEY = os.getenv("SUPABASE_API", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_IMAGE_BUCKET = os.getenv("SUPABASE_IMAGE_BUCKET", "recipe-images")
# 1ユーザーが1日（日本時間）に生成できる画像の枚数
IMAGE_DAILY_LIMIT = int(os.getenv("IMAGE_DAILY_LIMIT", "10"))

# AIのAPIキー・プロバイダ・薬のリストはサーバーでは保持しない。
# ユーザーのブラウザに保存されたものをリクエストごとに受け取る（services/ai_credentials.py）。
