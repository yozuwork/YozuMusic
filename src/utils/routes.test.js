import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryPaths, categoryUrl, readRoute } from './routes.js'

test('category URLs round trip under local and GitHub Pages bases', () => {
  for (const base of ['/', '/YozuMusic/']) {
    for (const category of Object.keys(categoryPaths)) {
      assert.equal(readRoute(categoryUrl(category, base), base).category, category)
    }
  }
})

test('work links preserve IDs and accept trailing slashes', () => {
  assert.deepEqual(readRoute('/YozuMusic/works/view/work%20one/', '/YozuMusic/'), { category: '作品', workId: 'work one' })
})

test('invalid routes and malformed IDs do not open unrelated content', () => {
  for (const path of ['missing', 'bgm/view/123', 'works/view', 'works/view/%E0%A4', 'works/view/123/extra']) {
    assert.equal(readRoute(`/YozuMusic/${path}`, '/YozuMusic/').notFound, true)
  }
})
