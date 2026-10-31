/**
 * utils/animate.js
 * requestAnimationFrame based number counter. Only runs once per call and is skipped
 * entirely when the user prefers reduced motion.
 */

import { prefersReducedMotion } from '../core/dom.js';

const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

/**
 * @param {(value:number)=>void} onFrame  called with the current interpolated value
 * @returns {() => void} cancel function
 */
export function animateNumber({ from = 0, to, duration = 650, onFrame }) {
  if (prefersReducedMotion() || from === to) {
    onFrame(to);
    return () => {};
  }

  let frameId;
  const startedAt = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    onFrame(from + (to - from) * easeOutCubic(progress));
    if (progress < 1) frameId = requestAnimationFrame(tick);
  };

  onFrame(from);
  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}
