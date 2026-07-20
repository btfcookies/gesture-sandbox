import * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import { GestureHoldTracker } from '../gestures/GestureHoldTracker.ts'
import type { SelectionManager } from './SelectionManager.ts'
import type { ObjectStore } from './ObjectStore.ts'
import type { SceneObject } from './SceneObject.ts'
import { Tween } from '../utilities/Tween.ts'
import { Easings } from '../utilities/easing.ts'
import type { TweenManager } from '../utilities/TweenManager.ts'
import type { HistoryManager } from './HistoryManager.ts'
import { DeleteCommand } from './commands/DeleteCommand.ts'
import { CompositeCommand } from './commands/CompositeCommand.ts'

const DELETE_HOLD_MS = 1000
const DISSOLVE_DURATION_MS = 400

/**
 * Deletes the current selection, shrinking + fading each object out first.
 * Triggered either by holding OK Sign for one second, or the Delete key.
 *
 * Deliberately not Closed Fist: Grab (rotate) and Closed Fist sit on the same
 * curl/openness continuum (see poses.ts), so a sustained Grab-to-rotate can
 * drift into Closed Fist territory and fire an unintended delete on whatever
 * was just being rotated. OK Sign requires the middle/ring/pinky fingers
 * extended, which is mutually exclusive with Grab's curled-fingers pose.
 */
export class DeleteController {
  private readonly objectStore: ObjectStore
  private readonly tweenManager: TweenManager
  private readonly history: HistoryManager
  private readonly selection: SelectionManager
  private readonly holdTracker: GestureHoldTracker

  constructor(
    recognizer: GestureRecognizer,
    selection: SelectionManager,
    objectStore: ObjectStore,
    tweenManager: TweenManager,
    history: HistoryManager,
  ) {
    this.objectStore = objectStore
    this.tweenManager = tweenManager
    this.history = history
    this.selection = selection

    this.holdTracker = new GestureHoldTracker(recognizer, 'okSign', DELETE_HOLD_MS, () => this.deleteSelection())
  }

  deleteSelection(): void {
    const targets = this.selection.all
    if (targets.length === 0) return
    this.selection.clear()

    const commands = targets.map((object) => new DeleteCommand(this.objectStore, object))
    this.history.push(new CompositeCommand(commands))

    for (const object of targets) this.dissolve(object)
  }

  dispose(): void {
    this.holdTracker.dispose()
  }

  private dissolve(object: SceneObject): void {
    const material = object.material as THREE.MeshPhysicalMaterial
    material.transparent = true
    const startScale = object.scale.clone()

    this.tweenManager.add(
      new Tween({
        durationMs: DISSOLVE_DURATION_MS,
        easing: Easings.easeOutCubic,
        onUpdate: (progress) => {
          object.scale.copy(startScale).multiplyScalar(1 - progress)
          material.opacity = 1 - progress
        },
        onComplete: () => this.objectStore.remove(object),
      }),
    )
  }
}
