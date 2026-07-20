import * as THREE from 'three'
import type { ObjectStore } from './ObjectStore.ts'

const HOVER_EMISSIVE_INTENSITY = 0.35
const SELECTED_EMISSIVE_INTENSITY = 0.75
// Higher = snappier response; this is an exponential-decay rate, not a duration.
const GLOW_RESPONSIVENESS = 12

/** Smoothly glows an object's own color when hovered/selected — the "highlight" the spec asks for. */
export function updateObjectVisuals(objectStore: ObjectStore, deltaSeconds: number): void {
  objectStore.forEach((object) => {
    const material = object.material as THREE.MeshPhysicalMaterial
    const target = object.selected ? SELECTED_EMISSIVE_INTENSITY : object.hovered ? HOVER_EMISSIVE_INTENSITY : 0
    material.emissive.copy(object.color)
    material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, target, GLOW_RESPONSIVENESS, deltaSeconds)
  })
}
