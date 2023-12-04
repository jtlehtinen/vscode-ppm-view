const error = document.getElementById('error')
const canvas = document.getElementById('canvas')
const info = document.getElementById('info')
const context = canvas.getContext('2d')

const MIN_SCALE_TICKS = -10
const MAX_SCALE_TICKS = 50

let bitmap = null
let zoomTicks = 0
let imageFormat = ''

const clamp = (value, min, max) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

const showImage = async (bitmap, zoomTicks) => {
  if (!bitmap) return

  const scale = Math.pow(1.1, zoomTicks)
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

const zoom = (ticks) => {
  zoomTicks = clamp(zoomTicks + ticks, MIN_SCALE_TICKS, MAX_SCALE_TICKS)
  showImage(bitmap, zoomTicks)
}

const resetZoom = () => {
  zoomTicks = 0
  showImage(bitmap, zoomTicks)
}

window.addEventListener('message', async (event) => {
  const { command, pixels, width, height, format } = event.data
  if (command === 'image') {
    const imageData = new ImageData(pixels, width, height)
    bitmap = await window.createImageBitmap(imageData)
    imageFormat = format

    hideError()
    showImage(bitmap, zoomTicks)
  } else if (command === 'error') {
    hideImage()
    showError(event.data.message)
  }
})

const controlCommands = {
  '0': () => resetZoom(),
  'ArrowUp': () => zoom(1),
  'ArrowDown': () => zoom(-1),
}

window.addEventListener('keydown', event => {
  if (event.ctrlKey && event.key in controlCommands) {
    event.preventDefault()
    controlCommands[event.key]()
  }
})

window.addEventListener('mousedown', event => {
  if (event.button === 1) // middle mouse button
    resetZoom()
})

window.addEventListener('wheel', event => {
  if (event.ctrlKey) {
    zoom(-event.deltaY / 100.0)
  }
})
