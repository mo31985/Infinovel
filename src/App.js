// src/App.js

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';

// 内部状态和自订义功能
import { StateContext } from './context/state';
import { useStoryGenerator } from './hooks/useStoryGenerator';
import { initialStoryData, DEFAULT_SAVE_LIMIT } from './constants'; // 引入常数

// 所有画面元件
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import GameScreen from './components/GameScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CharacterCreation from './components/CharacterCreation';
import AuthModal from './components/AuthModal';

const FIREBASE_CONFIG = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    // ... 其他配置
};

function App() {
  const { state, dispatch } = useContext(StateContext);
  const { /*...,*/ saveCount, maxSaveLimit, loadCount, maxLoadLimit } = state; // 解构新 state
  const { showWelcomeScreen, currentChapter, loading, error, userId, characterStats, isLoadingText, showChoices } = state;
  
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);

  const { generateNextChapter } = useStoryGenerator(db, auth, currentChapter, characterStats);

  // 【更新】存档函式现在会检查次数
  const saveGameData = useCallback(async (dataToSave = {}) => {
    if (!userId || !db) return;

    if (saveCount >= maxSaveLimit) {
      alert(`已达到储存次数上限 (${maxSaveLimit})！`);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userId);
      const dataWithIncrement = { ...dataToSave, saveCount: increment(1) };
      await updateDoc(userDocRef, dataWithIncrement);
      dispatch({ type: 'INCREMENT_SAVE_COUNT' }); // 更新本地 state
      console.log("游戏已存档:", dataToSave);
      alert("游戏进度已保存！");
    } catch (error) {
      console.error("存档失败:", error);
    }
  }, [userId, db, saveCount, maxSaveLimit, dispatch]);

  const handleAuthSubmit = useCallback(/* ...维持不变... */);
  const handleStartAsGuest = useCallback(/* ...维持不变... */);
  const handleCharacterCreate = useCallback(/* ...维持不变... */);

  // 【更新】选择函式现在会执行能力检定
  const handleChoice = useCallback(async (choiceText, choiceId) => {
    if (!db || !auth || !currentChapter) return;
    dispatch({ type: 'SET_IS_LOADING_TEXT', payload: true });
    dispatch({ type: 'SET_SHOW_CHOICES', payload: false });

    try {
      const chosenOption = currentChapter.choices.find(c => c.choiceId === choiceId);
      let promptContext = `玩家选择了：'${choiceText}'。`;

      if (chosenOption && chosenOption.skillCheck) {
        const { stat, threshold } = chosenOption.skillCheck;
        const playerStatValue = characterStats[stat] || 0;
        
        if (playerStatValue >= threshold) {
          promptContext += ` 并且因为他们的'${stat}'能力值够高 ( ${playerStatValue} >= ${threshold} )，所以检定成功了。`;
        } else {
          promptContext += ` 但可惜他们的'${stat}'能力值不够 ( ${playerStatValue} < ${threshold} )，所以检定失败了。`;
        }
      }

      const result = await generateNextChapter(choiceText, choiceId, promptContext);
      
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_CHAPTER', payload: result.chapter });
        await saveGameData({ currentChapterId: result.chapter.chapterId });
      } else {
        throw new Error(result.error || 'AI 生成失败');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `生成章节时发生错误: ${error.message}` });
    } finally {
      dispatch({ type: 'SET_SHOW_CHOICES', payload: true });
      dispatch({ type: 'SET_IS_LOADING_TEXT', payload: false });
    }
  }, [db, auth, currentChapter, characterStats, generateNextChapter, dispatch, saveGameData]);

  // 【更新】useEffect 现在会为新玩家建立存档次数栏位
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
            saveCount: 0, // 新增
            loadCount: 0, // 新增
          };
          await setDoc(userDocRef, initialData);
          userData = initialData;
        } else {
          userData = docSnap.data();
        }
        dispatch({ type: 'LOAD_USER_DATA', payload: userData });
        // ... (后续逻辑不变) ...
      }
      // ... (后续逻辑不变) ...
    });
    return () => unsubscribe();
  }, [dispatch, characterStats]);

  // =================================================================
  //                       RENDERING LOGIC
  // =================================================================
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (showWelcomeScreen) { /* ...维持不变... */ }
  if (showCharacterCreation) { /* ...维持不变... */ }

  return (
    <GameScreen
      // ... (原有 props 不变) ...
      userId={userId}
      currentChapter={currentChapter}
      isLoadingText={isLoadingText}
      showChoices={showChoices}
      handleChoice={handleChoice}
      characterStats={characterStats}
      
      // 【新增】将存档相关的功能和状态传下去给 GameControls
      saveGameData={saveGameData}
      saveCount={saveCount}
      maxSaveLimit={maxSaveLimit}
      loadCount={loadCount}
      maxLoadLimit={maxLoadLimit}
    />
  );
}

export default App;
