"""
レシピの料理イメージ画像を生成させるためのプロンプトを設計する。
"""

# 材料は先頭の数件だけ渡す（全部並べると画像の構図が散らかるため）
MAX_INGREDIENTS_IN_PROMPT = 5


def build_recipe_image_prompt(recipe_name: str, ingredients: list[str]) -> str:
    """Gemini（画像生成）に渡す、料理イメージ画像用のプロンプトを返す。"""
    main_ingredients = "、".join(ingredients[:MAX_INGREDIENTS_IN_PROMPT])
    ingredient_line = f"主な食材: {main_ingredients}\n" if main_ingredients else ""
    return (
        f"料理「{recipe_name}」の完成イメージ写真を生成してください。\n"
        f"{ingredient_line}"
        "条件:\n"
        "- 器に盛り付けられた完成した料理を、斜め上から撮影したフードフォト風にする\n"
        "- 自然光で明るく、家庭のテーブルで撮ったような温かい雰囲気にする\n"
        "- 文字、ロゴ、人物、手は写さない\n"
        "- 料理が主役になるよう、背景はシンプルにする"
    )
