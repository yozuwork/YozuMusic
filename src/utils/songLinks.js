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

export function getBilibiliVideoKey(url) {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.toLowerCase().includes('bilibili.com')) return null
    const bvid = parsed.pathname.match(/\/(BV[a-zA-Z0-9]{10})(?:\/|$)/i)?.[1]
    if (bvid) return { type: 'bvid', value: `BV${bvid.slice(2)}` }
    const aid = parsed.pathname.match(/\/av(\d+)(?:\/|$)/i)?.[1]
    if (aid) return { type: 'aid', value: aid }
  } catch {
    return null
  }
  return null
}

export function getPlatform(url) {
  const value = url.toLowerCase()
  if (value.includes('youtu')) return 'YouTube'
  if (value.includes('bilibili.com')) return 'Bilibili'
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

function getBilibiliMetadata(url, signal) {
  const videoKey = getBilibiliVideoKey(url)
  if (!videoKey) return Promise.reject(new Error('找不到有效的 Bilibili BV／av 編號'))

  return new Promise((resolve, reject) => {
    const callbackName = `__yozuBilibiliMetadata_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => finish(new Error('Bilibili metadata request timed out')), 12000)

    function cleanup() {
      window.clearTimeout(timeout)
      script.remove()
      delete window[callbackName]
      signal?.removeEventListener('abort', handleAbort)
    }

    function finish(error, metadata) {
      cleanup()
      if (error) reject(error)
      else resolve(metadata)
    }

    function handleAbort() {
      finish(new DOMException('The operation was aborted.', 'AbortError'))
    }

    window[callbackName] = (payload) => {
      if (payload?.code !== 0 || !payload?.data?.title) {
        finish(new Error(payload?.message || 'Bilibili metadata is missing'))
        return
      }
      finish(null, {
        title: payload.data.title.trim(),
        artist: payload.data.owner?.name?.trim() || '',
        coverUrl: payload.data.pic?.replace(/^http:/, 'https:') || '',
      })
    }

    script.onerror = () => finish(new Error('Bilibili metadata script failed to load'))
    script.referrerPolicy = 'no-referrer'
    script.src = `https://api.bilibili.com/x/web-interface/view?${videoKey.type}=${encodeURIComponent(videoKey.value)}&jsonp=jsonp&callback=${encodeURIComponent(callbackName)}`
    signal?.addEventListener('abort', handleAbort, { once: true })
    document.head.appendChild(script)
  })
}

export async function getLinkMetadata(url, signal) {
  if (getPlatform(url) === 'Bilibili') return getBilibiliMetadata(url, signal)

  const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal })
  if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`)

  const metadata = await response.json()
  if (metadata.error || !metadata.title) throw new Error(metadata.error || 'Metadata title is missing')

  return {
    title: metadata.title.trim(),
    artist: metadata.author_name?.trim() || '',
    coverUrl: metadata.thumbnail_url || '',
  }
}
