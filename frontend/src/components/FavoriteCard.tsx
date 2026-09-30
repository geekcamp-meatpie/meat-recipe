"use client";
import Link from "next/link";
import type { FavoriteRecipe } from "@/lib/favorites";

export default function FavoriteCard({
  recipe,
  onRemove,
}: {
  recipe: FavoriteRecipe;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl w-full shadow-md overflow-hidden hover:shadow-xl transition duration-300 p-4 sm:p-5">
      <div className="flex justify-between items-start gap-2">
        <Link
          href="/recipes/detail"
          onClick={() => sessionStorage.setItem("selectedRecipe", JSON.stringify(recipe))}
          className="min-w-0 flex-1"
        >
          <h2 className="text-base sm:text-xl font-bold">{recipe.recipeName}</h2>
        </Link>
        <button
          type="button"
          aria-label="お気に入りから削除"
          className="text-2xl leading-none text-red-500"
          onClick={onRemove}
        >
          ♥
        </button>
      </div>
      <p className="text-gray-500 mt-3 text-sm truncate">{recipe.ingredients.join("・")}</p>
      <div className="mt-4">
        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
          {recipe.cookingTime}分
        </span>
      </div>
    </div>
  );
}
