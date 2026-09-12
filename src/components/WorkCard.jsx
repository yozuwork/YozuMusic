import { FiHeadphones, FiMusic } from 'react-icons/fi'
import { categoryUrl } from '../utils/routes.js'

export default function WorkCard({ work, songCount, highlighted = false, onOpen }) {
  const coverStyle = work.coverUrl
    ? {
        backgroundImage: `url("${work.coverUrl.replace(/"/g, '\\"')}")`,
        backgroundPosition: `${work.coverPosX ?? 50}% ${work.coverPosY ?? 50}%`,
        backgroundSize: work.coverFit ?? 'cover',
      }
    : undefined

  function handleKeyDown(event) {
    if (!['Enter', ' '].includes(event.key)) return
    event.preventDefault()
    onOpen()
  }

  return (
    <a className={`work-card${highlighted ? ' highlighted' : ''}`} href={`${categoryUrl('作品')}/view/${encodeURIComponent(work.id)}`} aria-label={`查看 ${work.title}，關聯 ${songCount} 首音樂`} onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      onOpen()
    }} onKeyDown={handleKeyDown}>
      <div className={`work-cover${work.coverUrl ? ' has-image' : ''}`} style={coverStyle}>
        {!work.coverUrl && <span aria-hidden="true"><FiHeadphones /></span>}
      </div>
      <div className="work-card-body">
        <small>WORK · {work.type}</small>
        <h2>{work.title}</h2>
        <p><FiMusic aria-hidden="true" /> {songCount} 首關聯音樂</p>
      </div>
    </a>
  )
}
