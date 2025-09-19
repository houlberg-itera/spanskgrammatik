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
  topic_id?: string;
}

interface EditingExercise {
  id: string;
  type: string;
  title_da: string;
  title_es: string;
  content: any;
}

export default function ContentManagement() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel | ''>(''); // Default to empty string to show all
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'exercises'>('level');
  
  // Edit functionality state
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const editExercise = (exercise: Exercise) => {
    setEditingExercise({
      id: exercise.id,
      type: exercise.type,
      title_da: exercise.title_da,
      title_es: exercise.title_es || '',
      content: { ...exercise.content }
    });
    setShowEditModal(true);
  };

  const saveExercise = async () => {
    if (!editingExercise) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('exercises')
        .update({
          title_da: editingExercise.title_da,
          title_es: editingExercise.title_es,
          content: editingExercise.content
        })
        .eq('id', editingExercise.id);

      if (error) {
        console.error('Error updating exercise:', error);
        alert('Fejl ved opdatering af øvelse');
        return;
      }

      // Refresh exercises
      if (selectedTopic) {
        loadExercises(selectedTopic);
      }
      
      setShowEditModal(false);
      setEditingExercise(null);
      alert('Øvelse opdateret succesfuldt');
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Fejl ved opdatering af øvelse');
    } finally {
      setSaving(false);
    }
  };

  const updateQuestionInContent = (questionIndex: number, field: string, value: string) => {
    if (!editingExercise) return;

    const updatedContent = { ...editingExercise.content };
    if (updatedContent.questions && updatedContent.questions[questionIndex]) {
      updatedContent.questions[questionIndex] = {
        ...updatedContent.questions[questionIndex],
        [field]: value
      };
      setEditingExercise({
        ...editingExercise,
        content: updatedContent
      });
    }
  };

  const updateOptionInContent = (questionIndex: number, optionIndex: number, value: string) => {
    if (!editingExercise) return;

    const updatedContent = { ...editingExercise.content };
    if (updatedContent.questions && updatedContent.questions[questionIndex] && updatedContent.questions[questionIndex].options) {
      updatedContent.questions[questionIndex].options[optionIndex] = value;
      setEditingExercise({
        ...editingExercise,
        content: updatedContent
      });
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
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => editExercise(exercise)}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                            >
                              ✏️ Rediger
                            </button>
                            <button
                              onClick={() => deleteExercise(exercise.id)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                            >
                              🗑️ Slet
                            </button>
                          </div>
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

      {/* Edit Exercise Modal */}
      {showEditModal && editingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  ✏️ Rediger Øvelse
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExercise(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel (Dansk)
                    </label>
                    <input
                      type="text"
                      value={editingExercise.title_da}
                      onChange={(e) => setEditingExercise({
                        ...editingExercise,
                        title_da: e.target.value
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel (Spansk)
                    </label>
                    <input
                      type="text"
                      value={editingExercise.title_es}
                      onChange={(e) => setEditingExercise({
                        ...editingExercise,
                        title_es: e.target.value
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Exercise Type Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{getExerciseTypeIcon(editingExercise.type)}</span>
                    <span className="font-medium text-gray-900">
                      {editingExercise.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Questions Editor */}
                {editingExercise.content.questions && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      📝 Spørgsmål og Svar
                    </h3>
                    <div className="space-y-6">
                      {editingExercise.content.questions.map((question: any, questionIndex: number) => (
                        <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Spørgsmål {questionIndex + 1} (Dansk)
                            </label>
                            <textarea
                              value={question.question_da || ''}
                              onChange={(e) => updateQuestionInContent(questionIndex, 'question_da', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                            />
                          </div>

                          {question.question_es && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Spørgsmål {questionIndex + 1} (Spansk)
                              </label>
                              <textarea
                                value={question.question_es || ''}
                                onChange={(e) => updateQuestionInContent(questionIndex, 'question_es', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* Multiple Choice Options */}
                          {question.options && Array.isArray(question.options) && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Svarmuligheder
                              </label>
                              <div className="space-y-2">
                                {question.options.map((option: string, optionIndex: number) => (
                                  <div key={optionIndex} className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-600 w-4">
                                      {String.fromCharCode(65 + optionIndex)}:
                                    </span>
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => updateOptionInContent(questionIndex, optionIndex, e.target.value)}
                                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {question.correct_answer === option && (
                                      <span className="text-green-600 text-sm font-medium">✓ Korrekt</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Correct Answer for non-multiple choice */}
                          {question.correct_answer && !question.options && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Korrekt Svar
                              </label>
                              <input
                                type="text"
                                value={question.correct_answer || ''}
                                onChange={(e) => updateQuestionInContent(questionIndex, 'correct_answer', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}

                          {/* Explanation */}
                          {question.explanation && (
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Forklaring
                              </label>
                              <textarea
                                value={question.explanation || ''}
                                onChange={(e) => updateQuestionInContent(questionIndex, 'explanation', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON Editor (for advanced users) */}
                <details className="border border-gray-200 rounded-lg">
                  <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
                    🔧 Avanceret: Rediger RAW JSON (til udvikling)
                  </summary>
                  <div className="p-4 border-t border-gray-200">
                    <textarea
                      value={JSON.stringify(editingExercise.content, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditingExercise({
                            ...editingExercise,
                            content: parsed
                          });
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      rows={10}
                    />
                  </div>
                </details>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExercise(null);
                  }}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Annuller
                </button>
                <button
                  onClick={saveExercise}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Gemmer...' : 'Gem Ændringer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
