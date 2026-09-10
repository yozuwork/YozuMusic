import { FiHeadphones, FiPlus, FiSearch } from 'react-icons/fi'
import CategoryTabs from './CategoryTabs.jsx'

export default function Header({ search, onSearchChange, onAdd, theme, onThemeChange, categories, activeCategory, songs, onCategoryChange }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="柚子音樂庫首頁">
        <span className="brand-mark"><FiHeadphones aria-hidden="true" /></span>
        <span>柚子音樂庫</span>
      </a>

      <CategoryTabs categories={categories} active={activeCategory} songs={songs} onChange={onCategoryChange} />

      <button className="header-add-button" type="button" onClick={onAdd}>
        <FiPlus aria-hidden="true" />
        貼上音樂
      </button>

      <div className="theme-switcher" aria-label="切換主色">
        <button className={theme === 'green' ? 'active' : ''} type="button" aria-label="使用綠色主色" aria-pressed={theme === 'green'} onClick={() => onThemeChange('green')}><i className="green" /></button>
        <button className={theme === 'pink' ? 'active' : ''} type="button" aria-label="使用粉紅色主色" aria-pressed={theme === 'pink'} onClick={() => onThemeChange('pink')}><i className="pink" /></button>
      </div>

      <label className="header-search">
        <FiSearch aria-hidden="true" />
        <input
          type="search"
          value={search}
          placeholder="找歌名、歌手、標籤…"
          aria-label="搜尋音樂收藏"
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && <button type="button" aria-label="清除搜尋" onClick={() => onSearchChange('')}>×</button>}
      </label>
    </header>
  )
}
