import { useEffect, useRef } from 'react';

// Retain elapsed time across a permission dialog; pause only while enabling.
export function usePushRedirectTimer(busy: boolean, redirect: () => void) {
  const remaining = useRef(5000);
  const callback = useRef(redirect);
  callback.current = redirect;
  useEffect(() => {
    if (busy) return;
    const started = Date.now();
    const timer = setTimeout(() => callback.current(), remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [busy]);
}
