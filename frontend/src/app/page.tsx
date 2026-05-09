"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [ingredientText, setIngredientText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  const handleSubmit = () => {
    if (!ingredientText.trim()) return;
    const params = new URLSearchParams({ ingredients: ingredientText });
    router.push(`/confirm?${params.toString()}`);
  };

  return (
    <>
      {/* ヒーロー */}
      <div
        className="px-6 pt-7 pb-8"
        style={{
          background: "linear-gradient(135deg, var(--color-hero-start) 0%, var(--color-hero-end) 100%)",
        }}
      >
        <div
          className="text-[11px] font-bold tracking-widest uppercase mb-2"
          style={{ color: "var(--color-accent-dark)" }}
        >
          Today&apos;s Cooking
        </div>
        <h1 className="text-2xl font-extrabold leading-tight mb-2">
          今日は何を
          <br />
          食べる？
        </h1>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
          食材の写真を撮るか、テキストで入力して
          <br />
          おすすめレシピを探してみよう。
        </p>
      </div>

      {/* 入力方法セクション */}
      <div className="px-5 pt-6">
        <div className="text-base font-bold mb-3.5" style={{ color: "var(--color-text)" }}>
          食材の入力方法
        </div>
        <div className="flex gap-2.5">
          {/* 担当B: カメラ撮影機能をここに実装 */}
          <button
            className="flex-1 rounded-2xl p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
            onClick={() => alert("カメラ機能は担当Bが実装予定")}
          >
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3 text-[22px]"
              style={{ background: "var(--color-icon-bg)" }}
            >
              📷
            </div>
            <h3 className="text-xs font-bold mb-1">撮影</h3>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              カメラで
              <br />
              撮影する
            </p>
          </button>

          {/* 担当B: アルバム選択機能をここに実装 */}
          <button
            className="flex-1 rounded-2xl p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
            onClick={() => alert("写真選択機能は担当Bが実装予定")}
          >
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3 text-[22px]"
              style={{ background: "var(--color-icon-bg)" }}
            >
              🖼️
            </div>
            <h3 className="text-xs font-bold mb-1">写真選択</h3>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              アルバムから
              <br />
              選ぶ
            </p>
          </button>

          <button
            className="flex-1 rounded-2xl p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
            onClick={() => setShowTextInput(!showTextInput)}
          >
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3 text-[22px]"
              style={{ background: "var(--color-icon-bg)" }}
            >
              ✏️
            </div>
            <h3 className="text-xs font-bold mb-1">テキスト</h3>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              文字で
              <br />
              入力する
            </p>
          </button>
        </div>
      </div>

      {/* テキスト入力エリア（テキストカードを押すと表示） */}
      {showTextInput && (
        <div className="px-5 pt-4 space-y-3">
          <textarea
            className="w-full rounded-2xl p-4 h-28 resize-none text-sm focus:outline-none focus:ring-2"
            style={{
              background: "var(--color-card)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
            }}
            placeholder="例: 鶏もも肉 300g, 玉ねぎ 1個, じゃがいも 2個"
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
          />
          <button
            className="w-full rounded-xl p-3 font-bold text-white transition disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
            onClick={handleSubmit}
            disabled={!ingredientText.trim()}
          >
            食材を確認する →
          </button>
        </div>
      )}

      {/* お気に入りレシピ（プレースホルダー） */}
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-base font-bold">お気に入りレシピ</span>
          <span
            className="text-xs font-semibold cursor-pointer"
            style={{ color: "var(--color-accent)" }}
          >
            すべて見る ›
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { emoji: "🥩", name: "牛肉の赤ワイン煮込み", time: 60, stars: "★★★" },
            { emoji: "🥓", name: "サーロインステーキ", time: 20, stars: "★★☆" },
            { emoji: "🍗", name: "鶏もも肉のグリル", time: 30, stars: "★☆☆" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-2xl p-3.5 cursor-pointer transition hover:shadow-md"
              style={{
                background: "var(--color-card)",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[26px] shrink-0"
                style={{ background: "var(--color-hero-start)" }}
              >
                {item.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold mb-1">{item.name}</h3>
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  調理時間: {item.time}分 ・ 難易度: {item.stars}
                </p>
              </div>
              <span style={{ color: "#ccc" }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
