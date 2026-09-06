import { useMemo, useState } from 'react'
import { FiDisc, FiMusic, FiPlus } from 'react-icons/fi'
import CategoryTabs from './components/CategoryTabs.jsx'
import Header from './components/Header.jsx'
import NowPlaying from './components/NowPlaying.jsx'
import SongCard from './components/SongCard.jsx'
import SongModal from './components/SongModal.jsx'
import TagFilters from './components/TagFilters.jsx'
import { MAIN_CATEGORIES, MOOD_TAGS } from './data/initialSongs.js'
import useSongLibrary from './hooks/useSongLibrary.js'
import './App.css'

function App() {
  const { songs, addSong, updateSong, deleteSong } = useSongLibrary()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTag, setActiveTag] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [modalOpen, setModalOpen] = useState(false)
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
      return inCategory && hasTag && searchable.includes(query)
    })
    return [...result].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh-Hant')
      if (sort === 'favorite') return Number(b.favorite) - Number(a.favorite) || b.createdAt.localeCompare(a.createdAt)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [activeCategory, activeTag, search, songs, sort])

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

  return (
    <div id="top" className={nowPlaying ? 'app has-player' : 'app'}>
      <Header search={search} onSearchChange={setSearch} onAdd={openAdd} />
      <CategoryTabs categories={MAIN_CATEGORIES} active={activeCategory} songs={songs} onChange={setActiveCategory} />

      <main>
        <section className="hero">
          <div>
            <span className="eyebrow"><FiDisc /> YOUR SOUND ARCHIVE</span>
            <h1>把喜歡的聲音，<br /><em>留在這裡。</em></h1>
            <p>貼上連結，替每首歌放進不只一個分類。<br />今天想聽什麼，就從感覺開始找。</p>
          </div>
          <div className="hero-stats">
            <span><strong>{songs.length}</strong> TRACKS</span>
            <i />
            <span><strong>{songs.filter((song) => song.favorite).length}</strong> FAVORITES</span>
          </div>
        </section>

        <TagFilters tags={MOOD_TAGS} activeTag={activeTag} onChange={setActiveTag} sort={sort} onSortChange={setSort} />

        <section className="library-section">
          <header className="section-heading">
            <div>
              <span>{activeTag ? `# ${activeTag}` : 'MY COLLECTION'}</span>
              <h2>{viewName}</h2>
            </div>
            <p>顯示 {visibleSongs.length} / {songs.length} 首</p>
          </header>

          {visibleSongs.length ? (
            <div className="song-grid">
              {visibleSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
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
        </section>
      </main>

      <footer className="site-footer"><FiDisc /> YOZU MUSIC LIBRARY <span>— 收好每一段想再聽見的聲音</span></footer>
      <button className="mobile-add" type="button" aria-label="新增音樂" onClick={openAdd}><FiPlus /></button>
      <SongModal open={modalOpen} song={editingSong} onClose={closeModal} onSave={saveSong} />
      <NowPlaying song={nowPlaying} onClose={() => setNowPlaying(null)} />
    </div>
  )
}

export default App
