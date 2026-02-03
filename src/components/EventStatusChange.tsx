import { useEffect, useState } from 'react';
import { settleEvent, updateEventStatus } from '../api/events';
import type { EventDetail, EventStatus } from '../types';

interface Props {
  event: EventDetail;
  onUpdated?: (ev: EventDetail) => void;

  // Render either the status-change UI or the settlement UI.
  mode: 'status' | 'settle';
  onClose?: () => void;
}

const allStatuses: EventStatus[] = [
  'READY',
  'OPEN',
  'CLOSED',
  'CANCELLED',
];

const EventStatusChange = ({
  event,
  onUpdated,
  mode,
  onClose,
}: Props) => {
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local UI state in sync when event changes
  useEffect(() => {
    setStatus(event.status);
    setWinnerIds([]);
    setError(null);
  }, [event.event_id, event.status, mode]);

  const toggleWinner = (id: string) => {
    setWinnerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const updated = await updateEventStatus(event.event_id, { status });
      onUpdated?.(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '상태 변경 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitSettle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (winnerIds.length === 0) {
        setError('승리 옵션을 1개 이상 선택해주세요.');
        return;
      }
      const updated = await settleEvent(event.event_id, {
        winner_option_id: winnerIds,
      });
      onUpdated?.(updated);
      setWinnerIds([]);
      onClose?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '정산 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {mode === 'status' ? (
        <div className="inline-row">
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus)}
          >
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button" onClick={submit} disabled={loading}>
              상태 변경
            </button>
            {onClose ? (
              <button className="button" type="button" disabled={loading} onClick={onClose}>
                닫기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === 'settle' ? (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>결과 정산</div>
          <p className="page-sub" style={{ marginTop: 0 }}>
            CLOSED 상태에서 승리 옵션을 선택하고 정산할 수 있어요. (복수 선택 가능)
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {event.options.map((o) => (
              <label key={o.option_id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={winnerIds.includes(o.option_id)}
                  onChange={() => toggleWinner(o.option_id)}
                />
                <span>{o.name}</span>
              </label>
            ))}
          </div>
          <div className="modal-footer" style={{ paddingTop: 10 }}>
            {onClose ? (
              <button className="button" type="button" onClick={onClose} disabled={loading}>
                닫기
              </button>
            ) : null}
            <button className="button primary" onClick={submitSettle} disabled={loading}>
              정산 확정
            </button>
          </div>
        </div>
      ) : null}

      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default EventStatusChange;
