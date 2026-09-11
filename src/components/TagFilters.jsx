import { FiCheckSquare, FiEdit3, FiSliders, FiTag, FiTrash2, FiX } from 'react-icons/fi'

export default function TagFilters({
  tags,
  activeTag,
  onChange,
  editMode,
  selectedCount,
  allSelected,
  onToggleEditMode,
  onEditTags,
  onSelectAll,
  onDeleteSelected,
  sort,
  onSortChange,
  cardSize,
  onCardSizeChange,
  pageSize,
  onPageSizeChange,
  resultCount,
}) {
  return (
    <div className="filter-row">
      <div className="tag-filter" aria-label="歌曲感覺篩選">
        <span className="filter-label">MOOD</span>
        <button
          type="button"
          className={!activeTag ? 'tag-pill active' : 'tag-pill'}
          onClick={() => onChange('')}
        >
          全部
        </button>
        {tags.map((tag) => (
          <button
            type="button"
            key={tag.id}
            className={activeTag === tag.id ? 'tag-pill active' : 'tag-pill'}
            onClick={() => onChange(activeTag === tag.id ? '' : tag.id)}
          >
            # {tag.label}
          </button>
        ))}
      </div>

      <div className="view-controls" aria-label="卡片顯示設定">
        <select value={cardSize} aria-label="卡片大小" onChange={(event) => onCardSizeChange(event.target.value)}>
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
        <select value={pageSize} aria-label="每頁顯示數量" onChange={(event) => onPageSizeChange(event.target.value)}>
          <option value="12">12 筆／頁</option>
          <option value="36">36 筆／頁</option>
          <option value="48">48 筆／頁</option>
          <option value="flow">瀑布流</option>
        </select>
      </div>
      <button className={`edit-tags-button${editMode ? ' active' : ''}`} type="button" onClick={onToggleEditMode}>
        {editMode ? <FiX /> : <FiEdit3 />} {editMode ? '完成' : '編輯'}
      </button>
      <strong className="mobile-result-count">{resultCount} 首</strong>
      <label className="sort-control">
        <FiSliders aria-hidden="true" />
        <select value={sort} aria-label="排序方式" onChange={(event) => onSortChange(event.target.value)}>
          <option value="newest">最近收藏</option>
          <option value="title">歌名排序</option>
          <option value="favorite">最愛優先</option>
        </select>
      </label>

      {editMode && (
        <div className="bulk-edit-toolbar" aria-label="批次編輯工具列">
          <strong>{selectedCount ? `已選取 ${selectedCount} 首` : '請圈選要處理的卡片'}</strong>
          <button type="button" onClick={onEditTags}><FiTag /> 編輯標籤</button>
          <button type="button" onClick={onSelectAll}><FiCheckSquare /> {allSelected ? '取消全選' : '全選本頁'}</button>
          <button className="bulk-delete-button" type="button" disabled={!selectedCount} onClick={onDeleteSelected}><FiTrash2 /> 刪除所選</button>
          <button className="bulk-done-button" type="button" onClick={onToggleEditMode}><FiX /> 完成</button>
        </div>
      )}
    </div>
  )
}
