// pages/index.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [votes, setVotes] = useState({ Yes: 0, No: 0 });
  const [comment, setComment] = useState('');
  const [commentsList, setCommentsList] = useState([]);
  const [replyMap, setReplyMap] = useState({});
  const [prediction, setPrediction] = useState('');
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [showComments, setShowComments] = useState(false);

  const router = useRouter();

  // 1) Get user + username
  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth');
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single();

      if (!profile?.username) {
        localStorage.setItem('redirectAfterProfile', '/');
        return router.push('/profile');
      }
      setUsername(profile.username);
    }
    initUser();
  }, [router]);

  // 2) Load today's question
  useEffect(() => {
    async function loadQuestion() {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('date', dayjs().format('YYYY-MM-DD'))
        .single();
      if (error) console.error(error);
      else setQuestion(data);
      setLoading(false);
    }
    loadQuestion();
  }, []);

  // 3) Load votes & check if user already voted
  useEffect(() => {
    async function loadVotes() {
      if (!question || !userId) return;
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('question_id', question.id);

      if (!data) return;

      const counts = data.reduce((acc, v) => {
        acc[v.choice] = (acc[v.choice] || 0) + 1;
        return acc;
      }, { Yes: 0, No: 0 });
      setVotes(counts);

      const mine = data.find(v => v.user_id === userId);
      if (mine) {
        setAlreadyVoted(true);
        setSelectedOption(mine.choice);
        setPrediction(mine.prediction);
        setShowComments(true);
      }
    }
    loadVotes();
  }, [question, userId]);

  // 4) Load stats
  useEffect(() => {
    if (!userId) return;
    supabase.rpc('get_user_streak', { p_user_id: userId })
      .then(({ data }) => data !== null && setStreak(data));

    supabase.from('votes').select('correct_prediction')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          setWins(data.filter(v => v.correct_prediction).length);
          setLosses(data.filter(v => v.correct_prediction === false).length);
        }
      });
  }, [userId]);

  // 5) Load comments whenever question or toggled
  useEffect(() => {
    async function loadComments() {
      if (!question) return;
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('question_id', question.id)
        .order('created_at', { ascending: true });
      if (data) setCommentsList(data);
    }
    if (showComments) loadComments();
  }, [question, showComments]);

  const totalVotes = votes.Yes + votes.No || 1;
  const pct = choice => ((votes[choice] / totalVotes) * 100).toFixed(1);

  // Vote handler
  const handleVote = async (choice) => {
    if (alreadyVoted || !prediction || !question) return;
    const { error } = await supabase.from('votes').insert([{
      user_id: userId,
      question_id: question.id,
      choice,
      prediction,
    }]);
    if (error) return alert(error.message);
    setSelectedOption(choice);
    setVotes(prev => ({ ...prev, [choice]: prev[choice] + 1 }));
    setAlreadyVoted(true);
    setShowComments(true);
  };

  // Comment handler
  const handleComment = async (parentId = null, text = comment) => {
    if (!text.trim()) return;
    await supabase.from('comments').insert([{
      question_id: question.id,
      content: text.trim(),
      user_id: userId,
      parent_id: parentId,
    }]);
    setComment('');
    setReplyMap(prev => ({ ...prev, [parentId]: '' }));
    // refresh
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('question_id', question.id)
      .order('created_at', { ascending: true });
    setCommentsList(data);
  };

  if (loading || !question) return <div style={styles.container}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>NPC</h2>
        <div>{username}</div>
      </header>

      <main style={styles.main}>
        <div style={styles.meta}>
          <span>{question.date}</span>
          <span>🔥 {streak}‑day streak • 🏅 {wins}/{losses}</span>
        </div>
        <h1 style={styles.question}>{question.question_text}</h1>

        { !alreadyVoted ? (
          <>
            <select
              value={prediction}
              onChange={e => setPrediction(e.target.value)}
              style={styles.dropdown}
            >
              <option value="">Your prediction…</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <div style={styles.options}>
              {[question.option_a, question.option_b].map(opt => (
                <button
                  key={opt}
                  onClick={() => handleVote(opt)}
                  style={styles.voteBtn}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={styles.results}>
            <div style={styles.barContainer}>
              <div style={{ ...styles.bar, width: `${pct(question.option_a)}%` }}>
                {pct(question.option_a)}%
              </div>
              <div style={{ ...styles.bar, width: `${pct(question.option_b)}%`, background: '#d0d0d0' }}>
                {pct(question.option_b)}%
              </div>
            </div>
            <button style={styles.share}>Share</button>
          </div>
        )}

        {showComments && (
          <section style={styles.commentsSec}>
            <h2>Comments</h2>
            <ul style={styles.commentsList}>
              {commentsList.filter(c => !c.parent_id).map(c => (
                <li key={c.id} style={styles.commentItem}>
                  <b>{c.profiles.username}:</b> {c.content}
                  {commentsList.filter(r => r.parent_id === c.id)
                    .map(r => (
                      <div key={r.id} style={styles.reply}>
                        <b>{r.profiles.username}:</b> {r.content}
                      </div>
                    ))}
                  <div style={styles.replyInputWrap}>
                    <input
                      style={styles.replyInput}
                      value={replyMap[c.id]||''}
                      placeholder="Reply…"
                      onChange={e => setReplyMap(prev => ({...prev, [c.id]: e.target.value }))}
                    />
                    <button onClick={() => handleComment(c.id, replyMap[c.id])} style={styles.replyBtn}>Reply</button>
                  </div>
                </li>
              ))}
            </ul>
            <div style={styles.newComment}>
              <input
                style={styles.commentInput}
                value={comment}
                placeholder="Add a comment…"
                onChange={e => setComment(e.target.value)}
              />
              <button onClick={() => handleComment(null)} style={styles.commentBtn}>Submit</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { maxWidth: 600, margin: '0 auto', fontFamily: 'Arial,sans-serif', padding: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  main: { textAlign: 'center' },
  meta: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' },
  question: { fontSize: 24, margin: '16px 0' },
  dropdown: { padding: 8, marginBottom: 12, width: '100%' },
  options: { display: 'flex', flexDirection: 'column', gap: 8 },
  voteBtn: { padding: 12, fontSize: 18, borderRadius: 8, cursor: 'pointer' },
  results: { marginTop: 20 },
  barContainer: { display: 'flex', width: '100%', height: 30, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  bar: { background: '#4caf50', color: '#fff', textAlign: 'center', lineHeight: '30px' },
  share: { padding: '8px 16px', cursor: 'pointer' },
  commentsSec: { textAlign: 'left', marginTop: 30 },
  commentsList: { listStyle: 'none', padding: 0 },
  commentItem: { marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8 },
  reply: { marginLeft: 20, fontStyle: 'italic' },
  replyInputWrap: { display: 'flex', gap: 8, marginTop: 8 },
  replyInput: { flex: 1, padding: 6 },
  replyBtn: { padding: '6px 12px' },
  newComment: { display: 'flex', gap: 8, marginTop: 16 },
  commentInput: { flex: 1, padding: 8 },
  commentBtn: { padding: '8px 16px' },
};

