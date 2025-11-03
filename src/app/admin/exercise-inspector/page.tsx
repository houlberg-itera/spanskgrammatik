'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ExerciseInspector() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .limit(5);

      console.log('Exercises result:', { data, error });
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading exercises...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">🔍 Exercise Inspector</h1>
      
      <div className="space-y-4 sm:space-y-6">
        {exercises.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded text-sm sm:text-base">
            No exercises found in database
          </div>
        ) : (
          exercises.map((exercise, index) => (
            <div key={exercise.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-semibold text-lg sm:text-xl">{exercise.title_da}</h3>
                  <p className="text-gray-600 text-sm sm:text-base">{exercise.title_es}</p>
                  <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <div><strong>ID:</strong> {exercise.id}</div>
                    <div><strong>Topic ID:</strong> {exercise.topic_id}</div>
                    <div><strong>Level:</strong> {exercise.level}</div>
                    <div><strong>Type:</strong> {exercise.type}</div>
                    <div><strong>AI Generated:</strong> {exercise.ai_generated ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                <div className="mt-4 lg:mt-0">
                  <h4 className="font-medium mb-2 text-sm sm:text-base">Content (JSONB):</h4>
                  <pre className="bg-gray-100 p-2 sm:p-3 rounded text-xs overflow-auto max-h-48 sm:max-h-64 whitespace-pre-wrap break-words">
                    {JSON.stringify(exercise.content, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 sm:mt-8">
        <button
          onClick={loadExercises}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          🔄 Reload Exercises
        </button>
      </div>
    </div>
  );
}
