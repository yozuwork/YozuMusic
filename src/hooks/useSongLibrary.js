import { useEffect, useState } from 'react'
import { onValue, ref, remove, set, update } from 'firebase/database'
import { INITIAL_SONGS } from '../data/initialSongs.js'
import { database, firebaseReady } from '../lib/firebase.js'

const STORAGE_KEY = 'yozu-music-library-v1'
const DATABASE_PATH = 'yozuMusic/songs'

function readSongs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : INITIAL_SONGS
  } catch {
    return INITIAL_SONGS
  }
}

export default function useSongLibrary(allowRemote = false) {
  const [songs, setSongs] = useState(readSongs)
  const [remoteEnabled, setRemoteEnabled] = useState(false)

  useEffect(() => {
    if (!firebaseReady || !allowRemote) {
      setRemoteEnabled(false)
      return undefined
    }

    setRemoteEnabled(true)
    const songsRef = ref(database, DATABASE_PATH)
    return onValue(songsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSongs([])
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        return
      }

      const value = snapshot.val()
      const nextSongs = Object.values(value || {})
      setSongs(nextSongs)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSongs))
    }, (error) => {
      console.error('無法讀取 Firebase 歌曲資料，已切換成本機儲存：', error)
      setRemoteEnabled(false)
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
    if (!remoteEnabled) {
      updateLocal((current) => [nextSong, ...current])
      return nextSong
    }
    await set(ref(database, `${DATABASE_PATH}/${nextSong.id}`), nextSong)
    return nextSong
  }

  async function updateSong(id, changes) {
    if (!remoteEnabled) {
      updateLocal((current) => current.map((song) => (song.id === id ? { ...song, ...changes } : song)))
      return
    }
    await update(ref(database, `${DATABASE_PATH}/${id}`), changes)
  }

  async function deleteSong(id) {
    if (!remoteEnabled) {
      updateLocal((current) => current.filter((song) => song.id !== id))
      return
    }
    await remove(ref(database, `${DATABASE_PATH}/${id}`))
  }

  return { songs, addSong, updateSong, deleteSong }
}
