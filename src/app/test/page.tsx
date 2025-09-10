import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default async function TestExercises() {
  const supabase = await createClient();
  
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .limit(5);
    
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl mb-2">Users ({users?.length || 0})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(users, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-2">Exercises ({exercises?.length || 0})</h2>
        {error && <p className="text-red-500">Error: {error.message}</p>}
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(exercises, null, 2)}
        </pre>
      </div>
    </div>
  );
}
