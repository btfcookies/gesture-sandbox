import type * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import type { GestureEvent } from '../gestures/types.ts'
import type { Handedness } from '../tracking/types.ts'
import type { HoverController } from './HoverController.ts'
import type { SelectionManager } from './SelectionManager.ts'
import type { SceneObject } from './SceneObject.ts'
import { handToWorldPosition } from './handToWorldPosition.ts'

/**
 * Pinch to select + drag a single object; it follows the hand while pinched.
 * Pinching empty space deselects everything. Releasing the pinch also
 * deselects the object — selection only lives for the duration of the pinch.
 */
export class PinchDragController {
  private readonly recognizer: GestureRecognizer
  private readonly selection: SelectionManager
  private readonly hover: HoverController
  private readonly camera: THREE.Camera
  private readonly unsubscribers: Array<() => void>

  private readonly draggedObjects = new Map<Handedness, SceneObject>()
  private readonly grabDistances = new Map<Handedness, number>()

  constructor(recognizer: GestureRecognizer, selection: SelectionManager, hover: HoverController, camera: THREE.Camera) {
    this.recognizer = recognizer
    this.selection = selection
    this.hover = hover
    this.camera = camera

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
    if (event.gesture !== 'pinch' || event.handedness === 'both') return
    // Every individual pinch also fires alongside a two-hand pinch (each hand
    // independently satisfies isPinching). That's a scale gesture, not a
    // select/deselect one — ignore it here so scaling doesn't wipe selection.
    if (this.recognizer.getActiveGestureNames('both').includes('twoHandPinch')) return
    const handedness = event.handedness

    const target = this.hover.current
    if (!target) {
      this.selection.clear()
      return
    }
    if ([...this.draggedObjects.values()].includes(target)) return // already driven by the other hand

    this.selection.selectOnly(target)
    this.draggedObjects.set(handedness, target)
    this.grabDistances.set(handedness, this.camera.position.distanceTo(target.position))
    target.beingManipulated = true
  }

  private handleUpdate(event: GestureEvent): void {
    if (event.gesture !== 'pinch' || event.handedness === 'both') return
    const object = this.draggedObjects.get(event.handedness)
    const distance = this.grabDistances.get(event.handedness)
    if (!object || distance === undefined) return
    object.position.copy(handToWorldPosition(this.camera, event.position.x, event.position.y, distance))
  }

  private handleEnd(event: GestureEvent): void {
    if (event.gesture !== 'pinch' || event.handedness === 'both') return
    const object = this.draggedObjects.get(event.handedness)
    if (object && ![...this.draggedObjects.entries()].some(([h, o]) => h !== event.handedness && o === object)) {
      object.beingManipulated = false
      this.selection.remove(object)
    }
    this.draggedObjects.delete(event.handedness)
    this.grabDistances.delete(event.handedness)
  }
}
