import { useEffect, useState } from 'react';
import { fetchUserBets } from '../../api/user';
import './MyPage.css';

interface Bet {
  bet_id: string;
  event_title: string;
  option_name: string;
  bet_amount: number;
  potential_payout: number;
  created_at: string;
  status: string;
  settled_at?: string;
}

export default function MyPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBets = async () => {
      try {
        const response = await fetchUserBets();
        setBets(response.data.bets);
      } catch (error) {
        console.error('Failed to fetch bets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBets();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mypage-container">
      <h1>My Page</h1>

      <section className="profile-summary">
        <h2>Profile Summary</h2>
        <p>Nickname: {/* Add nickname here */}</p>
        <p>Current Points: {/* Add points here */}</p>
      </section>

      <section className="bet-history">
        <h2>Betting History</h2>
        {bets.length === 0 ? (
          <p>No betting history available.</p>
        ) : (
          <ul>
            {bets.map((bet) => (
              <li key={bet.bet_id}>
                <p>Event: {bet.event_title}</p>
                <p>Option: {bet.option_name}</p>
                <p>Bet Amount: {bet.bet_amount}</p>
                <p>Potential Payout: {bet.potential_payout}</p>
                <p>Status: {bet.status}</p>
                {bet.settled_at && <p>Settled At: {bet.settled_at}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="point-history">
        <h2>Point History</h2>
        <p>Coming soon...</p>
      </section>
    </div>
  );
}