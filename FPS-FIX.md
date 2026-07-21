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
