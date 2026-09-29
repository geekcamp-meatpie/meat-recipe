"use client";
import { useEffect, useState } from "react";
import FavoriteCard from "@/components/FavoriteCard";
import { getFavorites, toggleFavorite, type FavoriteRecipe } from "@/lib/favorites";

export default function FavoritesPage() {
  // [修正理由] 元は axios で /api/favorites/list を取得する想定だったが、
  //  - getFavoritesList が「useEffect を呼ぶ関数」になっており、フックの呼び出しルール違反
  //    （レンダーのたびに別の関数が作られ、useEffect も実際には実行されない）
  //  - useEffect 内の async 関数が定義されるだけで呼ばれておらず、取得結果も state に入らない
  //  - FavoriteCard に「関数そのもの」を data として渡しており、中身のデータになっていなかった
  //  - バックエンドに /api/favorites/list が存在しない
  // そのため、お気に入りは lib/favorites.ts 経由でブラウザの localStorage から読み、
  // useState で保持して画面に反映する形にした。
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);

  // localStorage はブラウザでしか使えないため、SSR とのずれを避けて
  // マウント後（useEffect）に読み込む
  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  // ♡ボタンで解除 → localStorage を更新し、一覧の state も再読込して即座に消す
  const handleRemove = (recipe: FavoriteRecipe) => {
    toggleFavorite(recipe);
    setFavorites(getFavorites());
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-3xl font-bold text-center mb-8">♡お気に入りレシピ♡</h1>
      {/* [修正理由] 元は FavoriteCard を10個べた書きし、かつ「お気に入りに保存したレシピが
          ここに表示されます」の案内文も常に表示されていた（空の grid も残っていた）。
          実データの件数分 map で描画し、0件のときだけ案内文を出すようにした。
          key はレシピ名（お気に入りの重複判定も recipeName で行っているため） */}
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
