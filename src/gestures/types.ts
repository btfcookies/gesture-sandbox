import type * as THREE from 'three'
import type { Handedness, HandTrackingFrame, TrackedHand } from '../tracking/types.ts'

export type GestureName =
  | 'openPalm'
  | 'closedFist'
  | 'pinch'
  | 'peaceSign'
  | 'point'
  | 'thumbsUp'
  | 'okSign'
  | 'twoHandPinch'
  | 'grab'
  | 'release'

export interface GestureEvent {
  gesture: GestureName
  /** The hand this instance belongs to; 'both' for two-hand gestures. */
  handedness: Handedness | 'both'
  /** Normalized image-space anchor position (palm position, or the average of both palms). */
  position: THREE.Vector3
  timestampMs: number
}

export interface HandGestureDetector {
  readonly name: GestureName
  /** Evaluates one hand for the current frame. May hold internal per-hand state (see PulseGestureDetector). */
  isActive(hand: TrackedHand): boolean
}

export interface FrameGestureDetector {
  readonly name: GestureName
  /** Evaluates the full frame (both hands) — for gestures that span more than one hand. */
  isActive(frame: HandTrackingFrame): boolean
}
