import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyProfile, listMyBets } from '../api/me';
import type { MeBet, MeProfile } from '../types';

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(n));
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '진행중',
  WIN: '승리',
  LOSE: '패배',
  REFUNDED: '환불',
};

export default function MyPage({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [bets, setBets] = useState<MeBet[]>([]);
  const [betsTotal, setBetsTotal] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PENDING' | 'WIN' | 'LOSE' | 'REFUNDED'
  >('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const canPrev = offset > 0;
  const canNext = offset + limit < betsTotal;

  const load = useCallback(
    async (nextOffset: number, nextStatus = statusFilter) => {
      setLoading(true);
      setError(null);
      try {
        const [p, b] = await Promise.all([
          getMyProfile(),
          listMyBets({
            status: nextStatus === 'ALL' ? undefined : nextStatus,
            limit,
            offset: nextOffset,
          }),
        ]);
        setProfile(p);
        setBets(b.bets ?? []);
        setBetsTotal(b.total_count ?? 0);
        setOffset(nextOffset);
      } catch (e) {
        setError(e instanceof Error ? e.message : '마이페이지 로딩 실패');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    void load(0, statusFilter);
  }, [load, statusFilter]);

  const title = useMemo(() => {
    if (!profile) return '마이페이지';
    return `${profile.nickname}님의 마이페이지`;
  }, [profile]);

  return (
    <section>
      <header className="event-hero">
        <div className="event-hero-top">
          <button className="button" onClick={onBack}>
            뒤로
          </button>
        </div>

        <div
          className="event-hero-title"
          style={{ justifyContent: 'space-between' }}
        >
          <h2 className="event-title">{title}</h2>
          {profile ? (
            <div className="stat" style={{ minWidth: 220 }}>
              <div className="stat-label">잔여 코인</div>
              <div className="stat-value">{formatNumber(profile.points)} P</div>
            </div>
          ) : null}
        </div>

        {profile ? (
          <p className="page-sub" style={{ margin: '10px 0 0' }}>
            {profile.email}
          </p>
        ) : null}
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading && bets.length === 0 ? (
        <p className="page-sub">불러오는 중…</p>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 800 }}>내 베팅</div>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <label
              className="page-sub"
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              상태
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | 'ALL'
                      | 'PENDING'
                      | 'WIN'
                      | 'LOSE'
                      | 'REFUNDED'
                  )
                }
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                }}
              >
                <option value="ALL">전체</option>
                <option value="PENDING">진행중</option>
                <option value="WIN">승리</option>
                <option value="LOSE">패배</option>
                <option value="REFUNDED">환불</option>
              </select>
            </label>
          </div>
        </div>

        <div style={{ marginTop: 10 }} className="table-wrap">
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>상태</th>
                <th>이벤트</th>
                <th style={{ width: 140 }}>선택</th>
                <th style={{ width: 140, textAlign: 'right' }}>금액</th>
                <th style={{ width: 200 }}>시간</th>
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 16,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    표시할 베팅이 없습니다.
                  </td>
                </tr>
              ) : (
                bets.map((b) => (
                  <tr key={b.bet_id}>
                    <td style={{ fontWeight: 800 }}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </td>
                    <td style={{ fontWeight: 700 }}>{b.event_title}</td>
                    <td>{b.option_name}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatNumber(b.amount)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(b.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
            justifyContent: 'space-between',
          }}
        >
          <div className="page-sub">
            총 {formatNumber(betsTotal)}건 · {formatNumber(offset + 1)}–
            {formatNumber(Math.min(offset + limit, betsTotal))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="button ghost"
              disabled={!canPrev || loading}
              onClick={() => void load(Math.max(0, offset - limit))}
            >
              이전
            </button>
            <button
              className="button ghost"
              disabled={!canNext || loading}
              onClick={() => void load(offset + limit)}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
