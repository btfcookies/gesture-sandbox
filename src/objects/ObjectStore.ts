import * as THREE from 'three'
import { getSharedGeometry } from './geometryFactory.ts'
import { createDefaultMaterial } from './materialFactory.ts'
import { PRIMITIVE_COLORS } from './palette.ts'
import { SceneObject } from './SceneObject.ts'
import type { PrimitiveType } from './types.ts'
import { Tween } from '../utilities/Tween.ts'
import { Easings } from '../utilities/easing.ts'
import type { TweenManager } from '../utilities/TweenManager.ts'

const SPAWN_ANIMATION_DURATION_MS = 350
const SPAWN_START_SCALE = 0.001

/** Owns every spawned object's lifecycle and the scene group they live in. */
export class ObjectStore {
  readonly group = new THREE.Group()

  private readonly objects = new Map<string, SceneObject>()
  private readonly tweenManager: TweenManager

  constructor(scene: THREE.Scene, tweenManager: TweenManager) {
    this.tweenManager = tweenManager
    this.group.name = 'objects'
    scene.add(this.group)
  }

  /** Spawns with the "pop in" scale-up animation — the normal, gesture-triggered creation path. */
  spawn(type: PrimitiveType, worldPosition: THREE.Vector3): SceneObject {
    const startScale = new THREE.Vector3(SPAWN_START_SCALE, SPAWN_START_SCALE, SPAWN_START_SCALE)
    const sceneObject = this.spawnAt(type, worldPosition, new THREE.Quaternion(), startScale)
    const mesh = sceneObject.mesh

    this.tweenManager.add(
      new Tween({
        durationMs: SPAWN_ANIMATION_DURATION_MS,
        easing: Easings.easeOutBack,
        onUpdate: (progress) => mesh.scale.setScalar(Math.max(progress, SPAWN_START_SCALE)),
      }),
    )

    return sceneObject
  }

  /** Spawns immediately at an exact transform, no animation — used by undo/redo and scene import. */
  spawnAt(type: PrimitiveType, position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3): SceneObject {
    const geometry = getSharedGeometry(type)
    const color = new THREE.Color(PRIMITIVE_COLORS[type])
    const material = createDefaultMaterial(color)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.quaternion.copy(quaternion)
    mesh.scale.copy(scale)
    mesh.castShadow = true
    mesh.receiveShadow = true

    const sceneObject = new SceneObject(mesh, type, color)
    // Back-reference so raycast hits (which only know the THREE.Object3D) can
    // resolve to their SceneObject in O(1) instead of scanning `all`.
    mesh.userData.sceneObject = sceneObject
    this.objects.set(sceneObject.uuid, sceneObject)
    this.group.add(mesh)
    return sceneObject
  }

  get all(): SceneObject[] {
    return [...this.objects.values()]
  }

  /** Iterates without allocating an array — prefer this in per-frame hot paths that don't need array methods. */
  forEach(callback: (object: SceneObject) => void): void {
    for (const object of this.objects.values()) callback(object)
  }

  get(uuid: string): SceneObject | undefined {
    return this.objects.get(uuid)
  }

  /** Removes an object immediately: unparents its mesh and disposes its per-instance material (geometry is shared, not disposed). */
  remove(object: SceneObject): void {
    if (!this.objects.delete(object.uuid)) return
    this.group.remove(object.mesh)
    object.material.dispose()
  }

  /** Removes every object, disposing each one's material. */
  clear(): void {
    for (const object of this.all) this.remove(object)
  }
}
