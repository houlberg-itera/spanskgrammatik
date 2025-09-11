'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpanishLevel } from '@/types/database';

interface Topic {
  id: string;
  name_da: string;
  name_es: string;
  description_da: string;
  level: SpanishLevel;
  exercises: Exercise[];
}

interface Exercise {
  id: string;
  type: string;
  title_da: string;
  title_es?: string;
  content: any; // JSONB content
  ai_generated?: boolean;
  created_at: string;
}

export default function ContentManagement() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel | ''>(''); // Default to empty string to show all
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'exercises'>('level');

  const supabase = createClient();

  useEffect(() => {
    loadTopics();
  }, [selectedLevel]);

  useEffect(() => {
    if (selectedTopic) {
      loadExercises(selectedTopic);
    }
  }, [selectedTopic]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading topics with selectedLevel:', selectedLevel);
      
      let query = supabase
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
            title_da,
            title_es,
            content,
            ai_generated,
            created_at
          )
        `);

      if (selectedLevel) {
        console.log('🎯 Filtering by level:', selectedLevel);
        query = query.eq('level', selectedLevel);
      } else {
        console.log('📋 Loading all topics (no filter)');
      }

      const { data, error } = await query.order('name_da', { ascending: true });

      console.log('📊 Topics query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error loading topics:', error);
        return;
      }

      // Process the data to count exercises
      const processedTopics = (data || []).map(topic => ({
        ...topic,
        exercises: topic.exercises || []
      }));

      console.log('✅ Processed topics:', processedTopics);
      setTopics(processedTopics);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading exercises:', error);
        return;
      }

      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne øvelse?')) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) {
        console.error('Error deleting exercise:', error);
        alert('Fejl ved sletning af øvelse');
        return;
      }

      // Refresh exercises
      if (selectedTopic) {
        loadExercises(selectedTopic);
      }
      // Refresh topics to update counts
      loadTopics();
      
      alert('Øvelse slettet succesfuldt');
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Fejl ved sletning af øvelse');
    }
  };

  const bulkDeleteExercises = async (topicId: string) => {
    if (!confirm('Er du sikker på at du vil slette ALLE øvelser for dette emne? Dette kan ikke fortrydes!')) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('topic_id', topicId);

      if (error) {
        console.error('Error bulk deleting exercises:', error);
        alert('Fejl ved bulk sletning af øvelser');
        return;
      }

      // Refresh data
      loadTopics();
      if (selectedTopic === topicId) {
        setExercises([]);
      }
      
      alert('Alle øvelser for emnet er slettet succesfuldt');
    } catch (error) {
      console.error('Error bulk deleting exercises:', error);
      alert('Fejl ved bulk sletning af øvelser');
    }
  };

  const filteredTopics = topics.filter(topic =>
    topic.name_da.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.name_es.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedTopics = [...filteredTopics].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name_da.localeCompare(b.name_da);
      case 'level':
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        return levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
      case 'exercises':
        return b.exercises.length - a.exercises.length;
      default:
        return 0;
    }
  });

  const getDifficultyColor = (aiGenerated?: boolean) => {
    return aiGenerated ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
  };

  const getExerciseTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return '☑️';
      case 'fill_in_blank': return '✍️';
      case 'translation': return '🔄';
      case 'conjugation': return '🔀';
      default: return '📝';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            📚 Indhold Styring
          </h1>
          <p className="text-gray-600 mt-1">
            Administrer emner og øvelser på tværs af alle niveauer
          </p>
        </div>

        <div className="p-6">
          {/* Filters and Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Niveau:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as SpanishLevel | '')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="">Alle niveauer</option>
                <option value="A1">A1 - Begynder</option>
                <option value="A2">A2 - Grundlæggende</option>
                <option value="B1">B1 - Mellemtrin</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sorter efter:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="level">Niveau</option>
                <option value="name">Navn</option>
                <option value="exercises">Antal øvelser</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Søg:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søg efter emne..."
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Topics List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Emner ({sortedTopics.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Indlæser emner...</p>
                  </div>
                ) : sortedTopics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Ingen emner fundet
                  </div>
                ) : (
                  sortedTopics.map(topic => (
                    <div
                      key={topic.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTopic === topic.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTopic(topic.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">
                              {topic.name_da}
                            </h3>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {topic.level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {topic.name_es}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {topic.description_da}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">
                            {topic.exercises.length} øvelser
                          </span>
                          {topic.exercises.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                bulkDeleteExercises(topic.id);
                              }}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                            >
                              Slet alle
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Exercises List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Øvelser {selectedTopic && `(${exercises.length})`}
              </h2>
              {selectedTopic ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {exercises.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Ingen øvelser fundet for dette emne
                    </div>
                  ) : (
                    exercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {getExerciseTypeIcon(exercise.type)}
                            </span>
                            <span className="text-xs font-medium text-gray-600">
                              {exercise.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(exercise.ai_generated)}`}>
                              {exercise.ai_generated ? 'AI Generated' : 'Manual'}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteExercise(exercise.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            🗑️ Slet
                          </button>
                        </div>
                        
                        <p className="text-sm text-gray-900 mb-2">
                          <strong>Titel (DA):</strong> {exercise.title_da}
                        </p>
                        
                        {exercise.title_es && (
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Titel (ES):</strong> {exercise.title_es}
                          </p>
                        )}
                        
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>Indhold:</strong>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(exercise.content, null, 2).substring(0, 200)}...
                          </pre>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          Oprettet: {new Date(exercise.created_at).toLocaleDateString('da-DK')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Vælg et emne for at se øvelser
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
