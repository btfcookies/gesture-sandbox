import type { GestureRecognizer } from './GestureRecognizer.ts'
import type { GestureEvent, GestureName } from './types.ts'
import type { Handedness } from '../tracking/types.ts'

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
    this.startedAtMs.set(event.handedness, event.timestampMs)
    this.firedFor.delete(event.handedness)
  }

  private handleUpdate(event: GestureEvent): void {
    if (event.gesture !== this.gesture || this.firedFor.has(event.handedness)) return
    const startedAt = this.startedAtMs.get(event.handedness)
    if (startedAt === undefined) return
    if (event.timestampMs - startedAt >= this.holdDurationMs) {
      this.firedFor.add(event.handedness)
      this.onHeld(event)
    }
  }

  private handleEnd(event: GestureEvent): void {
    if (event.gesture !== this.gesture) return
    this.startedAtMs.delete(event.handedness)
    this.firedFor.delete(event.handedness)
  }
}
