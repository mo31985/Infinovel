import { useState, useCallback, useReducer, useMemo } from 'react';

// 遊戲狀態的初始值
const INITIAL_STAT_POINTS = 10;
const STAT_ACCUMULATION_THRESHOLD = 3;
const DEFAULT_LOAD_LIMIT = 5;
const DEFAULT_SAVE_LIMIT = 3;
const VIP_LOAD_LIMIT = 20;
const VIP_SAVE_LIMIT = 10;

// 遊戲狀態管理 reducer
const gameStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_CHAPTER':
      return {
        ...state,
        currentChapter: action.payload,
        choices: action.payload?.choices || [],
        showChoices: false,
        showProceedToChoicesButton: true,
      };
      
    case 'SET_CHOICES':
      return {
        ...state,
        choices: action.payload,
      };
      
    case 'SET_LOADING_TEXT':
      return {
        ...state,
        isLoadingText: action.payload,
      };
      
    case 'SET_SHOW_CHOICES':
      return {
        ...state,
        showChoices: action.payload,
      };
      
    case 'SET_SHOW_PROCEED_BUTTON':
      return {
        ...state,
        showProceedToChoicesButton: action.payload,
      };
      
    case 'UPDATE_CHARACTER_STATS':
      const newStats = { ...state.characterStats };
      
      // 直接增加能力值
      if (action.payload.strengthIncrease) {
        newStats.strength = Math.max(1, (newStats.strength || 0) + action.payload.strengthIncrease);
      }
      if (action.payload.intelligenceIncrease) {
        newStats.intelligence = Math.max(1, (newStats.intelligence || 0) + action.payload.intelligenceIncrease);
      }
      if (action.payload.agilityIncrease) {
        newStats.agility = Math.max(1, (newStats.agility || 0) + action.payload.agilityIncrease);
      }
      
      // 累積點數增加
      if (action.payload.strengthAccumulation) {
        let newAcc = (newStats.strengthAccumulation || 0) + action.payload.strengthAccumulation;
        newStats.strength += Math.floor(newAcc / STAT_ACCUMULATION_THRESHOLD);
        newStats.strengthAccumulation = newAcc % STAT_ACCUMULATION_THRESHOLD;
      }
      if (action.payload.intelligenceAccumulation) {
        let newAcc = (newStats.intelligenceAccumulation || 0) + action.payload.intelligenceAccumulation;
        newStats.intelligence += Math.floor(newAcc / STAT_ACCUMULATION_THRESHOLD);
        newStats.intelligenceAccumulation = newAcc % STAT_ACCUMULATION_THRESHOLD;
      }
      if (action.payload.agilityAccumulation) {
        let newAcc = (newStats.agilityAccumulation || 0) + action.payload.agilityAccumulation;
        newStats.agility += Math.floor(newAcc / STAT_ACCUMULATION_THRESHOLD);
        newStats.agilityAccumulation = newAcc % STAT_ACCUMULATION_THRESHOLD;
      }
      
      return {
        ...state,
        characterStats: newStats,
      };
      
    case 'SET_CHARACTER_STATS':
      return {
        ...state,
        characterStats: action.payload,
      };
      
    case 'SET_USER_PATH_HISTORY':
      return {
        ...state,
        userPathHistory: action.payload,
      };
      
    case 'ADD_TO_PATH_HISTORY':
      return {
        ...state,
        userPathHistory: [...state.userPathHistory, action.payload],
      };
      
    case 'SET_TIMER_STATE':
      return {
        ...state,
        timeLeft: action.payload.timeLeft !== undefined ? action.payload.timeLeft : state.timeLeft,
        timerActive: action.payload.timerActive !== undefined ? action.payload.timerActive : state.timerActive,
      };
      
    case 'RESET_GAME_STATE':
      return {
        ...initialGameState,
        characterStats: {
          strength: 1,
          intelligence: 1,
          agility: 1,
          strengthAccumulation: 0,
          intelligenceAccumulation: 0,
          agilityAccumulation: 0,
        },
      };
      
    default:
      return state;
  }
};

// 初始遊戲狀態
const initialGameState = {
  currentChapter: null,
  choices: [],
  isLoadingText: false,
  showChoices: false,
  showProceedToChoicesButton: false,
  characterStats: {
    strength: 1,
    intelligence: 1,
    agility: 1,
    strengthAccumulation: 0,
    intelligenceAccumulation: 0,
    agilityAccumulation: 0,
  },
  userPathHistory: [],
  timeLeft: 0,
  timerActive: false,
};

