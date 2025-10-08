// src/context/state.js

import React, { createContext, useReducer } from 'react';
import { DEFAULT_SAVE_LIMIT, DEFAULT_LOAD_LIMIT } from '../constants';

const initialState = {
  // ... (你原有的其他状态)
  userId: null,
  loading: true,
  error: null,
  showWelcomeScreen: true,
  characterStats: { strength: 0, intelligence: 0, agility: 0 },
  currentChapter: null,
  
  // 【新增】追踪存档次数的 state
  saveCount: 0,
  loadCount: 0,
  maxSaveLimit: DEFAULT_SAVE_LIMIT,
  maxLoadLimit: DEFAULT_LOAD_LIMIT,
};

export const StateContext = createContext();

export const reducer = (state, action) => {
  switch (action.type) {
    // ... (你原有的其他 case)
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_SHOW_WELCOME_SCREEN':
        return { ...state, showWelcomeScreen: action.payload };
    case 'SET_CURRENT_CHAPTER':
        return { ...state, currentChapter: action.payload };
    
    // 【重要更新】载入存档时，一并更新存档次数
    case 'LOAD_USER_DATA':
      return {
        ...state,
        characterStats: action.payload.characterStats,
        saveCount: action.payload.saveCount || 0,
        loadCount: action.payload.loadCount || 0,
      };

    case 'SET_CHARACTER_STATS':
      return { ...state, characterStats: action.payload };

    // 【新增】更新存档次数的 case
    case 'INCREMENT_SAVE_COUNT':
      return { ...state, saveCount: state.saveCount + 1 };
    
    default:
      return state;
  }
};

export const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};
