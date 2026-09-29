import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // スマホ等からLAN内のIPで開発サーバーに繋ぐ場合、許可しないとJSが読み込まれずボタンが動かない
  allowedDevOrigins: ["192.168.*.*"],
  // スマホからはポート3000だけで済むよう、/api をバックエンドへ中継する（ファイアウォールやCORSの設定が不要になる）
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }];
  },
};

export default nextConfig;
