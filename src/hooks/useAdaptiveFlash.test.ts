import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAdaptiveFlash } from './useAdaptiveFlash';

describe('useAdaptiveFlash', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with flash enabled and fps at 60', () => {
    const { result } = renderHook(() => useAdaptiveFlash());

    expect(result.current.disableFlash).toBe(false);
    expect(result.current.fps).toBe(60);
  });

  it('returns disableFlash and fps properties', () => {
    const { result } = renderHook(() => useAdaptiveFlash());

    expect(typeof result.current.disableFlash).toBe('boolean');
    expect(typeof result.current.fps).toBe('number');
  });

  it('cleans up requestAnimationFrame on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = renderHook(() => useAdaptiveFlash());
    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('calls requestAnimationFrame on mount', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    renderHook(() => useAdaptiveFlash());

    expect(rafSpy).toHaveBeenCalled();
  });
});
