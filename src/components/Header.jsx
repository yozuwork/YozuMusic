import { useEffect, useRef, useState } from 'react'
import { FiHeadphones, FiLogOut, FiPlus, FiSearch } from 'react-icons/fi'
import CategoryTabs from './CategoryTabs.jsx'
import { categoryUrl } from '../utils/routes.js'

const MIGRATION_ENABLED = import.meta.env.VITE_ENABLE_MIGRATION === 'true'

export default function Header({ user, onLogout, search, onSearchChange, onAdd, addLabel = '貼上音樂', theme, onThemeChange, categories, activeCategory, songs, workCount, onCategoryChange }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState('idle')
  const accountRef = useRef(null)

  async function runMigration() {
    if (!window.confirm('確定要把目前的 Realtime Database 資料搬到 Firestore 嗎？（不會刪除原本的資料，可重複執行）')) return
    setMigrationStatus('running')
    try {
      const { migrateToFirestore } = await import('../migration/migrateToFirestore.js')
      const summary = await migrateToFirestore()
      window.alert(`搬遷完成：歌曲 ${summary.songsWritten} 首、作品 ${summary.worksWritten} 部、標籤分類 ${summary.tagSectionsWritten} 組（補上 workId：${summary.backfilledWorkIds} 首）。`)
      setMigrationStatus('done')
    } catch (error) {
      console.error('[YozuMusic][Migration] 搬遷失敗', error)
      window.alert('搬遷失敗，請查看主控台錯誤訊息。')
      setMigrationStatus('error')
    }
  }

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
              {MIGRATION_ENABLED && (
                <button type="button" onClick={runMigration} disabled={migrationStatus === 'running'}>
                  {migrationStatus === 'running' ? '搬遷中…' : '搬遷到 Firestore'}
                </button>
              )}
              <button type="button" onClick={() => { setAccountOpen(false); onLogout() }}><FiLogOut /> 登出</button>
            </div>
          )}
        </div>
        <a className="brand-name" href={categoryUrl('all')} onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onCategoryChange('all')
        }} aria-label="柚子音樂庫首頁">柚子音樂庫</a>
      </div>

      <CategoryTabs categories={categories} active={activeCategory} songs={songs} workCount={workCount} onChange={onCategoryChange} />

      <button className="header-add-button" type="button" onClick={onAdd}>
        <FiPlus aria-hidden="true" />
        {addLabel}
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
