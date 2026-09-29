"""
テストは実DBに接続しない。.env の DATABASE_URL が読み込まれる前に空を設定しておく
（load_dotenv は既存の環境変数を上書きしないため、db.client の engine は None になる）。
"""

import os

os.environ["DATABASE_URL"] = ""
