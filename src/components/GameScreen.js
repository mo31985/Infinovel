// src/components/GameScreen.js

import React from 'react';

const GameScreen = ({
  userId,
  currentChapter,
  isLoadingText,
  showChoices,
  handleChoice,
  characterStats,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Infinovel
          </h1>
          {userId && (
            <div className="text-sm text-gray-500 mt-2 tracking-wider">
              ID: {userId}
            </div>
          )}
        </header>

        {/* 故事內容 */}
        {currentChapter && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">
              {currentChapter.title}
            </h2>
            <div className="space-y-4">
              {currentChapter.content.map((paragraph, index) => (
                <p key={index} className="text-gray-200 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* AI 生成中的提示 */}
        {isLoadingText && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-purple-300">AI 正在生成下一章節...</p>
          </div>
        )}

        {/* 選擇按鈕 */}
        {showChoices && currentChapter && currentChapter.choices && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">選擇你的行動：</h3>
            {currentChapter.choices.map((choice, index) => (
              <button
                key={choice.choiceId}
                onClick={() => handleChoice(choice.text, choice.choiceId)}
                disabled={isLoadingText}
                className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <span className="text-purple-300 font-semibold mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="text-gray-200">{choice.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* 角色狀態 */}
        {characterStats && (
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">角色能力</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-red-400 font-semibold">力量</div>
                        <div className="text-2xl text-red-300">{characterStats.strength}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-blue-400 font-semibold">智力</div>
                        <div className="text-2xl text-blue-300">{characterStats.intelligence}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-green-400 font-semibold">敏捷</div>
                        <div className="text-2xl text-green-300">{characterStats.agility}</div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
