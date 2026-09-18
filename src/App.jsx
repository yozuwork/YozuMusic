import { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiDisc, FiHeart, FiMusic, FiPlus, FiPlusCircle, FiSettings, FiSliders, FiTag, FiX } from 'react-icons/fi'
import ActionModal from './components/ActionModal.jsx'
import AuthGate from './components/AuthGate.jsx'
import Header from './components/Header.jsx'
import NowPlaying from './components/NowPlaying.jsx'
import SongCard from './components/SongCard.jsx'
import SongModal from './components/SongModal.jsx'
import TagEditor from './components/TagEditor.jsx'
import TagFilters from './components/TagFilters.jsx'
import WorkCard from './components/WorkCard.jsx'
import WorkModal from './components/WorkModal.jsx'
import { MAIN_CATEGORIES } from './data/initialSongs.js'
import useFirebaseAuth, { OWNER_UID } from './hooks/useFirebaseAuth.js'
import useSongLibrary from './hooks/useSongLibrary.js'
import useTagLibrary from './hooks/useTagLibrary.js'
import useWorkLibrary from './hooks/useWorkLibrary.js'
import { fetchSongsByWorkId, fetchSongsCount, fetchSongsPage } from './lib/firestore/songsApi.js'
import './App.css'
import { categoryUrl, readRoute } from './utils/routes.js'

const SEARCH_DEBOUNCE_MS = 350

