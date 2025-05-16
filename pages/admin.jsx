import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const allowedAdmins = [
        'msmiller255@gmail.com',
        
      ];

      if (!data.user || !allowedAdmins.includes(data.user.email)) {
        router.push('/auth');
      } else {
        setUser(data.user);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

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
      setMessage(error.message);
    } else {
      setMessage('✅ Question submitted!');
      setQuestionText('');
      setOptionA('');
      setOptionB('');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: 'auto' }}>
      <h2>🛠 Admin Dashboard</h2>
      <p>Welcome, {user?.email}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <label>Question</label>
        <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />

        <label>Option A</label>
        <input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />

        <label>Option B</label>
        <input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />

        <button type="submit">Submit</button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}


