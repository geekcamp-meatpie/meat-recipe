"""
AIのAPIキー・プロバイダの受け取り。

APIキーはサーバーに保存しない。ユーザーがブラウザ（localStorage）に保存したキーを、
リクエストごとにヘッダーで受け取り、そのリクエストの間だけ使う。
  X-AI-API-Key : GeminiまたはClaudeのAPIキー
  X-AI-Provider: "gemini"（省略時）または "claude"
キーはログや応答に含めないこと。
"""

from dataclasses import dataclass, field

from fastapi import Header, HTTPException

PROVIDERS = ("gemini", "claude")

NO_API_KEY_MESSAGE = "APIキーが設定されていません。設定画面からAPIキーを入力してください。"


@dataclass(frozen=True)
class AICredentials:
    # repr=False: 例外やログにオブジェクトが出ても、キーが表示されないようにする
    api_key: str = field(repr=False)
    provider: str


def get_ai_credentials(
    x_ai_api_key: str | None = Header(default=None),
    x_ai_provider: str = Header(default="gemini"),
) -> AICredentials:
    api_key = (x_ai_api_key or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail=NO_API_KEY_MESSAGE)
    provider = x_ai_provider.strip().lower()
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="AIプロバイダが正しくありません。")
    return AICredentials(api_key=api_key, provider=provider)


def get_gemini_credentials(
    x_ai_api_key: str | None = Header(default=None),
    x_ai_provider: str = Header(default="gemini"),
) -> AICredentials:
    """Geminiしか使えない機能（画像認識・画像生成）用。"""
    creds = get_ai_credentials(x_ai_api_key, x_ai_provider)
    if creds.provider != "gemini":
        raise HTTPException(status_code=400, detail="この機能はGeminiのAPIキーでのみ利用できます。")
    return creds
