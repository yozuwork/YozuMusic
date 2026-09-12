import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCheck, FiChevronLeft, FiChevronRight, FiClipboard, FiEdit3, FiImage, FiMaximize, FiMove, FiPlus, FiX } from 'react-icons/fi'
import { compressCoverImage } from '../utils/compressCoverImage.js'
import SongCard from './SongCard.jsx'
import TagFilters from './TagFilters.jsx'

const emptyForm = { title: '', type: '動漫', coverUrl: '', coverPosX: 50, coverPosY: 50, coverFit: 'cover', coverHeight: null }

export default function WorkModal({
  open,
  page = false,
  work,
  songs = [],
  tags = [],
  onClose,
  onSave,
  onEditSong,
  onDeleteSong,
  onPlaySong,
  onToggleFavorite,
  onEditTags,
  onDeleteSelectedSongs,
}) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isCoverFocused, setIsCoverFocused] = useState(false)
  const [isProcessingCover, setIsProcessingCover] = useState(false)
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState('newest')
  const [cardSize, setCardSize] = useState('small')
  const [pageSize, setPageSize] = useState('12')
  const [currentPage, setCurrentPage] = useState(1)
  const [editMode, setEditMode] = useState(false)
  const [selectedSongIds, setSelectedSongIds] = useState([])
  const fileInputRef = useRef(null)
  const coverBannerRef = useRef(null)
  const dragRef = useRef(null)
  const resizeRef = useRef(null)

  const applyCoverFile = useCallback(async (file) => {
    setIsProcessingCover(true)
    try {
      const coverUrl = await compressCoverImage(file)
      setForm((current) => ({ ...current, coverUrl, coverPosX: 50, coverPosY: 50, coverFit: 'cover' }))
    } catch (coverError) {
      setError(coverError.message || '圖片處理失敗，請換一張圖片試試。')
    } finally {
      setIsProcessingCover(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setForm(work ? {
      title: work.title || '',
      type: work.type || '動漫',
      coverUrl: work.coverUrl || '',
      coverPosX: work.coverPosX ?? 50,
      coverPosY: work.coverPosY ?? 50,
      coverFit: work.coverFit || 'cover',
      coverHeight: work.coverHeight || null,
    } : emptyForm)
    setError('')
    setIsDragging(false)
    setIsResizing(false)
    setIsCoverFocused(false)
    setActiveTag('')
    setSort('newest')
    setCurrentPage(1)
    setEditMode(false)
    setSelectedSongIds([])
  }, [open, work])

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !page) resetAndClose()
    }
    function handlePaste(event) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return
      for (const item of event.clipboardData?.items || []) {
        if (!item.type?.startsWith('image/')) continue
        const file = item.getAsFile()
        if (!file) continue
        event.preventDefault()
        applyCoverFile(file)
        return
      }
      const pastedText = event.clipboardData?.getData('text')?.trim() ?? ''
      if (/^https?:\/\//i.test(pastedText)) {
        event.preventDefault()
        setForm((current) => ({ ...current, coverUrl: pastedText, coverPosX: 50, coverPosY: 50, coverFit: 'cover' }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('paste', handlePaste)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCoverFile, open])

  const workSongs = useMemo(() => {
    if (!work) return []
    return songs.filter((song) => song.workId === work.id || (!song.workId && song.workTitle === work.title))
  }, [songs, work])

  const availableTags = tags

  const relatedSongs = useMemo(() => {
    return workSongs
      .filter((song) => !activeTag || song.tags?.includes(activeTag))
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title, 'zh-Hant')
        if (sort === 'favorite') return Number(b.favorite) - Number(a.favorite) || (b.createdAt || '').localeCompare(a.createdAt || '')
        return (b.createdAt || '').localeCompare(a.createdAt || '')
      })
  }, [activeTag, sort, workSongs])

  const pageCount = pageSize === 'flow' ? 1 : Math.max(1, Math.ceil(relatedSongs.length / Number(pageSize)))
  const displayedSongs = pageSize === 'flow'
    ? relatedSongs
    : relatedSongs.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize))
  const allDisplayedSelected = displayedSongs.length > 0 && displayedSongs.every((song) => selectedSongIds.includes(song.id))
  const tagLabels = Object.fromEntries(tags.map((tag) => [tag.id, tag.label]))

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTag, pageSize, sort])

  useEffect(() => {
    if (activeTag && !availableTags.some((tag) => tag.id === activeTag)) setActiveTag('')
  }, [activeTag, availableTags])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    await applyCoverFile(file)
  }

  function toggleCoverFit(event) {
    event.stopPropagation()
    setForm((current) => ({ ...current, coverFit: current.coverFit === 'cover' ? 'contain' : 'cover' }))
  }

  function handleCoverPointerDown(event) {
    if (!form.coverUrl) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startY: event.clientY, startPosX: form.coverPosX, startPosY: form.coverPosY }
    setIsDragging(true)
  }

  function handleCoverPointerMove(event) {
    if (!dragRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const coverPosX = Math.min(100, Math.max(0, dragRef.current.startPosX + ((event.clientX - dragRef.current.startX) / rect.width) * 100))
    const coverPosY = Math.min(100, Math.max(0, dragRef.current.startPosY + ((event.clientY - dragRef.current.startY) / rect.height) * 100))
    setForm((current) => ({ ...current, coverPosX, coverPosY }))
  }

  function endCoverDrag() {
    dragRef.current = null
    setIsDragging(false)
  }

  function handleResizePointerDown(event) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeRef.current = { startY: event.clientY, startHeight: coverBannerRef.current?.getBoundingClientRect().height ?? 190 }
    setIsResizing(true)
  }

  function handleResizePointerMove(event) {
    if (!resizeRef.current) return
    const coverHeight = Math.min(380, Math.max(110, resizeRef.current.startHeight + event.clientY - resizeRef.current.startY))
    setForm((current) => ({ ...current, coverHeight }))
  }

  function endCoverResize() {
    resizeRef.current = null
    setIsResizing(false)
  }

  function resetAndClose() {
    setError('')
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    if (isProcessingCover) return
    if (!form.title.trim()) {
      setError('請輸入作品名稱。')
      return
    }
    onSave({ ...form, title: form.title.trim(), coverUrl: form.coverUrl.trim() })
  }

  function toggleSelectAll() {
    const ids = displayedSongs.map((song) => song.id)
    setSelectedSongIds((current) => allDisplayedSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])])
  }

  if (!open) return null

  const coverClassName = ['work-cover-banner', form.coverUrl ? 'has-image' : '', isDragging ? 'dragging' : ''].filter(Boolean).join(' ')
  const coverStyle = {
    height: form.coverHeight ? `${form.coverHeight}px` : undefined,
    backgroundImage: form.coverUrl ? `url("${form.coverUrl.replace(/"/g, '\\"')}")` : undefined,
    backgroundPosition: `${form.coverPosX}% ${form.coverPosY}%`,
    backgroundSize: form.coverFit,
  }

  return (
    <div className={page ? 'work-page' : 'modal-backdrop work-modal-backdrop'} onMouseDown={(event) => !page && event.target === event.currentTarget && resetAndClose()}>
      <section className="work-modal" role={page ? undefined : 'dialog'} aria-modal={page ? undefined : true} aria-label={work ? '編輯作品' : '新增作品卡片'}>
        <span className="work-modal-tag">{work ? <FiEdit3 aria-hidden="true" /> : <FiPlus aria-hidden="true" />} {work ? '編輯作品' : '新增作品'}</span>
        <button className="work-modal-close" type="button" aria-label={page ? '返回作品' : '關閉'} title={page ? '返回作品' : '關閉'} onClick={resetAndClose}>{page ? <FiChevronLeft /> : <FiX />}</button>

        <div ref={coverBannerRef} className={coverClassName} style={coverStyle} role="button" tabIndex="0" aria-label="封面預覽，可貼上或拖曳圖片" onFocus={() => setIsCoverFocused(true)} onBlur={() => setIsCoverFocused(false)} onPointerDown={handleCoverPointerDown} onPointerMove={handleCoverPointerMove} onPointerUp={endCoverDrag} onPointerCancel={endCoverDrag} onPointerLeave={endCoverDrag}>
          <button className="work-cover-btn" type="button" disabled={isProcessingCover} onPointerDown={(event) => event.stopPropagation()} onClick={() => fileInputRef.current?.click()}>
            {form.coverUrl ? <FiEdit3 aria-hidden="true" /> : <FiImage aria-hidden="true" />}
            {isProcessingCover ? '處理圖片中…' : form.coverUrl ? '更換封面' : '新增封面'}
          </button>
          {form.coverUrl && <button className="work-cover-fit-btn" type="button" title="切換填滿／顯示全圖" onPointerDown={(event) => event.stopPropagation()} onClick={toggleCoverFit}><FiMaximize /> {form.coverFit === 'cover' ? '顯示全圖' : '填滿裁切'}</button>}
          <span className="work-cover-drag-hint"><FiMove /> 拖曳可調整顯示位置</span>
          {!form.coverUrl && <span className="work-cover-paste-hint"><FiClipboard /> {isCoverFocused ? '已就緒，貼上圖片或圖片網址吧！' : '也可直接貼上圖片或圖片網址（Ctrl/Cmd+V）'}</span>}
          <div className={isResizing ? 'work-cover-resize-handle resizing' : 'work-cover-resize-handle'} title="拖曳調整封面高度" onPointerDown={handleResizePointerDown} onPointerMove={handleResizePointerMove} onPointerUp={endCoverResize} onPointerCancel={endCoverResize} />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />

        <form className="work-form" onSubmit={submit}>
          <div className="form-field full-width"><label htmlFor="work-title">作品名稱 <span>*</span></label><input id="work-title" value={form.title} placeholder="例如：我心裡危險的東西" autoFocus onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></div>
          <fieldset className="toggle-fieldset"><legend>作品類型 <span>*</span></legend><div>{['動漫', '遊戲'].map((type) => <button className={form.type === type ? 'choice-chip selected' : 'choice-chip'} type="button" key={type} onClick={() => setForm((current) => ({ ...current, type }))}>{form.type === type && <FiCheck />} {type}</button>)}</div></fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={resetAndClose}>取消</button><button className="save-button" type="submit" disabled={isProcessingCover}>{isProcessingCover ? '處理圖片中…' : work ? '儲存變更' : '建立作品'} <FiCheck /></button></div>
        </form>

        <section className="work-music-section" aria-label="關聯音樂">
          <header><div><small>RELATED MUSIC</small><h2>關聯音樂</h2></div><strong>{relatedSongs.length} 首</strong></header>
          {work && <TagFilters tags={availableTags} activeTag={activeTag} onChange={setActiveTag} editMode={editMode} selectedCount={selectedSongIds.length} allSelected={allDisplayedSelected} onToggleEditMode={() => { setEditMode((current) => !current); if (editMode) setSelectedSongIds([]) }} onEditTags={onEditTags} onSelectAll={toggleSelectAll} onDeleteSelected={() => onDeleteSelectedSongs(selectedSongIds, () => { setSelectedSongIds([]); setEditMode(false) })} sort={sort} onSortChange={setSort} cardSize={cardSize} onCardSizeChange={setCardSize} pageSize={pageSize} onPageSizeChange={setPageSize} resultCount={relatedSongs.length} />}
          {work && relatedSongs.length ? (
            <div className={`song-grid view-${cardSize}`}>{displayedSongs.map((song) => <SongCard key={song.id} song={song} work={work} tagLabels={tagLabels} onEdit={() => onEditSong(song)} onDelete={() => onDeleteSong(song)} onPlay={() => onPlaySong(song)} onToggleFavorite={() => onToggleFavorite(song)} onOpenWork={() => {}} selectionMode={editMode} selected={selectedSongIds.includes(song.id)} onToggleSelect={(id) => setSelectedSongIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />)}</div>
          ) : (
            <div className="work-music-empty"><p>{work ? '這個作品還沒有關聯音樂。' : '建立作品後，可在歌曲編輯頁將音樂關聯到這裡。'}</p></div>
          )}
          {work && pageCount > 1 && <nav className="pagination" aria-label="關聯音樂分頁"><button type="button" aria-label="上一頁" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><FiChevronLeft /></button><span>{currentPage} / {pageCount}</span><button type="button" aria-label="下一頁" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}><FiChevronRight /></button></nav>}
        </section>
      </section>
    </div>
  )
}
