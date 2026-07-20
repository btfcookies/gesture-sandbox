import type * as THREE from 'three'

export type Handedness = 'left' | 'right'

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'

export interface FingerMetrics {
  /** Normalized image-space joint positions, base to tip. */
  joints: THREE.Vector3[]
  /** Unit vector from the finger's base joint to its tip, in metric hand space. */
  direction: THREE.Vector3
  /** 0 = fully extended, 1 = fully curled. */
  curl: number
}

export interface TrackedHand {
  handedness: Handedness
  /** Blended detection + handedness confidence, 0..1. */
  confidence: number
  /** All 21 landmarks, normalized image space (x/y in 0..1, z relative depth), smoothed. */
  landmarks: THREE.Vector3[]
  /** All 21 landmarks, metric hand space in meters, smoothed. */
  worldLandmarks: THREE.Vector3[]
  wrist: THREE.Vector3
  /** Normalized image-space centroid of the wrist and finger base joints. */
  palmPosition: THREE.Vector3
  /** Normalized image-space midpoint of the thumb tip and index tip — where a pinch actually happens. */
  pinchPosition: THREE.Vector3
  /** Unit vector, direction the palm faces, in metric hand space. */
  palmNormal: THREE.Vector3
  /** Hand orientation in metric hand space. */
  rotation: THREE.Quaternion
  fingers: Record<FingerName, FingerMetrics>
  /** Thumb-tip-to-index-tip distance as a ratio of the hand's own span (wrist to middle knuckle) — scale-invariant, not meters. */
  pinchDistance: number
  /** 0 = closed fist, 1 = fully open palm, derived from non-thumb finger curl. */
  palmOpenness: number
}

export interface HandTrackingFrame {
  hands: TrackedHand[]
  timestampMs: number
}
