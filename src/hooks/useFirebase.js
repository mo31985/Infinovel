import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../utils/constants';

export const useFirebase = () => {
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);

  useEffect(() => {
    console.log('--- useFirebase: Firebase Init Triggered ---');
    
    const initFirebase = async () => {
      try {
        if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.authDomain || !FIREBASE_CONFIG.projectId) {
          const configErrorMsg = "Firebase 配置為空或缺少關鍵金鑰。請確保您的 Firebase 專案已正確設定。應用程式功能受限。";
          console.error("Firebase initialization prevented (missing config keys):", configErrorMsg);
          setFirebaseError(configErrorMsg);
          setIsFirebaseReady(true);
          return;
        }

        console.log("Initializing Firebase app...");
        const appInstance = initializeApp(FIREBASE_CONFIG);
        const authInstance = getAuth(appInstance);
        const firestoreInstance = getFirestore(appInstance);
        
        setAuth(authInstance);
        setDb(firestoreInstance);
        setIsFirebaseReady(true);
        
        console.log("Firebase app, auth, db instances set.");
        console.log("應用程式正在使用 Canvas 環境提供的 Firebase 配置。");
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setFirebaseError(`Firebase 初始化失敗: ${error.message}`);
        setIsFirebaseReady(true);
      }
    };

    initFirebase();
  }, []);

  return {
    auth,
    db,
    isFirebaseReady,
    firebaseError
  };
};