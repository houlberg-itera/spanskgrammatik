// Test script to diagnose user_level_progress table update issues
// This script will check the RPC function and table synchronization

const { createClient } = require('@supabase/supabase-js');

// Test the user_level_progress synchronization issue
async function testProgressSync() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Testing user_level_progress synchronization...');
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication required');
      return;
    }

    console.log(`👤 Testing for user: ${user.id}`);

    // Check user_progress data
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        exercise_id,
        score,
        completed,
        exercises (
          id,
          level
        )
      `)
      .eq('user_id', user.id)
      .eq('completed', true);

    if (progressError) {
      console.error('❌ Error fetching user_progress:', progressError);
      return;
    }

    console.log(`📊 Found ${userProgress?.length || 0} completed exercises in user_progress`);

    // Group by level
    const levelStats = {};
    userProgress?.forEach(progress => {
      const level = progress.exercises?.level;
      if (level) {
        if (!levelStats[level]) {
          levelStats[level] = { completed: 0, total: 0 };
        }
        levelStats[level].completed++;
      }
    });

    // Get total exercises per level
    for (const level of Object.keys(levelStats)) {
      const { data: allExercises, error: totalError } = await supabase
        .from('exercises')
        .select('id')
        .eq('level', level);
      
      if (!totalError && allExercises) {
        levelStats[level].total = allExercises.length;
        levelStats[level].percentage = Math.round((levelStats[level].completed / levelStats[level].total) * 100);
      }
    }

    console.log('📈 Calculated level progress from user_progress:');
    Object.entries(levelStats).forEach(([level, stats]) => {
      console.log(`  ${level}: ${stats.completed}/${stats.total} (${stats.percentage}%)`);
    });

    // Check user_level_progress table
    const { data: levelProgress, error: levelError } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', user.id);

    if (levelError) {
      console.error('❌ Error fetching user_level_progress:', levelError);
      return;
    }

    console.log('📊 Current user_level_progress table:');
    levelProgress?.forEach(progress => {
      console.log(`  ${progress.level}: ${progress.progress_percentage}%`);
    });

    // Compare and identify discrepancies
    console.log('\n🔍 DISCREPANCY ANALYSIS:');
    Object.entries(levelStats).forEach(([level, calculated]) => {
      const stored = levelProgress?.find(p => p.level === level);
      if (!stored) {
        console.log(`❌ ${level}: Missing from user_level_progress table`);
      } else if (stored.progress_percentage !== calculated.percentage) {
        console.log(`❌ ${level}: Mismatch - Calculated: ${calculated.percentage}%, Stored: ${stored.progress_percentage}%`);
      } else {
        console.log(`✅ ${level}: Synchronized correctly`);
      }
    });

    // Test RPC function directly
    console.log('\n🧪 Testing RPC function...');
    if (userProgress && userProgress.length > 0) {
      const testExercise = userProgress[0];
      console.log(`Testing RPC with exercise ${testExercise.exercise_id}`);
      
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('update_user_progress', {
          exercise_id_param: testExercise.exercise_id,
          score_param: testExercise.score
        });

      if (rpcError) {
        console.error('❌ RPC function failed:', rpcError);
      } else {
        console.log('✅ RPC function executed successfully');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check if running in Node.js environment
if (typeof window === 'undefined') {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  testProgressSync();
} else {
  console.log('This test must be run in Node.js environment');
}