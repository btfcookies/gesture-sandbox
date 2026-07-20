import * as THREE from 'three'
import type { ObjectStore } from './ObjectStore.ts'
import { PRIMITIVE_TYPES, type PrimitiveType } from './types.ts'

const SCENE_FORMAT_VERSION = 1

interface SerializedObject {
  type: PrimitiveType
  position: [number, number, number]
  /** Quaternion, xyzw order. */
  rotation: [number, number, number, number]
  scale: [number, number, number]
  color: string
}

interface SerializedScene {
  version: number
  objects: SerializedObject[]
}

export function exportScene(objectStore: ObjectStore): string {
  const scene: SerializedScene = {
    version: SCENE_FORMAT_VERSION,
    objects: objectStore.all.map((object) => ({
      type: object.type,
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [object.mesh.quaternion.x, object.mesh.quaternion.y, object.mesh.quaternion.z, object.mesh.quaternion.w],
      scale: [object.scale.x, object.scale.y, object.scale.z],
      color: `#${object.color.getHexString()}`,
    })),
  }
  return JSON.stringify(scene, null, 2)
}

/** Replaces the current scene with the one described by `json`. Throws with a readable message if the file is malformed. */
export function importScene(json: string, objectStore: ObjectStore): void {
  const parsed: unknown = JSON.parse(json)
  const objects = validateScene(parsed)

  objectStore.clear()
  for (const item of objects) {
    const object = objectStore.spawnAt(
      item.type,
      new THREE.Vector3(...item.position),
      new THREE.Quaternion(...item.rotation),
      new THREE.Vector3(...item.scale),
    )
    object.color.set(item.color)
    ;(object.material as THREE.MeshPhysicalMaterial).color.set(item.color)
  }
}

function validateScene(value: unknown): SerializedObject[] {
  if (typeof value !== 'object' || value === null || !('objects' in value) || !Array.isArray((value as { objects: unknown }).objects)) {
    throw new Error('Not a valid scene file: expected an object with an "objects" array.')
  }
  return (value as { objects: unknown[] }).objects.map((item, index) => validateObject(item, index))
}

function validateObject(value: unknown, index: number): SerializedObject {
  if (typeof value !== 'object' || value === null) throw new Error(`objects[${index}] is not an object.`)
  const object = value as Record<string, unknown>

  if (!PRIMITIVE_TYPES.includes(object.type as PrimitiveType)) {
    throw new Error(`objects[${index}].type "${String(object.type)}" is not a known primitive.`)
  }
  if (!isVector3Tuple(object.position)) throw new Error(`objects[${index}].position must be [x, y, z].`)
  if (!isQuaternionTuple(object.rotation)) throw new Error(`objects[${index}].rotation must be [x, y, z, w].`)
  if (!isVector3Tuple(object.scale)) throw new Error(`objects[${index}].scale must be [x, y, z].`)
  if (typeof object.color !== 'string') throw new Error(`objects[${index}].color must be a hex color string.`)

  return {
    type: object.type as PrimitiveType,
    position: object.position as [number, number, number],
    rotation: object.rotation as [number, number, number, number],
    scale: object.scale as [number, number, number],
    color: object.color,
  }
}

function isVector3Tuple(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number')
}

function isQuaternionTuple(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number')
}