export const useGameState = () => {
  const [gameState, dispatch] = useReducer(gameStateReducer, initialGameState);
  const [error, setError] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadMessage, setLoadMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [chapterChoiceStats, setChapterChoiceStats] = useState({});
  const [isPathHistoryVisible, setIsPathHistoryVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // 角色創建相關狀態
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [allocatedPoints, setAllocatedPoints] = useState({
    strength: 0,
    intelligence: 0,
    agility: 0
  });

  // 計算剩餘能力點數
  const remainingPoints = useMemo(() => {
    const totalAllocated = allocatedPoints.strength + allocatedPoints.intelligence + allocatedPoints.agility;
    return INITIAL_STAT_POINTS - totalAllocated;
  }, [allocatedPoints]);

  // 計算當前載入和保存限制
  const getCurrentLimits = useCallback((userProfile) => ({
    loadLimit: userProfile?.isVIP ? VIP_LOAD_LIMIT : DEFAULT_LOAD_LIMIT,
    saveLimit: userProfile?.isVIP ? VIP_SAVE_LIMIT : DEFAULT_SAVE_LIMIT,
  }), []);

  // 更新遊戲狀態
  const updateGameState = useCallback((type, payload) => {
    dispatch({ type, payload });
  }, []);

  // 設置當前章節
  const setCurrentChapter = useCallback((chapter) => {
    dispatch({ type: 'SET_CURRENT_CHAPTER', payload: chapter });
  }, []);

  // 設置選擇
  const setChoices = useCallback((choices) => {
    dispatch({ type: 'SET_CHOICES', payload: choices });
  }, []);

  // 設置文本載入狀態
  const setIsLoadingText = useCallback((isLoading) => {
    dispatch({ type: 'SET_LOADING_TEXT', payload: isLoading });
  }, []);

  // 設置選擇顯示狀態
  const setShowChoices = useCallback((show) => {
    dispatch({ type: 'SET_SHOW_CHOICES', payload: show });
  }, []);

  // 設置繼續按鈕顯示狀態
  const setShowProceedButton = useCallback((show) => {
    dispatch({ type: 'SET_SHOW_PROCEED_BUTTON', payload: show });
  }, []);

  // 更新角色能力值
  const updateCharacterStats = useCallback((statGain) => {
    dispatch({ type: 'UPDATE_CHARACTER_STATS', payload: statGain });
  }, []);

  // 設置角色能力值
  const setCharacterStats = useCallback((stats) => {
    dispatch({ type: 'SET_CHARACTER_STATS', payload: stats });
  }, []);

  // 設置用戶路徑歷史
  const setUserPathHistory = useCallback((history) => {
    dispatch({ type: 'SET_USER_PATH_HISTORY', payload: history });
  }, []);

  // 新增路徑記錄
  const addToPathHistory = useCallback((pathItem) => {
    dispatch({ type: 'ADD_TO_PATH_HISTORY', payload: pathItem });
  }, []);

  // 設置計時器狀態
  const setTimerState = useCallback((timerState) => {
    dispatch({ type: 'SET_TIMER_STATE', payload: timerState });
  }, []);

  // 重置遊戲狀態
  const resetGameState = useCallback(() => {
    dispatch({ type: 'RESET_GAME_STATE' });
    setError(null);
    setSaveMessage('');
    setLoadMessage('');
    setIsSaving(false);
    setIsLoadingSave(false);
    setChapterChoiceStats({});
    setIsPathHistoryVisible(false);
    setFeedbackText('');
    setFeedbackMessage('');
    setShowCharacterCreation(true);
    setAllocatedPoints({ strength: 0, intelligence: 0, agility: 0 });
  }, []);

  // 處理能力點數分配
  const handleStatChange = useCallback((statName, amount) => {
    setAllocatedPoints(prev => {
      const currentStatBase = gameState.characterStats[statName];
      const newStatValueAfterAllocation = currentStatBase + prev[statName] + amount;
      
      if (remainingPoints - amount >= 0 && newStatValueAfterAllocation >= 1) {
        return {
          ...prev,
          [statName]: prev[statName] + amount
        };
      }
      return prev;
    });
  }, [gameState.characterStats, remainingPoints]);

  // 確認能力值分配
  const confirmStatAllocation = useCallback(() => {
    if (remainingPoints === 0) {
      const newStats = {
        ...gameState.characterStats,
        strength: gameState.characterStats.strength + allocatedPoints.strength,
        intelligence: gameState.characterStats.intelligence + allocatedPoints.intelligence,
        agility: gameState.characterStats.agility + allocatedPoints.agility,
      };
      
      setCharacterStats(newStats);
      setShowCharacterCreation(false);
      setAllocatedPoints({ strength: 0, intelligence: 0, agility: 0 });
      return true;
    }
    
    setError(`請分配所有 ${INITIAL_STAT_POINTS} 點。剩餘點數：${remainingPoints}`);
    return false;
  }, [remainingPoints, gameState.characterStats, allocatedPoints, setCharacterStats]);

  // 檢查選擇是否可用
  const isChoiceAvailable = useCallback((choice) => {
    if (!choice.requiredStats) return true;
    
    for (const stat in choice.requiredStats) {
      if ((gameState.characterStats[stat] === undefined || 
           gameState.characterStats[stat] < choice.requiredStats[stat])) {
        return false;
      }
    }
    return true;
  }, [gameState.characterStats]);

  // 獲取選擇要求和獲益文字
  const getChoiceRequirementAndGainText = useCallback((choice) => {
    const parts = [];
    
    if (choice.requiredStats) {
      const requirements = [];
      for (const stat in choice.requiredStats) {
        requirements.push(
          `${stat === 'strength' ? '力量' : 
             stat === 'intelligence' ? '智力' : '敏捷'}: ${choice.requiredStats[stat]}`
        );
      }
      if (requirements.length > 0) parts.push(`需要 ${requirements.join(', ')}`);
    }
    
    if (choice.statGain) {
      const gains = [];
      if (choice.statGain.strengthIncrease) gains.push(`力量提升 +${choice.statGain.strengthIncrease}`);
      if (choice.statGain.intelligenceIncrease) gains.push(`智力提升 +${choice.statGain.intelligenceIncrease}`);
      if (choice.statGain.agilityIncrease) gains.push(`敏捷提升 +${choice.statGain.agilityIncrease}`);
      if (choice.statGain.strengthAccumulation) gains.push(`力量點數進度 +${choice.statGain.strengthAccumulation}`);
      if (choice.statGain.intelligenceAccumulation) gains.push(`智力點數進度 +${choice.statGain.intelligenceAccumulation}`);
      if (choice.statGain.agilityAccumulation) gains.push(`敏捷點數進度 +${choice.statGain.agilityAccumulation}`);
      
      if (gains.length > 0) parts.push(gains.join(', '));
    }
    
    return parts.length > 0 ? `[${parts.join(' ')}]` : '';
  }, []);

  // 清除錯誤
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 清除訊息
  const clearMessages = useCallback(() => {
    setSaveMessage('');
    setLoadMessage('');
    setFeedbackMessage('');
  }, []);

  return {
    // 狀態
    ...gameState,
    error,
    saveMessage,
    loadMessage,
    isSaving,
    isLoadingSave,
    chapterChoiceStats,
    isPathHistoryVisible,
    feedbackText,
    feedbackMessage,
    showCharacterCreation,
    allocatedPoints,
    remainingPoints,
    
    // 狀態操作
    setError,
    setSaveMessage,
    setLoadMessage,
    setIsSaving,
    setIsLoadingSave,
    setChapterChoiceStats,
    setIsPathHistoryVisible,
    setFeedbackText,
    setFeedbackMessage,
    setShowCharacterCreation,
    
    // 遊戲操作
    updateGameState,
    setCurrentChapter,
    setChoices,
    setIsLoadingText,
    setShowChoices,
    setShowProceedButton,
    updateCharacterStats,
    setCharacterStats,
    setUserPathHistory,
    addToPathHistory,
    setTimerState,
    resetGameState,
    handleStatChange,
    confirmStatAllocation,
    
    // 輔助函數
    isChoiceAvailable,
    getChoiceRequirementAndGainText,
    getCurrentLimits,
    clearError,
    clearMessages,
    
    // 常數
    INITIAL_STAT_POINTS,
    STAT_ACCUMULATION_THRESHOLD,
  };
};

export default useGameState;