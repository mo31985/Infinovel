/* global __app_id, __firebase_config, __initial_auth_token */
// Note: __api_key is now handled internally within generateNextChapter function based on instructions.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  signInWithCustomToken, // 這個可能暫時用不到，但保留無妨
  GoogleAuthProvider, signInWithPopup // 引入 Google 登入相關模組
} from 'firebase/auth'; 
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, collection, addDoc, deleteDoc } from 'firebase/firestore';

// 定義載入和保存的限制常量
const DEFAULT_LOAD_LIMIT = 5; // 普通用戶的載入次數上限
const DEFAULT_SAVE_LIMIT = 3; // 普通用戶的保存次數上限
const VIP_LOAD_LIMIT = 20; // VIP 用戶的載入次數上限
const VIP_SAVE_LIMIT = 10; // VIP 用戶的保存次數上限
const INITIAL_STAT_POINTS = 10; // 角色創建時可分配的初始能力點數
const STAT_ACCUMULATION_THRESHOLD = 3; // 每累計3點提升1點能力值
const [showAuthModal, setShowAuthModal] = useState(false); // 控制登入/註冊彈窗顯示
const [isRegisterMode, setIsRegisterMode] = useState(false); // 控制彈窗顯示註冊還是登入模式
const [email, setEmail] = useState(''); // Email 輸入
const [password, setPassword] = useState(''); // 密碼輸入
const [authError, setAuthError] = useState(''); // 認證錯誤訊息
const [statPoints, setStatPoints] = useState(INITIAL_STAT_POINTS); // 用於分配的能力點數
const [stats, setStats] = useState({ // 實際的能力值
  strength: 0,
  agility: 0,
  intelligence: 0,
  luck: 0,
  endurance: 0,
});

// 從全局作用域獲取應用程式 ID，並設置回退機制
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'infinovel';

// 從 Canvas 環境提供的全局變數獲取 Firebase 配置，並安全地解析
const FIREBASE_CONFIG = (() => {
  console.log("--- Firebase Config Initialization ---");
  console.log("Raw __firebase_config:", typeof __firebase_config, __firebase_config);
  
  if (typeof __firebase_config === 'string' && __firebase_config.trim() !== '') {
    try {
      const parsedConfig = JSON.parse(__firebase_config);
      console.log("Parsed FIREBASE_CONFIG:", parsedConfig);
      // Explicitly log the project ID for debugging Firebase Auth issues
      console.log("FIREBASE_CONFIG Project ID (用於調試):", parsedConfig.projectId); 
      return parsedConfig;
    } catch (e) {
      console.error("Error parsing __firebase_config (likely invalid JSON or empty string):", e);
      console.log("FIREBASE_CONFIG set to empty object due to parsing error.");
      return {};
    }
  }
  console.warn("__firebase_config is not a valid non-empty string. Firebase will initialize with an empty config, likely failing.");
  return {};
})();
console.log("應用程式正在使用 Canvas 環境提供的 Firebase 配置。");


// 定義初始故事上下文 (現在作為常量，直接可用)
const initialStoryData = {
  chapterId: 'intro_chapter_1', // 提供一個明確的初始 chapterId
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  content: [
    '在維多利亞時代的倫敦，蒸汽機的轟鳴聲與古老魔法的低語交織。這個城市既是科技的巔峰，也是神秘事件的溫床。艾倫偵探，一位以敏銳洞察力和對超自然現象的獨特理解而聞名的私家偵探，此時正坐在他那間瀰漫著煙草味的辦公室裡。他的風衣搭在椅背上，桌上堆滿了未解的卷宗和一杯冷掉的紅茶。艾倫雖然恐高，卻總是被捲入與高處相關的案件，這成了他職業生涯中一個奇特的諷刺。',
    '窗外，倫敦特區永不散去的蒸汽迷霧像一條巨龍般盤踞，吞噬著光線與聲音。一封緊急電報打破了清晨的寧靜，電報來自泰晤士河畔的皇家科學院，內容簡潔而令人不安：著名發明家維克多·格雷森博士離奇失蹤了。格雷森博士以其在「時間機械」領域的突破性研究而聞名，他的失蹤無疑將引發巨大波瀾。',
    '艾倫抵達格雷森博士的實驗室，那裡一片狼藉，精密齒輪和扭曲的電線散落一地，空氣中瀰漫著臭氧和燒焦金屬的氣味。這不是普通的失竊，更像是一場混亂的搏鬥，或是某種實驗失控。在凌亂的書桌上，艾倫的目光被一張被壓在厚重機械手稿下的紙條吸引。上面潦草地寫著一行字：「時鐘塔，午夜，等待。」字跡扭曲，似乎在極度恐懼或倉促中寫下。',
    '艾倫皺起了眉頭。時鐘塔，城市的地標，也是時間守護者組織的秘密據點之一。這張紙條是格雷森博士留下的最後線索嗎？還是某種精心設計的陷阱？他必須做出決定，這將引導他走向倫敦最深處的秘密。',
  ],
  choices: [
    // 初始選擇不設定能力值要求，確保遊戲能開始
    { text: '立即前往時鐘塔，看看午夜有什麼在等待。', choiceId: 'to_clock_tower' },
    { text: '先仔細調查格雷森博士的實驗室，尋找更多隱藏線索。', choiceId: 'investigate_lab_thoroughly' },
    { text: '回到辦公室，研究格雷森博士的背景資料和「時間機械」的理論。', choiceId: 'research_grayson_background' },
  ],
  isTimedChoice: false, // 初始章節不限時
  timeLimit: 0,
};

