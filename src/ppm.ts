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
const CHAR_7 = 0x37
const CHAR_9 = 0x39
const CHAR_P = 0x50

// @TODO: Some of the formats support multiple images in a single file.
const ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE = 'max color value is out of allowed range (0, 65535]'
const ERROR_UNKNOWN_MAGIC_NUMBER = 'unknown file type identifying magic number'
const ERROR_INVALID_PPM = 'invalid ppm'
const ERROR_UNEXPECTED_HEADER_PAM = 'unexpected header token in PAM file'
const ERROR_UNSUPPORTED_TUPLE_TYPE = 'unsupported tuple type'
const ERROR_IMAGE_TOO_LARGE = 'image is too large'

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

const validateDimensions = (width: number, height: number): void => {
  if (width > 16384 || height > 16384) {
    throw new Error(ERROR_IMAGE_TOO_LARGE)
  }
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

// parseP1 parses a PBM P1 image from the given buffer.
// See https://netpbm.sourceforge.net/doc/pbm.html
const parseP1 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_1)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  validateDimensions(width, height)
  skipWhitespaceAndComments(parser)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  let outIdx = 0
  for (let i = 0; i < width * height; ++i) {
    const color = clamp(255 * expectNumber(parser), 0, 255)
    skipWhitespaceAndComments(parser)
    pixels[outIdx++] = color
    pixels[outIdx++] = color
    pixels[outIdx++] = color
    pixels[outIdx++] = 255
  }
  return { pixels, width, height, format: 'PBM P1' }
}

// parseP2 parses a PGM P2 image from the given buffer.
// https://netpbm.sourceforge.net/doc/pgm.html
const parseP2 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_2)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  validateDimensions(width, height)
  skipWhitespaceAndComments(parser)

  const maxGrayValue = expectNumber(parser)
  if (maxGrayValue <= 0 || maxGrayValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  expectOne(parser, isWhitespace)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  let outIdx = 0
  for (let i = 0; i < width * height; ++i) {
    const color = clamp(Math.floor((expectNumber(parser) / maxGrayValue) * 255), 0, 255)
    skipWhitespaceAndComments(parser)
    pixels[outIdx++] = color
    pixels[outIdx++] = color
    pixels[outIdx++] = color
    pixels[outIdx++] = 255
  }
  return { pixels, width, height, format: 'PGM P2' }
}

// parseP3 parses a PPM P3 image from the given buffer.
// See https://netpbm.sourceforge.net/doc/ppm.html
const parseP3 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_3)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  validateDimensions(width, height)
  skipWhitespaceAndComments(parser)

  const maxColorValue = expectNumber(parser)
  if (maxColorValue <= 0 || maxColorValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  skipWhitespaceAndComments(parser)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const readColor = (parser: Parser): number => {
    const color = expectNumber(parser)
    skipWhitespaceAndComments(parser)
    return clamp(Math.floor((color / maxColorValue) * 255), 0, 255)
  }

  let outIdx = 0
  for (let i = 0; i < width * height; ++i) {
    const r = readColor(parser)
    const g = readColor(parser)
    const b = readColor(parser)
    pixels[outIdx++] = r
    pixels[outIdx++] = g
    pixels[outIdx++] = b
    pixels[outIdx++] = 255
  }
  return { pixels, width, height, format: 'PPM P3' }
}

// parseP4 parses a PBM P4 image from the given buffer.
// See https://netpbm.sourceforge.net/doc/pbm.html
const parseP4 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_4)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  validateDimensions(width, height)
  expectOne(parser, isWhitespace)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)
  const row =  new Uint8ClampedArray(Math.ceil(width / 8))

  let outIdx = 0
  for (let y = 0; y < height; ++y) {
    // @NOTE: Read a whole row from the buffer.
    for (let i = 0; i < row.length; ++i) {
      row[i] = next(parser)
    }

    for (let x = 0; x < width; ++x) {
      const byteIndex = Math.floor(x / 8)
      const bitIndex = x % 8
      const bit = (row[byteIndex] >> (7 - bitIndex)) & 1
      const color = clamp(bit * 255, 0, 255)

      pixels[outIdx++] = color
      pixels[outIdx++] = color
      pixels[outIdx++] = color
      pixels[outIdx++] = 255
    }
  }
  return { pixels, width, height, format: 'PBM P4' }
}

