import flChanUrl from '@/assets/dancers/fl-chan.webp'
import flChanSmallUrl from '@/assets/dancers/fl-chan-small.webp'

/**
 * A dancer sprite sheet in FL Studio's Fruity Dance format: 8 frames per row, one row per move,
 * the last row ("Held") played while the dancer is dragged. Any Fruity Dance skin can be dropped
 * in by converting its PNG to webp and listing its row names here.
 */
export interface DancerSprite {
  /** Full-resolution sheet, for large dancers. */
  url: string
  /** Half-resolution sheet, for small dancers on phones (less memory, less to download). */
  smallUrl: string
  columns: number
  /** Cell size in the full sheet, px. */
  cellWidth: number
  cellHeight: number
  rows: string[]
}

export const FL_CHAN: DancerSprite = {
  url: flChanUrl,
  smallUrl: flChanSmallUrl,
  columns: 8,
  cellWidth: 220,
  cellHeight: 256,
  // Same order as Dance.txt in FL Studio's Fruity Dance artwork folder.
  rows: [
    'Waiting',
    'Stepping',
    'Jumping',
    'Zombie',
    'Waving',
    'Hula',
    'Windmill',
    'Zitabata',
    'Dervish',
    'Held',
  ],
}

export const IDLE_ROW = 'Waiting'
export const HELD_ROW = 'Held'
/** Moves picked from while music plays. */
export const DANCE_ROWS = FL_CHAN.rows.filter((row) => row !== IDLE_ROW && row !== HELD_ROW)
