import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SceneManager } from './rendering/SceneManager.ts'
import { createEnvironment } from './rendering/environment.ts'
import { createPostProcessing } from './rendering/postprocessing.ts'
import { CameraPreviewWidget } from './ui/CameraPreviewWidget.ts'
import { DebugOverlay } from './ui/DebugOverlay.ts'
import { StatsPanel } from './ui/StatsPanel.ts'
import { Toolbar } from './ui/Toolbar.ts'
import { KeyboardShortcuts } from './ui/KeyboardShortcuts.ts'
import { GestureGuide } from './ui/GestureGuide.ts'
import { HandTracker } from './tracking/HandTracker.ts'
import { GestureRecognizer } from './gestures/GestureRecognizer.ts'
import { TweenManager } from './utilities/TweenManager.ts'
import { ObjectStore } from './objects/ObjectStore.ts'
import { HistoryManager } from './objects/HistoryManager.ts'
import { ObjectSpawnController } from './objects/ObjectSpawnController.ts'
import { ManipulationController } from './objects/ManipulationController.ts'
import { exportScene, importScene } from './objects/SceneSerializer.ts'
import { PhysicsController } from './physics/PhysicsController.ts'
import type { Handedness, HandTrackingFrame } from './tracking/types.ts'
import type { GestureName } from './gestures/types.ts'

const app = document.querySelector<HTMLDivElement>('#app')!

const canvas = document.createElement('canvas')
canvas.id = 'scene-canvas'

// The camera preview owns the canvas's placement in the DOM so the 3D scene
// composites directly on top of the full-screen camera feed.
const cameraPreview = new CameraPreviewWidget(app, canvas)
void cameraPreview.start()

const sceneManager = new SceneManager(canvas)
createEnvironment(sceneManager.scene, sceneManager.renderer)

