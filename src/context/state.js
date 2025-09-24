import React, { createContext, useReducer } from 'react';

const initialState = {
  showWelcomeScreen: true,
  showCharacterCreation: false,
  showAuthModal: false,
  authMode: 'login',
  userEmail: '',
  userPassword: '',
  authError: '',
  authMessage: '',
  currentChapter: null,
  choices: [],
  isLoadingText: false,
  showChoices: false,
  showProceedToChoicesButton: false,
  loading: false,
  error: '',
  saveMessage: '',
  loadMessage: '',
  isSaving: false,
  isLoadingSave: false,
  userId: null,
  currentUser: null,
  userProfile: { isVIP: false },
  characterStats: { strength: 5, intelligence: 5, agility: 5 },
  allocatedPoints: { strength: 0, intelligence: 0, agility: 0 },
  statPoints: 10,
  timeLeft: 0,
  timerActive: false,
  userPathHistory: [],
  isPathHistoryVisible: false,
  showRestartConfirm: false,
  feedbackText: '',
  feedbackMessage: '',
  isAuthReady: false,
  initialDataLoaded: false
};

function stateReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CURRENT_CHAPTER':
      return { ...state, currentChapter: action.payload };
    case 'SET_SHOW_WELCOME_SCREEN':
      return { ...state, showWelcomeScreen: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SHOW_AUTH_MODAL':
      return { ...state, showAuthModal: true };
    case 'HIDE_AUTH_MODAL':
      return { ...state, showAuthModal: false };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_IS_LOADING_TEXT':
      return { ...state, isLoadingText: action.payload };
    case 'SET_SHOW_CHOICES':
      return { ...state, showChoices: action.payload };
    default:
      return state;
  }
}

export const StateContext = createContext();

export const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(stateReducer, initialState);

  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};
