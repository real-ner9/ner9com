/**
 * Keeps receiving a pointer's events after it leaves the element (drags, wheel rotation).
 * Throws for pointers that are already gone (e.g. released mid-gesture), which is harmless.
 */
export function capture(element: Element, pointerId: number) {
  try {
    element.setPointerCapture(pointerId)
  } catch {
    // Pointer no longer active.
  }
}
