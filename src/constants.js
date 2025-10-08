// src/constants.js

// === 用户限制常量 ===
export const DEFAULT_LOAD_LIMIT = 5;
export const DEFAULT_SAVE_LIMIT = 3;
export const VIP_LOAD_LIMIT = 20;
export const VIP_SAVE_LIMIT = 10;

// === 角色系统常量 ===
export const INITIAL_STAT_POINTS = 10;
export const STAT_ACCUMULATION_THRESHOLD = 3;

// === 初始故事数据 ===
export const initialStoryData = {
  chapterId: 'intro_chapter_1',
  title: '迷雾中的线索：伦敦的蒸气与魔法',
  content: [
    '在维多利亚时代的伦敦...', // 内容省略
    '窗外，伦敦特区永不散去的蒸气迷雾...',
    '艾伦抵达格雷森博士的实验室...',
    '艾伦皱起了眉头...',
  ],
  choices: [
    { text: '立即前往时钟塔，看看午夜有什么在等待。', choiceId: 'to_clock_tower' },
    
    // 【重要更新】这个选项现在需要进行能力检定
    { 
      text: '先仔细调查格雷森博士的实验室，寻找更多隐藏线索。', 
      choiceId: 'investigate_lab_thoroughly',
      skillCheck: {
        stat: 'intelligence', // 需要检定的能力
        threshold: 12,        // 成功需要的门槛值
      }
    },

    { text: '回到办公室，研究格雷森博士的背景资料和「时间机械」的理论。', choiceId: 'research_grayson_background' },
  ],
  isTimedChoice: false,
  timeLimit: 0,
};

// === UI 文本常量 ===
export const UI_TEXTS = {
  // ... (此部分维持不变)
};
