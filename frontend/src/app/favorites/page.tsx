"use client";
import { useEffect, useState } from "react";
import FavoriteCard from "@/components/FavoriteCard";
import { useAuth } from "@/components/AuthProvider";
import { getFavorites, toggleFavorite, type FavoriteRecipe } from "@/lib/favorites";

export default function FavoritesPage() {
  // お気に入りの保存先は、ログイン中はサーバー（Supabase）、未ログインはこの端末の localStorage。
  // 保存先が変わるので、ログイン状態が確定・変化したときに読み直す。
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setFavorites(await getFavorites());
    } catch (err) {
      setError(err instanceof Error ? err.message : "お気に入りを読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    load();
    // user の切り替え（ログイン・ログアウト）で読み直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // ♡ボタンで解除 → 保存先を更新し、一覧も読み直して即座に消す
  const handleRemove = async (recipe: FavoriteRecipe) => {
    try {
      await toggleFavorite(recipe);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "お気に入りを解除できませんでした。");
    }
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-3xl font-bold text-center mb-8">♡お気に入りレシピ♡</h1>
      {error && <p className="text-sm text-center text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
          読み込み中...
        </p>
      ) : favorites.length === 0 ? (
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
      {!authLoading && !user && (
        <p className="mt-6 text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
          ログインすると、お気に入りを別の端末とも共有できます（設定画面からログインできます）。
        </p>
      )}
    </div>
  );
}