function App() {
  // --- 狀態變數聲明 ---
  const [currentChapter, setCurrentChapter] = useState(null);
  const [choices, setChoices] = useState([]);
  const [isLoadingText, setIsLoadingText] = useState(false); // 文本生成載入狀態
  const [userId, setUserId] = useState('載入中...');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // 表示 Firebase 身份驗證是否已完成其初始檢查
  const [error, setError] = useState(null); // 錯誤狀態
  const [saveMessage, setSaveMessage] = useState(''); // 保存進度訊息
  const [loadMessage, setLoadMessage] = useState(''); // 載入進度訊息
  const [isSaving, setIsSaving] = useState(false); // 保存中狀態
  const [isLoadingSave, setIsLoadingSave] = useState(false); // 載入保存狀態
  const [chapterChoiceStats, setChapterChoiceStats] = useState({}); // 儲存當前章節的選擇統計
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // 標記初始數據（故事或進度）是否已載入

  // 應用程式的整體載入狀態，控制全螢幕載入畫面
  const [loading, setLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true); // 控制歡迎畫面顯示

  // 用戶資料狀態，包含載入/保存計數和 VIP 狀態
  const [userProfile, setUserProfile] = useState({
    loadCount: 0,
    saveCount: 0,
    isVIP: false,
    isRegistered: false, // 新增：是否為註冊用戶
    email: null, // 新增：註冊用戶的電子郵件
  });
  // 當前用戶的載入和保存限制，根據 VIP 狀態動態設定
  const [currentLoadLimit, setCurrentLoadLimit] = useState(DEFAULT_LOAD_LIMIT);
  const [currentSaveLimit, setCurrentSaveLimit] = useState(DEFAULT_SAVE_LIMIT);

  const [currentUser, setCurrentUser] = useState(null);
  const [userDocRef, setUserDocRef] = useState(null);
  // 角色能力值狀態 (移除 XP 和 Level 相關屬性)
  const [characterStats, setCharacterStats] = useState({
    strength: 1, // 基礎值
    intelligence: 1, // 基礎值
    agility: 1, // 基礎值
    strengthAccumulation: 0, // 力量累計點數
    intelligenceAccumulation: 0, // 智力累計點數
    agilityAccumulation: 0, // 敏捷累計點數
  });

  // 用於儲存用戶已選擇的路徑歷史及每個選擇的全球統計
  const [userPathHistory, setUserPathHistory] = useState([]);
  // 控制故事軌跡區塊的顯示/隱藏
  const [isPathHistoryVisible, setIsPathHistoryVisible] = useState(false); 

  // 角色創建界面專用狀態
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [allocatedPoints, setAllocatedPoints] = useState({
    strength: 0,
    intelligence: 0,
    agility: 0
  });
  const totalAllocated = allocatedPoints.strength + allocatedPoints.intelligence + allocatedPoints.agility;
  const remainingPoints = INITIAL_STAT_POINTS - totalAllocated;

  // 限時選擇相關狀態
  const [timeLeft, setTimeLeft] = useState(0); // 倒數計時剩餘時間
  const [timerActive, setTimerActive] = useState(false); // 計時器是否活躍
  const timerRef = useRef(null); // 用於儲存 setInterval 的 ID
  const [showChoices, setShowChoices] = useState(false); // 控制選項的顯示
  const [showProceedToChoicesButton, setShowProceedToChoicesButton] = useState(false); // 新增：控制「繼續」按鈕的顯示

  // 回饋功能相關狀態
  const [feedbackText, setFeedbackText] = useState(''); // 回饋文本
  const [feedbackMessage, setFeedbackMessage] = useState(''); // 回饋提交訊息

  // 重新開始遊戲確認彈窗
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // 帳戶系統相關狀態
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [authMessage, setAuthMessage] = useState(''); // 認證操作訊息
  const [authError, setAuthError] = useState(''); // 認證錯誤訊息

  // --- Helper function for getting unique chapter ID ---
  const getCurrentChapterUniqueId = useCallback((chapter) => {
    if (chapter && typeof chapter.chapterId === 'string' && chapter.chapterId.length > 0) {
      return chapter.chapterId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    }
    let baseId = '';
    const sanitizeId = (str) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); 
    if (chapter) {
      let titlePart = chapter.title ? sanitizeId(chapter.title.substring(0, Math.min(chapter.title.length, 30))) : '';
      let contentPart = (chapter.content && chapter.content.length > 0 && chapter.content[0])
        ? sanitizeId(chapter.content[0].substring(0, Math.min(chapter.content[0].length, 30)))
        : '';
      baseId = `${titlePart}_${contentPart}`.replace(/^_|_$/g, '');
    }
    if (baseId.length === 0) {
      baseId = 'auto_gen';
    }
    return `${baseId}_${Date.now()}`;
  }, []);

  // --- 從 Firestore 載入進度 ---
  const loadProgress = useCallback(async (isManualLoad = false) => {
    if (!db || !auth || !auth.currentUser) {
      setError('無法載入進度：未登入。');
      setLoadMessage('無法載入進度。');
      setTimeout(() => setLoadMessage(''), 3000);
      return false;
    }
    setIsLoadingSave(true);
    setLoadMessage('正在載入進度...');
    setError(null);

    const userUid = auth.currentUser.uid;
    const saveDocRef = doc(db, `artifacts/${APP_ID}/users/${userUid}/saved_stories`, 'main_story');
    const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userUid}/profile`, 'user_data');

    try {
      const currentProfileSnap = await getDoc(profileDocRef);
      const currentProfileData = currentProfileSnap.exists() ? currentProfileSnap.data() : userProfile;
      const currentLoadCount = currentProfileData.loadCount || 0;
      const currentCalculatedLoadLimit = currentProfileData.isVIP ? VIP_LOAD_LIMIT : DEFAULT_LOAD_LIMIT;

      if (isManualLoad && currentLoadCount >= currentCalculatedLoadLimit) {
        setError(`您已達到載入次數上限 (${currentCalculatedLoadLimit} 次)。`);
        setLoadMessage('載入失敗：達到上限。');
        return false;
      }

      const docSnap = await getDoc(saveDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.currentChapterState) {
          setCurrentChapter(data.currentChapterState);
          setChoices(data.currentChapterState.choices || []);
          setShowProceedToChoicesButton(true);
          setShowChoices(false);

          setCharacterStats(data.characterStats || { 
            strength: 1, intelligence: 1, agility: 1, 
            strengthAccumulation: 0, intelligenceAccumulation: 0, agilityAccumulation: 0 
          });
          setUserPathHistory(data.userPathHistory || []); 

          setLoadMessage('進度載入成功！');
          
          if (isManualLoad) {
            await updateDoc(profileDocRef, {
              loadCount: increment(1),
              lastLoadAt: new Date()
            });
            setUserProfile(prev => ({ ...prev, loadCount: prev.loadCount + 1 }));
          }
          return true;
        } else {
          setLoadMessage('沒有找到有效的保存進度。');
          return false;
        }
      } else {
        setLoadMessage('沒有找到保存的進度。');
        return false;
      }
    } catch (err) {
      console.error("載入進度時出錯:", err);
      setError(`載入進度失敗: ${err.message}`);
      setLoadMessage('載入進度失敗！');
      return false;
    } finally {
      setIsLoadingSave(false);
      setTimeout(() => setLoadMessage(''), 3000);
    }
  }, [db, auth, userProfile]); 

  // --- 保存進度到 Firestore ---
  const saveProgress = useCallback(async (isAutoSave = false) => { // 新增 isAutoSave 參數
    if (!db || !auth || !auth.currentUser || !currentChapter) { // 確保 currentChapter 存在
      // 對於自動保存，如果沒有當前章節或未登入，則靜默失敗或只記錄錯誤
      if (isAutoSave) {
        console.warn('嘗試自動保存失敗：未登入或無當前章節數據。');
        return;
      }
      setError('無法保存進度：未登入或無當前章節數據。');
      setSaveMessage('無法保存進度。');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    if (!isAutoSave) { // 只在手動保存時更新 UI 狀態
      setIsSaving(true);
      setSaveMessage('正在保存進度...');
      setError(null);
    }

    const userUid = auth.currentUser.uid;
    const saveDocRef = doc(db, `artifacts/${APP_ID}/users/${userUid}/saved_stories`, 'main_story');
    const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userUid}/profile`, 'user_data');

    try {
      const currentProfileSnap = await getDoc(profileDocRef);
      const currentProfileData = currentProfileSnap.exists() ? currentProfileSnap.data() : userProfile;
      const currentSaveCount = currentProfileData.saveCount || 0;
      const currentCalculatedSaveLimit = currentProfileData.isVIP ? VIP_SAVE_LIMIT : DEFAULT_SAVE_LIMIT;

      if (!isAutoSave && currentSaveCount >= currentCalculatedSaveLimit) { // 只在手動保存時檢查限制
        setError(`您已達到保存次數上限 (${currentCalculatedSaveLimit} 次)。`);
        setSaveMessage('保存失敗：達到上限。');
        return;
      }

      await setDoc(saveDocRef, {
        currentChapterState: currentChapter,
        characterStats: characterStats,
        userPathHistory: userPathHistory,
        lastSavedAt: new Date(),
      }, { merge: true });

      if (!isAutoSave) { // 只在手動保存時更新計數
        await updateDoc(profileDocRef, {
          saveCount: increment(1),
          lastSaveAt: new Date()
        });
        setUserProfile(prev => ({ ...prev, saveCount: prev.saveCount + 1 }));
        setSaveMessage('進度保存成功！');
      } else {
        console.log('自動保存成功。');
      }
    } catch (err) {
      console.error("保存進度時出錯:", err);
      if (!isAutoSave) {
        setError(`保存進度失敗: ${err.message}`);
        setSaveMessage('保存進度失敗！');
      }
    } finally {
      if (!isAutoSave) { // 只在手動保存時更新 UI 狀態
        setIsSaving(false);
        setTimeout(() => setSaveMessage(''), 3000);
      }
    }
  }, [db, auth, currentChapter, characterStats, userProfile, userPathHistory]);

  // --- 載入初始章節或已保存的進度 ---
  const loadOrInitStory = useCallback(async () => {
    console.log('loadOrInitStory triggered.');

    setIsLoadingSave(true);
    setLoadMessage('正在載入您的進度...');
    setError(null);

    try {
      if (db && auth && auth.currentUser && userId !== '載入中...') {
        console.log('嘗試從 Firestore 載入已保存的進度...');
        const loaded = await loadProgress(false); // 頁面初次載入不計入次數
        if (!loaded) {
          console.log('未找到已保存的進度，進入角色創建。');
          setShowCharacterCreation(true);
          setLoadMessage('請創建您的偵探！');
        } else {
          console.log('進度已成功從 Firestore 載入。');
          setShowCharacterCreation(false);
        }
      } else {
        // 這部分代碼通常不會執行，因為loadOrInitStory只在auth.currentUser存在時觸發
        console.log('Firebase 服務未完全準備好或用戶未認證，跳過載入進度。');
        setLoadMessage('無法載入保存進度，請先登入或以訪客身份開始。');
        if (!db || !auth) {
            setError(prevError => prevError || 'Firebase 服務初始化失敗，保存/載入功能不可用。');
        } else if (!auth.currentUser) {
            setError(prevError => prevError || '用戶未登入，保存/載入功能不可用。');
        }
      }
    } catch (err) {
      console.error("在初始故事載入或初始化期間發生錯誤:", err);
      setError(`應用程式初始設定失敗: ${err.message}.`);
      setLoadMessage('初始設定失敗，請嘗試刷新頁面。');
      setShowWelcomeScreen(true); // Fallback to welcome screen on error
    } finally {
      setIsLoadingSave(false);
      setInitialDataLoaded(true);
      setLoading(false);
      setTimeout(() => setLoadMessage(''), 3000);
      console.log('初始故事載入/初始化完成。載入狀態設定為 false。');
    }
  }, [db, auth, userId, loadProgress]); 

  // 調用 LLM 生成下一章節內容
  const generateNextChapter = useCallback(async (userChoiceText, selectedChoiceId, isAutoChoice = false) => {
    setIsLoadingText(true);
    setError(null);
    setChoices([]);
    setChapterChoiceStats({});
    clearInterval(timerRef.current);
    setTimerActive(false);
    setShowChoices(false);
    setShowProceedToChoicesButton(false);
    setIsPathHistoryVisible(false);

    if (db && auth && auth.currentUser && currentChapter && selectedChoiceId) {
      const chapterUniqueId = getCurrentChapterUniqueId(currentChapter);
      const statsDocRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'choice_stats'), chapterUniqueId);

      try {
        const docSnap = await getDoc(statsDocRef);
        let chosenChoicePercentage = 'N/A';
        if (docSnap.exists()) {
          const data = docSnap.data();
          const totalSelections = data.totalSelectionsForChapter || 0;
          const chosenOptionStat = (data.choices || []).find(c => c.choiceId === selectedChoiceId);
          if (chosenOptionStat && totalSelections > 0) {
            chosenChoicePercentage = ((chosenOptionStat.totalCount / totalSelections) * 100).toFixed(1);
          }
        }
        
        setUserPathHistory(prevHistory => [
            ...prevHistory,
            {
                chapterId: chapterUniqueId,
                choiceId: selectedChoiceId,
                choiceText: userChoiceText,
                percentage: chosenChoicePercentage,
                timestamp: Date.now()
            }
        ]);

        if (!docSnap.exists()) {
          const initialChoices = currentChapter.choices.map(c => ({
            choiceId: c.choiceId,
            text: c.text,
            totalCount: 0
          }));
          const selectedChoiceIndex = initialChoices.findIndex(c => c.choiceId === selectedChoiceId);
          if (selectedChoiceIndex !== -1) {
            initialChoices[selectedChoiceIndex].totalCount = 1;
          }
          await setDoc(statsDocRef, {
            chapterTitle: currentChapter.title,
            chapterContentPreview: currentChapter.content[0]?.substring(0, 100) || '',
            choices: initialChoices,
            totalSelectionsForChapter: 1,
            lastUpdated: new Date()
          });
        } else {
          const currentData = docSnap.data();
          const choicesArray = currentData.choices || [];
          let choiceFound = false;
          const updatedChoices = choicesArray.map(choice => {
            if (choice.choiceId === selectedChoiceId) {
              choiceFound = true;
              return { ...choice, totalCount: (choice.totalCount || 0) + 1 };
            }
            return choice;
          });

          if (!choiceFound) {
            updatedChoices.push({
              choiceId: selectedChoiceId,
              text: userChoiceText,
              totalCount: 1
            });
          }

          await updateDoc(statsDocRef, {
            choices: updatedChoices,
            totalSelectionsForChapter: increment(1),
            lastUpdated: new Date()
          });
        }
      } catch (statsErr) {
        console.error("更新選擇統計數據時出錯:", statsErr);
      }
    }

    const currentStoryContext = currentChapter ? currentChapter.content.join('\n') : '';
    const textPrompt = `
      你是一個互動式小說的作者。請根據以下故事背景、讀者的選擇和角色的當前能力值，生成下一章節的內容。
      請確保故事邏輯連貫、富有創意，並包含2到3個新的選擇點，讓讀者繼續影響故事走向。
      
      **重要提示：**
      * **故事內容中絕對不要提及角色的具體能力值或數值** (例如：不要寫「因為你力量只有5」、「智力只有2」)。故事應以敘事方式呈現能力值對事件的影響（例如，如果力量高，則輕鬆拿起重物；如果智力低，則難以理解複雜線索）。
      * 每個場景中，**至少要有一個選擇是不需要任何能力值限制的** (即該選擇的 requiredStats 屬性應被省略)，以確保玩家總能繼續遊戲，特別是在限時選擇中，這將是時間用盡時的預設選項。
      * 某些選擇會導致角色能力值或累計點數的變化。
      * 如果一個選擇會直接增加能力值 (力量、智力、敏捷)，請在該選擇的 "statGain" 物件中指定正數值（例如：{"strengthIncrease": 1}）。
      * 如果一個選擇會增加能力值的累計點數，請在 "statGain" 中使用 "strengthAccumulation"、"intelligenceAccumulation" 或 "agilityAccumulation" 並指定正數值（例如：{"intelligenceAccumulation": 2}）。請注意，當累計點數達到閾值時，能力值會自動增加，並重置累計點數。
      * 這些能力值的增減應該與選擇的內容和行動類型保持**高度合理性**。請參考以下能力值與動作的關聯：
        * **力量 (Strength):** 用於物理上的蠻力、舉重、推動、破壞障礙、直接對抗等。
        * **智力 (Intelligence)::** 用於邏輯推理、解謎、分析線索、理解複雜機制、使用知識、與人談判中的智慧應對等。
        * **敏捷 (Agility):** 用於身體的靈活度、速度、平衡、躲避、精準操作、開鎖、潛行、規避陷阱等。
      * **關於限時選擇:** 除非故事情節**強烈要求**緊張感、生死攸關的時刻或需要快速反應的情況，否則請**不要**使用限時選擇。大部分選擇應該是沒有時間限制的。如果情節確實需要限時選擇，請在 JSON 頂層包含 **"isTimedChoice": true** 和 **"timeLimit": <秒數>**。在這種情況下，請確保至少有一個選擇是**無能力值限制**的，並且其內容應當是當時間用盡時會發生的預設或被動結果。

      故事背景（上一章節內容）：
      ${currentStoryContext}

      讀者的選擇是：
      ${userChoiceText}

      角色當前能力值：力量 ${characterStats.strength}, 智力 ${characterStats.intelligence}, 敏捷 ${characterStats.agility}
      （這些能力值僅供你參考，用於生成合理的選擇和情節，但請不要在故事內容中直接輸出它們的數值。）

      請以 JSON 格式返回下一章節的標題、內容（多個段落組成的陣列）和新的選擇（每個選擇包含 text, choiceId, 一個可選的 requiredStats 物件，以及一個可選的 statGain 物件）。
      如果一個選擇需要特定能力值才能被選中，請在 requiredStats 物件中指定。
      如果沒有能力值要求或能力值增益，請省略 requiredStats 或 statGain 屬性。
      如果故事可以結束，則 choices 陣列為空。

      JSON 格式範例：
      {
        "chapterId": "new_chapter_id",
        "title": "新章節標題",
        "content": [
          "第一段內容...",
          "第二段內容..."
        ],
        "isTimedChoice": true, // 新增：是否為限時選擇
        "timeLimit": 30, // 新增：時間限制（秒）
        "choices": [
          {"text": "選擇一的文字", "choiceId": "choice_id_1", "requiredStats": {"strength": 10}, "statGain": {"strengthIncrease": 1}}, // 直接增加力量
          {"text": "選擇二的文字", "choiceId": "choice_id_2"}, // 無要求，無增益，這將是時間用盡時的預設選項
          {"text": "選擇三的文字", "choiceId": "choice_id_3", "statGain": {"intelligenceAccumulation": 2}} // 增加智力累計點數
        ]
      }
    `;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: textPrompt }] });

    // API key for Gemini models. If not provided by the environment, it defaults to an empty string.
    // This allows Canvas to inject the key at runtime for default models.
    const apiKey = ""; // 環境未提供 API 金鑰，預設為空字串

    const textPayload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "chapterId": { "type": "STRING" },
            "title": { "type": "STRING" },
            "content": {
              "type": "ARRAY",
              "items": { "type": "STRING" }
            },
            "isTimedChoice": { "type": "BOOLEAN" },
            "timeLimit": { "type": "NUMBER" },
            "choices": {
              "type": "ARRAY",
              "items": {
                "type": "OBJECT",
                "properties": {
                  "text": { "type": "STRING" },
                  "choiceId": { "type": "STRING" },
                  "requiredStats": {
                    "type": "OBJECT",
                    "properties": {
                      "strength": {"type": "NUMBER"},
                      "intelligence": {"type": "NUMBER"},
                      "agility": {"type": "NUMBER"}
                    }
                  },
                  "statGain": {
                    "type": "OBJECT",
                    "properties": {
                      "strengthIncrease": {"type": "NUMBER"},
                      "intelligenceIncrease": {"type": "NUMBER"},
                      "agilityIncrease": {"type": "NUMBER"},
                      "strengthAccumulation": {"type": "NUMBER"},
                      "intelligenceAccumulation": {"type": "NUMBER"},
                      "agilityAccumulation": {"type": "NUMBER"},
                    }
                  }
                },
                "propertyOrdering": ["text", "choiceId", "requiredStats", "statGain"]
              }
            }
          },
          "propertyOrdering": ["chapterId", "title", "content", "isTimedChoice", "timeLimit", "choices"]
        }
      }
    };

    const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const textResponse = await fetch(textApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textPayload) // FIX: Changed from 'payload' to 'textPayload'
      });

      if (!textResponse.ok) {
        const errorData = await textResponse.json();
        throw new Error(`文本 API 請求失敗，狀態碼: ${textResponse.status} - ${errorData.error?.message || textResponse.statusText}. 請確保您已在 Google Cloud Console 中啟用 Generative Language API。`);
      }

      const textResult = await textResponse.json();
      console.log('LLM Text Raw Result:', textResult);

      let parsedChapter = null;
      if (textResult.candidates && textResult.candidates.length > 0 &&
          textResult.candidates[0].content && textResult.candidates[0].content.parts &&
          textResult.candidates[0].content.parts.length > 0) {
        const jsonText = textResult.candidates[0].content.parts[0].text;
        parsedChapter = JSON.parse(jsonText);
        
        if (!parsedChapter.chapterId) {
            parsedChapter.chapterId = getCurrentChapterUniqueId(parsedChapter);
        }
        setCurrentChapter(parsedChapter);
        setChoices(parsedChapter.choices || []);
        setShowProceedToChoicesButton(true);

        // --- 自動保存最新進度 ---
        await saveProgress(true); // 呼叫自動儲存，不計入次數
        // --- 自動保存結束 ---

      } else {
        setError('LLM 文本回應格式不正確或內容缺失。');
        setCurrentChapter({
          title: '生成失敗',
          content: ['抱歉，AI 在生成下一章節文本時遇到問題。請重試或選擇其他選項。'],
          choices: [],
          isTimedChoice: false,
          timeLimit: 0,
        });
        setChoices([]);
        setShowChoices(true);
        setShowProceedToChoicesButton(false);
      }
    } catch (err) {
      console.error("生成章節時發生錯誤:", err);
      setError(`生成章節時發生錯誤: ${err.message}. 請檢查控制台獲取更多詳細信息。`);
      setCurrentChapter({
        title: '生成失敗',
        content: ['抱歉，AI 在生成下一章節時遇到問題。請重試或選擇其他選項。'],
        choices: [],
        isTimedChoice: false,
        timeLimit: 0,
      });
      setChoices([]);
      setShowChoices(true);
      setShowProceedToChoicesButton(false);
    } finally {
      setIsLoadingText(false);
    }
  }, [db, auth, currentChapter, characterStats, getCurrentChapterUniqueId, saveProgress]); // 將 saveProgress 加入依賴

  // 處理讀者選擇
  const handleChoice = (choiceText, choiceId) => {
    clearInterval(timerRef.current);
    setTimerActive(false);
    setShowChoices(false);
    setShowProceedToChoicesButton(false);

    const chosenOption = choices.find(c => c.choiceId === choiceId);
    if (chosenOption && chosenOption.statGain) {
        setCharacterStats(prevStats => {
            const newStats = { ...prevStats };

            if (chosenOption.statGain.strengthIncrease) {
                newStats.strength = Math.max(1, (newStats.strength || 0) + chosenOption.statGain.strengthIncrease);
            }
            if (chosenOption.statGain.intelligenceIncrease) {
                newStats.intelligence = Math.max(1, (newStats.intelligence || 0) + chosenOption.statGain.intelligenceIncrease);
            }
            if (chosenOption.statGain.agilityIncrease) {
                newStats.agility = Math.max(1, (newStats.agility || 0) + chosenOption.statGain.agilityIncrease);
            }

            if (chosenOption.statGain.strengthAccumulation) {
                let newAcc = (newStats.strengthAccumulation || 0) + chosenOption.statGain.strengthAccumulation;
                newStats.strength += Math.floor(newAcc / STAT_ACCUMULATION_THRESHOLD);
                newStats.strengthAccumulation = newAcc % STAT_ACCUMULATION_THRESHOLD;
            }
            if (chosenOption.statGain.intelligenceAccumulation) {
                let newAcc = (newStats.intelligenceAccumulation || 0) + chosenOption.statGain.intelligenceAccumulation;
                newStats.intelligence += Math.floor(newAcc / STAT_ACCUMULATION_THRESHOLD);
                newStats.intelligenceAccumulation = newAcc % STAT_ACCUMULATION_THRESHOLD;
            }
            if (chosenOption.statGain.agilityAccumulation) {
                let newAcc = (newStats.agilityAccumulation || 0) + chosenOption.statGain.agilityAccumulation;
                newStats.agility += Math.floor(newAcc / STAT_ACCUMULATION_THRESHOLD);
                newStats.agilityAccumulation = newAcc % STAT_ACCUMULATION_THRESHOLD;
            }

            return newStats;
        });
    }
    generateNextChapter(choiceText, choiceId);
  };

  // 處理點擊「繼續」按鈕
  const handleProceedToChoices = useCallback(() => {
    setShowProceedToChoicesButton(false);
    setShowChoices(true);

    if (currentChapter && currentChapter.isTimedChoice && currentChapter.timeLimit > 0) {
      setTimeLeft(currentChapter.timeLimit);
      setTimerActive(true);

      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            const defaultChoice = currentChapter.choices.find(c => !c.requiredStats);
            if (defaultChoice) {
              console.log('時間用盡，自動選擇預設選項:', defaultChoice.text);
              generateNextChapter(defaultChoice.text, defaultChoice.choiceId, true);
            } else {
              setError('時間用盡，但沒有找到無限制的預設選項！故事可能卡關。');
              setCurrentChapter({
                title: '故事中止',
                content: ['因為時間耗盡且沒有預設選項，故事無法繼續。'],
                choices: [],
                isTimedChoice: false,
                timeLimit: 0,
              });
              setChoices([]);
              setShowChoices(true);
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
  }, [currentChapter, generateNextChapter]);

  // 檢查選擇是否可用 (根據能力值要求)
  const isChoiceAvailable = (choice) => {
    if (!choice.requiredStats) {
      return true;
    }
    for (const stat in choice.requiredStats) {
      if ((characterStats[stat] === undefined || characterStats[stat] < choice.requiredStats[stat])) {
        return false;
      }
    }
    return true;
  };

  // 獲取選擇的提示文字
  const getChoiceRequirementAndGainText = (choice) => {
    const parts = [];
    if (choice.requiredStats) {
      const requirements = [];
      for (const stat in choice.requiredStats) {
        requirements.push(`${stat === 'strength' ? '力量' : stat === 'intelligence' ? '智力' : '敏捷'}: ${choice.requiredStats[stat]}`);
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
  };

  // 處理能力點數分配 (角色創建時)
  const handleStatChange = (statName, amount) => {
    setAllocatedPoints(prev => {
      const currentStatBase = characterStats[statName];
      const newStatValueAfterAllocation = currentStatBase + prev[statName] + amount;
      if (remainingPoints - amount >= 0 && newStatValueAfterAllocation >= 1) {
        return {
          ...prev,
          [statName]: prev[statName] + amount
        };
      }
      return prev;
    });
  };

  // 確認能力值並開始故事
  const handleConfirmStats = () => {
    if (remainingPoints === 0) {
      setCharacterStats(prevStats => ({
        ...prevStats,
        strength: prevStats.strength + allocatedPoints.strength,
        intelligence: prevStats.intelligence + allocatedPoints.intelligence,
        agility: prevStats.agility + allocatedPoints.agility,
        strengthAccumulation: 0, 
        intelligenceAccumulation: 0,
        agilityAccumulation: 0,
      }));
      setShowCharacterCreation(false);
      setShowWelcomeScreen(false); // 隱藏歡迎畫面
      setCurrentChapter(initialStoryData);
      setChoices(initialStoryData.choices || []);
      setShowProceedToChoicesButton(true);
      setIsPathHistoryVisible(false);
      // 首次開始遊戲也觸發一次自動保存
      saveProgress(true);
    } else {
      setError(`請分配所有 ${INITIAL_STAT_POINTS} 點。剩餘點數：${remainingPoints}`);
    }
  };

  // 處理回饋提交
  const handleFeedbackSubmit = async () => {
    if (!db || !auth || !auth.currentUser) {
      setFeedbackMessage('請登入以提交回饋。');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    if (!feedbackText.trim()) {
      setFeedbackMessage('回饋內容不能為空。');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }

    setFeedbackMessage('正在提交回饋...');
    setError(null);

    const userUid = auth.currentUser.uid;
    const feedbackCollectionRef = collection(db, `artifacts/${APP_ID}/public/data/feedback`);

    try {
      await addDoc(feedbackCollectionRef, {
        userId: userUid,
        feedbackText: feedbackText,
        chapterId: currentChapter ? currentChapter.chapterId : 'initial_load',
        timestamp: Date.now(),
      });
      setFeedbackMessage('回饋提交成功！感謝您的寶貴意見。');
    } catch (err) {
      console.error("提交回饋時出錯:", err);
      setFeedbackMessage(`提交回饋失敗: ${err.message}`);
    } finally {
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  // 處理重新開始遊戲
  const handleRestartGame = useCallback(async () => {
    if (!db || !auth || !auth.currentUser) {
      setError('無法重新開始遊戲：未登入。');
      return;
    }

    const userUid = auth.currentUser.uid;
    const saveDocRef = doc(db, `artifacts/${APP_ID}/users/${userUid}/saved_stories`, 'main_story');
    const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userUid}/profile`, 'user_data');

    try {
      await deleteDoc(saveDocRef);
      console.log('Saved story deleted.');

      await setDoc(profileDocRef, {
        loadCount: 0,
        saveCount: 0,
        isVIP: userProfile.isVIP,
        lastRestartAt: new Date(),
      }, { merge: true });
      setUserProfile(prev => ({ ...prev, loadCount: 0, saveCount: 0 }));

      setCurrentChapter(null);
      setChoices([]);
      setIsLoadingText(false);
      setError(null);
      setSaveMessage('');
      setLoadMessage('');
      setIsSaving(false);
      setIsLoadingSave(false);
      setChapterChoiceStats({});
      setInitialDataLoaded(false);
      setCharacterStats({
        strength: 1,
        intelligence: 1,
        agility: 1,
        strengthAccumulation: 0,
        intelligenceAccumulation: 0,
        agilityAccumulation: 0,
      });
      setUserPathHistory([]);
      setIsPathHistoryVisible(false);
      setShowCharacterCreation(true);
      setAllocatedPoints({ strength: 0, intelligence: 0, agility: 0 });
      setTimeLeft(0);
      setTimerActive(false);
      clearInterval(timerRef.current);
      setShowChoices(false);
      setShowProceedToChoicesButton(false);
      setFeedbackText('');
      setFeedbackMessage('遊戲已重新開始，所有進度已清除！');
      
      setShowRestartConfirm(false);

    } catch (err) {
      console.error("重新開始遊戲時出錯:", err);
      setError(`重新開始遊戲失敗: ${err.message}`);
      setLoadMessage('重新開始失敗！');
      setShowRestartConfirm(false);
    } finally {
      setTimeout(() => setLoadMessage(''), 3000);
      setLoading(false);
    }
  }, [db, auth, userProfile]);

  // --- 身份驗證處理 ---
  const handleAuthSubmit = async () => {
    console.log(`handleAuthSubmit triggered. AuthMode: ${authMode}, Email: ${userEmail}`);
    console.log('Firebase Auth object status:', auth ? 'initialized' : 'null');

    if (!auth) {
      setAuthError('Firebase 認證服務未準備好，無法執行登入/註冊。');
      console.warn('Authentication attempt blocked: Auth service not initialized.');
      return;
    }
    if (!userEmail.trim() || !userPassword.trim()) { // Check for trimmed strings
      setAuthError('請輸入有效的電子郵件和密碼。');
      console.warn('Authentication attempt blocked: Missing email or password (trimmed).');
      return;
    }
    
    setAuthMessage('處理中...');
    setAuthError(''); // 清除之前的錯誤訊息
    console.log(`Attempting to ${authMode === 'register' ? 'register' : 'log in'} with email: ${userEmail}`);
    
    try {
      if (authMode === 'register') {
        console.log('Calling createUserWithEmailAndPassword...');
        const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
        console.log('createUserWithEmailAndPassword successful. User:', userCredential.user);
        setAuthMessage('註冊成功！您已自動登入。');
      } else { // login
        console.log('Calling signInWithEmailAndPassword...');
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
        console.log('signInWithEmailAndPassword successful. User:', userCredential.user);
        setAuthMessage('登入成功！');
      }
      setShowAuthModal(false); // 成功後關閉模態框
      setUserPassword(''); // 清除密碼
      // onAuthStateChanged 會處理後續的界面狀態更新，如隱藏歡迎畫面等
      setInitialDataLoaded(false); // 重置此狀態以確保 loadOrInitStory 被觸發
      console.log('Auth operation successful, modal closed, password cleared, initialDataLoaded reset.');

    } catch (err) {
      console.error("Authentication failed (catch block):", err.code, err.message);
      let errorMessage = '認證失敗。';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = '該電子郵件已被註冊。請直接登入或使用其他電子郵件。';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = '電子郵件格式不正確。';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = '密碼強度不足，請至少輸入6個字符。';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = '電子郵件或密碼不正確。';
      } else if (err.code === 'auth/operation-not-allowed') {
        // Updated error message to be more helpful
        errorMessage = `此認證操作未啟用。請前往 Firebase Console (專案 ID: ${FIREBASE_CONFIG.projectId}) -> Build (建置) -> Authentication (身份驗證) -> Sign-in method (登入方式) -> 啟用「電子郵件/密碼」和「匿名」登入方式。`;
      }
      setAuthError(errorMessage);
      console.log('Authentication error message set to:', errorMessage);
    } finally {
      console.log('Auth attempt finished. Setting message timeouts.');
      setTimeout(() => setAuthMessage(''), 3000); // 3秒後清除成功訊息
      setTimeout(() => setAuthError(''), 5000); // 5秒後清除錯誤訊息
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout triggered.');
    if (!auth) {
      console.warn('Logout attempted but auth is not initialized.');
      return;
    }
    console.log('Attempting to log out...');
    try {
      await signOut(auth);
      // onAuthStateChanged will handle state resets and showing welcome screen
      console.log('Sign out successful, onAuthStateChanged should now handle UI reset.');
    } catch (err) {
      console.error("Logout failed:", err.code, err.message);
      setError(`登出失敗: ${err.message}`);
    }
  };

  // 處理「以訪客身份開始遊戲」
  const handleStartAsGuest = async () => {
    console.log('handleStartAsGuest triggered.');
    if (!auth) {
      setError('Firebase 認證服務未準備好。');
      console.warn('Guest login attempted but auth is not initialized.');
      return;
    }
    setError(null);
    setLoading(true);
    setLoadMessage('正在以訪客身份登入...');
    console.log('Attempting signInAnonymously...');
    try {
      await signInAnonymously(auth);
      console.log('signInAnonymously call successful. onAuthStateChanged will handle UI transition.');
      // onAuthStateChanged will be triggered and update states, leading to welcome screen hide
      // No need to call setShowWelcomeScreen(false) or setInitialDataLoaded(false) here
    } catch (err) {
      console.error("以訪客身份登入失敗:", err.code, err.message);
      setError(`以訪客身份登入失敗: ${err.message}.`);
      setLoadMessage('訪客登入失敗！');
    } finally {
      // setLoading(false); // Don't set here, let onAuthStateChanged handle it after user state is processed
      setTimeout(() => setLoadMessage(''), 3000);
      console.log('Guest login attempt finished. Message timeout set.');
    }
  };


  // --- useEffects ---
  // 1. Firebase 初始化和身份驗證狀態監聽
  useEffect(() => {
    console.log('--- useEffect: Firebase Init Triggered ---');
    const initFirebase = async () => {
      try {
        if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.authDomain || !FIREBASE_CONFIG.projectId) {
          const configErrorMsg = "Firebase 配置為空或缺少關鍵金鑰。請確保您的 Firebase 專案已正確設定。應用程式功能受限。";
          console.error("Firebase initialization prevented (missing config keys):", configErrorMsg);
          setError(`錯誤! ${configErrorMsg}`);
          setUserId(null); 
          setIsAuthReady(true);
          setLoading(false);
          setShowCharacterCreation(false);
          setShowWelcomeScreen(true);
          return;
        }

        console.log("Initializing Firebase app...");
        const appInstance = initializeApp(FIREBASE_CONFIG);
        const authInstance = getAuth(appInstance);
        const firestoreInstance = getFirestore(appInstance);
        setAuth(authInstance);
        setDb(firestoreInstance);
        console.log("Firebase app, auth, db instances set.");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged triggered. User:", user ? user.uid : "null");
      setCurrentUser(user);

      if (user) {
        setUserDocRef(doc(db, "users", user.uid)); // 設定用戶文檔引用

        // 檢查並創建/加載用戶數據
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          console.log("User document does not exist, creating new one.");
          // 如果是新用戶，初始化數據
          await setDoc(userDocRef, {
            createdAt: new Date(),
            lastLogin: new Date(),
            loadCount: 0,
            saveCount: 0,
            isVIP: false,
            // 匿名用戶首次升級為正式帳號時，可以將匿名數據合併過來
            // 這裡暫時只初始化新數據
            statPoints: INITIAL_STAT_POINTS, // 初始能力點數
            strength: 0,
            agility: 0,
            intelligence: 0,
            luck: 0,
            endurance: 0,
          });
          setUserProfile(prev => ({
            ...prev,
            loadCount: 0,
            saveCount: 0,
            isVIP: false,
          }));
          setStatPoints(INITIAL_STAT_POINTS);
          setStats({ strength: 0, agility: 0, intelligence: 0, luck: 0, endurance: 0 });
        } else {
          console.log("User document exists, loading data.");
          const userData = userDocSnap.data();
          setUserProfile(prev => ({
            ...prev,
            loadCount: userData.loadCount || 0,
            saveCount: userData.saveCount || 0,
            isVIP: userData.isVIP || false,
          }));
          setStatPoints(userData.statPoints || INITIAL_STAT_POINTS);
          setStats({
            strength: userData.strength || 0,
            agility: userData.agility || 0,
            intelligence: userData.intelligence || 0,
            luck: userData.luck || 0,
            endurance: userData.endurance || 0,
          });
          // 更新最後登入時間
          await updateDoc(userDocRef, { lastLogin: new Date() });
        }

        // 加載故事或其他與用戶相關的數據 (這裡假設您會在此處加入加載邏輯)
        // 例如：loadUserActiveStory(user.uid);
        // 如果有匿名用戶的進度，可以在這裡嘗試合併

      } else {
        // 用戶登出或未登入（包括首次匿名登入後登出）
        // 如果不是匿名登入，則自動以匿名方式登入
        if (!auth.currentUser || auth.currentUser.isAnonymous) {
          console.log("No user or anonymous user, signing in anonymously.");
          try {
            await signInAnonymously(auth);
          } catch (error) {
            console.error("Error signing in anonymously:", error);
          }
        }
        // 重置所有用戶相關的狀態
        setUserProfile(prev => ({
          ...prev,
          loadCount: 0,
          saveCount: 0,
          isVIP: false,
        }));
        setUserDocRef(null);
        setStatPoints(INITIAL_STAT_POINTS); // 重置能力點數
        setStats({ strength: 0, agility: 0, intelligence: 0, luck: 0, endurance: 0 }); // 重置能力值
      }
    });

     // ... 返回清理函數
      return () => unsubscribe();
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  };

    initFirebase();
  }, [auth, db]); // 依賴於 auth 和 db 實例

// 處理 Email 註冊
const handleEmailRegister = async () => {
  setAuthError(''); // 清除之前的錯誤
  if (!email || !password) {
    setAuthError('請輸入電子郵件和密碼。');
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Email registered:", userCredential.user);
    // 註冊成功後，可以選擇直接關閉彈窗或引導到其他頁面
    setShowAuthModal(false);
    setAuthError('');
    setEmail('');
    setPassword('');
    // 如果之前是匿名登入，可以在這裡將匿名帳戶連結到新創建的帳戶
    // 這裡暫不實現帳戶連結，待後續需要再考慮
  } catch (error) {
    console.error("Error registering with email:", error.code, error.message);
    switch (error.code) {
      case 'auth/email-already-in-use':
        setAuthError('此電子郵件已被註冊。');
        break;
      case 'auth/invalid-email':
        setAuthError('電子郵件格式不正確。');
        break;
      case 'auth/weak-password':
        setAuthError('密碼強度不足，請至少輸入6個字元。');
        break;
      default:
        setAuthError('註冊失敗，請重試。');
    }
  }
};

// 處理 Email 登入
const handleEmailSignIn = async () => {
  setAuthError(''); // 清除之前的錯誤
  if (!email || !password) {
    setAuthError('請輸入電子郵件和密碼。');
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Email signed in:", userCredential.user);
    setShowAuthModal(false);
    setAuthError('');
    setEmail('');
    setPassword('');
  } catch (error) {
    console.error("Error signing in with email:", error.code, error.message);
    switch (error.code) {
      case 'auth/invalid-credential': // Firebase v9+ 對於錯誤訊息更通用，可能用這個
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        setAuthError('電子郵件或密碼不正確。');
        break;
      case 'auth/invalid-email':
        setAuthError('電子郵件格式不正確。');
        break;
      default:
        setAuthError('登入失敗，請重試。');
    }
  }
};

// 處理 Google 登入
const handleGoogleSignIn = async () => {
  setAuthError(''); // 清除之前的錯誤
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    console.log("Google signed in:", userCredential.user);
    setShowAuthModal(false);
    setAuthError('');
    setEmail(''); // 清空表單
    setPassword(''); // 清空表單
  } catch (error) {
    console.error("Error signing in with Google:", error.code, error.message);
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        setAuthError('您關閉了 Google 登入視窗。');
        break;
      case 'auth/cancelled-popup-request':
        setAuthError('登入請求被取消。');
        break;
      default:
        setAuthError('Google 登入失敗，請重試。');
    }
  }
};

// 處理登出
const handleSignOut = async () => {
  try {
    await signOut(auth);
    console.log("User signed out.");
    // 登出後，將狀態重置為匿名用戶或未登入狀態
    setCurrentUser(null);
    setUserProfile({
      loadCount: 0,
      saveCount: 0,
      isVIP: false,
      isRegistered: false,
      email: null,
    });
    setUserDocRef(null); // 清除用戶文檔引用

    // 可以選擇性地清除故事進度或重置遊戲狀態
    setCurrentChapter('');
    // ... 其他您希望重置的狀態
    // 自動讓用戶以匿名方式登入，這樣他們仍然可以遊玩
    await signInAnonymously(auth);

  } catch (error) {
    console.error("Error signing out:", error);
  }
};

  // 2. 根據用戶資料（例如 VIP 狀態變化）更新載入/保存限制
  useEffect(() => {
    console.log('useEffect: User profile VIP status changed. Updating load/save limits.');
    setCurrentLoadLimit(userProfile.isVIP ? VIP_LOAD_LIMIT : DEFAULT_LOAD_LIMIT);
    setCurrentSaveLimit(userProfile.isVIP ? VIP_SAVE_LIMIT : DEFAULT_SAVE_LIMIT);
  }, [userProfile.isVIP]); // 依賴 userProfile.isVIP

  // 3. 用於觸發初始故事載入或角色創建的獨立 useEffect
  useEffect(() => {
    console.log('--- useEffect: loadOrInitStory Check ---');
    console.log(`isAuthReady: ${isAuthReady}, db (exists): ${!!db}, auth (exists): ${!!auth}, auth.currentUser: ${!!auth?.currentUser}, userId: ${userId}, initialDataLoaded: ${initialDataLoaded}, showWelcomeScreen: ${showWelcomeScreen}`);
    // 只有在 Firebase 服務就緒，用戶已認證，且尚未載入初始數據，且不在歡迎畫面時才嘗試載入故事
    if (isAuthReady && db && auth && auth.currentUser && userId && userId !== '載入中...' && !initialDataLoaded && !showWelcomeScreen) {
      console.log('useEffect: 條件符合：呼叫 loadOrInitStory。');
      loadOrInitStory();
    } else if (initialDataLoaded) {
      console.log('useEffect: 初始數據已載入，跳過 loadOrInitStory。');
    } else {
      console.log('useEffect: loadOrInitStory 的條件不滿足。');
    }
  }, [isAuthReady, userId, initialDataLoaded, loadOrInitStory, db, auth, showWelcomeScreen]); 

  // 4. 獲取當前章節的選擇統計數據
  useEffect(() => {
    const fetchChoiceStats = async () => {
      if (!db || !currentChapter || !isAuthReady) {
        setChapterChoiceStats({});
        return;
      }
      const chapterUniqueId = getCurrentChapterUniqueId(currentChapter);
      const statsDocRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'choice_stats'), chapterUniqueId);

      try {
        console.log(`useEffect: Fetching choice stats for chapter: ${chapterUniqueId}`);
        const docSnap = await getDoc(statsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const total = data.totalSelectionsForChapter || 0;
          const stats = {};
          if (data.choices) {
            data.choices.forEach(choice => {
              stats[choice.choiceId] = {
                count: choice.totalCount,
                percentage: total > 0 ? ((choice.totalCount / total) * 100).toFixed(1) : 0
              };
            });
          }
          setChapterChoiceStats(stats);
          console.log('useEffect: Choice stats loaded:', stats);
        } else {
          console.log('useEffect: No choice stats found for this chapter.');
          setChapterChoiceStats({});
        }
      } catch (err) {
        console.error("useEffect: 獲取選擇統計數據時出錯:", err);
        setChapterChoiceStats({});
      }
    };

    if (db && currentChapter && isAuthReady) {
      fetchChoiceStats();
    }
  }, [db, currentChapter, getCurrentChapterUniqueId, isAuthReady]); 

  // 當應用程式正在初始化時，顯示全螢幕載入旋轉器
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
        <p className="ml-4 text-xl text-purple-200 font-semibold font-inter">正在載入介面...</p>
      </div>
    );
  }

  // --- 歡迎畫面界面 ---
  if (showWelcomeScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-4 sm:p-6 relative">
        <div className="w-full max-w-md bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 text-center border border-purple-700">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-300 mb-4 font-inter">
            歡迎來到互動式小說
          </h1>
          <p className="text-lg text-gray-300 mb-6">
            選擇您的旅程：
          </p>

          {error && (
            <div className="bg-red-800 text-red-200 px-4 py-3 rounded relative mb-4 border border-red-600" role="alert">
              <strong className="font-bold">錯誤!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          {loadMessage && (
             <div className="mb-4 p-3 rounded-lg text-center font-semibold bg-blue-700 text-blue-100">
               {loadMessage}
             </div>
           )}

          <div className="space-y-4">
            <button
              onClick={() => {
                console.log('--- WELCOME SCREEN: "以訪客身份開始遊戲" clicked. ---');
                handleStartAsGuest();
              }}
              className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-green-300 text-xl font-inter bg-green-600 hover:bg-green-700 text-white"
              disabled={!isAuthReady}
            >
              以訪客身份開始遊戲
            </button>
            <button
              onClick={() => {
                console.log('--- WELCOME SCREEN: "登入現有帳戶" clicked. Setting auth modal to true (login mode) ---');
                setShowAuthModal(true);
                setAuthMode('login');
              }}
              className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-purple-300 text-xl font-inter bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!isAuthReady}
            >
              登入現有帳戶
            </button>
            <button
              onClick={() => {
                console.log('--- WELCOME SCREEN: "註冊新帳戶" clicked. Setting auth modal to true (register mode) ---');
                setShowAuthModal(true);
                setAuthMode('register');
              }}
              className="w-full px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-blue-300 text-xl font-inter bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!isAuthReady}
            >
              註冊新帳戶
            </button>
          </div>
        </div>

        {/* 認證模態框（登入/註冊）- Moved inside showWelcomeScreen block */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"> {/* Increased z-index to z-50 */}
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md text-center border border-purple-700 animate-fade-in-up">
              <h3 className="text-3xl font-bold text-purple-400 mb-4">
                {authMode === 'login' ? '登入帳戶' : '註冊新帳戶'}
              </h3>
              {authMessage && (
                <div className="bg-green-700 text-green-100 px-4 py-2 rounded-lg mb-4">{authMessage}</div>
              )}
              {authError && (
                <div className="bg-red-700 text-red-100 px-4 py-2 rounded-lg mb-4">{authError}</div>
              )}
              <input
                type="email"
                placeholder="電子郵件"
                value={userEmail}
                onChange={(e) => {
                  console.log('--- AUTH MODAL INPUT: Email changed to:', e.target.value);
                  setUserEmail(e.target.value);
                }}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              />
              <input
                type="password"
                placeholder="密碼"
                value={userPassword}
                onChange={(e) => {
                  console.log('--- AUTH MODAL INPUT: Password changed (value omitted for security).');
                  setUserPassword(e.target.value);
                }}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
              />
              <button
                onClick={() => {
                  console.log('--- AUTH MODAL BUTTON: "登入 / 註冊" button clicked. Triggering handleAuthSubmit. ---');
                  handleAuthSubmit();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 text-lg mb-4"
              >
                {authMode === 'login' ? '登入' : '註冊'}
              </button>
              <button
                onClick={() => {
                  console.log('--- AUTH MODAL BUTTON: "切換登入/註冊模式" clicked. ---');
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-400 text-base mb-4"
              >
                {authMode === 'login' ? '沒有帳戶？註冊' : '已有帳戶？登入'}
              </button>
              <button
                onClick={() => {
                  console.log('--- AUTH MODAL BUTTON: "關閉" button clicked. ---');
                  setShowAuthModal(false);
                }}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-400 text-base"
              >
                關閉
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 角色創建界面 ---
  if (showCharacterCreation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 text-center border border-purple-700">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-300 mb-4 font-inter">
            創建你的偵探
          </h1>
          <p className="text-lg text-gray-300 mb-6">
            你有 <span className="font-bold text-teal-400">{INITIAL_STAT_POINTS}</span> 點可以分配。
            <br />
            剩餘點數: <span className="font-bold text-orange-400">{remainingPoints}</span>
          </p>

          {error && (
            <div className="bg-red-800 text-red-200 px-4 py-3 rounded relative mb-4 border border-red-600" role="alert">
              <strong className="font-bold">錯誤!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {/* 能力值分配區塊 */}
          {['力量', '智力', '敏捷'].map((statName) => {
            const statKey = statName === '力量' ? 'strength' : statName === '智力' ? 'intelligence' : 'agility';
            const currentValue = characterStats[statKey] + allocatedPoints[statKey];
            return (
              <div key={statKey} className="flex items-center justify-between mb-4 bg-gray-700 p-3 rounded-lg shadow-sm">
                <span className="text-xl font-semibold text-gray-100">{statName}: {currentValue}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleStatChange(statKey, -1)}
                    disabled={allocatedPoints[statKey] <= 0}
                    className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleStatChange(statKey, 1)}
                    disabled={remainingPoints <= 0}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={handleConfirmStats}
            disabled={remainingPoints !== 0}
            className={`
              mt-6 px-8 py-4 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
              focus:outline-none focus:ring-4 focus:ring-green-300 text-xl font-inter w-full
              ${remainingPoints === 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70'}
            `}
          >
            開始故事
          </button>
        </div>
      </div>
    );
  }

  // --- 主要應用程式界面 ---
  return (<>
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 p-4 sm:p-6 flex flex-col items-center">
      {/* 用戶 ID、VIP 狀態和認證控制 */}
      <div className="w-full max-w-4xl flex justify-between items-center text-sm text-gray-400 mb-4">
        <div className="flex items-center space-x-2">
          {userProfile.isRegistered ? (
            <span className="font-semibold text-white">
              已登入：<span className="text-blue-300 break-all">{userProfile.email || userId}</span>
            </span>
          ) : (
            <span className="font-semibold text-white">
              匿名用戶：<span className="font-mono text-blue-300 break-all">{userId}</span>
            </span>
          )}
          {userProfile.isVIP && <span className="px-2 py-1 bg-yellow-300 text-yellow-900 rounded-full text-xs font-bold shadow-sm">VIP</span>}
        </div>
        <div>
          {userProfile.isRegistered ? (
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200"
            >
              登出
            </button>
          ) : (
            <button
              onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
              className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200"
            >
              登入 / 註冊
            </button>
          )}
        </div>
      </div>

      {/* 小說標題頭部 */}
      <header className="w-full max-w-4xl bg-gray-800 shadow-xl rounded-xl p-6 mb-8 text-center border border-purple-700">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-300 mb-2 font-inter">
          互動式生成小說
        </h1>
        <p className="text-lg text-gray-400 font-inter">你的選擇，構築故事</p>
      </header>

      {/* 故事內容區塊 */}
      <main className="w-full max-w-4xl bg-gray-800 shadow-xl rounded-xl p-6 mb-8 flex-grow border border-purple-700">
        {error && (
          <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">錯誤!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* 保存/載入訊息 */}
        {(saveMessage || loadMessage) && (
          <div className={`mb-4 p-3 rounded-lg text-center font-semibold ${saveMessage ? 'bg-green-700 text-green-100' : 'bg-blue-700 text-blue-100'}`}>
            {saveMessage || loadMessage}
          </div>
        )}

        {/* 顯示載入/保存次數和角色能力值 */}
        <div className="text-center text-sm text-gray-400 mb-4 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-gray-700 rounded-lg">
            <div className="font-bold text-gray-200">
              力量: <span className="text-blue-300">{characterStats.strength}</span> (點數進度: <span className="text-blue-300">{characterStats.strengthAccumulation}/{STAT_ACCUMULATION_THRESHOLD}</span>) | 
              智力: <span className="text-green-300">{characterStats.intelligence}</span> (點數進度: <span className="text-green-300">{characterStats.intelligenceAccumulation}/{STAT_ACCUMULATION_THRESHOLD}</span>) | 
              敏捷: <span className="text-purple-300">{characterStats.agility}</span> (點數進度: <span className="text-purple-300">{characterStats.agilityAccumulation}/{STAT_ACCUMULATION_THRESHOLD}</span>)
            </div>
        </div>

        {currentChapter && (
          <>
            <h2 className="text-3xl sm:text-4xl font-bold text-purple-200 mb-6 font-inter">
              {currentChapter.title}
            </h2>

            <div className="text-gray-200 leading-relaxed text-lg sm:text-xl font-inter">
              {currentChapter.content.map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </>
        )}

        {/* 文本載入指示器 */}
        {isLoadingText && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
            <p className="ml-4 text-xl text-purple-300 font-semibold font-inter">AI 正在生成下一章節文本...</p>
          </div>
        )}

        {/* 限時選擇倒數計時器（留在主區塊） */}
        {timerActive && showChoices && (
          <div className="text-center text-2xl font-bold text-red-400 my-4">
            剩餘時間: {timeLeft} 秒
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
              <div
                className="bg-red-500 h-2.5 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / (currentChapter?.timeLimit || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 選擇按鈕區塊 */}
        {!isLoadingText && showChoices && choices.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-gray-700">
            <h3 className="text-2xl font-bold text-purple-200 mb-4 font-inter">你的選擇：</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {choices.map((choice, index) => {
                const available = isChoiceAvailable(choice);
                const requirementAndGainText = getChoiceRequirementAndGainText(choice);

                return (
                  <button
                    key={index}
                    onClick={() => handleChoice(choice.text, choice.choiceId)}
                    disabled={!available || (timerActive && timeLeft <= 0)}
                    className={`
                      py-4 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105
                      focus:outline-none focus:ring-4 text-lg font-inter flex justify-between items-center
                      ${available ? 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white focus:ring-blue-400' : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70'}
                      ${(timerActive && timeLeft <= 0) ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70' : ''}
                    `}
                  >
                    <span>
                      {choice.text}
                      {requirementAndGainText && <span className="ml-2 text-sm opacity-80">{requirementAndGainText}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 故事結束提示（當 LLM 返回空選擇時） */}
        {!isLoadingText && choices.length === 0 && currentChapter && (
          <div className="mt-8 pt-6 border-t-2 border-gray-700 text-center text-xl text-gray-400 font-inter">
            故事暫時告一段落，或者已到達結局。感謝你的參與！
          </div>
        )}
      </main>

      {/* 操作按鈕區塊：保存/載入/路徑切換（垂直）和繼續選擇（水平） */}
      {/* 可見性控制：僅在 AI 未載入文本且選擇未顯示時顯示（即，僅在「繼續」按鈕相關時顯示） */}
      {!isLoadingText && !showChoices && (
        <div className="w-full max-w-4xl mt-8 flex flex-col items-center sm:flex-row sm:justify-center gap-4">
          {/* 左側：保存/載入/路徑切換組（垂直堆疊） */}
          <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-xl shadow-xl border border-purple-700 w-full sm:w-auto sm:flex-shrink-0">
            <button
              onClick={() => saveProgress(false)} // 手動保存
              disabled={isSaving || isLoadingSave || !auth || !auth.currentUser || !currentChapter || userProfile.saveCount >= currentSaveLimit}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                        focus:outline-none focus:ring-4 focus:ring-green-400 text-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '正在保存...' : `保存進度 (${userProfile.saveCount}/${currentSaveLimit})`}
            </button>
            <button
              onClick={() => loadProgress(true)}
              disabled={isLoadingSave || isSaving || !auth || !auth.currentUser || userProfile.loadCount >= currentLoadLimit}
              className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                        focus:outline-none focus:ring-4 focus:ring-teal-400 text-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingSave ? '正在載入...' : `載入進度 (${userProfile.loadCount}/${currentLoadLimit})`}
            </button>
            {userPathHistory.length > 0 && (
              <button
                onClick={() => setIsPathHistoryVisible(prev => !prev)}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                          focus:outline-none focus:ring-4 focus:ring-blue-400 text-lg font-inter"
              >
                {isPathHistoryVisible ? '隱藏故事軌跡' : '查看故事軌跡'}
              </button>
            )}
            <button
              onClick={() => setShowRestartConfirm(true)}
              disabled={!auth || !auth.currentUser || isLoadingSave || isSaving}
              className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105
                        focus:outline-none focus:ring-4 focus:ring-red-400 text-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              重新開始遊戲
            </button>
          </div>

          {/* 右側：「繼續閱讀並做出選擇」按鈕 */}
          {currentChapter && currentChapter.choices.length > 0 && showProceedToChoicesButton && (
            <div className="flex justify-center items-center w-full sm:w-auto sm:flex-shrink-0">
              <button
                onClick={handleProceedToChoices}
                className="h-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105
                           focus:outline-none focus:ring-4 focus:ring-purple-400 text-xl font-inter w-full max-w-sm mx-auto"
              >
                繼續閱讀並做出選擇
              </button>
            </div>
          )}
        </div>
      )}


      {/* 用戶所選路徑歷史與統計總結 - 根據 isPathHistoryVisible 條件渲染 */}
      {isPathHistoryVisible && userPathHistory.length > 0 && (
        <div className="w-full max-w-4xl bg-gray-800 shadow-xl rounded-xl p-6 mt-8 border border-purple-700">
          <h3 className="text-2xl font-bold text-purple-200 mb-4 font-inter flex justify-between items-center">
            你的故事軌跡：
            <button
              onClick={() => setIsPathHistoryVisible(false)}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-1 px-3 rounded-md text-sm transition-all duration-200"
            >
              X 隱藏
            </button>
          </h3>
          <div className="space-y-4">
            {userPathHistory.map((pathItem, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded-lg shadow-md border border-gray-600">
                <p className="text-gray-300 text-sm font-semibold mb-1">
                  章節 {index + 1}: {pathItem.chapterId}
                </p>
                <p className="text-white text-lg">
                  你選擇了: <span className="font-bold text-teal-300">"{pathItem.choiceText}"</span>
                </p>
                {pathItem.percentage && pathItem.percentage !== 'N/A' && (
                  <p className="text-gray-400 text-sm">
                    <span className="font-semibold">{pathItem.percentage}%</span> 的玩家也選擇了這條路徑。
                    {parseFloat(pathItem.percentage) < 30 ? (
                      <span className="ml-2 text-orange-400"> (一個獨特的選擇！)</span>
                    ) : parseFloat(pathItem.percentage) > 70 ? (
                      <span className="ml-2 text-blue-400"> (一個常見的選擇。)</span>
                    ) : (
                      <span className="ml-2 text-green-400"> (一個平衡的選擇。)</span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 重新開始確認彈窗 */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md text-center border border-red-700 animate-fade-in-up">
            <h3 className="text-3xl font-bold text-red-400 mb-4">確認重新開始遊戲？</h3>
            <p className="text-lg text-gray-300 mb-6">
              此操作將會**永久清除**您的以下資料：
            </p>
            <ul className="text-left text-gray-200 mb-6 list-disc list-inside space-y-2">
              <li>當前故事進度</li>
              <li>角色所有能力值及點數進度</li>
              <li>所有已記錄的故事軌跡</li>
              <li>已使用的保存和載入次數會被重設</li>
            </ul>
            <p className="text-xl font-bold text-yellow-300 mb-8">
              此操作不可逆，請謹慎選擇！
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleRestartGame}
                className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-400 text-lg"
              >
                確認重新開始
              </button>
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-400 text-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 回饋區塊 */}
      <div className="w-full max-w-4xl mt-12 pt-6 border-t-2 border-gray-700 bg-gray-800 shadow-xl rounded-xl p-6">
        <h3 className="text-2xl font-bold text-purple-200 mb-4 font-inter">您的回饋：</h3>
        <textarea
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 font-inter"
          rows="4"
          placeholder="請在這裡留下您的回饋或建議，幫助我們改進故事體驗..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
        ></textarea>
        <button
          onClick={handleFeedbackSubmit}
          disabled={!feedbackText.trim() || !auth || !auth.currentUser}
          className={`
            w-full py-3 px-6 rounded-lg font-bold text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105
            focus:outline-none focus:ring-4 focus:ring-purple-300 text-lg font-inter
            ${!feedbackText.trim() || !auth || !auth.currentUser ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'}
          `}
        >
          提交回饋
        </button>
        {feedbackMessage && (
          <div className="mt-4 p-3 rounded-lg text-center font-semibold bg-blue-700 text-blue-100">
            {feedbackMessage}
          </div>
        )}
      </div>


      {/* 頁腳資訊 */}
      <footer className="w-full max-w-4xl text-center text-gray-500 mt-8">
        <p className="text-sm font-inter">
          Powered by AI Generative Models & Your Imagination.
        </p>
      </footer>
    </div>

        {/* 登入/註冊彈窗 */}
        {showAuthModal && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
      <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center font-inter">
        {isRegisterMode ? '註冊帳號' : '登入帳號'}
      </h2>

      {authError && <p className="text-red-500 text-center mb-4 font-inter">{authError}</p>}

      <input
        type="email"
        placeholder="電子郵件"
        className="w-full p-3 mb-4 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-inter"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="密碼"
        className="w-full p-3 mb-6 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-inter"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={isRegisterMode ? handleEmailRegister : handleEmailSignIn}
        className="w-full py-3 px-6 rounded-lg font-bold text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 text-lg font-inter bg-purple-600 hover:bg-purple-700 active:bg-purple-800 mb-4"
      >
        {isRegisterMode ? '註冊' : '登入'}
      </button>

      <div className="flex items-center justify-between my-4">
        <hr className="flex-grow border-gray-600" />
        <span className="px-3 text-gray-400 font-inter">或</span>
        <hr className="flex-grow border-gray-600" />
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="w-full py-3 px-6 rounded-lg font-bold text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 text-lg font-inter bg-red-600 hover:bg-red-700 active:bg-red-800 flex items-center justify-center"
      >
        <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google logo" className="mr-3" />
        使用 Google {isRegisterMode ? '註冊' : '登入'}
      </button>

      <p className="text-center text-gray-400 mt-6 font-inter">
        {isRegisterMode ? '已有帳號？' : '沒有帳號？'}
        <button
          onClick={() => {
            setIsRegisterMode(!isRegisterMode);
            setAuthError(''); // 切換模式時清除錯誤
          }}
          className="text-purple-400 hover:text-purple-300 font-bold ml-2 focus:outline-none"
        >
          {isRegisterMode ? '登入' : '立即註冊'}
        </button>
      </p>

      <button
        onClick={() => {
          setShowAuthModal(false);
          setAuthError(''); // 關閉時清除錯誤
          setEmail(''); // 清空表單
          setPassword(''); // 清空表單
        }}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl focus:outline-none"
      >
        &times;
      </button>
    </div>
  </div>
)}
  </>);
}

export default App;
