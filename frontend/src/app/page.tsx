"use client";
import { useState } from "react";
const ingredientData: Record<string, string[]> = {
  野菜: ["キャベツ", "きゅうり", "トマト", "玉ねぎ", "にんじん", "じゃがいも"],
  肉: ["牛肉", "豚肉", "鶏肉", "ひき肉", "ベーコン"],
  魚: ["鮭", "サバ", "マグロ", "アジ", "エビ"],
  きのこ: ["しめじ", "えのき", "しいたけ", "まいたけ"],
  乳製品: ["牛乳", "チーズ", "ヨーグルト", "バター"],
  豆類: ["豆腐", "納豆", "大豆", "枝豆"],
  その他: ["卵", "ご飯", "麺", "パン"],
};
import { useRouter } from "next/navigation";

const MAX_IMAGES = 3;

export default function HomePage() {
  const router = useRouter();
  const [ingredientText, setIngredientText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const toggleIngredient = (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(
        selectedIngredients.filter((item) => item !== ingredient)
      );
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
  };

  const handleSubmit = () => {
    if (!ingredientText.trim()) return;

    const params = new URLSearchParams({
      ingredients: ingredientText,
    });

    router.push(`/confirm?${params.toString()}`);
  };
  const handleFileslect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // 同じファイルを選び直しても onChange が発火するようにする
    if (picked.length === 0) return;
    const merged = [...images, ...picked];
    if (merged.length > MAX_IMAGES) {
      setImageError(`写真は最大${MAX_IMAGES}枚までです。`);
    } else {
      setImageError("");
    }
    setImages(merged.slice(0, MAX_IMAGES));
  };
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageError("");
  };
  const handleSubmitImage = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (images.length === 0) {
      setImageError("先に写真を選択または撮影してください。");
      return;
    }
    setImageError("");
    setAnalyzing(true);
    try {
      const formData = new FormData();
      images.forEach((file) => formData.append("files", file));
      const res = await fetch("/api/analyze-ingredients", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "画像の解析に失敗しました。");
      }
      const detected: { name: string; amount: string }[] = await res.json();
      if (detected.length === 0) {
        setImageError("食材を認識できませんでした。別の写真をお試しください。");
        return;
      }
      const text = detected
        .map((d) => (d.amount && d.amount !== "不明" ? `${d.name} ${d.amount}` : d.name))
        .join(", ");
      setIngredientText((prev) => (prev.trim() ? `${prev}, ${text}` : text));
      setShowTextInput(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "画像の解析に失敗しました。");
    } finally {
      setAnalyzing(false);
    }
  };
    return(
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
          おすすめレシピを探してみよう！
        </p>
      </div>

      {/* 入力方法セクション */}
      <div className="px-5 pt-6 overflow-x-hidden">
        <div className="text-base font-bold mb-3.5 md:text-center" style={{ color: "var(--color-text)" }}>
          食材の入力方法
        </div>
        <div className="mx-auto w-full max-w-xl flex flex-col gap-3 md:items-center">
          <div className="flex w-full flex-wrap items-center gap-2.5 md:justify-center">
            {/* 担当B: カメラ撮影機能をここに実装 */}
            <div
              className="relative flex items-center gap-2 h-10 shrink-0 rounded-2xl px-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "var(--color-card)" }}
            >
              <span
                className="w-8 h-8 rounded-[14px] flex items-center justify-center text-[20px]"
                style={{ background: "var(--color-icon-bg)" }}
              >
                📷
              </span>
              <span className="text-xs font-bold">撮影</span>
              <input
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileslect}
              />
            </div>

            {/* 担当B: アルバム選択機能をここに実装 */}
            <form className="flex min-w-0 flex-1 items-center gap-2 md:flex-none" suppressHydrationWarning>
              <span
                className="w-8 h-8 shrink-0 rounded-[14px] flex items-center justify-center text-[20px]"
                style={{ background: "var(--color-icon-bg)" }}
              >
                🖼️
              </span>
              <div
                className="relative rounded-2xl px-3 py-2 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "var(--color-card)" }}
              >
                ファイルを選択
                <input
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileslect}
                />
              </div>
            </form>

            <button
              className="h-10 shrink-0 rounded-2xl px-5 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "var(--color-card)" }}
              onClick={handleSubmitImage}
              disabled={analyzing}
            >
              {analyzing ? "解析中..." : "送信"}
            </button>
          </div>

          {images.length > 0 && (
            <div className="flex w-full flex-col gap-1">
              <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>
                選択中（{images.length}/{MAX_IMAGES}枚）
              </p>
              {images.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 text-xs"
                  style={{ color: "var(--color-text-sub)" }}
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="shrink-0 font-bold"
                    onClick={() => removeImage(i)}
                    aria-label={`${file.name}を削除`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageError && <p className="text-xs text-red-600">{imageError}</p>}

          <button
            className="flex w-full md:w-auto md:min-w-80 items-center justify-center gap-2 h-10 rounded-2xl px-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
            onClick={() => setShowTextInput(!showTextInput)}
          >
            <span
              className="w-8 h-8 rounded-[14px] flex items-center justify-center text-[20px]"
              style={{ background: "var(--color-icon-bg)" }}
            >
              ✏️
            </span>
            <span className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              テキストで入力する
            </span>
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

      {/* 食材選択 */}
      <div className="px-5 pt-6">
      {/* タイトル */}
      <div className="text-base font-bold mb-4 text-center">
        今日はどの食材を使いますか？
      </div>
      {/* 3×3 食材カテゴリー */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { name: "野菜", emoji: "🥦" },
          { name: "肉", emoji: "🥩" },
          { name: "魚", emoji: "🐟" },
          { name: "きのこ", emoji: "🍄" },
          { name: "乳製品", emoji: "🥛" },
          { name: "豆類", emoji: "🫘" },
        ].map((category) => (
      <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className={`h-28 rounded-xl border flex flex-col items-center justify-center transition ${
              selectedCategory === category.name
                ? "border-2 border-purple-500 bg-purple-100"
                : "border-gray-300 bg-white"
            }`}
      >
      <div className="text-2xl mb-2">
              {category.emoji}
      </div>
      <span className="text-sm font-bold">
              {category.name}
      </span>
      </button>
        ))}

      </div>
      </div>

    {/* 選択した食材 */}
  {selectedIngredients.length > 0 && (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between gap-4">

        {/* 選択した食材 */}
        <div className="flex-1">
          <div className="font-bold mb-3">
            選択した食材
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedIngredients.map((ingredient) => (
              <div
                key={ingredient}
                className="flex items-center gap-1 px-3 py-2 rounded-full bg-purple-100 text-purple-700"
              >
                <span>{ingredient}</span>

                {/* ×を押すと選択解除 */}
                <button
                  onClick={() => toggleIngredient(ingredient)}
                  className="font-bold ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

      {/* NEXTボタン */}
      <button
        onClick={() => {
          const params = new URLSearchParams({
            ingredients: selectedIngredients.join(","),
          });

          router.push(`/confirm?${params.toString()}`);
        }}
        className="shrink-0 px-5 py-3 rounded-xl font-bold transition hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: "var(--color-accent)",
          color: "white",
        }}
      >
        NEXT →
      </button>

    </div>

  </div>
)}

      {/* 具体的な食材選択 */}
      {selectedCategory && (
        <div className="mt-6">

          <div className="font-bold mb-3">
            {selectedCategory}を選択
          </div>

          <div className="flex flex-wrap gap-2">
            {ingredientData[selectedCategory]?.map((ingredient) => (
              <button
                key={ingredient}
                onClick={() => toggleIngredient(ingredient)}
                className={`px-4 py-2 rounded-full border transition ${
                  selectedIngredients.includes(ingredient)
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-white border-gray-300"
                }`}
              >
                {ingredient}
              </button>
            ))}
          </div>

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
              <span style={{ color: "#ccc" }}></span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
