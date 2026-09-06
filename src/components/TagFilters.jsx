import { FiSliders } from 'react-icons/fi'

export default function TagFilters({ tags, activeTag, onChange, sort, onSortChange }) {
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
            key={tag}
            className={activeTag === tag ? 'tag-pill active' : 'tag-pill'}
            onClick={() => onChange(activeTag === tag ? '' : tag)}
          >
            # {tag}
          </button>
        ))}
      </div>

      <label className="sort-control">
        <FiSliders aria-hidden="true" />
        <select value={sort} aria-label="排序方式" onChange={(event) => onSortChange(event.target.value)}>
          <option value="newest">最近收藏</option>
          <option value="title">歌名排序</option>
          <option value="favorite">最愛優先</option>
        </select>
      </label>
    </div>
  )
}
