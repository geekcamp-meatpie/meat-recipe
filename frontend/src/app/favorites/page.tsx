"use client";
import { useEffect, useState } from "react";
import FavoriteCard from "@/components/FavoriteCard";
import { getFavorites, toggleFavorite, type FavoriteRecipe } from "@/lib/favorites";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemove = (recipe: FavoriteRecipe) => {
    toggleFavorite(recipe);
    setFavorites(getFavorites());
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-3xl font-bold text-center mb-8">♡お気に入りレシピ♡</h1>
      {favorites.length === 0 ? (
        <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
          お気に入りに保存したレシピがここに表示されます。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map((recipe) => (
            <FavoriteCard key={recipe.recipeName} recipe={recipe} onRemove={() => handleRemove(recipe)} />
          ))}
        </div>
      )}
    </div>
  );
}
