import type {
  CreateEventRequest,
  CreateEventResponse,
  CreateBetRequest,
  CreateBetResponse,
  EventDetail,
  EventStatus,
  EventSummary,
  SettleEventRequest,
  UpdateEventStatusRequest,
} from '../types';
import { request } from './client';

function toEventSummaryArray(res: unknown): EventSummary[] {
  if (Array.isArray(res)) return res as EventSummary[];
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.events)) return obj.events as EventSummary[];
    if (Array.isArray(obj.items)) return obj.items as EventSummary[];
    if (Array.isArray(obj.data)) return obj.data as EventSummary[];
  }
  return [];
}

export interface ListEventsResult {
  events: EventSummary[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ListEventsParams {
  status?: EventStatus;
  cursor?: string;
  limit?: number;
}

function toListEventsResult(res: unknown): ListEventsResult {
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.events)) {
      return {
        events: obj.events as EventSummary[],
        next_cursor:
          typeof obj.next_cursor === 'string' ? obj.next_cursor : (obj.next_cursor as null) ?? null,
        has_more: Boolean(obj.has_more),
      };
    }
  }
  // Fallback for older shapes
  return { events: toEventSummaryArray(res), next_cursor: null, has_more: false };
}

export async function listEvents(params: ListEventsParams = {}): Promise<ListEventsResult> {
  const { status, cursor, limit } = params;
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (cursor) qs.set('cursor', cursor);
  if (typeof limit === 'number') qs.set('limit', String(limit));
  const query = qs.toString();

  const res = await request<unknown>(`/api/events${query ? `?${query}` : ''}`);
  const parsed = toListEventsResult(res);
  return {
    ...parsed,
    events: parsed.events,
  };
}

// Legacy helper for components that just want a flat list.
export async function listEventsArray(status?: EventStatus) {
  const res = await listEvents({ status });
  return res.events;
}

export function getEvent(eventId: string) {
  return request<EventDetail>(`/api/events/${encodeURIComponent(eventId)}`);
}

export function createEvent(payload: CreateEventRequest) {
  // API doc (2-1): multipart/form-data
  // - key: data (JSON string)
  // - key: image_files (file[])
  const { image_files, ...data } = payload as CreateEventRequest & {
    image_files?: File[];
  };

  const form = new FormData();
  form.append('data', JSON.stringify(data));
  for (const f of image_files ?? []) {
    form.append('image_files', f);
  }

  return request<unknown>(`/api/events`, {
    method: 'POST',
    // Do NOT set Content-Type; browser will set correct boundary.
    body: form,
  }).then((res) => {
    // Backend spec: should return created event payload with event_id (usually 201).
    // If we receive a list shape (e.g. { events: [...] }) it means the POST didn't hit the intended handler.
    if (res && typeof res === 'object' && 'event_id' in (res as any)) {
      return res as CreateEventResponse;
    }
    throw new Error(
      '이벤트 생성 응답이 올바르지 않습니다. (서버가 생성 대신 목록을 반환했습니다)'
    );
  });
}

export async function updateEventStatus(
  eventId: string,
  payload: UpdateEventStatusRequest
) {
  await request<void>(`/api/events/${encodeURIComponent(eventId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  // Some backends may only return 200 without body; fetch updated detail.
  return getEvent(eventId);
}

export async function settleEvent(eventId: string, payload: SettleEventRequest) {
  await request<void>(`/api/events/${encodeURIComponent(eventId)}/settle`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return getEvent(eventId);
}

// 3-1) POST /api/events/{event_id}/bets
export function createBet(eventId: string, payload: CreateBetRequest) {
  return request<CreateBetResponse>(
    `/api/events/${encodeURIComponent(eventId)}/bets`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}
