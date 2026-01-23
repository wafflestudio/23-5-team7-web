import client from './client';

// Fetch user betting history
export const fetchUserBets = (params?: {
  status?: 'PENDING' | 'WON' | 'LOST';
  limit?: number;
  offset?: number;
}) => {
  return client.get('/api/users/me/bets', {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  });
};