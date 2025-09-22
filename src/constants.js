// 應用程式常量定義
export const DEFAULT_LOAD_LIMIT = 5; // 普通用戶的載入次數上限
export const DEFAULT_SAVE_LIMIT = 3; // 普通用戶的保存次數上限
export const VIP_LOAD_LIMIT = 20; // VIP 用戶的載入次數上限
export const VIP_SAVE_LIMIT = 10; // VIP 用戶的保存次數上限
export const INITIAL_STAT_POINTS = 10; // 角色創建時可分配的初始能力點數
export const STAT_ACCUMULATION_THRESHOLD = 3; // 每累計3點提升1點能力值

// 從全局作用域獲取應用程式 ID，並設置回退機制
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'infinovel';

// 從 Canvas 環境提供的全局變數獲取 Firebase 配置，並安全地解析
export const FIREBASE_CONFIG = (() => {
  console.log("--- Firebase Config Initialization ---");
  console.log("Raw __firebase_config:", typeof __firebase_config, __firebase_config);
  
  if (typeof __firebase_config === 'string' && __firebase_config.trim() !== '') {
    try {
      const parsedConfig = JSON.parse(__firebase_config);
      console.log("Parsed FIREBASE_CONFIG:", parsedConfig);
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

// 定義初始故事上下文
export const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷霧中的線索：倫敦的蒸汽與魔法',
  content: [
    '在維多利亞時代的倫敦，蒸汽機的轟鳴聲與古老魔法的低語交織。這個城市既是科技的巔峰，也是神秘事件的溫床。艾倫偵探，一位以敏銳洞察力和對超自然現象的獨特理解而聞名的私家偵探，此時正坐在他那間瀰漫著煙草味的辦公室裡。他的風衣搭在椅背上，桌上堆滿了未解的卷宗和一杯冷掉的紅茶。艾倫雖然恐高，卻總是被捲入與高處相關的案件，這成了他職業生涯中一個奇特的諷刺。',
    '窗外，倫敦特區永不散去的蒸汽迷霧像一條巨龍般盤踞，吞噬著光線與聲音。一封緊急電報打破了清晨的寧靜，電報來自泰晤士河畔的皇家科學院，內容簡潔而令人不安：著名發明家維克多·格雷森博士離奇失蹤了。格雷森博士以其在「時間機械」領域的突破性研究而聞名，他的失蹤無疑將引發巨大波瀾。',
    '艾倫抵達格雷森博士的實驗室，那裡一片狼藉，精密齒輪和扭曲的電線散落一地，空氣中瀰漫著臭氧和燒焦金屬的氣味。這不是普通的失竊，更像是一場混亂的搏鬥，或是某種實驗失控。在凌亂的書桌上，艾倫的目光被一張被壓在厚重機械手稿下的紙條吸引。上面潦草地寫著一行字：「時鐘塔，午夜，等待。」字跡扭曲，似乎在極度恐懼或倉促中寫下。',
    '艾倫皺起了眉頭。時鐘塔，城市的地標，也是時間守護者組織的秘密據點之一。這張紙條是格雷森博士留下的最後線索嗎？還是某種精心設計的陷阱？他必須做出決定，這將引導他走向倫敦最深處的秘密。',
  ],
  choices: [
    { text: '立即前往時鐘塔，看看午夜有什麼在等待。', choiceId: 'to_clock_tower' },
    { text: '先仔細調查格雷森博士的實驗室，尋找更多隱藏線索。', choiceId: 'investigate_lab_thoroughly' },
    { text: '回到辦公室，研究格雷森博士的背景資料和「時間機械」的理論。', choiceId: 'research_grayson_background' },
  ],
  isTimedChoice: false,
  timeLimit: 0,
};
