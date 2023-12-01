const Code0 = '0'.charCodeAt(0)
const Code9 = '9'.charCodeAt(0)
const CodeSpace = ' '.charCodeAt(0)
const CodeNewline = '\n'.charCodeAt(0)
const CodeCarriageReturn = '\r'.charCodeAt(0)
const CodeTab = '\t'.charCodeAt(0)
const CodeFormFeed = '\f'.charCodeAt(0)
const CodeVerticalTab = '\v'.charCodeAt(0)
//const CodeHash = '#'.charCodeAt(0)

interface Image {
  pixels: Uint8ClampedArray
  width: number
  height: number
}

interface Parser {
  buffer: Uint8Array
  idx: number
}

// @TODO: The image is top-down...

const peek = (parser: Parser): number => parser.buffer[parser.idx]
const next = (parser: Parser): number => parser.buffer[parser.idx++]
const isAtEnd = (parser: Parser): boolean => parser.idx >= parser.buffer.length
const isDigit = (c: number): boolean => c >= Code0 && c <= Code9
const isWhitespace = (c: number): boolean =>
  c === CodeSpace ||
  c === CodeNewline ||
  c === CodeCarriageReturn ||
  c === CodeTab ||
  c === CodeFormFeed ||
  c === CodeVerticalTab

function skipWhitespace(parser: Parser): void {
  while (!isAtEnd(parser) && isWhitespace(peek(parser))) {
    next(parser)
  }
}

function expect(parser: Parser, c: number): void {
  if (isAtEnd(parser) || next(parser) !== c) {
    throw new Error('invalid ppm file')
  }
}

function expectNumber(parser: Parser): number {
  const begin = parser.idx

  let result = 0
  while (!isAtEnd(parser) && isDigit(peek(parser))) {
    result = result * 10 + (next(parser) - Code0)
  }

  if (begin === parser.idx) {
    throw new Error('invalid ppm file')
  }

  return result
}

function parseP3(buffer: Uint8Array): Image {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, 'P'.charCodeAt(0))
  expect(parser, '3'.charCodeAt(0))

  skipWhitespace(parser)
  const width = expectNumber(parser)
  skipWhitespace(parser)
  const height = expectNumber(parser)
  skipWhitespace(parser)
  const maxColorValue = expectNumber(parser)
  skipWhitespace(parser)

  if (maxColorValue < 0 || maxColorValue >= 65536) {
    throw new Error('invalid ppm file')
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  // mapColor maps the color component from [0, maxColorValue] to [0, 255].
  const mapColor = (colorComponent: number) => (colorComponent / maxColorValue) * 255

  for (let i = 0; i < width * height; ++i) {
    const r = expectNumber(parser)
    skipWhitespace(parser)
    const g = expectNumber(parser)
    skipWhitespace(parser)
    const b = expectNumber(parser)
    skipWhitespace(parser)

    pixels[i * componentsPerPixel + 0] = mapColor(r)
    pixels[i * componentsPerPixel + 1] = mapColor(g)
    pixels[i * componentsPerPixel + 2] = mapColor(b)
    pixels[i * componentsPerPixel + 3] = 255
  }

  return { pixels, width, height }
}

function parseP6(buffer: Uint8Array): Image {
  // @NOTE: P6 file can host multiple PPM images.

  const parser: Parser = { buffer: buffer, idx: 0 }

  expect(parser, 'P'.charCodeAt(0))
  expect(parser, '6'.charCodeAt(0))

  skipWhitespace(parser)
  const width = expectNumber(parser)
  skipWhitespace(parser)
  const height = expectNumber(parser)
  skipWhitespace(parser)
  const maxColorValue = expectNumber(parser)
  next(parser) // @TODO: Ensure it is whitespace.

  if (maxColorValue < 0 || maxColorValue >= 65536) {
    throw new Error('invalid ppm file')
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  // mapColor maps the color component from [0, maxColorValue] to [0, 255].
  const mapColor = (colorComponent: number) => (colorComponent / maxColorValue) * 255

  if (maxColorValue < 256) {
    // @NOTE: Single-byte color components.
    for (let i = 0; i < width * height; ++i) {
      const r = next(parser)
      const g = next(parser)
      const b = next(parser)
      pixels[i * componentsPerPixel + 0] = mapColor(r)
      pixels[i * componentsPerPixel + 1] = mapColor(g)
      pixels[i * componentsPerPixel + 2] = mapColor(b)
      pixels[i * componentsPerPixel + 3] = 255
    }
  } else {
    // @NOTE: Two-byte color components.
    for (let i = 0; i < width * height; ++i) {
      const r = (next(parser) << 8) | next(parser)
      const g = (next(parser) << 8) | next(parser)
      const b = (next(parser) << 8) | next(parser)
      pixels[i * componentsPerPixel + 0] = mapColor(r)
      pixels[i * componentsPerPixel + 1] = mapColor(g)
      pixels[i * componentsPerPixel + 2] = mapColor(b)
      pixels[i * componentsPerPixel + 3] = 255
    }
  }

  return { pixels, width, height }
}

// [ppm](https://netpbm.sourceforge.net/doc/ppm.html)
// [ppm/pgm/pbm image files](http://paulbourke.net/dataformats/ppm/)
function parsePPM(buffer: Uint8Array): Image {
  if (!buffer || buffer.length < 2) {
    throw new Error('invalid ppm')
  }

  switch (buffer[1]) {
    case '3'.charCodeAt(0): {
      return parseP3(buffer)
    }
    case '6'.charCodeAt(0): {
      return parseP6(buffer)
    }
    default:
      throw new Error('invalid ppm')
  }
}

export { parsePPM }
export type { Image }
