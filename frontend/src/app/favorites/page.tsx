"use client";
import axios from 'axios';
import { useEffect } from "react";

export default function FavoritesPage() {
  useEffect(() => { async () => { await axios.get("/api/favorites/list").then(response => {return response.data})};}, []);

  return (
    <div className="px-5 pt-6">
      <FavoritesList id={id} />
      <h1 className="text-lg font-bold mb-4">お気に入り</h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        お気に入りに保存したレシピがここに表示されます。
      </p>
    </div>
  );
}
