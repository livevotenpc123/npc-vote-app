import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export default function Home() {
  const [userId, setUserId] = useState(null);
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [comment, setComment] = useState('');
  const [commentsList, setCommentsList] = useState([]);

  useEffect(() => {
    initializeUser();
    fetchTodayQuestion();
  }, []);

  const initializeUser = async () => {
    let storedId = localStorage.getItem('npc_user_id');
    if (!storedId) {
      const newId = crypto.randomUUID();
      localStorage.setItem('npc_user_id', newId);
      storedId = newId;
      await supabase.from('streaks').insert({ user_id: newId, current_streak: 0, last_voted_date: null });
    }
    setUserId(storedId);
    checkStreak(storedId);
  };

  const fetchTodayQuestion = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('date', today)
      .single();
    if (data) {
      setDailyQuestion(data);
      fetchComments(data.id);
    }
  };

  const fetchComments = async (questionId) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('question_id', questionId);
    if (data) setCommentsList(data);
  };

  const handleVote = async (option) => {
    if (!selectedOption && prediction) {
      setSelectedOption(option);

      await supabase.from('votes').insert({
        question_id: dailyQuestion.id,
        choice: option,
        prediction: prediction,
      });

      updateStreak();
    }
  };

  const handleCommentSubmit = async () => {
    if (comment.trim()) {
      await supabase.from('comments').insert({
        question_id: dailyQuestion.id,
        comment_text: comment.trim(),
      });
      setComment('');
      fetchComments(dailyQuestion.id);
    }
  };

  const checkStreak = async (id) => {
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', id)
      .single();

    if (data) {
      setCurrentStreak(data.current_streak || 0);
    }
  };

  const updateStreak = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      if (data.last_voted_date === yesterday) {
        await supabase
          .from('streaks')
          .update({ current_streak: data.current_streak + 1, last_voted_date: today })
          .eq('user_id', userId);
        setCurrentStreak(data.current_streak + 1);
      } else {
        await supabase
          .from('streaks')
          .update({ current_streak: 1, last_voted_date: today })
          .eq('user_id', userId);
        setCurrentStreak(1);
      }
    }
  };

  if (!dailyQuestion) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: 'auto' }}>
      <h1>🔥 {currentStreak} Day Streak</h1>

      <h2 style={{ marginTop: 20 }}>{dailyQuestion.question_text}</h2>

      {!selectedOption ? (
        <>
          <p>Prediction: Which side will win?</p>
          <select value={prediction} onChange={(e) => setPrediction(e.target.value)}>
            <option value="">Pick One</option>
            <option value="Yes">{dailyQuestion.option_a}</option>
            <option value="No">{dailyQuestion.option_b}</option>
          </select>

          <div style={{ marginTop: 20 }}>
            {[dailyQuestion.option_a, dailyQuestion.option_b].map((option) => (
              <button
                key={option}
                onClick={() => handleVote(option)}
                style={{ margin: 10, padding: 15, borderRadius: 10, fontSize: 18 }}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h3 style={{ marginTop: 30 }}>You voted: {selectedOption}</h3>
          <h4>Comments:</h4>

          <ul>
            {commentsList.map((c, index) => (
              <li key={index}>{c.comment_text}</li>
            ))}
          </ul>

          <input
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', marginTop: 10 }}
          />
          <button onClick={handleCommentSubmit} style={{ marginTop: 10 }}>
            Submit
          </button>
        </>
      )}
    </div>
  );
}
