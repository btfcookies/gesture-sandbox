import * as CANNON from 'cannon-es'
import type { PrimitiveType } from '../objects/types.ts'

// Mirrors the dimensions in objects/geometryFactory.ts so collision shapes
// roughly match what's rendered.
const DEFAULT_RADIUS = 0.4
const DEFAULT_SIZE = 0.7
const DEFAULT_MASS = 1

const shapeBuilders: Record<PrimitiveType, () => CANNON.Shape> = {
  cube: () => new CANNON.Box(new CANNON.Vec3(DEFAULT_SIZE / 2, DEFAULT_SIZE / 2, DEFAULT_SIZE / 2)),
  sphere: () => new CANNON.Sphere(DEFAULT_RADIUS),
  cylinder: () => new CANNON.Cylinder(DEFAULT_RADIUS, DEFAULT_RADIUS, DEFAULT_SIZE, 16),
  // cannon-es has no native cone; a cylinder with a near-zero top radius approximates one closely enough for this sandbox.
  cone: () => new CANNON.Cylinder(0.02, DEFAULT_RADIUS, DEFAULT_SIZE, 16),
  // No native torus either; a bounding sphere is a coarse but cheap stand-in.
  torus: () => new CANNON.Sphere(DEFAULT_RADIUS * 0.7),
  capsule: () => new CANNON.Cylinder(DEFAULT_RADIUS * 0.6, DEFAULT_RADIUS * 0.6, DEFAULT_SIZE * 0.6 + DEFAULT_RADIUS * 1.2, 12),
  plane: () => new CANNON.Box(new CANNON.Vec3(DEFAULT_SIZE / 2, 0.02, DEFAULT_SIZE / 2)),
}

/** Builds a dynamic rigid body approximating the given primitive's shape. */
export function createBody(type: PrimitiveType): CANNON.Body {
  const body = new CANNON.Body({ mass: DEFAULT_MASS, shape: shapeBuilders[type]() })
  body.linearDamping = 0.15
  body.angularDamping = 0.2
  return body
}
