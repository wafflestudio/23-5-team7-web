import type { MeBetsResponse, MeProfile } from '../types';
import { request } from './client';

type BetStatusFilter = 'PENDING' | 'WIN' | 'LOSE' | 'REFUNDED';
export interface ListMyBetsParams {
  status?: BetStatusFilter;
  limit?: number;
  offset?: number;
}

export function listMyBets(params: ListMyBetsParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number')
    qs.set('offset', String(params.offset));
  const query = qs.toString();
  return request<MeBetsResponse>(
    `/api/users/me/bets${query ? `?${query}` : ''}`
  );
}

// (removed unused point-history helpers)

export function getMyProfile() {
  return request<MeProfile>(`/api/users/me/profile`);
}
