from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Recipe(Base):
    """Issue #8: レシピ初期データ（seed）の投入先テーブル。"""

    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    genre = Column(String, nullable=False)
    cooking_method = Column(String, nullable=False)
    flavor = Column(String, nullable=False)
    volume = Column(String, nullable=False)
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
