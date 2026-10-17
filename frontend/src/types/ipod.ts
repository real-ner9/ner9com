import type { InjectionKey } from 'vue'

/** Screens of the iPod UI. The screen keeps them in a stack, like the real iPod menus. */
export type IpodView =
  | { name: 'menu' }
  | { name: 'coverflow' }
  | { name: 'albums' }
  | { name: 'album'; albumId: string }
  | { name: 'nowPlaying' }

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
