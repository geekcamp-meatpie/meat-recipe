"""
担当D: プロンプト設計
このファイルでプロンプトテンプレートを管理する。
条件に応じてプロンプトを組み立て、AIに送信する文字列を返す。
"""


def build_prompt(
    ingredients: str,
    mode: str,
    taste: str,
    cooking: str,
    genre: str,
    volume: str,
    medicines: list[str],
) -> str:
    # モードに応じた制約文
    if mode == "only":
        mode_text = (
            "【制約】提案するレシピは、以下の食材と一般的な調味料"
            "（塩、こしょう、砂糖、醤油、みりん、酒、油）のみで作れるものに限定してください。"
            "追加で購入が必要な食材は使わないでください。"
        )
    else:
        mode_text = (
            "【制約】以下の食材を必ず使用してください。"
            "それ以外に必要な食材がある場合は「追加で必要な食材」として明記してください。"
        )

    # お好み設定（「おまかせ」の項目はプロンプトから省略）
    preferences = []
    if taste != "おまかせ":
        preferences.append(f"【味の方向性】{taste}")
    if cooking != "おまかせ":
        preferences.append(f"【調理法】{cooking}")
    if genre != "おまかせ":
        preferences.append(f"【ジャンル】{genre}")
    preferences.append(f"【ボリューム】{volume}")

    preferences_text = "\n".join(preferences)

    # 薬チェック（担当D: 薬の相互作用チェック部分）
    medicine_text = ""
    if medicines:
        medicine_names = "、".join(medicines)
        medicine_text = f"""

【服用中の薬】{medicine_names}

上記の薬と相性の悪い食材がレシピに含まれる場合は、各レシピのJSONに以下を追加してください：
- warnings: 配列。各要素は {{ "warningIngredient": "注意が必要な食材名", "warningReason": "注意が必要な理由（1文）" }}
薬との相互作用がない場合は warnings を空配列にしてください。"""

    prompt = f"""あなたは料理提案AIです。以下の条件でレシピを3つ提案してください。

【食材】{ingredients}
{mode_text}
{preferences_text}
{medicine_text}

各レシピについて以下のJSON形式で返してください。レスポンスはJSON配列のみで、余計なテキストは含めないでください：
[
  {{
    "recipeName": "料理名",
    "cookingTime": 調理時間（分・数値）,
    "difficulty": "簡単" or "普通" or "本格的",
    "ingredients": ["材料1", "材料2", ...],
    "steps": ["手順1", "手順2", ...],
    "point": "美味しく作るコツ（1文）",
    "warnings": []
  }}
]"""

    return prompt
