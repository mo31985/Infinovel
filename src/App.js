// =================================================================
//                            IMPORTS
// =================================================================
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

// 內部狀態和自定義功能
import { StateContext } from './context/state';
import { useStoryGenerator } from './hooks/useStoryGenerator';

// 所有畫面元件
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import GameScreen from './components/GameScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CharacterCreation from './components/CharacterCreation'; // 新增
import AuthModal from './components/AuthModal'; // 新增

// =================================================================
//                      CONFIG & INITIAL DATA
// =================================================================
const FIREBASE_CONFIG = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    // ...其他配置
};

const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  // ... 其他內容
};

// =================================================================
//                        APP COMPONENT
// =================================================================
function App() {
  // ------------------------- Global State --------------------------
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

  // ------------------------- Local State ---------------------------
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  
  // 新增：控制 AuthModal 的狀態
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');

  // 新增：控制角色創建畫面的狀態
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);


  // ----------------------- Custom Hooks & Helpers -------------------
  const { generateNextChapter } = useStoryGenerator(/* ... */);

  // =================================================================
  //                       CORE FUNCTIONS
  // =================================================================

  // -------------------- Data Persistence (Save/Load) --------------------
  const saveGameData = useCallback(async (dataToSave) => {
    if (!userId || !db) return;
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, dataToSave);
      console.log("遊戲已存檔:", dataToSave);
    } catch (error) {
      console.error("存檔失敗:", error);
    }
  }, [userId, db]);

  // -------------------- Authentication Handlers --------------------
  const handleAuthSubmit = useCallback(async (email, password) => {
    if (!auth) return;
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // 新註冊用戶，立刻為他建立 Firestore 文件
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const initialData = {
          characterStats: characterStats,
          currentChapterId: initialStoryData.chapterId,
          characterCreated: false, // 【重要】新用戶角色未創建
        };
        await setDoc(userDocRef, initialData);
      }
      setShowAuthModal(false); // 成功後關閉 Modal
    } catch (error) {
      setAuthError(error.message);
      console.error(`${authMode} 失敗:`, error);
    }
  }, [auth, db, authMode, characterStats]);

  const handleStartAsGuest = useCallback(async () => {
    if (!auth) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await signInAnonymously(auth);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: '訪客登入失敗' });
    }
  }, [auth, dispatch]);


  // -------------------- Character Creation Handler --------------------
  const handleCharacterCreate = useCallback(async (finalStats) => {
    if (!userId) return;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // 更新 Firestore 資料
      await saveGameData({
        characterStats: finalStats,
        characterCreated: true, // 【重要】標記角色已創建
      });
      // 更新本地 state
      dispatch({ type: 'SET_CHARACTER_STATS', payload: finalStats });
      setShowCharacterCreation(false); // 關閉創建畫面，進入遊戲
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: '角色創建失敗' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId, dispatch, saveGameData]);

  // -------------------- Game Logic Handler --------------------
  const handleChoice = useCallback(async (choiceText, choiceId) => {
    // ... (原有邏輯不變) ...
    // 在成功生成新章節後，自動存檔
    await saveGameData({ currentChapterId: result.chapter.chapterId });
  }, [/* ...原有依賴項... */, saveGameData]);

  // =================================================================
  //                    MAIN useEffect (APP LIFECYCLE)
  // =================================================================
  useEffect(() => {
    const app = initializeApp(FIREBASE_CONFIG);
    const firebaseAuth = getAuth(app);
    const firestore = getFirestore(app);
    setAuth(firebaseAuth);
    setDb(firestore);
    dispatch({ type: 'SET_LOADING', payload: true });

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        let userData;
        if (!docSnap.exists()) {
          // 處理訪客或首次社交登入的情況
          const initialData = {
            characterStats: characterStats,
            currentChapterId: initialStoryData.chapterId,
            characterCreated: false,
          };
          await setDoc(userDocRef, initialData);
          userData = initialData;
        } else {
          userData = docSnap.data();
        }

        dispatch({ type: 'LOAD_USER_DATA', payload: userData });
        dispatch({ type: 'SET_USER_ID', payload: user.uid });
        dispatch({ type: 'SET_SHOW_WELCOME_SCREEN', payload: false });

        // 【核心流程控制】
        if (userData.characterCreated) {
          setShowCharacterCreation(false); // 角色已創建，直接玩
        } else {
          setShowCharacterCreation(true); // 角色未創建，顯示創建畫面
        }

      } else {
        // 沒有使用者，顯示歡迎畫面
        dispatch({ type: 'SET_SHOW_WELCOME_SCREEN', payload: true });
        setShowCharacterCreation(false);
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    return () => unsubscribe();
  }, [dispatch, characterStats]);

  // =================================================================
  //                       RENDERING LOGIC
  // =================================================================
  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (showWelcomeScreen) {
    return (
      <>
        <WelcomeScreen
          handleStartAsGuest={handleStartAsGuest}
          onShowAuthModal={(mode) => {
            setAuthMode(mode);
            setShowAuthModal(true);
          }}
        />
        {/* AuthModal 現在由 App.js 控制，並疊加在 WelcomeScreen 之上 */}
        <AuthModal
          show={showAuthModal}
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSubmit={handleAuthSubmit}
          authError={authError}
        />
      </>
    );
  }

  if (showCharacterCreation) {
    // 假設 CharacterCreation 在完成時會呼叫 onComplete 並傳回 stats 物件
    return <CharacterCreation onComplete={handleCharacterCreate} />;
  }

  return (
    <GameScreen
      userId={userId}
      currentChapter={currentChapter}
      isLoadingText={isLoadingText}
      showChoices={showChoices}
      handleChoice={handleChoice}
      characterStats={characterStats}
      // 將 saveGameData 傳下去，給 GameControls 裡的手動存檔按鈕使用
      saveGameData={saveGameData} 
    />
  );
}

export default App;
