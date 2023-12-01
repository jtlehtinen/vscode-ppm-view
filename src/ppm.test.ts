import { describe, expect, it } from 'vitest'
import { TextEncoder } from 'util'
import { parsePPM } from './ppm'

// @TODO: More comprehensive tests...
// @TODO: Better error messages...

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

  it('succeeds when includes comments', () => {
    const testCases = [
      'P3 # comment\n2 2 255 0 1 2 3 4 5 0 1 2 3 4 5',
      'P3 2 # comment\n2 255 0 1 2 3 4 5 0 1 2 3 4 5',
      'P3 2 2 # comment\n255 0 1 2 3 4 5 0 1 2 3 4 5',
      'P3 2 2 255 # comment\n0 1 2 3 4 5 0 1 2 3 4 5',
      'P3 2 2 255 0 # comment\n1 2 3 4 5 0 1 2 3 4 5',
      'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 # comment\n5',
    ]

    for (const tc of testCases) {
      const buffer = encoder.encode(tc)
      const result = parsePPM(buffer)

      expect(result.width).toBe(2)
      expect(result.height).toBe(2)
      expect(result.pixels).toStrictEqual(
        new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 0, 1, 2, 255, 3, 4, 5, 255]),
      )
    }
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

describe('PBM P1 parser', () => {
  const encoder = new TextEncoder()

  it('succeeds when valid data', () => {
    const buffer = new Uint8Array([
      ...encoder.encode('P1 2 3 0 0 1 1 0 0'),
    ])
    const result = parsePPM(buffer)

    expect(result.width).toBe(2)
    expect(result.height).toBe(3)
    expect(result.pixels).toStrictEqual(
      new Uint8ClampedArray([
        0, 0, 0, 255,
        0, 0, 0, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
      ]),
    )
  })

  // @TODO: Test with comments
})

describe('PBM P4 parser', () => {
  const encoder = new TextEncoder()

  it('succeeds when valid data', () => {
    const buffer = new Uint8Array([
      ...encoder.encode('P4 5 3 '),
      ...[0xf8, 0, 0xf8], // 11111000 00000000 11111000
    ])
    const result = parsePPM(buffer)

    expect(result.width).toBe(5)
    expect(result.height).toBe(3)
    expect(result.pixels).toStrictEqual(
      new Uint8ClampedArray([
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,

        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,

        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
      ]),
    )
  })

  // @TODO: Test with comments
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

  it('succeeds when includes comments', () => {
    const testCases = [
      new Uint8Array([
        ...encoder.encode('P6 # comment\n2 2 255 '),
        ...[0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
      ]),
      new Uint8Array([
        ...encoder.encode('P6 2 # comment\n2 255 '),
        ...[0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
      ]),
      new Uint8Array([
        ...encoder.encode('P6 2 2 # comment\n255 '),
        ...[0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
      ]),
    ]

    for (const tc of testCases) {
      const result = parsePPM(tc);

      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.pixels).toStrictEqual(
        new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 0, 1, 2, 255, 3, 4, 5, 255]),
      )
    }
  })

  it('fails when includes misplaced comments', () => {
    const buffer = new Uint8Array([
      ...encoder.encode('P6 2 2 255# comment\n '),
      ...[0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
    ])
    expect(() => parsePPM(buffer)).toThrowError()
  })
})
