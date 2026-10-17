import { describe, expect, it } from 'vitest'
import { monthsIn, splitMonths, totalMonths } from '../duration'

describe('duration', () => {
  it('counts both end months', () => {
    expect(monthsIn({ from: '2026-01', to: '2026-09' })).toBe(9)
    expect(monthsIn({ from: '2021-04', to: '2025-08' })).toBe(53)
  })

  it('counts overlapping jobs once and skips gaps', () => {
    const ranges = [
      { from: '2026-01', to: '2026-09' },
      { from: '2025-09', to: '2026-01' },
      { from: '2021-04', to: '2025-08' },
      { from: '2020-03', to: '2021-02' },
      { from: '2018-08', to: '2020-02' },
    ]
    // Aug 2018 – Feb 2021 (31) + Apr 2021 – Sep 2026 (66); March 2021 was a gap.
    expect(totalMonths(ranges)).toBe(97)
  })

  it('splits into years and months', () => {
    expect(splitMonths(97)).toEqual({ years: 8, months: 1 })
    expect(splitMonths(12)).toEqual({ years: 1, months: 0 })
  })
})
