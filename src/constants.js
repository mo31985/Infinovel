// src/constants.js

// === 初始故事數據 ===
// 這是整個故事唯一的“硬編碼”入口點。
export const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  content: [
    '在維多利亞時代的倫敦，蒸汽機的轟鳴聲與古老魔法的低語交織。艾倫偵探，一位以敏銳洞察力和對超自然現象的獨特理解而聞名的私家偵探，此時正坐在他那間瀰漫著煙草味的辦公室裡。',
    '窗外，倫敦特區永不散去的蒸汽迷霧像一條巨龍般盤踞。一封緊急電報打破了清晨的寧靜，電報來自皇家科學院：著名發明家維克多·格雷森博士離奇失蹤了。',
    '艾倫抵達格雷森博士的實驗室，那裡一片狼藉... 在凌亂的書桌上，艾倫的目光被一張紙條吸引。上面潦草地寫著：「時鐘塔，午夜，等待。」',
  ],
  choices: [
    { text: '立即前往時鐘塔，看看午夜有什麼在等待。', choiceId: 'to_clock_tower' },
    { 
      text: '先仔細調查格雷森博士的實驗室，尋找更多隱藏線索。', 
      choiceId: 'investigate_lab_thoroughly',
      skillCheck: {
        stat: 'intelligence', // 需要檢定的能力
        threshold: 12,        // 成功需要的門檻值
      }
    },
    { text: '回到辦公室，研究格雷森博士的背景資料。', choiceId: 'research_grayson_background' },
  ],
};


// === UI 文本常數 ===
// 將 UI 文本集中管理是很好的做法，我們把它加回來
export const UI_TEXTS = {
  WELCOME: {
    TITLE: '歡迎來到互動式小說',
    SUBTITLE: '選擇您的旅程：',
    START_AS_GUEST: '以訪客身份開始遊戲',
    LOGIN: '登入現有帳戶',
    REGISTER: '註冊新帳戶'
  },
  // ... 其他 UI 文本 ...
};
