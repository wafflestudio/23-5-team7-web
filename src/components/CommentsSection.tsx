import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../api/comments';
import { useIsLoggedIn } from '../auth/session';
import type { Comment } from '../types';

interface Props {
  eventId: string;
}

function formatKoreanDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR');
}

function isBlankOnly(s: string) {
  return s.trim().length === 0;
}

export default function CommentsSection({ eventId }: Props) {
  const isLoggedIn = useIsLoggedIn();
  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { nickname?: string };
      if (
        typeof parsed.nickname === 'string' &&
        parsed.nickname.trim().length > 0
      ) {
        return { nickname: parsed.nickname };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const [items, setItems] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const canSubmit = useMemo(() => {
    if (!isLoggedIn) return false;
    if (posting) return false;
    const c = content;
    if (isBlankOnly(c)) return false;
    if (c.length < 1 || c.length > 500) return false;
    return true;
  }, [isLoggedIn, posting, content]);

  const loadFirstPage = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listComments(id, { limit: 20 });
      setItems(res.comments ?? []);
      setNextCursor(res.next_cursor ?? null);
      setHasMore(Boolean(res.has_more));
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : '댓글 목록을 불러오지 못했어요.';
      setError(msg);
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const sortNewestFirst = (arr: Comment[]) => {
    // Spec: created_at DESC, comment_id DESC
    // Be defensive if created_at can't be parsed.
    return [...arr].sort((a, b) => {
      const at = Date.parse(a.created_at);
      const bt = Date.parse(b.created_at);
      if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt)
        return bt - at;
      if (a.comment_id === b.comment_id) return 0;
      return b.comment_id.localeCompare(a.comment_id);
    });
  };

  const loadMore = async () => {
    if (!hasMore) return;
    if (!nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listComments(eventId, {
        limit: 20,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...(res.comments ?? [])]);
      setNextCursor(res.next_cursor ?? null);
      setHasMore(Boolean(res.has_more));
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : '댓글을 더 불러오지 못했어요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    setError(null);
    setContent('');
    setEditingId(null);
    setEditingContent('');
    void loadFirstPage(eventId);
  }, [eventId, loadFirstPage]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setPosting(true);
    setError(null);
    try {
      const created = await createComment(eventId, { content });
      setContent('');
      // After creating, prefer refetching the first page so ordering/cursors match server.
      // If refetch fails, fall back to local prepend + sort.
      try {
        const res = await listComments(eventId, { limit: 20 });
        setItems(res.comments ?? []);
        setNextCursor(res.next_cursor ?? null);
        setHasMore(Boolean(res.has_more));
      } catch {
        setItems((prev) => sortNewestFirst([created, ...prev]));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '댓글 작성에 실패했어요.';
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.comment_id);
    setEditingContent(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const next = editingContent;
    if (isBlankOnly(next) || next.length < 1 || next.length > 500) {
      setError('댓글은 공백 제외 1자 이상 500자 이하여야 해요.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const updated = await updateComment(editingId, { content: next });
      setItems((prev) =>
        prev.map((x) => (x.comment_id === updated.comment_id ? updated : x))
      );
      cancelEdit();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '댓글 수정에 실패했어요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (commentId: string) => {
    const ok = window.confirm('댓글을 삭제할까요? 삭제하면 복구할 수 없어요.');
    if (!ok) return;

    setError(null);
    setLoading(true);
    try {
      await deleteComment(commentId);
      setItems((prev) => prev.filter((x) => x.comment_id !== commentId));
      if (editingId === commentId) cancelEdit();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '댓글 삭제에 실패했어요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <header
        className="card-header"
        style={{ justifyContent: 'space-between' }}
      >
        <h3 className="card-title">댓글</h3>
        <button
          className="button"
          type="button"
          disabled={loading}
          onClick={() => void loadFirstPage(eventId)}
        >
          새로고침
        </button>
      </header>
      <div className="card-body">
        <form
          onSubmit={onSubmit}
          style={{ display: 'grid', gap: 8, marginBottom: 12 }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isLoggedIn
                ? '댓글을 입력하세요 (최대 500자)'
                : '로그인 후 댓글을 작성할 수 있어요'
            }
            rows={3}
            disabled={!isLoggedIn || posting}
            style={{ width: '100%', resize: 'vertical' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <small style={{ color: '#6b7280' }}>{content.length}/500</small>
            <button
              className="button primary"
              type="submit"
              disabled={!canSubmit}
            >
              {posting ? '작성 중…' : '댓글 작성'}
            </button>
          </div>
        </form>

        {loading && items.length === 0 ? (
          <p className="page-sub">불러오는 중…</p>
        ) : null}

        {items.length === 0 && !loading ? (
          <p className="page-sub">아직 댓글이 없어요.</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 10,
            }}
          >
            {items.map((c) => {
              const isEditing = editingId === c.comment_id;
              const canManage = Boolean(
                isLoggedIn && me?.nickname && me.nickname === c.nickname
              );
              return (
                <li
                  key={c.comment_id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 12,
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'baseline',
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>{c.nickname}</strong>
                        <small style={{ color: '#6b7280' }}>
                          {formatKoreanDateTime(c.created_at)}
                        </small>
                        {c.updated_at ? (
                          <small style={{ color: '#6b7280' }}>(수정됨)</small>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {canManage ? (
                        <>
                          {!isEditing ? (
                            <button
                              className="button"
                              type="button"
                              onClick={() => startEdit(c)}
                            >
                              수정
                            </button>
                          ) : null}
                          <button
                            className="button"
                            type="button"
                            onClick={() => remove(c.comment_id)}
                          >
                            삭제
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {!isEditing ? (
                    <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                      {c.content}
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={3}
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <small style={{ color: '#6b7280' }}>
                          {editingContent.length}/500
                        </small>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="button"
                            type="button"
                            onClick={cancelEdit}
                            disabled={loading}
                          >
                            취소
                          </button>
                          <button
                            className="button primary"
                            type="button"
                            onClick={saveEdit}
                            disabled={loading}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div
          style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}
        >
          {hasMore ? (
            <button
              className="button"
              type="button"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? '불러오는 중…' : '더 보기'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
