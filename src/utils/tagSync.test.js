import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTagUpdates } from './tagSync.js'

const original = { id: 'original', label: 'Original' }
const added = { id: 'new', label: 'New' }

test('local edits leave other sections untouched', () => {
  assert.deepEqual(buildTagUpdates({ all: [original], BGM: [original] }, 'all', []), { all: [] })
})

test('sync appends only to selected sections and preserves existing tags', () => {
  const current = { all: [], BGM: [original], MUSIC: [], 作品: [] }
  const updates = buildTagUpdates(current, 'all', [added], [{ tag: added, sections: ['BGM', '作品'] }])
  assert.deepEqual(updates, { all: [added], BGM: [original, added], 作品: [added] })
  assert.deepEqual(current.BGM, [original])
  assert.equal(updates.MUSIC, undefined)
})

test('same-name tags keep their existing IDs and song associations', () => {
  const duplicate = { id: 'already-linked', label: ' NEW ' }
  assert.deepEqual(buildTagUpdates({ all: [], BGM: [duplicate] }, 'all', [added], [
    { tag: added, sections: ['BGM'] },
  ]), { all: [added] })
})

test('multiple additions accumulate and ignore unknown or source targets', () => {
  const second = { id: 'second', label: 'Second' }
  assert.deepEqual(buildTagUpdates({ all: [], BGM: [] }, 'all', [added, second], [
    { tag: added, sections: ['all', 'BGM', 'missing'] },
    { tag: second, sections: ['BGM'] },
  ]), { all: [added, second], BGM: [added, second] })
})