// parseP5 parses a PGM P5 image from the given buffer.
// See https://netpbm.sourceforge.net/doc/pgm.html
const parseP5 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_5)

  skipWhitespaceAndComments(parser)
  const width = expectNumber(parser)
  skipWhitespaceAndComments(parser)
  const height = expectNumber(parser)
  validateDimensions(width, height)
  skipWhitespaceAndComments(parser)

  const maxGrayValue = expectNumber(parser)
  if (maxGrayValue <= 0 || maxGrayValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  expectOne(parser, isWhitespace)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const mapColor = (c: number) =>
    clamp(Math.floor((c / maxGrayValue) * 255), 0, 255)

  const readColor =
    (maxGrayValue < 256)
    ? (parser: Parser): number => mapColor(next(parser))
    : (parser: Parser): number => mapColor((next(parser) << 8) | next(parser))

  let outIdx = 0
  for (let i = 0; i < width * height; ++i) {
    const color = readColor(parser)
    pixels[outIdx++] = color
    pixels[outIdx++] = color
    pixels[outIdx++] = color
    pixels[outIdx++] = 255
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
  validateDimensions(width, height)
  skipWhitespaceAndComments(parser)

  const maxColorValue = expectNumber(parser)
  if (maxColorValue < 0 || maxColorValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  expectOne(parser, isWhitespace)

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const mapColor = (c: number) =>
    Math.floor((c / maxColorValue) * 255)

  const readColor =
    (maxColorValue < 256)
    ? (parser: Parser): number => mapColor(next(parser))
    : (parser: Parser): number => mapColor((next(parser) << 8) | next(parser))

  let outIdx = 0
  for (let i = 0; i < width * height; ++i) {
    pixels[outIdx++] = readColor(parser)
    pixels[outIdx++] = readColor(parser)
    pixels[outIdx++] = readColor(parser)
    pixels[outIdx++] = 255
  }
  return { pixels, width, height, format: 'PPM P6' }
}

// parseP7 parses a PAM P7 image from the given buffer.
// See https://netpbm.sourceforge.net/doc/pam.html
const parseP7 = (buffer: Uint8Array): Image => {
  const parser: Parser = { buffer: buffer, idx: 0 }
  expect(parser, CHAR_P)
  expect(parser, CHAR_7)

  const readHeaderToken = (parser: Parser): string => {
    let token = ''
    while (!isAtEnd(parser) && !isWhitespace(peek(parser))) {
      token += String.fromCharCode(next(parser))
    }
    return token
  }

  const readTupleType = (parser: Parser): string => {
    let tupleType = ''
    while (!isAtEnd(parser) && peek(parser) !== CHAR_NEWLINE) {
      tupleType += String.fromCharCode(next(parser))
    }
    return tupleType.trim()
  }

  let width = 0
  let height = 0
  let depth = 0
  let maxValue = 0
  let tupleType = ''
  let token = ''

  skipWhitespaceAndComments(parser)
  while ((token = readHeaderToken(parser)) !== 'ENDHDR') {
    skipWhitespaceAndComments(parser)
    switch (token) {
      case 'WIDTH':
        width = expectNumber(parser)
        break
      case 'HEIGHT':
        height = expectNumber(parser)
        break
      case 'DEPTH':
        depth = expectNumber(parser)
        break
      case 'MAXVAL':
        maxValue = expectNumber(parser)
        break
      case 'TUPLTYPE':
        tupleType = readTupleType(parser)
        break
      default:
        throw new Error(ERROR_UNEXPECTED_HEADER_PAM)
    }
    skipWhitespaceAndComments(parser)
  }
  skipWhitespaceAndComments(parser)

  if (maxValue <= 0 || maxValue >= 65536) {
    throw new Error(ERROR_MAX_COLOR_VALUE_OUT_OF_RANGE)
  }

  const componentsPerPixel = 4
  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  const mapColor = (colorComponent: number) =>
    clamp(Math.floor((colorComponent / maxValue) * 255), 0, 255)

  const readColor =
    (maxValue < 256)
    ? (parser: Parser): number => mapColor(next(parser))
    : (parser: Parser): number => mapColor((next(parser) << 8) | next(parser))

  if (tupleType === 'BLACKANDWHITE' || tupleType === 'GRAYSCALE') {
    let outIdx = 0
    for (let i = 0; i < width * height; ++i) {
      const color = readColor(parser)
      pixels[outIdx++] = color
      pixels[outIdx++] = color
      pixels[outIdx++] = color
      pixels[outIdx++] = 255
    }
  } else if (tupleType === 'BLACKANDWHITE_ALPHA' || tupleType === 'GRAYSCALE_ALPHA') {
    let outIdx = 0
    for (let i = 0; i < width * height; ++i) {
      const color = readColor(parser)
      const alpha = readColor(parser)
      pixels[outIdx++] = color
      pixels[outIdx++] = color
      pixels[outIdx++] = color
      pixels[outIdx++] = alpha
    }
  } else if (tupleType === 'RGB') {
    let outIdx = 0
    for (let i = 0; i < width * height; ++i) {
      const r = readColor(parser)
      const g = readColor(parser)
      const b = readColor(parser)
      pixels[outIdx++] = r
      pixels[outIdx++] = g
      pixels[outIdx++] = b
      pixels[outIdx++] = 255
    }
  } else if (tupleType === 'RGB_ALPHA') {
    let outIdx = 0
    for (let i = 0; i < width * height; ++i) {
      const r = readColor(parser)
      const g = readColor(parser)
      const b = readColor(parser)
      const a = readColor(parser)
      pixels[outIdx++] = r
      pixels[outIdx++] = g
      pixels[outIdx++] = b
      pixels[outIdx++] = a
    }
  } else {
    throw new Error(ERROR_UNSUPPORTED_TUPLE_TYPE)
  }

  return { pixels, width, height, format: 'PAM P7' }
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
    case CHAR_7: return parseP7(buffer)
    default:
      throw new Error(ERROR_UNKNOWN_MAGIC_NUMBER)
  }
}

export { parsePPM }
export type { Image }
