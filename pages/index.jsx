// pages/index.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [votes, setVotes] = useState({});
  const [comment, setComment] = useState('');
  const [commentsList, setCommentsList] = useState([]);
  const [replyMap, setReplyMap] = useState({});
  const [prediction, setPrediction] = useState('');
  const [userId, setUserId] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

      setLoading(false);
    };
    fetchQuestion();
  }, []);

  useEffect(() => {
    const fetchVotes = async () => {
      if (!question || !userId) return;
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('question_id', question.id);

      if (data) {
        const counts = data.reduce((acc, vote) => {
          acc[vote.choice] = (acc[vote.choice] || 0) + 1;
          return acc;
        }, { Yes: 0, No: 0 });
        setVotes(counts);

        const already = data.find((v) => v.user_id === userId);
        if (already) setAlreadyVoted(true);
      }
    };
    fetchVotes();
  }, [userId, question]);

  useEffect(() => {
    const fetchStreak = async () => {
      if (!userId) return;
      const { data } = await supabase.rpc('get_user_streak', {
        p_user_id: userId,
      });
      if (data !== null) setStreak(data);
    };
    fetchStreak();
  }, [userId]);

  useEffect(() => {
    const fetchPredictionRecord = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('votes')
        .select('correct_prediction')
        .eq('user_id', userId);

      const winsCount = data.filter((v) => v.correct_prediction === true).length;
      const lossesCount = data.filter((v) => v.correct_prediction === false).length;
      setWins(winsCount);
      setLosses(lossesCount);
    };
    fetchPredictionRecord();
  }, [userId]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!question) return;
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('question_id', question.id)
        .order('created_at', { ascending: true });
      if (!error) setCommentsList(data);
      else console.error('Error fetching comments:', error);
    };
    fetchComments();
  }, [question]);

  const handleVote = async (option) => {
    if (alreadyVoted || !prediction || !question?.id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.username) {
      localStorage.setItem('redirectAfterProfile', '/');
      window.location.href = '/profile';
      return;
    }

    const { error } = await supabase.from('votes').insert([
      {
        user_id: user.id,
        email: user.email,
        question_id: question.id,
        choice: option,
        prediction,
      },
    ]);

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
  };

  const handleCommentSubmit = async (parentId = null, content = comment) => {
    if (!content.trim() || !question?.id) return;
    const { error } = await supabase.from('comments').insert([
      {
        question_id: question.id,
        content: content.trim(),
        user_id: userId,
        parent_id: parentId,
      },
    ]);
    if (!error) {
      setComment('');
      setReplyMap((prev) => ({ ...prev, [parentId]: '' }));
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('question_id', question.id)
        .order('created_at', { ascending: true });
      setCommentsList(data);
    }
  };

  const totalVotes = votes.Yes + votes.No || 1;

  if (loading || !question) return <p>Loading...</p>;

  return (
    <div>
      <h1>{question.question_text}</h1>
      {/* Voting UI */}
      {!selectedOption && !alreadyVoted ? (
        <>
          <select value={prediction} onChange={(e) => setPrediction(e.target.value)}>
            <option value="">Predict the winner</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          {[question.option_a, question.option_b].map((option) => (
            <button key={option} onClick={() => handleVote(option)}>
              {option}
            </button>
          ))}
        </>
      ) : (
        <p>Thanks for voting!</p>
      )}

      {/* Comments UI */}
      <div>
        <h2>Comments</h2>
        {commentsList
          .filter((c) => !c.parent_id)
          .map((comment) => (
            <div key={comment.id} style={{ marginBottom: '10px' }}>
              <p><strong>{comment.profiles?.username || 'Anonymous'}:</strong> {comment.content}</p>
              {commentsList
                .filter((reply) => reply.parent_id === comment.id)
                .map((reply) => (
                  <p key={reply.id} style={{ marginLeft: '20px', fontStyle: 'italic' }}>
                    ↳ <strong>{reply.profiles?.username || 'Anonymous'}:</strong> {reply.content}
                  </p>
                ))}
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyMap[comment.id] || ''}
                onChange={(e) => setReplyMap((prev) => ({ ...prev, [comment.id]: e.target.value }))}
              />
              <button onClick={() => handleCommentSubmit(comment.id, replyMap[comment.id])}>
                Reply
              </button>
            </div>
          ))}
        <input
          type="text"
          placeholder="Write a comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button onClick={() => handleCommentSubmit()}>Submit Comment</button>
      </div>
    </div>
  );
}
