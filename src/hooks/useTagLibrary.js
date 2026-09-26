import { useEffect, useState } from 'react'
import { buildTagUpdates } from '../utils/tagSync.js'
import { DEFAULT_SECTION_TAGS, MAIN_CATEGORIES, MOOD_TAGS } from '../data/initialSongs.js'
import { USE_FIRESTORE, firebaseReady } from '../lib/firebase.js'
import { subscribeTags, writeTagSections } from '../lib/firestore/tagsApi.js'
import { rtdbGet, rtdbSet, rtdbUpdate } from '../lib/realtimeDbRest.js'

const STORAGE_KEY = 'yozu-music-tags-v1'
const DATABASE_PATH = 'yozuMusic/tags'
const SECTIONS = ['all', ...MAIN_CATEGORIES]

function initialTags() {
  return Object.fromEntries(
    SECTIONS.map((section) => [section, (DEFAULT_SECTION_TAGS[section] || MOOD_TAGS).map((tag) => ({ id: tag, label: tag }))]),
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
  const remoteFirestore = allowRemote && USE_FIRESTORE

  useEffect(() => {
    if (!firebaseReady || !allowRemote) {
      return undefined
    }

    if (remoteFirestore) {
      return subscribeTags((sections) => {
        const defaults = initialTags()
        const nextTags = Object.fromEntries(SECTIONS.map((section) => [section, sections[section] || defaults[section]]))
        setTagsBySection(nextTags)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTags))
      }, (error) => {
        console.error('無法讀取 Firestore 標籤資料：', error)
      })
    }

    let cancelled = false
    rtdbGet(DATABASE_PATH).then((value) => {
      if (cancelled) return
      if (!value) {
        rtdbSet(DATABASE_PATH, readTags()).catch((error) => console.error('無法初始化 Firebase 標籤資料：', error))
        return
      }

      const defaults = initialTags()
      const nextTags = Object.fromEntries(SECTIONS.map((section) => [section, value[section] === false ? [] : value[section] || defaults[section]]))
      setTagsBySection(nextTags)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTags))
    }).catch((error) => {
      console.error('無法讀取 Firebase 標籤資料：', error)
    })
    return () => { cancelled = true }
  }, [allowRemote, remoteFirestore])

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
    if (remoteFirestore) {
      await writeTagSections(updates)
      return Object.keys(updates)
    }
    await rtdbUpdate(DATABASE_PATH, Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value.length ? value : false]),
    ))
    setTagsBySection((current) => {
      const next = { ...current, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return Object.keys(updates)
  }

  return { tagsBySection, setSectionTags }
}
