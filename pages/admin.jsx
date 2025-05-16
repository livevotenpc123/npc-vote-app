import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

const AdminDashboard = () => {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [success, setSuccess] = useState(null);

  const handleAuth = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuth(true);
    } else {
      setError('Wrong password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('questions').insert([
      {
        date,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
      },
    ]);
    if (error) {
      setSuccess(null);
      setError(error.message);
    } else {
      setSuccess('Question added!');
      setQuestionText('');
      setOptionA('');
      setOptionB('');
    }
  };

  if (!auth) {
    return (
      <div style={{ padding: 40 }}>
        <h2>🔐 Admin Access</h2>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleAuth}>Enter</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>🛠 Admin Dashboard</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label>Question</label>
        <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
        <label>Option A</label>
        <input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
        <label>Option B</label>
        <input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
        <button type="submit">Submit Question</button>
        {success && <p style={{ color: 'green' }}>{success}</p>}
      </form>
    </div>
  );
};

export default AdminDashboard;

