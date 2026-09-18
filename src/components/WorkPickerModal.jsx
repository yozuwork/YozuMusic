import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiChevronLeft, FiChevronRight, FiSearch, FiTrash2, FiX } from 'react-icons/fi'

const TYPE_FILTERS = ['全部', '動漫', '遊戲']
const PAGE_SIZE = 10

export default function WorkPickerModal({ open, works = [], selectedWorkId, onClose, onApply }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [pickedId, setPickedId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setTypeFilter('全部')
    setPickedId(selectedWorkId || '')
    setCurrentPage(1)
  }, [open, selectedWorkId])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
    const matchedWork = works.find((work) => work.id === pickedId)
    onApply(pickedId, matchedWork?.title || '')
    onClose()
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
        </div>

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
            <p className="work-picker-empty">找不到符合的作品，請先在「作品」區建立。</p>
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
