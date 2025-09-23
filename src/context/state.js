import React, { createContext, useReducer } from 'react';

// 取自 constants.js 的常量
const INITIAL_STAT_POINTS = 10;

// 初始狀態 - 包含 App.js 中所有需要全局管理的 useState
export const initialState = {
  // 認證相關狀態
  showAuthModal: false,
  authMode: 'login', // 'login' or 'register'
  userEmail: '',
  userPassword: '',
  authError: '',
  authMessage: '',
  
  // 角色創建狀態
  showCharacterCreation: false,
  statPoints: INITIAL_STAT_POINTS,
  stats: {
    strength: 0,
    agility: 0,
    intelligence: 0,
    luck: 0,
    endurance: 0,
  },
  allocatedPoints: {
    strength: 0,
    intelligence: 0,
    agility: 0
  },
  
  // 遊戲狀態
  showWelcomeScreen: true,
  currentChapter: null,
  choices: [],
  isLoadingText: false,
  showChoices: false,
  showProceedToChoicesButton: false,
  
  // 用戶狀態
  userId: '載入中...',
  currentUser: null,
  userProfile: {
    loadCount: 0,
    saveCount: 0,
    isVIP: false,
    isRegistered: false,
    email: null,
  },
  
  // 角色能力值
  characterStats: {
    strength: 1,
    intelligence: 1,
    agility: 1,
    strengthAccumulation: 0,
    intelligenceAccumulation: 0,
    agilityAccumulation: 0,
  },
  
  // UI 狀態
  loading: true,
  error: null,
  saveMessage: '',
  loadMessage: '',
  isSaving: false,
  isLoadingSave: false,
  
  // 時間選擇相關
  timeLeft: 0,
  timerActive: false,
  
  // 進度記錄
  userPathHistory: [],
  isPathHistoryVisible: false,
  
  // 確認彈窗
  showRestartConfirm: false,
  
  // 回饋相關
  feedbackText: '',
  feedbackMessage: '',
  
  // Firebase 狀態
  isAuthReady: false,
  initialDataLoaded: false,
};

// 狀態更新減速器 (Reducer)
function reducer(state, action) {
  switch (action.type) {
    // 認證相關動作
    case 'SHOW_AUTH_MODAL':
      return { ...state, showAuthModal: true };
    case 'HIDE_AUTH_MODAL':
      return { ...state, showAuthModal: false };
    case 'SET_AUTH_MODE':
      return { ...state, authMode: action.payload };
    case 'SET_USER_EMAIL':
      return { ...state, userEmail: action.payload };
    case 'SET_USER_PASSWORD':
      return { ...state, userPassword: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload };
    case 'SET_AUTH_MESSAGE':
      return { ...state, authMessage: action.payload };
    case 'RESET_AUTH_FORM':
      return { 
        ...state, 
        userEmail: '', 
        userPassword: '', 
        authError: '', 
        authMessage: '',
        authMode: 'login' 
      };
    
    // 角色創建相關動作
    case 'SHOW_CHARACTER_CREATION':
      return { ...state, showCharacterCreation: true };
    case 'HIDE_CHARACTER_CREATION':
      return { ...state, showCharacterCreation: false };
    case 'SET_STAT_POINTS':
      return { ...state, statPoints: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'UPDATE_STAT':
      return { 
        ...state, 
        stats: { 
          ...state.stats, 
          [action.stat]: action.value 
        }
      };
    case 'SET_ALLOCATED_POINTS':
      return { ...state, allocatedPoints: action.payload };
    case 'UPDATE_ALLOCATED_POINT':
      return {
        ...state,
        allocatedPoints: {
          ...state.allocatedPoints,
          [action.stat]: action.value
        }
      };
    
    // 遊戲狀態動作
    case 'SHOW_WELCOME_SCREEN':
      return { ...state, showWelcomeScreen: true };
    case 'HIDE_WELCOME_SCREEN':
      return { ...state, showWelcomeScreen: false };
    case 'SET_CURRENT_CHAPTER':
      return { ...state, currentChapter: action.payload };
    case 'SET_CHOICES':
      return { ...state, choices: action.payload };
    case 'SET_LOADING_TEXT':
      return { ...state, isLoadingText: action.payload };
    case 'SHOW_CHOICES':
      return { ...state, showChoices: true };
    case 'HIDE_CHOICES':
      return { ...state, showChoices: false };
    case 'SHOW_PROCEED_BUTTON':
      return { ...state, showProceedToChoicesButton: true };
    case 'HIDE_PROCEED_BUTTON':
      return { ...state, showProceedToChoicesButton: false };
    
    // 用戶狀態動作
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'UPDATE_USER_PROFILE':
      return { 
        ...state, 
        userProfile: { 
          ...state.userProfile, 
          ...action.payload 
        }
      };
    
    // 角色能力值動作
    case 'SET_CHARACTER_STATS':
      return { ...state, characterStats: action.payload };
    case 'UPDATE_CHARACTER_STAT':
      return {
        ...state,
        characterStats: {
          ...state.characterStats,
          [action.stat]: action.value
        }
      };
    
    // UI 狀態動作
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SAVE_MESSAGE':
      return { ...state, saveMessage: action.payload };
    case 'SET_LOAD_MESSAGE':
      return { ...state, loadMessage: action.payload };
    case 'SET_IS_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_IS_LOADING_SAVE':
      return { ...state, isLoadingSave: action.payload };
    
    // 時間選擇動作
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.payload };
    case 'SET_TIMER_ACTIVE':
      return { ...state, timerActive: action.payload };
    
    // 進度記錄動作
    case 'SET_USER_PATH_HISTORY':
      return { ...state, userPathHistory: action.payload };
    case 'ADD_PATH_HISTORY':
      return { 
        ...state, 
        userPathHistory: [...state.userPathHistory, action.payload] 
      };
    case 'TOGGLE_PATH_HISTORY_VISIBILITY':
      return { ...state, isPathHistoryVisible: !state.isPathHistoryVisible };
    case 'SET_PATH_HISTORY_VISIBILITY':
      return { ...state, isPathHistoryVisible: action.payload };
    
    // 確認彈窗動作
    case 'SHOW_RESTART_CONFIRM':
      return { ...state, showRestartConfirm: true };
    case 'HIDE_RESTART_CONFIRM':
      return { ...state, showRestartConfirm: false };
    
    // 回饋動作
    case 'SET_FEEDBACK_TEXT':
      return { ...state, feedbackText: action.payload };
    case 'SET_FEEDBACK_MESSAGE':
      return { ...state, feedbackMessage: action.payload };
    
    // Firebase 狀態動作
    case 'SET_AUTH_READY':
      return { ...state, isAuthReady: action.payload };
    case 'SET_INITIAL_DATA_LOADED':
      return { ...state, initialDataLoaded: action.payload };
    
    // 重設所有狀態（重新開始遊戲時使用）
    case 'RESET_GAME_STATE':
      return {
        ...initialState,
        // 保留某些不需要重設的狀態
        isAuthReady: state.isAuthReady,
        currentUser: state.currentUser,
        userId: state.userId,
        showWelcomeScreen: false,
        showCharacterCreation: true,
      };
    
    default:
      return state;
  }
}

// 創建 Context
export const StateContext = createContext();

// 狀態提供者組件
export function StateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
}