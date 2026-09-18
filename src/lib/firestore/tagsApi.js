import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const TAGS_COLLECTION = 'tags'

export function subscribeTags(onChange, onError) {
  return onSnapshot(collection(db, TAGS_COLLECTION), (snapshot) => {
    const sections = {}
    snapshot.forEach((section) => { sections[section.id] = section.data().tags || [] })
    onChange(sections)
  }, onError)
}

export async function writeTagSections(updates) {
  await Promise.all(
    Object.entries(updates).map(([section, tags]) => setDoc(doc(db, TAGS_COLLECTION, section), { tags })),
  )
}
