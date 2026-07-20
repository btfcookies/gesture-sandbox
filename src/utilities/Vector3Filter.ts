import * as THREE from 'three'
import { OneEuroFilter, type OneEuroFilterOptions } from './OneEuroFilter.ts'

/** Applies an independent OneEuroFilter to each axis of a Vector3 stream. */
export class Vector3Filter {
  private readonly filterX: OneEuroFilter
  private readonly filterY: OneEuroFilter
  private readonly filterZ: OneEuroFilter

  constructor(options?: OneEuroFilterOptions) {
    this.filterX = new OneEuroFilter(options)
    this.filterY = new OneEuroFilter(options)
    this.filterZ = new OneEuroFilter(options)
  }

  filter(value: THREE.Vector3, timestampMs: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.filterX.filter(value.x, timestampMs),
      this.filterY.filter(value.y, timestampMs),
      this.filterZ.filter(value.z, timestampMs),
    )
  }

  reset(): void {
    this.filterX.reset()
    this.filterY.reset()
    this.filterZ.reset()
  }
}
