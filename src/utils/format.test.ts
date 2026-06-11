import { describe, it, expect } from 'vitest'
import { formatVND } from './format'

describe('formatVND', () => {
  it('formats a number as Vietnamese đồng with dot thousands separators', () => {
    // The space before the ₫ symbol is the non-breaking space Intl inserts.
    expect(formatVND(25000000)).toBe('25.000.000 ₫')
  })

  it('formats zero', () => {
    expect(formatVND(0)).toBe('0 ₫')
  })

  it('rounds to whole đồng (no fraction digits)', () => {
    expect(formatVND(1234.56)).toBe('1.235 ₫')
  })

  it('formats negative amounts', () => {
    expect(formatVND(-5000)).toBe('-5.000 ₫')
  })
})
