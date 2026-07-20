import * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import type { GestureEvent } from '../gestures/types.ts'
import type { HandTrackingFrame, Handedness } from '../tracking/types.ts'
import type { ObjectStore } from './ObjectStore.ts'
import type { SelectionManager } from './SelectionManager.ts'
import { SelectionBoxOverlay } from '../ui/SelectionBoxOverlay.ts'

interface DragState {
  handedness: Handedness
  // null until the first update() call, which anchors the box to the
  // fingertip's position at that moment — using the gesture event's position
  // (palm) here instead would start the box at a different landmark than
  // the one it's dragged with, skewing the whole rectangle.
  startX: number | null
  startY: number | null
  currentX: number
  currentY: number
}

/** Hold Peace Sign and move the hand to draw a selection box; everything whose projected position lands inside it becomes selected. */
export class MultiSelectBoxController {
  private readonly overlay: SelectionBoxOverlay
  private readonly objectStore: ObjectStore
  private readonly selection: SelectionManager
  private readonly camera: THREE.Camera
  private readonly unsubscribers: Array<() => void>
  private drag: DragState | null = null

  constructor(
    container: HTMLElement,
    recognizer: GestureRecognizer,
    objectStore: ObjectStore,
    selection: SelectionManager,
    camera: THREE.Camera,
  ) {
    this.overlay = new SelectionBoxOverlay(container)
    this.objectStore = objectStore
    this.selection = selection
    this.camera = camera

    this.unsubscribers = [
      recognizer.on('gestureStart', (event) => this.handleStart(event)),
      recognizer.on('gestureEnd', (event) => this.handleEnd(event)),
    ]
  }

  update(frame: HandTrackingFrame): void {
    if (!this.drag) return
    const hand = frame.hands.find((h) => h.handedness === this.drag!.handedness)
    if (!hand) return

    const tip = hand.fingers.index.joints[hand.fingers.index.joints.length - 1]!
    const { x, y } = mapNormalizedToScreen(tip.x, tip.y)
    if (this.drag.startX === null || this.drag.startY === null) {
      this.drag.startX = x
      this.drag.startY = y
    }
    this.drag.currentX = x
    this.drag.currentY = y
    this.overlay.show(this.drag.startX, this.drag.startY, x, y)
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe()
    this.overlay.dispose()
  }

  private handleStart(event: GestureEvent): void {
    if (event.gesture !== 'peaceSign' || event.handedness === 'both' || this.drag) return
    this.drag = { handedness: event.handedness, startX: null, startY: null, currentX: 0, currentY: 0 }
  }

  private handleEnd(event: GestureEvent): void {
    if (event.gesture !== 'peaceSign' || !this.drag || event.handedness !== this.drag.handedness) return
    const { startX, startY, currentX, currentY } = this.drag
    if (startX !== null && startY !== null) this.finishDrag(startX, startY, currentX, currentY)
    this.drag = null
    this.overlay.hide()
  }

  private finishDrag(x1: number, y1: number, x2: number, y2: number): void {
    const left = Math.min(x1, x2)
    const right = Math.max(x1, x2)
    const top = Math.min(y1, y2)
    const bottom = Math.max(y1, y2)

    const inside = this.objectStore.all.filter((object) => {
      const screen = projectToScreen(this.camera, object.position)
      return screen.x >= left && screen.x <= right && screen.y >= top && screen.y <= bottom
    })

    if (inside.length > 0) this.selection.setSelection(inside)
  }
}

function projectToScreen(camera: THREE.Camera, worldPosition: THREE.Vector3): { x: number; y: number } {
  const ndc = worldPosition.clone().project(camera)
  return { x: ((ndc.x + 1) / 2) * window.innerWidth, y: ((1 - ndc.y) / 2) * window.innerHeight }
}

function mapNormalizedToScreen(normalizedX: number, normalizedY: number): { x: number; y: number } {
  return { x: normalizedX * window.innerWidth, y: normalizedY * window.innerHeight }
}
