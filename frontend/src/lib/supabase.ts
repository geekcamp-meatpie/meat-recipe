import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * ブラウザ用のSupabaseクライアント。
 * 環境変数が未設定のときは null を返し、ログイン機能だけが使えない状態にする
 * （ログインは任意機能なので、未設定でもアプリ自体は動かす）。
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { flowType: "pkce" } }) : null;
