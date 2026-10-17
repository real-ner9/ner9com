import { describe, expect, it } from 'vitest'
import { BeatClock } from '../beatClock'

const FPS = 60

/** Feeds the clock a synthetic track: loud kicks at `bpm`, quiet in between. */
function run(clock: BeatClock, bpm: number, seconds: number, kickEvery = 1) {
  const framesPerKick = Math.round((60 / bpm) * FPS * kickEvery)
  for (let frame = 0; frame < seconds * FPS; frame++) {
    const isKick = frame % framesPerKick < 2
    clock.update(1 / FPS, isKick ? 210 : 40)
  }
}

describe('BeatClock', () => {
  it.each([90, 128, 150])('locks onto %i BPM', (bpm) => {
    const clock = new BeatClock()
    run(clock, bpm, 12)
    expect(clock.bpm).toBeGreaterThan(bpm * 0.95)
    expect(clock.bpm).toBeLessThan(bpm * 1.05)
  })

  it('finds the beat in a loud, compressed master', () => {
    // Bass hovers around 220 with noise; kicks only reach ~242 (what a real track produced).
    const clock = new BeatClock()
    const bpm = 130
    const framesPerKick = Math.round((60 / bpm) * FPS)
    let seed = 1
    const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 10
    for (let frame = 0; frame < 15 * FPS; frame++) {
      const isKick = frame % framesPerKick < 2
      clock.update(1 / FPS, isKick ? 242 : 220 + noise())
    }
    expect(clock.bpm).toBeGreaterThan(bpm * 0.95)
    expect(clock.bpm).toBeLessThan(bpm * 1.05)
  })

  it('folds kicks on every other beat into the real tempo range', () => {
    const clock = new BeatClock()
    // 60 kicks per minute is below the range, so it should read as 120 BPM.
    run(clock, 120, 16, 2)
    expect(clock.bpm).toBeGreaterThan(114)
    expect(clock.bpm).toBeLessThan(126)
  })

  it('lands kicks near whole beats', () => {
    const clock = new BeatClock()
    const framesPerKick = Math.round((60 / 128) * FPS)
    const offsets: number[] = []
    for (let frame = 0; frame < 12 * FPS; frame++) {
      const isKick = frame % framesPerKick < 2
      clock.update(1 / FPS, isKick ? 210 : 40)
      // Measure on the first kick frame once the tempo has settled.
      if (frame > 6 * FPS && frame % framesPerKick === 0) {
        offsets.push(Math.abs(clock.position - Math.round(clock.position)))
      }
    }
    expect(Math.max(...offsets)).toBeLessThan(0.2)
  })

  it('keeps its tempo without an analyser', () => {
    const clock = new BeatClock()
    for (let i = 0; i < FPS * 2; i++) clock.update(1 / FPS, null)
    expect(clock.bpm).toBe(120)
    expect(clock.position).toBeCloseTo(4, 1)
  })
})
