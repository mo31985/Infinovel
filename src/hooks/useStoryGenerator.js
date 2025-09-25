import { useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, increment, collection } from 'firebase/firestore';

export const useStoryGenerator = (db, auth, currentChapter, characterStats, getCurrentChapterUniqueId) => {
  
  const generateNextChapter = useCallback(async (userChoiceText, selectedChoiceId, isAutoChoice = false) => {
    if (!db || !auth || !auth.currentUser || !currentChapter || !selectedChoiceId) {
      throw new Error('缺少必要的參數或服務');
    }

    const APP_ID = 'infinovel';
    let chosenChoicePercentage = 'N/A';

    // === Firebase 統計更新邏輯（保持不變）===
    const chapterUniqueId = getCurrentChapterUniqueId(currentChapter);
    const statsDocRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'choice_stats'), chapterUniqueId);

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

    // === 🤖 AI 故事生成邏輯 ===
    console.log('🤖 開始生成 AI 故事內容...');

    // 構建故事提示
    const currentStoryContext = currentChapter ? currentChapter.content.join(' ') : '';
    const prompt = `Interactive story set in Victorian London with steam technology and magic. 

Previous story: ${currentStoryContext}

Player choice: ${userChoiceText}

Character stats: Strength ${characterStats.strength}, Intelligence ${characterStats.intelligence}, Agility ${characterStats.agility}

Continue the story with 2-3 paragraphs and provide 3 meaningful choices for the player.`;

    // 🔄 多重 AI API 嘗試
    const aiServices = [
      {
        name: 'OpenAI-Compatible Free',
        url: 'https://api.openai.com/v1/completions',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          model: 'text-davinci-003',
          prompt: prompt,
          max_tokens: 400,
          temperature: 0.8
        }
      },
      {
        name: 'Together AI (Free)',
        url: 'https://api.together.ai/inference',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          model: 'mistralai/Mistral-7B-Instruct-v0.1',
          prompt: prompt,
          max_tokens: 400,
          temperature: 0.7
        }
      },
      {
        name: 'Replicate Free',
        url: 'https://api.replicate.com/v1/predictions',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          version: "meta/llama-2-7b-chat",
          input: {
            prompt: prompt,
            max_length: 400
          }
        }
      }
    ];

    // 🎯 嘗試各種 AI 服務
    for (const service of aiServices) {
      try {
        console.log(`🌐 嘗試 ${service.name}...`);
        
        const response = await fetch(service.url, {
          method: 'POST',
          headers: service.headers,
          body: JSON.stringify(service.body)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ ${service.name} 成功回應:`, result);
          
          // 解析不同服務的回應格式
          let generatedText = '';
          
          if (result.choices && result.choices[0]) {
            generatedText = result.choices[0].text;
          } else if (result.output) {
            generatedText = Array.isArray(result.output) ? result.output.join(' ') : result.output;
          } else if (result.prediction && result.prediction.output) {
            generatedText = result.prediction.output;
          } else if (typeof result === 'string') {
            generatedText = result;
          }

          if (generatedText && generatedText.length > 50) {
            console.log('🎉 AI 生成成功，解析內容...');
            
            const aiChapter = parseAIResponse(generatedText, userChoiceText, selectedChoiceId);
            
            return { 
              success: true, 
              chapter: aiChapter,
              choicePercentage: chosenChoicePercentage,
              source: service.name
            };
          }
        }
        
        console.log(`❌ ${service.name} 失敗:`, response.status);
        
      } catch (error) {
        console.log(`💥 ${service.name} 錯誤:`, error.message);
      }
    }

    // 🎲 如果所有 AI 服務都失敗，使用高級本地生成器
    console.log('🔄 所有 AI 服務不可用，使用智能本地生成器');
    
    const localChapter = generateIntelligentLocalStory(userChoiceText, selectedChoiceId, characterStats);

    if (!localChapter.chapterId) {
      localChapter.chapterId = getCurrentChapterUniqueId(localChapter);
    }

    return { 
      success: true, 
      chapter: localChapter,
      choicePercentage: chosenChoicePercentage,
      source: 'intelligent_local_generator'
    };

  }, [db, auth, currentChapter, characterStats, getCurrentChapterUniqueId]);

  return {
    generateNextChapter
  };
};

// 🧠 解析 AI 回應的函數
const parseAIResponse = (aiText, userChoice, choiceId) => {
  try {
    // 嘗試從 AI 回應中解析結構化內容
    const lines = aiText.split('\n').filter(line => line.trim().length > 0);
    
    let content = [];
    let choices = [];
    let title = "AI 生成的冒險";
    
    // 簡單的內容解析
    const choiceKeywords = ['choice', 'option', '選擇', 'A)', 'B)', 'C)', '1.', '2.', '3.'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 檢查是否是選擇項
      const isChoice = choiceKeywords.some(keyword => 
        line.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isChoice && choices.length < 3) {
        // 清理選擇文本
        let choiceText = line
          .replace(/^[A-C]\)?\s*/, '')
          .replace(/^[1-3]\.?\s*/, '')
          .replace(/choice:?\s*/i, '')
          .replace(/option:?\s*/i, '');
          
        if (choiceText.length > 10) {
          choices.push({
            text: choiceText,
            choiceId: `ai_choice_${choices.length + 1}_${Date.now()}`
          });
        }
      } else if (line.length > 20 && content.length < 4) {
        content.push(line);
      }
    }
    
    // 如果沒有解析到足夠的內容，使用 fallback
    if (content.length === 0) {
      content = [
        `你選擇了「${userChoice}」，這個決定帶來了意想不到的變化。`,
        aiText.substring(0, 200) + '...',
        '故事還在繼續發展，你需要做出下一個重要的選擇。'
      ];
    }
    
    if (choices.length === 0) {
      choices = [
        { text: '勇敢地繼續前進', choiceId: `ai_brave_${Date.now()}` },
        { text: '謹慎地觀察周圍', choiceId: `ai_careful_${Date.now()}` },
        { text: '尋求幫助和建議', choiceId: `ai_help_${Date.now()}` }
      ];
    }
    
    return {
      chapterId: `ai_${choiceId}_${Date.now()}`,
      title: title,
      content: content,
      isTimedChoice: false,
      timeLimit: 0,
      choices: choices
    };
    
  } catch (error) {
    console.error('解析 AI 回應失敗:', error);
    
    // Fallback 內容
    return {
      chapterId: `fallback_${choiceId}_${Date.now()}`,
      title: "意外的轉折",
      content: [
        `你的選擇「${userChoice}」帶來了新的發展。`,
        "AI 為你生成了一個獨特的故事情節，充滿了意想不到的轉折和挑戰。",
        "現在你需要決定下一步的行動方向。"
      ],
      isTimedChoice: false,
      timeLimit: 0,
      choices: [
        { text: '繼續探索未知', choiceId: `explore_${Date.now()}` },
        { text: '停下來思考策略', choiceId: `think_${Date.now()}` },
        { text: '尋找其他線索', choiceId: `investigate_${Date.now()}` }
      ]
    };
  }
};

// 🎲 智能本地生成器（作為最後的回退方案）
const generateIntelligentLocalStory = (userChoice, choiceId, characterStats) => {
  const storyTemplates = [
    {
      condition: () => characterStats.strength > 7,
      title: "力量的考驗",
      content: [
        `憑藉你的強大力量，你決定${userChoice}。`,
        "你的肌肉緊繃，準備面對任何可能的挑戰。在蒸汽瀰漫的倫敦街道上，你的存在感無可置疑。路人們紛紛側目，感受到你身上散發的強大氣場。",
        "突然，前方傳來金屬碰撞的巨響。一台巨大的蒸汽機械正在失控，朝著無辜的市民衝去。只有你有能力阻止這場災難。"
      ],
      choices: [
        { text: "用蠻力直接攔截失控的機械", choiceId: "force_stop_machine" },
        { text: "尋找機械的關閉開關", choiceId: "find_shutdown_switch" },
        { text: "疏散周圍的民眾", choiceId: "evacuate_civilians" }
      ]
    },
    {
      condition: () => characterStats.intelligence > 7,
      title: "智慧的抉擇",
      content: [
        `運用你敏銳的智慧，你選擇${userChoice}。`,
        "你的大腦快速分析著眼前的情況，每一個細節都被你收入眼底。在這個充滿蒸汽科技與古老魔法的世界裡，知識就是最強大的武器。",
        "你注意到周圍環境中的異常現象：牆上的符文在微弱地發光，空氣中的魔法能量正在聚集。這些線索指向一個驚人的真相。"
      ],
      choices: [
        { text: "深入研究符文的含義", choiceId: "research_runes" },
        { text: "測量魔法能量的強度", choiceId: "measure_magic" },
        { text: "尋找相關的古老文獻", choiceId: "find_ancient_texts" }
      ]
    },
    {
      condition: () => characterStats.agility > 7,
      title: "敏捷的行動",
      content: [
        `以你超凡的敏捷，你迅速${userChoice}。`,
        "你的身體如同影子般移動，每一個動作都精準而流暢。在這個充滿機關和陷阱的神秘世界中，速度和反應力往往能決定生死。",
        "就在這時，你聽到了微弱的機械轉動聲。某種隱藏的裝置正在啟動，你需要在它完全激活之前做出反應。"
      ],
      choices: [
        { text: "快速閃避並尋找掩護", choiceId: "dodge_and_cover" },
        { text: "趁機接近裝置並破壞它", choiceId: "sabotage_device" },
        { text: "利用環境優勢進行反擊", choiceId: "environmental_counter" }
      ]
    },
    {
      condition: () => true, // 默認模板
      title: "命運的分岔路",
      content: [
        `你深思熟慮後決定${userChoice}。`,
        "在這個蒸汽與魔法交織的維多利亞時代倫敦，每一個選擇都可能改變歷史的進程。霧氣瀰漫的街道上，神秘的事件正在悄然發生。",
        "遠處傳來教堂鐘聲，提醒著你時間的緊迫。在陰影中，你隱約看到了一個熟悉的身影，這可能是解開謎團的關鍵線索。"
      ],
      choices: [
        { text: "跟隨那個神秘身影", choiceId: "follow_figure" },
        { text: "繼續原定的調查計劃", choiceId: "continue_investigation" },
        { text: "尋求當地人的幫助", choiceId: "seek_local_help" }
      ]
    }
  ];

  // 選擇符合條件的故事模板
  const selectedTemplate = storyTemplates.find(template => template.condition()) || storyTemplates[storyTemplates.length - 1];

  return {
    chapterId: `local_${choiceId}_${Date.now()}`,
    title: selectedTemplate.title,
    content: selectedTemplate.content,
    isTimedChoice: false,
    timeLimit: 0,
    choices: selectedTemplate.choices
  };
};
