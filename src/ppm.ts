// [ppm](https://netpbm.sourceforge.net/doc/ppm.html)
// [ppm/pgm/pbm image files](http://paulbourke.net/dataformats/ppm/)

const CHAR_0 = 0x30
const CHAR_9 = 0x39
const CHAR_SPACE = 0x20
const CHAR_NEWLINE = 0xa
const CHAR_CARRIAGE_RETURN = 0xd
const CHAR_TAB = 0x9
const CHAR_FORM_FEED = 0xc
const CHAR_VERTICAL_TAB = 0xb
const CHAR_HASH = 0x23
const CHAR_3 = 0x33
const CHAR_6 = 0x36
const CHAR_P = 0x50

const ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE = 'max color value is out of allowed range [0, 65536)'
const ERROR_UNKNOWN_MAGIC_NUMBER = 'unknown file type identifying magic number'
const ERROR_INVALID_PPM = 'invalid ppm'

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
const isDigit = (c: number): boolean => c >= CHAR_0 && c <= CHAR_9
const isWhitespace = (c: number): boolean =>
  c === CHAR_SPACE ||
  c === CHAR_NEWLINE ||
  c === CHAR_CARRIAGE_RETURN ||
  c === CHAR_TAB ||
  c === CHAR_FORM_FEED ||
  c === CHAR_VERTICAL_TAB

// returns true if skipped something false otherwise.
function skipWhile(parser: Parser, predicate: (c: number) => boolean): boolean {
  const before = parser.idx
  while (!isAtEnd(parser) && predicate(peek(parser))) {
    next(parser)
  }
  return parser.idx !== before
}

// returns true if skipped something false otherwise.
function skipComment(parser: Parser): boolean {
  const before = parser.idx
  if (peek(parser) === CHAR_HASH) {
    skipWhile(parser, (c) => c !== CHAR_NEWLINE)
  }
  return parser.idx !== before
}

function skipWhitespaceAndComments(parser: Parser): void {
  for (;;) {
    if (!skipWhile(parser, isWhitespace) && !skipComment(parser)) {
      break
    }
  }
}

function expectOne(parser: Parser, predicate: (c: number) => boolean): void {
  if (isAtEnd(parser) || !predicate(peek(parser))) {
    throw new Error(ERROR_INVALID_PPM)
  }
  next(parser)
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
    result = result * 10 + (next(parser) - CHAR_0)
  }

  if (begin === parser.idx) {
    throw new Error('invalid ppm file')
  }

  return result
}

function validateMaxColorValue(maxColorValue: number): void {
  if (maxColorValue < 0 || maxColorValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }
}

function parseP3(buffer: Uint8Array): Image {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_3)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const maxColorValue = expectNumber(parser)
  validateMaxColorValue(maxColorValue)
  skipWhitespaceAndComments(parser)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  // mapColor maps the color component from [0, maxColorValue] to [0, 255].
  const mapColor = (colorComponent: number) => (colorComponent / maxColorValue) * 255

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

  return { pixels, width, height }
}

function parseP6(buffer: Uint8Array): Image {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_6)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  skipWhitespaceAndComments(parser)

  // @IMPORTANT: Comments must occur before the last header field.
  const maxColorValue = expectNumber(parser)
  validateMaxColorValue(maxColorValue)

  expectOne(parser, isWhitespace)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  // mapColor maps the color component from [0, maxColorValue] to [0, 255].
  const mapColor = (colorComponent: number) => (colorComponent / maxColorValue) * 255

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

  return { pixels, width, height }
}

function parsePPM(buffer: Uint8Array): Image {
  const p3 = (buffer[0] === CHAR_P) && (buffer[1] === CHAR_3) // 'P3'
  const p6 = (buffer[0] === CHAR_P) && (buffer[1] === CHAR_6) // 'P6'

  if (!p3 && !p6) {
    throw new Error(ERROR_UNKNOWN_MAGIC_NUMBER)
  }

  return p3 ? parseP3(buffer) : parseP6(buffer)
}

export { parsePPM }
export type { Image }
