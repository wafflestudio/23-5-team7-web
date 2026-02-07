import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMyProfile,
  getMyRanking,
  listMyBets,
  listMyPointHistory,
  updateMyNickname,
  updateMyPassword,
} from '../api/me';
import { notifySessionChanged } from '../auth/session';
import type { MeBet, MeProfile, MeRanking, PointHistoryItem } from '../types';
import Modal from './Modal';

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
  const [ranking, setRanking] = useState<MeRanking | null>(null);
  const [bets, setBets] = useState<MeBet[]>([]);
  const [betsTotal, setBetsTotal] = useState<number>(0);
  const [betChangeById, setBetChangeById] = useState<Record<string, number>>(
    {}
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savingNickname, setSavingNickname] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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
      setSuccess(null);
      try {
        const [p, r, b, ph] = await Promise.all([
          getMyProfile(),
          getMyRanking().catch(() => null),
          listMyBets({
            status: nextStatus === 'ALL' ? undefined : nextStatus,
            limit,
            offset: nextOffset,
          }),
          // API validation: limit must be <= 100.
          // Fetch enough history to cover common cases; we'll join on bet_id.
          listMyPointHistory({ limit: 100, offset: 0 }).catch(() => null),
        ]);
        setProfile(p);
        setRanking(r);
        setBets(b.bets ?? []);
        setBetsTotal(b.total_count ?? 0);
        setOffset(nextOffset);

        const map: Record<string, number> = {};
        const items = (ph?.history ?? []) as PointHistoryItem[];
        for (const h of items) {
          if (!h.bet_id) continue;
          // Multiple history rows may exist per bet; we prefer summing to be safe.
          map[h.bet_id] = (map[h.bet_id] ?? 0) + (h.change_amount ?? 0);
        }
        setBetChangeById(map);

        // Keep input drafts in sync with loaded profile.
        setNicknameDraft(p.nickname ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : '마이페이지 로딩 실패');
        setRanking(null);
        setBetChangeById({});
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  const saveNickname = async (): Promise<boolean> => {
    if (!profile) return false;
    if (savingNickname) return false;
    const next = nicknameDraft.trim();
    if (next.length < 2 || next.length > 20) {
      setError('닉네임은 2자 이상 20자 이하여야 해요.');
      return false;
    }

    setSavingNickname(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateMyNickname(next);
      setProfile((prev) => (prev ? { ...prev, nickname: res.nickname } : prev));

      // Also keep localStorage user.nickname in sync so header shows the new nickname.
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw) as Record<string, unknown>;
          u.nickname = res.nickname;
          localStorage.setItem('user', JSON.stringify(u));
        }
      } catch {
        // ignore storage errors
      }

      // Same-tab notify so header reacts immediately.
      notifySessionChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : '닉네임 변경 실패');
      return false;
    } finally {
      setSavingNickname(false);
    }

    return true;
  };

  const savePassword = async (): Promise<boolean> => {
    if (savingPassword) return false;
    if (!profile) return false;
    const p = profile;

    // Social accounts cannot change password (ERR_047)
    if (p.social_type && p.social_type !== 'LOCAL') {
      setError('소셜 로그인 계정은 비밀번호를 변경할 수 없어요.');
      return false;
    }

    if (currentPassword.trim().length === 0) {
      setError('현재 비밀번호를 입력해주세요.');
      return false;
    }
    if (newPassword.length < 8 || newPassword.length > 20) {
      setError('새 비밀번호는 8자 이상 20자 이하여야 해요.');
      return false;
    }
    if (newPassword === currentPassword) {
      setError('새 비밀번호가 현재 비밀번호와 같아요.');
      return false;
    }

    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('비밀번호가 변경되었습니다.');
      setShowPasswordModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '비밀번호 변경 실패');
      return false;
    } finally {
      setSavingPassword(false);
    }

    return true;
  };

  useEffect(() => {
    void load(0, statusFilter);
  }, [load, statusFilter]);

  const title = useMemo(() => {
    if (!profile) return '마이페이지';
    return `${profile.nickname}님의 마이페이지`;
  }, [profile]);

  const isSocialAccount = Boolean(profile && profile.social_type !== 'LOCAL');

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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!ranking || ranking.total_users === 0 ? (
                <p className="page-sub" style={{ margin: '6px 0 0' }}>
                  랭킹은 매 정각에 산정되기 때문에 그 전까지는 유효하지 않은
                  등수로 표시될 수 있습니다.
                </p>
              ) : null}
              <div className="stat" style={{ minWidth: 220 }}>
                <div className="stat-label">잔여 코인</div>
                <div className="stat-value">
                  {formatNumber(profile.points)} P
                </div>
              </div>
              {ranking ? (
                <div className="stat" style={{ minWidth: 220 }}>
                  <div className="stat-label">내 등수</div>
                  <div
                    className="stat-value"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatNumber(ranking.rank)} /{' '}
                    {formatNumber(ranking.total_users)}
                  </div>
                  <div className="page-sub" style={{ margin: '4px 0 0' }}>
                    상위 {ranking.percentile.toFixed(1)}%
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {profile ? (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              className="button"
              type="button"
              onClick={() => {
                setNicknameDraft(profile.nickname ?? '');
                setShowNicknameModal(true);
                setError(null);
                setSuccess(null);
              }}
              disabled={loading}
            >
              닉네임 변경
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setShowPasswordModal(true);
                setError(null);
                setSuccess(null);
              }}
              disabled={loading || isSocialAccount}
              title={
                isSocialAccount
                  ? '소셜 로그인 계정은 비밀번호를 변경할 수 없어요.'
                  : undefined
              }
            >
              비밀번호 변경
            </button>
          </div>
        ) : null}

        {profile ? (
          <p className="page-sub" style={{ margin: '10px 0 0' }}>
            {profile.email}
          </p>
        ) : null}
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-info">{success}</p> : null}
      {loading && bets.length === 0 ? (
        <p className="page-sub">불러오는 중…</p>
      ) : null}

      {/* 계정 설정 탭 제거: 버튼은 등수 카드 아래에 배치 */}

      {profile && showNicknameModal ? (
        <Modal onClose={() => setShowNicknameModal(false)}>
          <h3 style={{ margin: '0 0 12px' }}>닉네임 변경</h3>
          <div className="modal-body">
            <div className="form-row">
              <label className="page-sub" style={{ margin: 0 }}>
                새 닉네임 (2–20자)
              </label>
              <input
                className="input"
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
          </div>
          <footer className="modal-footer">
            <button
              type="button"
              className="button"
              onClick={() => setShowNicknameModal(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="button primary"
              onClick={async () => {
                const ok = await saveNickname();
                if (ok) {
                  setSuccess('닉네임이 변경되었습니다.');
                  setShowNicknameModal(false);
                }
              }}
              disabled={savingNickname || loading}
            >
              {savingNickname ? '저장 중…' : '저장'}
            </button>
          </footer>
        </Modal>
      ) : null}

      {profile && showPasswordModal ? (
        <Modal onClose={() => setShowPasswordModal(false)}>
          <h3 style={{ margin: '0 0 12px' }}>비밀번호 변경</h3>
          <div className="modal-body">
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                className="input"
                type="password"
                placeholder="현재 비밀번호"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={savingPassword || loading || isSocialAccount}
                autoComplete="current-password"
                autoFocus
              />
              <input
                className="input"
                type="password"
                placeholder="새 비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={savingPassword || loading || isSocialAccount}
                autoComplete="new-password"
              />
              {isSocialAccount ? (
                <p className="page-sub" style={{ margin: 0 }}>
                  소셜 로그인 계정은 비밀번호를 변경할 수 없어요.
                </p>
              ) : null}
            </div>
          </div>
          <footer className="modal-footer">
            <button
              type="button"
              className="button"
              onClick={() => setShowPasswordModal(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => void savePassword()}
              disabled={savingPassword || loading || isSocialAccount}
            >
              {savingPassword ? '변경 중…' : '변경'}
            </button>
          </footer>
        </Modal>
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
                <th style={{ width: 140, textAlign: 'right' }}>변동</th>
                <th style={{ width: 200 }}>시간</th>
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 800,
                        color:
                          (betChangeById[b.bet_id] ?? 0) > 0
                            ? '#16a34a'
                            : (betChangeById[b.bet_id] ?? 0) < 0
                              ? '#dc2626'
                              : '#64748b',
                      }}
                    >
                      {typeof betChangeById[b.bet_id] === 'number'
                        ? `${betChangeById[b.bet_id] > 0 ? '+' : ''}${formatNumber(
                            betChangeById[b.bet_id]
                          )}`
                        : '—'}
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
