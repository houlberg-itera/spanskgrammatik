// Test script to demonstrate enhanced debugging in exercise generation
const fetch = require('node-fetch');

const testGeneration = async () => {
  console.log('🧪 Testing enhanced debugging with vocabulary exercise generation...');
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-vocabulary-exercise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'familia',
        level: 'A1',
        exerciseType: 'multiple_choice',
        questionCount: 3,
        difficulty: 'easy'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Generation successful!');
      console.log(`📊 Generated: ${result.questions?.length || 0} questions`);
      console.log(`🎯 Topic: ${result.title}`);
    } else {
      console.log('❌ Generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing generation:', error.message);
  }
};

testGeneration();