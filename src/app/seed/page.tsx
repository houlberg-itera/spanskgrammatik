'use client';

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResults, setAiTestResults] = useState<any>(null);

  const seedExercises = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/seed-exercises', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to seed exercises' });
    } finally {
      setLoading(false);
    }
  };

  const testAiFeatures = async () => {
    setTestingAi(true);
    const tests = {
      feedback: false,
      assessment: false,
      generation: false
    };
    
    try {
      // Test AI feedback
      try {
        const feedbackResponse = await fetch('/api/generate-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAnswer: 'es',
            correctAnswer: 'está',
            question: 'El café ___ caliente',
            level: 'A1'
          })
        });
        if (feedbackResponse.ok) tests.feedback = true;
      } catch (e) {}

      // Test AI level assessment
      try {
        const assessmentResponse = await fetch('/api/assess-level', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'A1' })
        });
        if (assessmentResponse.ok) tests.assessment = true;
      } catch (e) {}

      setAiTestResults(tests);
    } catch (error) {
      console.error('AI test error:', error);
    } finally {
      setTestingAi(false);
    }
  };

  const testDirectAnswer = () => {
    console.log('=== DIRECT SCORE TEST ===');
    
    // Test the exact same logic that's in ExercisePlayer
    const testQuestions = [
      {
        id: "q1",
        type: "multiple_choice",
        question_da: "María ___ lærer",
        correct_answer: "es",
        points: 1
      },
      {
        id: "q2", 
        type: "multiple_choice",
        question_da: "El café ___ caliente",
        correct_answer: "está",
        points: 1
      }
    ];
    
    const testAnswers: Record<string, string> = {
      "q1": "es",
      "q2": "está"
    };
    
    let correct = 0;
    let total = 0;
    
    testQuestions.forEach(question => {
      const questionPoints = question.points || 1;
      total += questionPoints;
      const userAnswer = testAnswers[question.id];
      
      console.log(`Question ${question.id}:`, {
        userAnswer,
        correctAnswer: question.correct_answer,
        type: question.type,
        points: questionPoints
      });
      
      if (userAnswer !== undefined && userAnswer !== '' && userAnswer !== null) {
        const correctAnswer = String(question.correct_answer).toLowerCase().trim();
        const givenAnswer = String(userAnswer).toLowerCase().trim();
        
        console.log(`Comparing: "${givenAnswer}" vs "${correctAnswer}"`);
        
        const isCorrect = givenAnswer === correctAnswer;
        console.log(`Is correct: ${isCorrect}`);
        
        if (isCorrect) {
          correct += questionPoints;
        }
      }
    });
    
    const finalScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    console.log(`Final calculation: ${correct}/${total} = ${finalScore}%`);
    console.log('=== END DIRECT TEST ===');
    
    alert(`Direct test result: ${finalScore}% (${correct}/${total} points)`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Seed Sample Exercises</h1>
      
      <div className="space-y-4">
        <button
          onClick={seedExercises}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Seeding...' : 'Seed Sample Exercises'}
        </button>
        
        <button
          onClick={testDirectAnswer}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Test Score Logic Directly
        </button>

        <button
          onClick={testAiFeatures}
          disabled={testingAi}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {testingAi ? 'Testing AI Features...' : 'Test All AI Features'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          
          {result.data && result.data.length > 0 && (
            <div className="mt-4">
              <p className="font-bold mb-2">Exercise created with ID: {result.data[0].id}</p>
              <a 
                href={`/exercise/${result.data[0].id}`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 inline-block"
              >
                Test Exercise
              </a>
            </div>
          )}
        </div>
      )}

      {aiTestResults && (
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <h3 className="font-bold mb-2">AI Features Test Results:</h3>
          <div className="space-y-1 text-sm">
            <div className={aiTestResults.feedback ? 'text-green-700' : 'text-red-700'}>
              {aiTestResults.feedback ? '✅' : '❌'} AI Feedback Generation
            </div>
            <div className={aiTestResults.assessment ? 'text-green-700' : 'text-red-700'}>
              {aiTestResults.assessment ? '✅' : '❌'} AI Level Assessment
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
