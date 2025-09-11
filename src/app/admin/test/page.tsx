'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    testQueries();
  }, []);

  const testQueries = async () => {
    console.log('🧪 Testing Supabase queries...');
    
    try {
      // Test 1: Simple topics query (like the level page)
      console.log('Test 1: Simple topics query');
      const { data: simpleTopics, error: simpleError } = await supabase
        .from('topics')
        .select('*')
        .eq('level', 'A1');
      
      console.log('Simple query result:', { simpleTopics, simpleError });

      // Test 2: Complex topics query (like admin page)
      console.log('Test 2: Complex topics query with exercises');
      const { data: complexTopics, error: complexError } = await supabase
        .from('topics')
        .select(`
          id,
          name_da,
          name_es,
          description_da,
          level,
          exercises(
            id,
            type,
            question,
            correct_answer,
            difficulty_level,
            created_at
          )
        `)
        .eq('level', 'A1');
      
      console.log('Complex query result:', { complexTopics, complexError });

      // Test 3: All topics query
      console.log('Test 3: All topics query');
      const { data: allTopics, error: allError } = await supabase
        .from('topics')
        .select('*');
      
      console.log('All topics result:', { allTopics, allError });

      setResult({
        simple: { data: simpleTopics, error: simpleError },
        complex: { data: complexTopics, error: complexError },
        all: { data: allTopics, error: allError }
      });

    } catch (error) {
      console.error('Test error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">🧪 Admin Query Test</h1>
        <div>Testing queries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 Admin Query Test</h1>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Simple Query (A1 Topics)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(result?.simple, null, 2)}
          </pre>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Complex Query (A1 Topics with Exercises)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(result?.complex, null, 2)}
          </pre>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">All Topics Query</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(result?.all, null, 2)}
          </pre>
        </div>

        <div className="mt-4">
          <button
            onClick={testQueries}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Re-run Tests
          </button>
        </div>
      </div>
    </div>
  );
}
