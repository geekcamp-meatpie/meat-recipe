"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [saved, setSaved] = useState(false);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [newMedicine, setNewMedicine] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setApiKey(data.api_key || "");
        setProvider(data.provider || "gemini");
        setMedicines(data.medicines || []);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, provider, medicines }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("保存に失敗しました。バックエンドが起動しているか確認してください。");
    }
  };

  const addMedicine = () => {
    if (!newMedicine.trim()) return;
    setMedicines([...medicines, newMedicine.trim()]);
    setNewMedicine("");
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  return (
    <div className="px-5 pt-6 space-y-6">
      <h1 className="text-lg font-bold">設定</h1>

      {/* APIキー設定 */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{ background: "var(--color-card)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
      >
        <h2 className="text-sm font-bold">AI APIキー</h2>

        {/* プロバイダー選択（セグメント） */}
        <div className="flex rounded-xl p-1" style={{ background: "var(--color-border)" }}>
          <button
            className="flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition"
            style={{
              background: provider === "gemini" ? "var(--color-card)" : "transparent",
              color: provider === "gemini" ? "var(--color-accent)" : "#888",
              boxShadow: provider === "gemini" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
            onClick={() => setProvider("gemini")}
          >
            Gemini（開発用）
          </button>
          <button
            className="flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition"
            style={{
              background: provider === "claude" ? "var(--color-card)" : "transparent",
              color: provider === "claude" ? "var(--color-accent)" : "#888",
              boxShadow: provider === "claude" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
            onClick={() => setProvider("claude")}
          >
            Claude（本番用）
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1">APIキー</label>
          <input
            type="password"
            className="w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-2"
            style={{ background: "#f5f0eb" }}
            placeholder={
              provider === "gemini"
                ? "Gemini APIキーを入力..."
                : "Claude APIキーを入力..."
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
            {provider === "gemini"
              ? "Google AI Studio からAPIキーを取得してください"
              : "Anthropic Console からAPIキーを取得してください"}
          </p>
        </div>
      </div>

      {/* 薬管理 (担当D: 薬チェック機能) */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--color-card)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
      >
        <h2 className="text-sm font-bold">服用中の薬（任意）</h2>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          登録すると、レシピ提案時に薬との相互作用を自動でチェックします。
        </p>

        <div className="flex flex-wrap gap-2">
          {medicines.map((med, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{ background: "#e8f0fe", color: "#1a56db" }}
            >
              {med}
              <button onClick={() => removeMedicine(i)} className="ml-1 opacity-60 hover:opacity-100">
                ✕
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl p-2 text-sm focus:outline-none focus:ring-2"
            style={{ background: "#f5f0eb" }}
            placeholder="薬名を入力..."
            value={newMedicine}
            onChange={(e) => setNewMedicine(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMedicine()}
          />
          <button
            onClick={addMedicine}
            className="px-4 rounded-xl text-xs font-bold"
            style={{ background: "#e8f0fe", color: "#1a56db" }}
          >
            追加
          </button>
        </div>
      </div>

      <button
        className="w-full rounded-xl p-3 font-bold text-white transition"
        style={{ background: "var(--color-accent)" }}
        onClick={handleSave}
      >
        {saved ? "✓ 保存しました" : "設定を保存"}
      </button>
    </div>
  );
}
