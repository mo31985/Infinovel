import { useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, increment, collection } from 'firebase/firestore';
import { APP_ID } from '../utils/constants';

export const useStoryGenerator = (db, auth, currentChapter, characterStats, getCurrentChapterUniqueId) => {
  
  // 調用 LLM 生成下一章節內容
  const generateNextChapter = useCallback(async (userChoiceText, selectedChoiceId, isAutoChoice = false) => {
    if (!db || !auth || !auth.currentUser || !currentChapter || !selectedChoiceId) {
      throw new Error('缺少必要的參數或服務');
    }

    // 更新選擇統計數據
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

    const textResponse = await fetch(textApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(textPayload)
    });

    if (!textResponse.ok) {
      const errorData = await textResponse.json();
      throw new Error(`文本 API 請求失敗，狀態碼: ${textResponse.status} - ${errorData.error?.message || textResponse.statusText}. 請確保您已在 Google Cloud Console 中啟用 Generative Language API。`);
    }

    const textResult = await textResponse.json();
    console.log('LLM Text Raw Result:', textResult);

    if (textResult.candidates && textResult.candidates.length > 0 &&
        textResult.candidates[0].content && textResult.candidates[0].content.parts &&
        textResult.candidates[0].content.parts.length > 0) {
      const jsonText = textResult.candidates[0].content.parts[0].text;
      const parsedChapter = JSON.parse(jsonText);
      
      if (!parsedChapter.chapterId) {
        parsedChapter.chapterId = getCurrentChapterUniqueId(parsedChapter);
      }
      
      return { 
        success: true, 
        chapter: parsedChapter,
        choicePercentage: chosenChoicePercentage
      };
    } else {
      throw new Error('LLM 文本回應格式不正確或內容缺失。');
    }
  }, [db, auth, currentChapter, characterStats, getCurrentChapterUniqueId]);

  return {
    generateNextChapter
  };
};