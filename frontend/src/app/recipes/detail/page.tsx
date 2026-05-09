"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Recipe {
  recipeName: string;
  cookingTime: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  point: string;
  warnings?: { warningIngredient: string; warningReason: string }[];
}

export default function RecipeDetailPage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("selectedRecipe");
    if (stored) setRecipe(JSON.parse(stored));
  }, []);

  if (!recipe) {
    return <div className="text-center py-16">レシピが見つかりません</div>;
  }

  return (
    <div className="px-5 pt-6 space-y-5">
      <h1 className="text-lg font-bold">{recipe.recipeName}</h1>

      <div className="flex gap-3 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        <span>⏱ {recipe.cookingTime}分</span>
        <span>📊 {recipe.difficulty}</span>
      </div>

      {/* 薬との相互作用の警告 (担当D) */}
      {recipe.warnings && recipe.warnings.length > 0 && (
        <div
          className="rounded-2xl p-4 space-y-1"
          style={{ background: "#fff5f5", border: "1px solid #fecaca" }}
        >
          <h3 className="font-bold text-sm text-red-700">⚠ 薬との相互作用に注意</h3>
          {recipe.warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-600">
              {w.warningIngredient}: {w.warningReason}
            </p>
          ))}
          <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
            ※ AIによる参考情報です。医療上の判断は必ず医師・薬剤師にご相談ください。
          </p>
        </div>
      )}

      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--color-card)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
      >
        <h2 className="text-sm font-bold mb-2">材料</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--color-card)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
      >
        <h2 className="text-sm font-bold mb-2">手順</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--color-icon-bg)" }}>
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--color-accent-dark)" }}>
          💡 美味しく作るコツ
        </h3>
        <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>
          {recipe.point}
        </p>
      </div>

      <button
        className="w-full rounded-xl p-3 font-bold transition"
        style={{
          border: "1px solid var(--color-accent)",
          color: "var(--color-accent)",
          background: "transparent",
        }}
        onClick={() => router.back()}
      >
        ← 一覧に戻る
      </button>
    </div>
  );
}
