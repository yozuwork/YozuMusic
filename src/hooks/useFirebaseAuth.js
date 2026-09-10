import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, firebaseReady } from '../lib/firebase.js'

export const OWNER_UID = import.meta.env.VITE_FIREBASE_OWNER_UID

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
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
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
