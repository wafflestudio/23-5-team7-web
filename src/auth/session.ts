import { useEffect, useSyncExternalStore } from 'react';

function isLoggedInNow() {
  const token = localStorage.getItem('access_token');
  return Boolean(token && token.trim().length > 0);
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'access_token') cb();
  };
  window.addEventListener('storage', onStorage);

  // Same-tab updates: dispatch a custom event
  const onSession = () => cb();
  window.addEventListener('snutoto:session', onSession as EventListener);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('snutoto:session', onSession as EventListener);
  };
}

export function notifySessionChanged() {
  window.dispatchEvent(new Event('snutoto:session'));
}

export function useIsLoggedIn() {
  return useSyncExternalStore(subscribe, isLoggedInNow, () => false);
}

// Convenience hook to re-run effects when login state changes
export function useSessionEffect(effect: () => void | (() => void), deps: any[] = []) {
  const isLoggedIn = useIsLoggedIn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, [isLoggedIn, ...deps]);
}
