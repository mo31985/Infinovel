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
import CharacterCreation from './components/CharacterCreation';
import AuthModal from './components/AuthModal';

// =================================================================
//                      CONFIG & INITIAL DATA
// =================================================================
const FIREBASE_CONFIG = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  content: [
    '在維多利亞時代的倫敦，蒸汽機的轟鳴聲與古老魔法的低語交織...', // 內容省略
  ],
  choices: [
    { text: '立即前往時鐘塔...', choiceId: 'to_clock_tower' },
    // ... 其他選項
  ],
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);

  // ----------------------- Custom Hooks & Helpers -------------------
  const { generateNextChapter } = useStoryGenerator(db, auth, currentChapter, characterStats);

  // =================================================================
  //                       CORE FUNCTIONS
  // =================================================================

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

  const handleAuthSubmit = useCallback(async (email, password) => {
    if (!auth) return;
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const initialData = {
          characterStats: characterStats,
          currentChapterId: initialStoryData.chapterId,
          characterCreated: false,
        };
        await setDoc(userDocRef, initialData);
      }
      setShowAuthModal(false);
    } catch (error) {
      setAuthError(error.message);
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

  const handleCharacterCreate = useCallback(async (finalStats) => {
    if (!userId) return;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await saveGameData({
        characterStats: finalStats,
        characterCreated: true,
      });
      dispatch({ type: 'SET_CHARACTER_STATS', payload: finalStats });
      setShowCharacterCreation(false);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: '角色創建失敗' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId, dispatch, saveGameData]);

  // 【錯誤修正處】
  const handleChoice = useCallback(async (choiceText, choiceId) => {
    if (!db || !auth || !currentChapter) {
      dispatch({ type: 'SET_ERROR', payload: '系統未準備就緒' });
      return;
    }
    dispatch({ type: 'SET_IS_LOADING_TEXT', payload: true });
    dispatch({ type: 'SET_SHOW_CHOICES', payload: false });
    try {
      // **修正點**：確保 `result` 在 `try` 區塊內被宣告
      const result = await generateNextChapter(choiceText, choiceId);
      
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_CHAPTER', payload: result.chapter });
        await saveGameData({ currentChapterId: result.chapter.chapterId });
      } else {
        throw new Error(result.error || 'AI 生成失敗');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `生成章節時發生錯誤: ${error.message}` });
    } finally {
      dispatch({ type: 'SET_SHOW_CHOICES', payload: true });
      dispatch({ type: 'SET_IS_LOADING_TEXT', payload: false });
    }
  }, [db, auth, currentChapter, generateNextChapter, dispatch, saveGameData]);

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

        if (userData.characterCreated) {
          setShowCharacterCreation(false);
        } else {
          setShowCharacterCreation(true);
        }
      } else {
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
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

  if (showWelcomeScreen) {
    return (
      <>
        <WelcomeScreen
          handleStartAsGuest={handleStartAsGuest}
          onShowAuthModal={(mode) => {
            setAuthMode(mode);
            setAuthError('');
            setShowAuthModal(true);
          }}
        />
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
      saveGameData={saveGameData}
    />
  );
}

export default App;
