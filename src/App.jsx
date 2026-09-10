import { useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiDisc, FiHeart, FiMusic, FiPlus, FiPlusCircle, FiSettings, FiX } from 'react-icons/fi'
import AuthGate from './components/AuthGate.jsx'
import Header from './components/Header.jsx'
import NowPlaying from './components/NowPlaying.jsx'
import SongCard from './components/SongCard.jsx'
import SongModal from './components/SongModal.jsx'
import TagEditor from './components/TagEditor.jsx'
import TagFilters from './components/TagFilters.jsx'
import { MAIN_CATEGORIES } from './data/initialSongs.js'
import useFirebaseAuth, { OWNER_UID } from './hooks/useFirebaseAuth.js'
import useSongLibrary from './hooks/useSongLibrary.js'
import useTagLibrary from './hooks/useTagLibrary.js'
import './App.css'

function App() {
  const { user, loading: authLoading, error: authError, login, logout } = useFirebaseAuth()
  const isOwner = user?.uid === OWNER_UID
  const { songs, addSong, updateSong, deleteSong } = useSongLibrary(isOwner)
  const { tagsBySection, setSectionTags } = useTagLibrary(isOwner)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTag, setActiveTag] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [cardSize, setCardSize] = useState('small')
  const [pageSize, setPageSize] = useState('12')
  const [currentPage, setCurrentPage] = useState(1)
  const [theme, setTheme] = useState(() => localStorage.getItem('yozu-music-theme') || 'green')
  const [mobileView, setMobileView] = useState('library')
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tagEditorOpen, setTagEditorOpen] = useState(false)
  const [editingSong, setEditingSong] = useState(null)
  const [nowPlaying, setNowPlaying] = useState(null)

  const visibleSongs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-Hant')
    const result = songs.filter((song) => {
      const inCategory = activeCategory === 'all' || song.categories.includes(activeCategory)
      const hasTag = !activeTag || song.tags.includes(activeTag)
      const searchable = [song.title, song.artist, song.note, ...song.categories, ...song.tags]
        .join(' ')
        .toLocaleLowerCase('zh-Hant')
      const inMobileView = mobileView !== 'favorites' || song.favorite
      return inCategory && hasTag && inMobileView && searchable.includes(query)
    })
    return [...result].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh-Hant')
      if (sort === 'favorite') return Number(b.favorite) - Number(a.favorite) || b.createdAt.localeCompare(a.createdAt)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [activeCategory, activeTag, mobileView, search, songs, sort])

  const pageCount = pageSize === 'flow' ? 1 : Math.max(1, Math.ceil(visibleSongs.length / Number(pageSize)))
  const displayedSongs = useMemo(() => {
    if (pageSize === 'flow') return visibleSongs
    const start = (currentPage - 1) * Number(pageSize)
    return visibleSongs.slice(start, start + Number(pageSize))
  }, [currentPage, pageSize, visibleSongs])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, activeTag, mobileView, search, sort, pageSize])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

  useEffect(() => {
    localStorage.setItem('yozu-music-theme', theme)
  }, [theme])

  function openAdd() {
    setEditingSong(null)
    setModalOpen(true)
  }

  function openEdit(song) {
    setEditingSong(song)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingSong(null)
  }

  function saveSong(song) {
    if (editingSong) updateSong(editingSong.id, song)
    else addSong(song)
    closeModal()
  }

  function removeSong(song) {
    if (!window.confirm(`確定要刪除「${song.title}」嗎？`)) return
    deleteSong(song.id)
    if (nowPlaying?.id === song.id) setNowPlaying(null)
  }

  function playSong(song) {
    setNowPlaying(song)
    window.open(song.url, '_blank', 'noopener,noreferrer')
  }

  const viewName = activeCategory === 'all' ? '全部收藏' : activeCategory
  const currentTags = tagsBySection[activeCategory]
  const tagLabels = Object.fromEntries(currentTags.map((tag) => [tag.id, tag.label]))

  if (!isOwner) {
    return (
      <div className={`app theme-${theme}`}>
        <AuthGate user={user} loading={authLoading} error={authError} ownerUid={OWNER_UID} onLogin={login} onLogout={logout} />
      </div>
    )
  }

  return (
    <div id="top" className={`app theme-${theme}${nowPlaying ? ' has-player' : ''}`}>
      <Header
        search={search}
        onSearchChange={setSearch}
        onAdd={openAdd}
        theme={theme}
        onThemeChange={setTheme}
        categories={MAIN_CATEGORIES}
        activeCategory={activeCategory}
        songs={songs}
        onCategoryChange={(category) => {
          setActiveCategory(category)
          setActiveTag('')
          setMobileView('library')
        }}
      />

      <main>
        <TagFilters
          tags={currentTags}
          activeTag={activeTag}
          onChange={setActiveTag}
          onEdit={() => setTagEditorOpen(true)}
          sort={sort}
          onSortChange={setSort}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          resultCount={visibleSongs.length}
        />

        <section className="library-section">
          {visibleSongs.length ? (
            <div className={`song-grid view-${cardSize}`}>
              {displayedSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  tagLabels={tagLabels}
                  onEdit={openEdit}
                  onDelete={removeSong}
                  onPlay={playSong}
                  onToggleFavorite={(target) => updateSong(target.id, { favorite: !target.favorite })}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FiMusic aria-hidden="true" />
              <h2>這裡還沒有聲音</h2>
              <p>換個分類或標籤找找，或收藏第一首歌。</p>
              <button type="button" onClick={openAdd}><FiPlus /> 貼上音樂連結</button>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="pagination" aria-label="歌曲分頁">
              <button type="button" aria-label="上一頁" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><FiChevronLeft /></button>
              <span>{currentPage} / {pageCount}</span>
              <button type="button" aria-label="下一頁" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}><FiChevronRight /></button>
            </nav>
          )}
        </section>
      </main>

      <footer className="site-footer"><FiDisc /> YOZU MUSIC LIBRARY <span>— 收好每一段想再聽見的聲音</span></footer>
      <button className="mobile-add" type="button" aria-label="新增音樂" onClick={openAdd}><FiPlus /></button>
      <SongModal open={modalOpen} song={editingSong} moodTags={currentTags} onClose={closeModal} onSave={saveSong} />
      <TagEditor
        open={tagEditorOpen}
        sectionName={viewName}
        tags={currentTags}
        onClose={() => setTagEditorOpen(false)}
        onSave={(tags) => {
          setSectionTags(activeCategory, tags)
          if (activeTag && !tags.some((tag) => tag.id === activeTag)) setActiveTag('')
          setTagEditorOpen(false)
        }}
      />
      <NowPlaying song={nowPlaying} onClose={() => setNowPlaying(null)} />

      {mobileSettingsOpen && (
        <aside className="mobile-settings-panel" aria-label="手機版設定">
          <header><strong>設定</strong><button type="button" aria-label="關閉設定" onClick={() => setMobileSettingsOpen(false)}><FiX /></button></header>
          <div>
            <span>主色</span>
            <button className={theme === 'green' ? 'selected' : ''} type="button" onClick={() => setTheme('green')}><i className="green" /> 綠色</button>
            <button className={theme === 'pink' ? 'selected' : ''} type="button" onClick={() => setTheme('pink')}><i className="pink" /> 莓果粉</button>
          </div>
          <button className="mobile-edit-tags" type="button" onClick={() => { setMobileSettingsOpen(false); setTagEditorOpen(true) }}>編輯目前分區標籤</button>
          <button className="mobile-signout" type="button" onClick={logout}>登出</button>
        </aside>
      )}

      <nav className="mobile-bottom-nav" aria-label="手機版主要功能">
        <button className={mobileView === 'library' ? 'active' : ''} type="button" onClick={() => { setMobileView('library'); setMobileSettingsOpen(false) }}><FiMusic /><span>音樂庫</span></button>
        <button className={mobileView === 'favorites' ? 'active' : ''} type="button" onClick={() => { setMobileView('favorites'); setMobileSettingsOpen(false) }}><FiHeart /><span>我的最愛</span></button>
        <button type="button" onClick={openAdd}><FiPlusCircle /><span>貼上音樂</span></button>
        <button className={mobileSettingsOpen ? 'active' : ''} type="button" onClick={() => setMobileSettingsOpen((open) => !open)}><FiSettings /><span>設定</span></button>
      </nav>
    </div>
  )
}

export default App
