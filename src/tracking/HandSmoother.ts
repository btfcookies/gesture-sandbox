import type * as THREE from 'three'
import { Vector3Filter } from '../utilities/Vector3Filter.ts'
import { LANDMARK_COUNT } from './handLandmarks.ts'
import type { Handedness } from './types.ts'

// `beta` (how fast the cutoff ramps up with speed) only works if it's scaled
// to the signal's own units — normalized landmarks (0..1 across the frame)
// and world landmarks (meters, hand-relative, ~0.05 scale) differ by ~15-20x
// in typical derivative magnitude for the same physical hand motion. Using
// one beta for both under-responds badly on whichever signal is smaller —
// here, world landmarks, which curl and pinch distance are computed from,
// so pose classification lagged noticeably during motion.
const NORMALIZED_FILTER_OPTIONS = { minCutoff: 1.5, beta: 12, dCutoff: 1.0 }
const WORLD_FILTER_OPTIONS = { minCutoff: 1.5, beta: 60, dCutoff: 1.0 }

interface HandFilterSet {
  landmarks: Vector3Filter[]
  worldLandmarks: Vector3Filter[]
}

/**
 * Smooths raw per-frame landmark noise with a One Euro Filter per landmark,
 * keyed by handedness so left/right hand state never cross-contaminates.
 */
export class HandSmoother {
  private readonly hands = new Map<Handedness, HandFilterSet>()

  smoothLandmarks(handedness: Handedness, raw: THREE.Vector3[], timestampMs: number): THREE.Vector3[] {
    const filters = this.getOrCreate(handedness).landmarks
    return raw.map((point, i) => filters[i]!.filter(point, timestampMs))
  }

  smoothWorldLandmarks(handedness: Handedness, raw: THREE.Vector3[], timestampMs: number): THREE.Vector3[] {
    const filters = this.getOrCreate(handedness).worldLandmarks
    return raw.map((point, i) => filters[i]!.filter(point, timestampMs))
  }

  /**
   * Call once per frame with the handedness values currently visible so
   * filters for hands that left the frame reset instead of producing a
   * smoothing "jump" when that hand reappears.
   */
  pruneMissing(visible: ReadonlySet<Handedness>): void {
    for (const handedness of this.hands.keys()) {
      if (!visible.has(handedness)) this.hands.delete(handedness)
    }
  }

  private getOrCreate(handedness: Handedness): HandFilterSet {
    let set = this.hands.get(handedness)
    if (!set) {
      set = {
        landmarks: Array.from({ length: LANDMARK_COUNT }, () => new Vector3Filter(NORMALIZED_FILTER_OPTIONS)),
        worldLandmarks: Array.from({ length: LANDMARK_COUNT }, () => new Vector3Filter(WORLD_FILTER_OPTIONS)),
      }
      this.hands.set(handedness, set)
    }
    return set
  }
}
