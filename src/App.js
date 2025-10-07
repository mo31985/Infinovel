// 核心 React 功能
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';

// Firebase 相關功能
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  collection
} from 'firebase/firestore';

// App 內部狀態和自定義功能
import { StateContext } from './context/state';
import { useStoryGenerator } from './hooks/useStoryGenerator';

// 拆分出去的畫面元件 (Components)
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import GameScreen from './components/GameScreen';
import WelcomeScreen from './components/WelcomeScreen'; // 根據您之前提供的檔案加入

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

    // 建立一個可重複使用的存檔函式
  const saveGameData = useCallback(async (dataToSave) => {
    if (!userId || !db) return; // 確保使用者已登入且資料庫已就緒

    try {
      const userDocRef = doc(db, 'users', userId);
      // 使用 updateDoc 來更新部分資料，這比 setDoc 更有效率，且不會覆蓋整個文件
      await updateDoc(userDocRef, dataToSave);
      console.log("遊戲已存檔:", dataToSave);
    } catch (error) {
      console.error("存檔失敗:", error);
      // 在這裡可以考慮是否要通知使用者存檔失敗
    }
  }, [userId, db]);

// Firebase 初始化
useEffect(() => {
  // ... (Firebase 初始化代碼不變) ...
  const firebaseAuth = getAuth(app);
  const firestore = getFirestore(app);
  setAuth(firebaseAuth);
  setDb(firestore);

  const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
      // 使用者已登入！這是讀取存檔的最佳時機
      const userDocRef = doc(firestore, 'users', user.uid); // 準備好指向使用者存檔的「路徑」
      const docSnap = await getDoc(userDocRef); // 嘗試讀取這個存檔

      if (docSnap.exists()) {
        // --- 存檔存在 (老玩家回來了) ---
        console.log("找到玩家存檔:", docSnap.data());
        const userData = docSnap.data();
        
        // **重要**：派發一個新的 action 來一次性更新所有遊戲狀態
        dispatch({ type: 'LOAD_USER_DATA', payload: userData });
        
        // 這裡需要根據存檔的章節 ID 找到對應的章節資料
        // 這部分比較複雜，我們先假設能從 userData.currentChapterId 恢復
        // dispatch({ type: 'SET_CURRENT_CHAPTER', payload: findChapterById(userData.currentChapterId) });

      } else {
        // --- 存檔不存在 (新玩家) ---
        console.log("找不到玩家存檔，為新玩家建立資料。");
        const initialData = {
          characterStats: state.characterStats, // 使用預設的角色能力
          currentChapterId: initialStoryData.chapterId, // 從初始章節開始
          // 未來還可以存更多東西，例如：背包物品、金錢...
        };
        await setDoc(userDocRef, initialData); // 在資料庫為他建立一個新的存檔

        // 新玩家不需要載入，直接使用預設狀態即可
        dispatch({ type: 'SET_USER_ID', payload: user.uid });
      }

      dispatch({ type: 'SET_LOADING', payload: false }); // 關閉載入畫面

    } else {
      // ... (使用者未登入的處理邏輯不變) ...
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  });

  return () => unsubscribe();
}, [dispatch, state.characterStats]); // 注意：依賴項可能需要調整

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
  return <LoadingScreen />;
}

  // 錯誤畫面
if (error) {
  return <ErrorScreen error={error} />;
}

  // 歡迎畫面
  if (showWelcomeScreen) {
    return <WelcomeScreen onStartGame={startGame} />;
  }

  // 主遊戲畫面
return (
  <GameScreen
    userId={userId}
    currentChapter={currentChapter}
    isLoadingText={isLoadingText}
    showChoices={showChoices}
    handleChoice={handleChoice}
    characterStats={characterStats}
  />
);
} // App 函式的結尾括號

export default App;
