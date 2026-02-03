interface OddsMessageInitial {
  type: 'initial';
  event_id: string;
  options: Array<{ option_id: string; name: string; odds: number }>;
}

interface OddsMessageUpdate {
  type: 'odds_update';
  event_id: string;
  options: Array<{ option_id: string; odds: number }>;
}

export type OddsMessage = OddsMessageInitial | OddsMessageUpdate;

export function getOddsWsUrl(eventId: string) {
  // Optional override (explicit websocket base)
  // Example: VITE_WS_BASE_URL=wss://server.snutoto.o-r.kr
  const wsBase = (import.meta.env.VITE_WS_BASE_URL as string | undefined) ?? '';
  if (wsBase)
    return `${wsBase.replace(/\/$/, '')}/api/events/ws/${encodeURIComponent(eventId)}`;

  // Otherwise, derive from HTTP API base (if set) so dev/prod match automatically.
  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  if (apiBase) {
    try {
      const u = new URL(apiBase);
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${u.host}/api/events/ws/${encodeURIComponent(eventId)}`;
    } catch {
      // ignore parse errors and fall through
    }
  }

  // Final fallback: same-origin host (works with local dev if backend is same host)
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/api/events/ws/${encodeURIComponent(eventId)}`;
}
