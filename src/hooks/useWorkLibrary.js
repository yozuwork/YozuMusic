import { useEffect, useState } from 'react'
import { onValue, ref, set, update } from 'firebase/database'
import { INITIAL_SONGS } from '../data/initialSongs.js'
import { database, firebaseReady } from '../lib/firebase.js'

const STORAGE_KEY = 'yozu-music-works-v1'
const DATABASE_PATH = 'yozuMusic/works'

function normalizeWork(work, fallbackId = '') {
  if (!work || typeof work !== 'object' || Array.isArray(work)) return null
  const title = typeof work.title === 'string' ? work.title.trim() : ''
  const inferredType = INITIAL_SONGS.find((song) => song.workTitle === title)?.workType
  const normalized = {
    ...work,
    id: work.id || fallbackId,
    title,
    coverUrl: typeof work.coverUrl === 'string' ? work.coverUrl : '',
    coverPosX: Number.isFinite(work.coverPosX) ? work.coverPosX : 50,
    coverPosY: Number.isFinite(work.coverPosY) ? work.coverPosY : 50,
    coverFit: work.coverFit === 'contain' ? 'contain' : 'cover',
    type: ['動漫', '遊戲'].includes(work.type) ? work.type : inferredType || '動漫',
  }
  return normalized.id && normalized.title ? normalized : null
}

function normalizeWorks(value) {
  if (Array.isArray(value)) return value.map((work) => normalizeWork(work)).filter(Boolean)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).map(([id, work]) => normalizeWork(work, id)).filter(Boolean)
}

function getInitialWorks() {
  const byTitle = new Map()
  INITIAL_SONGS.forEach((song) => {
    const title = song.workTitle?.trim()
    if (!title || byTitle.has(title)) return
    byTitle.set(title, {
      id: `sample-work-${byTitle.size + 1}`,
      title,
      type: song.workType || '動漫',
      coverUrl: song.coverUrl || '',
      createdAt: song.createdAt,
    })
  })
  return [...byTitle.values()]
}

function readWorks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return normalizeWorks(saved ? JSON.parse(saved) : getInitialWorks())
  } catch {
    return getInitialWorks()
  }
}

export default function useWorkLibrary(allowRemote = false) {
  const [works, setWorks] = useState(readWorks)

  useEffect(() => {
    if (!firebaseReady || !allowRemote) return undefined

    const worksRef = ref(database, DATABASE_PATH)
    return onValue(worksRef, (snapshot) => {
      if (!snapshot.exists()) {
        setWorks([])
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        return
      }

      const nextWorks = normalizeWorks(snapshot.val())
      setWorks(nextWorks)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorks))
    }, (error) => {
      console.error('無法讀取 Firebase 作品資料：', error)
    })
  }, [allowRemote])

  function updateLocal(updater) {
    setWorks((current) => {
      const next = updater(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  async function addWork(work) {
    const existing = works.find((item) => item.title.localeCompare(work.title, 'zh-Hant', { sensitivity: 'accent' }) === 0)
    if (existing) return existing

    const nextWork = {
      ...work,
      type: ['動漫', '遊戲'].includes(work.type) ? work.type : '動漫',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => [nextWork, ...current])
      return nextWork
    }
    await set(ref(database, `${DATABASE_PATH}/${nextWork.id}`), nextWork)
    return nextWork
  }

  async function updateWork(id, changes) {
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => current.map((work) => work.id === id ? { ...work, ...changes } : work))
      return
    }
    await update(ref(database, `${DATABASE_PATH}/${id}`), changes)
  }

  return { works, addWork, updateWork }
}
