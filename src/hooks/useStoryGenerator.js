// src/hooks/useStoryGenerator.js

import { useCallback } from 'react';

export const useStoryGenerator = (db, auth, currentChapter, characterStats) => {
  
  const generateNextChapter = useCallback(async (choiceText, choiceId, promptContext) => {
    console.log("傳送給 AI 的額外情境:", promptContext);
    
    // --- 在這裡是你呼叫 AI API 的邏輯 ---
    // 範例：
    const fullPrompt = `
      这是目前的章节内容: ${JSON.stringify(currentChapter.content)}
      玩家的角色能力是: ${JSON.stringify(characterStats)}
      ${promptContext} 
      请根据以上信息，生成故事的下一章。
    `;
    
    // const response = await your_ai_api_call(fullPrompt);
    // const nextChapterData = parse_ai_response(response);
    
    // --- 為了測試，我們先返回一個模擬的成功/失敗結果 ---
    await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟网路延迟
    
    const isSuccess = promptContext.includes("成功");
    
    const mockChapter = {
      success: true,
      chapter: {
        chapterId: isSuccess ? `${choiceId}_success` : `${choiceId}_fail`,
        title: isSuccess ? '成功的调查' : '失败的尝试',
        content: isSuccess 
          ? ['你敏锐的智力让你发现了一个隐藏的机关，墙壁上的一块砖似乎可以按下去...', '你找到了格雷森博士的秘密日记！'] 
          : ['你找了半天，却一无所获，实验室里凌乱的物品让你头晕目眩...', '也许线索并不在这里。'],
        choices: [
          { text: '继续阅读日记', choiceId: 'read_diary' }
        ]
      }
    };
    
    return mockChapter;
    
  }, [currentChapter, characterStats]);

  return { generateNextChapter };
};
