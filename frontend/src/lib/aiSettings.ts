// AIのAPIキー・プロバイダ・服用中の薬は、この端末のブラウザ（localStorage）にだけ保存する。
// サーバーには保存せず、AIを使うAPIを呼ぶたびにヘッダー（キー・プロバイダ）やリクエスト本文（薬）で送る。

export type AiProvider = "gemini" | "claude";

export interface AiSettings {
  apiKey: string;
  provider: AiProvider;
  medicines: string[];
}

const KEY = "aiSettings";

const DEFAULTS: AiSettings = { apiKey: "", provider: "gemini", medicines: [] };

export function getAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const data = JSON.parse(raw);
    return {
      apiKey: typeof data.apiKey === "string" ? data.apiKey : "",
      provider: data.provider === "claude" ? "claude" : "gemini",
      medicines: Array.isArray(data.medicines) ? data.medicines.filter((m: unknown) => typeof m === "string") : [],
    };
  } catch {
    return DEFAULTS;
  }
}

/** 保存する。保存できなかった（不正なキー・ブラウザの保存領域が使えない）ときは、画面に出せる文言のErrorを投げる */
export function saveAiSettings(settings: AiSettings): void {
  const apiKey = settings.apiKey.trim();
  // HTTPヘッダーに載せられるのは半角の英数字と記号だけ。全角文字などが混ざったキーは送れない
  if (apiKey && !/^[\x21-\x7E]+$/.test(apiKey)) {
    throw new Error("APIキーに使えない文字が含まれています。コピーし直してください。");
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...settings, apiKey }));
  } catch {
    throw new Error("この端末のブラウザに保存できませんでした。");
  }
}

/** AIを使うAPIに付けるヘッダー。キー未設定のときはキーのヘッダーを付けない（サーバーが400で設定を促す） */
export function aiHeaders(): Record<string, string> {
  const { apiKey, provider } = getAiSettings();
  return apiKey ? { "X-AI-API-Key": apiKey, "X-AI-Provider": provider } : { "X-AI-Provider": provider };
}
