const canvas = document.getElementById('canvas')
canvas.width = 256
canvas.height = 256

const context = canvas.getContext('2d')

window.addEventListener('message', event => {
  const { command, pixels, width, height } = event.data
  if (command === 'image') {
    canvas.width = width
    canvas.height = height
    context.putImageData(new ImageData(pixels, width, height), 0, 0)
  }
})
