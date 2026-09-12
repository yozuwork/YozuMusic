export const categoryPaths = { all: '', BGM: 'bgm', MUSIC: 'music', 作業用: 'Productivity', 作品: 'works' }

export function categoryUrl(category, base = import.meta.env.BASE_URL) {
  return `${base}${categoryPaths[category] ?? ''}`
}

export function readRoute(pathname, base = import.meta.env.BASE_URL) {
  const path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.slice(1)
  const [section = '', action, id, ...rest] = path.replace(/\/$/, '').split('/')
  const category = Object.keys(categoryPaths).find((key) => categoryPaths[key] === section)
  if (!category || (action && (category !== '作品' || action !== 'view' || !id || rest.length))) return { category: 'all', notFound: true }
  try {
    return { category, workId: id ? decodeURIComponent(id) : '' }
  } catch {
    return { category, notFound: true }
  }
}
