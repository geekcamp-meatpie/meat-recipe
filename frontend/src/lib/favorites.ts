import { supabase } from "@/lib/supabase";

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
  /** ユーザーが写真フォルダから選んだ画像（縮小済みdata URL）。生成画像より優先して表示する。端末内のみに保存する */
  userImageUrl?: string;
}

// お気に入りの保存先:
//  ログイン中 → Supabase（user_recipes / favorites。別の端末でも同じお気に入りが見える）
//  未ログイン → この端末の localStorage
// ユーザーが選んだ写真は容量が大きいため、どちらの場合も localStorage の別領域（レシピ名ごと）にだけ保存する。
const LOCAL_KEY = "favoriteRecipes";
const PHOTO_KEY = "favoriteUserImages";
const MIGRATED_PREFIX = "favoritesMigrated:";

/** 表示に使う画像。ユーザーが選んだ写真があればそれを優先する */
export function displayImage(recipe: { imageUrl?: string; userImageUrl?: string }): string | undefined {
  return recipe.userImageUrl ?? recipe.imageUrl;
}

/** localStorageに入れる前に、容量の大きいdata URL（Storage未設定時のフォールバック画像）を取り除く */
export function withoutDataUrlImage<T extends { imageUrl?: string }>(recipe: T): T {
  return recipe.imageUrl?.startsWith("data:") ? { ...recipe, imageUrl: undefined } : recipe;
}

// ---- ユーザーが選んだ写真（端末内） ----

function readPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PHOTO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** お気に入りのレシピに写真を付ける（外すときは undefined）。保存できたらtrue */
export function setFavoriteUserImage(recipeName: string, userImageUrl: string | undefined): boolean {
  const photos = readPhotos();
  if (userImageUrl) photos[recipeName] = userImageUrl;
  else delete photos[recipeName];
  try {
    localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
    return true;
  } catch {
    return false;
  }
}

function withPhoto(recipe: FavoriteRecipe, photos: Record<string, string>): FavoriteRecipe {
  // 以前の版でレシピ本体に入れていた写真（userImageUrl）も引き続き表示する
  const userImageUrl = photos[recipe.recipeName] ?? recipe.userImageUrl;
  return userImageUrl ? { ...recipe, userImageUrl } : recipe;
}

// ---- localStorage（未ログイン） ----

