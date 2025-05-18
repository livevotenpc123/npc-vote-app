import { createClient } from '@supabase/supabase-js';

// ✅ Connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ✅ Get yesterday's date
function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  const date = getYesterdayDate();
  console.log('📆 Scoring for date:', date);

  // ✅ 1. Fetch question
  const { data: question, error: qError } = await supabase
    .from('questions')
    .select('id')
    .eq('date', date)
    .single();

  if (qError || !question) {
    return res.status(500).json({ error: 'No question found for date: ' + date });
  }

  const questionId = question.id;

  // ✅ 2. Get votes
  const { data: votes, error: vError } = await supabase
    .from('votes')
    .select('choice')
    .eq('question_id', questionId);

  if (vError || !votes.length) {
    return res.status(500).json({ error: 'No votes for question ID: ' + questionId });
  }

  const count = { Yes: 0, No: 0 };
  for (const v of votes) {
    if (v.choice === 'Yes') count.Yes++;
    else if (v.choice === 'No') count.No++;
  }

  const winner = count.Yes === count.No
    ? 'Yes'  // or change to 'No' if you prefer for ties
    : count.Yes > count.No ? 'Yes' : 'No';

  // ✅ 3. Update the question with the winner
  const { error: updateWinnerError } = await supabase
    .from('questions')
    .update({ actual_winner: winner })
    .eq('id', questionId);

  if (updateWinnerError) {
    return res.status(500).json({ error: updateWinnerError.message });
  }

  // ✅ 4. Update predictions via RPC
  const { error: predictionError } = await supabase.rpc('update_prediction_scores', {
    q_id: questionId,
  });

  if (predictionError) {
    return res.status(500).json({ error: predictionError.message });
  }

  return res.status(200).json({
    message: `✅ Success: winner was ${winner} on ${date}`,
  });
}
