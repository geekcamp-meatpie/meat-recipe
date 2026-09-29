"use client";
import React from 'react';
import Link from "next/link";

export default function FavoriteCard({ data }: { data: any }) {
  return (
  <div className="gap-4 p-1">    

        {/* レシピカード */}
        <div className="bg-white rounded-3xl w-full shadow-md overflow-hidden hover:shadow-xl transition duration-300 flex min-h-45 md:min-h-55">
          {/* 内容（左） */}
          <div className="p-3 sm:p-5 flex-1 min-w-0">
            {/* タイトル+ハート */}
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-xl font-bold">カルボナーラ</h2>

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

          {/* 画像（右） */}
          <img src="img/" alt="カルボナーラ" className="w-24 sm:w-40 shrink-0 object-cover"/>
        </div>
      </div>   

 
    );

}
