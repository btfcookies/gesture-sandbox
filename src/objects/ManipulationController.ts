import type * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import type { HandTrackingFrame } from '../tracking/types.ts'
import type { TweenManager } from '../utilities/TweenManager.ts'
import type { ObjectStore } from './ObjectStore.ts'
import { SelectionManager } from './SelectionManager.ts'
import { HoverController } from './HoverController.ts'
import { PinchDragController } from './PinchDragController.ts'
import { RotateController } from './RotateController.ts'
import { ScaleController } from './ScaleController.ts'
import { DuplicateController } from './DuplicateController.ts'
import { DeleteController } from './DeleteController.ts'
import { MultiSelectBoxController } from './MultiSelectBoxController.ts'
import { updateObjectVisuals } from './ObjectVisuals.ts'
import type { HistoryManager } from './HistoryManager.ts'

/**
 * Facade wiring every object-manipulation interaction together: hover,
 * pinch-select-and-drag, grab-and-rotate, two-hand-pinch-scale, thumbs-up
 * duplicate, hold-OK-sign delete, and peace-sign box multi-select.
 */
export class ManipulationController {
  readonly selection = new SelectionManager()

  private readonly objectStore: ObjectStore
  private readonly hover: HoverController
  private readonly pinchDrag: PinchDragController
  private readonly rotate: RotateController
  private readonly scale: ScaleController
  private readonly duplicate: DuplicateController
  private readonly deleteController: DeleteController
  private readonly boxSelect: MultiSelectBoxController

  constructor(
    container: HTMLElement,
    recognizer: GestureRecognizer,
    objectStore: ObjectStore,
    camera: THREE.Camera,
    tweenManager: TweenManager,
    history: HistoryManager,
  ) {
    this.objectStore = objectStore
    this.hover = new HoverController(objectStore, camera)
    this.pinchDrag = new PinchDragController(recognizer, this.selection, this.hover, camera)
    this.rotate = new RotateController(recognizer, this.selection, this.hover)
    this.scale = new ScaleController(recognizer, this.selection)
    this.duplicate = new DuplicateController(recognizer, this.selection, objectStore, history)
    this.deleteController = new DeleteController(recognizer, this.selection, objectStore, tweenManager, history)
    this.boxSelect = new MultiSelectBoxController(container, recognizer, objectStore, this.selection, camera)
  }

  /** Deletes the current selection — exposed for the Delete key, mirroring the hold-fist gesture. */
  deleteSelection(): void {
    this.deleteController.deleteSelection()
  }

  /**
   * Must run before gestureRecognizer.update() fires this frame's gesture
   * events — PinchDragController reads hover.current synchronously from the
   * pinch gestureStart handler, so hover has to already reflect the current
   * frame's fingertip position or a same-frame pinch onto a fresh target
   * reads the previous frame's (possibly empty) hover instead.
   */
  updateHover(frame: HandTrackingFrame): void {
    this.hover.update(frame)
  }

  update(frame: HandTrackingFrame, deltaSeconds: number): void {
    this.rotate.update(frame)
    this.scale.update(frame)
    this.boxSelect.update(frame)
    updateObjectVisuals(this.objectStore, deltaSeconds)
  }

  dispose(): void {
    this.pinchDrag.dispose()
    this.duplicate.dispose()
    this.deleteController.dispose()
    this.boxSelect.dispose()
  }
}
