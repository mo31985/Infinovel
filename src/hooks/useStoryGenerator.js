import { useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, increment, collection } from 'firebase/firestore';

const APP_ID = 'infinovel'; // 直接定義，避免引用 constants

export const useStoryGenerator = (db, auth, currentChapter, characterStats, getCurrentChapterUniqueId) => {
  
  const generateNextChapter = useCallback(async (userChoiceText, selectedChoiceId, isAutoChoice = false) => {
    if (!db || !auth || !auth.currentUser || !currentChapter || !selectedChoiceId) {
      throw new Error('缺少必要的參數或服務');
    }

    // 更新選擇統計數據
    const chapterUniqueId = getCurrentChapterUniqueId(currentChapter);
    const statsDocRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'choice_stats'), chapterUniqueId);

    let chosenChoicePercentage = 'N/A'; // 👈 確保定義了這個變數

    try {
      const docSnap = await getDoc(statsDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const totalSelections = data.totalSelectionsForChapter || 0;
        const chosenOptionStat = (data.choices || []).find(c => c.choiceId === selectedChoiceId);
        if (chosenOptionStat && totalSelections > 0) {
          chosenChoicePercentage = ((chosenOptionStat.totalCount / totalSelections) * 100).toFixed(1);
        }
      }

      // 更新統計數據
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

    // 構建 AI 提示
    const currentStoryContext = currentChapter ? currentChapter.content.join('\n') : '';
    const textPrompt = `你是一個互動式小說的作者。請根據以下故事背景、讀者的選擇和角色的當前能力值，生成下一章節的內容。
請確保故事邏輯連貫、富有創意，並包含2到3個新的選擇點，讓讀者繼續影響故事走向。

**重要：請只回傳純JSON格式，不要包含任何其他文字或解釋。**

故事背景：
${currentStoryContext}

讀者的選擇是：
${userChoiceText}

角色當前能力值：力量 ${characterStats.strength}, 智力 ${characterStats.intelligence}, 敏捷 ${characterStats.agility}

請以JSON格式返回：
{
  "chapterId": "新章節ID",
  "title": "新章節標題",
  "content": ["段落1", "段落2", "段落3"],
  "isTimedChoice": false,
  "timeLimit": 0,
  "choices": [
    {"text": "選擇1文字", "choiceId": "choice_1"},
    {"text": "選擇2文字", "choiceId": "choice_2"},
    {"text": "選擇3文字", "choiceId": "choice_3"}
  ]
}`;

    // 🔥 使用 Hugging Face API
    const HF_TOKEN = process.env.REACT_APP_HF_TOKEN || "";
    const HF_API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large";
    
    if (!HF_TOKEN) {
      throw new Error('缺少 Hugging Face API Token，請設定環境變數');
    }

    try {
      const hfResponse = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: textPrompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      });

      if (!hfResponse.ok) {
        throw new Error(`Hugging Face API 失敗: ${hfResponse.status} - ${hfResponse.statusText}`);
      }

      const hfResult = await hfResponse.json();
      console.log('Hugging Face Raw Result:', hfResult);

      // 解析 Hugging Face 回應
      let generatedText = '';
      if (Array.isArray(hfResult) && hfResult.length > 0) {
        generatedText = hfResult[0].generated_text || '';
      } else if (hfResult.generated_text) {
        generatedText = hfResult.generated_text;
      } else {
        throw new Error('Hugging Face 回應格式異常');
      }

      // 嘗試解析 JSON
      let parsedChapter;
      try {
        // 尋找JSON內容（可能包含額外文字）
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedChapter = JSON.parse(jsonMatch[0]);
        } else {
          // 如果找不到JSON，創建一個基本的章節
          parsedChapter = {
            chapterId: `chapter_${Date.now()}`,
            title: "故事繼續",
            content: [
              generatedText || "AI生成了一個新的故事章節，但格式需要調整。",
              "故事將會繼續發展..."
            ],
            isTimedChoice: false,
            timeLimit: 0,
            choices: [
              { text: "繼續探索", choiceId: "continue_1" },
              { text: "仔細觀察", choiceId: "observe_1" },
              { text: "謹慎前進", choiceId: "careful_1" }
            ]
          };
        }
      } catch (parseErr) {
        console.error("JSON解析錯誤:", parseErr);
        // 創建回退章節
        parsedChapter = {
          chapterId: `fallback_${Date.now()}`,
          title: "故事轉折",
          content: [
            "你的選擇帶來了意想不到的結果...",
            generatedText.substring(0, 200) + "...",
            "故事將如何發展？"
          ],
          isTimedChoice: false,
          timeLimit: 0,
          choices: [
            { text: "勇敢面對", choiceId: "brave_1" },
            { text: "謹慎應對", choiceId: "cautious_1" },
            { text: "尋求幫助", choiceId: "help_1" }
          ]
        };
      }

      // 確保有 chapterId
      if (!parsedChapter.chapterId) {
        parsedChapter.chapterId = getCurrentChapterUniqueId(parsedChapter);
      }

      return { 
        success: true, 
        chapter: parsedChapter,
        choicePercentage: chosenChoicePercentage
      };

    } catch (error) {
      console.error("Hugging Face API 錯誤:", error);
      throw new Error(`AI生成失敗: ${error.message}`);
    }
  }, [db, auth, currentChapter, characterStats, getCurrentChapterUniqueId]);

  return {
    generateNextChapter
  };
};