const controls = new OrbitControls(sceneManager.camera, sceneManager.renderer.domElement)
controls.target.set(0, 0.6, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 1.5
controls.maxDistance = 12
controls.maxPolarAngle = Math.PI / 2 - 0.02
sceneManager.addTickCallback(() => controls.update())

const postProcessing = createPostProcessing(sceneManager.renderer, sceneManager.scene, sceneManager.camera)
sceneManager.setRenderCallback(() => postProcessing.render())
sceneManager.addResizeCallback((width, height) => postProcessing.setSize(width, height))

const tweenManager = new TweenManager()
sceneManager.addTickCallback((delta) => tweenManager.update(delta * 1000))

const objectStore = new ObjectStore(sceneManager.scene, tweenManager)
const physicsController = new PhysicsController(objectStore)
const history = new HistoryManager()

sceneManager.start()

const debugOverlay = new DebugOverlay(app)
const statsPanel = new StatsPanel(app)
const gestureGuide = new GestureGuide(app)
const handTracker = new HandTracker()
void handTracker.initialize()

const gestureRecognizer = new GestureRecognizer()
const objectSpawnController = new ObjectSpawnController(app, gestureRecognizer, objectStore, sceneManager.camera, history)
const manipulationController = new ManipulationController(
  app,
  gestureRecognizer,
  objectStore,
  sceneManager.camera,
  tweenManager,
  history,
)

let trackingPaused = false

const EMPTY_TRACKING_FRAME: HandTrackingFrame = { hands: [], timestampMs: 0 }

// MediaPipe inference + the mirrored-frame canvas redraw it runs on are the
// most expensive thing in this app's per-frame budget. Running that at every
// rAF (potentially 90-144Hz on high refresh displays) bought no tracking
// benefit — webcams themselves only deliver ~30fps — and blocked rendering
// with it. Decoupling detection onto its own 30Hz cadence lets the render
// loop (orbit controls, tweens, the 3D scene) run at full display refresh
// while gesture tracking updates at a rate that already matches its source.
const TRACKING_INTERVAL_MS = 1000 / 30
let lastTrackingAtMs = -Infinity
let latestTrackingFrame: HandTrackingFrame = EMPTY_TRACKING_FRAME

const toolbar = new Toolbar(app, {
  onUndo: () => history.undo(),
  onRedo: () => history.redo(),
  onReset: () => {
    objectStore.clear()
    manipulationController.selection.clear()
    history.clear()
  },
  onTogglePhysics: () => {
    physicsController.toggle()
    toolbar.setPhysicsActive(physicsController.isEnabled)
  },
  onExport: () => downloadJson(exportScene(objectStore), 'gesture-sandbox-scene.json'),
  onImport: (file) => {
    void file.text().then((text) => {
      try {
        importScene(text, objectStore)
        manipulationController.selection.clear()
        history.clear()
      } catch (error) {
        alert(`Could not import scene: ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  },
  onHelp: () => (gestureGuide.isOpen ? gestureGuide.close() : gestureGuide.open()),
})

new KeyboardShortcuts({
  onReset: () => {
    objectStore.clear()
    manipulationController.selection.clear()
    history.clear()
  },
  onDeleteSelected: () => manipulationController.deleteSelection(),
  onUndo: () => history.undo(),
  onRedo: () => history.redo(),
  onTogglePause: () => {
    trackingPaused = !trackingPaused
  },
})

sceneManager.addTickCallback((delta, _elapsed) => {
  physicsController.update(delta)

  // Hover/gesture/spawn/manipulation pose logic only has new work when a
  // tracking frame actually changed — the frame is throttled to 30Hz above,
  // but this tick callback runs every rAF (up to 90-144Hz on high refresh
  // displays). Re-running raycasts and gesture state machines against
  // byte-identical stale data multiple times per real update was pure waste;
  // gating them on the same clock as the data they consume cuts that out.
  // All timing inside these (hold thresholds, menu timeouts) keys off
  // frame.timestampMs, not wall-clock delta, so this is behavior-preserving.
  if (trackingPaused || gestureGuide.isOpen) {
    latestTrackingFrame = EMPTY_TRACKING_FRAME
    lastTrackingAtMs = -Infinity // resume instantly (no stale-interval wait) once unpaused
  } else {
    const now = performance.now()
    if (now - lastTrackingAtMs >= TRACKING_INTERVAL_MS) {
      lastTrackingAtMs = now
      latestTrackingFrame = handTracker.update(cameraPreview.videoElement, now)

      manipulationController.updateHover(latestTrackingFrame)
      gestureRecognizer.update(latestTrackingFrame)
      objectSpawnController.update(latestTrackingFrame)
      manipulationController.update(latestTrackingFrame)

      const frame = latestTrackingFrame

      const handGestureNames = new Map<Handedness, GestureName[]>()
      for (const hand of frame.hands) {
        handGestureNames.set(hand.handedness, gestureRecognizer.getActiveGestureNames(hand.handedness))
      }
      const frameGestureNames = gestureRecognizer.getActiveGestureNames('both')

      debugOverlay.update(frame, handGestureNames, frameGestureNames)
      cameraPreview.updateHands(frame.hands)

      const allActiveGestures = [...new Set([...handGestureNames.values()].flat().concat(frameGestureNames))]
      const averageConfidence =
        frame.hands.length > 0 ? frame.hands.reduce((sum, hand) => sum + hand.confidence, 0) / frame.hands.length : 0
      statsPanel.update(delta, frame.hands.length, averageConfidence, allActiveGestures)
    }
  }

  // Runs every rAF regardless of tracking cadence: the hover/select glow
  // damp needs the render clock to stay visually smooth.
  manipulationController.tick(delta)

  toolbar.setUndoEnabled(history.canUndo)
  toolbar.setRedoEnabled(history.canRedo)
})

function downloadJson(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

// Dev-only test hook (tree-shaken out of production builds) so gesture ->
// spawn flows can be exercised end-to-end with synthetic hand data.
if (import.meta.env.DEV) {
  ;(window as unknown as { __gestureSandbox: unknown }).__gestureSandbox = {
    THREE,
    camera: sceneManager.camera,
    gestureRecognizer,
    objectStore,
    objectSpawnController,
    manipulationController,
    physicsController,
    history,
    gestureGuide,
  }
}
