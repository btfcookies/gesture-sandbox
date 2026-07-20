import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createGridTexture } from '../utilities/createGridTexture.ts'

export interface EnvironmentHandle {
  dispose(): void
}

const FLOOR_RADIUS = 6
const FLOOR_BASE_COLOR = '#0d0e14'

/**
 * Sets up scene lighting (procedural HDRI + directional key light), the
 * rounded grid floor, and floating coordinate axes.
 */
export function createEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): EnvironmentHandle {
  const disposables: Array<{ dispose(): void }> = []

  // Procedural HDRI via PMREM for soft image-based lighting, no external asset.
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRenderTarget.texture
  scene.environmentIntensity = 0.5
  // No scene.background: the renderer clears to transparent so the camera
  // feed underneath shows through, and 3D objects appear composited over it.
  pmremGenerator.dispose()
  disposables.push(envRenderTarget)

  const ambient = new THREE.AmbientLight(0x8899ff, 0.35)
  scene.add(ambient)

  const key = new THREE.DirectionalLight(0xffffff, 1.0)
  key.position.set(4, 6, 3)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 20
  key.shadow.camera.left = -6
  key.shadow.camera.right = 6
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -6
  key.shadow.radius = 4
  key.shadow.bias = -0.0005
  scene.add(key)
  scene.add(key.target)

  const rim = new THREE.DirectionalLight(0x6ee7ff, 0.25)
  rim.position.set(-5, 3, -4)
  scene.add(rim)

  const gridTexture = createGridTexture({ baseColor: FLOOR_BASE_COLOR, lineColor: 'rgba(150, 210, 255, 0.85)' })
  const floorGeometry = new THREE.CircleGeometry(FLOOR_RADIUS, 96)
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: gridTexture,
    roughness: 0.85,
    metalness: 0.15,
    // Kept translucent so it reads as an AR-style ground reference over the
    // camera feed instead of hiding most of the video behind an opaque disc.
    transparent: true,
    opacity: 0.4,
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  disposables.push(floorGeometry, floorMaterial, gridTexture)

  const axes = new THREE.AxesHelper(0.45)
  axes.position.set(0, 1.4, 0)
  const axesMaterial = axes.material as THREE.Material & { transparent: boolean; opacity: number }
  axesMaterial.transparent = true
  axesMaterial.opacity = 0.85
  scene.add(axes)
  disposables.push(axes.geometry, axesMaterial)

  return {
    dispose(): void {
      scene.remove(ambient, key, key.target, rim, floor, axes)
      for (const d of disposables) d.dispose()
    },
  }
}
