import { useEffect, useMemo, useState } from 'react';
import type { EventStatus, TotoEvent } from '../types';

const statusColors: Record<EventStatus, string> = {
  READY: '#6b7280', // gray
  OPEN: '#16a34a', // green
  CLOSED: '#ea580c', // orange
  SETTLED: '#2563eb', // blue
  CANCELLED: '#111827', // near-black
};

interface Props {
  event: TotoEvent;
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

// Assumption: created_at is the start time for progress purposes
const EventCard = ({ event }: Props) => {
  const start = useMemo(() => new Date(event.created_at), [event.created_at]);
  const end = useMemo(() => new Date(event.close_time), [event.close_time]);

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

  const progressLabel = `${Math.round(progress)}%`;

  return (
    <article className="card">
      <header className="card-header">
        <span
          className="status-badge"
          style={{ backgroundColor: statusColors[event.status] }}
        >
          {event.status}
        </span>
        <h2 className="card-title">{event.title}</h2>
      </header>

      <div className="card-body">
        <p className="card-desc">{event.description}</p>

        <div className="progress-section">
          <div className="progress-label">
            마감까지 {remainingLabel} • 경과율 {progressLabel}
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
              <div>시작: {formatDateTime(event.created_at)}</div>
              <div>종료: {formatDateTime(event.close_time)}</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="card-footer">
        <span className="event-id mono">ID: {event.event_id}</span>
      </footer>
    </article>
  );
};

export default EventCard;
