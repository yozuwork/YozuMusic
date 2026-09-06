export function getYoutubeId(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1).split('/')[0]
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2]
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2]
      return parsed.searchParams.get('v')
    }
  } catch {
    return ''
  }
  return ''
}

export function getPlatform(url) {
  const value = url.toLowerCase()
  if (value.includes('youtu')) return 'YouTube'
  if (value.includes('spotify')) return 'Spotify'
  if (value.includes('soundcloud')) return 'SoundCloud'
  if (value.includes('music.apple')) return 'Apple Music'
  return '音樂連結'
}

export function getAutoCover(url) {
  const youtubeId = getYoutubeId(url)
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''
}

export function isWebUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}
