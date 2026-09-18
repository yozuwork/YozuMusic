import { get, ref } from 'firebase/database'
import { doc, writeBatch } from 'firebase/firestore'
import { database, db } from '../lib/firebase.js'
import { buildFilterKeys } from '../utils/songFilters.js'

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).map(([id, item]) => ({ ...item, id: item?.id || id })).filter((item) => item && item.id)
}

async function readRtdbNode(path) {
  const snapshot = await get(ref(database, path))
  return snapshot.exists() ? snapshot.val() : null
}

export async function migrateToFirestore() {
  const [songsRaw, worksRaw, tagsRaw] = await Promise.all([
    readRtdbNode('yozuMusic/songs'),
    readRtdbNode('yozuMusic/works'),
    readRtdbNode('yozuMusic/tags'),
  ])

  const rtdbSongs = toArray(songsRaw)
  const rtdbWorks = toArray(worksRaw)
  const tagSections = tagsRaw && typeof tagsRaw === 'object' ? tagsRaw : {}

  const workByTitle = new Map(rtdbWorks.map((work) => [work.title, work]))
  const songCountByWorkId = new Map()
  let backfilledCount = 0

  const songs = rtdbSongs.map((song) => {
    let workId = song.workId || ''
    if (!workId && song.workTitle && workByTitle.has(song.workTitle)) {
      workId = workByTitle.get(song.workTitle).id
      backfilledCount += 1
    }

    const categories = Array.isArray(song.categories) ? song.categories : []
    const tags = Array.isArray(song.tags) ? song.tags : []

    if (workId) songCountByWorkId.set(workId, (songCountByWorkId.get(workId) || 0) + 1)

    return {
      ...song,
      workId,
      categories,
      tags,
      titleLower: (song.title || '').trim().toLowerCase(),
      filterKeys: buildFilterKeys(categories, tags),
    }
  })

  const works = rtdbWorks.map((work) => ({
    ...work,
    songCount: songCountByWorkId.get(work.id) || 0,
  }))

  const batch = writeBatch(db)
  songs.forEach((song) => batch.set(doc(db, 'songs', song.id), song))
  works.forEach((work) => batch.set(doc(db, 'works', work.id), work))
  Object.entries(tagSections).forEach(([section, tags]) => {
    batch.set(doc(db, 'tags', section), { tags: Array.isArray(tags) ? tags : [] })
  })
  await batch.commit()

  const summary = {
    songsWritten: songs.length,
    worksWritten: works.length,
    tagSectionsWritten: Object.keys(tagSections).length,
    backfilledWorkIds: backfilledCount,
  }
  console.log('[YozuMusic][Migration] 搬遷完成', summary)
  return summary
}
