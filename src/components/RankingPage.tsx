import { useEffect, useState } from 'react';
import { type RankingEntry, getUserRanking } from '../api/users';

const TOP_N = 100;

function formatUpdatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

export default function RankingPage({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [items, setItems] = useState<RankingEntry[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getUserRanking(TOP_N);
        if (!alive) return;
        setItems(res.rankings ?? []);
        setUpdatedAt(res.updated_at ?? '');
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '랭킹 로딩 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section>
      <header className="event-hero">
        <div className="event-hero-top">
          <button className="button" onClick={onBack}>
            뒤로
          </button>
          <div className="page-sub" style={{ margin: 0, marginLeft: 'auto' }}>
            마지막 업데이트: {updatedAt ? formatUpdatedAt(updatedAt) : '—'}
          </div>
        </div>

        <div className="event-hero-title">
          <h2 className="event-title">유저 랭킹</h2>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading && items.length === 0 ? (
        <p className="page-sub">불러오는 중…</p>
      ) : null}

      <div
        className="card"
        style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}
      >
        <div className="table-wrap">
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>순위</th>
                <th>닉네임</th>
                <th style={{ width: 140, textAlign: 'right' }}>포인트</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={`${r.rank}-${r.nickname}`}>
                  <td>{r.rank}</td>
                  <td style={{ fontWeight: 700 }}>{r.nickname}</td>
                  <td style={{ textAlign: 'right' }}>
                    {new Intl.NumberFormat('ko-KR').format(r.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {loading && items.length > 0 ? (
        <p className="page-sub">불러오는 중…</p>
      ) : null}
    </section>
  );
}
