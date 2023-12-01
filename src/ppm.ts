// [ppm](https://netpbm.sourceforge.net/doc/ppm.html)
// [pbm](https://netpbm.sourceforge.net/doc/pbm.html)
// [ppm/pgm/pbm image files](http://paulbourke.net/dataformats/ppm/)

const CHAR_SPACE = 0x20
const CHAR_NEWLINE = 0xa
const CHAR_CARRIAGE_RETURN = 0xd
const CHAR_TAB = 0x9
const CHAR_FORM_FEED = 0xc
const CHAR_VERTICAL_TAB = 0xb
const CHAR_HASH = 0x23
const CHAR_0 = 0x30
const CHAR_1 = 0x31
const CHAR_2 = 0x32
const CHAR_3 = 0x33
const CHAR_4 = 0x34
const CHAR_5 = 0x35
const CHAR_6 = 0x36
const CHAR_9 = 0x39
const CHAR_P = 0x50

const ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE = 'max color value is out of allowed range [0, 65536)'
const ERROR_UNKNOWN_MAGIC_NUMBER = 'unknown file type identifying magic number'
const ERROR_INVALID_PPM = 'invalid ppm'

interface Image {
  pixels: Uint8ClampedArray
  width: number
  height: number
  format: string
}

interface Parser {
  buffer: Uint8Array
  idx: number
}

const clamp = (x: number, min: number, max: number): number => Math.min(Math.max(x, min), max)

const peek = (parser: Parser): number => parser.buffer[parser.idx]
const next = (parser: Parser): number => parser.buffer[parser.idx++]
const isAtEnd = (parser: Parser): boolean => parser.idx >= parser.buffer.length
const isDigit = (c: number): boolean => c >= CHAR_0 && c <= CHAR_9
const isWhitespace = (c: number): boolean =>
  c === CHAR_SPACE ||
  c === CHAR_NEWLINE ||
  c === CHAR_CARRIAGE_RETURN ||
  c === CHAR_TAB ||
  c === CHAR_FORM_FEED ||
  c === CHAR_VERTICAL_TAB

// returns true if skipped something; false otherwise.
const skipWhile = (parser: Parser, predicate: (c: number) => boolean): boolean => {
  const before = parser.idx
  while (!isAtEnd(parser) && predicate(peek(parser))) {
    next(parser)
  }
  return parser.idx !== before
}

// returns true if skipped something; false otherwise.
const skipComment = (parser: Parser): boolean => {
  const before = parser.idx
  if (peek(parser) === CHAR_HASH) {
    skipWhile(parser, (c) => c !== CHAR_NEWLINE)
  }
  return parser.idx !== before
}

const skipWhitespaceAndComments = (parser: Parser): void => {
  for (;;) {
    if (!skipWhile(parser, isWhitespace) && !skipComment(parser)) {
      break
    }
  }
}

const expectOne = (parser: Parser, predicate: (c: number) => boolean): void => {
  if (isAtEnd(parser) || !predicate(peek(parser))) {
    throw new Error(ERROR_INVALID_PPM)
  }
  next(parser)
}

const expect = (parser: Parser, c: number): void => {
  if (isAtEnd(parser) || next(parser) !== c) {
    throw new Error('invalid ppm file')
  }
}

const expectNumber = (parser: Parser): number => {
  const begin = parser.idx

  let result = 0
  while (!isAtEnd(parser) && isDigit(peek(parser))) {
    result = result * 10 + (next(parser) - CHAR_0)
  }

  if (begin === parser.idx) {
    throw new Error('invalid ppm file')
  }

  return result
}

const parseP1 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_1)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser) // @NOTE: strict => single whitespace

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  for (let i = 0; i < width * height; ++i) {
    const color = clamp(255 * expectNumber(parser), 0, 255)
    skipWhitespaceAndComments(parser)
    pixels[i * componentsPerPixel + 0] = color
    pixels[i * componentsPerPixel + 1] = color
    pixels[i * componentsPerPixel + 2] = color
    pixels[i * componentsPerPixel + 3] = 255
  }
  return { pixels, width, height, format: 'PBM P1' }
}

const parseP2 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_2)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const maxGrayValue = expectNumber(parser)
  expectOne(parser, isWhitespace)

  if (maxGrayValue <= 0 || maxGrayValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  for (let i = 0; i < width * height; ++i) {
    const color = clamp(Math.floor((expectNumber(parser) / maxGrayValue) * 255), 0, 255)
    skipWhitespaceAndComments(parser)
    pixels[i * componentsPerPixel + 0] = color
    pixels[i * componentsPerPixel + 1] = color
    pixels[i * componentsPerPixel + 2] = color
    pixels[i * componentsPerPixel + 3] = 255
  }
  return { pixels, width, height, format: 'PGM P2' }
}

