// Quick debug script to check exercise data for specific topics
// This will help us understand why completion happens early

console.log('🔍 TOPIC EXERCISES DEBUG TOOL');
console.log('');
console.log('To use this tool:');
console.log('1. Go to your browser and open: http://localhost:3002/topic/[TOPIC_ID]');
console.log('2. Open browser developer tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Copy and paste this code to see exercise data:');
console.log('');
console.log('='.repeat(60));
console.log(`
// PASTE THIS IN BROWSER CONSOLE TO DEBUG:

// Check exercises array in TopicExercisePlayer
console.log('🧪 DEBUGGING EXERCISES ARRAY:');

// Check if there's a React component with exercises data
const reactRoot = document.querySelector('#__next');
if (reactRoot) {
  console.log('✅ React root found');
  
  // Look for any data we can inspect
  const topicData = window.__NEXT_DATA__ || {};
  console.log('📊 Next.js page data:', topicData);
  
  // Check if we can access React DevTools data
  if (window.React) {
    console.log('✅ React detected');
  }
  
  // Try to find exercise-related elements
  const exerciseElements = document.querySelectorAll('[class*="exercise"], [class*="question"]');
  console.log('🎯 Exercise-related elements found:', exerciseElements.length);
  
  // Check for any text that might indicate current question number
  const bodyText = document.body.innerText;
  const questionMatches = bodyText.match(/spørgsmål \\d+ af \\d+/gi) || bodyText.match(/question \\d+ of \\d+/gi);
  if (questionMatches) {
    console.log('📝 Question progress indicators found:', questionMatches);
  }
  
  // Look for progress indicators
  const progressElements = document.querySelectorAll('[class*="progress"], [style*="width"]');
  console.log('📈 Progress elements found:', progressElements.length);
  
  console.log('');
  console.log('🎯 INVESTIGATION STEPS:');
  console.log('1. Note the current question number shown');
  console.log('2. Answer questions and watch for early "Afslut" appearance');
  console.log('3. Check if all expected questions are shown');
  console.log('4. Report back with: topic ID, total questions expected, when "Afslut" appears');
} else {
  console.log('❌ React root not found');
}
`);
console.log('='.repeat(60));
console.log('');
console.log('🎯 TESTING INSTRUCTIONS:');
console.log('1. Open http://localhost:3002/topic/5 (or any topic number)');
console.log('2. Open browser console (F12 → Console)');
console.log('3. Paste the debug code above');
console.log('4. Start answering questions and note when "Afslut" appears');
console.log('5. Tell me: Which topic, how many questions you saw, and when it ended early');
console.log('');
console.log('🚀 Server ready at: http://localhost:3002');