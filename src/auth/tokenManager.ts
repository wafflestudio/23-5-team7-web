import { refresh as refreshApi } from '../api/auth';
import { notifySessionChanged } from './session';

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_COOLDOWN_MS = 60 * 1000; // don't spam refresh

let lastActivityAt = Date.now();
let lastRefreshAt = 0;
let running = false;
let timer: number | null = null;

function hasAnyAuth() {
  const token = localStorage.getItem('access_token');
  const google = localStorage.getItem('auth_method') === 'google';
  return Boolean((token && token.trim()) || google);
}

function clearLocalSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('auth_method');
  notifySessionChanged();
}

function notifySessionExpired() {
  window.dispatchEvent(
    new CustomEvent('snutoto:session-expired', {
      detail: { reason: 'TOKEN_EXPIRED' },
    })
  );
}

async function maybeRefresh() {
  // Only refresh if we rely on cookies (google) or if access_token exists but may expire.
  if (!hasAnyAuth()) return;

  const now = Date.now();
  if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) return;

  // Only attempt refresh if user has been active recently.
  if (now - lastActivityAt > INACTIVITY_LIMIT_MS) return;

  lastRefreshAt = now;
  try {
    const res = await refreshApi();
    const data = res.data as {
      access_token?: string;
      user?: { user_id?: string; nickname?: string; email?: string };
    };

    // Backend may still return access_token even if it also sets HttpOnly cookies.
    if (data?.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }

    // Keep user info in localStorage in sync when provided.
    if (data?.user && typeof data.user.nickname === 'string') {
      const currentRaw = localStorage.getItem('user');
      let next: Record<string, unknown> = {};
      try {
        next = currentRaw
          ? (JSON.parse(currentRaw) as Record<string, unknown>)
          : {};
      } catch {
        next = {};
      }
      next.nickname = data.user.nickname;
      if (typeof data.user.email === 'string') next.email = data.user.email;
      if (typeof data.user.user_id === 'string') next.id = data.user.user_id;
      localStorage.setItem('user', JSON.stringify(next));
    }

    notifySessionChanged();
  } catch {
    // If refresh fails while the user is active, assume the session is no longer valid.
    clearLocalSession();
    notifySessionExpired();
  }
}

function checkInactivity() {
  if (!hasAnyAuth()) return;
  const now = Date.now();
  if (now - lastActivityAt > INACTIVITY_LIMIT_MS) {
    clearLocalSession();
  }
}

function scheduleTick() {
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    void maybeRefresh();
    checkInactivity();
  }, 30_000);
}

export function startTokenManager() {
  if (running) return;
  running = true;

  const onActivity = () => {
    lastActivityAt = Date.now();
    // If the user is active, keep the session fresh (at most once per minute).
    void maybeRefresh();
  };

  // Treat these as activity signals.
  window.addEventListener('pointerdown', onActivity, { passive: true });
  window.addEventListener('keydown', onActivity);
  window.addEventListener('scroll', onActivity, { passive: true });
  window.addEventListener('touchstart', onActivity, { passive: true });

  scheduleTick();

  // Kick off a refresh shortly after load if we might have cookie auth.
  window.setTimeout(() => {
    void maybeRefresh();
  }, 1000);
}
