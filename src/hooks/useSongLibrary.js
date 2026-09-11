import { useEffect, useState } from 'react'
import { get, onValue, ref, set, update } from 'firebase/database'
import { INITIAL_SONGS, SONG_CATEGORIES } from '../data/initialSongs.js'
import { database, firebaseReady } from '../lib/firebase.js'

const STORAGE_KEY = 'yozu-music-library-v1'
const DATABASE_PATH = 'yozuMusic/songs'

function normalizeSong(song, fallbackId = '') {
  if (!song || typeof song !== 'object' || Array.isArray(song)) return null
  const normalized = {
    ...song,
    id: song.id || fallbackId,
    title: typeof song.title === 'string' ? song.title : '',
    artist: typeof song.artist === 'string' ? song.artist : '',
    url: typeof song.url === 'string' ? song.url : '',
    coverUrl: typeof song.coverUrl === 'string' ? song.coverUrl : '',
    note: typeof song.note === 'string' ? song.note : '',
    categories: Array.isArray(song.categories) ? song.categories.filter((category) => SONG_CATEGORIES.includes(category)) : [],
    tags: Array.isArray(song.tags) ? song.tags : [],
    workId: typeof song.workId === 'string' ? song.workId : '',
    workTitle: typeof song.workTitle === 'string' ? song.workTitle : '',
  }
  return normalized.id && normalized.title && normalized.url ? normalized : null
}

function normalizeSongs(value) {
  if (Array.isArray(value)) return value.map((song) => normalizeSong(song)).filter(Boolean)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).map(([id, song]) => normalizeSong(song, id)).filter(Boolean)
}

function readSongs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return normalizeSongs(saved ? JSON.parse(saved) : INITIAL_SONGS)
  } catch {
    return normalizeSongs(INITIAL_SONGS)
  }
}

export default function useSongLibrary(allowRemote = false) {
  const [songs, setSongs] = useState(readSongs)

  useEffect(() => {
    if (!firebaseReady || !allowRemote) {
      return undefined
    }

    const songsRef = ref(database, DATABASE_PATH)
    return onValue(songsRef, (snapshot) => {
      console.log('[YozuMusic][Firebase] 收到歌曲同步', {
        exists: snapshot.exists(),
        count: snapshot.exists() ? Object.keys(snapshot.val() || {}).length : 0,
      })
      if (!snapshot.exists()) {
        setSongs([])
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        return
      }

      const nextSongs = normalizeSongs(snapshot.val())
      setSongs(nextSongs)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSongs))
    }, (error) => {
      console.error('無法讀取 Firebase 歌曲資料：', error)
    })
  }, [allowRemote])

  function updateLocal(updater) {
    setSongs((current) => {
      const next = updater(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  async function addSong(song) {
    const nextSong = { ...song, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => [nextSong, ...current])
      return nextSong
    }
    await set(ref(database, `${DATABASE_PATH}/${nextSong.id}`), nextSong)
    return nextSong
  }

  async function updateSong(id, changes) {
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => current.map((song) => (song.id === id ? { ...song, ...changes } : song)))
      return
    }
    await update(ref(database, `${DATABASE_PATH}/${id}`), changes)
  }

  async function deleteSong(id) {
    console.log('[YozuMusic][Delete] 開始刪除', {
      id,
      firebaseReady,
      allowRemote,
      target: `${DATABASE_PATH}/${id}`,
    })
    if (!firebaseReady || !allowRemote) {
      console.warn('[YozuMusic][Delete] 使用本機模式刪除', { id })
      updateLocal((current) => current.filter((song) => song.id !== id))
      return
    }
    const songRef = ref(database, `${DATABASE_PATH}/${id}`)
    await update(ref(database, 'yozuMusic'), {
      [`deletedSongs/${id}`]: { deletedAt: new Date().toISOString() },
      [`songs/${id}`]: null,
    })
    console.log('[YozuMusic][Delete] Firebase 原子刪除與墓碑寫入已完成', { id })

    const verification = await get(songRef)
    console.log('[YozuMusic][Delete] Firebase 回讀驗證', { id, exists: verification.exists() })
    if (verification.exists()) {
      const verificationError = new Error(`Firebase 節點 ${id} 在刪除後仍然存在`)
      verificationError.code = 'delete-verification-failed'
      throw verificationError
    }
  }

  return { songs, addSong, updateSong, deleteSong }
}
