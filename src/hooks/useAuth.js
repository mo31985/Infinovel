import { useState, useEffect, useCallback, useContext } from 'react';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// 認證錯誤訊息映射
const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return '該電子郵件已被註冊。請直接登入或使用其他電子郵件。';
    case 'auth/invalid-email':
      return '電子郵件格式不正確。';
    case 'auth/weak-password':
      return '密碼強度不足，請至少輸入6個字符。';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '電子郵件或密碼不正確。';
    case 'auth/operation-not-allowed':
      return '此認證操作未啟用。請檢查 Firebase 控制台中的認證設定。';
    case 'auth/popup-closed-by-user':
      return '您關閉了登入視窗。';
    case 'auth/cancelled-popup-request':
      return '登入請求被取消。';
    default:
      return '認證失敗，請重試。';
  }
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [userProfile, setUserProfile] = useState({
    loadCount: 0,
    saveCount: 0,
    isVIP: false,
    isRegistered: false,
    email: null,
  });

  const auth = getAuth();
  const db = getFirestore();

  // 清除錯誤訊息
  const clearAuthError = useCallback(() => {
    setAuthError('');
  }, []);

  // 清除成功訊息
  const clearAuthMessage = useCallback(() => {
    setAuthMessage('');
  }, []);

  // 初始化用戶資料
  const initializeUserProfile = useCallback(async (user) => {
    if (!user || !db) return;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // 創建新用戶資料
      const newUserData = {
        createdAt: new Date(),
        lastLogin: new Date(),
        loadCount: 0,
        saveCount: 0,
        isVIP: false,
        email: user.email,
        isAnonymous: user.isAnonymous
      };
      
      await setDoc(userDocRef, newUserData);
      setUserProfile({
        loadCount: 0,
        saveCount: 0,
        isVIP: false,
        isRegistered: !user.isAnonymous,
        email: user.email,
      });
    } else {
      // 載入現有用戶資料
      const userData = userDocSnap.data();
      setUserProfile({
        loadCount: userData.loadCount || 0,
        saveCount: userData.saveCount || 0,
        isVIP: userData.isVIP || false,
        isRegistered: !user.isAnonymous,
        email: user.email,
      });
      
      // 更新最後登入時間
      await updateDoc(userDocRef, { lastLogin: new Date() });
    }
  }, [db]);

  // 監聽認證狀態變化
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await initializeUserProfile(user);
      } else {
        // 重置用戶資料
        setUserProfile({
          loadCount: 0,
          saveCount: 0,
          isVIP: false,
          isRegistered: false,
          email: null,
        });
      }
      
      setIsAuthReady(true);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth, initializeUserProfile]);

  // 電子郵件註冊
  const registerWithEmail = useCallback(async (email, password) => {
    if (!email.trim() || !password.trim()) {
      setAuthError('請輸入有效的電子郵件和密碼。');
      return false;
    }

    try {
      setAuthMessage('處理中...');
      setAuthError('');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setAuthMessage('註冊成功！您已自動登入。');
      
      // 自動清除成功訊息
      setTimeout(() => setAuthMessage(''), 3000);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      setAuthError(getErrorMessage(error.code));
      
      // 自動清除錯誤訊息
      setTimeout(() => setAuthError(''), 5000);
      return false;
    } finally {
      setTimeout(() => setAuthMessage(''), 3000);
    }
  }, [auth]);

  // 電子郵件登入
  const signInWithEmail = useCallback(async (email, password) => {
    if (!email.trim() || !password.trim()) {
      setAuthError('請輸入有效的電子郵件和密碼。');
      return false;
    }

    try {
      setAuthMessage('處理中...');
      setAuthError('');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setAuthMessage('登入成功！');
      
      // 自動清除成功訊息
      setTimeout(() => setAuthMessage(''), 3000);
      return true;
    } catch (error) {
      console.error('Sign in failed:', error);
      setAuthError(getErrorMessage(error.code));
      
      // 自動清除錯誤訊息
      setTimeout(() => setAuthError(''), 5000);
      return false;
    } finally {
      setTimeout(() => setAuthMessage(''), 3000);
    }
  }, [auth]);

  // Google 登入
  const signInWithGoogle = useCallback(async () => {
    try {
      setAuthError('');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      setAuthMessage('登入成功！');
      
      // 自動清除成功訊息
      setTimeout(() => setAuthMessage(''), 3000);
      return true;
    } catch (error) {
      console.error('Google sign in failed:', error);
      setAuthError(getErrorMessage(error.code));
      
      // 自動清除錯誤訊息
      setTimeout(() => setAuthError(''), 5000);
      return false;
    }
  }, [auth]);

  // 匿名登入
  const signInAsGuest = useCallback(async () => {
    try {
      setAuthError('');
      setAuthMessage('正在以訪客身份登入...');
      
      await signInAnonymously(auth);
      setAuthMessage('以訪客身份登入成功！');
      
      // 自動清除成功訊息
      setTimeout(() => setAuthMessage(''), 3000);
      return true;
    } catch (error) {
      console.error('Guest sign in failed:', error);
      setAuthError(`以訪客身份登入失敗: ${error.message}`);
      
      // 自動清除錯誤訊息
      setTimeout(() => setAuthError(''), 5000);
      return false;
    } finally {
      setTimeout(() => setAuthMessage(''), 3000);
    }
  }, [auth]);

  // 登出
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setAuthMessage('已成功登出');
      
      // 自動清除成功訊息
      setTimeout(() => setAuthMessage(''), 3000);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthError(`登出失敗: ${error.message}`);
      
      // 自動清除錯誤訊息
      setTimeout(() => setAuthError(''), 5000);
      return false;
    }
  }, [auth]);

  return {
    // 狀態
    currentUser,
    isAuthReady,
    authLoading,
    authError,
    authMessage,
    userProfile,
    
    // 操作
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInAsGuest,
    logout,
    clearAuthError,
    clearAuthMessage,
    
    // 輔助函數
    isLoggedIn: !!currentUser,
    isAnonymous: currentUser?.isAnonymous || false,
    userId: currentUser?.uid || null,
  };
};

export default useAuth;