import * as THREE from 'three'
import { HandLandmarkerService } from './HandLandmarkerService.ts'
import { MirroredFrameSource } from './MirroredFrameSource.ts'
import { HandSmoother } from './HandSmoother.ts'
import { FINGER_NAMES } from './handLandmarks.ts'
import {
  computePalmPosition,
  computePalmNormal,
  computeHandRotation,
  computeFingerMetrics,
  computePinchDistance,
  computePalmOpenness,
} from './handMetrics.ts'
import type { FingerMetrics, FingerName, HandTrackingFrame, Handedness, TrackedHand } from './types.ts'

const EMPTY_FRAME: HandTrackingFrame = { hands: [], timestampMs: 0 }

/**
 * Top-level hand tracking pipeline: video frame -> MediaPipe detection ->
 * per-landmark smoothing -> derived per-hand metrics. Call initialize() once,
 * then update() every render tick.
 */
export class HandTracker {
  private readonly service = new HandLandmarkerService()
  private readonly frameSource = new MirroredFrameSource()
  private readonly smoother = new HandSmoother()
  private ready = false

  async initialize(): Promise<void> {
    await this.service.ensureReady()
    this.ready = true
  }

  /** Safe to call every frame; returns an empty frame until initialize() resolves or no hand is visible. */
  update(video: HTMLVideoElement, timestampMs: number): HandTrackingFrame {
    if (!this.ready || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return EMPTY_FRAME

    const mirroredFrame = this.frameSource.update(video)
    if (!mirroredFrame) return EMPTY_FRAME

    const result = this.service.detect(mirroredFrame, timestampMs)
    if (!result || result.landmarks.length === 0) {
      this.smoother.pruneMissing(new Set())
      return EMPTY_FRAME
    }

    const visible = new Set<Handedness>()
    const hands: TrackedHand[] = []

    for (let i = 0; i < result.landmarks.length; i++) {
      const handednessCategory = result.handednesses[i]?.[0]
      const rawLandmarks = result.landmarks[i]
      const rawWorldLandmarks = result.worldLandmarks[i]
      if (!handednessCategory || !rawLandmarks || !rawWorldLandmarks) continue

      const handedness = handednessCategory.categoryName.toLowerCase() as Handedness
      visible.add(handedness)

      const landmarks = this.smoother.smoothLandmarks(
        handedness,
        rawLandmarks.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
        timestampMs,
      )
      const worldLandmarks = this.smoother.smoothWorldLandmarks(
        handedness,
        rawWorldLandmarks.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
        timestampMs,
      )

      const fingers = Object.fromEntries(
        FINGER_NAMES.map((name) => [name, computeFingerMetrics(name, landmarks, worldLandmarks)]),
      ) as Record<FingerName, FingerMetrics>

      hands.push({
        handedness,
        confidence: handednessCategory.score,
        landmarks,
        worldLandmarks,
        wrist: landmarks[0]!,
        palmPosition: computePalmPosition(landmarks),
        palmNormal: computePalmNormal(worldLandmarks),
        rotation: computeHandRotation(worldLandmarks),
        fingers,
        pinchDistance: computePinchDistance(worldLandmarks),
        palmOpenness: computePalmOpenness(fingers),
      })
    }

    this.smoother.pruneMissing(visible)
    return { hands, timestampMs }
  }

  dispose(): void {
    this.service.dispose()
  }
}
