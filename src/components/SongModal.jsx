import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCheck, FiClipboard, FiEdit3, FiImage, FiLink, FiPlus, FiX } from 'react-icons/fi'
import { MAIN_CATEGORIES, MOOD_TAGS } from '../data/initialSongs.js'
import { getAutoCover, getLinkMetadata, getPlatform, isWebUrl } from '../utils/songLinks.js'
import { compressCoverImage } from '../utils/compressCoverImage.js'

const emptyForm = {
  url: '',
  title: '',
  artist: '',
  coverUrl: '',
  categories: [],
  tags: [],
  note: '',
}

function ToggleGroup({ label, options, values, onChange, required }) {
  function toggle(value) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <fieldset className="toggle-fieldset">
      <legend>{label} {required && <span>*</span>}</legend>
      <div>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.id
          const text = typeof option === 'string' ? option : option.label
          return (
          <button
            type="button"
            key={value}
            className={values.includes(value) ? 'choice-chip selected' : 'choice-chip'}
            onClick={() => toggle(value)}
          >
            {values.includes(value) && <FiCheck aria-hidden="true" />}
            {text}
          </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function SongModal({ open, song, moodTags = MOOD_TAGS, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [metadataStatus, setMetadataStatus] = useState('idle')
  const [isProcessingCover, setIsProcessingCover] = useState(false)
  const [isCoverFocused, setIsCoverFocused] = useState(false)
  const fileInputRef = useRef(null)

  const applyCoverFile = useCallback(async (file) => {
    setIsProcessingCover(true)
    try {
      const coverUrl = await compressCoverImage(file)
      setForm((current) => ({ ...current, coverUrl }))
    } catch (coverError) {
      setError(coverError.message || '圖片處理失敗，請換一張圖片試試。')
    } finally {
      setIsProcessingCover(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setForm(song ? {
      url: song.url,
      title: song.title,
      artist: song.artist,
      coverUrl: song.coverUrl,
      categories: Array.isArray(song.categories) ? song.categories : [],
      tags: Array.isArray(song.tags) ? song.tags : [],
      note: song.note,
    } : emptyForm)
    setError('')
    setMetadataStatus('idle')
  }, [open, song])

  useEffect(() => {
    const url = form.url.trim()
    const platform = getPlatform(url)
    if (!open || song || !['YouTube', 'Bilibili'].includes(platform) || !isWebUrl(url)) {
      setMetadataStatus('idle')
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setMetadataStatus('loading')
      try {
        const metadata = await getLinkMetadata(url, controller.signal)
        setForm((current) => {
          if (current.url.trim() !== url) return current
          return {
            ...current,
            title: current.title.trim() ? current.title : metadata.title,
            artist: current.artist.trim() ? current.artist : metadata.artist,
            coverUrl: current.coverUrl.trim() ? current.coverUrl : metadata.coverUrl,
          }
        })
        setMetadataStatus('success')
      } catch (metadataError) {
        if (metadataError.name !== 'AbortError') {
          console.warn('[YozuMusic][Metadata] 無法取得連結資料', metadataError)
          setMetadataStatus('error')
        }
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [form.url, open, song])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined

    function handlePaste(event) {
      const targetTag = event.target?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return

      const items = event.clipboardData?.items
      if (items) {
        for (const item of items) {
          if (!item.type?.startsWith('image/')) continue

          const file = item.getAsFile()
          if (!file) continue

          event.preventDefault()
          applyCoverFile(file)
          return
        }
      }

      const pastedText = event.clipboardData?.getData('text')?.trim() ?? ''
      if (/^https?:\/\//i.test(pastedText)) {
        event.preventDefault()
        setForm((current) => ({ ...current, coverUrl: pastedText }))
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [applyCoverFile, open])

  const previewCover = useMemo(() => form.coverUrl || getAutoCover(form.url), [form.coverUrl, form.url])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    await applyCoverFile(file)
  }

  async function pasteLink() {
    try {
      const value = (await navigator.clipboard.readText()).trim()
      if (value) setForm((current) => ({ ...current, url: value }))
    } catch {
      setError('無法讀取剪貼簿，請直接在欄位貼上連結。')
    }
  }

  function submit(event) {
    event.preventDefault()
    if (!isWebUrl(form.url.trim())) {
      setError('請輸入有效的 http 或 https 音樂連結。')
      return
    }
    if (!form.title.trim()) {
      setError('請替這首歌填寫名稱。')
      return
    }
    if (!form.categories.length) {
      setError('至少選擇一個主分類；同一首歌可以選很多個。')
      return
    }

    onSave({
      ...form,
      url: form.url.trim(),
      title: form.title.trim(),
      artist: form.artist.trim(),
      coverUrl: form.coverUrl.trim() || getAutoCover(form.url),
      note: form.note.trim(),
      platform: getPlatform(form.url),
      favorite: song?.favorite ?? false,
    })
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="song-modal" role="dialog" aria-modal="true" aria-labelledby="song-modal-title">
        <button className="modal-close" type="button" aria-label="關閉" onClick={onClose}><FiX /></button>
        <div
          className="modal-preview"
          style={previewCover ? { backgroundImage: `linear-gradient(90deg, rgba(18,18,18,.74), rgba(18,18,18,.15)), url("${previewCover.replace(/"/g, '\\"')}")` } : undefined}
          tabIndex="0"
          onFocus={() => setIsCoverFocused(true)}
          onBlur={() => setIsCoverFocused(false)}
        >
          <span>{song ? <FiEdit3 /> : <FiPlus />} MUSIC CLIPPING</span>
          <h2 id="song-modal-title">{song ? '編輯這張聲音卡片' : '貼上一段喜歡的聲音'}</h2>
          <p>一筆收藏可放進多個分區，不需要重複新增。</p>
          <button
            className="cover-upload-btn"
            type="button"
            disabled={isProcessingCover}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => fileInputRef.current?.click()}
          >
            <FiImage aria-hidden="true" />
            {isProcessingCover ? '處理圖片中…' : form.coverUrl ? '更換封面' : '上傳封面'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          {!form.coverUrl && (
            <span className="cover-paste-hint">
              <FiClipboard aria-hidden="true" />
              {isCoverFocused ? '已就緒，貼上圖片或圖片網址吧！' : '也可直接貼上圖片或圖片網址（Ctrl/Cmd+V）'}
            </span>
          )}
        </div>

        <form className="song-form" onSubmit={submit}>
          <div className="form-field full-width">
            <label htmlFor="song-url">音樂連結 <span>*</span></label>
            <div className="url-input-wrap">
              <FiLink aria-hidden="true" />
              <input id="song-url" name="url" type="url" value={form.url} placeholder="貼上 YouTube、Spotify 或其他音樂連結…" onChange={updateField} autoFocus />
              <button type="button" onClick={pasteLink}><FiClipboard /> 貼上</button>
            </div>
            {form.url && (
              <small>
                辨識為 {getPlatform(form.url)}
                {getAutoCover(form.url) ? '・已自動抓取 YouTube 封面' : ''}
                {metadataStatus === 'loading' && '・正在讀取標題…'}
                {metadataStatus === 'success' && (getPlatform(form.url) === 'Bilibili' ? '・已自動填入封面、標題與來源' : '・已自動填入標題與來源')}
                {metadataStatus === 'error' && '・無法取得標題，請手動輸入'}
              </small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="song-title">歌曲名稱 <span>*</span></label>
            <input id="song-title" name="title" value={form.title} placeholder="例如：Blue Bird" onChange={updateField} />
          </div>
          <div className="form-field">
            <label htmlFor="song-artist">歌手／來源</label>
            <input id="song-artist" name="artist" value={form.artist} placeholder="例如：生物股長" onChange={updateField} />
          </div>
          <div className="form-field full-width">
            <label htmlFor="song-cover">自訂封面網址</label>
            <input id="song-cover" name="coverUrl" type="url" value={form.coverUrl} placeholder="選填；也可用上方按鈕上傳或直接貼上圖片" onChange={updateField} />
          </div>

          <ToggleGroup label="主分類" required options={MAIN_CATEGORIES} values={form.categories} onChange={(categories) => setForm((current) => ({ ...current, categories }))} />
          <ToggleGroup label="歌曲感覺" options={moodTags} values={form.tags} onChange={(tags) => setForm((current) => ({ ...current, tags }))} />

          <div className="form-field full-width">
            <label htmlFor="song-note">收藏備註</label>
            <textarea id="song-note" name="note" rows="3" value={form.note} placeholder="在哪個時刻想再聽見它？" onChange={updateField} />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="cancel-button" type="button" onClick={onClose}>取消</button>
            <button className="save-button" type="submit">{song ? '儲存變更' : '收藏這首歌'} <FiCheck /></button>
          </div>
        </form>
      </section>
    </div>
  )
}
