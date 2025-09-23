import React from 'react';

const CharacterCreation = ({
  characterStats,
  allocatedPoints,
  remainingPoints,
  initialStatPoints,
  error,
  onStatChange,
  onConfirmStats
}) => {
  const stats = [
    { key: 'strength', name: '力量' },
    { key: 'intelligence', name: '智力' },
    { key: 'agility', name: '敏捷' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 text-center border border-purple-700">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-300 mb-4 font-inter">
          創建你的偵探
        </h1>
        
        <p className="text-lg text-gray-300 mb-6">
          你有 <span className="font-bold text-teal-400">{initialStatPoints}</span> 點可以分配。
          <br />
          剩餘點數: <span className="font-bold text-orange-400">{remainingPoints}</span>
        </p>

        {error && (
          <div className="bg-red-800 text-red-200 px-4 py-3 rounded relative mb-4 border border-red-600" role="alert">
            <strong className="font-bold">錯誤!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* 能力值分配區塊 */}
        {stats.map((stat) => {
          const currentValue = characterStats[stat.key] + allocatedPoints[stat.key];
          
          return (
            <div 
              key={stat.key} 
              className="flex items-center justify-between mb-4 bg-gray-700 p-3 rounded-lg shadow-sm"
            >
              <span className="text-xl font-semibold text-gray-100">
                {stat.name}: {currentValue}
              </span>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => onStatChange(stat.key, -1)}
                  disabled={allocatedPoints[stat.key] <= 0}
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  aria-label={`減少${stat.name}點數`}
                >
                  -
                </button>
                
                <button
                  onClick={() => onStatChange(stat.key, 1)}
                  disabled={remainingPoints <= 0}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  aria-label={`增加${stat.name}點數`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={onConfirmStats}
          disabled={remainingPoints !== 0}
          className={`
            mt-6 px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
            focus:outline-none focus:ring-4 focus:ring-green-300 text-xl font-inter w-full
            ${
              remainingPoints === 0
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70'
            }
          `}
        >
          開始故事
        </button>
      </div>
    </div>
  );
};

export default CharacterCreation;