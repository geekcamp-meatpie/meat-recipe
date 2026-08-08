"use client";
import axios from 'axios';
import { useEffect } from "react";
import  FavoriteCard from '../../components/FavoriteCard';
export default function FavoritesPage() {
  const getFavoritesList = () => {useEffect(() => {async () => { await axios.get("/api/favorites/list").then(response => {return response.data})};}, [])};

  return (
    <div className="px-5 pt-6">
       {/* タイトル */}
      <h1 className="text-3xl font-bold text-center mb-8">♡お気に入りレシピ♡</h1>
      <div className="gap-4 flex justify-center"><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /><FavoriteCard data={getFavoritesList} /></div>
     
      {/* レシピ一覧 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6"></div>

           <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        お気に入りに保存したレシピがここに表示されます。
      </p>
     
    </div>
  );
}
