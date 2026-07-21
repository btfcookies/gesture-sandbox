import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export interface PostProcessing {
  render(): void
  setSize(width: number, height: number): void
  dispose(): void
}

const MIX_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Adds the bloom glow on top of the base render while keeping the base
// render's own alpha, instead of UnrealBloomPass's composited alpha (always
// opaque) — see createPostProcessing for why that matters here.
const MIX_FRAGMENT_SHADER = `
  uniform sampler2D baseTexture;
  uniform sampler2D bloomTexture;
  varying vec2 vUv;
  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 bloom = texture2D(bloomTexture, vUv);
    gl_FragColor = vec4(base.rgb + bloom.rgb, base.a);
  }
`

/**
 * Subtle bloom composer so emissive/bright edges glow without washing out the scene.
 *
 * UnrealBloomPass's own composite shader always writes alpha = 1, so wiring
 * it directly into the main composer (as a plain addPass) turns the whole
 * canvas opaque and hides the camera feed behind a solid backdrop. Bloom is
 * rendered into its own offscreen composer instead, and only its RGB is
 * mixed back into the base render — which keeps the base render's real
 * alpha (transparent where there's no scene geometry) intact.
 *
 * The scene itself is rendered exactly once per frame, into `baseTarget`.
 * Both the bloom chain and the final mix read that same texture (via
 * TexturePass) instead of each owning their own RenderPass — an earlier
 * version gave bloomComposer and composer their own RenderPass instances,
 * which drew every object in the scene twice per frame for no visual
 * difference and was the single biggest cost in the render loop.
 */
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostProcessing {
  const pixelRatio = renderer.getPixelRatio()
  const size = renderer.getSize(new THREE.Vector2())
  const baseTarget = new THREE.WebGLRenderTarget(size.width * pixelRatio, size.height * pixelRatio, {
    type: THREE.HalfFloatType,
  })
  baseTarget.texture.name = 'PostProcessing.base'

  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(new TexturePass(baseTarget.texture))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 0.92)
  bloomComposer.addPass(bloom)

  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: baseTarget.texture },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: MIX_VERTEX_SHADER,
      fragmentShader: MIX_FRAGMENT_SHADER,
    }),
  )

  const composer = new EffectComposer(renderer)
  composer.addPass(mixPass)

  return {
    render(): void {
      renderer.setRenderTarget(baseTarget)
      renderer.setClearAlpha(0)
      renderer.clear(true, true, true)
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)

      bloomComposer.render()
      composer.render()
    },
    setSize(width: number, height: number): void {
      const ratio = renderer.getPixelRatio()
      baseTarget.setSize(width * ratio, height * ratio)
      composer.setSize(width, height)
      bloomComposer.setSize(width, height)
      bloom.setSize(width, height)
    },
    dispose(): void {
      baseTarget.dispose()
      composer.dispose()
      bloomComposer.dispose()
    },
  }
}
