from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Recipe(Base):
    """Issue #8: レシピ初期データ（seed）の投入先テーブル。"""

    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True)                                       #主キー
    name = Column(String, nullable=False)                                        # レシピ名
    genre = Column(String, nullable=False)                                       # 料理のジャンル
    cooking_method = Column(String, nullable=False)                              # 調理法
    flavor = Column(String, nullable=False)                                      # 味つけ
    volume = Column(String, nullable=False)                                      # 分量
    cooking_time = Column(Integer, nullable=False)  # 分
    difficulty = Column(String, nullable=False)
    steps = Column(Text, nullable=False)  # 手順の配列をJSON文字列として保持
    point = Column(Text, nullable=False)

    ingredients = relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan"
    )


class RecipeIngredient(Base):
    """Issue #9: 食材名の全文検索対象。Issue #11: スコアリング・必須食材判定に使用。"""

    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    amount = Column(String, nullable=True)
    is_optional = Column(Boolean, nullable=False, default=False)

    recipe = relationship("Recipe", back_populates="ingredients")


class AppSettings(Base):
    """Issue #4: APIキー・薬情報などアプリ設定の永続化用テーブル（常に単一行 id=1 を使用）。"""

    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    api_key = Column(String, nullable=False, default="")
    provider = Column(String, nullable=False, default="gemini")
    medicines = Column(Text, nullable=False, default="[]")  # JSON文字列としてリストを保持


class ImageUsage(Base):
    """画像生成の利用回数（ユーザー×日本時間の日付ごと）。1日の上限チェックに使う。

    user_id は Supabase Auth のユーザーID（auth.users.id）。
    Supabaseの public スキーマはAPI経由で公開されるため、起動時に RLS を有効化して
    フロント（anonキー）からは読み書きできないようにしている（main.py）。書き込みはバックエンドのみ。
    """

    __tablename__ = "image_usage"

    user_id = Column(UUID(as_uuid=False), primary_key=True)
    usage_date = Column(Date, primary_key=True)
    count = Column(Integer, nullable=False, default=0)
