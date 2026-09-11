const DEFAULT_MAX_DIMENSION = 1200
const DEFAULT_QUALITY = 0.85
const MAX_DATA_URL_LENGTH = 700_000

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('無法讀取圖片檔案。'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onerror = () => reject(new Error('圖片格式無法辨識。'))
    image.onload = () => resolve(image)
    image.src = source
  })
}

function drawResizedImage(source, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('瀏覽器無法處理圖片。')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

function encodeCanvas(canvas, quality) {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp
  return canvas.toDataURL('image/jpeg', quality)
}

export async function compressCoverImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('請選擇圖片檔案。')

  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)
  const scale = Math.min(1, DEFAULT_MAX_DIMENSION / Math.max(image.width, image.height))
  let canvas = drawResizedImage(image, image.width * scale, image.height * scale)
  let quality = DEFAULT_QUALITY
  let result = encodeCanvas(canvas, quality)

  while (result.length > MAX_DATA_URL_LENGTH && quality > 0.35) {
    quality = Math.max(0.35, quality - 0.1)
    result = encodeCanvas(canvas, quality)
  }

  while (result.length > MAX_DATA_URL_LENGTH && Math.max(canvas.width, canvas.height) > 480) {
    canvas = drawResizedImage(canvas, canvas.width * 0.8, canvas.height * 0.8)
    result = encodeCanvas(canvas, 0.7)
  }

  if (result.length > MAX_DATA_URL_LENGTH) {
    throw new Error('圖片壓縮後仍然太大，請改用尺寸較小的圖片。')
  }

  return result
}
