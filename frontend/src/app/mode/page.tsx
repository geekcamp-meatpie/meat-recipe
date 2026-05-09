"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

const TASTE_OPTIONS = [
  "しょうゆ系", "味噌系", "塩系", "ソース系", "ケチャップ系",
  "ピリ辛", "酸味系", "クリーム系", "おまかせ",
];
const COOKING_OPTIONS = ["焼く", "炒める", "煮る", "蒸す", "揚げる", "生・和える", "おまかせ"];
const GENRE_OPTIONS = ["和食", "洋食", "中華", "韓国", "エスニック", "おまかせ"];
const VOLUME_OPTIONS = ["がっつり", "普通", "軽め"];

function ModeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ingredients = searchParams.get("ingredients") ?? "";

  const [mode, setMode] = useState<"only" | "omakase">("only");
  const [taste, setTaste] = useState("おまかせ");
  const [cooking, setCooking] = useState("おまかせ");
  const [genre, setGenre] = useState("おまかせ");
  const [volume, setVolume] = useState("普通");

  const handleSubmit = () => {
    const params = new URLSearchParams({ ingredients, mode, taste, cooking, genre, volume });
    router.push(`/recipes?${params.toString()}`);
  };

  return (
    <div className="px-5 pt-6 space-y-5">
      <h1 className="text-lg font-bold">モード選択・お好み設定</h1>

      {/* モード（セグメントコントロール） */}
      <div>
        <div className="text-sm font-bold mb-2">提案モード</div>
        <div className="flex rounded-xl p-1" style={{ background: "var(--color-border)" }}>
          <button
            className="flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition"
            style={{
              background: mode === "only" ? "var(--color-card)" : "transparent",
              color: mode === "only" ? "var(--color-accent)" : "#888",
              boxShadow: mode === "only" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
            onClick={() => setMode("only")}
          >
            手持ち食材のみ
          </button>
          <button
            className="flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition"
            style={{
              background: mode === "omakase" ? "var(--color-card)" : "transparent",
              color: mode === "omakase" ? "var(--color-accent)" : "#888",
              boxShadow: mode === "omakase" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
            onClick={() => setMode("omakase")}
          >
            おまかせ
          </button>
        </div>
      </div>

      <OptionGroup label="味の方向性" options={TASTE_OPTIONS} value={taste} onChange={setTaste} />
      <OptionGroup label="調理法" options={COOKING_OPTIONS} value={cooking} onChange={setCooking} />
      <OptionGroup label="ジャンル" options={GENRE_OPTIONS} value={genre} onChange={setGenre} />
      <OptionGroup label="ボリューム" options={VOLUME_OPTIONS} value={volume} onChange={setVolume} />

      <button
        className="w-full rounded-xl p-3 font-bold text-white transition"
        style={{ background: "var(--color-accent)" }}
        onClick={handleSubmit}
      >
        レシピを提案してもらう →
      </button>
    </div>
  );
}

function OptionGroup({
  label, options, value, onChange,
}: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-bold mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
            style={{
              background: value === opt ? "var(--color-accent)" : "var(--color-border)",
              color: value === opt ? "#fff" : "#888",
            }}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ModePage() {
  return (
    <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
      <ModeContent />
    </Suspense>
  );
}
