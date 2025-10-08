// src/App.js

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { StateContext } from './context/state';
import { useStoryGenerator } from './hooks/useStoryGenerator';
import { initialStoryData } from './constants';

// 元件 Imports
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import GameScreen from './components/GameScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CharacterCreation from './components/CharacterCreation';
import AuthModal from './components/AuthModal';

const FIREBASE_CONFIG = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    // ... 其他配置
};

function App() {
  const { state, dispatch } = useContext(StateContext);
  const {
    showWelcomeScreen, currentChapter, loading, error, userId, characterStats,
    isLoadingText, showChoices, saveCount, maxSaveLimit, loadCount, maxLoadLimit
  } = state;

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);

  // 【更新】使用新的 hook
  const { fetchOrGenerateChapter } = useStoryGenerator(characterStats);

  const saveGameData = useCallback(async (dataToSave = {}) => {
    if (!userId || !db) return;
    if (saveCount >= maxSaveLimit) {
      alert(`已達到儲存次數上限 (${maxSaveLimit})！`);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', userId);
      const dataWithIncrement = { ...dataToSave, saveCount: increment(1) };
      await updateDoc(userDocRef, dataWithIncrement);
      dispatch({ type: 'INCREMENT_SAVE_COUNT' });
      console.log("遊戲已存檔:", dataToSave);
      alert("遊戲進度已儲存！");
    } catch (e) {
      console.error("存檔失敗:", e);
    }
  }, [userId, db, saveCount, maxSaveLimit, dispatch]);

  const handleAuthSubmit = useCallback(/* ...維持不變... */);
  const handleStartAsGuest = useCallback(/* ...維持不變... */);
  const handleCharacterCreate = useCallback(/* ...維持不變... */);

  // 【更新】handleChoice 現在呼叫 fetchOrGenerateChapter
  const handleChoice = useCallback(async (choice) => {
    if (!currentChapter) return;
    dispatch({ type: 'SET_IS_LOADING_TEXT', payload: true });
    dispatch({ type: 'SET_SHOW_CHOICES', payload: false });
    try {
      const result = await fetchOrGenerateChapter(currentChapter, choice);
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_CHAPTER', payload: result.chapter });
        await saveGameData({ currentChapterId: result.chapter.chapterId });
      } else {
        throw new Error(result.error || '獲取或生成章節失敗');
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: `處理選擇時發生錯誤: ${e.message}` });
    } finally {
      dispatch({ type: 'SET_SHOW_CHOICES', payload: true });
      dispatch({ type: 'SET_IS_LOADING_TEXT', payload: false });
    }
  }, [currentChapter, fetchOrGenerateChapter, dispatch, saveGameData]);

  // 【更新】useEffect 讀檔邏輯
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
        let userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) {
          const initialUserData = {
            characterStats,
            currentChapterId: initialStoryData.chapterId,
            characterCreated: false,
            saveCount: 0,
            loadCount: 0,
          };
          await setDoc(userDocRef, initialUserData);
          userSnap = await getDoc(userDocRef); // 重新獲取剛建立的文件
        }

        const userData = userSnap.data();
        dispatch({ type: 'LOAD_USER_DATA', payload: userData });
        dispatch({ type: 'SET_USER_ID', payload: user.uid });
        dispatch({ type: 'SET_SHOW_WELCOME_SCREEN', payload: false });

        if (userData.characterCreated) {
          const chapterIdToLoad = userData.currentChapterId || initialStoryData.chapterId;
          
          if (chapterIdToLoad === initialStoryData.chapterId) {
            dispatch({ type: 'SET_CURRENT_CHAPTER', payload: initialStoryData });
          } else {
            const chapterRef = doc(firestore, 'chapters', chapterIdToLoad);
            const chapterSnap = await getDoc(chapterRef);
            if (chapterSnap.exists()) {
              dispatch({ type: 'SET_CURRENT_CHAPTER', payload: chapterSnap.data() });
            } else {
              dispatch({ type: 'SET_CURRENT_CHAPTER', payload: initialStoryData });
            }
          }
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

  // 渲染邏輯維持不變
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  // ... 其他渲染邏輯 ...

  return (
    <GameScreen
        handleChoice={handleChoice}
        {...state} // 簡化 props 傳遞
        saveGameData={saveGameData}
    />
  );
}

export default App;
