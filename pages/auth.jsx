// pages/auth.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if username is set
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (data?.username) {
          window.location.href = '/';
        } else {
          window.location.href = '/profile';
        }
      }
    };

    redirectIfLoggedIn();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) alert(error.message);
      else alert('Check your email to verify your account.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
      else window.location.href = '/';
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
      <h1>{mode === 'signup' ? 'Sign Up' : 'Log In'}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <p style={{ marginTop: 10 }}>
        {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
        <span
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          style={{ color: 'blue', cursor: 'pointer' }}
        >
          {mode === 'signup' ? 'Log in' : 'Sign up'}
        </span>
      </p>
    </div>
  );
}
