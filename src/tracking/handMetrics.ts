import * as THREE from 'three'
import { HAND_LANDMARK, FINGER_JOINTS, PALM_LANDMARKS } from './handLandmarks.ts'
import type { FingerMetrics, FingerName } from './types.ts'

/** Empirical average per-joint bend angle at a fully curled finger. */
const MAX_JOINT_BEND_ANGLE = Math.PI / 2.2

const OPENNESS_FINGERS: readonly FingerName[] = ['index', 'middle', 'ring', 'pinky']

/** Centroid of the wrist and the four finger base joints, in whatever space `landmarks` is expressed in. */
export function computePalmPosition(landmarks: THREE.Vector3[]): THREE.Vector3 {
  const sum = new THREE.Vector3()
  for (const index of PALM_LANDMARKS) sum.add(landmarks[index]!)
  return sum.divideScalar(PALM_LANDMARKS.length)
}

/** Midpoint of the thumb tip and index tip, in whatever space `landmarks` is expressed in — where a pinch actually happens, as opposed to the palm centroid. */
export function computePinchPosition(landmarks: THREE.Vector3[]): THREE.Vector3 {
  const thumbTip = landmarks[HAND_LANDMARK.THUMB_TIP]!
  const indexTip = landmarks[HAND_LANDMARK.INDEX_TIP]!
  return thumbTip.clone().add(indexTip).multiplyScalar(0.5)
}

/** Unit vector normal to the palm plane (wrist, index MCP, pinky MCP), in metric hand space. */
export function computePalmNormal(worldLandmarks: THREE.Vector3[]): THREE.Vector3 {
  const wrist = worldLandmarks[HAND_LANDMARK.WRIST]!
  const index = worldLandmarks[HAND_LANDMARK.INDEX_MCP]!
  const pinky = worldLandmarks[HAND_LANDMARK.PINKY_MCP]!
  const toIndex = new THREE.Vector3().subVectors(index, wrist)
  const toPinky = new THREE.Vector3().subVectors(pinky, wrist)
  return new THREE.Vector3().crossVectors(toIndex, toPinky).normalize()
}

/** Hand orientation from an orthonormal basis built out of the wrist and finger-base joints. */
export function computeHandRotation(worldLandmarks: THREE.Vector3[]): THREE.Quaternion {
  const wrist = worldLandmarks[HAND_LANDMARK.WRIST]!
  const middleMcp = worldLandmarks[HAND_LANDMARK.MIDDLE_MCP]!
  const indexMcp = worldLandmarks[HAND_LANDMARK.INDEX_MCP]!
  const pinkyMcp = worldLandmarks[HAND_LANDMARK.PINKY_MCP]!

  const forward = new THREE.Vector3().subVectors(middleMcp, wrist).normalize()
  const across = new THREE.Vector3().subVectors(indexMcp, pinkyMcp).normalize()
  const normal = new THREE.Vector3().crossVectors(across, forward).normalize()
  const orthoAcross = new THREE.Vector3().crossVectors(forward, normal).normalize()

  const basis = new THREE.Matrix4().makeBasis(orthoAcross, forward, normal)
  return new THREE.Quaternion().setFromRotationMatrix(basis)
}

export function computeFingerMetrics(
  name: FingerName,
  landmarks: THREE.Vector3[],
  worldLandmarks: THREE.Vector3[],
): FingerMetrics {
  const jointIndices = FINGER_JOINTS[name]
  const joints = jointIndices.map((index) => landmarks[index]!)
  const worldJoints = jointIndices.map((index) => worldLandmarks[index]!)

  const base = worldJoints[0]!
  const tip = worldJoints[worldJoints.length - 1]!
  const direction = new THREE.Vector3().subVectors(tip, base).normalize()

  return { joints, direction, curl: computeCurl(worldJoints) }
}

/** Average bend angle between consecutive joint segments, normalized to 0 (straight) .. 1 (fully curled). */
function computeCurl(worldJoints: THREE.Vector3[]): number {
  let totalAngle = 0
  let segmentCount = 0

  for (let i = 0; i < worldJoints.length - 2; i++) {
    const segmentA = new THREE.Vector3().subVectors(worldJoints[i + 1]!, worldJoints[i]!).normalize()
    const segmentB = new THREE.Vector3().subVectors(worldJoints[i + 2]!, worldJoints[i + 1]!).normalize()
    totalAngle += segmentA.angleTo(segmentB)
    segmentCount++
  }

  if (segmentCount === 0) return 0
  return THREE.MathUtils.clamp(totalAngle / segmentCount / MAX_JOINT_BEND_ANGLE, 0, 1)
}

// Floor for the hand-span reference distance below, guarding against a
// division blow-up on the rare frame where MediaPipe's world-scale estimate
// briefly collapses.
const MIN_HAND_SPAN = 0.02

/**
 * Thumb-tip-to-index-tip distance, expressed as a ratio of the hand's own
 * span (wrist to middle-finger knuckle) rather than raw meters. MediaPipe's
 * world landmarks are a per-frame *estimate* of metric scale — it drifts
 * with distance from camera and between users' hand sizes, which made a
 * fixed-meters pinch threshold unreliable. Dividing by the hand's own span
 * cancels that out: pinching reads the same whether the hand is close, far,
 * or small.
 */
export function computePinchDistance(worldLandmarks: THREE.Vector3[]): number {
  const thumbTip = worldLandmarks[HAND_LANDMARK.THUMB_TIP]!
  const indexTip = worldLandmarks[HAND_LANDMARK.INDEX_TIP]!
  const wrist = worldLandmarks[HAND_LANDMARK.WRIST]!
  const middleMcp = worldLandmarks[HAND_LANDMARK.MIDDLE_MCP]!
  const handSpan = Math.max(wrist.distanceTo(middleMcp), MIN_HAND_SPAN)
  return thumbTip.distanceTo(indexTip) / handSpan
}

/** 0 (closed fist) .. 1 (fully open), from the average curl of the four non-thumb fingers. */
export function computePalmOpenness(fingers: Record<FingerName, FingerMetrics>): number {
  const averageCurl = OPENNESS_FINGERS.reduce((sum, name) => sum + fingers[name].curl, 0) / OPENNESS_FINGERS.length
  return THREE.MathUtils.clamp(1 - averageCurl, 0, 1)
}