function App() {
  const { user, loading: authLoading, error: authError, login, logout } = useFirebaseAuth()
  const isOwner = user?.uid === OWNER_UID
  const { songs, addSong, updateSong, deleteSong, remoteFirestore } = useSongLibrary(isOwner)
  const { tagsBySection, setSectionTags } = useTagLibrary(isOwner)
  const { works, addWork, updateWork } = useWorkLibrary(isOwner)
  const [route, setRoute] = useState(() => readRoute(window.location.pathname))
  const activeCategory = route.category
  const routeWork = works.find((work) => work.id === route.workId)

  function navigate(path) {
    window.history.pushState({}, '', path)
    setRoute(readRoute(window.location.pathname))
    window.scrollTo(0, 0)
  }

  function setActiveCategory(category) {
    navigate(categoryUrl(category))
  }

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
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
  const [workModalOpen, setWorkModalOpen] = useState(false)
  const [editingWork, setEditingWork] = useState(null)
  const [tagEditorOpen, setTagEditorOpen] = useState(false)
  const [editingSong, setEditingSong] = useState(null)
  const [nowPlaying, setNowPlaying] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedSongIds, setSelectedSongIds] = useState([])
  const [highlightedWorkId, setHighlightedWorkId] = useState('')
  const [activeWorkType, setActiveWorkType] = useState('all')

  // Firestore 模式下的歌曲分頁（真正呼叫 API 取當頁資料，取代下面 visibleSongs/displayedSongs 的整包前端切片）
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [songPageIndex, setSongPageIndex] = useState(0)
  const [songPageItems, setSongPageItems] = useState([])
  const [songHasNextPage, setSongHasNextPage] = useState(false)
  const [songTotalCount, setSongTotalCount] = useState(0)
  const [songPageLoading, setSongPageLoading] = useState(false)
  const songCursorsRef = useRef([null])
  const songFilterKeyRef = useRef('')
  const favoriteOnly = mobileView === 'favorites'

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!remoteFirestore || activeCategory === '作品') return undefined

    const filterKey = JSON.stringify({ activeCategory, activeTag, favoriteOnly, debouncedSearch, sort, pageSize })
    let pageIndexToUse = songPageIndex
    if (songFilterKeyRef.current !== filterKey) {
      songFilterKeyRef.current = filterKey
      songCursorsRef.current = [null]
      pageIndexToUse = 0
      if (songPageIndex !== 0) {
        setSongPageIndex(0)
        return undefined
      }
    }

    let cancelled = false
    setSongPageLoading(true)
    fetchSongsPage({
      category: activeCategory,
      tag: activeTag,
      favoriteOnly,
      searchPrefix: debouncedSearch,
      sort,
      pageSize,
      cursor: songCursorsRef.current[pageIndexToUse] ?? null,
    }).then(({ items, lastDoc, hasMore }) => {
      if (cancelled) return
      setSongPageItems(items)
      setSongHasNextPage(hasMore)
      if (!songCursorsRef.current[pageIndexToUse + 1]) {
        songCursorsRef.current = [...songCursorsRef.current.slice(0, pageIndexToUse + 1), lastDoc]
      }
    }).catch((error) => {
      console.error('無法讀取歌曲分頁：', error)
    }).finally(() => {
      if (!cancelled) setSongPageLoading(false)
    })
    return () => { cancelled = true }
  }, [remoteFirestore, activeCategory, activeTag, favoriteOnly, debouncedSearch, sort, pageSize, songPageIndex])

  useEffect(() => {
    if (!remoteFirestore || activeCategory === '作品') return undefined
    let cancelled = false
    fetchSongsCount({ category: activeCategory, tag: activeTag, favoriteOnly, searchPrefix: debouncedSearch })
      .then((count) => { if (!cancelled) setSongTotalCount(count) })
      .catch((error) => console.error('無法讀取歌曲總數：', error))
    return () => { cancelled = true }
  }, [remoteFirestore, activeCategory, activeTag, favoriteOnly, debouncedSearch])

  const songTotalPages = pageSize === 'flow' ? 1 : Math.max(1, Math.ceil(songTotalCount / Number(pageSize)))

  const visibleSongs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-Hant')
    const result = songs.filter((song) => {
      const categories = Array.isArray(song.categories) ? song.categories : []
      const tags = Array.isArray(song.tags) ? song.tags : []
      const inCategory = activeCategory === 'all' || categories.includes(activeCategory)
      const hasTag = !activeTag || tags.includes(activeTag)
      const searchable = [song.title, song.artist, song.note, song.workTitle, ...categories, ...tags]
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

  const visibleWorks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return works
      .filter((work) => {
        if (activeWorkType !== 'all' && work.type !== activeWorkType) return false
        return !query || work.title.toLowerCase().startsWith(query)
      })
      .sort((a, b) => sort === 'title'
        ? a.title.localeCompare(b.title, 'zh-Hant')
        : (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [activeWorkType, search, sort, works])

  const pageCount = pageSize === 'flow' ? 1 : Math.max(1, Math.ceil(visibleSongs.length / Number(pageSize)))
  const displayedSongs = useMemo(() => {
    if (pageSize === 'flow') return visibleSongs
    const start = (currentPage - 1) * Number(pageSize)
    return visibleSongs.slice(start, start + Number(pageSize))
  }, [currentPage, pageSize, visibleSongs])

  // remoteFirestore 時，歌曲網格改用上面 Firestore 分頁抓回來的 songPageItems，不再用本地整包切片
  const songsForGrid = remoteFirestore ? songPageItems : displayedSongs
  const songResultCount = remoteFirestore ? songTotalCount : visibleSongs.length
  const songNavPageCount = remoteFirestore ? songTotalPages : pageCount
  const songNavCurrentPage = remoteFirestore ? songPageIndex + 1 : currentPage
  const songNavHasPrev = remoteFirestore ? songPageIndex > 0 : currentPage > 1
  const songNavHasNext = remoteFirestore ? songHasNextPage : currentPage < pageCount
  function goSongPrevPage() {
    if (remoteFirestore) setSongPageIndex((index) => index - 1)
    else setCurrentPage((page) => page - 1)
  }
  function goSongNextPage() {
    if (remoteFirestore) setSongPageIndex((index) => index + 1)
    else setCurrentPage((page) => page + 1)
  }

  const allDisplayedSelected = songsForGrid.length > 0 && songsForGrid.every((song) => selectedSongIds.includes(song.id))
  const workPageCount = pageSize === 'flow' ? 1 : Math.max(1, Math.ceil(visibleWorks.length / Number(pageSize)))
  const displayedWorks = pageSize === 'flow'
    ? visibleWorks
    : visibleWorks.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, activeTag, activeWorkType, mobileView, search, sort, pageSize])

  useEffect(() => {
    const currentPageCount = activeCategory === '作品' ? workPageCount : pageCount
    if (currentPage > currentPageCount) setCurrentPage(currentPageCount)
  }, [activeCategory, currentPage, pageCount, workPageCount])

  useEffect(() => {
    localStorage.setItem('yozu-music-theme', theme)
  }, [theme])

  useEffect(() => {
    setSelectedSongIds([])
  }, [activeCategory, activeTag, currentPage, songPageIndex, mobileView, pageSize, search, sort])

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

  async function saveSong(song) {
    const wasEditing = Boolean(editingSong)
    try {
      let linkedWork = works.find((work) => work.id === song.workId)
        || works.find((work) => work.title.localeCompare(song.workTitle, 'zh-Hant', { sensitivity: 'accent' }) === 0)
      if (song.workTitle && !linkedWork) {
        linkedWork = await addWork({ title: song.workTitle, coverUrl: song.coverUrl || '' })
      }
      const nextSong = {
        ...song,
        workId: linkedWork?.id || '',
        workTitle: linkedWork?.title || '',
      }
      if (editingSong) await updateSong(editingSong.id, nextSong)
      else await addSong(nextSong)
      closeModal()
      setActionModal({
        mode: 'success',
        title: wasEditing ? '歌曲已更新' : '歌曲已收藏',
        message: `「${song.title}」已儲存到音樂庫。`,
      })
    } catch {
      setActionModal({ mode: 'error', title: '歌曲儲存失敗', message: '目前無法儲存這首歌，請稍後再試。' })
    }
  }

  function openWorkAdd() {
    setEditingWork(null)
    setWorkModalOpen(true)
  }

  function openWorkEdit(work) {
    navigate(`${categoryUrl('作品')}/view/${encodeURIComponent(work.id)}`)
  }

  function closeWorkModal() {
    setWorkModalOpen(false)
    setEditingWork(null)
  }

  async function saveWork(work) {
    try {
      let savedWork
      const currentWork = workModalOpen ? editingWork : routeWork
      if (currentWork) {
        await updateWork(currentWork.id, work)
        const linkedSongs = remoteFirestore
          ? await fetchSongsByWorkId(currentWork.id)
          : songs.filter((song) => song.workId === currentWork.id)
        await Promise.all(linkedSongs.filter((song) => song.workTitle !== work.title).map((song) => updateSong(song.id, { workTitle: work.title })))
        savedWork = { ...currentWork, ...work }
      } else {
        savedWork = await addWork(work)
      }
      closeWorkModal()
      setHighlightedWorkId(savedWork.id)
      setActiveWorkType('all')
      setActionModal({ mode: 'success', title: currentWork ? '作品已更新' : '作品已建立', message: `「${savedWork.title}」已儲存。` })
    } catch {
      setActionModal({ mode: 'error', title: '作品儲存失敗', message: '目前無法儲存這個作品，請稍後再試。' })
    }
  }

  function removeWorkSongs(songIds, onComplete) {
    if (!songIds.length) return
    setActionModal({
      mode: 'confirm',
      title: `刪除 ${songIds.length} 首關聯音樂？`,
      message: '這會從音樂庫刪除選取的卡片，刪除後無法復原。',
      confirmText: `刪除 ${songIds.length} 首`,
      onConfirm: async () => {
        try {
          await Promise.all(songIds.map((id) => deleteSong(id)))
          onComplete?.()
          setActionModal({ mode: 'success', title: '刪除完成', message: `已移除 ${songIds.length} 首音樂。` })
        } catch {
          setActionModal({ mode: 'error', title: '刪除失敗', message: '目前無法刪除選取的音樂。' })
        }
      },
    })
  }

  function removeSong(song) {
    console.log('[YozuMusic][Delete] 已點擊刪除', { id: song.id, title: song.title })
    setActionModal({
      mode: 'confirm',
      title: '刪除這首歌？',
      message: `確定要刪除「${song.title}」嗎？刪除後無法復原。`,
      confirmText: '刪除',
      onConfirm: async () => {
        console.log('[YozuMusic][Delete] 已確認刪除', { id: song.id, title: song.title })
        try {
          await deleteSong(song.id)
          console.log('[YozuMusic][Delete] 刪除流程成功', { id: song.id, title: song.title })
          if (nowPlaying?.id === song.id) setNowPlaying(null)
          setActionModal({ mode: 'success', title: '歌曲已刪除', message: `「${song.title}」已從音樂庫移除。` })
        } catch (error) {
          console.error('[YozuMusic][Delete] 刪除流程失敗', error)
          const permissionDenied = String(error?.code || '').toLowerCase().includes('permission')
          setActionModal({
            mode: 'error',
            title: '刪除失敗',
            message: permissionDenied ? 'Firebase 拒絕刪除，請先發布最新的 Database Rules。' : '目前無法刪除這首歌，請稍後再試。',
          })
        }
      },
    })
  }

  function toggleEditMode() {
    if (editMode) setSelectedSongIds([])
    setEditMode((current) => !current)
  }

  function toggleSongSelection(songId) {
    setSelectedSongIds((current) => current.includes(songId)
      ? current.filter((id) => id !== songId)
      : [...current, songId])
  }

  function toggleSelectAll() {
    const displayedIds = songsForGrid.map((song) => song.id)
    setSelectedSongIds((current) => allDisplayedSelected
      ? current.filter((id) => !displayedIds.includes(id))
      : [...new Set([...current, ...displayedIds])])
  }

  function removeSelectedSongs() {
    const selectedSongs = songs.filter((song) => selectedSongIds.includes(song.id))
    if (!selectedSongs.length) return
    setActionModal({
      mode: 'confirm',
      title: `刪除 ${selectedSongs.length} 首歌曲？`,
      message: '確定要刪除所有選取的卡片嗎？刪除後無法復原。',
      confirmText: `刪除 ${selectedSongs.length} 首`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedSongs.map((song) => deleteSong(song.id)))
          if (selectedSongIds.includes(nowPlaying?.id)) setNowPlaying(null)
          setSelectedSongIds([])
          setEditMode(false)
          setActionModal({ mode: 'success', title: '批次刪除完成', message: `已從音樂庫移除 ${selectedSongs.length} 首歌曲。` })
        } catch (error) {
          console.error('Firebase 批次刪除失敗：', error)
          const permissionDenied = String(error?.code || '').toLowerCase().includes('permission')
          setActionModal({
            mode: 'error',
            title: '批次刪除失敗',
            message: permissionDenied ? 'Firebase 拒絕刪除，請先發布最新的 Database Rules。' : '目前無法刪除選取的歌曲，請稍後再試。',
          })
        }
      },
    })
  }

  function playSong(song) {
    setNowPlaying(song)
    window.open(song.url, '_blank', 'noopener,noreferrer')
  }

  function openLinkedWork(workId, workTitle) {
    const work = works.find((item) => item.id === workId)
      || works.find((item) => item.title === workTitle)
    setHighlightedWorkId(work?.id || '')
    setActiveCategory('作品')
    setActiveTag('')
    setMobileView('library')
    if (work) openWorkEdit(work)
  }

  const viewName = activeCategory === 'all' ? '全部收藏' : activeCategory
  const currentTags = tagsBySection[activeCategory] || []
  const tagLabels = Object.fromEntries(currentTags.map((tag) => [tag.id, tag.label]))

  if (!isOwner) {
    return (
      <div className={`app theme-${theme}`}>
        <AuthGate user={user} loading={authLoading} error={authError} ownerUid={OWNER_UID} onLogin={login} onLogout={logout} />
      </div>
    )
  }

  async function toggleFavorite(song) {
    try {
      await updateSong(song.id, { favorite: !song.favorite })
    } catch {
      setActionModal({ mode: 'error', title: '更新最愛失敗', message: '目前無法更新這首歌，請稍後再試。' })
    }
  }

  return (
    <div id="top" className={`app theme-${theme}${nowPlaying ? ' has-player' : ''}`}>
      <Header
        user={user}
        onLogout={logout}
        search={search}
        onSearchChange={setSearch}
        onAdd={activeCategory === '作品' ? openWorkAdd : openAdd}
        addLabel={activeCategory === '作品' ? '新增作品' : '貼上音樂'}
        theme={theme}
        onThemeChange={setTheme}
        categories={MAIN_CATEGORIES}
        activeCategory={activeCategory}
        songs={songs}
        workCount={works.length}
        onCategoryChange={(category) => {
          setActiveCategory(category)
          setHighlightedWorkId('')
          setActiveWorkType('all')
          setActiveTag('')
          setMobileView('library')
        }}
      />

      <main>
        {route.notFound || (route.workId && !routeWork) ? (
          <div className="empty-state"><FiMusic /><h2>{route.notFound ? '找不到這個頁面' : '作品尚未載入或已不存在'}</h2><button type="button" onClick={() => setActiveCategory('作品')}>返回作品</button></div>
        ) : route.workId ? (
          <WorkModal
            key={route.workId}
            open
            page
            work={routeWork}
            songs={songs}
            remoteFirestore={remoteFirestore}
            tags={currentTags}
            onClose={() => setActiveCategory('作品')}
            onSave={saveWork}
            onEditSong={openEdit}
            onDeleteSong={removeSong}
            onPlaySong={playSong}
            onToggleFavorite={toggleFavorite}
            onEditTags={() => setTagEditorOpen(true)}
            onDeleteSelectedSongs={removeWorkSongs}
          />
        ) : <>
        {activeCategory === '作品' && (
          <div className="work-type-filter" aria-label="作品類型篩選">
            <div className="work-type-pills">
              {['all', '動漫', '遊戲'].map((type) => (
                <button className={activeWorkType === type ? 'active' : ''} type="button" key={type} onClick={() => setActiveWorkType(type)}>
                  {type === 'all' ? '全部' : type}
                </button>
              ))}
            </div>
            <div className="view-controls" aria-label="作品卡片顯示設定">
              <select value={cardSize} aria-label="作品卡片大小" onChange={(event) => setCardSize(event.target.value)}>
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
              <select value={pageSize} aria-label="作品每頁顯示數量" onChange={(event) => setPageSize(event.target.value)}>
                <option value="12">12 筆／頁</option>
                <option value="36">36 筆／頁</option>
                <option value="48">48 筆／頁</option>
                <option value="flow">瀑布流</option>
              </select>
            </div>
            <label className="sort-control">
              <FiSliders aria-hidden="true" />
              <select value={sort === 'title' ? 'title' : 'newest'} aria-label="作品排序方式" onChange={(event) => setSort(event.target.value)}>
                <option value="newest">最近新增</option>
                <option value="title">作品名稱</option>
              </select>
            </label>
            <button className="edit-tags-button work-edit-tags-button" type="button" onClick={() => setTagEditorOpen(true)}>
              <FiTag aria-hidden="true" /> 編輯標籤
            </button>
          </div>
        )}
        {activeCategory !== '作品' && <TagFilters
          tags={currentTags}
          activeTag={activeTag}
          onChange={setActiveTag}
          editMode={editMode}
          selectedCount={selectedSongIds.length}
          allSelected={allDisplayedSelected}
          onToggleEditMode={toggleEditMode}
          onEditTags={() => setTagEditorOpen(true)}
          onSelectAll={toggleSelectAll}
          onDeleteSelected={removeSelectedSongs}
          sort={sort}
          onSortChange={setSort}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          resultCount={songResultCount}
        />}

        <section className="library-section">
          {activeCategory === '作品' ? (
            visibleWorks.length ? (
              <div className={`work-grid view-${cardSize}`}>
                {displayedWorks.map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    highlighted={highlightedWorkId === work.id}
                    songCount={typeof work.songCount === 'number' ? work.songCount : songs.filter((song) => song.workId === work.id || (!song.workId && song.workTitle === work.title)).length}
                    onOpen={() => openWorkEdit(work)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FiMusic aria-hidden="true" />
                <h2>這裡還沒有作品</h2>
                <p>先建立作品卡片，之後就能將 BGM 或歌曲關聯到它。</p>
                <button type="button" onClick={openWorkAdd}><FiPlus /> 新增作品卡片</button>
              </div>
            )
          ) : (remoteFirestore ? songPageLoading || songsForGrid.length > 0 : visibleSongs.length > 0) ? (
            <div className={`song-grid view-${cardSize}${remoteFirestore && songPageLoading ? ' is-loading' : ''}`}>
              {songsForGrid.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  work={works.find((work) => work.id === song.workId) || works.find((work) => work.title === song.workTitle)}
                  tagLabels={tagLabels}
                  onEdit={openEdit}
                  onDelete={removeSong}
                  onPlay={playSong}
                  onToggleFavorite={toggleFavorite}
                  onOpenWork={(workId) => openLinkedWork(workId, song.workTitle)}
                  selectionMode={editMode}
                  selected={selectedSongIds.includes(song.id)}
                  onToggleSelect={toggleSongSelection}
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

          {activeCategory !== '作品' && songNavPageCount > 1 && (
            <nav className="pagination" aria-label="歌曲分頁">
              <button type="button" aria-label="上一頁" disabled={!songNavHasPrev} onClick={goSongPrevPage}><FiChevronLeft /></button>
              <span>{songNavCurrentPage} / {songNavPageCount}</span>
              <button type="button" aria-label="下一頁" disabled={!songNavHasNext} onClick={goSongNextPage}><FiChevronRight /></button>
            </nav>
          )}
          {activeCategory === '作品' && workPageCount > 1 && (
            <nav className="pagination" aria-label="作品分頁">
              <button type="button" aria-label="上一頁" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><FiChevronLeft /></button>
              <span>{currentPage} / {workPageCount}</span>
              <button type="button" aria-label="下一頁" disabled={currentPage === workPageCount} onClick={() => setCurrentPage((page) => page + 1)}><FiChevronRight /></button>
            </nav>
          )}
        </section>
        </>}
      </main>

      <footer className="site-footer"><FiDisc /> YOZU MUSIC LIBRARY <span>— 收好每一段想再聽見的聲音</span></footer>
      <button className="mobile-add" type="button" aria-label={activeCategory === '作品' ? '新增作品' : '新增音樂'} onClick={activeCategory === '作品' ? openWorkAdd : openAdd}><FiPlus /></button>
      <SongModal open={modalOpen} song={editingSong} works={works} moodTags={currentTags} onClose={closeModal} onSave={saveSong} />
      <WorkModal
        open={workModalOpen}
        work={editingWork}
        songs={songs}
        remoteFirestore={remoteFirestore}
        tags={tagsBySection['作品'] || []}
        onClose={closeWorkModal}
        onSave={saveWork}
        onEditSong={(song) => { closeWorkModal(); openEdit(song) }}
        onDeleteSong={removeSong}
        onPlaySong={playSong}
        onToggleFavorite={toggleFavorite}
        onEditTags={() => setTagEditorOpen(true)}
        onDeleteSelectedSongs={removeWorkSongs}
      />
      <TagEditor
        open={tagEditorOpen}
        section={activeCategory}
        sectionName={viewName}
        tags={currentTags}
        onClose={() => setTagEditorOpen(false)}
        onSave={async (tags, additions) => {
          try {
            const updatedSections = await setSectionTags(activeCategory, tags, additions)
            if (activeTag && !tags.some((tag) => tag.id === activeTag)) setActiveTag('')
            setTagEditorOpen(false)
            setActionModal({ mode: 'success', title: '標籤已更新', message: `${updatedSections.map((section) => section === 'all' ? '全部收藏' : section).join('、')}的標籤設定已儲存。` })
          } catch {
            setActionModal({ mode: 'error', title: '標籤儲存失敗', message: '目前無法儲存標籤，請稍後再試。' })
          }
        }}
      />
      <NowPlaying song={nowPlaying} onClose={() => setNowPlaying(null)} />
      <ActionModal
        open={Boolean(actionModal)}
        mode={actionModal?.mode}
        title={actionModal?.title}
        message={actionModal?.message}
        confirmText={actionModal?.confirmText}
        cancelText={actionModal?.cancelText}
        onConfirm={actionModal?.onConfirm}
        onClose={() => setActionModal(null)}
      />

      {mobileSettingsOpen && (
        <aside className="mobile-settings-panel" aria-label="手機版設定">
          <header><strong>設定</strong><button type="button" aria-label="關閉設定" onClick={() => setMobileSettingsOpen(false)}><FiX /></button></header>
          <div>
            <span>主色</span>
            <button className={theme === 'green' ? 'selected' : ''} type="button" onClick={() => setTheme('green')}><i className="green" /> 綠色</button>
            <button className={theme === 'pink' ? 'selected' : ''} type="button" onClick={() => setTheme('pink')}><i className="pink" /> 莓果粉</button>
          </div>
          <button className="mobile-edit-tags" type="button" onClick={() => { setMobileSettingsOpen(false); setEditMode(true); setSelectedSongIds([]) }}>編輯卡片與標籤</button>
        </aside>
      )}

      <nav className="mobile-bottom-nav" aria-label="手機版主要功能">
        <button className={mobileView === 'library' ? 'active' : ''} type="button" onClick={() => { setMobileView('library'); setMobileSettingsOpen(false) }}><FiMusic /><span>音樂庫</span></button>
        <button className={mobileView === 'favorites' ? 'active' : ''} type="button" onClick={() => { setMobileView('favorites'); setMobileSettingsOpen(false) }}><FiHeart /><span>我的最愛</span></button>
        <button type="button" onClick={activeCategory === '作品' ? openWorkAdd : openAdd}><FiPlusCircle /><span>{activeCategory === '作品' ? '新增作品' : '貼上音樂'}</span></button>
        <button className={mobileSettingsOpen ? 'active' : ''} type="button" onClick={() => setMobileSettingsOpen((open) => !open)}><FiSettings /><span>設定</span></button>
      </nav>
    </div>
  )
}

export default App
