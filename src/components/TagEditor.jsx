import { useEffect, useState } from 'react'
import { FiCheck, FiEdit3, FiPlus, FiTrash2, FiX } from 'react-icons/fi'

export default function TagEditor({ open, sectionName, tags, onClose, onSave }) {
  const [draft, setDraft] = useState(tags)
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(tags)
    setNewTag('')
    setError('')
  }, [open, tags])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  function updateLabel(id, label) {
    setDraft((current) => current.map((tag) => (tag.id === id ? { ...tag, label } : tag)))
    setError('')
  }

  function addTag() {
    const label = newTag.trim()
    if (!label) return
    if (draft.some((tag) => tag.label.toLocaleLowerCase('zh-Hant') === label.toLocaleLowerCase('zh-Hant'))) {
      setError('這個分區已經有相同名稱的標籤。')
      return
    }
    setDraft((current) => [...current, { id: crypto.randomUUID(), label }])
    setNewTag('')
    setError('')
  }

  function save() {
    const cleaned = draft.map((tag) => ({ ...tag, label: tag.label.trim() }))
    if (cleaned.some((tag) => !tag.label)) {
      setError('標籤名稱不能留白。')
      return
    }
    const normalized = cleaned.map((tag) => tag.label.toLocaleLowerCase('zh-Hant'))
    if (new Set(normalized).size !== normalized.length) {
      setError('同一個分區不能有重複的標籤名稱。')
      return
    }
    onSave(cleaned)
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="tag-editor" role="dialog" aria-modal="true" aria-labelledby="tag-editor-title">
        <header>
          <div>
            <span><FiEdit3 /> TAG MANAGEMENT</span>
            <h2 id="tag-editor-title">編輯「{sectionName}」標籤</h2>
            <p>這裡的變更只會套用到目前分區。</p>
          </div>
          <button type="button" aria-label="關閉" onClick={onClose}><FiX /></button>
        </header>

        <div className="tag-editor-body">
          <div className="tag-editor-list">
            {draft.map((tag) => (
              <div className="tag-editor-item" key={tag.id}>
                <span>#</span>
                <input value={tag.label} aria-label="標籤名稱" onChange={(event) => updateLabel(tag.id, event.target.value)} />
                <button type="button" aria-label={`刪除 ${tag.label}`} onClick={() => setDraft((current) => current.filter((item) => item.id !== tag.id))}>
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

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
        </div>

        <footer>
          <button className="cancel-button" type="button" onClick={onClose}>取消</button>
          <button className="save-button" type="button" onClick={save}><FiCheck /> 儲存標籤</button>
        </footer>
      </section>
    </div>
  )
}
