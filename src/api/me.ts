import { request } from './client';
import type { MeBetsResponse, MePointHistoryResponse, MeProfile } from '../types';

export type BetStatusFilter = 'PENDING' | 'WIN' | 'LOSE' | 'REFUNDED';
export type PointReasonFilter = 'SIGNUP' | 'BET' | 'WIN' | 'LOSE' | 'REFUND' | 'ETC';

export interface ListMyBetsParams {
  status?: BetStatusFilter;
  limit?: number;
  offset?: number;
}

export function listMyBets(params: ListMyBetsParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number') qs.set('offset', String(params.offset));
  const query = qs.toString();
  return request<MeBetsResponse>(`/api/users/me/bets${query ? `?${query}` : ''}`);
}

export interface ListMyPointHistoryParams {
  reason?: PointReasonFilter;
  limit?: number;
  offset?: number;
}

export function listMyPointHistory(params: ListMyPointHistoryParams = {}) {
  const qs = new URLSearchParams();
  if (params.reason) qs.set('reason', params.reason);
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number') qs.set('offset', String(params.offset));
  const query = qs.toString();
  return request<MePointHistoryResponse>(
    `/api/users/me/point-history${query ? `?${query}` : ''}`
  );
}

export function getMyProfile() {
  return request<MeProfile>(`/api/users/me/profile`);
}
