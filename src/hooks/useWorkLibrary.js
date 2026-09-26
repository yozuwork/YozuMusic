import { useEffect, useRef, useState } from 'react'
import { INITIAL_SONGS } from '../data/initialSongs.js'
import { USE_FIRESTORE, firebaseReady } from '../lib/firebase.js'
import { addWork as addWorkFirestore, deleteWork as deleteWorkFirestore, subscribeWorks, updateWork as updateWorkFirestore } from '../lib/firestore/worksApi.js'
import { rtdbDelete, rtdbGet, rtdbSet, rtdbUpdate } from '../lib/realtimeDbRest.js'

const STORAGE_KEY = 'yozu-music-works-v1'
const DATABASE_PATH = 'yozuMusic/works'

export function isSameWorkTitle(a = '', b = '') {
  return a.trim().localeCompare(b.trim(), 'zh-Hant', { sensitivity: 'accent' }) === 0
}

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
  const remoteFirestore = allowRemote && USE_FIRESTORE
  // 剛建立、還沒從資料庫同步回來的作品；避免短時間內重複建立同名作品
  const pendingWorksRef = useRef([])
  const worksRef = useRef(works)
  worksRef.current = works

  useEffect(() => {
    if (!firebaseReady || !allowRemote) return undefined

    function handleNext(nextWorksRaw) {
      const nextWorks = normalizeWorks(nextWorksRaw)
      setWorks(nextWorks)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorks))
    }

    if (remoteFirestore) {
      return subscribeWorks(handleNext, (error) => {
        console.error('無法讀取 Firestore 作品資料：', error)
      })
    }

    let cancelled = false
    rtdbGet(DATABASE_PATH).then((value) => {
      if (cancelled) return
      handleNext(value)
    }).catch((error) => {
      console.error('無法讀取 Firebase 作品資料：', error)
    })
    return () => { cancelled = true }
  }, [allowRemote, remoteFirestore])

  function updateLocal(updater) {
    setWorks((current) => {
      const next = updater(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function findWorkByTitle(title, excludeId = '') {
    return [...worksRef.current, ...pendingWorksRef.current]
      .find((item) => item.id !== excludeId && isSameWorkTitle(item.title, title))
  }

  async function addWork(work) {
    const existing = findWorkByTitle(work.title)
    if (existing) return existing

    const nextWork = {
      ...work,
      type: ['動漫', '遊戲'].includes(work.type) ? work.type : '動漫',
      title: work.title.trim(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    pendingWorksRef.current = [...pendingWorksRef.current, nextWork]
    setTimeout(() => {
      pendingWorksRef.current = pendingWorksRef.current.filter((item) => item.id !== nextWork.id)
    }, 10000)
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => [nextWork, ...current])
      return nextWork
    }
    if (remoteFirestore) return addWorkFirestore(nextWork)
    await rtdbSet(`${DATABASE_PATH}/${nextWork.id}`, nextWork)
    updateLocal((current) => [nextWork, ...current])
    return nextWork
  }

  async function updateWork(id, changes) {
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => current.map((work) => work.id === id ? { ...work, ...changes } : work))
      return
    }
    if (remoteFirestore) return updateWorkFirestore(id, changes)
    await rtdbUpdate(`${DATABASE_PATH}/${id}`, changes)
    updateLocal((current) => current.map((work) => work.id === id ? { ...work, ...changes } : work))
  }

  async function deleteWork(id) {
    pendingWorksRef.current = pendingWorksRef.current.filter((item) => item.id !== id)
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => current.filter((work) => work.id !== id))
      return
    }
    if (remoteFirestore) return deleteWorkFirestore(id)
    await rtdbDelete(`${DATABASE_PATH}/${id}`)
    updateLocal((current) => current.filter((work) => work.id !== id))
  }

  return { works, addWork, updateWork, deleteWork, findWorkByTitle }
}
