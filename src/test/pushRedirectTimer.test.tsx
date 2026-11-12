import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePushRedirectTimer } from '@/hooks/usePushRedirectTimer';
afterEach(() => vi.useRealTimers());
it('redirects after five seconds unless actively enabling, retaining remaining time', () => {
  vi.useFakeTimers(); const redirect = vi.fn();
  const { rerender } = renderHook(({ busy }) => usePushRedirectTimer(busy, redirect), { initialProps: { busy: false } });
  act(() => vi.advanceTimersByTime(2000)); rerender({ busy: true });
  act(() => vi.advanceTimersByTime(20000)); expect(redirect).not.toHaveBeenCalled();
  rerender({ busy: false }); act(() => vi.advanceTimersByTime(2999)); expect(redirect).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1)); expect(redirect).toHaveBeenCalledOnce();
});
