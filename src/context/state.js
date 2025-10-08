// src/context/state.js

import React, { createContext, useReducer } from 'react';

// ------------------------------
// 1. 初始狀態定義 (儀表板的初始樣貌)
// ------------------------------

// 遊戲規則相關的常數
const DEFAULT_SAVE_LIMIT = 3;
const DEFAULT_LOAD_LIMIT = 5;

const initialState = {
  // --- 應用程式流程控制狀態 ---
  userId: null,      // 目前登入的使用者 ID
  loading: true,     // 是否顯示初始載入畫面
  error: null,       // 是否有錯誤發生及其訊息
  showWelcomeScreen: true, // 是否顯示歡迎畫面

  // --- 遊戲核心數據 ---
  characterStats: { strength: 10, intelligence: 10, agility: 10 }, // 角色能力
  currentChapter: null,  // 當前顯示的章節物件

  // --- 遊戲 UI 互動狀態 ---
  isLoadingText: false, // 是否顯示「AI 生成中...」的提示
  showChoices: true,    // 是否顯示選項按鈕

  // --- 存檔/載入次數限制功能 ---
  saveCount: 0,
  loadCount: 0,
  maxSaveLimit: DEFAULT_SAVE_LIMIT,
  maxLoadLimit: DEFAULT_LOAD_LIMIT,
};

// ------------------------------
// 2. Context 的建立
// ------------------------------
export const StateContext = createContext();

// ------------------------------
// 3. Reducer (中央大腦的處理規則)
// ------------------------------
export const reducer = (state, action) => {
  console.log('Dispatching Action:', action.type, action.payload); // 用於除錯，觀察狀態變化

  switch (action.type) {
    // --- 應用程式流程控制 ---
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_SHOW_WELCOME_SCREEN':
      return { ...state, showWelcomeScreen: action.payload };

    // --- 遊戲核心數據更新 ---
    case 'SET_CURRENT_CHAPTER':
      return { ...state, currentChapter: action.payload };
    case 'SET_CHARACTER_STATS': // 用於角色創建完成後
      return { ...state, characterStats: action.payload };

    // --- 遊戲 UI 互動 ---
    case 'SET_IS_LOADING_TEXT':
      return { ...state, isLoadingText: action.payload };
    case 'SET_SHOW_CHOICES':
      return { ...state, showChoices: action.payload };

    // --- 存檔/讀檔功能 ---
    
    // 【重要】在玩家登入時，從 Firestore 存檔一次性恢復所有遊戲數據
    case 'LOAD_USER_DATA':
      return {
        ...state,
        characterStats: action.payload.characterStats || state.characterStats,
        saveCount: action.payload.saveCount || 0,
        loadCount: action.payload.loadCount || 0,
      };
    
    // 在玩家成功存檔後，更新儀表板上的存檔次數
    case 'INCREMENT_SAVE_COUNT':
      return { ...state, saveCount: state.saveCount + 1 };
      
    default:
      return state;
  }
};

// ------------------------------
// 4. Provider (將大腦和儀表板提供給整個 App)
// ------------------------------
export const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};
