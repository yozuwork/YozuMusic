import { useEffect, useState } from 'react'
import { INITIAL_SONGS } from '../data/initialSongs.js'

const STORAGE_KEY = 'yozu-music-library-v1'

function readSongs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : INITIAL_SONGS
  } catch {
    return INITIAL_SONGS
  }
}

export default function useSongLibrary() {
  const [songs, setSongs] = useState(readSongs)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
  }, [songs])

  function addSong(song) {
    setSongs((current) => [{ ...song, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current])
  }

  function updateSong(id, changes) {
    setSongs((current) => current.map((song) => (song.id === id ? { ...song, ...changes } : song)))
  }

  function deleteSong(id) {
    setSongs((current) => current.filter((song) => song.id !== id))
  }

  return { songs, addSong, updateSong, deleteSong }
}
