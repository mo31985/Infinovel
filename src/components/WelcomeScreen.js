// src/components/WelcomeScreen.js

import React from 'react';

const WelcomeScreen = ({ handleStartAsGuest }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 shadow-xl rounded-xl p-8 text-center border border-purple-700">
        <h1 className="text-4xl font-extrabold text-purple-300 mb-4">
          互動式小說
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          你的每個選擇，都將塑造獨一無二的故事。
        </p>

        <div className="space-y-4">
          <button
            onClick={handleStartAsGuest}
            className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-green-300 text-xl bg-green-600 hover:bg-green-700 text-white"
          >
            以訪客身份開始
          </button>
          
          {/* 未來你可以把登入/註冊按鈕加回來 */}
          <p className="text-sm text-gray-500 pt-4">
            註冊或登入以保存您的跨裝置遊戲進度。
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
