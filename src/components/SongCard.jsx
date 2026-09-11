import { FiCheck, FiEdit3, FiExternalLink, FiHeart, FiMoreHorizontal, FiPlay, FiTrash2 } from 'react-icons/fi'
import { SiSpotify, SiYoutube } from 'react-icons/si'

function PlatformIcon({ platform }) {
  if (platform === 'YouTube') return <SiYoutube aria-hidden="true" />
  if (platform === 'Spotify') return <SiSpotify aria-hidden="true" />
  return <FiExternalLink aria-hidden="true" />
}

export default function SongCard({ song, tagLabels, onEdit, onDelete, onToggleFavorite, onPlay, selectionMode = false, selected = false, onToggleSelect }) {
  return (
    <article className={`song-card${selectionMode ? ' selection-mode' : ''}${selected ? ' selected' : ''}`}>
      {selectionMode && (
        <label className="card-select" aria-label={`選取 ${song.title}`}>
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(song.id)} />
          <span aria-hidden="true">{selected && <FiCheck />}</span>
        </label>
      )}
      <button className="cover-button" type="button" onClick={() => selectionMode ? onToggleSelect(song.id) : onPlay(song)} aria-label={selectionMode ? `${selected ? '取消選取' : '選取'} ${song.title}` : `播放 ${song.title}`}>
        {song.coverUrl ? (
          <img src={song.coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="cover-placeholder" aria-hidden="true">
            <span>{song.title.slice(0, 1).toUpperCase()}</span>
            <i />
          </div>
        )}
        <span className="play-stamp"><FiPlay aria-hidden="true" /></span>
        <span className="platform-badge"><PlatformIcon platform={song.platform} /> {song.platform}</span>
      </button>

      <div className="song-card-body">
        <div className="song-title-row">
          <div>
            <h2>{song.title}</h2>
            <p>{song.artist || '未知創作者'}</p>
          </div>
          {!selectionMode && <button
            className={song.favorite ? 'heart-button active' : 'heart-button'}
            type="button"
            aria-label={song.favorite ? '取消最愛' : '加入最愛'}
            onClick={() => onToggleFavorite(song)}
          >
            <FiHeart aria-hidden="true" />
          </button>}
        </div>

        <div className="song-tags">
          {song.tags.filter((tag) => tagLabels[tag]).slice(0, 3).map((tag) => <span key={tag}>#{tagLabels[tag]}</span>)}
        </div>

        <div className="category-dots" aria-label={`分類：${song.categories.join('、')}`}>
          {song.categories.map((category) => <span key={category}>{category}</span>)}
        </div>

        <div className="card-footer">
          <span className="note-preview">{song.note || '沒有備註'}</span>
          {!selectionMode && <details className="more-menu">
            <summary aria-label="更多操作"><FiMoreHorizontal aria-hidden="true" /></summary>
            <div>
              <button type="button" onClick={() => onEdit(song)}><FiEdit3 /> 編輯</button>
              <a href={song.url} target="_blank" rel="noreferrer"><FiExternalLink /> 開啟來源</a>
              <button className="danger" type="button" onClick={() => onDelete(song)}><FiTrash2 /> 刪除</button>
            </div>
          </details>}
        </div>
      </div>
    </article>
  )
}
