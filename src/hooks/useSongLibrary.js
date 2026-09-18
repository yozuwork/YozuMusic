import { useEffect, useState } from 'react'
import { INITIAL_SONGS, SONG_CATEGORIES } from '../data/initialSongs.js'
import { USE_FIRESTORE, firebaseReady } from '../lib/firebase.js'
import { addSong as addSongFirestore, deleteSong as deleteSongFirestore, updateSong as updateSongFirestore } from '../lib/firestore/songsApi.js'
import { rtdbGet, rtdbUpdate, rtdbSet } from '../lib/realtimeDbRest.js'

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
  const remoteFirestore = allowRemote && USE_FIRESTORE

  useEffect(() => {
    if (!firebaseReady || !allowRemote || remoteFirestore) {
      return undefined
    }

    let cancelled = false
    rtdbGet(DATABASE_PATH).then((value) => {
      if (cancelled) return
      console.log('[YozuMusic][Firebase REST] 收到歌曲同步', {
        exists: Boolean(value),
        count: value ? Object.keys(value).length : 0,
      })
      const nextSongs = normalizeSongs(value)
      setSongs(nextSongs)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSongs))
    }).catch((error) => {
      console.error('無法讀取 Firebase 歌曲資料：', error)
    })
    return () => { cancelled = true }
  }, [allowRemote, remoteFirestore])

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
    if (remoteFirestore) return addSongFirestore(nextSong)
    await rtdbSet(`${DATABASE_PATH}/${nextSong.id}`, nextSong)
    updateLocal((current) => [nextSong, ...current])
    return nextSong
  }

  async function updateSong(id, changes) {
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => current.map((song) => (song.id === id ? { ...song, ...changes } : song)))
      return
    }
    if (remoteFirestore) return updateSongFirestore(id, changes)
    await rtdbUpdate(`${DATABASE_PATH}/${id}`, changes)
    updateLocal((current) => current.map((song) => (song.id === id ? { ...song, ...changes } : song)))
  }

  async function deleteSong(id) {
    if (!firebaseReady || !allowRemote) {
      updateLocal((current) => current.filter((song) => song.id !== id))
      return
    }
    if (remoteFirestore) return deleteSongFirestore(id)

    await rtdbUpdate('yozuMusic', {
      [`deletedSongs/${id}`]: { deletedAt: new Date().toISOString() },
      [`songs/${id}`]: null,
    })

    const verification = await rtdbGet(`${DATABASE_PATH}/${id}`)
    if (verification) {
      const verificationError = new Error(`Firebase 節點 ${id} 在刪除後仍然存在`)
      verificationError.code = 'delete-verification-failed'
      throw verificationError
    }

    updateLocal((current) => current.filter((song) => song.id !== id))
  }

  return { songs, addSong, updateSong, deleteSong, remoteFirestore }
}
