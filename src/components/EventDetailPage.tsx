import { useEffect, useMemo, useState } from 'react';
import { getEvent } from '../api/events';
import { createBet } from '../api/events';
import type { EventDetail, EventStatus } from '../types';
import EventStatusChange from './EventStatusChange';

interface Props {
  eventId: string;
  onBack: () => void;
}

const EventDetailPage = ({ eventId, onBack }: Props) => {
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [betOpen, setBetOpen] = useState(false);
  const [betAmount, setBetAmount] = useState<string>('');
  const [betError, setBetError] = useState<string | null>(null);
  const [betLoading, setBetLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // local editable state (API + fallback)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closeTime, setCloseTime] = useState(''); // ISO
  // For settlement testing: default to CLOSED until real API value arrives.
  const [status, setStatus] = useState<EventStatus>('CLOSED');

  // The event detail API response doesn't currently include created_at in our types.
  // We'll derive a reasonable start time for the tooltip from end_at (minus 24h).
  const [createdAt, setCreatedAt] = useState<string>(''); // ISO (optional)
  const [options, setOptions] = useState<EventDetail['options']>([]);
  const [images, setImages] = useState<EventDetail['images']>([]);

  const totalBetAmount = useMemo(() => {
    return options.reduce((acc, o) => acc + (o.option_total_amount ?? 0), 0);
  }, [options]);

  const selectedOption = useMemo(() => {
    if (!selectedOptionId) return null;
    return options.find((o) => o.option_id === selectedOptionId) ?? null;
  }, [options, selectedOptionId]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('ko-KR').format(Math.round(n));

  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Global click handler for clearing option selection.
  // Some nested elements stop propagation / live in portals; capturing at document
  // level is the most reliable way to make "click anywhere to clear" work.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;

      // Don't clear when clicking on interactive controls.
      const interactive = t.closest(
        'button,a,input,select,textarea,label,[role="button"],[role="checkbox"],[role="radio"]'
      );
      if (interactive) return;

      // Don't clear when clicking inside an option card itself.
      // (Clicking an option card should toggle selection, not immediately unselect.)
      const inOption = t.closest('.option-card');
      if (inOption) return;

      setSelectedOptionId(null);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getEvent(eventId);
        if (!alive) return;
        setTitle(res.title);
        setStatus(res.status);
        setCloseTime(res.end_at ?? '');
        setOptions(res.options ?? []);
        setImages(res.images ?? []);
        setCreatedAt('');
        setDescription(res.description ?? '');
        setSelectedOptionId(null);
        setBetOpen(false);
        setBetAmount('');
        setBetError(null);
        setLightboxUrl(null);
        // Close panels when navigating to a different event
        setStatusModalOpen(false);
        setSettleModalOpen(false);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : '이벤트 상세 로딩 실패';
        setError(msg);
        setTitle('이벤트');
        setDescription('');
        setCloseTime('');
  setStatus('CLOSED');
        setCreatedAt('');
        setOptions([]);
        setImages([]);
        setSelectedOptionId(null);
        setBetOpen(false);
        setBetAmount('');
        setBetError(null);
        setLightboxUrl(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eventId]);

  const refreshEvent = async () => {
    const res = await getEvent(eventId);
    setTitle(res.title);
    setStatus(res.status);
    setCloseTime(res.end_at ?? '');
    setOptions(res.options ?? []);
    setImages(res.images ?? []);
    setDescription(res.description ?? '');
  };
  const normalizePointInput = (raw: string) => {
    // Keep digits only (so users can paste with commas)
    const digits = raw.replace(/[^0-9]/g, '');
    // Prevent extremely long values
    return digits.slice(0, 10);
  };

  const parsePointAmount = (raw: string) => {
    const cleaned = normalizePointInput(raw);
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return 0;
    return Math.floor(n);
  };

  const detail = useMemo<EventDetail>(
    () => ({
      event_id: eventId,
      title,
      description,
      status,
      end_at: closeTime || '',
      options,
      images: images ?? [],
    }),
    [eventId, title, description, status, closeTime, options, images]
  );

  const startIso = useMemo(() => {
    if (createdAt) return createdAt;
    if (!closeTime) return '';
    const end = new Date(closeTime);
    return new Date(end.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }, [createdAt, closeTime]);
  const endIso = detail.end_at ?? '';
  const start = useMemo(() => (startIso ? new Date(startIso) : new Date()), [startIso]);
  const end = useMemo(() => (endIso ? new Date(endIso) : new Date()), [endIso]);

  const totalMs = Math.max(0, end.getTime() - start.getTime());
  const elapsedMs = Math.min(
    Math.max(0, now.getTime() - start.getTime()),
    totalMs
  );
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  const progress = totalMs === 0 ? 0 : (elapsedMs / totalMs) * 100;

  const remainingLabel = useMemo(() => {
    if (!endIso) return '-';
    const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}분 남음`;
    return `약 ${hours}시간 ${minutes}분 남음`;
  }, [remainingMs, endIso]);

  const untilStartMs = Math.max(0, start.getTime() - now.getTime());
  const untilStartLabel = useMemo(() => {
    if (!startIso) return '-';
    const totalMinutes = Math.ceil(untilStartMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}분 남음`;
    return `약 ${hours}시간 ${minutes}분 남음`;
  }, [untilStartMs, startIso]);

  const statusColors: Record<EventStatus, string> = {
    READY: '#6b7280',
    OPEN: '#16a34a',
    CLOSED: '#ea580c',
    SETTLED: '#2563eb',
    CANCELLED: '#111827',
  };

  return (
    <section>
      <header className="event-hero">
        <div className="event-hero-top">
          <button className="button" onClick={onBack}>
            목록으로
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="button"
              onClick={() => {
                setStatusModalOpen(true);
              }}
            >
              상태 수정
            </button>

            <button
              className="button primary"
              type="button"
              disabled={detail.status !== 'CLOSED'}
              title={detail.status === 'CLOSED' ? '정산하기' : 'CLOSED 상태에서만 정산할 수 있어요'}
              onClick={() => {
                if (detail.status !== 'CLOSED') {
                  alert('정산은 CLOSED 상태에서만 가능합니다.');
                  return;
                }
                setSettleModalOpen(true);
              }}
            >
              정산하기
            </button>
          </div>
        </div>

        <div className="event-hero-title">
          <span
            className="status-badge"
            style={{ backgroundColor: statusColors[detail.status] }}
          >
            {detail.status}
          </span>
          <h2 className="event-title">{detail.title}</h2>
        </div>

        {detail.end_at ? (
          <div className="progress-section" style={{ marginTop: 8 }}>
            {detail.status === 'READY' ? (
              <div
                className="progress-label"
                style={{ textAlign: 'center', fontSize: '1.5em' }}
              >
                시작까지 {untilStartLabel}
              </div>
            ) : (
              <>
                <div className="progress-label">
                  {detail.status === 'CLOSED'
                    ? '종료됨 (정산 대기중)'
                    : detail.status === 'SETTLED'
                      ? '종료됨 (정산 완료)'
                      : detail.status === 'CANCELLED'
                        ? '취소됨'
                        : `마감까지 ${remainingLabel} • 경과율 ${Math.round(progress)}%`}
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
                  <div className="progress-tooltip">
                    <div>
                      <strong>시작</strong> {start.toLocaleString('ko-KR')}
                    </div>
                    <div>
                      <strong>종료</strong> {end.toLocaleString('ko-KR')}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        {description ? <p className="event-desc">{description}</p> : null}

        <div className="event-stats">
          <div className="stat">
            <div className="stat-label">참여자</div>
            <div className="stat-value">
              {detail.total_participants_count ?? '—'}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">총 배팅 금액</div>
            <div className="stat-value">{formatMoney(totalBetAmount)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">선택지</div>
            <div className="stat-value">{detail.options.length}</div>
          </div>
        </div>

        {statusModalOpen ? (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 className="modal-title">상태 수정</h3>
              </div>
              <div className="modal-body">
                <EventStatusChange
                  event={detail}
                  mode="status"
                  onClose={() => setStatusModalOpen(false)}
                  onUpdated={(ev) => {
                    setTitle(ev.title);
                    setStatus(ev.status);
                    setCloseTime(ev.end_at ?? '');
                    setOptions(ev.options ?? []);
                    setImages(ev.images ?? []);
                    setStatusModalOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {settleModalOpen ? (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: 620 }}>
              <div className="modal-header">
                <h3 className="modal-title">정산하기</h3>
              </div>
              <div className="modal-body">
                <EventStatusChange
                  event={detail}
                  mode="settle"
                  onClose={() => setSettleModalOpen(false)}
                  onUpdated={(ev) => {
                    setTitle(ev.title);
                    setStatus(ev.status);
                    setCloseTime(ev.end_at ?? '');
                    setOptions(ev.options ?? []);
                    setImages(ev.images ?? []);
                    setSettleModalOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="page-sub">불러오는 중…</p> : null}

      {detail.images && detail.images.length > 0 ? (
        <section className="event-gallery card" style={{ marginTop: 12 }}>
          <header className="card-header" style={{ marginBottom: 12 }}>
            <h3 className="card-title">이벤트 이미지</h3>
          </header>
          <div className="gallery-grid">
            {detail.images.map((img, i) => (
              <button
                type="button"
                key={i}
                className="gallery-item"
                title="이미지 확대"
                onClick={() => setLightboxUrl(img.image_url)}
              >
                <img src={img.image_url} alt="event" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lightboxUrl ? (
        <div className="modal-overlay" onClick={() => setLightboxUrl(null)}>
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              type="button"
              onClick={() => setLightboxUrl(null)}
              aria-label="닫기"
              title="닫기"
            >
              ✕
            </button>
            <img className="lightbox-img" src={lightboxUrl} alt="event" />
          </div>
        </div>
      ) : null}

      <section className="card" style={{ marginTop: 12 }}>
        <header className="card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="card-title">옵션</h3>
        </header>

        {/* status/settle controls live in the "상태 수정" modal now */}

        <div className="bet-cta-row" onClick={(e) => e.stopPropagation()}>
          <div className="page-sub">
            {selectedOption ? (
              <>
                선택됨: <strong>{selectedOption.name}</strong>
              </>
            ) : (
              '옵션을 선택하면 베팅할 수 있어요'
            )}
          </div>
          <button
            className="button primary"
            disabled={!selectedOptionId}
            onClick={(e) => {
              e.stopPropagation();
              setBetError(null);
              setBetOpen(true);
            }}
          >
            베팅하기
          </button>
        </div>

        <div className="option-grid">
          {detail.options.map((o) => {
            const selected = selectedOptionId === o.option_id;
            return (
              <button
                type="button"
                key={o.option_id}
                className={`option-card${selected ? ' selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOptionId((prev) =>
                    prev === o.option_id ? null : o.option_id
                  );
                }}
              >
                <div className="option-top">
                  {o.option_image_url ? (
                    <button
                      type="button"
                      className="option-image-button"
                      title="이미지 확대"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(o.option_image_url ?? null);
                      }}
                    >
                      <img
                        className="option-image"
                        src={o.option_image_url}
                        alt={o.name}
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="option-image-button"
                      title="이미지 없음"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('이 옵션에는 이미지가 없습니다.');
                      }}
                    >
                      <div className="option-image placeholder">
                        <span className="option-image-placeholder-icon" aria-hidden="true">
                          📷
                        </span>
                      </div>
                    </button>
                  )}
                  <div className="option-title-row">
                    <div className="option-name">{o.name}</div>
                    {typeof o.odds === 'number' ? (
                      <div className="odds-pill">{o.odds.toFixed(2)}x</div>
                    ) : null}
                  </div>
                </div>

                <div className="option-metrics">
                  <div className="option-metric">
                    <div className="option-metric-label">배팅 금액</div>
                    <div className="option-metric-value">
                      {formatMoney(o.option_total_amount ?? 0)}
                    </div>
                  </div>
                  <div className="option-metric">
                    <div className="option-metric-label">참여자</div>
                    <div className="option-metric-value">
                      {o.participant_count ?? 0}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {betOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setBetOpen(false);
            setBetError(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>베팅하기</h3>
            </header>
            <div className="modal-body">
              {selectedOption ? (
                <p className="page-sub" style={{ marginTop: 0 }}>
                  선택한 옵션: <strong>{selectedOption.name}</strong>
                </p>
              ) : null}

              <div className="form-row">
                <label htmlFor="bet-amount">베팅 금액</label>
                <div className="bet-amount-row">
                  <input
                    id="bet-amount"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="input"
                    value={betAmount}
                    onChange={(e) => {
                      const next = normalizePointInput(e.target.value);
                      setBetAmount(next);
                      setBetError(null);
                    }}
                    placeholder="예: 1000"
                  />
                  <span className="bet-unit">포인트</span>
                </div>
              </div>

              {betError ? <p className="form-error">{betError}</p> : null}
              <p className="page-sub">
                베팅은 즉시 반영되며, 성공하면 화면의 배팅 금액/참여자 수를 다시 불러옵니다.
              </p>
            </div>
            <footer className="modal-footer" style={{ padding: '0 16px 16px' }}>
              <button
                className="button"
                onClick={() => {
                  setBetOpen(false);
                  setBetError(null);
                }}
              >
                취소
              </button>
              <button
                className="button primary"
                disabled={!selectedOptionId || betLoading}
                onClick={async () => {
                  const amount = parsePointAmount(betAmount);
                  if (!selectedOptionId) {
                    setBetError('옵션을 선택해주세요.');
                    return;
                  }
                  if (!amount || amount <= 0) {
                    setBetError('1 포인트 이상 입력해주세요.');
                    return;
                  }

                  setBetLoading(true);
                  setBetError(null);
                  try {
                    await createBet(eventId, {
                      option_id: selectedOptionId,
                      bet_amount: amount,
                    });

                    await refreshEvent();

                    setBetOpen(false);
                    setBetAmount('');
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : '베팅에 실패했습니다.';
                    setBetError(msg);
                  } finally {
                    setBetLoading(false);
                  }
                }}
              >
                {betLoading ? '처리 중…' : '확인'}
              </button>
            </footer>
          </div>
        </div>
      )}

    </section>
  );
};

export default EventDetailPage;
