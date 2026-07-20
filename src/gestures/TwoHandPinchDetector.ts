import type { HandTrackingFrame } from '../tracking/types.ts'
import type { FrameGestureDetector, GestureName } from './types.ts'
import { isPinching } from './poses.ts'

/** Both hands pinching simultaneously — used to scale objects between them. */
export class TwoHandPinchDetector implements FrameGestureDetector {
  readonly name: GestureName = 'twoHandPinch'

  isActive(frame: HandTrackingFrame): boolean {
    const left = frame.hands.find((hand) => hand.handedness === 'left')
    const right = frame.hands.find((hand) => hand.handedness === 'right')
    if (!left || !right) return false
    return isPinching(left) && isPinching(right)
  }
}