const parseP3 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_3)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const maxColorValue = expectNumber(parser)
  skipWhitespaceAndComments(parser)

  if (maxColorValue < 0 || maxColorValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const mapColor = (c: number) =>
    clamp(Math.floor((c / maxColorValue) * 255), 0, 255)

  for (let i = 0; i < width * height; ++i) {
    const r = mapColor(expectNumber(parser))
    skipWhitespaceAndComments(parser)
    const g = mapColor(expectNumber(parser))
    skipWhitespaceAndComments(parser)
    const b = mapColor(expectNumber(parser))
    skipWhitespaceAndComments(parser)

    pixels[i * componentsPerPixel + 0] = r
    pixels[i * componentsPerPixel + 1] = g
    pixels[i * componentsPerPixel + 2] = b
    pixels[i * componentsPerPixel + 3] = 255
  }
  return { pixels, width, height, format: 'PPM P3' }
}

const parseP4 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_4)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  expectOne(parser, isWhitespace)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const mapColor = (colorComponent: number) =>
    clamp(colorComponent * 255, 0, 255)

  const row =  new Uint8ClampedArray(Math.ceil(width / 8))
  for (let y = 0; y < height; ++y) {
    for (let i = 0; i < row.length; ++i) {
      row[i] = next(parser)
    }

    for (let x = 0; x < width; ++x) {
      const byteIndex = Math.floor(x / 8)
      const bitIndex = x % 8
      const bit = (row[byteIndex] >> (7 - bitIndex)) & 1
      const color = mapColor(bit)

      pixels[y * width * componentsPerPixel + x * componentsPerPixel + 0] = color
      pixels[y * width * componentsPerPixel + x * componentsPerPixel + 1] = color
      pixels[y * width * componentsPerPixel + x * componentsPerPixel + 2] = color
      pixels[y * width * componentsPerPixel + x * componentsPerPixel + 3] = 255
    }
  }
  return { pixels, width, height, format: 'PBM P4' }
}

const parseP5 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_5)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const maxGrayValue = expectNumber(parser)
  expectOne(parser, isWhitespace)

  if (maxGrayValue <= 0 || maxGrayValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const mapColor = (colorComponent: number) =>
    clamp(Math.floor((colorComponent / maxGrayValue) * 255), 0, 255)

  const nextColorComponent =
    (maxGrayValue < 256)
    ? (parser: Parser): number => mapColor(next(parser))
    : (parser: Parser): number => mapColor((next(parser) << 8) | next(parser))

  for (let i = 0; i < width * height; ++i) {
    const color = nextColorComponent(parser)
    pixels[i * componentsPerPixel + 0] = color
    pixels[i * componentsPerPixel + 1] = color
    pixels[i * componentsPerPixel + 2] = color
    pixels[i * componentsPerPixel + 3] = 255
  }
  return { pixels, width, height, format: 'PGM P5' }
}

const parseP6 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_6)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const maxColorValue = expectNumber(parser)
  expectOne(parser, isWhitespace)

  if (maxColorValue < 0 || maxColorValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  // mapColor maps the color component from [0, maxColorValue] to [0, 255].
  const mapColor = (colorComponent: number) => Math.floor((colorComponent / maxColorValue) * 255)

  const nextColorComponent =
    (maxColorValue < 256)
    ? (parser: Parser): number => mapColor(next(parser))
    : (parser: Parser): number => mapColor((next(parser) << 8) | next(parser))

  for (let i = 0; i < width * height; ++i) {
    pixels[i * componentsPerPixel + 0] = nextColorComponent(parser)
    pixels[i * componentsPerPixel + 1] = nextColorComponent(parser)
    pixels[i * componentsPerPixel + 2] = nextColorComponent(parser)
    pixels[i * componentsPerPixel + 3] = 255
  }

  return { pixels, width, height, format: 'PPM P3' }
}

const parsePPM = (buffer: Uint8Array): Image => {
  if (buffer[0] !== CHAR_P) {
    throw new Error(ERROR_UNKNOWN_MAGIC_NUMBER)
  }

  switch (buffer[1]) {
    case CHAR_1: return parseP1(buffer)
    case CHAR_2: return parseP2(buffer)
    case CHAR_3: return parseP3(buffer)
    case CHAR_4: return parseP4(buffer)
    case CHAR_5: return parseP5(buffer)
    case CHAR_6: return parseP6(buffer)
    default:
      throw new Error(ERROR_UNKNOWN_MAGIC_NUMBER)
  }
}

export { parsePPM }
export type { Image }
