"use client";

import React, { useState } from "react";
import axios from "axios";

type FavoriteCardProps = {
  data: any;
  onRemove: (id: number) => void;
};

export default function FavoriteCard({
  data,
  onRemove,
}: FavoriteCardProps) {

  const [isFavorite, setIsFavorite] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleFavorite = async () => {

    if (isLoading) return;

    try {
      setIsLoading(true);

      // お気に入り解除API
      await axios.delete(`/api/favorites/${data.id}`);

      // ハートをOFF
      setIsFavorite(false);

      // 親ページからカードを削除
      onRemove(data.id);

    } catch (error) {

      console.error(
        "お気に入りの解除に失敗しました",
        error
      );

    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-xl transition duration-300">

      {/* 画像 */}
      <img
        src={data.image || "img/"}
        alt={data.name || "レシピ"}
        className="w-full h-40 object-cover"
      />

      {/* 内容 */}
      <div className="p-4">

        {/* タイトル + ハート */}
        <div className="flex justify-between items-center gap-2">

          <h2 className="text-lg font-bold truncate">
            {data.name || "カルボナーラ"}
          </h2>

          {/* ハート */}
          <button
            type="button"
            onClick={handleFavorite}
            disabled={isLoading}
            className="text-2xl shrink-0 transition-transform hover:scale-110 disabled:opacity-50"
            aria-label="お気に入りを解除"
          >
            {isFavorite ? "💖" : "♡"}
          </button>

        </div>

        {/* 食材 */}
        <p className="text-gray-500 text-sm mt-2 truncate">
          {data.ingredients || "ベーコン・卵・牛乳"}
        </p>

        {/* 調理時間 */}
        <div className="flex items-center justify-between mt-4">

          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs">
            {data.time || 15}分
          </span>

          <span className="text-sm text-gray-500">
            ♡ Favorites
          </span>

        </div>

      </div>
    </div>
  );
}