import { useCallback, useEffect, useRef, useState } from 'react';
import { listEvents } from '../api/events';
import type { EventStatus, EventSummary } from '../types';
import EventCard from './EventCard';

const statuses: EventStatus[] = [
  'READY',
  'OPEN',
  'CLOSED',
  'SETTLED',
  'CANCELLED',
];

const PAGE_SIZE = 10;

interface Props {
  // Bump this to force a refresh (e.g. after creating an event)
  refreshKey?: number;
}

const EventList = ({ refreshKey }: Props) => {
  const [filter, setFilter] = useState<EventStatus | ''>('');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [items, setItems] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const observingRef = useRef(false);
  const didInitialLoadRef = useRef(false);
  const lastResetKeyRef = useRef<string>('');
  const allowAutoLoadRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const bounceTickRef = useRef(0);
  const lastAutoLoadAtRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const fetchPage = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      // If we're explicitly resetting, clear any stuck loading flag first.
      if (opts.reset) loadingRef.current = false;

      if (loadingRef.current) {
        return;
      }
      if (!hasMoreRef.current && !opts.reset) {
        return;
      }

      // Prevent accidental "repeat first page" loads.
      // NOTE: cursor can be null briefly during reset; scroll/wheel handlers require near-bottom signals.
      if (!opts.reset && cursorRef.current === null) {
        return;
      }

      // Cancel any in-flight request so rapid filter toggles don't race.
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const seq = ++requestSeqRef.current;

      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        // Prevent "stuck loading" when the request hangs or never resolves.
        const res = await Promise.race([
          listEvents({
            status: filter || undefined,
            liked: onlyLiked ? true : undefined,
            cursor: opts.reset ? undefined : (cursorRef.current ?? undefined),
            limit: PAGE_SIZE,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error('이벤트 목록 요청이 시간 초과되었습니다.')),
              10000
            )
          ),
        ]);

        // If a newer request started, ignore stale results.
        if (seq !== requestSeqRef.current) return;

        setItems((prev) => {
          const next = opts.reset ? res.events : [...prev, ...res.events];
          // Deduplicate by event_id to avoid React key collisions if backend pages overlap
          // or if multiple load triggers fire close together.
          const seen = new Set<string>();
          const deduped: EventSummary[] = [];
          for (const ev of next) {
            if (seen.has(ev.event_id)) continue;
            seen.add(ev.event_id);
            deduped.push(ev);
          }
          return deduped;
        });
        cursorRef.current = res.next_cursor;
        // Keep cursor only in ref; UI doesn't render it.
        // Be defensive: if backend doesn't provide has_more, infer it from next_cursor.
        const inferredHasMore = Boolean(res.next_cursor);
        const nextHasMore =
          typeof res.has_more === 'boolean' ? res.has_more : inferredHasMore;
        hasMoreRef.current = nextHasMore;
        setHasMore(nextHasMore);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        const msg = e instanceof Error ? e.message : '이벤트 목록 로딩 실패';
        setError(msg);
        if (opts.reset) {
          setItems([]);
          cursorRef.current = null;
          hasMoreRef.current = true;
          setHasMore(true);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [filter, onlyLiked]
  );

  const maybeAutoLoadMore = useCallback(
    (_source: 'scroll' | 'wheel' | 'touchmove') => {
      allowAutoLoadRef.current = true;
      if (loadingRef.current || !hasMoreRef.current) return;

      const scrollTop = window.scrollY;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const distanceToBottom = docH - (scrollTop + viewportH);
      const nearBottom = distanceToBottom <= 120;

      // Cooldown to prevent rapid-fire loads during bounce.
      const now = Date.now();
      if (now - lastAutoLoadAtRef.current < 800) return;

      // If the user hasn't reached bottom area, do nothing.
      if (!nearBottom) return;

      // If we already have a cursor, a single near-bottom signal is enough.
      // If cursor is null (first page not committed yet), require repeated signals.
      if (cursorRef.current === null) {
        if (scrollTop <= lastScrollTopRef.current + 1) {
          bounceTickRef.current += 1;
        } else {
          bounceTickRef.current = 0;
        }
        lastScrollTopRef.current = scrollTop;
        if (bounceTickRef.current < 2) return;
      }

      lastAutoLoadAtRef.current = now;
      // (dev logging removed to satisfy lint rules)
      fetchPage();
    },
    [fetchPage]
  );

  useEffect(() => {
    const onScroll = () => maybeAutoLoadMore('scroll');
    const onWheel = (e: WheelEvent) => {
      // Only consider downward intent
      if (e.deltaY <= 0) return;
      maybeAutoLoadMore('wheel');
    };
    const onTouchMove = () => maybeAutoLoadMore('touchmove');

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
      // Safety: never leave a stuck loading ref across unmount/remount.
      loadingRef.current = false;
    };
  }, [maybeAutoLoadMore]);

  // Initial load + reset on filter/refreshKey change (deduped)
  useEffect(() => {
    const resetKey = `${filter}::${onlyLiked}::${refreshKey ?? ''}`;
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
    } else if (lastResetKeyRef.current === resetKey) {
      return;
    }
    lastResetKeyRef.current = resetKey;

    setItems([]);
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchPage({ reset: true });
  }, [filter, onlyLiked, refreshKey, fetchPage]);

  // Infinite scroll: load when sentinel appears
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasMoreRef.current) return;
        // Don't auto-fetch on initial load when the list is short and the sentinel is already visible.
        // Only start auto pagination after the user has scrolled at least once.
        if (!allowAutoLoadRef.current) return;
        if (loadingRef.current) return;
        if (observingRef.current) return;
        // Prevent a duplicate fetch before the first page has set cursor/hasMore.
        if (items.length === 0 && cursorRef.current === null) return;
        observingRef.current = true;
        fetchPage();
        // Release the gate on next frame so rapid successive intersections don't spam.
        requestAnimationFrame(() => {
          observingRef.current = false;
        });
      },
      // Load only when the user is REALLY near the bottom:
      // - negative bottom rootMargin means the sentinel must be deeper into view
      // - require most of the sentinel to be visible
      { root: null, rootMargin: '0px 0px -120px 0px', threshold: 0.9 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length, fetchPage]);

  // no-op; navigation via onOpenDetail

  return (
    <section>
      <div className="card" style={{ marginBottom: 12 }}>
        <div
          className="inline-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'nowrap',
          }}
        >
          <label>상태 필터</label>
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value as EventStatus | '')}
            style={{ maxWidth: 200 }}
          >
            <option value="">전체</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`button ${onlyLiked ? 'primary' : ''}`}
            title="좋아요한 이벤트만 보기"
            onClick={() => setOnlyLiked((v) => !v)}
          >
            좋아요만
          </button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="grid" style={{ marginTop: 12 }}>
        {loading && items.length === 0 ? (
          <p className="page-sub">불러오는 중…</p>
        ) : null}
        {items.map((ev) => (
          <a
            key={ev.event_id}
            href={`#/events/${ev.event_id}`}
            style={{ textDecoration: 'none' }}
          >
            <div style={{ cursor: 'pointer' }}>
              <EventCard
                event={ev}
                onLikeChanged={(next) => {
                  setItems((prev) => {
                    const updated = prev.map((x) =>
                      x.event_id === ev.event_id
                        ? {
                            ...x,
                            like_count: next.likeCount,
                            is_liked: next.isLiked,
                          }
                        : x
                    );
                    // If we're filtering liked=true server-side, immediately hide items that were unliked.
                    return onlyLiked
                      ? updated.filter((x) => x.is_liked === true)
                      : updated;
                  });
                }}
              />
            </div>
          </a>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} style={{ height: 120, marginTop: 24 }} />

      {loading && items.length > 0 ? (
        <p className="page-sub">더 불러오는 중…</p>
      ) : null}
      {!loading && !hasMore ? (
        <p className="page-sub" style={{ textAlign: 'center' }}>
          더 불러올 이벤트가 없습니다.
        </p>
      ) : null}
    </section>
  );
};

export default EventList;
