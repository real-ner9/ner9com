/**
 * Follows the beat of whatever the player is playing, from the bass energy of the analyser.
 *
 * `position` is a continuous beat counter: its integer part counts beats and its fraction is the
 * phase within the current beat. It advances at the estimated tempo every frame, and each detected
 * kick nudges it back towards a whole beat, so animations stay smooth and still land on the beat.
 */
export class BeatClock {
  position = 0
  bpm = 120

  private time = 0
  private lastOnset = Number.NEGATIVE_INFINITY
  private energies: number[] = []
  private intervals: number[] = []

  /** Frames of energy history used as the "normal loudness" reference (~0.75 s at 60 fps). */
  private static readonly HISTORY = 45
  /**
   * A kick must stand out from recent loudness by this many standard deviations. Relative
   * (not a ratio) so it also works on loud, heavily compressed masters where the bass barely dips.
   */
  private static readonly SENSITIVITY = 1.5
  /** ...and by at least this much in absolute terms, so near-silence doesn't trigger. */
  private static readonly MIN_CONTRAST = 5
  /** Ignore onsets closer than this (caps detection at 200 BPM). */
  private static readonly MIN_GAP_S = 0.3
  private static readonly MIN_BPM = 80
  private static readonly MAX_BPM = 180

  /**
   * @param dt seconds since the previous frame
   * @param energy bass energy 0..255, or null when no analyser is available (tempo stays put)
   */
  update(dt: number, energy: number | null) {
    this.time += dt
    if (energy !== null) this.detect(energy)
    this.position += (dt * this.bpm) / 60
  }

  reset() {
    this.lastOnset = Number.NEGATIVE_INFINITY
    this.energies = []
    this.intervals = []
  }

  private detect(energy: number) {
    const history = this.energies
    const count = history.length
    const average = count ? history.reduce((sum, e) => sum + e, 0) / count : 0
    const deviation = count
      ? Math.sqrt(history.reduce((sum, e) => sum + (e - average) ** 2, 0) / count)
      : 0
    history.push(energy)
    if (history.length > BeatClock.HISTORY) history.shift()

    const contrast = energy - average
    const isOnset =
      count >= 10 &&
      energy > 30 &&
      contrast > BeatClock.MIN_CONTRAST &&
      contrast > deviation * BeatClock.SENSITIVITY &&
      this.time - this.lastOnset >= BeatClock.MIN_GAP_S
    if (!isOnset) return

    const interval = this.time - this.lastOnset
    this.lastOnset = this.time
    if (interval < 2) this.learnTempo(interval)

    // Phase correction: pull the clock halfway towards the nearest whole beat.
    const drift = this.position - Math.round(this.position)
    this.position -= drift * 0.5
  }

  private learnTempo(interval: number) {
    // Kicks often land on every other beat or on off-beats; fold into a sane tempo range.
    let seconds = interval
    while (seconds > 60 / BeatClock.MIN_BPM) seconds /= 2
    while (seconds < 60 / BeatClock.MAX_BPM) seconds *= 2

    this.intervals.push(seconds)
    if (this.intervals.length > 12) this.intervals.shift()

    const sorted = [...this.intervals].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    this.bpm += (60 / median - this.bpm) * 0.3
  }
}

/** Average bass level (roughly 40–260 Hz) from analyser byte frequency data. */
export function bassEnergy(frequencies: Uint8Array) {
  let sum = 0
  for (let bin = 1; bin <= 6; bin++) sum += frequencies[bin] ?? 0
  return sum / 6
}
