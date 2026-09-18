import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { auth, firebaseReady } from '../lib/firebase.js'

export const OWNER_UID = import.meta.env.VITE_FIREBASE_OWNER_UID

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

function createGoogleProvider() {
  const provider = new GoogleAuthProvider()
  // 每次登入都強制顯示帳號選擇畫面，避免手機瀏覽器直接沿用目前已登入的 Google 帳號。
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

export default function useFirebaseAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setError('Firebase 環境設定不完整。')
      setLoading(false)
      return undefined
    }

    setPersistence(auth, browserLocalPersistence).catch(() => {})

    // 手機瀏覽器多半用 signInWithRedirect 完成登入，回到頁面後要接住結果才會真正保持登入狀態。
    getRedirectResult(auth).catch((redirectError) => {
      if (redirectError?.code !== 'auth/popup-closed-by-user') {
        setError('Google 登入失敗，請確認 Firebase 已啟用 Google 登入。')
      }
    })

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    }, () => {
      setError('無法確認登入狀態，請稍後再試。')
      setLoading(false)
    })
  }, [])

  async function login() {
    setError('')
    const provider = createGoogleProvider()
    try {
      if (isMobileDevice()) {
        await signInWithRedirect(auth, provider)
        return
      }
      await signInWithPopup(auth, provider)
    } catch (loginError) {
      if (loginError.code === 'auth/popup-closed-by-user') return
      setError('Google 登入失敗，請確認 Firebase 已啟用 Google 登入。')
    }
  }

  async function logout() {
    setError('')
    await signOut(auth)
  }

  return { user, loading, error, login, logout }
}
