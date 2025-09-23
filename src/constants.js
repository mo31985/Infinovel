// 应用程序常量定义 - 统一管理所有常量

// === 用户限制常量 ===
export const DEFAULT_LOAD_LIMIT = 5; // 普通用户的载入次数上限
export const DEFAULT_SAVE_LIMIT = 3; // 普通用户的保存次数上限
export const VIP_LOAD_LIMIT = 20; // VIP 用户的载入次数上限
export const VIP_SAVE_LIMIT = 10; // VIP 用户的保存次数上限

// === 角色系统常量 ===
export const INITIAL_STAT_POINTS = 10; // 角色创建时可分配的初始能力点数
export const STAT_ACCUMULATION_THRESHOLD = 3; // 每累积3点提升1点能力值

// === 应用程序配置 ===
// 从全局作用域获取应用程序 ID，并设置回退机制
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'infinovel';

// === Firebase 配置 ===
// 从 Canvas 环境提供的全局变数获取 Firebase 配置，并安全地解析
export const FIREBASE_CONFIG = (() => {
  console.log("--- Firebase Config Initialization ---");
  console.log("Raw __firebase_config:", typeof __firebase_config, __firebase_config);
  
  if (typeof __firebase_config === 'string' && __firebase_config.trim() !== '') {
    try {
      const parsedConfig = JSON.parse(__firebase_config);
      console.log("Parsed FIREBASE_CONFIG:", parsedConfig);
      console.log("FIREBASE_CONFIG Project ID (用于调试):", parsedConfig.projectId); 
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

// === 初始故事数据 ===
export const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷雾中的线索：伦敦的蒸气与魔法',
  content: [
    '在维多利亚时代的伦敦，蒸气机的轰鸣声与古老魔法的低语交织。这个城市既是科技的巅峰，也是神秘事件的温床。艾伦侦探，一位以敏锐洞察力和对超自然现象的独特理解而闻名的私家侦探，此时正坐在他那间弥漫着烟草味的办公室里。他的风衣搭在椅背上，桌上堆满了未解的卷宗和一杯冷掉的红茶。艾伦虽然恐高，卻总是被卷入与高处相关的案件，这成了他职业生涯中一个奇特的讽刺。',
    '窗外，伦敦特区永不散去的蒸气迷雾像一条巨龙般盘据，吞噬着光线与声音。一封紧急电报打破了清晨的宁静，电报来自泰晤士河畔的皇家科学院，内容简洁而令人不安：著名发明家维克多·格雷森博士离奇失踪了。格雷森博士以其在「时间机械」领域的突破性研究而闻名，他的失踪无疑将引发巨大波澜。',
    '艾伦抵达格雷森博士的实验室，那里一片狼藉，精密齿轮和扭曲的电线散落一地，空气中弥漫着臭氧和烧焦金属的气味。这不是普通的失窃，更像是一场混乱的搏斗，或是某种实验失控。在凌乱的书桌上，艾伦的目光被一张被压在厚重机械手稿下的纸条吸引。上面潦草地写着一行字：「时钟塔，午夜，等待。」字迹扭曲，似乎在极度恐惧或仓促中写下。',
    '艾伦皱起了眉头。时钟塔，城市的地标，也是时间守护者组织的秘密据点之一。这张纸条是格雷森博士留下的最后线索吗？还是某种精心设计的陷阱？他必须做出决定，这将引导他走向伦敦最深处的秘密。',
  ],
  choices: [
    { text: '立即前往时钟塔，看看午夜有什么在等待。', choiceId: 'to_clock_tower' },
    { text: '先仔细调查格雷森博士的实验室，寻找更多隐藏线索。', choiceId: 'investigate_lab_thoroughly' },
    { text: '回到办公室，研究格雷森博士的背景资料和「时间机械」的理论。', choiceId: 'research_grayson_background' },
  ],
  isTimedChoice: false,
  timeLimit: 0,
};

// === UI 文本常量 ===
export const UI_TEXTS = {
  WELCOME: {
    TITLE: '歡迎來到互動式小說',
    SUBTITLE: '選擇您的旅程：',
    START_AS_GUEST: '以訪客身份開始遊戲',
    LOGIN: '登入現有帳戶',
    REGISTER: '註冊新帳戶'
  },
  CHARACTER_CREATION: {
    TITLE: '創建你的偵探',
    POINTS_AVAILABLE: '你有 {points} 點可以分配。',
    REMAINING_POINTS: '剩餘點數: {points}',
    START_STORY: '開始故事'
  },
  GAME: {
    LOADING_TEXT: 'AI 正在生成下一章節文本...',
    YOUR_CHOICES: '你的選擇：',
    CONTINUE_READING: '繼續閱讀並做出選擇',
    TIME_LEFT: '剩餘時間: {time} 秒'
  },
  CONTROLS: {
    SAVE_PROGRESS: '保存進度 ({current}/{max})',
    LOAD_PROGRESS: '载入進度 ({current}/{max})',
    VIEW_PATH: '查看故事軌跡',
    HIDE_PATH: '隱藏故事軌跡',
    RESTART_GAME: '重新開始遊戲'
  },
  ERRORS: {
    FIREBASE_CONFIG_MISSING: 'Firebase 配置為空或缺少關鍵金鑰。請確保您的 Firebase 專案已正確設定。应用程序功能受限。',
    AUTH_NOT_READY: 'Firebase 認證服務未準備好。',
    INVALID_EMAIL: '電子郵件格式不正確。',
    WEAK_PASSWORD: '密碼強度不足，請至少輸入 6 個字符。'
  }
};

console.log('应用程序正在使用 Canvas 环境提供的 Firebase 配置。');