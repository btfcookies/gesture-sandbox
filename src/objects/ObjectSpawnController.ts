import type * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import { GestureHoldTracker } from '../gestures/GestureHoldTracker.ts'
import type { GestureEvent } from '../gestures/types.ts'
import type { HandTrackingFrame, Handedness } from '../tracking/types.ts'
import { RadialMenu } from '../ui/RadialMenu.ts'
import { ObjectStore } from './ObjectStore.ts'
import { handToWorldPosition } from './handToWorldPosition.ts'
import type { HistoryManager } from './HistoryManager.ts'
import { SpawnCommand } from './commands/SpawnCommand.ts'

const OPEN_PALM_HOLD_MS = 1000
const SPAWN_DISTANCE_FROM_CAMERA = 6.5
// Physically pinching (thumb+index touching) naturally breaks the Open Palm
// pose that summoned the menu, so "openPalm ended" is NOT used to cancel —
// that would close the menu the instant the user tries to confirm. Instead
// the menu cancels only if the hand disappears from frame for a stretch, or
// after an absolute timeout.
const HAND_LOST_CANCEL_MS = 400
const MENU_TIMEOUT_MS = 6000

/**
 * Bridges gestures, the radial menu UI, and the object store: holding Open
 * Palm for a second opens the menu near that hand; aiming the index finger
 * highlights a wedge; pinching confirms and spawns; losing the hand or
 * timing out cancels.
 */
export class ObjectSpawnController {
  private readonly menu: RadialMenu
  private readonly objectStore: ObjectStore
  private readonly camera: THREE.Camera
  private readonly history: HistoryManager
  private readonly holdTracker: GestureHoldTracker
  private readonly unsubscribePinch: () => void

  private activeHand: Handedness | null = null
  private openedAtMs = 0
  private handLostSinceMs: number | null = null

  constructor(
    container: HTMLElement,
    recognizer: GestureRecognizer,
    objectStore: ObjectStore,
    camera: THREE.Camera,
    history: HistoryManager,
  ) {
    this.menu = new RadialMenu(container)
    this.objectStore = objectStore
    this.camera = camera
    this.history = history

    this.holdTracker = new GestureHoldTracker(recognizer, 'openPalm', OPEN_PALM_HOLD_MS, (event) => this.openMenu(event))
    this.unsubscribePinch = recognizer.on('gestureStart', (event) => this.handlePinch(event))
  }

  /** Call once per render tick so the highlighted wedge tracks the fingertip and stale menus time out. */
  update(frame: HandTrackingFrame): void {
    if (!this.menu.isOpen || !this.activeHand) return

    const hand = frame.hands.find((h) => h.handedness === this.activeHand)
    if (!hand) {
      this.handLostSinceMs ??= frame.timestampMs
      if (frame.timestampMs - this.handLostSinceMs > HAND_LOST_CANCEL_MS) this.closeMenu()
      return
    }
    this.handLostSinceMs = null

    if (frame.timestampMs - this.openedAtMs > MENU_TIMEOUT_MS) {
      this.closeMenu()
      return
    }

    const fingertip = hand.fingers.index.joints[hand.fingers.index.joints.length - 1]!
    const { x, y } = mapNormalizedToScreen(fingertip.x, fingertip.y)
    this.menu.updatePointer(x, y)
  }

  dispose(): void {
    this.holdTracker.dispose()
    this.unsubscribePinch()
    this.menu.dispose()
  }

  private openMenu(event: GestureEvent): void {
    if (event.handedness === 'both' || this.menu.isOpen) return
    this.activeHand = event.handedness
    this.openedAtMs = event.timestampMs
    this.handLostSinceMs = null
    const { x, y } = mapNormalizedToScreen(event.position.x, event.position.y)
    this.menu.open(x, y)
  }

  private handlePinch(event: GestureEvent): void {
    if (event.gesture !== 'pinch' || event.handedness !== this.activeHand || !this.menu.isOpen) return
    const selection = this.menu.selection
    if (selection && selection !== 'close') {
      const worldPosition = handToWorldPosition(this.camera, event.position.x, event.position.y, SPAWN_DISTANCE_FROM_CAMERA)
      const spawned = this.objectStore.spawn(selection, worldPosition)
      this.history.push(new SpawnCommand(this.objectStore, spawned))
    }
    this.closeMenu()
  }

  private closeMenu(): void {
    this.menu.close()
    this.activeHand = null
    this.handLostSinceMs = null
  }
}

function mapNormalizedToScreen(normalizedX: number, normalizedY: number): { x: number; y: number } {
  return { x: normalizedX * window.innerWidth, y: normalizedY * window.innerHeight }
}
