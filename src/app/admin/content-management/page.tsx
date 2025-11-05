'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpanishLevel } from '@/types/database';

interface Topic {
  id: string;
  name_da: string;
  name_es: string;
  description_da: string;
  description_es?: string;
  level: SpanishLevel;
  order_index?: number;
  exercises: Exercise[];
  exercise_count?: number;
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

interface TopicFormData {
  name_da: string;
  name_es: string;
  description_da: string;
  description_es: string;
  level: SpanishLevel;
  order_index: number;
}

export default function ContentManagement() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel | ''>(''); // Default to empty string to show all
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'exercises'>('level');

  // Topic editing states
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicFormData, setTopicFormData] = useState<TopicFormData>({
    name_da: '',
    name_es: '',
    description_da: '',
    description_es: '',
    level: 'A1',
    order_index: 0
  });
  const [formLoading, setFormLoading] = useState(false);

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
      
      // Use the new enhanced topics API
      const url = selectedLevel 
        ? `/api/admin/topics?level=${selectedLevel}`
        : '/api/admin/topics';
      
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error loading topics:', result.error);
        return;
      }

      console.log('📊 Topics loaded from API:', result.topics?.length);
      
      // Transform API data to match UI expectations
      const processedTopics = (result.topics || []).map((topic: any) => ({
        ...topic,
        exercises: [], // We'll load exercises separately when needed
        exercise_count: topic.exercise_count || 0
      }));

      console.log('✅ Processed topics:', processedTopics.length);
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

  // Topic management functions
  const openTopicForm = (topic?: Topic) => {
    if (topic) {
      setEditingTopic(topic);
      setTopicFormData({
        name_da: topic.name_da,
        name_es: topic.name_es,
        description_da: topic.description_da,
        description_es: topic.description_es || '',
        level: topic.level,
        order_index: topic.order_index || 0
      });
    } else {
      setEditingTopic(null);
      setTopicFormData({
        name_da: '',
        name_es: '',
        description_da: '',
        description_es: '',
        level: 'A1',
        order_index: 0
      });
    }
    setShowTopicForm(true);
  };

  const closeTopicForm = () => {
    setShowTopicForm(false);
    setEditingTopic(null);
    setFormLoading(false);
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const url = editingTopic 
        ? `/api/admin/topics/${editingTopic.id}`
        : '/api/admin/topics';
      
      const method = editingTopic ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(topicFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save topic');
      }

      alert(editingTopic ? 'Emne opdateret succesfuldt!' : 'Nyt emne oprettet succesfuldt!');
      closeTopicForm();
      loadTopics(); // Refresh the list
    } catch (error) {
      console.error('Error saving topic:', error);
      alert(error instanceof Error ? error.message : 'Fejl ved gemning af emne');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteTopic = async (topic: Topic) => {
    const exerciseCount = topic.exercise_count || topic.exercises?.length || 0;
    
    if (exerciseCount > 0) {
      if (!confirm(`Dette emne har ${exerciseCount} øvelser. Er du sikker på at du vil slette emnet og alle dets øvelser? Dette kan ikke fortrydes!`)) {
        return;
      }
    } else {
      if (!confirm('Er du sikker på at du vil slette dette emne?')) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete topic');
      }

      alert('Emne slettet succesfuldt!');
      loadTopics(); // Refresh the list
      
      // Clear selection if the deleted topic was selected
      if (selectedTopic === topic.id) {
        setSelectedTopic(null);
        setExercises([]);
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert(error instanceof Error ? error.message : 'Fejl ved sletning af emne');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            📚 Indhold Styring
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Administrer emner og øvelser på tværs af alle niveauer
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {/* Filters and Controls */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:flex-wrap sm:gap-4 sm:space-y-0 mb-6">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Niveau:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as SpanishLevel | '')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[40px] w-full sm:w-auto"
              >
                <option value="">Alle niveauer</option>
                <option value="A1">A1 - Begynder</option>
                <option value="A2">A2 - Grundlæggende</option>
                <option value="B1">B1 - Mellemtrin</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sorter efter:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[40px] w-full sm:w-auto"
              >
                <option value="level">Niveau</option>
                <option value="name">Navn</option>
                <option value="exercises">Antal øvelser</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Søg:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søg efter emne..."
                className="border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[40px] w-full sm:w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Topics List */}
            <div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Emner ({sortedTopics.length})
                </h2>
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => openTopicForm()}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    + Nyt Emne
                  </button>
                  {sortedTopics.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Er du sikker på, at du vil slette alle øvelser fra alle emner?')) {
                          sortedTopics.forEach(topic => bulkDeleteExercises(topic.id));
                        }
                      }}
                      className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors w-full sm:w-auto"
                    >
                      Slet alle øvelser
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
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
                      className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
                        selectedTopic === topic.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTopic(topic.id)}
                    >
                      <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                              {topic.name_da}
                            </h3>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 self-start">
                              {topic.level}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {topic.name_es}
                          </p>
                          {topic.description_da && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {topic.description_da}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end sm:space-x-2 mt-2 sm:mt-0">
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            {topic.exercises.length} øvelser
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTopicForm(topic);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded border border-blue-300 hover:bg-blue-50 min-h-[28px] flex items-center whitespace-nowrap"
                              title="Rediger emne"
                            >
                              Rediger
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTopic(topic);
                              }}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50 min-h-[28px] flex items-center whitespace-nowrap"
                              title="Slet emne"
                            >
                              Slet
                            </button>
                            {topic.exercises.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  bulkDeleteExercises(topic.id);
                                }}
                                className="text-orange-600 hover:text-orange-800 text-xs px-2 py-1 rounded border border-orange-300 hover:bg-orange-50 min-h-[28px] flex items-center whitespace-nowrap"
                                title="Slet alle øvelser"
                              >
                                Slet øvelser
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Exercises List */}
            <div className="mt-6 lg:mt-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Øvelser {selectedTopic && `(${exercises.length})`}
              </h2>
              {selectedTopic ? (
                <div className="space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
                  {exercises.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Ingen øvelser fundet for dette emne
                    </div>
                  ) : (
                    exercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-start sm:space-y-0 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
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
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50 min-h-[28px] flex items-center whitespace-nowrap"
                          >
                            🗑️ Slet
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-xs sm:text-sm text-gray-900">
                            <strong>Titel (DA):</strong> {exercise.title_da}
                          </p>
                          
                          {exercise.title_es && (
                            <p className="text-xs sm:text-sm text-gray-700">
                              <strong>Titel (ES):</strong> {exercise.title_es}
                            </p>
                          )}
                          
                          <div className="text-xs text-gray-600">
                            <strong>Indhold:</strong>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words">
                              {JSON.stringify(exercise.content, null, 2).substring(0, 150)}...
                            </pre>
                          </div>
                          
                          <p className="text-xs text-gray-400">
                            Oprettet: {new Date(exercise.created_at).toLocaleDateString('da-DK')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                  Vælg et emne for at se øvelser
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Topic Form Modal */}
      {showTopicForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleTopicSubmit} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingTopic ? 'Rediger Emne' : 'Nyt Emne'}
                </h2>
                <button
                  type="button"
                  onClick={closeTopicForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-6">
                {/* Level Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau
                  </label>
                  <select
                    value={topicFormData.level}
                    onChange={(e) => setTopicFormData({ ...topicFormData, level: e.target.value as SpanishLevel })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="A1">A1 - Begynder</option>
                    <option value="A2">A2 - Grundlæggende</option>
                    <option value="B1">B1 - Mellemliggende</option>
                    <option value="B2">B2 - Øvre mellemliggende</option>
                    <option value="C1">C1 - Avanceret</option>
                    <option value="C2">C2 - Mesterskab</option>
                  </select>
                </div>

                {/* Danish Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Navn (Dansk) *
                  </label>
                  <input
                    type="text"
                    value={topicFormData.name_da}
                    onChange={(e) => setTopicFormData({ ...topicFormData, name_da: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="F.eks. Substantiver og artikler"
                    required
                  />
                </div>

                {/* Spanish Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Navn (Spansk) *
                  </label>
                  <input
                    type="text"
                    value={topicFormData.name_es}
                    onChange={(e) => setTopicFormData({ ...topicFormData, name_es: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="F.eks. Sustantivos y artículos"
                    required
                  />
                </div>

                {/* Danish Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beskrivelse (Dansk) *
                  </label>
                  <textarea
                    value={topicFormData.description_da}
                    onChange={(e) => setTopicFormData({ ...topicFormData, description_da: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Beskriv hvad dette emne handler om..."
                    required
                  />
                </div>

                {/* Spanish Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beskrivelse (Spansk)
                  </label>
                  <textarea
                    value={topicFormData.description_es}
                    onChange={(e) => setTopicFormData({ ...topicFormData, description_es: e.target.value })}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción en español (opcional)"
                  />
                </div>

                {/* Order Index */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rækkefølge
                  </label>
                  <input
                    type="number"
                    value={topicFormData.order_index}
                    onChange={(e) => setTopicFormData({ ...topicFormData, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Lavere tal vises først i listen
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 mt-6 pt-6 border-t">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Gemmer...' : (editingTopic ? 'Opdater Emne' : 'Opret Emne')}
                </button>
                <button
                  type="button"
                  onClick={closeTopicForm}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
