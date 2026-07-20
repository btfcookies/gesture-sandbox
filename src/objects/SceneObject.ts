import type * as THREE from 'three'
import type { PrimitiveType } from './types.ts'

/**
 * Thin wrapper around a THREE.Mesh. Position/rotation/scale/uuid/material
 * already live on the mesh — Three.js owns that state — so this only adds
 * what Three doesn't have: primitive type, authored color, selection, hover,
 * and manipulation state.
 */
export class SceneObject {
  readonly mesh: THREE.Mesh
  readonly type: PrimitiveType
  readonly color: THREE.Color
  selected = false
  hovered = false
  /** True while a gesture (drag or rotate) is actively driving this object's transform — physics defers to it. */
  beingManipulated = false

  constructor(mesh: THREE.Mesh, type: PrimitiveType, color: THREE.Color) {
    this.mesh = mesh
    this.type = type
    this.color = color
  }

  get uuid(): string {
    return this.mesh.uuid
  }

  get position(): THREE.Vector3 {
    return this.mesh.position
  }

  get rotation(): THREE.Euler {
    return this.mesh.rotation
  }

  get scale(): THREE.Vector3 {
    return this.mesh.scale
  }

  get material(): THREE.Material {
    return this.mesh.material as THREE.Material
  }
}
