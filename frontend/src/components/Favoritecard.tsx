"use client";
import React from 'react';
import Link from "next/link";

export default function FavoriteCard({ data }: { data: any }) {
  return (
  <div className="gap-4 p-1">    

        {/* レシピカード */}
        <div className="bg-white rounded-3xl w-70 shadow-md overflow-hidden hover:shadow-xl transition duration-300">
          {/* 画像 */}
          <img src="img/" alt="カルボナーラ" className="w-70 h-52 object-cover"/>

          {/* 内容 */}
          <div className="p-5">
            {/* タイトル+ハート */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">カルボナーラ</h2>

              <button>
                <p className="text-red-500 fill-red-500 size={28}"></p>
              </button>
           </div>
            
            {/* 食材 */}
            <p className="text-gray-500 mt-3">
              ベーコン・卵・牛乳
            </p>

            {/* 調理時間 */}
            <div className="mt-4">
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                15分
              </span>
              <button className="heart">♡Favorites</button>
            </div>
          </div>
        </div>      
      </div>   

 
    );

}
