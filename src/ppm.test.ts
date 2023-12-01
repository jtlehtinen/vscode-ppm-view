import { describe, expect, it } from 'vitest'
import { TextEncoder } from 'util'
import { parsePPM } from './ppm'

// @TODO: More comprehensive tests...

describe('PPM P3 parser', () => {
  const encoder = new TextEncoder()

  it('succeeds when valid data', () => {
    const buffer = encoder.encode('P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5')
    const result = parsePPM(buffer)

    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(result.pixels).toStrictEqual(
      new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 0, 1, 2, 255, 3, 4, 5, 255])
    )
  })

  it('succeeds when valid data includes comments', () => {

  })

  it('fails when not enough data', () => {
    const validPPM = 'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5';
    for (let i = 0; i < validPPM.length - 1; ++i) {
      const invalidPPM = validPPM.slice(0, i)
      const buffer = encoder.encode(invalidPPM)
      expect(() => parsePPM(buffer)).toThrowError()
    }
  })

  it('fails when illegal characters', () => {
    const validPPM = 'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5'
    for (let i = 0; i < validPPM.length; ++i) {
      const invalidPPM = `${validPPM.slice(0, i)}a${validPPM.slice(i)}`
      const buffer = encoder.encode(invalidPPM)
      expect(() => parsePPM(buffer)).toThrowError()
    }
  })
})

describe('PPM P6 parser', () => {
  const encoder = new TextEncoder()

  it('succeeds when valid data', () => {
    const buffer = new Uint8Array([
      ...encoder.encode('P6 2 2 255 '),
      ...[0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
    ])
    const result = parsePPM(buffer)

    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(result.pixels).toStrictEqual(
      new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 0, 1, 2, 255, 3, 4, 5, 255]),
    )
  })
})
