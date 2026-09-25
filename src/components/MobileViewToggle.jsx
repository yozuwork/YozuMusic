function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <rect x={3} y={4.5} width={3} height={3} rx={0.8} />
      <rect x={3} y={10.5} width={3} height={3} rx={0.8} />
      <rect x={3} y={16.5} width={3} height={3} rx={0.8} />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
      <rect x={3.5} y={3.5} width={7} height={7} rx={1.5} />
      <rect x={13.5} y={3.5} width={7} height={7} rx={1.5} />
      <rect x={3.5} y={13.5} width={7} height={7} rx={1.5} />
      <rect x={13.5} y={13.5} width={7} height={7} rx={1.5} />
    </svg>
  )
}

// 手機版「清單／卡片」快速切換；卡片模式若原本是大圖就維持大圖
export default function MobileViewToggle({ cardSize, onCardSizeChange }) {
  return (
    <div className="mobile-view-toggle" role="group" aria-label="切換顯示方式">
      <button type="button" className={cardSize === 'small' ? 'selected' : ''} aria-pressed={cardSize === 'small'} aria-label="清單模式" title="清單" onClick={() => onCardSizeChange('small')}>
        <ListIcon />
      </button>
      <button type="button" className={cardSize !== 'small' ? 'selected' : ''} aria-pressed={cardSize !== 'small'} aria-label="卡片模式" title="卡片" onClick={() => cardSize === 'small' && onCardSizeChange('medium')}>
        <GridIcon />
      </button>
    </div>
  )
}
