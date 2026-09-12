import { FiBookOpen, FiGrid, FiHeadphones, FiMusic, FiPenTool } from 'react-icons/fi'
import { categoryUrl } from '../utils/routes.js'

const icons = {
  all: FiGrid,
  BGM: FiHeadphones,
  MUSIC: FiMusic,
  作業用: FiPenTool,
  作品: FiBookOpen,
}

export default function CategoryTabs({ categories, active, songs, workCount = 0, onChange }) {
  const items = ['all', ...categories]

  return (
    <nav className="category-tabs" aria-label="音樂主分類">
      {items.map((category) => {
        const Icon = icons[category]
        const count = category === 'all'
          ? songs.length
          : category === '作品'
            ? workCount
            : songs.filter((song) => (song.categories || []).includes(category)).length
        return (
          <a
            href={categoryUrl(category)}
            key={category}
            className={active === category ? 'category-tab active' : 'category-tab'}
            aria-current={active === category ? 'page' : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onChange(category)
            }}
          >
            <Icon aria-hidden="true" />
            <span>{category === 'all' ? '全部收藏' : category}</span>
            <small>{String(count).padStart(2, '0')}</small>
          </a>
        )
      })}
    </nav>
  )
}
