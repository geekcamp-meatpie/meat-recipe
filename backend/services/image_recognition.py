"""
担当B: 画像認識（マルチモーダルAPI呼び出し）
食材写真から食材名・量・confidenceスコアを抽出する。
マルチモーダルAPI実装後は _recognize_with_ai の中身を置き換える。
"""


async def recognize_ingredients(image_bytes: bytes) -> list[dict]:
    """画像バイナリを受け取り、認識された食材のリスト（name, amount, confidence）を返す。"""
    return await _recognize_with_ai(image_bytes)


async def _recognize_with_ai(image_bytes: bytes) -> list[dict]:
    """
    担当B: Gemini / Claude マルチモーダルAPI呼び出し
    現在はスタブとしてダミーデータを返す。

    実装例（Gemini）:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([
            "この画像に写っている食材名・量・確信度(confidence)をJSON配列で返してください。",
            {"mime_type": "image/jpeg", "data": image_bytes},
        ])
        return json.loads(response.text)
    """
    return _dummy_ingredients()


def _dummy_ingredients() -> list[dict]:
    """マルチモーダルAPI未実装時のダミーデータ"""
    return [
        {"name": "鶏もも肉", "amount": "300g", "confidence": 0.95},
        {"name": "玉ねぎ", "amount": "1個", "confidence": 0.80},
    ]
