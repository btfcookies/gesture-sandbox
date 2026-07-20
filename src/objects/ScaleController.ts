import * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import type { HandTrackingFrame } from '../tracking/types.ts'
import type { SelectionManager } from './SelectionManager.ts'

const MIN_SCALE_FACTOR = 0.15
const MAX_SCALE_FACTOR = 6

interface ScaleState {
  startDistance: number
  startScales: Map<string, THREE.Vector3>
}

/**
 * Two hands pinching together scales the whole current selection: spreading
 * them apart enlarges, bringing them together shrinks. Driven by update()
 * since it needs both hands' live positions each frame, not just the single
 * averaged position a GestureEvent carries.
 */
export class ScaleController {
  private readonly recognizer: GestureRecognizer
  private readonly selection: SelectionManager
  private state: ScaleState | null = null

  constructor(recognizer: GestureRecognizer, selection: SelectionManager) {
    this.recognizer = recognizer
    this.selection = selection
  }

  update(frame: HandTrackingFrame): void {
    const isActive = this.recognizer.getActiveGestureNames('both').includes('twoHandPinch')
    if (!isActive) {
      this.state = null
      return
    }

    const left = frame.hands.find((hand) => hand.handedness === 'left')
    const right = frame.hands.find((hand) => hand.handedness === 'right')
    if (!left || !right) return

    const distance = screenDistance(left.palmPosition, right.palmPosition)

    if (!this.state) {
      if (this.selection.isEmpty) return
      this.state = {
        startDistance: Math.max(distance, 1e-4),
        startScales: new Map(this.selection.all.map((object) => [object.uuid, object.scale.clone()])),
      }
      return
    }

    const factor = THREE.MathUtils.clamp(distance / this.state.startDistance, MIN_SCALE_FACTOR, MAX_SCALE_FACTOR)
    for (const object of this.selection.all) {
      const startScale = this.state.startScales.get(object.uuid)
      if (startScale) object.scale.copy(startScale).multiplyScalar(factor)
    }
  }
}

function screenDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
