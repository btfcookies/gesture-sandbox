import type { TrackedHand } from '../tracking/types.ts'
import type { GestureName, HandGestureDetector } from './types.ts'

/** Wraps a stateless pose predicate (see poses.ts) as a named gesture detector. */
export class PoseGestureDetector implements HandGestureDetector {
  readonly name: GestureName
  private readonly predicate: (hand: TrackedHand) => boolean

  constructor(name: GestureName, predicate: (hand: TrackedHand) => boolean) {
    this.name = name
    this.predicate = predicate
  }

  isActive(hand: TrackedHand): boolean {
    return this.predicate(hand)
  }
}
