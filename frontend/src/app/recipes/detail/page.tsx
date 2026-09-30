"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { displayImage, isFavorite, setFavoriteUserImage, toggleFavorite } from "@/lib/favorites";
import { addHistory } from "@/lib/history";
import { resizeImageToDataUrl } from "@/lib/image";
import { supabase } from "@/lib/supabase";

interface Recipe {
  recipeName: string;
  cookingTime: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  point: string;
  warnings?: { warningIngredient: string; warningReason: string }[];
  imageUrl?: string;
  userImageUrl?: string;
}

/** ログイン中のアクセストークンを Authorization ヘッダーにして返す（未ログインなら空） */
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: null };
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ask: 生成するか確認中 / generating: 生成中 / failed: 生成失敗 / declined: 生成せず、Geminiアプリ用のプロンプトを表示
type ImageState = "ask" | "generating" | "failed" | "declined";

export default function RecipeDetailPage() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [imageState, setImageState] = useState<ImageState>("ask");
  const [imageMessage, setImageMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  // 今日あと何枚生成できるか（ログイン中のみ。取得できない間は null）
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("selectedRecipe");
    if (stored) {
      const r: Recipe = JSON.parse(stored);
      setRecipe(r);
      setFavorite(isFavorite(r.recipeName));
      addHistory(r);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setRemaining(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/image-quota", { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRemaining(data.remaining);
      } catch {
        // 残り枚数は補助表示なので、取得できなくても画面は動かす
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!recipe) {
    return <div className="text-center py-16">レシピが見つかりません</div>;
  }

  const image = displayImage(recipe);

  // 画像は毎回ユーザーに確認してから生成する（1枚ずつ）
  const generateImage = async () => {
    setImageState("generating");
    setImageMessage("");
    try {
      const res = await fetch("/api/generate-recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ recipeName: recipe.recipeName, ingredients: recipe.ingredients }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "画像の生成に失敗しました。");
      }
      const { imageUrl, remaining: left } = await res.json();
      if (!imageUrl) throw new Error("画像の生成に失敗しました。");
      if (typeof left === "number") setRemaining(left);
      setRecipe((prev) => (prev ? { ...prev, imageUrl } : prev));
    } catch (err) {
      setImageMessage(err instanceof Error ? err.message : "画像の生成に失敗しました。");
      setImageState("failed");
    }
  };

  // 生成しない場合は、Geminiアプリに貼り付けるプロンプトを表示する
  const declineGeneration = async () => {
    setImageState("declined");
    setCopied(false);
    try {
      const res = await fetch("/api/recipe-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeName: recipe.recipeName, ingredients: recipe.ingredients }),
      });
      if (!res.ok) throw new Error();
      setPrompt((await res.json()).prompt);
    } catch {
      setPrompt(`料理「${recipe.recipeName}」の完成イメージ写真を生成してください。`);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setImageMessage("コピーできませんでした。テキストを長押しして選択してください。");
    }
  };

  // 写真フォルダから選んだ画像を縮小して付ける。お気に入り済みなら保存内容も更新する
  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを選び直しても onChange が発火するようにする
    if (!file) return;
    try {
      const userImageUrl = await resizeImageToDataUrl(file);
      setRecipe({ ...recipe, userImageUrl });
      if (!setFavoriteUserImage(recipe.recipeName, userImageUrl)) {
        setImageMessage("写真を保存できませんでした（保存容量の上限）。");
      } else {
        setImageMessage("");
      }
    } catch {
      setImageMessage("画像を読み込めませんでした。別の画像を選んでください。");
    }
  };

  const removePhoto = () => {
    setRecipe({ ...recipe, userImageUrl: undefined });
    setFavoriteUserImage(recipe.recipeName, undefined);
    setImageMessage("");
  };

  const buttonStyle = { border: "1px solid var(--color-accent)", color: "var(--color-accent)" };

  return (
    <div className="px-5 pt-6 space-y-5">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={recipe.recipeName}
          className="w-full aspect-square sm:aspect-video object-cover rounded-3xl shadow-md"
        />
      ) : (
        <div
          className="w-full rounded-3xl p-5 flex flex-col items-center justify-center gap-3 text-center"
          style={{ background: "var(--color-hero-start)" }}
        >
          <span className={`text-6xl ${imageState === "generating" ? "animate-pulse" : ""}`}>🍽️</span>

          {imageState === "ask" && user && (
            <>
              <p className="text-sm font-bold">料理のイメージ画像を生成しますか？</p>
              {remaining !== null && (
                <p className="text-[11px]" style={{ color: "var(--color-text-sub)" }}>
                  今日の残り: {remaining}枚
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--color-accent)" }}
                  onClick={generateImage}
                  disabled={remaining === 0}
                >
                  生成する
                </button>
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold bg-white"
                  style={buttonStyle}
                  onClick={declineGeneration}
                >
                  生成しない
                </button>
              </div>
              {remaining === 0 && (
                <p className="text-[11px] text-red-600">
                  本日の画像生成の上限に達しました。Geminiアプリで作ることもできます。
                </p>
              )}
            </>
          )}

          {imageState === "ask" && !user && (
            <>
              <p className="text-sm font-bold">料理のイメージ画像</p>
              <p className="text-[11px]" style={{ color: "var(--color-text-sub)" }}>
                画像の生成はログインすると使えます（設定画面からログインできます）。
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href="/settings"
                  className="rounded-xl px-5 py-2 text-sm font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  ログインする
                </Link>
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold bg-white"
                  style={buttonStyle}
                  onClick={declineGeneration}
                >
                  Geminiアプリで作る
                </button>
              </div>
            </>
          )}

          {imageState === "generating" && (
            <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>
              画像を生成中...
            </p>
          )}

          {imageState === "failed" && (
            <>
              <p className="text-sm text-red-600">{imageMessage || "画像の生成に失敗しました。"}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                  onClick={generateImage}
                >
                  もう一度生成する
                </button>
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold bg-white"
                  style={buttonStyle}
                  onClick={declineGeneration}
                >
                  Geminiアプリで作る
                </button>
              </div>
            </>
          )}

          {imageState === "declined" && (
            <div className="w-full space-y-2 text-left">
              <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>
                Geminiアプリに下のプロンプトを貼り付けると、画像を作れます。できた画像は、下の「写真から選ぶ」で追加できます。
              </p>
              <textarea
                readOnly
                value={prompt}
                className="w-full h-36 rounded-xl p-3 text-xs bg-white resize-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                  onClick={copyPrompt}
                  disabled={!prompt}
                >
                  {copied ? "コピーしました ✓" : "プロンプトをコピー"}
                </button>
                <button
                  className="rounded-xl px-5 py-2 text-sm font-bold bg-white"
                  style={buttonStyle}
                  onClick={() => setImageState("ask")}
                >
                  {user ? "やっぱり生成する" : "戻る"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 写真フォルダから料理の画像を追加する（capture を付けないので、撮影ではなくアルバム/ファイル選択が開く） */}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
        <button
          className="rounded-xl px-4 py-2 text-xs font-bold bg-white"
          style={buttonStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          🖼️ 写真から選ぶ
        </button>
        {recipe.userImageUrl && (
          <button className="text-xs underline" style={{ color: "var(--color-text-muted)" }} onClick={removePhoto}>
            選んだ写真を外す
          </button>
        )}
        {image && imageMessage && <span className="text-xs text-red-600">{imageMessage}</span>}
      </div>

      <h1 className="text-lg font-bold">{recipe.recipeName}</h1>

      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        ※ AIが提案したレシピです。分量や手順は目安としてご利用ください。
      </p>

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
        className="w-full rounded-xl p-3 font-bold text-white transition"
        style={{ background: favorite ? "#e11d48" : "var(--color-accent)" }}
        onClick={() => setFavorite(toggleFavorite(recipe))}
      >
        {favorite ? "♥ お気に入り済み（タップで解除）" : "♡ お気に入りに追加"}
      </button>

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
