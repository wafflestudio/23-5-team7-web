import type { MeBetsResponse, MeProfile, PointHistoryResponse } from '../types';
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

export interface ListPointHistoryParams {
  reason?: string;
  limit?: number;
  offset?: number;
}

export function listMyPointHistory(params: ListPointHistoryParams = {}) {
  const qs = new URLSearchParams();
  if (params.reason) qs.set('reason', params.reason);
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number')
    qs.set('offset', String(params.offset));
  const query = qs.toString();
  return request<PointHistoryResponse>(
    `/api/users/me/point-history${query ? `?${query}` : ''}`
  );
}

export function getMyProfile() {
  return request<MeProfile>(`/api/users/me/profile`);
}

// 4-5) GET /api/users/me/ranking
export interface MeRankingResponse {
  rank: number;
  total_users: number;
  percentile: number;
  my_points: number;
}

export function getMyRanking() {
  // NOTE: README heading says /me/ranking but the request section incorrectly shows /me/stats.
  // We follow the endpoint name in the title: /api/users/me/ranking
  return request<MeRankingResponse>(`/api/users/me/ranking`);
}

// 4-6) PATCH /api/users/me/nickname
export interface UpdateNicknameResponse {
  message: string;
  nickname: string;
}

export function updateMyNickname(nickname: string) {
  return request<UpdateNicknameResponse>(`/api/users/me/nickname`, {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  });
}

// 4-7) PATCH /api/users/me/password
export interface UpdatePasswordResponse {
  message: string;
}

export function updateMyPassword(params: {
  current_password: string;
  new_password: string;
}) {
  return request<UpdatePasswordResponse>(`/api/users/me/password`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}
