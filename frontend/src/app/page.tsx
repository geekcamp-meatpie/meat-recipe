"use client";
import axios from "axios";
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

export default function HomePage() {
  const router = useRouter();
  const [ingredientText, setIngredientText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [image, setImage] = useState<File | null>(null);
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
  const handleFileslect = (e: React.ChangeEvent<HTMLInputElement>) => {setImage(e.target.files?.[0] || null);};
  const handleSubmitImage = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { 
         e.preventDefault();
        axios.post('http://127.0.0.1:8000/suggest-recipes', image, { headers: { 'Content-Type': 'multipart/form-data' } }).then(response => {const ingredients = response.data.ingredients})};
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
      <div className="px-5 pt-6">
        <div className="text-base font-bold mb-3.5" style={{ color: "var(--color-text)" }}>
          食材の入力方法
        </div>
        <div className="flex gap-2.5">
          
          {/* 担当B: カメラ撮影機能をここに実装 */}
          <button
           className="flex items-centr mt-2 w-30 h-10 rounded-2xl p-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}       >

            <div
              className="w-10 h-8 rounded-[14px] flex justify-left mb-3 text-[22px]"
              style={{ background: "var(--color-icon-bg)" }}
            >
              📷
            </div>
            <h3 className="text-xs pt-2 pl-5 font-bold mb-1">撮影</h3>
          </button>

          {/* 担当B: アルバム選択機能をここに実装 */}              
        <div className="text-base font-bold mb-3.5" style={{ color: "var(--color-text)" }}>
            <form>           
          <div className="w-8 h-8 rounded-[14px] flex items-center justify-center mx-auto mb-3 text-[22px]" style={{ background: "var(--color-icon-bg)" }}>
            🖼️ </div>
              <input
               type="file"
               accept="image/*"
               capture="environment"
               onChange={handleFileslect}
              />              
            </form>
          </div>
          
            {/* テキスト入力エリア */}            
             <button className="w-30 h-6 rounded-2xl text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "var(--color-card)" }}
              onClick={handleSubmitImage}>送信</button>
          </div>
           
          <button
            className="flex items-centr mt-4 w-130 h-10 rounded-2xl p-1 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--color-card)" }}
            onClick={() => setShowTextInput(!showTextInput)}
          >           
            <div
              className="w-8 h-8 rounded-[14px] mb-3 text-[22px]"
              style={{ background: "var(--color-icon-bg)" }}
            >
              ✏️
            </div>
            <p className="flex-1 pt-2 pl-5 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              テキストで入力する
            </p>
          </button>        
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
