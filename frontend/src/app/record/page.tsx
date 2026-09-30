"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearHistory, getHistory, type HistoryRecipe } from "@/lib/history";

export default function RecordPage() {
  const [history, setHistory] = useState<HistoryRecipe[]>([]);

  // localStorage はブラウザでしか使えないため、マウント後に読み込む
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-3xl font-bold text-center mb-8">記録</h1>
      {history.length === 0 ? (
        <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
          これまでに見たレシピがここに表示されます。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((recipe) => (
              <Link
                key={recipe.recipeName}
                href="/recipes/detail"
                onClick={() => sessionStorage.setItem("selectedRecipe", JSON.stringify(recipe))}
                className="bg-white rounded-3xl w-full shadow-md overflow-hidden hover:shadow-xl transition duration-300 p-4 sm:p-5 block"
              >
                <h2 className="text-base sm:text-xl font-bold">{recipe.recipeName}</h2>
                <p className="text-gray-500 mt-3 text-sm truncate">{recipe.ingredients.join("・")}</p>
                <div className="mt-4">
                  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                    {recipe.cookingTime}分
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="block mx-auto mt-6 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            記録を全て削除
          </button>
        </>
      )}
    </div>
  );
}
