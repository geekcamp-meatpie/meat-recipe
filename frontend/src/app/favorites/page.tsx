"use client";

import { useState } from "react";
import FavoriteCard from "../../components/FavoriteCard";

export default function FavoritesPage() {
  // サンプルのお気に入りレシピ
  const [favorites, setFavorites] = useState([
    {
      id: 1,
      name: "カルボナーラ",
      image: "/images/carbonara.jpg",
      ingredients: "ベーコン・卵・牛乳",
      time: 15,
    },
    {
      id: 2,
      name: "カレー",
      image: "/images/curry.jpg",
      ingredients: "牛肉・じゃがいも・にんじん・玉ねぎ",
      time: 30,
    },
        {
      id: 1,
      name: "カルボナーラ",
      image: "/images/carbonara.jpg",
      ingredients: "ベーコン・卵・牛乳",
      time: 15,
    },
    {
      id: 2,
      name: "カレー",
      image: "/images/curry.jpg",
      ingredients: "牛肉・じゃがいも・にんじん・玉ねぎ",
      time: 30,
    },
        {
      id: 1,
      name: "カルボナーラ",
      image: "/images/carbonara.jpg",
      ingredients: "ベーコン・卵・牛乳",
      time: 15,
    },
    {
      id: 2,
      name: "カレー",
      image: "/images/curry.jpg",
      ingredients: "牛肉・じゃがいも・にんじん・玉ねぎ",
      time: 30,
    },
  ]);

  // お気に入り解除されたカードを一覧から削除
  const handleRemoveFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.filter((recipe) => recipe.id !== id)
    );
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        ♡お気に入りレシピ♡
      </h1>

      {/* 2列で表示 */}
      <div className="grid grid-cols-2 gap-4">
        {favorites.map((recipe) => (
          <FavoriteCard
            key={recipe.id}
            data={recipe}
            onRemove={handleRemoveFavorite}
          />
        ))}
      </div>

      {favorites.length === 0 && (
        <p
          className="text-sm text-center mt-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          お気に入りに保存したレシピがここに表示されます。
        </p>
      )}
    </div>
  );
}
