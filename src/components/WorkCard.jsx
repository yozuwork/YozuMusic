import { FiBookOpen, FiMusic } from 'react-icons/fi'

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
    <article className={`work-card${highlighted ? ' highlighted' : ''}`} role="button" tabIndex="0" aria-label={`編輯 ${work.title}，關聯 ${songCount} 首音樂`} onClick={onOpen} onKeyDown={handleKeyDown}>
      <div className={`work-cover${work.coverUrl ? ' has-image' : ''}`} style={coverStyle}>
        {!work.coverUrl && <span aria-hidden="true"><FiBookOpen /></span>}
      </div>
      <div className="work-card-body">
        <small>WORK · {work.type}</small>
        <h2>{work.title}</h2>
        <p><FiMusic aria-hidden="true" /> {songCount} 首關聯音樂</p>
      </div>
    </article>
  )
}
