import { FiExternalLink, FiPause, FiPlay, FiX } from 'react-icons/fi'

export default function NowPlaying({ song, onClose }) {
  if (!song) return null

  return (
    <aside className="now-playing" aria-live="polite">
      <div className="mini-cover">
        {song.coverUrl ? <img src={song.coverUrl} alt="" referrerPolicy="no-referrer" /> : <span>{song.title.slice(0, 1)}</span>}
      </div>
      <button className="mock-play" type="button" title="試聽請開啟原始連結"><FiPause /></button>
      <div className="now-playing-copy">
        <small>NOW OPENING</small>
        <strong>{song.title}</strong>
        <span>{song.artist || song.platform}</span>
      </div>
      <div className="fake-progress"><i /></div>
      <a href={song.url} target="_blank" rel="noreferrer"><FiExternalLink /> 開啟播放</a>
      <button className="player-close" type="button" aria-label="關閉播放列" onClick={onClose}><FiX /></button>
    </aside>
  )
}
