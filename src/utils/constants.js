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