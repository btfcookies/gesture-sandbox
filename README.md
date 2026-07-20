# gesture-sandbox

A browser-based 3D sandbox you control entirely with your bare hands. A webcam feed runs through [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) to track hand poses in real time, which drive a [Three.js](https://threejs.org/) scene with [cannon-es](https://github.com/pmndrs/cannon-es) physics — spawn primitives, grab and rotate them, pinch-drag, two-hand scale, box-select, undo/redo, and export/import the scene, all with gestures.

Everything runs client-side. The hand-tracking model and MediaPipe's WASM runtime are staged locally so the app works fully offline once set up — no cloud AI calls, no frames leave your machine.

## Quick start

```sh
npm install
npm run setup:assets   # stages MediaPipe wasm + downloads the hand-landmark model (~40MB, one-time)
npm run dev
```

Open the printed local URL, grant camera access when prompted, and hold your hand up to the webcam.

> **Note:** Browsers only grant camera access (`getUserMedia`) on `localhost` or HTTPS. The Vite dev server on `localhost` works out of the box; a LAN/network URL will not unless it's served over HTTPS.

## Scripts

| Command | Description |
|---|---|
| `npm run setup:assets` | Copies the MediaPipe WASM runtime from `node_modules` and downloads `hand_landmarker.task` into `public/`. Required once before first run (and after a clean install) — these binaries are gitignored, not committed. |
| `npm run dev` | Starts the Vite dev server. |
| `npm run build` | Type-checks (`tsc`) and produces a production build in `dist/`. |
| `npm run preview` | Serves the production build locally. |

## Gestures

Hold your hand(s) up in the camera preview. The in-app **Gesture Guide** (the `?` button in the toolbar, or the on-screen hint) shows this same reference live.

| Gesture | Action |
|---|---|
| ✋ Open Palm | Hold for 1s to open the radial menu and spawn an object. |
| 🤏 Pinch | Select and drag an object. Also confirms a radial menu choice. |
| 👆 Point | Aim with your index finger to hover and highlight an object. |
| 🤛 Grab | Select an object, then twist your wrist to rotate it. |
| ✌️ Peace Sign | Drag to draw a box — everything inside becomes selected. |
| 👍 Thumbs Up | Duplicate the current selection. |
| 🙌 Two-Hand Pinch | Pinch with both hands and move them apart or together to scale the selection. |
| 👌 OK Sign | Hold for 1s while something is selected to delete it. |
| ✊ Closed Fist | Recognized by the gesture system, not yet bound to an action. |
| 🖐️ Release | Fires the instant a Grab ends; not yet bound to an action. |

Spawnable primitives: cube, sphere, cylinder, cone, torus, capsule, plane — each with its own accent color for quick identification.

## Keyboard shortcuts

Handy for testing without a webcam, or as a faster alternative to gestures.

| Key | Action |
|---|---|
| `Ctrl`/`Cmd` + `Z` | Undo |
| `Ctrl`/`Cmd` + `Y` | Redo |
| `Delete` / `Backspace` | Delete selection |
| `R` | Reset scene |
| `Space` | Pause/resume hand tracking |

## Toolbar

Floating bottom panel: **Undo**, **Redo**, **Reset**, **Physics** (toggle simulation on the scene), **Export** (download the scene as JSON), **Import** (load a scene from JSON), and **?** (open the Gesture Guide).

## Architecture

No framework — vanilla TypeScript + Three.js, organized by concern:

```
src/
  camera/       Webcam permission handling and device switching (CameraManager)
  tracking/     MediaPipe HandLandmarker wrapper, landmark smoothing (One Euro filter), hand metrics
  gestures/     Per-hand pose detectors (poses.ts) and gesture recognition/hold-tracking
  objects/      Scene object model, spawn/manipulate/select/duplicate/delete controllers, undo/redo (Command pattern), JSON scene (de)serialization
  physics/      cannon-es world wiring, per-object physics bodies
  rendering/    Three.js scene/camera/renderer setup, environment, postprocessing
  ui/           Toolbar, radial spawn menu, gesture guide, debug overlay, stats panel, keyboard shortcuts
  utilities/    Tweening, easing, filtering, small shared helpers
```

**Per-frame flow** (see `src/main.ts`): hand tracking runs on its own 30Hz cadence — decoupled from the render loop, which runs at full display refresh — since MediaPipe inference is the most expensive per-frame cost and webcams themselves only deliver ~30fps. Each tracking tick feeds a `HandTrackingFrame` through the gesture recognizer, spawn controller, and manipulation controller in sequence.

A dev-only hook (`window.__gestureSandbox`, tree-shaken out of production builds) exposes internal controllers and the Three.js scene in the console for manual testing without needing a webcam.

## Tech stack

- **Three.js** — rendering, scene graph
- **cannon-es** — physics simulation
- **@mediapipe/tasks-vision** — on-device hand landmark detection (WASM)
- **TypeScript** + **Vite** — build tooling, strict compiler settings (`noUnusedLocals`, `noUnusedParameters`, etc.)

## Requirements

- A webcam
- A browser with `getUserMedia` and WebAssembly SIMD support (current Chrome/Edge/Firefox/Safari)
- Reasonable, even lighting on your hand for reliable tracking
