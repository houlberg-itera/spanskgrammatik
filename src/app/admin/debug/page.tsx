'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DatabaseDebug() {
  const [topics, setTopics] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    try {
      console.log('🔍 Loading debug data...');
      
      // Test levels query
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .order('order_index', { ascending: true });

      console.log('Levels query result:', { levelsData, levelsError });

      if (levelsError) {
        setError(`Levels error: ${levelsError.message}`);
        return;
      }

      setLevels(levelsData || []);

      // Test basic topics query
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('level', { ascending: true });

      console.log('Topics query result:', { topicsData, topicsError });

      if (topicsError) {
        setError(`Topics error: ${topicsError.message}`);
        return;
      }

      setTopics(topicsData || []);

      // Test exercises query
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .limit(10);

      console.log('Exercises query result:', { exercisesData, exercisesError });

      if (exercisesError) {
        setError(`Exercises error: ${exercisesError.message}`);
        return;
      }

      setExercises(exercisesData || []);

    } catch (err) {
      console.error('Debug error:', err);
      setError(`Debug error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">🔍 Database Debug</h1>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">🔍 Database Debug</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Levels ({levels.length})</h2>
          {levels.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⚠️ No levels found in database
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Description (DA)</th>
                    <th className="px-4 py-2 text-left">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level, index) => (
                    <tr key={level.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">{level.id}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                          {level.name}
                        </span>
                      </td>
                      <td className="px-4 py-2">{level.description_da}</td>
                      <td className="px-4 py-2">{level.order_index}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Topics ({topics.length})</h2>
          {topics.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⚠️ No topics found in database
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Level</th>
                    <th className="px-4 py-2 text-left">Name (DA)</th>
                    <th className="px-4 py-2 text-left">Name (ES)</th>
                    <th className="px-4 py-2 text-left">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic, index) => (
                    <tr key={topic.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">{topic.id}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {topic.level}
                        </span>
                      </td>
                      <td className="px-4 py-2">{topic.name_da}</td>
                      <td className="px-4 py-2">{topic.name_es}</td>
                      <td className="px-4 py-2">{topic.order_index}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Sample Exercises ({exercises.length})</h2>
          {exercises.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⚠️ No exercises found in database
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Topic ID</th>
                    <th className="px-4 py-2 text-left">Level</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.slice(0, 5).map((exercise, index) => (
                    <tr key={exercise.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">{exercise.id}</td>
                      <td className="px-4 py-2">{exercise.topic_id}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          {exercise.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{exercise.type}</td>
                      <td className="px-4 py-2 text-sm">{exercise.question?.substring(0, 50)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">🔧 Actions</h2>
          <div className="space-x-4">
            <button
              onClick={loadDebugData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={() => {
                console.log('Levels:', levels);
                console.log('Topics:', topics);
                console.log('Exercises:', exercises);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              📋 Log to Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
