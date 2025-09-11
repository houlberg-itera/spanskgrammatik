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
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Exercise Inspector</h1>
      
      <div className="space-y-4">
        {exercises.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            No exercises found in database
          </div>
        ) : (
          exercises.map((exercise, index) => (
            <div key={exercise.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{exercise.title_da}</h3>
                  <p className="text-gray-600">{exercise.title_es}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div><strong>ID:</strong> {exercise.id}</div>
                    <div><strong>Topic ID:</strong> {exercise.topic_id}</div>
                    <div><strong>Level:</strong> {exercise.level}</div>
                    <div><strong>Type:</strong> {exercise.type}</div>
                    <div><strong>AI Generated:</strong> {exercise.ai_generated ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Content (JSONB):</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(exercise.content, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={loadExercises}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Reload Exercises
        </button>
      </div>
    </div>
  );
}
