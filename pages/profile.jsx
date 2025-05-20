import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (data) setUsername(data.username);
      }
    }
    loadUser();
  }, []);

  const handleSubmit = async () => {
    console.log('Submitting username:', username, 'userId:', userId);
    if (!username || !userId) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, username });

    if (error) {
      alert('Failed to save username');
    } else {
      alert('Username saved!');
      const next = localStorage.getItem('redirectAfterProfile');
      if (next) {
        localStorage.removeItem('redirectAfterProfile');
        window.location.href = next;
      } else {
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h1>Set Your Username</h1>
      <input
        type="text"
        placeholder="Your display name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          padding: '10px',
          width: '100%',
          marginBottom: '10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
        }}
      />
      <button onClick={handleSubmit} disabled={loading} style={{
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        background: '#000',
        color: '#fff',
        cursor: 'pointer',
      }}>
        {loading ? 'Saving...' : 'Save Username'}
      </button>
    </div>
  );
}
