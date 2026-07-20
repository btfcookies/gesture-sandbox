import * as THREE from 'three'
import type { PrimitiveType } from './types.ts'

const DEFAULT_RADIUS = 0.4
const DEFAULT_SIZE = 0.7

const builders: Record<PrimitiveType, () => THREE.BufferGeometry> = {
  cube: () => new THREE.BoxGeometry(DEFAULT_SIZE, DEFAULT_SIZE, DEFAULT_SIZE),
  sphere: () => new THREE.SphereGeometry(DEFAULT_RADIUS, 48, 32),
  cylinder: () => new THREE.CylinderGeometry(DEFAULT_RADIUS, DEFAULT_RADIUS, DEFAULT_SIZE, 32),
  cone: () => new THREE.ConeGeometry(DEFAULT_RADIUS, DEFAULT_SIZE, 32),
  torus: () => new THREE.TorusGeometry(DEFAULT_RADIUS * 0.7, DEFAULT_RADIUS * 0.32, 24, 48),
  capsule: () => new THREE.CapsuleGeometry(DEFAULT_RADIUS * 0.6, DEFAULT_SIZE * 0.6, 8, 24),
  plane: () => new THREE.PlaneGeometry(DEFAULT_SIZE, DEFAULT_SIZE),
}

const cache = new Map<PrimitiveType, THREE.BufferGeometry>()

/** Geometry is stateless per primitive type, so every spawned object of that type shares one instance. */
export function getSharedGeometry(type: PrimitiveType): THREE.BufferGeometry {
  let geometry = cache.get(type)
  if (!geometry) {
    geometry = builders[type]()
    cache.set(type, geometry)
  }
  return geometry
}
