import {
  collection,
  deleteDoc,
  doc,
  endAt,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { activeFilterKey, buildFilterKeys } from '../../utils/songFilters.js'

const SONGS_COLLECTION = 'songs'
const WORKS_COLLECTION = 'works'
export const FLOW_CAP = 500

function songsRef() {
  return collection(db, SONGS_COLLECTION)
}

function sortClauses(sort) {
  if (sort === 'title') return [orderBy('title')]
  if (sort === 'favorite') return [orderBy('favorite', 'desc'), orderBy('createdAt', 'desc')]
  return [orderBy('createdAt', 'desc')]
}

function baseSongClauses({ category = 'all', tag = '', favoriteOnly = false }) {
  const clauses = []
  const key = activeFilterKey(category, tag)
  if (key) clauses.push(where('filterKeys', 'array-contains', key))
  if (favoriteOnly) clauses.push(where('favorite', '==', true))
  return clauses
}

function resolvePageSize(pageSize) {
  return pageSize === 'flow' ? FLOW_CAP : Number(pageSize)
}

export async function fetchSongsPage({ category = 'all', tag = '', favoriteOnly = false, searchPrefix = '', sort = 'newest', pageSize = 12, cursor = null }) {
  const cappedSize = resolvePageSize(pageSize)
  const clauses = [...baseSongClauses({ category, tag, favoriteOnly })]

  if (searchPrefix) {
    clauses.push(orderBy('titleLower'))
    clauses.push(cursor ? startAfter(cursor) : startAt(searchPrefix))
    clauses.push(endAt(searchPrefix + ''))
  } else {
    clauses.push(...sortClauses(sort))
    if (cursor) clauses.push(startAfter(cursor))
  }
  clauses.push(limit(cappedSize + 1))

  const snapshot = await getDocs(query(songsRef(), ...clauses))
  const docs = snapshot.docs
  const hasMore = docs.length > cappedSize
  const items = docs.slice(0, cappedSize).map((item) => item.data())
  const lastDoc = docs.length ? docs[Math.min(cappedSize, docs.length) - 1] : null
  return { items, lastDoc, hasMore }
}

export async function fetchSongsCount({ category = 'all', tag = '', favoriteOnly = false, searchPrefix = '' }) {
  const clauses = [...baseSongClauses({ category, tag, favoriteOnly })]
  if (searchPrefix) {
    clauses.push(orderBy('titleLower'), startAt(searchPrefix), endAt(searchPrefix + ''))
  }
  const snapshot = await getCountFromServer(query(songsRef(), ...clauses))
  return snapshot.data().count
}

export async function fetchWorkSongsPage({ workId, tag = '', sort = 'newest', pageSize = 12, cursor = null }) {
  const cappedSize = resolvePageSize(pageSize)
  const clauses = [where('workId', '==', workId)]
  if (tag) clauses.push(where('tags', 'array-contains', tag))
  clauses.push(...sortClauses(sort))
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(limit(cappedSize + 1))

  const snapshot = await getDocs(query(songsRef(), ...clauses))
  const docs = snapshot.docs
  const hasMore = docs.length > cappedSize
  const items = docs.slice(0, cappedSize).map((item) => item.data())
  const lastDoc = docs.length ? docs[Math.min(cappedSize, docs.length) - 1] : null
  return { items, lastDoc, hasMore }
}

export async function fetchWorkSongsCount({ workId, tag = '' }) {
  const clauses = [where('workId', '==', workId)]
  if (tag) clauses.push(where('tags', 'array-contains', tag))
  const snapshot = await getCountFromServer(query(songsRef(), ...clauses))
  return snapshot.data().count
}

export async function fetchSongsByWorkId(workId) {
  const snapshot = await getDocs(query(songsRef(), where('workId', '==', workId)))
  return snapshot.docs.map((item) => item.data())
}

function workRef(workId) {
  return doc(db, WORKS_COLLECTION, workId)
}

export async function addSong(song) {
  const id = song.id || crypto.randomUUID()
  const categories = Array.isArray(song.categories) ? song.categories : []
  const tags = Array.isArray(song.tags) ? song.tags : []
  const nextSong = {
    ...song,
    id,
    createdAt: song.createdAt || new Date().toISOString(),
    categories,
    tags,
    titleLower: (song.title || '').trim().toLowerCase(),
    filterKeys: buildFilterKeys(categories, tags),
  }

  const batch = writeBatch(db)
  batch.set(doc(db, SONGS_COLLECTION, id), nextSong)
  if (nextSong.workId) batch.set(workRef(nextSong.workId), { songCount: increment(1) }, { merge: true })
  await batch.commit()
  return nextSong
}

export async function updateSong(id, changes) {
  const ref = doc(db, SONGS_COLLECTION, id)
  const patch = { ...changes }
  let previous = null

  if ('categories' in changes || 'tags' in changes) {
    const snapshot = await getDoc(ref)
    previous = snapshot.data() || {}
    const categories = changes.categories ?? previous.categories ?? []
    const tags = changes.tags ?? previous.tags ?? []
    patch.filterKeys = buildFilterKeys(categories, tags)
  }
  if ('title' in changes) {
    patch.titleLower = (changes.title || '').trim().toLowerCase()
  }

  if ('workId' in changes) {
    if (!previous) {
      const snapshot = await getDoc(ref)
      previous = snapshot.data() || {}
    }
    const prevWorkId = previous.workId || ''
    const nextWorkId = changes.workId || ''
    if (prevWorkId !== nextWorkId) {
      const batch = writeBatch(db)
      batch.update(ref, patch)
      if (prevWorkId) batch.set(workRef(prevWorkId), { songCount: increment(-1) }, { merge: true })
      if (nextWorkId) batch.set(workRef(nextWorkId), { songCount: increment(1) }, { merge: true })
      await batch.commit()
      return
    }
  }

  await updateDoc(ref, patch)
}

export async function deleteSong(id) {
  const ref = doc(db, SONGS_COLLECTION, id)
  const snapshot = await getDoc(ref)
  const data = snapshot.data()

  const batch = writeBatch(db)
  batch.delete(ref)
  if (data?.workId) batch.set(workRef(data.workId), { songCount: increment(-1) }, { merge: true })
  await batch.commit()
}
