import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase.from('user_leaderboard').select('*');

      if (error) {
        console.error('Failed to fetch leaderboard:', error.message);
      } else {
        setLeaders(data);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <div style={{ padding: '30px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🏆 Leaderboard</h1>
      <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>User</th>
            <th>Wins</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {leaders.map((user, idx) => (
            <tr key={idx}>
              <td>{user.user_id.slice(0, 6)}...</td>
              <td style={{ textAlign: 'center' }}>{user.wins}</td>
              <td style={{ textAlign: 'center' }}>{user.total_predictions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
