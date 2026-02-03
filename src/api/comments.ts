import type {
  Comment,
  CreateCommentRequest,
  ListCommentsResult,
  UpdateCommentRequest,
} from '../types';
import { request } from './client';

export interface ListCommentsParams {
  cursor?: string;
  limit?: number;
}

// 7-2) GET /api/events/{event_id}/comments
export async function listComments(
  eventId: string,
  params: ListCommentsParams = {}
): Promise<ListCommentsResult> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  const query = qs.toString();

  return request<ListCommentsResult>(
    `/api/events/${encodeURIComponent(eventId)}/comments${query ? `?${query}` : ''}`
  );
}

// 7-1) POST /api/events/{event_id}/comments
export function createComment(eventId: string, payload: CreateCommentRequest) {
  return request<Comment>(`/api/events/${encodeURIComponent(eventId)}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 7-3) PATCH /api/comments/{comment_id}
export function updateComment(commentId: string, payload: UpdateCommentRequest) {
  return request<Comment>(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// 7-4) DELETE /api/comments/{comment_id}
export function deleteComment(commentId: string) {
  return request<void>(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
}
