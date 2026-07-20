import * as THREE from 'three'

export type TickCallback = (delta: number, elapsed: number) => void
export type ResizeCallback = (width: number, height: number) => void

/**
 * Owns the renderer, camera, and animation loop. Other modules plug in via
 * addTickCallback/addResizeCallback rather than reaching into the loop directly.
 */
export class SceneManager {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer

  private readonly timer = new THREE.Timer()
  private readonly tickCallbacks = new Set<TickCallback>()
  private readonly resizeCallbacks = new Set<ResizeCallback>()
  private renderCallback: TickCallback = () => this.renderer.render(this.scene, this.camera)
  private frameId: number | null = null
  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    this.camera.position.set(5, 3.6, 6.5)
    this.camera.lookAt(0, 0.6, 0)

    // antialias is intentionally off: the scene renders through an
    // EffectComposer (see postprocessing.ts), which draws into its own plain
    // (non-multisampled) render target — MSAA on this context's backbuffer
    // never gets used, so enabling it here would only cost GPU memory/bandwidth.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    // Capped below the display's native ratio: at 3x on common high-DPI
    // laptops, shadows + bloom + a full alpha-composited canvas over live
    // video were pushing well past what integrated GPUs keep up with at 60fps.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.shadowMap.enabled = true
    // PCFShadowMap instead of VSMShadowMap: VSM runs an extra blur render
    // pass per shadow-casting light every frame; PCF samples within the
    // shading pass itself for close-enough quality at lower cost here.
    // (PCFSoftShadowMap is deprecated in this three.js version and silently
    // downgrades to PCFShadowMap anyway, with a console warning.)
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    window.addEventListener('resize', this.handleResize)
    this.handleResize()
  }

  addTickCallback(cb: TickCallback): void {
    this.tickCallbacks.add(cb)
  }

  removeTickCallback(cb: TickCallback): void {
    this.tickCallbacks.delete(cb)
  }

  addResizeCallback(cb: ResizeCallback): void {
    this.resizeCallbacks.add(cb)
  }

  /** Replaces the default renderer.render() call, e.g. to route through a post-processing composer. */
  setRenderCallback(cb: TickCallback): void {
    this.renderCallback = cb
  }

  start(): void {
    if (this.frameId !== null) return
    this.timer.connect(document)
    const loop = () => {
      this.frameId = requestAnimationFrame(loop)
      this.timer.update()
      const delta = this.timer.getDelta()
      const elapsed = this.timer.getElapsed()
      for (const cb of this.tickCallbacks) cb(delta, elapsed)
      this.renderCallback(delta, elapsed)
    }
    this.frameId = requestAnimationFrame(loop)
  }

  stop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  dispose(): void {
    this.stop()
    this.timer.disconnect()
    window.removeEventListener('resize', this.handleResize)
    this.renderer.dispose()
  }

  private handleResize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth
    const height = this.canvas.clientHeight || window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    for (const cb of this.resizeCallbacks) cb(width, height)
  }
}
