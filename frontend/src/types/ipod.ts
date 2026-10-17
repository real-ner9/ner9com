import type { InjectionKey } from 'vue'

/** Screens of the iPod UI. The screen keeps them in a stack, like the real iPod menus. */
export type IpodView =
  | { name: 'menu' }
  | { name: 'music' }
  | { name: 'coverflow' }
  | { name: 'artists' }
  /** All albums, or one artist's when `artist` is set. */
  | { name: 'albums'; artist?: string }
  | { name: 'album'; albumId: string }
  | { name: 'songs' }
  | { name: 'nowPlaying' }
  | { name: 'dance' }
  /** Move picker for one dancer (0-based). */
  | { name: 'danceMoves'; dancer: number }

/** What every view exposes so the click wheel can drive it. */
export interface IpodViewHandle {
  /** Wheel rotation: +1 per clockwise step, -1 per counter-clockwise step. */
  scroll(delta: number): void
  /** Center button. */
  select(): void
  /** Optional exit animation, awaited before the view is popped. */
  beforeLeave?(): Promise<void>
}

export interface IpodNavigator {
  push(view: IpodView): void
  /** Resolves to false when already at the root menu. */
  back(): Promise<boolean>
}

export const IPOD_NAVIGATOR: InjectionKey<IpodNavigator> = Symbol('ipod-navigator')

/** Highlighted row per menu level, so going back lands on the row you left, like the iPod. */
export interface IpodListMemory {
  /** Stack depth of the view being set up. */
  depth(): number
  get(depth: number): number | undefined
  set(depth: number, index: number): void
}

export const IPOD_LIST_MEMORY: InjectionKey<IpodListMemory> = Symbol('ipod-list-memory')

/** A row of IpodList. */
export interface IpodListItem {
  id: string
  label: string
  sublabel?: string | null
  image?: string | null
  /** Right-aligned text, e.g. a duration. */
  trailing?: string | null
  chevron?: boolean
  /** Marks the playing track with a speaker icon. */
  playing?: boolean
}
