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
}

const KEY = "favoriteRecipes";

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
