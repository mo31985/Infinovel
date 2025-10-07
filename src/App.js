import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, collection } from 'firebase/firestore';
import { StateContext } from './context/state';
import { useStoryGenerator } from './hooks/useStoryGenerator';

// 配置常量
const DEFAULT_LOAD_LIMIT = 5;
const DEFAULT_SAVE_LIMIT = 3;
const VIP_LOAD_LIMIT = 20;
const VIP_SAVE_LIMIT = 10;
const INITIAL_STAT_POINTS = 10;

// Firebase 配置 - 使用環境變數（安全）
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// 初始故事內容
const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  content: [
    '在維多利亞時代的倫敦，蒸汽機的轟鳴聲與古老魔法的低語交織。這個城市既是科技的巔峰，也是神秘事件的溫床。艾倫偵探，一位以敏銳洞察力和對超自然現象的獨特理解而聞名的私家偵探，此時正坐在他那間瀰漫著煙草味的辦公室裡。',
    '窗外，倫敦特區永不散去的蒸汽迷霧像一條巨龍般盤踞，吞噬著光線與聲音。一封緊急電報打破了清晨的寧靜，電報來自泰晤士河畔的皇家科學院，內容簡潔而令人不安：著名發明家維克多·格雷森博士離奇失蹤了。',
    '艾倫抵達格雷森博士的實驗室，那裡一片狼藉，精密齒輪和扭曲的電線散落一地，空氣中瀰漫著臭氧和燒焦金屬的氣味。在凌亂的書桌上，艾倫的目光被一張紙條吸引。上面潦草地寫著：「時鐘塔，午夜，等待。」'
  ],
  choices: [
    { text: '立即前往時鐘塔，看看午夜有什麼在等待。', choiceId: 'to_clock_tower' },
    { text: '先仔細調查格雷森博士的實驗室，尋找更多隱藏線索。', choiceId: 'investigate_lab_thoroughly' },
    { text: '回到辦公室，研究格雷森博士的背景資料。', choiceId: 'research_grayson_background' }
  ],
  isTimedChoice: false,
  timeLimit: 0
};

function App() {
  const { state, dispatch } = useContext(StateContext);
  const {
    showWelcomeScreen,
    currentChapter,
    loading,
    error,
    userId,
    characterStats,
    isLoadingText,
    showChoices
  } = state;

  // 本地狀態
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);

  // Helper functions
  const getCurrentChapterUniqueId = useCallback((chapter) => {
    if (chapter && typeof chapter.chapterId === 'string' && chapter.chapterId.length > 0) {
      return chapter.chapterId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    }
    return `chapter_${Date.now()}`;
  }, []);

  // 使用 useStoryGenerator hook
  const { generateNextChapter } = useStoryGenerator(db, auth, currentChapter, characterStats, getCurrentChapterUniqueId);

// Firebase 初始化
useEffect(() => {
  // 這一段程式碼只會在組件第一次載入時執行一次
  const initializeFirebase = () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 驗證環境變數
      if (!FIREBASE_CONFIG.apiKey) {
        throw new Error('Firebase API Key 未設定');
      }

      const app = initializeApp(FIREBASE_CONFIG);
      const firebaseAuth = getAuth(app);
      const firestore = getFirestore(app);

      setAuth(firebaseAuth);
      setDb(firestore);

      // 設置「智慧手環」監聽器 (onAuthStateChanged)
      // 這會一直監視使用者的登入狀態
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // 如果 user 存在，代表手環是綠燈 (已登入)
          // 我們就把他的 ID 記錄下來
          dispatch({ type: 'SET_USER_ID', payload: user.uid });
          dispatch({ type: 'SET_LOADING', payload: false }); // 關閉載入畫面
        } else {
          // 如果 user 是 null，代表手環沒亮 (未登入)
          // 我們就嘗試幫他匿名登入，給他一個新的手環
          try {
            await signInAnonymously(firebaseAuth);
            // 登入成功後，上面的 onAuthStateChanged 會再次被觸發，
            // 並且 user 就會存在了，所以這裡不用再 dispatch
          } catch (authError) {
            console.error('匿名登入失敗:', authError);
            dispatch({ type: 'SET_ERROR', payload: '無法驗證使用者身份' });
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }
      });

      // 這是一個「清理」函式
      // 當使用者離開這個頁面時，我們會告訴監聽器可以下班了，節省資源
      return () => unsubscribe();

    } catch (error) {
      console.error('Firebase 初始化錯誤:', error);
      dispatch({ type: 'SET_ERROR', payload: '初始化失敗：' + error.message });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  initializeFirebase();
}, [dispatch]); // 這個陣列告訴 React 這個 effect 依賴 dispatch，基本上只會執行一次

  // 開始遊戲
  const startGame = useCallback(() => {
    dispatch({ type: 'SET_SHOW_WELCOME_SCREEN', payload: false });
    dispatch({ type: 'SET_CURRENT_CHAPTER', payload: initialStoryData });
    dispatch({ type: 'SET_SHOW_CHOICES', payload: true });
  }, [dispatch]);

  // 處理選擇
  const handleChoice = useCallback(async (choiceText, choiceId) => {
    if (!db || !auth || !currentChapter) {
      dispatch({ type: 'SET_ERROR', payload: '系統未準備就緒，請稍後再試' });
      return;
    }

    try {
      dispatch({ type: 'SET_IS_LOADING_TEXT', payload: true });
      dispatch({ type: 'SET_SHOW_CHOICES', payload: false });
      dispatch({ type: 'SET_ERROR', payload: '' });

      const result = await generateNextChapter(choiceText, choiceId);
      
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_CHAPTER', payload: result.chapter });
        dispatch({ type: 'SET_SHOW_CHOICES', payload: true });
      } else {
        throw new Error('AI 生成失敗');
      }
    } catch (error) {
      console.error('生成章節時發生錯誤:', error);
      dispatch({ type: 'SET_ERROR', payload: `生成章節時發生錯誤: ${error.message}` });
    } finally {
      dispatch({ type: 'SET_IS_LOADING_TEXT', payload: false });
    }
  }, [db, auth, currentChapter, generateNextChapter, dispatch]);

  // 載入中畫面
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
        <p className="ml-4 text-xl text-purple-200 font-semibold">正在載入介面...</p>
      </div>
    );
  }

  // 錯誤畫面
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-red-900 p-6 rounded-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-200 mb-4">發生錯誤</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 歡迎畫面
  if (showWelcomeScreen) {
    return <WelcomeScreen onStartGame={startGame} />;
  }

  // 主遊戲畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Infinovel
          </h1>
          <div className="text-sm text-gray-400 mt-2">
            用戶ID: {userId} | 使用 Hugging Face AI
          </div>
        </header>

        {/* 故事內容 */}
        {currentChapter && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
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

        {/* 載入中 */}
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
                className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-8 bg-gray-800 rounded-lg p-4">
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
      </div>
    </div>
  );
}

export default App;
