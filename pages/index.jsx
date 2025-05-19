import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [streak, setStreak] = useState(0);
  const [record, setRecord] = useState({ wins: 0, losses: 0 });

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  useEffect(() => {
    async function fetchData() {
      const today = dayjs().format('YYYY-MM-DD');

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('date', today)
        .single();

      setDailyQuestion(questionData);

      const { data: voteData } = await supabase
        .from('votes')
        .select('*')
        .eq('question_id', questionData?.id)
        .eq('user_id', user?.id);

      if (voteData && voteData.length > 0) {
        setHasVoted(true);
        setSelectedOption(voteData[0].choice);
      }

      const { data: commentData } = await supabase
        .from('comments')
        .select('*')
        .eq('question_id', questionData?.id)
        .order('created_at', { ascending: true });

      setComments(commentData || []);

      const { data: streakData } = await supabase
        .from('streaks')
        .select('streak')
        .eq('user_id', user?.id)
        .single();

      if (streakData) setStreak(streakData.streak);

      const { data: recordData } = await supabase
        .from('votes')
        .select('correct_prediction')
        .eq('user_id', user?.id);

      if (recordData) {
        const wins = recordData.filter((v) => v.correct_prediction === true).length;
        const losses = recordData.filter((v) => v.correct_prediction === false).length;
        setRecord({ wins, losses });
      }
    }
    if (user) fetchData();
  }, [user]);

  async function handleVote(choice) {
    if (!dailyQuestion || !user || hasVoted) return;

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('votes').insert([
      {
        user_id: currentUser?.id,
        email: currentUser?.email,
        question_id: dailyQuestion.id,
        choice,
        prediction: choice,
      },
    ]);

    if (!error) {
      setSelectedOption(choice);
      setHasVoted(true);
    } else {
      console.error('Error submitting vote:', error.message);
    }
  }

  async function submitComment() {
    if (!comment.trim() || !dailyQuestion || !user) return;

    const { error } = await supabase.from('comments').insert([
      {
        user_id: user.id,
        question_id: dailyQuestion.id,
        text: comment,
      },
    ]);

    if (!error) {
      setComments([...comments, { text: comment }]);
      setComment('');
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>NPC Daily Question</h1>
      <p>🔥 Streak: {streak} days</p>
      <p>🏅 Record: {record.wins} - {record.losses}</p>

      {dailyQuestion ? (
        <>
          <h2>{dailyQuestion.question_text}</h2>
          {!hasVoted ? (
            <div>
              <button onClick={() => handleVote('Yes')}>Yes</button>
              <button onClick={() => handleVote('No')}>No</button>
            </div>
          ) : (
            <p>You voted: <strong>{selectedOption}</strong></p>
          )}
        </>
      ) : (
        <p>Loading question...</p>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Comments</h3>
        {comments.map((c, i) => (
          <p key={i}>{c.text}</p>
        ))}
        <input
          type="text"
          placeholder="Write a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button onClick={submitComment}>Submit</button>
      </div>
    </div>
  );
}
