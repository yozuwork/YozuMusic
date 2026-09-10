import { FiGrid, FiHeadphones, FiMusic, FiPenTool, FiPlayCircle, FiZap } from 'react-icons/fi'

const icons = {
  all: FiGrid,
  BGM: FiHeadphones,
  MUSIC: FiMusic,
  動漫: FiPlayCircle,
  遊戲: FiZap,
  作業用: FiPenTool,
}

export default function CategoryTabs({ categories, active, songs, onChange }) {
  const items = ['all', ...categories]

  return (
    <nav className="category-tabs" aria-label="音樂主分類">
      {items.map((category) => {
        const Icon = icons[category]
        const count = category === 'all'
          ? songs.length
          : songs.filter((song) => song.categories.includes(category)).length
        return (
          <button
            type="button"
            key={category}
            className={active === category ? 'category-tab active' : 'category-tab'}
            aria-current={active === category ? 'page' : undefined}
            onClick={() => onChange(category)}
          >
            <Icon aria-hidden="true" />
            <span>{category === 'all' ? '全部收藏' : category}</span>
            <small>{String(count).padStart(2, '0')}</small>
          </button>
        )
      })}
    </nav>
  )
}
