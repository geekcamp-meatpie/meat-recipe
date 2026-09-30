"use client";

export interface RecipeCardData {
  recipeName: string;
  cookingTime: number;
  difficulty: string;
  ingredients: string[];
  imageUrl?: string;
  imageFailed?: boolean;
}

// お気に入りカード（FavoriteCard）と同じ見た目で、左に詳細・右に画像を並べたレシピ提案用カード
export default function RecipeCard({ recipe, onClick }: { recipe: RecipeCardData; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-3xl w-full shadow-md overflow-hidden hover:shadow-xl transition duration-300 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 text-left"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-base sm:text-xl font-bold">{recipe.recipeName}</h2>
        <p className="text-gray-500 mt-3 text-sm truncate">{recipe.ingredients.join("・")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
            {recipe.cookingTime}分
          </span>
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
            {recipe.difficulty}
          </span>
        </div>
      </div>
      <div
        className={`w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-3xl ${
          recipe.imageUrl || recipe.imageFailed ? "" : "animate-pulse"
        }`}
        style={{ background: "var(--color-hero-start)" }}
      >
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
        ) : (
          "🍽️"
        )}
      </div>
    </button>
  );
}
