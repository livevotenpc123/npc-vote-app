// pages/profile.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const [username, setUsername] = useState('');
  const [hasUsername, setHasUsername] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (data?.username) {
        setHasUsername(true);
        window.location.href = '/'; // Already has username, redirect home
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleSubmit = async () => {
    if (!username.trim() || !userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', userId);

    if (!error) {
      window.location.href = '/';
    } else {
      alert('Error setting username');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (hasUsername) return null;

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
      <h1>Set your username</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Choose a username"
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />
      <button onClick={handleSubmit} style={{ padding: 10, width: '100%' }}>
        Save
      </button>
    </div>
  );
}
