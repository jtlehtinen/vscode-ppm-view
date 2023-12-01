import { describe, expect, it } from 'vitest'
import { parsePPM } from './ppm'

describe('PPM P3 parser', () => {
  it('succeeds when valid data', () => {
    const result = parsePPM('P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5')
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(result.pixels).toStrictEqual(
      new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 0, 1, 2, 255, 3, 4, 5, 255])
    )
  })

  it('fails when not enough data', () => {
    const validPPM = 'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5';
    for (let i = 0; i < validPPM.length - 1; ++i) {
      const invalidPPM = validPPM.slice(0, i)
      expect(() => parsePPM(invalidPPM)).toThrowError()
    }
  })

  it('fails when illegal characters', () => {
    const validPPM = 'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5'
    for (let i = 0; i < validPPM.length; ++i) {
      const invalidPPM = `${validPPM.slice(0, i)}a${validPPM.slice(i)}`
      expect(() => parsePPM(invalidPPM)).toThrowError()
    }
  })
})

describe('PPM P6 parser', () => {
  it('dummy', () => { })
})
