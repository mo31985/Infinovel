// src/components/GameControls.js

import React from 'react';

const GameControls = ({ 
  saveGameData, 
  // handleLoadGame, // 未来可以传入读档函式
  saveCount, 
  maxSaveLimit,
  loadCount,
  maxLoadLimit
}) => {
  const isSaveDisabled = saveCount >= maxSaveLimit;
  const isLoadDisabled = loadCount >= maxLoadLimit;

  return (
    <div className="mt-8 flex justify-center space-x-4">
      <button 
        onClick={saveGameData}
        disabled={isSaveDisabled}
        className={`px-6 py-2 font-semibold rounded-lg shadow-md transition-all duration-200 
          ${isSaveDisabled 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
      >
        保存進度 ({saveCount}/{maxSaveLimit})
      </button>
      
      <button 
        // onClick={handleLoadGame}
        disabled={isLoadDisabled}
        className={`px-6 py-2 font-semibold rounded-lg shadow-md transition-all duration-200
          ${isLoadDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
      >
        载入進度 ({loadCount}/{maxLoadLimit})
      </button>
    </div>
  );
};

export default GameControls;
