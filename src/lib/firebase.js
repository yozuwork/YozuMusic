import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Object.values(firebaseConfig).every(Boolean)
export const firebaseApp = firebaseReady
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const database = firebaseApp ? getDatabase(firebaseApp) : null
export const db = firebaseApp ? getFirestore(firebaseApp) : null

// 遷移期間的開關：關閉時整個 app 仍走原本的 Realtime Database 讀寫路徑，
// 開發/驗證完 Firestore 版本後再打開，隨時可以一鍵切回舊行為。
export const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE === 'true'
