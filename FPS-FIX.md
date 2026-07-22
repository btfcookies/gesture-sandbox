# FPS fix — 2026-07-21

## The problem

The app was rendering the entire 3D scene **twice** on every single
frame, even when the scene was empty and nothing was happening.

## Why

The bloom/glow effect (`src/rendering/postprocessing.ts`) needs two
things: the normal picture of the scene, and a blurred "glow-only"
version of it to blend on top. The old code drew the whole scene once
to build the normal picture, and then drew the *entire scene all over
again* just to feed the glow effect — two full draws per frame,
forever, whether or not anything was on screen.

## The fix

The scene now gets drawn **once** per frame. That single drawn image
is then reused both as the normal picture and as the input to the
glow effect, instead of re-drawing everything a second time. Visually
nothing changes — same glow, same look — it's just no longer wasting
a full render pass to get there.

## What this means for you

Roughly half the GPU work the app was doing every frame, at idle, is
gone. Everything else in the render loop (hand tracking at 30Hz,
shadows, physics, etc.) was already reasonably lean, so this was the
single biggest lever available.

## Verified

- `npx tsc --noEmit` — clean
- `npm run build` — succeeds
- Ran the app in a headless browser and confirmed the scene (grid
  floor, axes, glow, UI) still renders correctly with no console
  errors after the change

## Round 2 — 2026-07-22

Site was still averaging ~9fps in production after the fix above, so
this round went looking for costs the first pass wouldn't have
caught — things outside the WebGL render loop itself.

### The problem

Two more sinks, neither visible to normal JS/render-loop profiling:

1. **`backdrop-filter: blur()` on the stats panel and toolbar.** Both
   sit on top of a full-viewport WebGL canvas and a live `<video>`
   feed, both of which redraw every frame. `backdrop-filter` forces
   the browser to re-blur whatever's behind the element on every
   composited frame — so the compositor was doing a full-screen blur
   of that constantly-animating backdrop forever, just to render a
   few lines of text. Pure GPU compositor cost, invisible to any
   Three.js/JS profiling.

2. **Gesture/hover/manipulation logic running on every display
   refresh instead of every tracking update.** Hand tracking inference
   was already throttled to 30Hz, but the code that *consumes* that
   data (raycasting for hover, the gesture state machine, the spawn
   menu, rotate/scale/box-select) ran unconditionally on every
   `requestAnimationFrame` — up to 90–144Hz on high-refresh monitors.
   That's 3–5x redundant work reprocessing identical stale hand data
   for every one real update. The radial menu also called
   `getBoundingClientRect()` (a forced layout reflow) on every one of
   those redundant calls while open.

### The fix

- Dropped `backdrop-filter` from `.panel` and `.radial-menu-item`,
  raised their background opacity instead — reads the same as a solid
  HUD without paying to re-blur a moving backdrop every frame.
- Gated the hover/gesture/spawn/manipulation update calls behind the
  same 30Hz tracking clock as the data they consume, instead of
  running every rAF. Verified every timing check in that pipeline
  (hold thresholds, menu timeouts) keys off the tracking frame's own
  timestamp, not wall-clock delta, so this doesn't change behavior —
  it just stops redoing the same work. The one thing that *does* need
  the full render clock — the hover/select glow fading in and out —
  was split into its own call so it stays smooth.
- Cached the radial menu's anchor point on open instead of reading
  layout on every pointer update.

### Verified

- `npx tsc --noEmit` — clean
- `npm run build` — succeeds
- Ran the app in a headless browser: loads with no console errors,
  stats panel and toolbar render correctly with the new solid
  background, no visual regressions.
