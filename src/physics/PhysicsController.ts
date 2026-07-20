import * as CANNON from 'cannon-es'
import { PhysicsWorld } from './PhysicsWorld.ts'
import { createBody } from './bodyFactory.ts'
import type { ObjectStore } from '../objects/ObjectStore.ts'
import type { SceneObject } from '../objects/SceneObject.ts'

/**
 * Optional gravity/collision simulation. When enabled, every object becomes
 * a dynamic rigid body that falls and collides with the floor and each
 * other; the mesh transform is read back from physics each frame. An object
 * currently being pinch-dragged or grab-rotated is kept kinematic and driven
 * by the mesh instead — gesture control always wins over simulation while
 * you're actively holding something.
 *
 * Known simplification: collision shapes are sized at spawn time and don't
 * follow Scale (Phase 5) afterward — resizing them live would mean rebuilding
 * the shape every frame, disproportionate to what this sandbox needs.
 */
export class PhysicsController {
  private readonly physicsWorld = new PhysicsWorld()
  private readonly objectStore: ObjectStore
  private readonly bodies = new Map<string, CANNON.Body>()
  private enabled = false

  constructor(objectStore: ObjectStore) {
    this.objectStore = objectStore
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  toggle(): void {
    this.setEnabled(!this.enabled)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) {
      for (const object of this.objectStore.all) this.ensureBody(object)
    } else {
      for (const body of this.bodies.values()) this.physicsWorld.world.removeBody(body)
      this.bodies.clear()
    }
  }

  update(deltaSeconds: number): void {
    if (!this.enabled) return
    // Computed once and reused below instead of re-reading objectStore.all
    // (each read spreads the object map into a fresh array).
    const objects = this.objectStore.all
    this.syncBodies(objects)

    for (const object of objects) {
      const body = this.bodies.get(object.uuid)
      if (!body) continue

      if (object.beingManipulated) {
        body.type = CANNON.Body.KINEMATIC
        body.position.set(object.position.x, object.position.y, object.position.z)
        body.quaternion.set(object.mesh.quaternion.x, object.mesh.quaternion.y, object.mesh.quaternion.z, object.mesh.quaternion.w)
        body.velocity.setZero()
        body.angularVelocity.setZero()
      } else if (body.type === CANNON.Body.KINEMATIC) {
        body.type = CANNON.Body.DYNAMIC
        body.wakeUp()
      }
    }

    this.physicsWorld.step(deltaSeconds)

    for (const object of objects) {
      const body = this.bodies.get(object.uuid)
      if (!body || object.beingManipulated) continue
      object.position.set(body.position.x, body.position.y, body.position.z)
      object.mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    }
  }

  /** Adds bodies for newly spawned objects and removes bodies for deleted ones. */
  private syncBodies(objects: SceneObject[]): void {
    for (const object of objects) this.ensureBody(object)
    if (this.bodies.size === objects.length) return // nothing removed since last sync

    const currentIds = new Set(objects.map((object) => object.uuid))
    for (const [uuid, body] of this.bodies) {
      if (!currentIds.has(uuid)) {
        this.physicsWorld.world.removeBody(body)
        this.bodies.delete(uuid)
      }
    }
  }

  private ensureBody(object: SceneObject): void {
    if (this.bodies.has(object.uuid)) return
    const body = createBody(object.type)
    body.position.set(object.position.x, object.position.y, object.position.z)
    body.quaternion.set(object.mesh.quaternion.x, object.mesh.quaternion.y, object.mesh.quaternion.z, object.mesh.quaternion.w)
    this.physicsWorld.world.addBody(body)
    this.bodies.set(object.uuid, body)
  }
}
