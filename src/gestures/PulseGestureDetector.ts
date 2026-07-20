import type { Handedness, TrackedHand } from '../tracking/types.ts'
import type { GestureName, HandGestureDetector } from './types.ts'

/**
 * Wraps a pose predicate and reports active only on its falling edge
 * (true -> false transition), for gestures that represent a momentary event
 * — e.g. Release, the instant a Grab pose ends — rather than a held pose.
 */
export class PulseGestureDetector implements HandGestureDetector {
  readonly name: GestureName
  private readonly predicate: (hand: TrackedHand) => boolean
  private readonly wasActive = new Map<Handedness, boolean>()

  constructor(name: GestureName, predicate: (hand: TrackedHand) => boolean) {
    this.name = name
    this.predicate = predicate
  }

  isActive(hand: TrackedHand): boolean {
    const previous = this.wasActive.get(hand.handedness) ?? false
    const current = this.predicate(hand)
    this.wasActive.set(hand.handedness, current)
    return previous && !current
  }
}
