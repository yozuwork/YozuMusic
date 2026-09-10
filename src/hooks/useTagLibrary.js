import { useEffect, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import { MAIN_CATEGORIES, MOOD_TAGS } from '../data/initialSongs.js'
import { database, firebaseReady } from '../lib/firebase.js'

const STORAGE_KEY = 'yozu-music-tags-v1'
const DATABASE_PATH = 'yozuMusic/tags'
const SECTIONS = ['all', ...MAIN_CATEGORIES]

function initialTags() {
  return Object.fromEntries(
    SECTIONS.map((section) => [section, MOOD_TAGS.map((tag) => ({ id: tag, label: tag }))]),
  )
}

function readTags() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved) return initialTags()
    const defaults = initialTags()
    return Object.fromEntries(SECTIONS.map((section) => [section, saved[section] || defaults[section]]))
  } catch {
    return initialTags()
  }
}

export default function useTagLibrary(allowRemote = false) {
  const [tagsBySection, setTagsBySection] = useState(readTags)
  const [remoteEnabled, setRemoteEnabled] = useState(false)

  useEffect(() => {
    if (!firebaseReady || !allowRemote) {
      setRemoteEnabled(false)
      return undefined
    }

    setRemoteEnabled(true)
    const tagsRef = ref(database, DATABASE_PATH)
    return onValue(tagsRef, (snapshot) => {
      if (!snapshot.exists()) {
        set(tagsRef, readTags()).catch((error) => console.error('無法初始化 Firebase 標籤資料：', error))
        return
      }

      const defaults = initialTags()
      const value = snapshot.val() || {}
      const nextTags = Object.fromEntries(SECTIONS.map((section) => [section, value[section] || defaults[section]]))
      setTagsBySection(nextTags)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTags))
    }, (error) => {
      console.error('無法讀取 Firebase 標籤資料，已切換成本機儲存：', error)
      setRemoteEnabled(false)
    })
  }, [allowRemote])

  function setSectionTags(section, tags) {
    if (!remoteEnabled) {
      setTagsBySection((current) => {
        const next = { ...current, [section]: tags }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
      return
    }
    set(ref(database, `${DATABASE_PATH}/${section}`), tags)
      .catch((error) => {
        console.error('無法儲存 Firebase 標籤，已儲存在本機：', error)
        setRemoteEnabled(false)
        setTagsBySection((current) => {
          const next = { ...current, [section]: tags }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          return next
        })
      })
  }

  return { tagsBySection, setSectionTags }
}
