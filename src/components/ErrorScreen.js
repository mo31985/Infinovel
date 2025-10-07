// src/components/ErrorScreen.js

import React from 'react';

const ErrorScreen = ({ error }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-red-900 p-6 rounded-lg max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-200 mb-4">發生錯誤</h2>
        <p className="text-red-300 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition-colors"
        >
          重新載入
        </button>
      </div>
    </div>
  );
};

export default ErrorScreen;
