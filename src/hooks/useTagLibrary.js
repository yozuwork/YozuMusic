import { useEffect, useState } from 'react'
import { onValue, ref, set, update } from 'firebase/database'
import { buildTagUpdates } from '../utils/tagSync.js'
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

  useEffect(() => {
    if (!firebaseReady || !allowRemote) {
      return undefined
    }

    const tagsRef = ref(database, DATABASE_PATH)
    return onValue(tagsRef, (snapshot) => {
      if (!snapshot.exists()) {
        set(tagsRef, readTags()).catch((error) => console.error('無法初始化 Firebase 標籤資料：', error))
        return
      }

      const defaults = initialTags()
      const value = snapshot.val() || {}
      const nextTags = Object.fromEntries(SECTIONS.map((section) => [section, value[section] === false ? [] : value[section] || defaults[section]]))
      setTagsBySection(nextTags)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTags))
    }, (error) => {
      console.error('無法讀取 Firebase 標籤資料：', error)
    })
  }, [allowRemote])

  async function setSectionTags(section, tags, additions = []) {
    const updates = buildTagUpdates(tagsBySection, section, tags, additions)
    if (!firebaseReady || !allowRemote) {
      setTagsBySection((current) => {
        const next = { ...current, ...buildTagUpdates(current, section, tags, additions) }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
      return Object.keys(updates)
    }
    await update(ref(database, DATABASE_PATH), Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value.length ? value : false]),
    ))
    return Object.keys(updates)
  }

  return { tagsBySection, setSectionTags }
}
