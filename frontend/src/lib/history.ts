import { withoutDataUrlImage, type FavoriteRecipe } from "@/lib/favorites";

export type HistoryRecipe = FavoriteRecipe;

const KEY = "recipeHistory";
const MAX = 50;

export function getHistory(): HistoryRecipe[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 先頭に追加する。同名レシピは重複させず最新の閲覧として先頭へ移動し、最大MAX件まで保持 */
export function addHistory(recipe: HistoryRecipe): void {
  const next = [withoutDataUrlImage(recipe), ...getHistory().filter((r) => r.recipeName !== recipe.recipeName)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても画面は動かす
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
}