function readLocal(): FavoriteRecipe[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: FavoriteRecipe[]): boolean {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** 追加または解除し、操作後にお気に入りかどうかを返す。保存できなかったときは元の状態を返す */
function toggleLocal(recipe: FavoriteRecipe): boolean {
  const list = readLocal();
  const exists = list.some((r) => r.recipeName === recipe.recipeName);
  const { userImageUrl, ...body } = withoutDataUrlImage(recipe);
  void userImageUrl; // 写真は別領域に保存する
  const next = exists ? list.filter((r) => r.recipeName !== recipe.recipeName) : [body, ...list];
  return writeLocal(next) ? !exists : exists;
}

// ---- Supabase（ログイン中） ----

interface RecipeRow {
  recipe_name: string;
  cooking_time: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  point: string | null;
  image_url: string | null;
}

const RECIPE_COLUMNS = "recipe_name, cooking_time, difficulty, ingredients, steps, point, image_url";

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function toInsertRow(ownerId: string, r: FavoriteRecipe) {
  return {
    owner_id: ownerId,
    recipe_name: r.recipeName,
    cooking_time: r.cookingTime,
    difficulty: r.difficulty,
    ingredients: r.ingredients,
    steps: r.steps,
    point: r.point ?? null,
    // DBの制約に合わせ、https の公開URLだけ保存する（data URL は入れない）。warnings は健康情報なので保存しない
    image_url: r.imageUrl?.startsWith("https://") ? r.imageUrl : null,
  };
}

function fromRow(row: RecipeRow): FavoriteRecipe {
  return {
    recipeName: row.recipe_name,
    cookingTime: row.cooking_time,
    difficulty: row.difficulty,
    ingredients: row.ingredients,
    steps: row.steps,
    point: row.point ?? "",
    imageUrl: row.image_url ?? undefined,
  };
}

function fail(error: { message: string }): never {
  throw new Error(`お気に入りの通信に失敗しました: ${error.message}`);
}

async function saveToServer(uid: string, recipes: FavoriteRecipe[]): Promise<void> {
  if (!supabase || recipes.length === 0) return;
  const saved = await supabase
    .from("user_recipes")
    .upsert(recipes.map((r) => toInsertRow(uid, r)), { onConflict: "owner_id,recipe_name" })
    .select("id");
  if (saved.error) fail(saved.error);
  const links = await supabase
    .from("favorites")
    .upsert(
      (saved.data ?? []).map((row: { id: string }) => ({ user_id: uid, recipe_id: row.id })),
      { onConflict: "user_id,recipe_id", ignoreDuplicates: true }
    );
  if (links.error) fail(links.error);
}

// 初回ログイン時に、この端末のお気に入りをサーバーへ取り込む（ユーザーごとに1回だけ。端末側のデータは残す）
const migrations = new Map<string, Promise<void>>();

function ensureMigrated(uid: string): Promise<void> {
  const running = migrations.get(uid);
  if (running) return running;
  const task = (async () => {
    const flag = MIGRATED_PREFIX + uid;
    try {
      if (localStorage.getItem(flag)) return;
    } catch {
      return;
    }
    await saveToServer(uid, readLocal());
    try {
      localStorage.setItem(flag, "1");
    } catch {
      // フラグを保存できなくても、取り込みは重複しない（upsert）ので続行する
    }
  })().catch((e) => {
    migrations.delete(uid); // 失敗したときは次回やり直せるようにする
    throw e;
  });
  migrations.set(uid, task);
  return task;
}

async function getServer(uid: string): Promise<FavoriteRecipe[]> {
  if (!supabase) return [];
  await ensureMigrated(uid);
  const { data, error } = await supabase
    .from("favorites")
    .select(`created_at, user_recipes(${RECIPE_COLUMNS})`)
    .order("created_at", { ascending: false });
  if (error) fail(error);
  const rows = (data ?? []) as unknown as { user_recipes: RecipeRow | null }[];
  return rows.flatMap((row) => (row.user_recipes ? [fromRow(row.user_recipes)] : []));
}

async function isFavoriteServer(uid: string, recipeName: string): Promise<boolean> {
  if (!supabase) return false;
  await ensureMigrated(uid);
  const { data, error } = await supabase
    .from("favorites")
    .select("recipe_id, user_recipes!inner(recipe_name)")
    .eq("user_id", uid)
    .eq("user_recipes.recipe_name", recipeName)
    .limit(1);
  if (error) fail(error);
  return (data ?? []).length > 0;
}

async function toggleServer(uid: string, recipe: FavoriteRecipe): Promise<boolean> {
  if (!supabase) return false;
  await ensureMigrated(uid);

  const existing = await supabase
    .from("user_recipes")
    .select("id")
    .eq("owner_id", uid)
    .eq("recipe_name", recipe.recipeName)
    .maybeSingle();
  if (existing.error) fail(existing.error);

  if (existing.data) {
    const recipeId: string = existing.data.id;
    const link = await supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", uid)
      .eq("recipe_id", recipeId)
      .maybeSingle();
    if (link.error) fail(link.error);
    if (link.data) {
      // 解除: お気に入りの行を消し、公開していない自分のレシピ本体も消す
      const removed = await supabase.from("favorites").delete().eq("user_id", uid).eq("recipe_id", recipeId);
      if (removed.error) fail(removed.error);
      const cleaned = await supabase.from("user_recipes").delete().eq("id", recipeId).eq("is_public", false);
      if (cleaned.error) fail(cleaned.error);
      return false;
    }
  }

  await saveToServer(uid, [recipe]);
  return true;
}

// ---- 公開API（ログイン状態に応じて保存先を切り替える） ----

export async function getFavorites(): Promise<FavoriteRecipe[]> {
  const uid = await currentUserId();
  const list = uid ? await getServer(uid) : readLocal();
  const photos = readPhotos();
  return list.map((r) => withPhoto(r, photos));
}

export async function isFavorite(recipeName: string): Promise<boolean> {
  const uid = await currentUserId();
  return uid ? isFavoriteServer(uid, recipeName) : readLocal().some((r) => r.recipeName === recipeName);
}

/** 追加または解除し、操作後にお気に入りかどうかを返す。通信に失敗したときは例外を投げる */
export async function toggleFavorite(recipe: FavoriteRecipe): Promise<boolean> {
  const uid = await currentUserId();
  const nowFavorite = uid ? await toggleServer(uid, recipe) : toggleLocal(recipe);
  // 写真は端末内に持つ。追加時は選んだ写真を保存し、解除時は消す
  if (nowFavorite) {
    if (recipe.userImageUrl) setFavoriteUserImage(recipe.recipeName, recipe.userImageUrl);
  } else {
    setFavoriteUserImage(recipe.recipeName, undefined);
  }
  return nowFavorite;
}
