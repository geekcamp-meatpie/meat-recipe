"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get("ingredients") ?? "";

  const [tags, setTags] = useState<string[]>(
    raw.split(/[,、\n]/).map((s) => s.trim()).filter(Boolean)
  );
  const [newTag, setNewTag] = useState("");

  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));

  const addTag = () => {
    if (!newTag.trim()) return;
    setTags([...tags, newTag.trim()]);
    setNewTag("");
  };

  const handleNext = () => {
    if (tags.length === 0) return;
    const params = new URLSearchParams({ ingredients: tags.join(",") });
    router.push(`/mode?${params.toString()}`);
  };

  return (
    <div className="px-5 pt-6 space-y-5">
      <h1 className="text-lg font-bold">食材の確認</h1>

      {/* タグ一覧 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1"
            style={{ background: "var(--color-icon-bg)", color: "var(--color-accent-dark)" }}
          >
            {tag}
            <button onClick={() => removeTag(i)} className="ml-1 opacity-60 hover:opacity-100">
              ✕
            </button>
          </span>
        ))}
      </div>

      {/* 追加入力 */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl p-3 text-sm focus:outline-none focus:ring-2"
          style={{ background: "var(--color-card)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
          placeholder="食材を追加..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
        />
        <button
          onClick={addTag}
          className="px-4 rounded-xl text-sm font-bold"
          style={{ background: "var(--color-icon-bg)", color: "var(--color-accent-dark)" }}
        >
          追加
        </button>
      </div>

      <button
        className="w-full rounded-xl p-3 font-bold text-white transition disabled:opacity-50"
        style={{ background: "var(--color-accent)" }}
        onClick={handleNext}
        disabled={tags.length === 0}
      >
        モード選択へ →
      </button>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
