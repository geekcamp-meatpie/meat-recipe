class AppConfig:
    """アプリ全体の設定を保持する（メモリ上に保存）。
    DB担当者: 将来的にDBで永続化する場合はこのクラスをDB読み書きに置き換える。
    """

    def __init__(self):
        self.api_key: str = ""
        self.provider: str = "gemini"  # "gemini" or "claude"
        self.medicines: list[str] = []


app_config = AppConfig()
