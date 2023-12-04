const SCALE_FACTOR = 1.1
const MIN_SCALE_TICKS = -10
const MAX_SCALE_TICKS = 50
const HEADER_HEIGHT = 60

const error = document.getElementById('error')
const canvas = document.getElementById('canvas')
const info = document.getElementById('info')
const context = canvas.getContext('2d')

let bitmap = null
let zoomTicks = 0
let imageFormat = ''

const clamp = (value, min, max) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

// fitSizeToWindow returns the largest zoom ticks value that fits the
// image to the window.
const fitSizeToWindow = (width, height) => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let zoomTicks = MIN_SCALE_TICKS

  while (true) {
    const scale = Math.pow(SCALE_FACTOR, zoomTicks)
    const newWidth = width * scale
    const newHeight = height * scale

    if (newWidth > windowWidth || newHeight > windowHeight - HEADER_HEIGHT) {
      zoomTicks--
      break
    }

    zoomTicks++
  }

  return clamp(zoomTicks, MIN_SCALE_TICKS, MAX_SCALE_TICKS)
}

const showImage = async (bitmap, zoomTicks) => {
  if (!bitmap) return

  const scale = Math.pow(SCALE_FACTOR, zoomTicks)
  const scaledWidth = Math.ceil(bitmap.width * scale)
  const scaledHeight = Math.ceil(bitmap.height * scale)

  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  canvas.style.display = 'block'
  canvas.width = Math.min(scaledWidth, windowWidth)
  canvas.height = Math.min(scaledHeight, windowHeight)

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
  if (!bitmap) return
  zoomTicks = fitSizeToWindow(bitmap.width, bitmap.height)
  showImage(bitmap, zoomTicks)
}

window.addEventListener('message', async (event) => {
  const { command, pixels, width, height, format } = event.data
  if (command === 'image') {
    const imageData = new ImageData(pixels, width, height)
    bitmap = await window.createImageBitmap(imageData)
    imageFormat = format
    zoomTicks = fitSizeToWindow(width, height)

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
