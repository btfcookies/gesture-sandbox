import * as THREE from 'three'

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()

/**
 * Projects a normalized (0..1, y-down image space) hand position into world
 * space, on a plane a fixed distance in front of the camera. A fixed-distance
 * plane (rather than intersecting the floor) always gives a well-defined
 * point regardless of where on screen the hand appears.
 */
export function handToWorldPosition(
  camera: THREE.Camera,
  normalizedX: number,
  normalizedY: number,
  distanceFromCamera: number,
): THREE.Vector3 {
  ndc.set(normalizedX * 2 - 1, -(normalizedY * 2 - 1))
  raycaster.setFromCamera(ndc, camera)
  return raycaster.ray.at(distanceFromCamera, new THREE.Vector3())
}
