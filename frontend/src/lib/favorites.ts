export interface FavoriteRecipe {
  recipeName: string;
  cookingTime: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  point: string;
  warnings?: { warningIngredient: string; warningReason: string }[];
  /** 料理イメージ画像のURL（/api/generate-recipe-image の結果） */
  imageUrl?: string;
  /** ユーザーが写真フォルダから選んだ画像（縮小済みdata URL）。生成画像より優先して表示する */
  userImageUrl?: string;
}

const KEY = "favoriteRecipes";

/** 表示に使う画像。ユーザーが選んだ写真があればそれを優先する */
export function displayImage(recipe: { imageUrl?: string; userImageUrl?: string }): string | undefined {
  return recipe.userImageUrl ?? recipe.imageUrl;
}

/** お気に入り済みのレシピに、ユーザーが選んだ写真を付ける（外すときは undefined）。保存できたらtrue */
export function setFavoriteUserImage(recipeName: string, userImageUrl: string | undefined): boolean {
  const list = getFavorites();
  if (!list.some((r) => r.recipeName === recipeName)) return true;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(list.map((r) => (r.recipeName === recipeName ? { ...r, userImageUrl } : r)))
    );
    return true;
  } catch {
    return false;
  }
}

/** localStorageに入れる前に、容量の大きいdata URL（Storage未設定時のフォールバック画像）を取り除く */
export function withoutDataUrlImage<T extends { imageUrl?: string }>(recipe: T): T {
  return recipe.imageUrl?.startsWith("data:") ? { ...recipe, imageUrl: undefined } : recipe;
}

export function getFavorites(): FavoriteRecipe[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(recipeName: string): boolean {
  return getFavorites().some((r) => r.recipeName === recipeName);
}

/** 追加または解除し、操作後にお気に入りかどうかを返す */
export function toggleFavorite(recipe: FavoriteRecipe): boolean {
  const list = getFavorites();
  const exists = list.some((r) => r.recipeName === recipe.recipeName);
  const next = exists ? list.filter((r) => r.recipeName !== recipe.recipeName) : [withoutDataUrlImage(recipe), ...list];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return exists;
  }
  return !exists;
}
