import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [votes, setVotes] = useState({ Yes: 0, No: 0 });
  const [prediction, setPrediction] = useState('');
  const [userId, setUserId] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [usernameChecked, setUsernameChecked] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.username) {
        localStorage.setItem('redirectAfterProfile', '/');
        router.push('/profile');
        return;
      }

      setUsernameChecked(true);
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('date', dayjs().format('YYYY-MM-DD'))
        .single();

      if (data) setQuestion(data);
      else console.error('No question found for today', error);

      setLoading(false);
    };
    fetchQuestion();
  }, []);

  useEffect(() => {
    const fetchVotes = async () => {
      if (!question || !userId) return;
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('question_id', question.id);

      if (data) {
        const counts = data.reduce((acc, vote) => {
          acc[vote.choice] = (acc[vote.choice] || 0) + 1;
          return acc;
        }, { Yes: 0, No: 0 });
        setVotes(counts);

        const already = data.find((v) => v.user_id === userId);
        if (already) {
          setAlreadyVoted(true);
          setSelectedOption(already.choice);
          setPrediction(already.prediction);
        }
      }
    };
    fetchVotes();
  }, [userId, question]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;

      const { data: streakData } = await supabase.rpc('get_user_streak', { p_user_id: userId });
      if (streakData !== null) setStreak(streakData);

      const { data } = await supabase
        .from('votes')
        .select('correct_prediction')
        .eq('user_id', userId);

      if (data) {
        const winsCount = data.filter((v) => v.correct_prediction === true).length;
        const lossesCount = data.filter((v) => v.correct_prediction === false).length;
        setWins(winsCount);
        setLosses(lossesCount);
      }
    };
    fetchStats();
  }, [userId]);

  const handleVote = async (option) => {
    if (alreadyVoted || !prediction || !question?.id) return;

    const { error } = await supabase.from('votes').insert([
      {
        user_id: userId,
        question_id: question.id,
        choice: option,
        prediction,
      },
    ]);

    if (error) {
      alert('Vote failed: ' + error.message);
      return;
    }

    setSelectedOption(option);
    setVotes((prev) => ({ ...prev, [option]: (prev[option] || 0) + 1 }));
    setAlreadyVoted(true);
  };

  const totalVotes = votes.Yes + votes.No || 1;

  if (loading || !question || !usernameChecked) return <p>Loading...</p>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>NPC</div>
        <a href="/auth" style={styles.loginButton}>Login</a>
      </header>

      <main style={styles.main}>
        <p style={styles.date}>{question.date}</p>
        <h1 style={styles.question}>{question.question_text}</h1>

        {userId && (
          <>
            <p><strong>🔥 Your streak:</strong> {streak} day{streak !== 1 ? 's' : ''}</p>
            <p><strong>🏅 Prediction record:</strong> {wins} - {losses}</p>
          </>
        )}

        {!selectedOption && !alreadyVoted ? (
          <>
            <select
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              style={styles.dropdown}
            >
              <option value="">Predict the winner</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <div style={styles.optionsContainer}>
              {[question.option_a, question.option_b].map((option) => (
                <button
                  key={option}
                  onClick={() => handleVote(option)}
                  style={styles.voteButton}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={styles.resultsContainer}>
            <div style={styles.resultsBar}>
              <span>{question.option_a}: {((votes.Yes / totalVotes) * 100).toFixed(1)}%</span>
              <span>{question.option_b}: {((votes.No / totalVotes) * 100).toFixed(1)}%</span>
            </div>
            <button style={styles.shareButton}>Share</button>
          </div>
        )}

        <footer style={styles.footer}>1 question per day</footer>
      </main>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'Arial', padding: '10px', maxWidth: '600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' },
  loginButton: { background: 'none', border: '1px solid black', padding: '5px 10px', borderRadius: '5px', textDecoration: 'none', color: 'black' },
  main: { textAlign: 'center', marginTop: '30px' },
  date: { color: '#777', marginBottom: '10px' },
  question: { fontSize: '24px', marginBottom: '20px' },
  dropdown: { padding: '10px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc' },
  optionsContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  voteButton: { padding: '15px', fontSize: '18px', backgroundColor: '#f2f2f2', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  resultsContainer: { marginBottom: '20px' },
  resultsBar: { display: 'flex', justifyContent: 'space-around', marginBottom: '10px' },
  shareButton: { border: '1px solid black', background: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' },
  footer: { marginTop: '50px', color: '#999', fontSize: '14px' },
};

