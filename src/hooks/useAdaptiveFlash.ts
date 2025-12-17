import { useState, useEffect, useRef } from 'react';

export interface AdaptiveFlashResult {
  disableFlash: boolean;
  fps: number;
}

/**
 * Hook for adaptive flash control - automatically disables flash highlights
 * when FPS drops to maintain smooth performance, and re-enables when recovered.
 *
 * Uses hysteresis to prevent rapid toggling:
 * - Disable: FPS < 55 for 2 consecutive seconds
 * - Re-enable: FPS >= 58 for 3 consecutive seconds
 *
 * @returns {AdaptiveFlashResult} { disableFlash, fps }
 */
export function useAdaptiveFlash(): AdaptiveFlashResult {
  const [disableFlash, setDisableFlash] = useState(false);
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const consecutiveCountRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const measureFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;

        // Adaptive flash control with hysteresis
        // Disable: FPS < 55 for 2 consecutive seconds
        // Re-enable: FPS >= 58 for 3 consecutive seconds
        if (currentFps < 55 && !disableFlash) {
          consecutiveCountRef.current++;
          if (consecutiveCountRef.current >= 2) {
            setDisableFlash(true);
            consecutiveCountRef.current = 0;
          }
        } else if (currentFps >= 58 && disableFlash) {
          consecutiveCountRef.current++;
          if (consecutiveCountRef.current >= 3) {
            setDisableFlash(false);
            consecutiveCountRef.current = 0;
          }
        } else if (currentFps >= 55 && !disableFlash) {
          consecutiveCountRef.current = 0;
        }
      }

      rafRef.current = requestAnimationFrame(measureFps);
    };

    rafRef.current = requestAnimationFrame(measureFps);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [disableFlash]);

  return { disableFlash, fps };
}
