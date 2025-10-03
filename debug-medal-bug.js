// Debug medal calculation bug
const MEDAL_REQUIREMENTS = {
  bronze: { xp: 50, questions: 10, accuracy: 60 },
  silver: { xp: 150, questions: 50, accuracy: 70 },
  gold: { xp: 300, questions: 100, accuracy: 80 },
  diamond: { xp: 500, questions: 200, accuracy: 85 },
  emerald: { xp: 1000, questions: 500, accuracy: 90 }
};

const MEDAL_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'emerald'];

function getCurrentMedal(userStats) {
  const { total_xp, correct_answers, accuracy_percentage } = userStats;
  
  console.log('🔍 Testing medal calculation for user stats:', userStats);
  
  // Check from highest to lowest medal
  for (let i = MEDAL_ORDER.length - 1; i >= 0; i--) {
    const medal = MEDAL_ORDER[i];
    const requirements = MEDAL_REQUIREMENTS[medal];
    
    console.log(`🔍 Checking ${medal}: needs XP=${requirements.xp}, questions=${requirements.questions}, accuracy=${requirements.accuracy}`);
    console.log(`🔍 User has: XP=${total_xp}, questions=${correct_answers}, accuracy=${accuracy_percentage}`);
    
    const meetsXP = total_xp >= requirements.xp;
    const meetsQuestions = correct_answers >= requirements.questions;
    const meetsAccuracy = accuracy_percentage >= requirements.accuracy;
    
    console.log(`🔍 Meets requirements: XP=${meetsXP}, questions=${meetsQuestions}, accuracy=${meetsAccuracy}`);
    
    if (meetsXP && meetsQuestions && meetsAccuracy) {
      console.log(`✅ User qualifies for ${medal} medal!`);
      return medal;
    }
  }
  
  console.log('❌ User does not qualify for any medal, returning "none"');
  return 'none';
}

// Test with actual problematic user data from API response
const problemUser = {
  total_xp: 0,
  correct_answers: 0,
  accuracy_percentage: 0
};

console.log('🧪 TESTING MEDAL CALCULATION BUG');
console.log('===============================');

const result = getCurrentMedal(problemUser);
console.log('');
console.log('🎯 FINAL RESULT:', result);
console.log('🎯 EXPECTED: "none"');
console.log('🎯 BUG STATUS:', result === 'none' ? '✅ LOGIC WORKS' : '❌ BUG CONFIRMED');