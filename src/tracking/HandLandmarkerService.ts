import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'

// Served locally via scripts/setup-mediapipe-assets.mjs — no CDN, no network
// calls once staged, so tracking works fully offline.
const WASM_BASE_PATH = '/mediapipe/wasm'
const MODEL_ASSET_PATH = '/models/hand_landmarker.task'
const MAX_HANDS = 2
// Lowered from 0.6: motion blur during fast hand movement measurably drops
// MediaPipe's own confidence scores, and at 0.6 that was enough to drop
// tracking entirely mid-gesture — the "worse while moving" symptom. 0.5
// keeps tracking through that at a small cost in occasional lower-quality
// frames (which the landmark smoothing already absorbs).
const MIN_CONFIDENCE = 0.5

/** Thin async-init wrapper around MediaPipe's HandLandmarker task. */
export class HandLandmarkerService {
  private landmarker: HandLandmarker | null = null
  private initPromise: Promise<void> | null = null

  async ensureReady(): Promise<void> {
    if (this.landmarker) return
    this.initPromise ??= this.initialize()
    await this.initPromise
  }

  detect(source: HTMLVideoElement | HTMLCanvasElement, timestampMs: number): HandLandmarkerResult | null {
    return this.landmarker?.detectForVideo(source, timestampMs) ?? null
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
  }

  private async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH)
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: MAX_HANDS,
      minHandDetectionConfidence: MIN_CONFIDENCE,
      minHandPresenceConfidence: MIN_CONFIDENCE,
      minTrackingConfidence: MIN_CONFIDENCE,
    })
  }
}
