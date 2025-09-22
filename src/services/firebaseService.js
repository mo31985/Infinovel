import { doc, setDoc, getDoc, updateDoc, increment, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { APP_ID, DEFAULT_LOAD_LIMIT, DEFAULT_SAVE_LIMIT, VIP_LOAD_LIMIT, VIP_SAVE_LIMIT } from '../utils/constants';

export class FirebaseService {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;
  }

  // 保存遊戲進度
  async saveProgress(currentChapter, characterStats, userPathHistory, isAutoSave = false) {
    if (!this.db || !this.auth || !this.auth.currentUser || !currentChapter) {
      if (isAutoSave) {
        console.warn('嘗試自動保存失敗：未登入或無當前章節數據。');
        return { success: false, message: '自動保存失敗' };
      }
      throw new Error('無法保存進度：未登入或無當前章節數據。');
    }

    const userUid = this.auth.currentUser.uid;
    const saveDocRef = doc(this.db, `artifacts/${APP_ID}/users/${userUid}/saved_stories`, 'main_story');
    const profileDocRef = doc(this.db, `artifacts/${APP_ID}/users/${userUid}/profile`, 'user_data');

    try {
      const currentProfileSnap = await getDoc(profileDocRef);
      const currentProfileData = currentProfileSnap.exists() ? currentProfileSnap.data() : {};
      const currentSaveCount = currentProfileData.saveCount || 0;
      const currentCalculatedSaveLimit = currentProfileData.isVIP ? VIP_SAVE_LIMIT : DEFAULT_SAVE_LIMIT;

      if (!isAutoSave && currentSaveCount >= currentCalculatedSaveLimit) {
        throw new Error(`您已達到保存次數上限 (${currentCalculatedSaveLimit} 次)。`);
      }

      await setDoc(saveDocRef, {
        currentChapterState: currentChapter,
        characterStats: characterStats,
        userPathHistory: userPathHistory,
        lastSavedAt: new Date(),
      }, { merge: true });

      if (!isAutoSave) {
        await updateDoc(profileDocRef, {
          saveCount: increment(1),
          lastSaveAt: new Date()
        });
        return { success: true, message: '進度保存成功！', incrementCount: true };
      } else {
        console.log('自動保存成功。');
        return { success: true, message: '自動保存成功', incrementCount: false };
      }
    } catch (err) {
      console.error("保存進度時出錯:", err);
      if (!isAutoSave) {
        throw new Error(`保存進度失敗: ${err.message}`);
      }
      return { success: false, message: '自動保存失敗' };
    }
  }

  // 載入遊戲進度
  async loadProgress(isManualLoad = false) {
    if (!this.db || !this.auth || !this.auth.currentUser) {
      throw new Error('無法載入進度：未登入。');
    }

    const userUid = this.auth.currentUser.uid;
    const saveDocRef = doc(this.db, `artifacts/${APP_ID}/users/${userUid}/saved_stories`, 'main_story');
    const profileDocRef = doc(this.db, `artifacts/${APP_ID}/users/${userUid}/profile`, 'user_data');

    try {
      const currentProfileSnap = await getDoc(profileDocRef);
      const currentProfileData = currentProfileSnap.exists() ? currentProfileSnap.data() : {};
      const currentLoadCount = currentProfileData.loadCount || 0;
      const currentCalculatedLoadLimit = currentProfileData.isVIP ? VIP_LOAD_LIMIT : DEFAULT_LOAD_LIMIT;

      if (isManualLoad && currentLoadCount >= currentCalculatedLoadLimit) {
        throw new Error(`您已達到載入次數上限 (${currentCalculatedLoadLimit} 次)。`);
      }

      const docSnap = await getDoc(saveDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.currentChapterState) {
          if (isManualLoad) {
            await updateDoc(profileDocRef, {
              loadCount: increment(1),
              lastLoadAt: new Date()
            });
          }
          return {
            success: true,
            data: {
              currentChapterState: data.currentChapterState,
              characterStats: data.characterStats || {
                strength: 1, intelligence: 1, agility: 1,
                strengthAccumulation: 0, intelligenceAccumulation: 0, agilityAccumulation: 0
              },
              userPathHistory: data.userPathHistory || []
            },
            message: '進度載入成功！',
            incrementCount: isManualLoad
          };
        } else {
          return { success: false, message: '沒有找到有效的保存進度。' };
        }
      } else {
        return { success: false, message: '沒有找到保存的進度。' };
      }
    } catch (err) {
      console.error("載入進度時出錯:", err);
      throw new Error(`載入進度失敗: ${err.message}`);
    }
  }

  // 重新開始遊戲
  async restartGame() {
    if (!this.db || !this.auth || !this.auth.currentUser) {
      throw new Error('無法重新開始遊戲：未登入。');
    }

    const userUid = this.auth.currentUser.uid;
    const saveDocRef = doc(this.db, `artifacts/${APP_ID}/users/${userUid}/saved_stories`, 'main_story');
    const profileDocRef = doc(this.db, `artifacts/${APP_ID}/users/${userUid}/profile`, 'user_data');

    try {
      await deleteDoc(saveDocRef);
      console.log('Saved story deleted.');

      const currentProfileSnap = await getDoc(profileDocRef);
      const currentProfileData = currentProfileSnap.exists() ? currentProfileSnap.data() : {};
      
      await setDoc(profileDocRef, {
        ...currentProfileData,
        loadCount: 0,
        saveCount: 0,
        lastRestartAt: new Date(),
      }, { merge: true });

      return { success: true, message: '遊戲已重新開始，所有進度已清除！' };
    } catch (err) {
      console.error("重新開始遊戲時出錯:", err);
      throw new Error(`重新開始遊戲失敗: ${err.message}`);
    }
  }

  // 提交回饋
  async submitFeedback(feedbackText, chapterId) {
    if (!this.db || !this.auth || !this.auth.currentUser) {
      throw new Error('請登入以提交回饋。');
    }
    if (!feedbackText.trim()) {
      throw new Error('回饋內容不能為空。');
    }

    const userUid = this.auth.currentUser.uid;
    const feedbackCollectionRef = collection(this.db, `artifacts/${APP_ID}/public/data/feedback`);

    try {
      await addDoc(feedbackCollectionRef, {
        userId: userUid,
        feedbackText: feedbackText,
        chapterId: chapterId || 'initial_load',
        timestamp: Date.now(),
      });
      return { success: true, message: '回饋提交成功！感謝您的寶貴意見。' };
    } catch (err) {
      console.error("提交回饋時出錯:", err);
      throw new Error(`提交回饋失敗: ${err.message}`);
    }
  }

  // 獲取選擇統計數據
  async getChoiceStats(chapterUniqueId) {
    if (!this.db) {
      return {};
    }

    const statsDocRef = doc(collection(this.db, 'artifacts', APP_ID, 'public', 'data', 'choice_stats'), chapterUniqueId);

    try {
      console.log(`獲取選擇統計數據: ${chapterUniqueId}`);
      const docSnap = await getDoc(statsDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const total = data.totalSelectionsForChapter || 0;
        const stats = {};
        if (data.choices) {
          data.choices.forEach(choice => {
            stats[choice.choiceId] = {
              count: choice.totalCount,
              percentage: total > 0 ? ((choice.totalCount / total) * 100).toFixed(1) : 0
            };
          });
        }
        console.log('選擇統計數據已載入:', stats);
        return stats;
      } else {
        console.log('未找到此章節的選擇統計數據。');
        return {};
      }
    } catch (err) {
      console.error("獲取選擇統計數據時出錯:", err);
      return {};
    }
  }
}