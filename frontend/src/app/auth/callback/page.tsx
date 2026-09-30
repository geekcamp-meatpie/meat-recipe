"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Google認証から戻ってくるページ。supabase-js が URL の認可コードをセッションに交換するのを待ち、設定画面へ戻す
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      router.replace("/settings");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error_description") || params.get("error");
    if (authError) {
      setError(authError);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      router.replace("/settings");
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish();
    });
    // すでに交換が終わっている場合に備えて、現在のセッションも確認する
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });
    const timer = setTimeout(() => {
      if (!done) setError("ログインを完了できませんでした。もう一度お試しください。");
    }, 10000);
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [router]);

  if (error) {
    return (
      <div className="px-5 pt-10 space-y-4 text-center">
        <p className="text-red-500 font-semibold text-sm">{error}</p>
        <button
          className="rounded-xl px-6 py-2 font-bold text-white"
          style={{ background: "var(--color-accent)" }}
          onClick={() => router.replace("/settings")}
        >
          設定画面へ戻る
        </button>
      </div>
    );
  }

  return <div className="text-center py-16 text-sm">ログイン中...</div>;
}
