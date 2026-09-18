export function buildFilterKeys(categories = [], tags = []) {
  const keys = []
  categories.forEach((category) => keys.push(`cat:${category}`))
  tags.forEach((tag) => keys.push(`tag:${tag}`))
  categories.forEach((category) => tags.forEach((tag) => keys.push(`pair:${category}|${tag}`)))
  return keys
}

export function activeFilterKey(category, tag) {
  if (category !== 'all' && tag) return `pair:${category}|${tag}`
  if (category !== 'all') return `cat:${category}`
  if (tag) return `tag:${tag}`
  return null
}
