import { FiHeadphones, FiPlus, FiSearch } from 'react-icons/fi'

export default function Header({ search, onSearchChange, onAdd }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="柚子音樂庫首頁">
        <span className="brand-mark"><FiHeadphones aria-hidden="true" /></span>
        <span>柚子音樂庫</span>
        <small>YOZU MUSIC</small>
      </a>

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

      <button className="add-song-button" type="button" onClick={onAdd}>
        <FiPlus aria-hidden="true" />
        <span>貼上音樂</span>
      </button>
    </header>
  )
}
