import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase.from('user_leaderboard').select('*');
      if (error) {
        console.error('❌ Failed to fetch leaderboard:', error.message);
      } else {
        setLeaders(data);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>🏆 Leaderboard</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={styles.th}>User</th>
            <th style={styles.th}>Wins</th>
            <th style={styles.th}>Losses</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Accuracy</th>
            <th style={styles.th}>🔥 Streak</th>
          </tr>
        </thead>
        <tbody>
          {leaders.map((user, index) => {
            const losses = user.total_predictions - user.wins;
            return (
              <tr key={index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                <td>{user.username || user.user_id.slice(0, 6)}</td>
                <td style={styles.tdCenter}>{user.wins}</td>
                <td style={styles.tdCenter}>{losses}</td>
                <td style={styles.tdCenter}>{user.total_predictions}</td>
                <td style={styles.tdCenter}>{user.accuracy}%</td>
                <td style={styles.tdCenter}>{user.current_streak}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  th: {
    textAlign: 'left',
    padding: '10px',
    borderBottom: '1px solid #ccc',
  },
  tdCenter: {
    padding: '10px',
    textAlign: 'center',
    borderBottom: '1px solid #eee',
  },
  evenRow: {
    backgroundColor: '#ffffff',
  },
  oddRow: {
    backgroundColor: '#fafafa',
  },
};
