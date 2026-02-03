import { request } from './client';

export interface RankingEntry {
  rank: number;
  nickname: string;
  points: number;
}

export interface RankingResponse {
  total_count: number;
  updated_at: string;
  rankings: RankingEntry[];
}

export function getUserRanking(limit?: number) {
  const qs = new URLSearchParams();
  if (typeof limit === 'number') qs.set('limit', String(limit));
  const query = qs.toString();
  return request<RankingResponse>(
    `/api/users/ranking${query ? `?${query}` : ''}`
  );
}
