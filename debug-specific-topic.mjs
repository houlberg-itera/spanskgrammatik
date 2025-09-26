// Test specific topic to see exercise count and completion issue
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (copy settings from your app)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTopicExercises(topicId) {
  console.log(`🔍 Debugging topic ${topicId} exercises and completion logic...`);
  
  try {
    // Fetch all exercises for this topic
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('topic_id', topicId)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching exercises:', error);
      return;
    }
    
    console.log(`📚 Found ${exercises.length} exercises for topic ${topicId}`);
    console.log('📋 Exercise details:');
    
    exercises.forEach((exercise, index) => {
      console.log(`  ${index + 1}. ID: ${exercise.id} - ${exercise.question_da}`);
      console.log(`     Type: ${exercise.question_type}, Answer: ${exercise.correct_answer}`);
    });
    
    console.log('\n🎯 Simulating completion logic:');
    
    if (exercises.length === 0) {
      console.log('❌ NO EXERCISES FOUND - This explains premature completion!');
      return;
    }
    
    for (let currentIndex = 0; currentIndex < exercises.length; currentIndex++) {
      console.log(`\n🔢 Question ${currentIndex + 1} of ${exercises.length} (index: ${currentIndex})`);
      console.log(`   Question: ${exercises[currentIndex].question_da}`);
      
      // Simulate clicking Continue after correct answer
      if (currentIndex < exercises.length - 1) {
        const nextIndex = currentIndex + 1;
        const progress = ((currentIndex + 2) / exercises.length) * 100;
        console.log(`   ✅ Continue clicked: Moving to index ${nextIndex}, Progress: ${progress}%`);
      } else {
        console.log(`   🏁 COMPLETION: currentIndex (${currentIndex}) >= exercises.length - 1 (${exercises.length - 1})`);
        console.log(`   🚀 This would redirect to dashboard - showing "Afslut"`);
        break;
      }
    }
    
    console.log(`\n📊 ANALYSIS for topic ${topicId}:`);
    console.log(`   Total exercises in database: ${exercises.length}`);
    console.log(`   Expected questions to show: ${exercises.length}`);
    console.log(`   Last question index: ${exercises.length - 1}`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Test a specific topic - you can change this number to match your test
const topicIdToTest = 5; // Change this to the topic you're testing
debugTopicExercises(topicIdToTest);