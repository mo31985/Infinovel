import React, { createContext, useReducer } from 'react';

export const initialState = {
  showAuthModal: false,
  isRegisterMode: false,
  email: '',
  password: '',
  authError: '',
  statPoints: 10, // 你預設的INITIAL_STAT_POINTS
  stats: {
    strength: 0,
    agility: 0,
    intelligence: 0,
    luck: 0,
    endurance: 0,
  },
  // 你可以在這裡逐步加入更多全局狀態（user, gameProgress等等）
};

function reducer(state, action) {
  switch (action.type) {
    case 'SHOW_AUTH_MODAL':
      return { ...state, showAuthModal: true };
    case 'HIDE_AUTH_MODAL':
      return { ...state, showAuthModal: false };
    case 'SET_REGISTER_MODE':
      return { ...state, isRegisterMode: action.payload };
    case 'SET_EMAIL':
      return { ...state, email: action.payload };
    case 'SET_PASSWORD':
      return { ...state, password: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload };
    case 'RESET_AUTH_FORM':
      return { ...state, email: '', password: '', authError: '', isRegisterMode: false };
    case 'SET_STAT_POINTS':
      return { ...state, statPoints: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'UPDATE_STAT':
      return { 
        ...state, 
        stats: { ...state.stats, [action.stat]: action.value }
      };
    // ...之後可以繼續加入 user, progress, modal 等其它 case
    default:
      return state;
  }
}

export const StateContext = createContext();

export function StateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
}
