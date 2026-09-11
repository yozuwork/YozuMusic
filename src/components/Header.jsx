import { useEffect, useRef, useState } from 'react'
import { FiHeadphones, FiLogOut, FiPlus, FiSearch } from 'react-icons/fi'
import CategoryTabs from './CategoryTabs.jsx'

export default function Header({ user, onLogout, search, onSearchChange, onAdd, theme, onThemeChange, categories, activeCategory, songs, onCategoryChange }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  useEffect(() => {
    if (!accountOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const closeOnEscape = (event) => event.key === 'Escape' && setAccountOpen(false)
    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

  return (
    <header className="site-header">
      <div className="brand">
        <div className="account-menu" ref={accountRef}>
          <button className="brand-mark account-trigger" type="button" aria-label="開啟帳號選單" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}>
            <FiHeadphones className="profile-fallback" aria-hidden="true" />
          </button>
          {accountOpen && (
            <div className="account-dropdown">
              <div className="account-summary">
                <span className="account-avatar-small">
                  <FiHeadphones aria-hidden="true" />
                </span>
                <div>
                  <strong>{user?.displayName || '管理者'}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>
              <button type="button" onClick={() => { setAccountOpen(false); onLogout() }}><FiLogOut /> 登出</button>
            </div>
          )}
        </div>
        <a className="brand-name" href="#top" aria-label="柚子音樂庫首頁">柚子音樂庫</a>
      </div>

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
