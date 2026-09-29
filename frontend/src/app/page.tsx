"use client";

import axios from "axios";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ingredientData: Record<string, string[]> = {
  野菜: ["キャベツ", "きゅうり", "トマト", "玉ねぎ", "にんじん", "じゃがいも"],
  肉: ["牛肉", "豚肉", "鶏肉", "ひき肉", "ベーコン"],
  魚: ["鮭", "サバ", "マグロ", "アジ", "エビ"],
  きのこ: ["しめじ", "えのき", "しいたけ", "まいたけ"],
  乳製品: ["牛乳", "チーズ", "ヨーグルト", "バター"],
  豆類: ["豆腐", "納豆", "大豆", "枝豆"],
  その他: ["卵", "ご飯", "麺", "パン"],
};

export default function HomePage() {
  const router = useRouter();

  // -------------------------
  // 状態管理
  // -------------------------

  const [ingredientText, setIngredientText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  const [image, setImage] = useState<File | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("");

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // カメラ用
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // アルバム用
  const albumInputRef = useRef<HTMLInputElement>(null);


  // -------------------------
  // 食材の追加・削除
  // -------------------------

  const toggleIngredient = (ingredient: string) => {
    setSelectedIngredients((prev) => {
      if (prev.includes(ingredient)) {
        return prev.filter((item) => item !== ingredient);
      }

      return [...prev, ingredient];
    });
  };


  // -------------------------
  // カメラで撮影
  // -------------------------

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };


  // -------------------------
  // アルバムから画像選択
  // -------------------------

  const handleAlbumClick = () => {
    albumInputRef.current?.click();
  };


  // -------------------------
  // 画像が選択されたとき
  // -------------------------

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);

    // 同じ画像を再度選択できるようにする
    e.target.value = "";
  };


  // -------------------------
  // AIに画像を送信
  // -------------------------

  const handleSubmitImage = async () => {
    if (!image) {
      alert("画像を選択してください");
      return;
    }

    try {
      setIsAnalyzing(true);

      const formData = new FormData();

      formData.append("image", image);

      const response = await axios.post(
        "http://127.0.0.1:8000/suggest-recipes",
        formData
      );

      // バックエンドから返ってくる食材
      const ingredients: string[] = response.data.ingredients;

      // AIが認識した食材を追加
      setSelectedIngredients((prev) => {
        const newIngredients = ingredients.filter(
          (ingredient) => !prev.includes(ingredient)
        );

        return [...prev, ...newIngredients];
      });

      // 画像をリセット
      setImage(null);

    } catch (error) {
      console.error(error);
      alert("画像の解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  };


  // -------------------------
  // テキストから食材を追加
  // -------------------------

  const handleAddTextIngredient = () => {
    if (!ingredientText.trim()) return;

    // 「鶏肉, 玉ねぎ, じゃがいも」
    // 「鶏肉、玉ねぎ、じゃがいも」
    // の両方に対応
    const ingredients = ingredientText
      .split(/[,、\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setSelectedIngredients((prev) => {
      const newIngredients = ingredients.filter(
        (ingredient) => !prev.includes(ingredient)
      );

      return [...prev, ...newIngredients];
    });

    setIngredientText("");
  };


  // -------------------------
  // NEXT
  // -------------------------

  const handleNext = () => {
    if (selectedIngredients.length === 0) return;

    const params = new URLSearchParams({
      ingredients: selectedIngredients.join(","),
    });

    router.push(`/confirm?${params.toString()}`);
  };


  return (
    <>

      {/* =========================
          ヒーロー
      ========================= */}

      <div
        className="px-6 pt-7 pb-8"
        style={{
          background:
            "linear-gradient(135deg, var(--color-hero-start) 0%, var(--color-hero-end) 100%)",
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

        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-sub)" }}
        >
          食材の写真を撮るか、テキストで入力して
          <br />
          おすすめレシピを探してみよう！
        </p>
      </div>


      {/* =========================
          入力方法
      ========================= */}

      <div className="px-5 pt-6">

        <div
          className="text-base font-bold mb-3.5"
          style={{ color: "var(--color-text)" }}
        >
          食材の入力方法
        </div>


        {/* ボタン3つ */}

        <div className="grid grid-cols-2 gap-3">

          {/* カメラ */}

          <button
            type="button"
            onClick={handleCameraClick}
            className="h-24 rounded-2xl p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
          >
            <div className="text-3xl mb-1">
              📷
            </div>

            <div className="text-sm font-bold">
              撮影
            </div>
          </button>


          {/* アルバム */}

          <button
            type="button"
            onClick={handleAlbumClick}
            className="h-24 rounded-2xl p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
          >
            <div className="text-3xl mb-1">
              🖼️
            </div>

            <div className="text-sm font-bold">
              アルバム
            </div>
          </button>

        </div>


        {/* =========================
            非表示のファイル入力
        ========================= */}

        {/* カメラ */}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />


        {/* アルバム */}

        <input
          ref={albumInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />


        {/* =========================
            選択した画像
        ========================= */}

        {image && (
          <div className="mt-4">

            <div className="text-sm font-bold mb-2">
              選択した画像
            </div>

            <div className="flex items-center gap-3">

              <img
                src={URL.createObjectURL(image)}
                alt="選択した食材"
                className="w-20 h-20 rounded-xl object-cover"
              />

              <button
                type="button"
                onClick={handleSubmitImage}
                disabled={isAnalyzing}
                className="flex-1 rounded-xl p-3 font-bold text-white disabled:opacity-50"
                style={{
                  background: "var(--color-accent)",
                }}
              >
                {isAnalyzing
                  ? "AIが食材を確認中..."
                  : "AIで食材を確認する"}
              </button>

            </div>

          </div>
        )}


        {/* =========================
            テキスト入力
        ========================= */}

        <button
          type="button"
          className="flex items-center mt-4 w-full h-12 rounded-2xl p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ background: "var(--color-card)" }}
          onClick={() => setShowTextInput(!showTextInput)}
        >

          <div
            className="w-8 h-8 rounded-[14px] flex items-center justify-center text-[22px]"
            style={{ background: "var(--color-icon-bg)" }}
          >
            ✏️
          </div>

          <p
            className="flex-1 text-left pl-4 text-[13px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            テキストで食材を追加する
          </p>

        </button>


        {/* テキスト入力 */}

        {showTextInput && (
          <div className="pt-4 space-y-3">

            <textarea
              className="w-full rounded-2xl p-4 h-28 resize-none text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-card)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
              }}
              placeholder="例：鶏もも肉、玉ねぎ、じゃがいも"
              value={ingredientText}
              onChange={(e) => setIngredientText(e.target.value)}
            />

            <button
              type="button"
              onClick={handleAddTextIngredient}
              disabled={!ingredientText.trim()}
              className="w-full rounded-xl p-3 font-bold text-white transition disabled:opacity-50"
              style={{
                background: "var(--color-accent)",
              }}
            >
              食材を追加する
            </button>

          </div>
        )}

      </div>


      {/* =========================
          選択した食材
      ========================= */}

      {selectedIngredients.length > 0 && (
        <div className="px-5 pt-6">

          <div className="flex items-center justify-between gap-4">

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

                    <span>
                      {ingredient}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleIngredient(ingredient)}
                      className="font-bold ml-1"
                    >
                      ×
                    </button>

                  </div>

                ))}

              </div>

            </div>


            {/* NEXT */}

            <button
              type="button"
              onClick={handleNext}
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


      {/* =========================
          カテゴリー選択
      ========================= */}

      <div className="px-5 pt-6">

        <div className="text-base font-bold mb-4 text-center">
          今日はどの食材を使いますか？
        </div>


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
              type="button"
              key={category.name}
              onClick={() =>
                setSelectedCategory(category.name)
              }
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


      {/* =========================
          具体的な食材
      ========================= */}

      {selectedCategory && (

        <div className="px-5 mt-6">

          <div className="font-bold mb-3">
            {selectedCategory}を選択
          </div>

          <div className="flex flex-wrap gap-2">

            {ingredientData[selectedCategory]?.map(
              (ingredient) => (

                <button
                  type="button"
                  key={ingredient}
                  onClick={() =>
                    toggleIngredient(ingredient)
                  }
                  className={`px-4 py-2 rounded-full border transition ${
                    selectedIngredients.includes(ingredient)
                      ? "bg-purple-500 text-white border-purple-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {ingredient}
                </button>

              )
            )}

          </div>

        </div>

      )}


      {/* =========================
          お気に入りレシピ
      ========================= */}

      <div className="px-5 pt-6 pb-10">

        <div className="flex items-center justify-between mb-3.5">

          <span className="text-base font-bold">
            お気に入りレシピ
          </span>

          <span
            className="text-xs font-semibold cursor-pointer"
            style={{ color: "var(--color-accent)" }}
          >
            すべて見る ›
          </span>

        </div>


        <div className="space-y-2.5">

          {[
            {
              emoji: "🥩",
              name: "牛肉の赤ワイン煮込み",
              time: 60,
              stars: "★★★",
            },
            {
              emoji: "🥓",
              name: "サーロインステーキ",
              time: 20,
              stars: "★★☆",
            },
            {
              emoji: "🍗",
              name: "鶏もも肉のグリル",
              time: 30,
              stars: "★☆☆",
            },
          ].map((item, i) => (

            <div
              key={i}
              className="flex items-center gap-3.5 rounded-2xl p-3.5 cursor-pointer transition hover:shadow-md"
              style={{
                background: "var(--color-card)",
                boxShadow:
                  "0 1px 6px rgba(0,0,0,0.06)",
              }}
            >

              <div
                className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[26px] shrink-0"
                style={{
                  background:
                    "var(--color-hero-start)",
                }}
              >
                {item.emoji}
              </div>

              <div className="flex-1">

                <h3 className="text-sm font-bold mb-1">
                  {item.name}
                </h3>

                <p
                  className="text-[11px]"
                  style={{
                    color: "var(--color-text-muted)",
                  }}
                >
                  調理時間: {item.time}分 ・ 難易度:{" "}
                  {item.stars}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </>
  );
}