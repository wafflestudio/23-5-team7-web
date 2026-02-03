import { useState } from 'react';
import { getEvent, likeEvent, unlikeEvent } from '../api/events';
import { useIsLoggedIn } from '../auth/session';

interface Props {
  eventId: string;
  likeCount: number;
  isLiked: boolean | null | undefined;
  onChanged?: (next: { likeCount: number; isLiked: boolean | null }) => void;
  size?: 'sm' | 'md';
}

export default function LikeButton({
  eventId,
  likeCount,
  isLiked,
  onChanged,
  size = 'md',
}: Props) {
  const [loading, setLoading] = useState(false);
  const isLoggedIn = useIsLoggedIn();

  const disabled = loading || !isLoggedIn;
  const label = isLiked ? '좋아요 취소' : '좋아요';

  return (
    <button
      type="button"
      className={`button ${size === 'sm' ? 'button-sm' : ''} ${isLiked ? 'primary' : ''}`}
      disabled={disabled}
  title={!isLoggedIn ? '로그인 후 사용할 수 있어요' : label}
      onClick={async (e) => {
        // Prevent link navigation when the button lives inside an <a> card.
        e.preventDefault();
        e.stopPropagation();
        // React's SyntheticEvent doesn't type stopImmediatePropagation, but native event has it.
        (e.nativeEvent as any)?.stopImmediatePropagation?.();
        if (disabled) return;
        setLoading(true);

        const prev = { likeCount, isLiked: isLiked ?? null };
        try {
          if (isLiked) {
            await unlikeEvent(eventId);
            onChanged?.({ likeCount: Math.max(0, likeCount - 1), isLiked: false });
          } else {
            await likeEvent(eventId);
            onChanged?.({ likeCount: likeCount + 1, isLiked: true });
          }

          // Sync with server truth to handle concurrent likes/unlikes by other users.
          try {
            const ev = await getEvent(eventId);
            onChanged?.({
              likeCount: ev.like_count ?? (isLiked ? Math.max(0, likeCount - 1) : likeCount + 1),
              isLiked: ev.is_liked ?? (isLiked ? false : true),
            });
          } catch {
            // Non-fatal: keep optimistic state.
          }
        } catch (err) {
          // Revert optimistic UI
          onChanged?.({ likeCount: prev.likeCount, isLiked: prev.isLiked });
          const msg = err instanceof Error ? err.message : '좋아요 처리 실패';
          alert(msg);
        } finally {
          setLoading(false);
        }
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden="true">♥</span>
        <span>{likeCount}</span>
      </span>
    </button>
  );
}
