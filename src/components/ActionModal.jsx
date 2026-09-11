import { useEffect, useRef } from 'react'
import { FiAlertTriangle, FiCheck, FiCheckCircle, FiX, FiXCircle } from 'react-icons/fi'

const MODE_CONTENT = {
  success: { eyebrow: 'SUCCESS', title: '操作成功', confirmText: '確定', icon: FiCheckCircle },
  error: { eyebrow: 'FAILED', title: '操作失敗', confirmText: '確定', icon: FiXCircle },
  confirm: { eyebrow: 'CONFIRM', title: '請再次確認', confirmText: '確定', icon: FiAlertTriangle },
}

export default function ActionModal({
  open,
  mode = 'confirm',
  title,
  message,
  confirmText,
  cancelText = '取消',
  onConfirm,
  onClose,
}) {
  const confirmButtonRef = useRef(null)
  const content = MODE_CONTENT[mode] || MODE_CONTENT.confirm
  const Icon = content.icon

  useEffect(() => {
    if (!open) return undefined
    confirmButtonRef.current?.focus()
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function handleConfirm() {
    console.log('[YozuMusic][Modal] 按下確認', { mode, hasAction: Boolean(onConfirm) })
    onClose()
    onConfirm?.()
  }

  return (
    <div className="modal-backdrop action-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`action-modal mode-${mode}`} role="alertdialog" aria-modal="true" aria-labelledby="action-modal-title" aria-describedby="action-modal-message">
        <button className="action-modal-close" type="button" aria-label="關閉" onClick={onClose}><FiX /></button>
        <div className="action-modal-icon" aria-hidden="true"><Icon /></div>
        <span className="action-modal-eyebrow">{content.eyebrow}</span>
        <h2 id="action-modal-title">{title || content.title}</h2>
        <p id="action-modal-message">{message}</p>
        <div className="action-modal-actions">
          {mode === 'confirm' && <button className="action-cancel-button" type="button" onClick={onClose}>{cancelText}</button>}
          <button ref={confirmButtonRef} className="action-confirm-button" type="button" onClick={handleConfirm}>
            {mode !== 'confirm' && <FiCheck aria-hidden="true" />}
            {confirmText || content.confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}
