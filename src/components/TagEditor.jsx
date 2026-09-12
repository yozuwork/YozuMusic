import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiEdit3, FiMenu, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { MAIN_CATEGORIES } from '../data/initialSongs.js'

const sections = ['all', ...MAIN_CATEGORIES]
const sectionLabel = (section) => section === 'all' ? '全部收藏' : section

export default function TagEditor({ open, section, sectionName, tags, onClose, onSave }) {
  const [draft, setDraft] = useState(tags)
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')
  const [syncMode, setSyncMode] = useState('local')
  const [selectedSections, setSelectedSections] = useState([])
  const [tagTargets, setTagTargets] = useState({})
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const listRef = useRef(null)
  const dragRef = useRef(null)
  const targets = syncMode === 'all' ? sections.filter((item) => item !== section)
    : syncMode === 'selected' ? selectedSections : []

  useEffect(() => {
    if (!open) return
    setDraft(tags)
    setNewTag('')
    setError('')
    setSyncMode('local')
    setSelectedSections([])
    setTagTargets({})
  }, [open, sectionName])

  useEffect(() => {
    if (!draggingId) return undefined
    let frame
    function track(event) {
      if (event.pointerId === dragRef.current?.pointerId) dragRef.current.y = event.clientY
    }
    function tick() {
      const drag = dragRef.current
      const list = listRef.current
      if (!drag || !list) return
      const editor = list.closest('.tag-editor')
      const bounds = editor.getBoundingClientRect()
      if (drag.y < bounds.top + 48) editor.scrollTop -= 8
      else if (drag.y > bounds.bottom - 48) editor.scrollTop += 8
      const rows = [...list.children]
      const target = rows.find((row) => drag.y < row.getBoundingClientRect().bottom) || rows.at(-1)
      if (target) {
        const rect = target.getBoundingClientRect()
        drag.target = { id: target.dataset.tagId, after: drag.y > rect.top + rect.height / 2 }
        setDropTarget((current) => current?.id === drag.target.id && current?.after === drag.target.after ? current : drag.target)
      }
      frame = requestAnimationFrame(tick)
    }
    function finish(event) {
      const drag = dragRef.current
      if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return
      if (event.type === 'pointerup' && drag.target && drag.target.id !== draggingId) {
        setDraft((current) => {
          const moved = current.find((tag) => tag.id === draggingId)
          const remaining = current.filter((tag) => tag.id !== draggingId)
          const index = remaining.findIndex((tag) => tag.id === drag.target.id)
          if (!moved || index < 0) return current
          remaining.splice(index + Number(drag.target.after), 0, moved)
          return remaining
        })
      }
      dragRef.current = null
      setDraggingId(null)
      setDropTarget(null)
    }
    frame = requestAnimationFrame(tick)
    window.addEventListener('pointermove', track)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', finish)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', track)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('blur', finish)
    }
  }, [draggingId])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || saving) return
      if (dragRef.current) {
        dragRef.current = null
        setDraggingId(null)
        setDropTarget(null)
      } else onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, saving])

  function updateLabel(id, label) {
    setDraft((current) => current.map((tag) => (tag.id === id ? { ...tag, label } : tag)))
    setError('')
  }

  function addTag() {
    if (syncMode === 'selected' && !targets.length) {
      setError('請勾選要同步的分頁。')
      return
    }
    const label = newTag.trim()
    if (!label) {
      setError('請輸入新標籤名稱。')
      return
    }
    if (draft.some((tag) => tag.label.toLocaleLowerCase('zh-Hant') === label.toLocaleLowerCase('zh-Hant'))) {
      setError('這個分區已經有相同名稱的標籤。')
      return
    }
    const id = globalThis.crypto?.randomUUID?.() || `tag-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setDraft((current) => [...current, { id, label }])
    setTagTargets((current) => ({ ...current, [id]: [...targets] }))
    setNewTag('')
    setError('')
  }

  async function save() {
    if (saving) return
    const pendingLabel = newTag.trim()
    if (pendingLabel && syncMode === 'selected' && !targets.length) {
      setError('請勾選要同步的分頁。')
      return
    }
    const pending = pendingLabel ? [{ id: globalThis.crypto?.randomUUID?.() || `tag-${Date.now()}-${Math.random().toString(36).slice(2)}`, label: pendingLabel }] : []
    const cleaned = [...draft, ...pending].map((tag) => ({ ...tag, label: tag.label.trim() }))
    if (cleaned.some((tag) => !tag.label)) {
      setError('標籤名稱不能留白。')
      return
    }
    const normalized = cleaned.map((tag) => tag.label.toLocaleLowerCase('zh-Hant'))
    if (new Set(normalized).size !== normalized.length) {
      setError('同一個分區不能有重複的標籤名稱。')
      return
    }
    const targetMap = { ...tagTargets, ...(pending.length ? { [pending[0].id]: targets } : {}) }
    const additions = cleaned.filter((tag) => targetMap[tag.id]?.length)
      .map((tag) => ({ tag, sections: targetMap[tag.id] }))
    setSaving(true)
    try {
      await onSave(cleaned, additions)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}>
      <section className="tag-editor" role="dialog" aria-modal="true" aria-labelledby="tag-editor-title">
        <header>
          <div>
            <span><FiEdit3 /> TAG MANAGEMENT</span>
            <h2 id="tag-editor-title">編輯「{sectionName}」標籤</h2>
          </div>
          <button type="button" aria-label="關閉" disabled={saving} onClick={onClose}><FiX /></button>
        </header>

        <fieldset className="tag-editor-body" disabled={saving}>
          <div className="tag-editor-list" ref={listRef}>
            {draft.map((tag) => (
              <div key={tag.id} data-tag-id={tag.id} className={`${draggingId === tag.id ? 'tag-row-dragging' : ''} ${dropTarget?.id === tag.id && draggingId !== tag.id ? (dropTarget.after ? 'tag-drop-after' : 'tag-drop-before') : ''}`}>
              <div className="tag-editor-item">
                <button className="tag-drag-handle" type="button" aria-label={`調整 ${tag.label} 順序`} title="拖曳排序；方向鍵上下移動" onPointerDown={(event) => {
                  if (event.button !== 0 || draft.length < 2) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragRef.current = { pointerId: event.pointerId, y: event.clientY, target: null }
                  setDraggingId(tag.id)
                }} onKeyDown={(event) => {
                  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
                  event.preventDefault()
                  setDraft((current) => {
                    const index = current.findIndex((item) => item.id === tag.id)
                    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? current.length - 1
                      : Math.max(0, Math.min(current.length - 1, index + (event.key === 'ArrowUp' ? -1 : 1)))
                    const next = [...current]
                    next.splice(index, 1)
                    next.splice(nextIndex, 0, current[index])
                    return next
                  })
                }}><FiMenu aria-hidden="true" /></button>
                <input value={tag.label} aria-label="標籤名稱" onChange={(event) => updateLabel(tag.id, event.target.value)} />
                <button type="button" aria-label={`刪除 ${tag.label}`} onClick={() => setDraft((current) => current.filter((item) => item.id !== tag.id))}>
                  <FiTrash2 />
                </button>
              </div>
              {tagTargets[tag.id]?.length > 0 && <p className="tag-sync-summary">同步至：{tagTargets[tag.id].map(sectionLabel).join('、')}</p>}
              </div>
            ))}
          </div>

          <fieldset className="tag-sync-options">
            <legend>新增標籤範圍</legend>
            <div className="tag-sync-modes">
              {[['local', '僅本頁'], ['all', '全部分頁'], ['selected', '指定分頁']].map(([value, label]) => (
                <label key={value} className={syncMode === value ? 'selected' : ''}>
                  <input type="radio" name="tag-sync-mode" value={value} checked={syncMode === value} onChange={() => { setSyncMode(value); setError('') }} />
                  {label}
                </label>
              ))}
            </div>
            {syncMode !== 'local' && <div className="tag-sync-sections">
              {sections.map((item) => <label key={item}>
                <input type="checkbox" checked={item === section || syncMode === 'all' || selectedSections.includes(item)} disabled={item === section || syncMode === 'all'} onChange={(event) => {
                  setSelectedSections((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))
                  setError('')
                }} />
                {sectionLabel(item)}{item === section ? '（本頁）' : ''}
              </label>)}
            </div>}
          </fieldset>

          <div className="tag-editor-add">
            <input
              value={newTag}
              placeholder="輸入新標籤名稱"
              aria-label="新標籤名稱"
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addTag()
                }
              }}
            />
            <button type="button" onClick={addTag}><FiPlus /> 新增</button>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
        </fieldset>

        <footer>
          <button className="cancel-button" type="button" disabled={saving} onClick={onClose}>取消</button>
          <button className="save-button" type="button" disabled={saving} onClick={save}><FiCheck /> {saving ? '儲存中…' : '儲存標籤'}</button>
        </footer>
      </section>
    </div>
  )
}
