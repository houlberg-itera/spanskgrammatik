'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Exercise, ExerciseAttempt } from '@/types/database';
import ExercisePlayer from '@/components/ExercisePlayer';

export default function ExercisePage() {
  const params = useParams();
  const router = useRouter();
  const exerciseId = parseInt(params.id as string);
  
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (!exerciseId || isNaN(exerciseId)) {
      router.push('/dashboard');
      return;
    }
    
    checkAuth();
    fetchExercise();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }
  };

  const fetchExercise = async () => {
    try {
      console.log('Fetching exercise with ID:', exerciseId);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Du skal være logget ind for at se øvelser');
        return;
      }

      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      console.log('Exercise query result:', { exerciseData, exerciseError });

      if (exerciseError) {
        console.error('Supabase error details:', exerciseError);
        throw exerciseError;
      }

      if (!exerciseData) {
        setError('Øvelse ikke fundet');
        return;
      }

      setExercise(exerciseData);
    } catch (error) {
      console.error('Error fetching exercise:', error);
      setError(`Kunne ikke indlæse øvelsen: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseComplete = (attempt: ExerciseAttempt) => {
    // Exercise completion is handled in ExercisePlayer
    // This is just for any additional handling needed
    console.log('Exercise completed:', attempt);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser øvelse...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tilbage til dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-4">Øvelse ikke fundet</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tilbage til dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ExercisePlayer 
        exercise={exercise} 
        onComplete={handleExerciseComplete}
      />
    </div>
  );
}
