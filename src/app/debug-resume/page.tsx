'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface DebugInfo {
  topicId: number;
  totalQuestions: number;
  currentIndex: number;
  completedCount: number;
  displayedQuestionNumber: number;
  savedIndex: number | null;
  allQuestions: any[];
  userProgress: any[];
  topicProgress: any;
  resumeStatus: string;
}

export default function DebugResumePage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(2);

  const supabase = createClient();

  const debugResumeLogic = async (topicId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch topic and exercises (same as Topic page)
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;

      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .order('id');

      if (exercisesError) throw exercisesError;

      // Extract questions (same logic as Topic page)
      const allQuestions: any[] = [];
      exercises.forEach(exercise => {
        if (exercise.content && Array.isArray(exercise.content.questions)) {
          exercise.content.questions.forEach((question: any) => {
            allQuestions.push({
              ...question,
              exercise_id: exercise.id,
              question_id: question.id || `q_${Math.random()}`
            });
          });
        }
      });

      // Get user progress (answered questions)
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('exercise_id', exercises.map(ex => ex.id));

      if (progressError) throw progressError;

      // Get topic progress (saved position)
      const { data: topicProgress, error: topicProgressError } = await supabase
        .from('user_topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .single();

      if (topicProgressError && topicProgressError.code !== 'PGRST116') {
        throw topicProgressError;
      }

      // Calculate completedCount (same as Topic page)
      const completedCount = userProgress?.length || 0;
      
      // Get saved index
      const savedIndex = topicProgress?.current_question_index ?? null;
      
      // Determine current index (resume logic)
      let currentIndex = 0;
      let resumeStatus = 'Starting from beginning';
      
      if (savedIndex !== null && savedIndex >= 0 && savedIndex < allQuestions.length) {
        currentIndex = savedIndex;
        resumeStatus = `Resuming from saved position: ${savedIndex}`;
      } else if (savedIndex !== null) {
        resumeStatus = `Invalid saved position: ${savedIndex} (out of bounds)`;
      }

      // Calculate displayed question number (the bug location)
      const displayedQuestionNumber = completedCount + 1;

      const debug: DebugInfo = {
        topicId,
        totalQuestions: allQuestions.length,
        currentIndex,
        completedCount,
        displayedQuestionNumber,
        savedIndex,
        allQuestions,
        userProgress: userProgress || [],
        topicProgress: topicProgress || null,
        resumeStatus
      };

      setDebugInfo(debug);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🐛 Resume Bug Debug Page</h1>
          <p className="text-gray-600 mb-4">
            This page debugs the "more questions than total" resume bug.
          </p>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Resume Logic</h2>
          <div className="flex gap-4 items-center mb-4">
            <label className="font-medium">Topic ID:</label>
            <select 
              value={selectedTopicId} 
              onChange={(e) => setSelectedTopicId(Number(e.target.value))}
              className="border rounded px-3 py-1"
            >
              <option value={1}>Topic 1</option>
              <option value={2}>Topic 2</option>
              <option value={5}>Topic 5</option>
              <option value={7}>Topic 7</option>
              <option value={14}>Topic 14</option>
            </select>
            <button
              onClick={() => debugResumeLogic(selectedTopicId)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Resume Logic'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {debugInfo && (
          <div className="space-y-6">
            {/* Bug Detection */}
            <div className={`rounded-lg p-6 ${
              debugInfo.displayedQuestionNumber > debugInfo.totalQuestions 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <h3 className="text-xl font-semibold mb-4">
                {debugInfo.displayedQuestionNumber > debugInfo.totalQuestions ? '🚨 BUG DETECTED' : '✅ NO BUG DETECTED'}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Displayed Question Number:</span>
                  <span className={`ml-2 px-2 py-1 rounded ${
                    debugInfo.displayedQuestionNumber > debugInfo.totalQuestions 
                      ? 'bg-red-200 text-red-800' 
                      : 'bg-green-200 text-green-800'
                  }`}>
                    {debugInfo.displayedQuestionNumber}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total Questions:</span>
                  <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded">
                    {debugInfo.totalQuestions}
                  </span>
                </div>
              </div>
              {debugInfo.displayedQuestionNumber > debugInfo.totalQuestions && (
                <div className="mt-4 p-4 bg-red-100 rounded">
                  <p className="text-red-800 font-medium">
                    🐛 BUG CONFIRMED: Showing "Question {debugInfo.displayedQuestionNumber} of {debugInfo.totalQuestions}"
                  </p>
                  <p className="text-red-700 mt-2">
                    The display formula uses <code>completedCount + 1</code> but should use <code>currentIndex + 1</code>
                  </p>
                </div>
              )}
            </div>

            {/* Debug Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">📊 Debug Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">Topic & Questions</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Topic ID:</span> {debugInfo.topicId}</p>
                    <p><span className="font-medium">Total Questions:</span> {debugInfo.totalQuestions}</p>
                    <p><span className="font-medium">Resume Status:</span> {debugInfo.resumeStatus}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">Position & Progress</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Current Index (Position):</span> {debugInfo.currentIndex}</p>
                    <p><span className="font-medium">Completed Count (Answered):</span> {debugInfo.completedCount}</p>
                    <p><span className="font-medium">Saved Index:</span> {debugInfo.savedIndex ?? 'None'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Root Cause Analysis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">🔍 Root Cause Analysis</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white p-3 rounded">
                  <span className="font-medium">Current Display Formula:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                    "Spørgsmål {debugInfo.completedCount + 1} af {debugInfo.totalQuestions}"
                  </code>
                </div>
                <div className="bg-white p-3 rounded">
                  <span className="font-medium">Should Be:</span>
                  <code className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded">
                    "Spörgsmål {debugInfo.currentIndex + 1} af {debugInfo.totalQuestions}"
                  </code>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded">
                  <p className="text-blue-800 font-medium">💡 Explanation:</p>
                  <p className="text-blue-700 mt-1">
                    When resuming, <code>completedCount</code> shows how many questions you've answered previously, 
                    but <code>currentIndex</code> shows your actual position in the sequence. The display should 
                    show your current position, not your completion count.
                  </p>
                </div>
              </div>
            </div>

            {/* User Progress Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">📋 User Progress Data</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Answered Exercises ({debugInfo.userProgress.length})</h4>
                  {debugInfo.userProgress.length > 0 ? (
                    <div className="text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                      {debugInfo.userProgress.map((progress, index) => (
                        <div key={index} className="mb-1">
                          Exercise {progress.exercise_id}: Score {progress.score}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No answered exercises</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Topic Progress Record</h4>
                  {debugInfo.topicProgress ? (
                    <div className="text-sm bg-gray-50 p-3 rounded">
                      <p>Current Question Index: {debugInfo.topicProgress.current_question_index}</p>
                      <p>Total Questions: {debugInfo.topicProgress.total_questions}</p>
                      <p>Last Updated: {new Date(debugInfo.topicProgress.last_updated).toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No saved progress</p>
                  )}
                </div>
              </div>
            </div>

            {/* Test Scenario Generator */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">🧪 Test Scenarios</h3>
              <p className="text-gray-600 mb-4">Based on this data, here are test scenarios to verify the bug:</p>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded">
                  <span className="font-medium">Scenario 1 (Normal):</span> Start fresh - should show "Question 1 of {debugInfo.totalQuestions}"
                </div>
                <div className="p-3 bg-yellow-50 rounded">
                  <span className="font-medium">Scenario 2 (Resume Bug):</span> Answer some questions, leave topic, return - 
                  if completedCount = {debugInfo.completedCount} and you resume at position 0, it shows "Question {debugInfo.completedCount + 1} of {debugInfo.totalQuestions}"
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <span className="font-medium">Expected Fix:</span> Should always show current position + 1, not completed count + 1
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}