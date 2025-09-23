import React, { useState } from 'react';

const AuthModal = ({
  isOpen,
  authMode, // 'login' or 'register'
  authMessage,
  authError,
  onClose,
  onSubmit,
  onToggleMode,
  onGoogleSignIn
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSubmit(email, password);
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    onClose();
  };

  const handleToggleMode = () => {
    setEmail('');
    setPassword('');
    onToggleMode();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-purple-700 animate-fade-in-up">
        <h3 className="text-3xl font-bold text-purple-400 mb-4">
          {authMode === 'login' ? '登入帳戶' : '註冊新帳戶'}
        </h3>
        
        {authMessage && (
          <div className="bg-green-700 text-green-100 px-4 py-2 rounded-lg mb-4">
            {authMessage}
          </div>
        )}
        
        {authError && (
          <div className="bg-red-700 text-red-100 px-4 py-2 rounded-lg mb-4">
            {authError}
          </div>
        )}
        
        <input
          type="email"
          placeholder="電子郵件"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
        />
        
        <input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
        />
        
        <button
          onClick={handleSubmit}
          className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 text-lg mb-4"
        >
          {authMode === 'login' ? '登入' : '註冊'}
        </button>
        
        <div className="flex items-center justify-between my-4">
          <hr className="flex-grow border-gray-600" />
          <span className="px-3 text-gray-400 font-inter">或</span>
          <hr className="flex-grow border-gray-600" />
        </div>
        
        <button
          onClick={onGoogleSignIn}
          className="w-full py-3 px-6 rounded-lg font-bold text-white shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 text-lg font-inter bg-red-600 hover:bg-red-700 active:bg-red-800 flex items-center justify-center mb-4"
        >
          <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google logo" className="mr-3" />
          使用 Google {authMode === 'register' ? '註冊' : '登入'}
        </button>
        
        <button
          onClick={handleToggleMode}
          className="w-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-400 text-base mb-4"
        >
          {authMode === 'login' ? '沒有帳戶？註冊' : '已有帳戶？登入'}
        </button>
        
        <button
          onClick={handleClose}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-400 text-base"
        >
          關閉
        </button>
      </div>
    </div>
  );
};

export default AuthModal;