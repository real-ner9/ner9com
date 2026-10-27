import type { MonthRange } from '@/types/content'

/** "2026-01" → months since year 0, so ranges can be compared and subtracted. */
function monthIndex(month: string) {
  const [year, value] = month.split('-').map(Number)
  return year * 12 + (value - 1)
}

/** The current month, "YYYY-MM": where a job without an end date runs to. */
function thisMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Length of a range in months, both ends included (Jan–Sep = 9), like LinkedIn counts it. */
export function monthsIn(range: MonthRange) {
  return monthIndex(range.to ?? thisMonth()) - monthIndex(range.from) + 1
}

/** Total months covered by the ranges: overlapping jobs count once, gaps don't count. */
export function totalMonths(ranges: MonthRange[]) {
  const sorted = ranges
    .map((range) => [monthIndex(range.from), monthIndex(range.to ?? thisMonth())])
    .sort((a, b) => a[0] - b[0])
  let total = 0
  let covered = -Infinity
  for (const [from, to] of sorted) {
    const start = Math.max(from, covered + 1)
    if (to >= start) total += to - start + 1
    covered = Math.max(covered, to)
  }
  return total
}

/** Splits months into whole years and the remaining months. */
export function splitMonths(months: number) {
  return { years: Math.floor(months / 12), months: months % 12 }
}
