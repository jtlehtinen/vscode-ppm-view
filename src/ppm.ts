interface Image {
  pixels: Uint8ClampedArray
  width: number
  height: number
}

// [ppm](https://netpbm.sourceforge.net/doc/ppm.html)
// [ppm/pgm/pbm image files](http://paulbourke.net/dataformats/ppm/)
function parsePPM(ppm: string): Image {
  // @TODO: raw ppm
  // @TODO: comments
  // @TODO: tests
  // @TODO: P3
  // @TODO: P6
  interface Parser { ppm: string, idx: number }

  const parser: Parser = { ppm: ppm, idx: 0 }

  const peek = (parser: Parser): string => parser.ppm.charAt(parser.idx)
  const next = (parser: Parser): string => parser.ppm.charAt(parser.idx++)
  const isAtEnd = (parser: Parser): boolean => (parser.idx >= parser.ppm.length)
  const isWhitespace = (c: string): boolean => (c == ' ' || c == '\n' || c == '\r' || c == '\t')
  const isDigit = (c: string): boolean => c >= '0' && c <= '9'

  const skipWhitespace = (parser: Parser): void => {
    while (!isAtEnd(parser) && isWhitespace(peek(parser))) {
      next(parser)
    }
  }

  const accept = (parser: Parser, prefix: string): boolean => {
    const result = (parser.ppm.startsWith(prefix, parser.idx))
    if (result) parser.idx += prefix.length

    return result
  }

  const expectNumber = (parser: Parser): number => {
    const begin = parser.idx

    let result = 0
    while (!isAtEnd(parser) && isDigit(peek(parser))) {
      result = result * 10 + Number(next(parser))
    }
    if (begin === parser.idx) throw new Error('invalid ppm file')

    return result
  }

  skipWhitespace(parser)

  if (!accept(parser, 'P3')) throw new Error('invalid ppm file')

  skipWhitespace(parser)
  const width = expectNumber(parser)
  skipWhitespace(parser)
  const height = expectNumber(parser)
  skipWhitespace(parser)
  const maxColorValue = expectNumber(parser)
  skipWhitespace(parser)

  const componentsPerPixel = 4

  const pixels = new Uint8ClampedArray(width * height * componentsPerPixel)

  for (let i = 0; i < width * height; ++i) {
    const r = expectNumber(parser)
    skipWhitespace(parser)
    const g = expectNumber(parser)
    skipWhitespace(parser)
    const b = expectNumber(parser)
    skipWhitespace(parser)

    // @TODO: apply conversion from [0, maxColorValue] to [0, 255]
    pixels[i * componentsPerPixel + 0] = r
    pixels[i * componentsPerPixel + 1] = g
    pixels[i * componentsPerPixel + 2] = b
    pixels[i * componentsPerPixel + 3] = 255
  }

  return { pixels, width, height }
}

export { parsePPM }
export type { Image }