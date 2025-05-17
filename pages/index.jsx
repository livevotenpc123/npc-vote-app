// pages/index.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [votes, setVotes] = useState({});
  const [streak, setStreak] = useState(0);
  const [comment, setComment] = useState('');
  const [commentsList, setCommentsList] = useState([]);
  const [prediction, setPrediction] = useState('');
  const [userId, setUserId] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('date', dayjs().format('YYYY-MM-DD'))
        .single();

      if (data) setQuestion(data);
      else console.error('No question found for today', error);
    };

    fetchQuestion();
  }, []);

  useEffect(() => {
    const fetchVotes = async () => {
      if (!question || !userId) return;
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('question_id', question.id);

      if (data) {
        const counts = data.reduce(
          (acc, vote) => {
            acc[vote.choice] = (acc[vote.choice] || 0) + 1;
            return acc;
          },
          { Yes: 0, No: 0 }
        );
        setVotes(counts);

        const already = data.find((v) => v.user_id === userId);
        if (already) setAlreadyVoted(true);
      }

      setLoading(false);
    };

    fetchVotes();
  }, [userId, question]);
  useEffect(() => {
  const fetchStreak = async () => {
    if (!userId) return; // wait until user is loaded

    const { data, error } = await supabase.rpc('get_user_streak', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching streak:', error.message);
    } else {
      setStreak(data);
    }
  };

  fetchStreak();
}, [userId]); // this runs when the user ID is available


  const handleVote = async (option) => {
    if (alreadyVoted || !userId || !prediction || !question?.id) return;

    try {
      const { error } = await supabase.from('votes').insert([
        {
          question_id: question.id,
          choice: option,
          user_id: userId,
          prediction,
        },
      ]);

      console.log('Vote attempt:', { userId, option, prediction, error });

      if (error) {
        alert('Vote failed: ' + error.message);
        return;
      }

      setSelectedOption(option);
      setVotes((prev) => ({
        ...prev,
        [option]: (prev[option] || 0) + 1,
      }));
      setAlreadyVoted(true);
    } catch (err) {
      console.error('Vote insert threw error:', err);
    }
  };

  const handleCommentSubmit = async () => {
    if (comment.trim() && question?.id) {
      await supabase.from('comments').insert([
        {
          question_id: question.id,
          content: comment.trim(),
          user_id: userId,
        },
      ]);
      setCommentsList((prev) => [...prev, comment.trim()]);
      setComment('');
    }
  };

  const totalVotes = votes.Yes + votes.No || 1;

  if (loading || !question) return <p>Loading...</p>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>NPC</div>
        <a href="/auth" style={styles.loginButton}>Login</a>
      </header>

      <main style={styles.main}>
        <p style={styles.date}>{question.date}</p>
        <h1 style={styles.question}>{question.question_text}</h1>

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

        {(selectedOption || alreadyVoted) && (
          <div style={styles.commentsSection}>
            <h2>Comments</h2>
            <ul style={styles.commentsList}>
              {commentsList.map((item, index) => (
                <li key={index} style={styles.commentItem}>{item}</li>
              ))}
            </ul>
            <input
              type="text"
              placeholder="Write a comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={styles.commentInput}
            />
            <button onClick={handleCommentSubmit} style={styles.submitCommentButton}>
              Submit Comment
            </button>
          </div>
        )}
{userId && (
  <p style={{ fontWeight: 'bold', marginTop: '10px' }}>
    🔥 Your streak: {streak} day{streak !== 1 ? 's' : ''}
  </p>
)}
        <footer style={styles.footer}>1 question per day</footer>
      </main>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '10px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
  },
  loginButton: {
    background: 'none',
    border: '1px solid black',
    padding: '5px 10px',
    borderRadius: '5px',
    textDecoration: 'none',
    color: 'black',
  },
  main: {
    textAlign: 'center',
    marginTop: '30px',
  },
  date: {
    color: '#777',
    marginBottom: '10px',
  },
  question: {
    fontSize: '24px',
    marginBottom: '20px',
  },
  dropdown: {
    padding: '10px',
    marginBottom: '20px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  voteButton: {
    padding: '15px',
    fontSize: '18px',
    backgroundColor: '#f2f2f2',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  resultsContainer: {
    marginBottom: '20px',
  },
  resultsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '10px',
  },
  shareButton: {
    border: '1px solid black',
    background: 'none',
    padding: '10px',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  commentsSection: {
    marginTop: '30px',
  },
  commentsList: {
    listStyle: 'none',
    padding: '0',
  },
  commentItem: {
    padding: '5px',
    borderBottom: '1px solid #eee',
  },
  commentInput: {
    width: '100%',
    padding: '10px',
    marginTop: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  submitCommentButton: {
    marginTop: '10px',
    padding: '10px 20px',
    borderRadius: '5px',
    border: '1px solid black',
    background: 'none',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '50px',
    color: '#999',
    fontSize: '14px',
  },
};

