import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export interface PostProcessing {
  render(): void
  setSize(width: number, height: number): void
  dispose(): void
}

/** Subtle bloom composer so emissive/bright edges glow without washing out the scene. */
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostProcessing {
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 0.92)
  composer.addPass(bloom)

  return {
    render(): void {
      composer.render()
    },
    setSize(width: number, height: number): void {
      composer.setSize(width, height)
      bloom.setSize(width, height)
    },
    dispose(): void {
      composer.dispose()
    },
  }
}
