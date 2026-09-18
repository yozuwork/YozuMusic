import { auth } from './firebase.js'

const DATABASE_URL = (import.meta.env.VITE_FIREBASE_DATABASE_URL || '').replace(/\/$/, '')

async function authedUrl(path) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('尚未登入，無法呼叫 Firebase REST API。')
  return `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(token)}`
}

async function request(path, options) {
  const response = await fetch(await authedUrl(path), options)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Firebase REST ${options.method || 'GET'} ${path} 失敗（${response.status}）${detail}`)
  }
  return response.status === 204 ? null : response.json()
}

export async function rtdbGet(path) {
  return request(path, { method: 'GET' })
}

export async function rtdbSet(path, value) {
  return request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
}

export async function rtdbUpdate(path, value) {
  return request(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
}

export async function rtdbDelete(path) {
  return request(path, { method: 'DELETE' })
}
