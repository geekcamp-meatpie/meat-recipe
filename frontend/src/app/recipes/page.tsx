"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import RecipeCard from "@/components/RecipeCard";
import { aiHeaders, getAiSettings } from "@/lib/aiSettings";

interface Recipe {
  recipeName: string;
  cookingTime: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  point: string;
}

function RecipesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 条件変更・再試行・画面遷移で古い取得結果が反映されないようにする
    let cancelled = false;

    const fetchRecipes = async () => {
      setLoading(true);
      setError("");
      setNeedsApiKey(false);
      try {
        const params = {
          ingredients: searchParams.get("ingredients") ?? "",
          mode: searchParams.get("mode") ?? "only",
          taste: searchParams.get("taste") ?? "おまかせ",
          cooking: searchParams.get("cooking") ?? "おまかせ",
          genre: searchParams.get("genre") ?? "おまかせ",
          volume: searchParams.get("volume") ?? "普通",
        };

        const res = await fetch("/api/suggest-recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...aiHeaders() },
          body: JSON.stringify({ ...params, medicines: getAiSettings().medicines }),
        });

        if (!res.ok) {
          setNeedsApiKey(res.status === 400);
          const data = await res.json();
          throw new Error(data.detail || "レシピの取得に失敗しました");
        }

        const data = await res.json();
        if (cancelled) return;
        setRecipes(data.recipes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
    return () => {
      cancelled = true;
    };
  }, [searchParams, retryCount]);

  if (loading) {
    return <div className="text-center py-16 text-base">🍳 AIがレシピを考え中...</div>;
  }

  if (error) {
    return (
      <div className="px-5 pt-10 space-y-4 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
        {needsApiKey ? (
          <>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              設定画面でAPIキーを入力してください
            </p>
            <button
              className="rounded-xl px-6 py-2 font-bold text-white"
              style={{ background: "var(--color-accent)" }}
              onClick={() => router.push("/settings")}
            >
              設定画面へ
            </button>
          </>
        ) : (
          <button
            className="rounded-xl px-6 py-2 font-bold text-white"
            style={{ background: "var(--color-accent)" }}
            onClick={() => setRetryCount((c) => c + 1)}
          >
            もう一度試す
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 space-y-4">
      <h1 className="text-lg font-bold">レシピ提案</h1>
      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        ※ AIが提案したレシピです。分量や手順は目安としてご利用ください。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.recipeName}
            recipe={recipe}
            onClick={() => {
              sessionStorage.setItem("selectedRecipe", JSON.stringify(recipe));
              router.push("/recipes/detail");
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
      <RecipesContent />
    </Suspense>
  );
}
