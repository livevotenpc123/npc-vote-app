// scripts/scorePreviousQuestion.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
console.log('🧪 SUPABASE URL LOADED:', process.env.NEXT_PUBLIC_SUPABASE_URL);


// ✅ Connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ✅ Helper: Get yesterday’s date in YYYY-MM-DD format
function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

async function run() {
  const date = getYesterdayDate();
  console.log('📆 Checking votes for:', date);

  // ✅ Step 1: Get yesterday's question
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id')
    .eq('date', date)
    .single();

  if (questionError || !question) {
    console.error('❌ No question found:', questionError?.message);
    return;
  }

  const questionId = question.id;
  console.log('✅ Question ID:', questionId);

  // ✅ Step 2: Get all votes for that question
  const { data: votes, error: voteError } = await supabase
    .from('votes')
    .select('choice')
    .eq('question_id', questionId);

  if (voteError || !votes.length) {
    console.error('❌ No votes found:', voteError?.message);
    return;
  }

  const count = { Yes: 0, No: 0 };
  for (const v of votes) {
    if (v.choice === 'Yes') count.Yes++;
    else if (v.choice === 'No') count.No++;
  }

  const winner = count.Yes === count.No
    ? 'Yes' // ← customize tie logic here
    : count.Yes > count.No ? 'Yes' : 'No';

  console.log(`🏆 Winner is: ${winner} (Yes: ${count.Yes}, No: ${count.No})`);

  // ✅ Step 3: Update the actual_winner in the questions table
  const { error: updateWinnerError } = await supabase
    .from('questions')
    .update({ actual_winner: winner })
    .eq('id', questionId);

  if (updateWinnerError) {
    console.error('❌ Failed to update actual_winner:', updateWinnerError.message);
    return;
  }

  // ✅ Step 4: Call the RPC function to update predictions
  const { error: predictionError } = await supabase.rpc('update_prediction_scores', {
    q_id: questionId,
  });

  if (predictionError) {
    console.error('❌ Failed to update prediction scores:', predictionError.message);
  } else {
    console.log('✅ Prediction scores updated successfully.');
  }
}

run();
