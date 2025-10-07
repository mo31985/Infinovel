// src/components/LoadingScreen.js

import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
      <p className="ml-4 text-xl text-purple-200 font-semibold">正在載入介面...</p>
    </div>
  );
};

export default LoadingScreen;
