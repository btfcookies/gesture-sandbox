import type { GestureRecognizer } from './GestureRecognizer.ts'
import type { GestureEvent, GestureName } from './types.ts'
import type { Handedness } from '../tracking/types.ts'

// MediaPipe occasionally drops a hand for a single tracking tick (motion
// blur, self-occlusion — an OK Sign's curled thumb/index is a good way to
// trigger this) even while the user holds the pose rock-steady. That reads
// as a spurious gestureEnd immediately followed by a gestureStart. Without
// tolerating that gap, a perfectly held pose could hit a one-frame dropout
// at any point in its second-long hold and never accumulate enough
// continuous time to fire. Mirrors the grace window HoverController uses
// for the same class of tracking flicker.
const END_GRACE_MS = 250

/**
 * Fires once a given gesture has been continuously held for at least
 * `holdDurationMs`, driven entirely by the recognizer's own start/update/end
 * events — no external polling of elapsed time. Reusable for any "hold X for
 * one second" interaction (radial menu, delete confirmation, etc).
 */
export class GestureHoldTracker {
  private readonly gesture: GestureName
  private readonly holdDurationMs: number
  private readonly onHeld: (event: GestureEvent) => void
  private readonly startedAtMs = new Map<Handedness | 'both', number>()
  private readonly lastSeenAtMs = new Map<Handedness | 'both', number>()
  private readonly firedFor = new Set<Handedness | 'both'>()
  private readonly unsubscribers: Array<() => void>

  constructor(recognizer: GestureRecognizer, gesture: GestureName, holdDurationMs: number, onHeld: (event: GestureEvent) => void) {
    this.gesture = gesture
    this.holdDurationMs = holdDurationMs
    this.onHeld = onHeld

    this.unsubscribers = [
      recognizer.on('gestureStart', (event) => this.handleStart(event)),
      recognizer.on('gestureUpdate', (event) => this.handleUpdate(event)),
      recognizer.on('gestureEnd', (event) => this.handleEnd(event)),
    ]
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe()
  }

  private handleStart(event: GestureEvent): void {
    if (event.gesture !== this.gesture) return
    const lastSeenAt = this.lastSeenAtMs.get(event.handedness)
    const isFlickerContinuation = lastSeenAt !== undefined && event.timestampMs - lastSeenAt <= END_GRACE_MS
    if (!isFlickerContinuation) {
      this.startedAtMs.set(event.handedness, event.timestampMs)
      this.firedFor.delete(event.handedness)
    }
    this.lastSeenAtMs.set(event.handedness, event.timestampMs)
  }

  private handleUpdate(event: GestureEvent): void {
    if (event.gesture !== this.gesture) return
    this.lastSeenAtMs.set(event.handedness, event.timestampMs)
    if (this.firedFor.has(event.handedness)) return
    const startedAt = this.startedAtMs.get(event.handedness)
    if (startedAt === undefined) return
    if (event.timestampMs - startedAt >= this.holdDurationMs) {
      this.firedFor.add(event.handedness)
      this.onHeld(event)
    }
  }

  // Deliberately does not clear startedAtMs/firedFor/lastSeenAtMs: a
  // same-tick tracking flicker (see END_GRACE_MS) is immediately followed by
  // a gestureStart that should continue the hold, not restart it.
  // handleStart clears the stale state itself once the grace window has
  // actually elapsed with no restart.
  private handleEnd(event: GestureEvent): void {
    if (event.gesture !== this.gesture) return
  }
}
