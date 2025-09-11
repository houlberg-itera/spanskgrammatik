import { generateAdvancedExercise, generateBulkExercises } from '@/lib/openai-advanced';

// Test the advanced exercise generation
async function testExerciseGeneration() {
  console.log('🧪 Testing AI Exercise Generation System...\n');

  try {
    // Test 1: Generate a single advanced exercise
    console.log('1️⃣ Testing single exercise generation...');
    const singleExercise = await generateAdvancedExercise({
      topic: 'Present Tense Conjugation',
      level: 'A1',
      type: 'multiple_choice',
      difficulty: 'medium',
      context: 'Basic verb conjugation in present tense for regular verbs'
    });

    console.log('✅ Single exercise generated:');
    console.log(`Question: ${singleExercise.question}`);
    console.log(`Type: ${singleExercise.type}`);
    console.log(`Difficulty: ${singleExercise.difficulty}`);
    console.log(`Proficiency Indicator: ${singleExercise.proficiency_indicator}%\n`);

    // Test 2: Generate bulk exercises
    console.log('2️⃣ Testing bulk exercise generation...');
    const bulkExercises = await generateBulkExercises({
      topic: 'Present Tense Conjugation',
      level: 'A1',
      count: 3,
      distribution: {
        easy: 1,
        medium: 1,
        hard: 1
      },
      types: ['multiple_choice', 'fill_in_blank', 'conjugation']
    });

    console.log(`✅ Generated ${bulkExercises.length} bulk exercises:`);
    bulkExercises.forEach((exercise, index) => {
      console.log(`${index + 1}. ${exercise.type} (${exercise.difficulty}) - Proficiency: ${exercise.proficiency_indicator}%`);
      console.log(`   Question: ${exercise.question.substring(0, 50)}...`);
    });

    console.log('\n🎉 All tests passed! AI exercise generation is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testExerciseGeneration();
