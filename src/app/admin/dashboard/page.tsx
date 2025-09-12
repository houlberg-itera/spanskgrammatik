'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpanishLevel } from '@/types/database';

interface UserProficiency {
  userId: string;
  email: string;
  currentLevel: SpanishLevel;
  confidenceScore: number;
  strengthAreas: string[];
  weaknessAreas: string[];
  recommendedLevel: SpanishLevel;
  progressToNextLevel: number;
  exercisesNeeded: number;
  lastActivity: string;
}

interface ExerciseGeneration {
  topicId: number;
  topicName: string;
  level: SpanishLevel;
  currentCount: number;
  recommendedCount: number;
  priority: 'high' | 'medium' | 'low';
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProficiency[]>([]);
  const [exerciseGenerations, setExerciseGenerations] = useState<ExerciseGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTopicId, setGeneratingTopicId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'users' | 'exercises' | 'analytics' | 'exercise-details'>('users');
  const [selectedTopicExercises, setSelectedTopicExercises] = useState<any[]>([]);
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    averageProgress: 0,
    levelDistribution: {} as Record<SpanishLevel, number>,
    topWeakAreas: [] as Array<{area: string, count: number}>
  });

  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserProficiencies(),
        loadExerciseGenerationNeeds(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProficiencies = async () => {
    // Get all users - using 'users' table instead of 'user_profiles'
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, current_level')  // Changed 'user_id' to 'id'
      .order('created_at', { ascending: false })
      .limit(50);

    if (!allUsers) return;

    // Get proficiency analysis for each user
    const userProficiencies: UserProficiency[] = [];
    
    for (const user of allUsers) {
      try {
        const response = await fetch(`/api/proficiency-analysis?userId=${user.id}&recommendations=true`);
        if (response.ok) {
          const data = await response.json();
          userProficiencies.push({
            userId: user.id,  // Changed from user.user_id to user.id
            email: user.email || 'Unknown',
            currentLevel: data.analysis.currentLevel,
            confidenceScore: data.analysis.confidenceScore,
            strengthAreas: data.analysis.strengthAreas,
            weaknessAreas: data.analysis.weaknessAreas,
            recommendedLevel: data.analysis.recommendedLevel,
            progressToNextLevel: data.analysis.progressToNextLevel,
            exercisesNeeded: data.analysis.exercisesNeeded,
            lastActivity: data.recentProgress[0]?.completedAt || 'No activity'
          });
        }
      } catch (error) {
        console.error(`Error analyzing user ${user.id}:`, error);  // Changed from user.user_id to user.id
      }
    }

    setUsers(userProficiencies);
  };

  const loadExerciseGenerationNeeds = async () => {
    // Analyze which topics need more exercises
    const { data: topics } = await supabase
      .from('topics')
      .select(`
        id,
        name_da,
        level,
        exercises(id, ai_generated)
      `)
      .order('level', { ascending: true });

    if (!topics) return;

    const generations: ExerciseGeneration[] = topics.map(topic => {
      const exercises = (topic.exercises as any[]) || [];
      const currentCount = exercises.length;
      const aiGeneratedCount = exercises.filter(e => e.ai_generated).length;
      const manualCount = currentCount - aiGeneratedCount;

      // Determine recommended count based on level
      const levelMultiplier = topic.level === 'A1' ? 15 : topic.level === 'A2' ? 20 : 25;
      const recommendedCount = levelMultiplier;

      // Determine priority
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (currentCount < recommendedCount * 0.5) priority = 'high';
      else if (currentCount < recommendedCount * 0.8) priority = 'medium';

      return {
        topicId: topic.id,
        topicName: topic.name_da,
        level: topic.level,
        currentCount,
        recommendedCount,
        priority
      };
    });

    setExerciseGenerations(generations);
  };

  const loadAnalytics = async () => {
    const totalUsers = users.length;
    const averageProgress = users.reduce((sum, user) => sum + user.progressToNextLevel, 0) / totalUsers || 0;
    
    const levelDistribution: Record<SpanishLevel, number> = {
      A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0
    };
    
    users.forEach(user => {
      levelDistribution[user.currentLevel]++;
    });

    // Count weakness areas
    const weaknessCount: Record<string, number> = {};
    users.forEach(user => {
      user.weaknessAreas.forEach(area => {
        weaknessCount[area] = (weaknessCount[area] || 0) + 1;
      });
    });

    const topWeakAreas = Object.entries(weaknessCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area, count]) => ({ area, count }));

    setAnalytics({
      totalUsers,
      averageProgress,
      levelDistribution,
      topWeakAreas
    });
  };

  const generateExercisesForTopic = async (generation: ExerciseGeneration, count: number) => {
    setGeneratingTopicId(generation.topicId);
    
    try {
      const response = await fetch('/api/generate-bulk-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: generation.topicId,
          exerciseType: 'multiple_choice',
          count,
          difficulty: 'medium',
          level: generation.level,
          topicName: generation.topicName,
          topicDescription: generation.topicName // Use topicName as description fallback
        })
      });

      if (response.ok) {
        const result = await response.json();
        const actualCount = result.exercisesCreated || 0;
        const totalQuestions = result.totalQuestions || 0;
        alert(`Successfully generated ${actualCount} exercises with ${totalQuestions} questions!`);
        loadExerciseGenerationNeeds(); // Refresh
      } else {
        const errorData = await response.json();
        alert(`Failed to generate exercises: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating exercises:', error);
      alert('Error generating exercises');
    } finally {
      setGeneratingTopicId(null);
    }
  };

  const loadTopicExercises = async (topicId: number, topicName: string) => {
    try {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .eq('ai_generated', true)
        .order('created_at', { ascending: false });

      setSelectedTopicExercises(exercises || []);
      setSelectedTopicName(topicName);
      setViewMode('exercise-details');
    } catch (error) {
      console.error('Error loading topic exercises:', error);
      alert('Error loading exercises');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              📊 Spanskgrammatik Admin Dashboard
            </h1>
            <div className="flex space-x-4">
              {(['users', 'exercises', 'analytics'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'users' && '👥 Brugere'}
                  {mode === 'exercises' && '📚 Øvelser'}
                  {mode === 'analytics' && '📈 Analyser'}
                </button>
              ))}
              <a
                href="/admin/ai-config"
                className="px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                🤖 AI Konfiguration
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Bruger Proficiency Analyse ({users.length} brugere)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bruger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Niveau
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tillid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fremgang
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Svagheder
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Øvelser Behov
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sidste Aktivitet
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.userId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.currentLevel}
                            </span>
                            {user.recommendedLevel !== user.currentLevel && (
                              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                → {user.recommendedLevel}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getConfidenceColor(user.confidenceScore)}`}>
                            {user.confidenceScore.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${user.progressToNextLevel}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {user.progressToNextLevel.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.weaknessAreas.slice(0, 3).map(area => (
                              <span key={area} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                {area}
                              </span>
                            ))}
                            {user.weaknessAreas.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                +{user.weaknessAreas.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.exercisesNeeded}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastActivity !== 'No activity' 
                            ? new Date(user.lastActivity).toLocaleDateString('da-DK')
                            : 'Ingen aktivitet'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'exercises' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Øvelses Generering Behov
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Emner der har brug for flere AI-genererede øvelser
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Emne
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Niveau
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nuværende
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anbefalet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prioritet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Handlinger
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exerciseGenerations
                      .sort((a, b) => {
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      })
                      .map(generation => (
                      <tr 
                        key={generation.topicId} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => loadTopicExercises(generation.topicId, generation.topicName)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {generation.topicName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {generation.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {generation.currentCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {generation.recommendedCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(generation.priority)}`}>
                            {generation.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateExercisesForTopic(
                                generation, 
                                generation.recommendedCount - generation.currentCount
                              );
                            }}
                            disabled={generation.currentCount >= generation.recommendedCount || generatingTopicId === generation.topicId}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {generatingTopicId === generation.topicId ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Genererer...</span>
                              </>
                            ) : (
                              <span>Generer {generation.recommendedCount - generation.currentCount}</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Generel Statistik
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Brugere:</span>
                  <span className="font-semibold">{analytics.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gennemsnitlig Fremgang:</span>
                  <span className="font-semibold">{analytics.averageProgress.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📈 Niveau Fordeling
              </h3>
              <div className="space-y-2">
                {Object.entries(analytics.levelDistribution).map(([level, count]) => (
                  <div key={level} className="flex justify-between items-center">
                    <span className="text-gray-600">{level}:</span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(count / analytics.totalUsers) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-sm">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🎯 Top Svagheder
              </h3>
              <div className="space-y-2">
                {analytics.topWeakAreas.map(({ area, count }) => (
                  <div key={area} className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm truncate">{area}</span>
                    <span className="font-semibold text-red-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'exercise-details' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Øvelser for: {selectedTopicName}
              </h2>
              <button
                onClick={() => setViewMode('exercises')}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Tilbage til Dashboard
              </button>
            </div>

            {selectedTopicExercises.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Ingen øvelser fundet for dette emne.
              </p>
            ) : (
              <div className="space-y-6">
                {selectedTopicExercises.map((exercise, index) => (
                  <div key={exercise.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        Øvelse #{index + 1}
                      </h3>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {exercise.level}
                        </span>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          {exercise.question_type}
                        </span>
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          AI Genereret
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <h4 className="font-medium text-gray-700 mb-2">Spørgsmål:</h4>
                      <p className="text-gray-900">{exercise.question}</p>
                    </div>

                    {exercise.content && exercise.content.options && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-700 mb-2">Svarmuligheder:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {exercise.content.options.map((option: string, optIndex: number) => (
                            <li 
                              key={optIndex} 
                              className={`text-sm ${
                                optIndex === exercise.content.correct_answer 
                                  ? 'text-green-600 font-medium' 
                                  : 'text-gray-600'
                              }`}
                            >
                              {option} {optIndex === exercise.content.correct_answer && '(Korrekt)'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {exercise.content && exercise.content.correct_answer && typeof exercise.content.correct_answer === 'string' && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-700 mb-2">Korrekt Svar:</h4>
                        <p className="text-green-600 font-medium">{exercise.content.correct_answer}</p>
                      </div>
                    )}

                    {exercise.content && exercise.content.explanation && (
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-700 mb-2">Forklaring:</h4>
                        <p className="text-gray-600 text-sm">{exercise.content.explanation}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 border-t pt-2">
                      Oprettet: {new Date(exercise.created_at).toLocaleDateString('da-DK')} kl. {new Date(exercise.created_at).toLocaleTimeString('da-DK')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
