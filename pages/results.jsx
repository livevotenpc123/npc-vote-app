// pages/results.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ResultsPage() {
  const [questions, setQuestions] = useState([]);
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    const { data: qData } = await supabase.from('questions').select('*').order('date', { ascending: false });
    const { data: vData } = await supabase.from('votes').select('*');
    setQuestions(qData || []);
    setVotes(vData || []);
  };

  const getVoteStats = (questionId, option) => {
    const filtered = votes.filter(v => v.question_id === questionId && v.choice === option);
    return filtered.length;
  };

  const getPercentage = (yesCount, noCount) => {
    const total = yesCount + noCount;
    if (total === 0) return '0%';
    return ((yesCount / total) * 100).toFixed(1) + '%';
  };

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: 'auto' }}>
      <h1>📊 Vote Results</h1>
      {questions.map((q) => {
        const yesVotes = getVoteStats(q.id, q.option_a);
        const noVotes = getVoteStats(q.id, q.option_b);
        const yesPct = getPercentage(yesVotes, noVotes);
        const noPct = getPercentage(noVotes, yesVotes);

        return (
          <div key={q.id} style={{ marginBottom: 30, padding: 15, border: '1px solid #ddd', borderRadius: 10 }}>
            <p><strong>{q.date}</strong></p>
            <h3>{q.question_text}</h3>
            <p>{q.option_a}: {yesVotes} votes ({yesPct})</p>
            <p>{q.option_b}: {noVotes} votes ({noPct})</p>
          </div>
        );
      })}
    </div>
  );
}
