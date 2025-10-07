// 核心 React 功能
import React, { useState, useEffect, useCallback, useContext } from 'react';

// Firebase 相關功能
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  // 其他你未來可能用到的 auth 方法
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

// App 內部狀態和自定義功能
import { StateContext } from './context/state';
import { useStoryGenerator } from './hooks/useStoryGenerator';

// 拆分出去的畫面元件 (Components)
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import GameScreen from './components/GameScreen';
import WelcomeScreen from './components/WelcomeScreen';

// 配置常量 (維持不變)
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// 初始故事內容 (維持不變)
const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  // ... (content 和 choices 省略)
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
    showChoices,
  } = state;

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);

  const getCurrentChapterUniqueId = useCallback((chapter) => {
    if (chapter && typeof chapter.chapterId === 'string' && chapter.chapterId.length > 0) {
      return chapter.chapterId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    }
    return `chapter_${Date.now()}`;
  }, []);

  const { generateNextChapter } = useStoryGenerator(db, auth, currentChapter, characterStats, getCurrentChapterUniqueId);

  // 【新增】可重複使用的存檔函式
  const saveGameData = useCallback(async (dataToSave) => {
    if (!userId || !db) return; // 確保使用者已登入且資料庫已就緒

    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, dataToSave);
      console.log("遊戲已存檔:", dataToSave);
    } catch (error) {
      console.error("存檔失敗:", error);
    }
  }, [userId, db]);

  // 【重大修改】Firebase 初始化 & 讀取存檔
  useEffect(() => {
    const app = initializeApp(FIREBASE_CONFIG);
    const firebaseAuth = getAuth(app);
    const firestore = getFirestore(app);
    setAuth(firebaseAuth);
    setDb(firestore);

    dispatch({ type: 'SET_LOADING', payload: true });

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        // 使用者已登入，讀取或建立存檔
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          // 存檔存在 (老玩家)
          console.log("找到玩家存檔:", docSnap.data());
          const userData = docSnap.data();
          dispatch({ type: 'LOAD_USER_DATA', payload: userData });
          // 這裡未來需要一個函式，根據 userData.currentChapterId 找到完整的章節資料
          // dispatch({ type: 'SET_CURRENT_CHAPTER', payload: findChapterById(userData.currentChapterId) });
          
        } else {
          // 存檔不存在 (新玩家)
          console.log("為新玩家建立存檔。");
          const initialData = {
            characterStats: characterStats, // 使用預設能力
            currentChapterId: initialStoryData.chapterId, // 從第一章開始
          };
          await setDoc(userDocRef, initialData);
          dispatch({ type: 'SET_CURRENT_CHAPTER', payload: initialStoryData });
        }
        
        // 無論新舊玩家，登入後都設定 UserID 並關閉歡迎畫面
        dispatch({ type: 'SET_USER_ID', payload: user.uid });
        dispatch({ type: 'SET_SHOW_WELCOME_SCREEN', payload: false });

      } else {
        // 使用者未登入，顯示歡迎畫面讓他們選擇
        console.log("沒有使用者登入，顯示歡迎畫面。");
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    return () => unsubscribe();
  }, [dispatch, characterStats]); // 依賴項包含 dispatch 和 characterStats (用於建立新玩家)


  // 【新增】處理訪客登入的函式
  const handleStartAsGuest = useCallback(async () => {
    if (!auth) {
      dispatch({ type: 'SET_ERROR', payload: '驗證系統尚未就緒' });
      return;
    }
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await signInAnonymously(auth);
      // 登入成功後，上面的 onAuthStateChanged 會自動接手後續處理
    } catch (error) {
      console.error('訪客登入失敗:', error);
      dispatch({ type: 'SET_ERROR', payload: '訪客登入失敗，請重試' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [auth, dispatch]);

  // 【修改】處理選擇，並在成功後自動存檔
  const handleChoice = useCallback(async (choiceText, choiceId) => {
    if (!db || !auth || !currentChapter) {
      dispatch({ type: 'SET_ERROR', payload: '系統未準備就緒，請稍後再試' });
      return;
    }

    dispatch({ type: 'SET_IS_LOADING_TEXT', payload: true });
    dispatch({ type: 'SET_SHOW_CHOICES', payload: false });

    try {
      const result = await generateNextChapter(choiceText, choiceId);
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_CHAPTER', payload: result.chapter });
        dispatch({ type: 'SET_SHOW_CHOICES', payload: true });

        // 自動存檔！
        await saveGameData({ currentChapterId: result.chapter.chapterId });

      } else {
        throw new Error('AI 生成失敗');
      }
    } catch (error) {
      console.error('生成章節時發生錯誤:', error);
      dispatch({ type: 'SET_ERROR', payload: `生成章節時發生錯誤: ${error.message}` });
    } finally {
      dispatch({ type: 'SET_IS_LOADING_TEXT', payload: false });
    }
  }, [db, auth, currentChapter, generateNextChapter, dispatch, saveGameData]); // 加入 saveGameData

  // =================================================================
  //                       渲染邏輯 (Rendering Logic)
  // =================================================================

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (showWelcomeScreen) {
    return (
      <WelcomeScreen
        handleStartAsGuest={handleStartAsGuest}
        // 未來可以把登入/註冊的函式也傳下去
        // handleLogin={...}
        // handleRegister={...}
      />
    );
  }

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
}

export default App;
