import type { FingerName, TrackedHand } from '../tracking/types.ts'

// Curl thresholds (0 = straight .. 1 = fully curled), shared across poses.
// Loosened from initial guesses after real-world testing showed natural
// hand poses rarely hit the theoretical extremes (a relaxed "straight"
// finger still carries some curvature; a "curled" one rarely reaches a
// perfectly tight fist reading).
const EXTENDED_MAX_CURL = 0.4
const CURLED_MIN_CURL = 0.6
const TUCKED_MIN_CURL = 0.45

// Ratio of hand span (see handMetrics.computePinchDistance) — not meters.
const PINCH_MAX_RATIO = 0.35
const OK_SIGN_MAX_PINCH_RATIO = 0.35

// palmOpenness thresholds (0 = fist .. 1 = fully open). Also loosened per
// real-world testing — 0.8 for "open" and 0.15 for "closed" were only
// reachable with an almost cartoonishly flat/tight hand.
const OPEN_PALM_MIN_OPENNESS = 0.6
const CLOSED_FIST_MAX_OPENNESS = 0.2
// Looser than a closed fist: represents fingers curling around an implied
// object rather than a tight fully-closed fist. Deliberately overlaps with
// closed-fist's range (both can be true at once) — Grab-then-tighten-into-a-
// fist is the intended path into Delete.
const GRAB_MAX_OPENNESS = 0.4

// Normalized image space (y grows downward): how far above the wrist the
// thumb tip must sit to read as "pointing up" on screen.
const THUMBS_UP_MIN_VERTICAL_OFFSET = 0.05

// Minimum angle (radians) between index/middle finger directions for a
// clearly-spread peace sign, distinguishing it from two fingers held together.
const PEACE_SIGN_MIN_SPREAD_RADIANS = 0.12

function isExtended(hand: TrackedHand, finger: FingerName): boolean {
  return hand.fingers[finger].curl < EXTENDED_MAX_CURL
}

function isCurled(hand: TrackedHand, finger: FingerName): boolean {
  return hand.fingers[finger].curl > CURLED_MIN_CURL
}

function isTucked(hand: TrackedHand, finger: FingerName): boolean {
  return hand.fingers[finger].curl > TUCKED_MIN_CURL
}

/**
 * Flat open hand: all four fingers and the thumb extended, thumb tip clear
 * of the index tip. Those last two checks matter because both a natural
 * precision pinch (thumb touching index, other three fingers held straight)
 * and an OK sign (thumb-index circle, other three extended) barely bend the
 * fingers that feed palmOpenness — middle/ring/pinky stay straight and
 * index's partial curl gets diluted to 1/4 weight in the average, so
 * palmOpenness and thumb curl alone can still read as an open palm. Without
 * excluding both explicitly, pinch/okSign would fire alongside openPalm on
 * the same frame whenever pinchDistance lands just above the shared 0.35
 * ratio threshold (easy to do from camera-angle noise).
 */
export function isOpenPalm(hand: TrackedHand): boolean {
  return (
    hand.palmOpenness > OPEN_PALM_MIN_OPENNESS &&
    isExtended(hand, 'thumb') &&
    !isPinching(hand) &&
    !isOkSign(hand)
  )
}

/**
 * All five digits curled tightly into the palm. Checked per-finger (not just
 * average palmOpenness) so a crisp Point — index extended, other three
 * curled hard — can't tip the average past the closed-fist threshold and
 * fire both gestures at once.
 */
export function isClosedFist(hand: TrackedHand): boolean {
  return (
    hand.palmOpenness < CLOSED_FIST_MAX_OPENNESS &&
    isCurled(hand, 'index') &&
    isCurled(hand, 'middle') &&
    isCurled(hand, 'ring') &&
    isCurled(hand, 'pinky') &&
    isCurled(hand, 'thumb')
  )
}

/**
 * Thumb tip and index tip touching, with middle/ring/pinky NOT all extended.
 * That last part matters: an OK sign satisfies the same thumb-index distance
 * check, so without excluding it, every OK sign would also register as a
 * pinch (and PinchDragController would drag whatever's under the hand while
 * the user is trying to hold OK Sign for delete).
 */
export function isPinching(hand: TrackedHand): boolean {
  if (hand.pinchDistance >= PINCH_MAX_RATIO) return false
  return !(isExtended(hand, 'middle') && isExtended(hand, 'ring') && isExtended(hand, 'pinky'))
}

/** Index extended, everything else (including the thumb) tucked in. */
export function isPointing(hand: TrackedHand): boolean {
  return (
    isExtended(hand, 'index') &&
    isCurled(hand, 'middle') &&
    isCurled(hand, 'ring') &&
    isCurled(hand, 'pinky') &&
    isTucked(hand, 'thumb')
  )
}

/** Index and middle extended and spread apart, ring/pinky curled, thumb tucked. */
export function isPeaceSign(hand: TrackedHand): boolean {
  if (!isExtended(hand, 'index') || !isExtended(hand, 'middle')) return false
  if (!isCurled(hand, 'ring') || !isCurled(hand, 'pinky')) return false
  if (!isTucked(hand, 'thumb')) return false
  const spread = hand.fingers.index.direction.angleTo(hand.fingers.middle.direction)
  return spread > PEACE_SIGN_MIN_SPREAD_RADIANS
}

/** Thumb extended and clearly above the wrist on screen, everything else curled into a fist. */
export function isThumbsUp(hand: TrackedHand): boolean {
  if (!isExtended(hand, 'thumb')) return false
  if (!isCurled(hand, 'index') || !isCurled(hand, 'middle') || !isCurled(hand, 'ring') || !isCurled(hand, 'pinky')) {
    return false
  }
  const thumbTip = hand.fingers.thumb.joints[hand.fingers.thumb.joints.length - 1]!
  return hand.wrist.y - thumbTip.y > THUMBS_UP_MIN_VERTICAL_OFFSET
}

/** Thumb and index touching in a circle, middle/ring/pinky extended. */
export function isOkSign(hand: TrackedHand): boolean {
  return (
    hand.pinchDistance < OK_SIGN_MAX_PINCH_RATIO &&
    isExtended(hand, 'middle') &&
    isExtended(hand, 'ring') &&
    isExtended(hand, 'pinky')
  )
}

/**
 * Fingers curling in as if gripping something — looser than a full closed
 * fist. Excludes an in-progress pinch: curling the index to meet the thumb
 * drags the other three fingers partially closed too (shared flexor tendons
 * mean fingers don't curl in isolation), which is enough on its own to cross
 * this loose a threshold and would otherwise fire grab on every pinch.
 */
export function isGrabbing(hand: TrackedHand): boolean {
  return hand.palmOpenness < GRAB_MAX_OPENNESS && !isPinching(hand)
}
