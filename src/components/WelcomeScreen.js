import React from 'react';
import AuthModal from './AuthModal';

const WelcomeScreen = ({ 
  showWelcomeScreen, 
  error, 
  loadMessage, 
  isAuthReady, 
  showAuthModal, 
  setShowAuthModal, 
  authMode, 
  setAuthMode,
  handleStartAsGuest,
  handleAuthSubmit,
  userEmail,
  setUserEmail,
  userPassword,
  setUserPassword,
  authMessage,
  authError
}) => {
  if (!showWelcomeScreen) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <div className="w-full max-w-md bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 text-center border border-purple-700">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-300 mb-4 font-inter">
          歡迎來到互動式小說
        </h1>
        <p className="text-lg text-gray-300 mb-6">
          選擇您的旅程：
        </p>

        {error && (
          <div className="bg-red-800 text-red-200 px-4 py-3 rounded relative mb-4 border border-red-600" role="alert">
            <strong className="font-bold">錯誤!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        
        {loadMessage && (
          <div className="mb-4 p-3 rounded-lg text-center font-semibold bg-blue-700 text-blue-100">
            {loadMessage}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleStartAsGuest}
            className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-green-300 text-xl font-inter bg-green-600 hover:bg-green-700 text-white"
            disabled={!isAuthReady}
          >
            以訪客身份開始遊戲
          </button>
          <button
            onClick={() => {
              setShowAuthModal(true);
              setAuthMode('login');
            }}
            className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-purple-300 text-xl font-inter bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!isAuthReady}
          >
            登入現有帳戶
          </button>
          <button
            onClick={() => {
              setShowAuthModal(true);
              setAuthMode('register');
            }}
            className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-blue-300 text-xl font-inter bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!isAuthReady}
          >
            註冊新帳戶
          </button>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          showAuthModal={showAuthModal}
          setShowAuthModal={setShowAuthModal}
          authMode={authMode}
          setAuthMode={setAuthMode}
          handleAuthSubmit={handleAuthSubmit}
          userEmail={userEmail}
          setUserEmail={setUserEmail}
          userPassword={userPassword}
          setUserPassword={setUserPassword}
          authMessage={authMessage}
          authError={authError}
        />
      )}
    </div>
  );
};

export default WelcomeScreen;