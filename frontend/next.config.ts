import type { NextConfig } from "next";

// 末尾の「/」は取り除く（「https://example.com/」と書かれても「//api」にならないように）
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // スマホ等からLAN内のIPで開発サーバーに繋ぐ場合、許可しないとJSが読み込まれずボタンが動かない
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // スマホからはポート3000だけで済むよう、/api をバックエンドへ中継する（ファイアウォールやCORSの設定が不要になる）
  // 中継先は環境変数 BACKEND_URL（デプロイ時はバックエンドのURL）。未設定なら手元のバックエンド。
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
