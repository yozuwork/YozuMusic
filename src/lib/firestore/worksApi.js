import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const WORKS_COLLECTION = 'works'

export function subscribeWorks(onChange, onError) {
  return onSnapshot(collection(db, WORKS_COLLECTION), (snapshot) => {
    onChange(snapshot.docs.map((item) => item.data()))
  }, onError)
}

export async function addWork(work) {
  const id = work.id || crypto.randomUUID()
  const nextWork = {
    ...work,
    id,
    createdAt: work.createdAt || new Date().toISOString(),
    songCount: work.songCount ?? 0,
  }
  await setDoc(doc(db, WORKS_COLLECTION, id), nextWork)
  return nextWork
}

export async function updateWork(id, changes) {
  await updateDoc(doc(db, WORKS_COLLECTION, id), changes)
}
