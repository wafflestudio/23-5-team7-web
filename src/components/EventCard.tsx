import { useEffect, useMemo, useState } from 'react';
import type { EventStatus, EventSummary } from '../types';
import LikeButton from './LikeButton';

const statusColors: Record<EventStatus, string> = {
  READY: '#6b7280', // gray
  OPEN: '#16a34a', // green
  CLOSED: '#ea580c', // orange
  SETTLED: '#2563eb', // blue
  CANCELLED: '#111827', // near-black
};

interface Props {
  event: EventSummary;
  onLikeChanged?: (next: { likeCount: number; isLiked: boolean | null }) => void;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const EventCard = ({ event, onLikeChanged }: Props) => {
  const { title, status } = event;
  const description = event.description;
  const endIso = event.end_at;
  const startIso = (event as any).start_at
    ? String((event as any).start_at)
    : new Date(new Date(endIso).getTime() - 24 * 60 * 60 * 1000).toISOString();

  const start = useMemo(() => new Date(startIso), [startIso]);
  const end = useMemo(() => new Date(endIso), [endIso]);

  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    // Update progress frequently; 1s granularity feels responsive
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalMs = Math.max(0, end.getTime() - start.getTime());
  const elapsedMs = Math.min(
    Math.max(0, now.getTime() - start.getTime()),
    totalMs
  );
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  const progress = totalMs === 0 ? 100 : (elapsedMs / totalMs) * 100;

  const remainingLabel = useMemo(() => {
    if (!isFinite(remainingMs)) return '-';
    const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}분 남음`;
    return `약 ${hours}시간 ${minutes}분 남음`;
  }, [remainingMs]);

  const untilStartMs = Math.max(0, start.getTime() - now.getTime());
  const untilStartLabel = useMemo(() => {
    if (!isFinite(untilStartMs)) return '-';
    const totalMinutes = Math.ceil(untilStartMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}분 남음`;
    return `약 ${hours}시간 ${minutes}분 남음`;
  }, [untilStartMs]);

  const progressLabel = `${Math.round(progress)}%`;

  return (
    <article className="card">
      <header className="card-header">
        <span className="status-badge" style={{ backgroundColor: statusColors[status] }}>
          {status}
        </span>
        <h2 className="card-title">{title}</h2>
        <div style={{ marginLeft: 'auto' }}>
          <LikeButton
            size="sm"
            eventId={event.event_id}
            likeCount={event.like_count ?? 0}
            isLiked={event.is_liked ?? null}
            onChanged={onLikeChanged}
          />
        </div>
      </header>

      <div className="card-body">
        {description ? <p className="card-desc">{description}</p> : null}

        <div className="progress-section">
          {status === 'READY' ? (
            <div
              className="progress-label"
              style={{ textAlign: 'center', fontSize: '1.5em' }}
            >
              시작까지 {untilStartLabel}
            </div>
          ) : (
            <>
              <div className="progress-label">
                {status === 'CLOSED'
                  ? '종료됨 (정산 대기중)'
                  : status === 'SETTLED'
                    ? '종료됨 (정산 완료)'
                    : status === 'CANCELLED'
                      ? '취소됨'
                      : `마감까지 ${remainingLabel} • 경과율 ${progressLabel}`}
              </div>
              <div
                className="progress-container"
                role="progressbar"
                aria-label="이벤트 진행도"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <div className="progress-tooltip" aria-hidden="true">
                  <div>시작: {formatDateTime(startIso)}</div>
                  <div>종료: {formatDateTime(endIso)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="card-footer">
        <span className="event-id mono">ID: {event.event_id}</span>
      </footer>
    </article>
  );
};

export default EventCard;
