import React from 'react';

const GameControls = ({
  isLoadingText,
  showChoices,
  isSaving,
  isLoadingSave,
  auth,
  currentChapter,
  userProfile,
  currentSaveLimit,
  currentLoadLimit,
  userPathHistory,
  isPathHistoryVisible,
  setIsPathHistoryVisible,
  setShowRestartConfirm,
  currentChapter: chapter,
  choices,
  showProceedToChoicesButton,
  handleProceedToChoices,
  saveProgress,
  loadProgress
}) => {
  // 不在 AI 载入文本且选择未显示时显示控制按钮
  if (isLoadingText || showChoices) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mt-8 flex flex-col items-center sm:flex-row sm:justify-center gap-4">
      {/* 左侧：保存/载入/路径切换组（垂直堆叠） */}
      <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-xl shadow-xl border border-purple-700 w-full sm:w-auto sm:flex-shrink-0">
        <button
          onClick={() => saveProgress(false)} // 手动保存
          disabled={isSaving || isLoadingSave || !auth || !auth.currentUser || !currentChapter || userProfile.saveCount >= currentSaveLimit}
          className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                    focus:outline-none focus:ring-4 focus:ring-green-400 text-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '正在保存...' : `保存進度 (${userProfile.saveCount}/${currentSaveLimit})`}
        </button>
        
        <button
          onClick={() => loadProgress(true)}
          disabled={isLoadingSave || isSaving || !auth || !auth.currentUser || userProfile.loadCount >= currentLoadLimit}
          className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                    focus:outline-none focus:ring-4 focus:ring-teal-400 text-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingSave ? '正在载入...' : `载入進度 (${userProfile.loadCount}/${currentLoadLimit})`}
        </button>
        
        {userPathHistory.length > 0 && (
          <button
            onClick={() => setIsPathHistoryVisible(prev => !prev)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                      focus:outline-none focus:ring-4 focus:ring-blue-400 text-lg font-inter"
          >
            {isPathHistoryVisible ? '隱藏故事軌跡' : '查看故事軌跡'}
          </button>
        )}
        
        <button
          onClick={() => setShowRestartConfirm(true)}
          disabled={!auth || !auth.currentUser || isLoadingSave || isSaving}
          className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                    focus:outline-none focus:ring-4 focus:ring-red-400 text-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          重新開始遊戲
        </button>
      </div>

      {/* 右侧：「继续阅读并做出选择」按钮 */}
      {chapter && chapter.choices.length > 0 && showProceedToChoicesButton && (
        <div className="flex justify-center items-center w-full sm:w-auto sm:flex-shrink-0">
          <button
            onClick={handleProceedToChoices}
            className="h-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-purple-400 text-xl font-inter w-full max-w-sm mx-auto"
          >
            繼續閱讀並做出選擇
          </button>
        </div>
      )}
    </div>
  );
};

export default GameControls;