const error = document.getElementById('error')
const canvas = document.getElementById('canvas')
const info = document.getElementById('info')
const context = canvas.getContext('2d')

let bitmap = null
let scale = 1.0
let imageFormat = ''

const clamp = (value, min, max) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

const showImage = async (bitmap, scale) => {
  if (!bitmap) return

  const scaledWidth = Math.ceil(bitmap.width * scale)
  const scaledHeight = Math.ceil(bitmap.height * scale)

  canvas.style.display = 'block'
  canvas.width = scaledWidth
  canvas.height = scaledHeight

  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight)
  info.textContent = `${imageFormat} ${scaledWidth}x${scaledHeight} ${Math.floor(scale * 100)}%`
}

const hideImage = () => {
  bitmap = null
  canvas.style.display = 'none'
  info.textContent = ''
}

const hideError = () => {
  error.style.display = 'none'
}

const showError = (errorMessage) => {
  error.style.display = 'block'
  error.textContent = `✖ ${errorMessage}`
}

window.addEventListener('message', async (event) => {
  const { command, pixels, width, height, format } = event.data
  if (command === 'image') {
    const imageData = new ImageData(pixels, width, height)
    bitmap = await window.createImageBitmap(imageData)
    imageFormat = format

    hideError()
    showImage(bitmap, scale)
  } else if (command === 'error') {
    hideImage()
    showError(event.data.message)
  }
})

window.addEventListener('wheel', event => {
  if (!event.ctrlKey)
    return

  const MIN_SCALE = 0.1
  const MAX_SCALE = 10.0

  const normalizedDelta = -event.deltaY / 100.0
  scale = clamp(scale + normalizedDelta * 0.1, MIN_SCALE, MAX_SCALE)

  showImage(bitmap, scale)
})

window.addEventListener('mousedown', (event) => {
  const MIDDLE = 1
  if (event.button === MIDDLE) {
    scale = 1.0
    showImage(bitmap, scale)
  }
})