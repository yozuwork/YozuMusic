import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiChevronLeft, FiChevronRight, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'

const WORK_TYPES = ['動漫', '遊戲']
const TYPE_FILTERS = ['全部', ...WORK_TYPES]
const PAGE_SIZE = 10

export default function WorkPickerModal({ open, works = [], selectedWorkId, onClose, onApply, onCreateWork }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [pickedId, setPickedId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', type: '動漫', coverUrl: '' })
  const [createStatus, setCreateStatus] = useState({ saving: false, error: '' })
  // 剛建立的作品可能還沒同步回 works，先記在這裡讓套用時拿得到名稱
  const [createdWork, setCreatedWork] = useState(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setTypeFilter('全部')
    setPickedId(selectedWorkId || '')
    setCurrentPage(1)
    setCreating(false)
    setCreateStatus({ saving: false, error: '' })
    setCreatedWork(null)
  }, [open, selectedWorkId])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (creating) setCreating(false)
      else onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, creating])

  const filteredWorks = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return works.filter((work) => {
      if (typeFilter !== '全部' && work.type !== typeFilter) return false
      if (keyword && !work.title.toLowerCase().includes(keyword)) return false
      return true
    })
  }, [works, query, typeFilter])

  const pageCount = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [query, typeFilter])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

  const displayedWorks = filteredWorks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (!open) return null

  function apply() {
    const matchedWork = works.find((work) => work.id === pickedId) || (createdWork?.id === pickedId ? createdWork : null)
    onApply(pickedId, matchedWork?.title || '')
    onClose()
  }

  function startCreate() {
    setDraft({ title: query.trim(), type: WORK_TYPES.includes(typeFilter) ? typeFilter : '動漫', coverUrl: '' })
    setCreateStatus({ saving: false, error: '' })
    setCreating(true)
  }

  async function submitCreate(event) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) {
      setCreateStatus({ saving: false, error: '請輸入作品名稱。' })
      return
    }
    setCreateStatus({ saving: true, error: '' })
    try {
      const work = await onCreateWork({ title, type: draft.type, coverUrl: draft.coverUrl.trim() })
      setCreatedWork(work)
      setPickedId(work.id)
      setQuery('')
      setTypeFilter('全部')
      setCurrentPage(1)
      setCreating(false)
      setCreateStatus({ saving: false, error: '' })
    } catch (error) {
      console.error('[YozuMusic][WorkPicker] 建立作品失敗', error)
      setCreateStatus({ saving: false, error: '目前無法建立作品，請稍後再試。' })
    }
  }

  function clearSelection() {
    onApply('', '')
    onClose()
  }

  return (
    <div className="modal-backdrop work-picker-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="work-picker-modal" role="dialog" aria-modal="true" aria-labelledby="work-picker-title">
        <header className="work-picker-header">
          <h2 id="work-picker-title">選擇關聯作品</h2>
          <button className="work-picker-close" type="button" aria-label="關閉" onClick={onClose}><FiX /></button>
        </header>

        <div className="work-picker-search">
          <FiSearch aria-hidden="true" />
          <input
            type="text"
            value={query}
            placeholder="搜尋作品名稱…"
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>

        <div className="work-picker-filters">
          {TYPE_FILTERS.map((type) => (
            <button
              key={type}
              type="button"
              className={typeFilter === type ? 'choice-chip selected' : 'choice-chip'}
              onClick={() => setTypeFilter(type)}
            >
              {type}
            </button>
          ))}
          <span className="work-picker-count">共 {filteredWorks.length} 部作品</span>
          {onCreateWork && !creating && (
            <button type="button" className="work-picker-new" onClick={startCreate}><FiPlus aria-hidden="true" /> 新增作品</button>
          )}
        </div>

        {creating && (
          <form className="work-picker-create" onSubmit={submitCreate}>
            <strong>新增作品</strong>
            <input
              type="text"
              value={draft.title}
              placeholder="作品名稱"
              aria-label="作品名稱"
              autoFocus
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
            <div className="work-picker-create-types" role="group" aria-label="作品類型">
              {WORK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={draft.type === type ? 'choice-chip selected' : 'choice-chip'}
                  aria-pressed={draft.type === type}
                  onClick={() => setDraft((current) => ({ ...current, type }))}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              type="url"
              value={draft.coverUrl}
              placeholder="封面圖片網址（選填，之後也能在作品頁上傳）"
              aria-label="封面圖片網址"
              onChange={(event) => setDraft((current) => ({ ...current, coverUrl: event.target.value }))}
            />
            {createStatus.error && <p className="form-error" role="alert">{createStatus.error}</p>}
            <div className="work-picker-create-actions">
              <button type="button" className="cancel-button" onClick={() => setCreating(false)}>取消</button>
              <button type="submit" className="save-button" disabled={createStatus.saving}>{createStatus.saving ? '建立中…' : '建立並選取'}</button>
            </div>
          </form>
        )}

        <div className="work-picker-list" role="radiogroup" aria-label="作品清單">
          {displayedWorks.length ? displayedWorks.map((work) => (
            <label key={work.id} className={pickedId === work.id ? 'work-picker-item selected' : 'work-picker-item'}>
              <input
                type="radio"
                name="work-picker"
                checked={pickedId === work.id}
                onChange={() => setPickedId(work.id)}
              />
              <span
                className="work-picker-thumb"
                style={work.coverUrl ? { backgroundImage: `url("${work.coverUrl.replace(/"/g, '\\"')}")` } : undefined}
              />
              <span className="work-picker-info">
                <strong>{work.title}</strong>
                <span className="work-picker-type">{work.type}</span>
              </span>
            </label>
          )) : (
            <p className="work-picker-empty">{onCreateWork ? '找不到符合的作品，可以按「新增作品」直接建立。' : '找不到符合的作品，請先在「作品」區建立。'}</p>
          )}
        </div>

        {pageCount > 1 && (
          <nav className="work-picker-pagination" aria-label="作品分頁">
            <button type="button" aria-label="上一頁" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><FiChevronLeft /></button>
            <span>{currentPage} / {pageCount}</span>
            <button type="button" aria-label="下一頁" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}><FiChevronRight /></button>
          </nav>
        )}

        <div className="work-picker-actions">
          <button type="button" className="work-picker-clear" onClick={clearSelection}>
            <FiTrash2 aria-hidden="true" /> 清除關聯
          </button>
          <div className="work-picker-actions-right">
            <button type="button" className="cancel-button" onClick={onClose}>取消</button>
            <button type="button" className="save-button" onClick={apply}>套用 <FiCheck aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
