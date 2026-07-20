import * as THREE from 'three'

/**
 * Default look for newly spawned objects — a clean PBR "plastic" material.
 * Material variety (glass/metal/matte/emissive/wireframe) is a swap on this
 * same mesh later; the object model already carries `material` per-instance
 * so that extension won't require touching the spawn path.
 */
export function createDefaultMaterial(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
  })
}
