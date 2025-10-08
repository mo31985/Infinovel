// src/hooks/useStoryGenerator.js

import { useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

export const useStoryGenerator = (characterStats) => {
  const db = getFirestore();

  const fetchOrGenerateChapter = useCallback(async (parentChapter, choice) => {
    
    // 1. 產生一個唯一的路徑 ID，代表這個選擇
    const pathId = `${parentChapter.chapterId}_${choice.choiceId}`;
    const chapterRef = doc(db, 'chapters', pathId);

    // 2. 嘗試從 Firestore 讀取這個已生成的章節
    const docSnap = await getDoc(chapterRef);

    if (docSnap.exists()) {
      // 2a. 找到了！直接返回資料庫中的章節（快取命中）
      console.log(`--- 從 Firestore 快取讀取章節: ${pathId} ---`);
      return { success: true, chapter: docSnap.data() };
    } else {
      // 2b. 沒找到！呼叫 AI 生成新章節（快取未命中）
      console.log(`--- 快取未命中，呼叫 AI 生成新章節: ${pathId} ---`);
      
      let promptContext = `玩家選擇了：'${choice.text}'。`;
      if (choice.skillCheck) {
        const { stat, threshold } = choice.skillCheck;
        const playerStatValue = characterStats[stat] || 0;
        if (playerStatValue >= threshold) {
          promptContext += ` 並且因為他們的'${stat}'能力值夠高 ( ${playerStatValue} >= ${threshold} )，所以檢定成功了。`;
        } else {
          promptContext += ` 但可惜他們的'${stat}'能力值不夠 ( ${playerStatValue} < ${threshold} )，所以檢定失敗了。`;
        }
      }

      // =============================================================
      // 【重要】在這裡呼叫你真正的 AI API 
      //  你需要將 parentChapter, choice, promptContext 等資訊傳給 AI
      // =============================================================
      console.log("準備傳送給 AI 的 Prompt 情境:", promptContext);
      // const generatedData = await your_real_ai_api_call(fullPrompt);
      
      // 為了演示，我們先用一個模擬的 AI 回應
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模擬 AI 生成時間
      const isSuccess = !promptContext.includes("失敗");
      const generatedData = {
          chapterId: pathId,
          title: isSuccess ? `調查成功：${choice.text}` : `調查失敗：${choice.text}`,
          content: isSuccess ? ['你憑藉敏銳的洞察力，發現了一個之前忽略的細節...', '這讓你離真相更近了一步。'] : ['你努力尋找，但實驗室的混亂讓你毫無頭緒...', '也許換個方向會更好。'],
          choices: [{ text: '繼續探索', choiceId: 'continue_exploring' }],
          parentChoice: `${parentChapter.chapterId}/${choice.choiceId}`,
      };
      // =============================================================
      // 模擬 AI 回應結束
      // =============================================================

      // 3. 將 AI 生成的新章節存入 Firestore 的 `chapters` 集合，供之後使用
      await setDoc(chapterRef, generatedData);
      console.log(`--- 新章節已存入 Firestore: ${pathId} ---`);

      return { success: true, chapter: generatedData };
    }
  }, [db, characterStats]);

  return { fetchOrGenerateChapter };
};
