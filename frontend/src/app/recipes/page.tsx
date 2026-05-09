"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

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

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const params = {
          ingredients: searchParams.get("ingredients") ?? "",
          mode: searchParams.get("mode") ?? "only",
          taste: searchParams.get("taste") ?? "おまかせ",
          cooking: searchParams.get("cooking") ?? "おまかせ",
          genre: searchParams.get("genre") ?? "おまかせ",
          volume: searchParams.get("volume") ?? "普通",
        };

        const res = await fetch("http://localhost:8000/api/suggest-recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "レシピの取得に失敗しました");
        }

        const data = await res.json();
        setRecipes(data.recipes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, [searchParams]);

  if (loading) {
    return <div className="text-center py-16 text-base">🍳 AIがレシピを考え中...</div>;
  }

  if (error) {
    return (
      <div className="px-5 pt-10 space-y-4 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
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
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 space-y-4">
      <h1 className="text-lg font-bold">レシピ提案</h1>
      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        ※ AIが提案したレシピです。分量や手順は目安としてご利用ください。
      </p>

      <div className="space-y-2.5">
        {recipes.map((recipe, i) => (
          <button
            key={i}
            className="w-full text-left flex items-center gap-3.5 rounded-2xl p-3.5 transition hover:shadow-md"
            style={{
              background: "var(--color-card)",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
            onClick={() => {
              sessionStorage.setItem("selectedRecipe", JSON.stringify(recipe));
              router.push("/recipes/detail");
            }}
          >
            <div
              className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[26px] shrink-0"
              style={{ background: "var(--color-hero-start)" }}
            >
              🍽️
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1">{recipe.recipeName}</h3>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                調理時間: {recipe.cookingTime}分 ・ {recipe.difficulty}
              </p>
            </div>
            <span style={{ color: "#ccc" }}>›</span>
          </button>
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
