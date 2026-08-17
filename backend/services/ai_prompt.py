import json
from google import genai

# 1. Gemini APIクライアントの初期化
client = genai.Client()

def generate_recipe_from_json(ingredients_json: str, flavor_style: str) -> str:
    """
    JSON形式の食材データとユーザーの希望（味付け・雰囲気）を受け取り、レシピを生成する
    """
    # 2. 受信したJSON文字列をロード
    ingredients_list = json.loads(ingredients_json)
    
    # 3. プロンプト用にテキスト整形
    ingredients_text = "\n".join(
        [f"- {item['name']}: {item['quantity']}" for item in ingredients_list]
    )
    
    # 4. システムプロンプト＋条件の組み立て
    prompt = f"""
あなたはプロの料理研究家です。
提供された食材リストとユーザーの希望をもとに、最適なレシピを1つ考案してください。

【指定された味・料理の雰囲気】
{flavor_style}

【利用できる食材】
{ingredients_text}

【出力フォーマット】
1. 料理名
2. ポイント（どのように希望の味・雰囲気を表現したか）
3. 必要な調味料（一般的なご家庭にあるもの）
4. 調理手順（ステップ順）
"""

    # 5. API呼び出し（軽量・高速な gemini-2.5-flash を使用）
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    
    return response.text


# --------------------------------------------------
# 動作テスト例
# --------------------------------------------------

# 送られてくる完成済みのJSONデータ（例）
received_json = '''
[
  {"name": "豚バラ薄切り肉", "quantity": "200g"},
  {"name": "大根", "quantity": "1/4本"},
  {"name": "ごま油", "quantity": "適量"}
]
'''

# ユーザーがUI等で選択/入力した条件（例）
user_preference = "ピリ辛・ご飯が進むがっつり系和風"

# 処理実行
recipe_result = generate_recipe_from_json(received_json, user_preference)
print(recipe_result)
