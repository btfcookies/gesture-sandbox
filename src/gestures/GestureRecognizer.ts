import * as THREE from 'three'
import { EventEmitter } from '../utilities/EventEmitter.ts'
import type { Handedness, HandTrackingFrame } from '../tracking/types.ts'
import type { FrameGestureDetector, GestureEvent, GestureName, HandGestureDetector } from './types.ts'
import { PoseGestureDetector } from './PoseGestureDetector.ts'
import { PulseGestureDetector } from './PulseGestureDetector.ts'
import { TwoHandPinchDetector } from './TwoHandPinchDetector.ts'
import { isClosedFist, isGrabbing, isOkSign, isOpenPalm, isPeaceSign, isPinching, isPointing, isThumbsUp } from './poses.ts'

export interface GestureEvents extends Record<string, unknown> {
  gestureStart: GestureEvent
  gestureUpdate: GestureEvent
  gestureEnd: GestureEvent
}

type GestureKey = string

function gestureKey(gesture: GestureName, handedness: Handedness | 'both'): GestureKey {
  return `${gesture}:${handedness}`
}

function parseGestureKey(key: GestureKey): { gesture: GestureName; handedness: Handedness | 'both' } {
  const separatorIndex = key.lastIndexOf(':')
  return {
    gesture: key.slice(0, separatorIndex) as GestureName,
    handedness: key.slice(separatorIndex + 1) as Handedness | 'both',
  }
}

function averagePosition(positions: THREE.Vector3[]): THREE.Vector3 {
  const sum = new THREE.Vector3()
  for (const position of positions) sum.add(position)
  return sum.divideScalar(positions.length)
}

/**
 * Runs every registered gesture detector against each tracking frame and
 * emits gestureStart/gestureUpdate/gestureEnd — callers subscribe via on(),
 * they never poll pose state themselves.
 */
export class GestureRecognizer extends EventEmitter<GestureEvents> {
  private readonly handDetectors: HandGestureDetector[] = [
    new PoseGestureDetector('openPalm', isOpenPalm),
    new PoseGestureDetector('closedFist', isClosedFist),
    new PoseGestureDetector('pinch', isPinching),
    new PoseGestureDetector('peaceSign', isPeaceSign),
    new PoseGestureDetector('point', isPointing),
    new PoseGestureDetector('thumbsUp', isThumbsUp),
    new PoseGestureDetector('okSign', isOkSign),
    new PoseGestureDetector('grab', isGrabbing),
    new PulseGestureDetector('release', isGrabbing),
  ]

  private readonly frameDetectors: FrameGestureDetector[] = [new TwoHandPinchDetector()]

  private readonly activeGestures = new Set<GestureKey>()
  private readonly lastPosition = new Map<GestureKey, THREE.Vector3>()
  // Reused every update() call instead of allocating a fresh Set per frame.
  private readonly stillActive = new Set<GestureKey>()

  /** Feed one hand-tracking frame; fires start/update/end events as needed. Call once per render tick. */
  update(frame: HandTrackingFrame): void {
    const stillActive = this.stillActive
    stillActive.clear()

    // Frame-level (two-hand) detectors run before per-hand ones so that, e.g.,
    // twoHandPinch:both is already registered active by the time individual
    // pinch:left/pinch:right events fire in this same update() — consumers
    // that need to distinguish "part of a two-hand gesture" from "a lone
    // pinch" (see PinchDragController) can rely on that ordering.
    if (frame.hands.length > 0) {
      const position = averagePosition(frame.hands.map((hand) => hand.palmPosition))
      for (const detector of this.frameDetectors) {
        this.reconcile(detector.name, 'both', detector.isActive(frame), position, frame.timestampMs, stillActive)
      }
    }

    for (const hand of frame.hands) {
      for (const detector of this.handDetectors) {
        this.reconcile(
          detector.name,
          hand.handedness,
          detector.isActive(hand),
          hand.palmPosition,
          frame.timestampMs,
          stillActive,
        )
      }
    }

    for (const key of this.activeGestures) {
      if (!stillActive.has(key)) this.endGesture(key, frame.timestampMs)
    }
  }

  /** Names of gestures currently active for a hand (or 'both' for two-hand gestures) — for debug display only. */
  getActiveGestureNames(handedness: Handedness | 'both'): GestureName[] {
    const suffix = `:${handedness}`
    const names: GestureName[] = []
    for (const key of this.activeGestures) {
      if (key.endsWith(suffix)) names.push(parseGestureKey(key).gesture)
    }
    return names
  }

  private reconcile(
    gesture: GestureName,
    handedness: Handedness | 'both',
    isActive: boolean,
    position: THREE.Vector3,
    timestampMs: number,
    stillActive: Set<GestureKey>,
  ): void {
    if (!isActive) return
    const key = gestureKey(gesture, handedness)
    stillActive.add(key)
    this.lastPosition.set(key, position.clone())

    const event: GestureEvent = { gesture, handedness, position: position.clone(), timestampMs }
    if (this.activeGestures.has(key)) {
      this.emit('gestureUpdate', event)
    } else {
      this.activeGestures.add(key)
      this.emit('gestureStart', event)
    }
  }

  private endGesture(key: GestureKey, timestampMs: number): void {
    this.activeGestures.delete(key)
    const { gesture, handedness } = parseGestureKey(key)
    const position = this.lastPosition.get(key) ?? new THREE.Vector3()
    this.lastPosition.delete(key)
    this.emit('gestureEnd', { gesture, handedness, position, timestampMs })
  }
}
