'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpanishLevel } from '@/types/database';
import VocabularyExerciseGenerator from '@/components/VocabularyExerciseGenerator';

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
  topicId: string;
  topicName: string;
  level: SpanishLevel;
  currentCount: number;
  recommendedCount: number;
  priority: 'high' | 'medium' | 'low';
  target_language: 'es' | 'pt';
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProficiency[]>([]);
  const [exerciseGenerations, setExerciseGenerations] = useState<ExerciseGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'users' | 'exercises' | 'analytics' | 'vocabulary'>('users');
  const [exerciseLanguageFilter, setExerciseLanguageFilter] = useState<'all' | 'es' | 'pt'>('all');
  const [analyticsLanguageFilter, setAnalyticsLanguageFilter] = useState<'all' | 'es' | 'pt'>('all');
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    averageProgress: 0,
    levelDistribution: {} as Record<SpanishLevel, number>,
    topWeakAreas: [] as Array<{area: string, count: number}>,
    totalExercises: 0,
    totalTopics: 0,
    totalCompletions: 0,
    exercisesByLanguage: { es: 0, pt: 0 },
    aiGeneratedCount: 0,
    topicsByLanguage: { es: 0, pt: 0 },
    usersByLanguage: { es: 0, pt: 0 },
    completionsByLanguage: { es: 0, pt: 0 }
  });

  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load users and exercises in parallel
      await Promise.all([
        loadUserProficiencies(),
        loadExerciseGenerationNeeds()
      ]);
      // Load analytics after users are available
      await loadAnalytics();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProficiencies = async () => {
    // Get all users
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, current_level, created_at')
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
            userId: user.id,
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
        console.error(`Error analyzing user ${user.id}:`, error);
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
        target_language,
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
        priority,
        target_language: topic.target_language || 'es'
      };
    });

    setExerciseGenerations(generations);
  };

  const loadAnalytics = async () => {
    // Get all users directly from database for accurate count
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, current_level, target_language');
    
    // Calculate level distribution from database users
    const levelDistribution: Record<SpanishLevel, number> = {
      A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0
    };
    
    allUsers?.forEach(user => {
      if (user.current_level) {
        levelDistribution[user.current_level]++;
      }
    });

    // Use the users state for proficiency analysis if available
    const averageProgress = users.length > 0 
      ? users.reduce((sum, user) => sum + user.progressToNextLevel, 0) / users.length 
      : 0;

    // Count weakness areas from proficiency users
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

    // Get database statistics
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('id, type, target_language, ai_generated');
    
    const { data: allTopics } = await supabase
      .from('topics')
      .select('id, level, target_language');
    
    const { data: allProgress } = await supabase
      .from('user_progress')
      .select('id, completed_at, target_language');

    setAnalytics({
      totalUsers: allUsers?.length || 0,
      averageProgress,
      levelDistribution,
      topWeakAreas,
      totalExercises: allExercises?.length || 0,
      totalTopics: allTopics?.length || 0,
      totalCompletions: allProgress?.length || 0,
      exercisesByLanguage: {
        es: allExercises?.filter(e => e.target_language === 'es').length || 0,
        pt: allExercises?.filter(e => e.target_language === 'pt').length || 0
      },
      aiGeneratedCount: allExercises?.filter(e => e.ai_generated).length || 0,
      topicsByLanguage: {
        es: allTopics?.filter(t => t.target_language === 'es').length || 0,
        pt: allTopics?.filter(t => t.target_language === 'pt').length || 0
      },
      usersByLanguage: {
        es: allUsers?.filter(u => u.target_language === 'es').length || 0,
        pt: allUsers?.filter(u => u.target_language === 'pt').length || 0
      },
      completionsByLanguage: {
        es: allProgress?.filter(p => p.target_language === 'es').length || 0,
        pt: allProgress?.filter(p => p.target_language === 'pt').length || 0
      }
    });
  };

  const deleteAllUserProgress = async () => {
    const confirmed = confirm(
      '⚠️ ADVARSEL: Dette vil slette AL brugerdata og fremgang for ALLE brugere.\n\n' +
      'Denne handling kan IKKE fortrydes.\n\n' +
      'Er du sikker på, at du vil fortsætte?'
    );

    if (!confirmed) return;

    const doubleConfirm = confirm(
      '🔴 SIDSTE ADVARSEL: Du er ved at slette al brugerdata.\n\n' +
      'Skriv "SLET ALT" for at bekræfte (case-sensitive):'
    );

    if (!doubleConfirm) return;

    const finalConfirmation = prompt(
      'Skriv "SLET ALT" for at bekræfte sletning af al brugerdata:'
    );

    if (finalConfirmation !== 'SLET ALT') {
      alert('Handling afbrudt. Data er ikke slettet.');
      return;
    }

    try {
      setLoading(true);

      // Delete user progress
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .neq('id', 0); // Delete all records

      if (progressError) throw progressError;

      // Delete user level progress
      const { error: levelProgressError } = await supabase
        .from('user_level_progress')
        .delete()
        .neq('id', 0); // Delete all records

      if (levelProgressError) throw levelProgressError;

      // Reset users to default level
      const { error: usersError } = await supabase
        .from('users')
        .update({ current_level: 'A1' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all users

      if (usersError) throw usersError;

      alert('✅ Al brugerdata er blevet slettet succesfuldt.');
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting user progress:', error);
      alert('❌ Fejl ved sletning af brugerdata: ' + (error instanceof Error ? error.message : 'Ukendt fejl'));
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    try {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, full_name, current_level, created_at');

      const { data: allProgress } = await supabase
        .from('user_progress')
        .select('*');

      const { data: allLevelProgress } = await supabase
        .from('user_level_progress')
        .select('*');

      const exportData = {
        exportDate: new Date().toISOString(),
        totalUsers: allUsers?.length || 0,
        users: allUsers,
        progress: allProgress,
        levelProgress: allLevelProgress
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ducklingo-userdata-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Brugerdata er blevet eksporteret.');
    } catch (error) {
      console.error('Error exporting user data:', error);
      alert('❌ Fejl ved eksport af brugerdata.');
    }
  };

  const [generatingTopics, setGeneratingTopics] = useState<Set<string>>(new Set());

  const generateExercisesForTopic = async (topicId: string, count: number) => {
    // Add topic to generating set to show loading state
    setGeneratingTopics(prev => new Set(prev).add(topicId));
    
    try {
      console.log(`🚀 Starting generation for topic ${topicId}: ${count} exercises`);
      
      // Get topic details for better logging
      const topic = exerciseGenerations.find(g => g.topicId === topicId);
      const topicName = topic?.topicName || 'Unknown Topic';
      const targetLanguage = topic?.target_language || 'es';
      
      const response = await fetch('/api/generate-bulk-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          exerciseType: 'multiple_choice',
          count,
          difficulty: 'medium',
          level: topic?.level || 'A1',
          topicName,
          topicDescription: `AI-generated exercises for ${topicName}`,
          target_language: targetLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ Generation failed [${response.status}]:`, errorData);
        
        let errorMessage = 'Generering fejlede';
        if (response.status === 429) {
          errorMessage = '⏳ AI tjeneste er optaget. Prøv igen om et øjeblik.';
        } else if (response.status === 403) {
          errorMessage = '🔒 Ikke autoriseret til at generere øvelser.';
        } else if (response.status === 500) {
          errorMessage = '🚫 Server fejl under generering.';
        }
        
        alert(`❌ ${errorMessage}\n\nDetaljer: ${errorData}`);
        return;
      }

      const result = await response.json();
      console.log(`✅ Generation response:`, result);
      
      // Check if the API actually generated the expected number of exercises
      const actualCount = result.exercisesCreated || 0;
      const requestedCount = count;
      
      if (actualCount === requestedCount) {
        alert(`✅ Success! Genererede ${actualCount} øvelser for ${topicName}`);
      } else if (actualCount > 0) {
        alert(`⚠️ Delvis success: Genererede ${actualCount} af ${requestedCount} øvelser for ${topicName}\n\nNår du ser dette, betyder det at AI'en ikke kunne generere alle øvelser på grund af begrænsninger eller fejl.`);
      } else {
        alert(`❌ Ingen øvelser blev genereret for ${topicName}\n\nDette kan skyldes:\n- AI model fejl\n- Netværksproblemer\n- Ugyldig emne data`);
      }
      
      // Refresh the exercise generation needs regardless of success/failure
      await loadExerciseGenerationNeeds();
      
    } catch (error) {
      console.error('❌ Network or unexpected error:', error);
      
      let errorMessage = 'Uventet fejl under generering';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '🌐 Netværksfejl - tjek din internetforbindelse';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`❌ ${errorMessage}\n\nPrøv igen om et øjeblik. Hvis problemet fortsætter, kontakt support.`);
    } finally {
      // Remove topic from generating set
      setGeneratingTopics(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center sm:text-left">
              📊 DuckLingo Admin Dashboard
            </h1>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {(['users', 'exercises', 'analytics', 'vocabulary'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'users' && '👥 Brugere'}
                  {mode === 'exercises' && '📚 Øvelser'}
                  {mode === 'analytics' && '📈 Analyser'}
                  {mode === 'vocabulary' && '🗣️ Ordforråd'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'users' && (
          <div className="space-y-6">
            {/* Bulk Actions Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="text-center lg:text-left">
                  <h3 className="text-lg font-medium text-gray-900">Bulk Handlinger</h3>
                  <p className="text-sm text-gray-600">Administrer bruger data for alle brugere</p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => deleteAllUserProgress()}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    🗑️ Slet Al Bruger Fremgang
                  </button>
                  <button
                    onClick={() => exportUserData()}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    📊 Eksporter Data
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Bruger Proficiency Analyse ({users.length} brugere)
                </h2>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
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

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 space-y-4">
                {users.map(user => (
                  <div key={user.userId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {user.userId.substring(0, 8)}...
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.currentLevel}
                          </span>
                          {user.recommendedLevel !== user.currentLevel && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              → {user.recommendedLevel}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Tillid: </span>
                          <span className={`font-medium ${getConfidenceColor(user.confidenceScore)}`}>
                            {user.confidenceScore.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Øvelser: </span>
                          <span className="text-gray-900">{user.exercisesNeeded}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500">Fremgang: </span>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${user.progressToNextLevel}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {user.progressToNextLevel.toFixed(1)}%
                        </span>
                      </div>

                      {user.weaknessAreas.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Svagheder:</span>
                          <div className="flex flex-wrap gap-1">
                            {user.weaknessAreas.slice(0, 2).map(area => (
                              <span key={area} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                {area}
                              </span>
                            ))}
                            {user.weaknessAreas.length > 2 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                +{user.weaknessAreas.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        <span>Sidste aktivitet: </span>
                        {user.lastActivity !== 'No activity' 
                          ? new Date(user.lastActivity).toLocaleDateString('da-DK')
                          : 'Ingen aktivitet'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'exercises' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Øvelses Generering Behov
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Emner der har brug for flere AI-genererede øvelser
                </p>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                {/* Language Filter */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Filtrer efter sprog:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setExerciseLanguageFilter('all')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          exerciseLanguageFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🌐 Alle
                      </button>
                      <button
                        onClick={() => setExerciseLanguageFilter('es')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          exerciseLanguageFilter === 'es'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🇪🇸 Spansk
                      </button>
                      <button
                        onClick={() => setExerciseLanguageFilter('pt')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          exerciseLanguageFilter === 'pt'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🇵🇹 Portugisisk
                      </button>
                    </div>
                  </div>
                </div>
                
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Emne
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sprog
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
                      .filter(gen => exerciseLanguageFilter === 'all' || gen.target_language === exerciseLanguageFilter)
                      .sort((a, b) => {
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      })
                      .map(generation => (
                      <tr key={generation.topicId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {generation.topicName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg" title={generation.target_language === 'es' ? 'Spansk' : 'Portugisisk'}>
                            {generation.target_language === 'es' ? '🇪🇸' : '🇵🇹'}
                          </span>
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
                            onClick={() => generateExercisesForTopic(
                              generation.topicId, 
                              generation.recommendedCount - generation.currentCount
                            )}
                            disabled={generation.currentCount >= generation.recommendedCount || generatingTopics.has(generation.topicId)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              generatingTopics.has(generation.topicId)
                                ? 'bg-yellow-500 text-white cursor-wait'
                                : generation.currentCount >= generation.recommendedCount
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {generatingTopics.has(generation.topicId) ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                <span>Genererer...</span>
                              </div>
                            ) : (
                              `Generer ${generation.recommendedCount - generation.currentCount}`
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 space-y-4">
                {/* Language Filter - Mobile */}
                <div className="flex flex-col space-y-2 mb-4">
                  <span className="text-sm font-medium text-gray-700">Filtrer efter sprog:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setExerciseLanguageFilter('all')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        exerciseLanguageFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🌐 Alle
                    </button>
                    <button
                      onClick={() => setExerciseLanguageFilter('es')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        exerciseLanguageFilter === 'es'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🇪🇸 Spansk
                    </button>
                    <button
                      onClick={() => setExerciseLanguageFilter('pt')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        exerciseLanguageFilter === 'pt'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🇵🇹 Portugisisk
                    </button>
                  </div>
                </div>
                
                {exerciseGenerations
                  .filter(gen => exerciseLanguageFilter === 'all' || gen.target_language === exerciseLanguageFilter)
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                  })
                  .map(generation => (
                  <div key={generation.topicId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg" title={generation.target_language === 'es' ? 'Spansk' : 'Portugisisk'}>
                              {generation.target_language === 'es' ? '🇪🇸' : '🇵🇹'}
                            </span>
                            <div className="text-sm font-medium text-gray-900">
                              {generation.topicName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {generation.level}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(generation.priority)}`}>
                            {generation.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Nuværende: </span>
                          <span className="font-medium text-gray-900">{generation.currentCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Anbefalet: </span>
                          <span className="font-medium text-gray-900">{generation.recommendedCount}</span>
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={() => generateExercisesForTopic(
                            generation.topicId, 
                            generation.recommendedCount - generation.currentCount
                          )}
                          disabled={generation.currentCount >= generation.recommendedCount || generatingTopics.has(generation.topicId)}
                          className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                            generatingTopics.has(generation.topicId)
                              ? 'bg-yellow-500 text-white cursor-wait'
                              : generation.currentCount >= generation.recommendedCount
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {generatingTopics.has(generation.topicId) ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Genererer...</span>
                            </div>
                          ) : (
                            `Generer ${generation.recommendedCount - generation.currentCount}`
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="space-y-6">
            {/* Language Filter */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <h3 className="text-lg font-semibold text-gray-900">Filtrer efter målsprog:</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setAnalyticsLanguageFilter('all')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      analyticsLanguageFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🌐 Alle Sprog
                  </button>
                  <button
                    onClick={() => setAnalyticsLanguageFilter('es')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      analyticsLanguageFilter === 'es'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🇪🇸 Spansk
                  </button>
                  <button
                    onClick={() => setAnalyticsLanguageFilter('pt')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      analyticsLanguageFilter === 'pt'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🇵🇹 Portugisisk
                  </button>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 text-white">
                <div className="text-2xl font-bold">
                  {analyticsLanguageFilter === 'all' 
                    ? analytics.totalUsers 
                    : analytics.usersByLanguage[analyticsLanguageFilter]}
                </div>
                <div className="text-sm opacity-90">
                  {analyticsLanguageFilter === 'all' ? 'Total Brugere' : 
                   analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk Brugere' : '🇵🇹 Portugisisk Brugere'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-4 text-white">
                <div className="text-2xl font-bold">
                  {analyticsLanguageFilter === 'all' 
                    ? analytics.totalExercises 
                    : analytics.exercisesByLanguage[analyticsLanguageFilter]}
                </div>
                <div className="text-sm opacity-90">
                  {analyticsLanguageFilter === 'all' ? 'Total Øvelser' : 
                   analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk Øvelser' : '🇵🇹 Portugisisk Øvelser'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
                <div className="text-2xl font-bold">
                  {analyticsLanguageFilter === 'all' 
                    ? analytics.totalTopics 
                    : analytics.topicsByLanguage[analyticsLanguageFilter]}
                </div>
                <div className="text-sm opacity-90">
                  {analyticsLanguageFilter === 'all' ? 'Total Emner' : 
                   analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk Emner' : '🇵🇹 Portugisisk Emner'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-4 text-white">
                <div className="text-2xl font-bold">
                  {analyticsLanguageFilter === 'all' 
                    ? analytics.totalCompletions 
                    : analytics.completionsByLanguage[analyticsLanguageFilter]}
                </div>
                <div className="text-sm opacity-90">
                  {analyticsLanguageFilter === 'all' ? 'Total Gennemførelser' : 
                   analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk Gennemførelser' : '🇵🇹 Portugisisk Gennemførelser'}
                </div>
              </div>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📊 Bruger Statistik {analyticsLanguageFilter !== 'all' && (
                    <span className="text-sm font-normal text-gray-500">
                      ({analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk' : '🇵🇹 Portugisisk'})
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Brugere:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {analyticsLanguageFilter === 'all' 
                        ? analytics.totalUsers 
                        : analytics.usersByLanguage[analyticsLanguageFilter]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Gennemsnitlig Fremgang:</span>
                    <span className="font-semibold text-sm sm:text-base">{analytics.averageProgress.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Gennemførelser:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {analyticsLanguageFilter === 'all' 
                        ? analytics.totalCompletions 
                        : analytics.completionsByLanguage[analyticsLanguageFilter]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Gns. per Bruger:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {(() => {
                        const users = analyticsLanguageFilter === 'all' 
                          ? analytics.totalUsers 
                          : analytics.usersByLanguage[analyticsLanguageFilter];
                        const completions = analyticsLanguageFilter === 'all' 
                          ? analytics.totalCompletions 
                          : analytics.completionsByLanguage[analyticsLanguageFilter];
                        return users > 0 ? Math.round(completions / users) : 0;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📚 Øvelser & Emner {analyticsLanguageFilter !== 'all' && (
                    <span className="text-sm font-normal text-gray-500">
                      ({analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk' : '🇵🇹 Portugisisk'})
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Øvelser:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {analyticsLanguageFilter === 'all' 
                        ? analytics.totalExercises 
                        : analytics.exercisesByLanguage[analyticsLanguageFilter]}
                    </span>
                  </div>
                  {analyticsLanguageFilter === 'all' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm sm:text-base">🇪🇸 Spansk:</span>
                        <span className="font-semibold text-sm sm:text-base">{analytics.exercisesByLanguage.es}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm sm:text-base">🇵🇹 Portugisisk:</span>
                        <span className="font-semibold text-sm sm:text-base">{analytics.exercisesByLanguage.pt}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">AI Genereret:</span>
                    <span className="font-semibold text-sm sm:text-base">{analytics.aiGeneratedCount}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Emner:</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {analyticsLanguageFilter === 'all' 
                          ? analytics.totalTopics 
                          : analytics.topicsByLanguage[analyticsLanguageFilter]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🌐 Sprog Fordeling
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">🇪🇸 Spansk Emner</span>
                      <span className="text-sm font-semibold">{analytics.topicsByLanguage.es}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${analytics.totalTopics > 0 ? (analytics.topicsByLanguage.es / analytics.totalTopics) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">🇵🇹 Portugisisk Emner</span>
                      <span className="text-sm font-semibold">{analytics.topicsByLanguage.pt}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${analytics.totalTopics > 0 ? (analytics.topicsByLanguage.pt / analytics.totalTopics) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sprog Balancering</span>
                      <span className="text-sm font-semibold">
                        {analytics.totalTopics > 0 ? Math.abs(analytics.topicsByLanguage.es - analytics.topicsByLanguage.pt) : 0} forskel
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📈 Niveau Fordeling
                </h3>
                <div className="space-y-2">
                  {Object.entries(analytics.levelDistribution).map(([level, count]) => (
                    <div key={level} className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm sm:text-base">{level}:</span>
                      <div className="flex items-center">
                        <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${analytics.totalUsers > 0 ? (count / analytics.totalUsers) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-sm">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎯 Top Svagheder
                </h3>
                <div className="space-y-2">
                  {analytics.topWeakAreas.length > 0 ? (
                    analytics.topWeakAreas.map(({ area, count }) => (
                      <div key={area} className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm truncate mr-2">{area}</span>
                        <span className="font-semibold text-red-600 text-sm flex-shrink-0">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Ingen svaghedsdata tilgængelig</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  💡 Database Sundhed {analyticsLanguageFilter !== 'all' && (
                    <span className="text-sm font-normal text-gray-500">
                      ({analyticsLanguageFilter === 'es' ? '🇪🇸 Spansk' : '🇵🇹 Portugisisk'})
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Øvelser/Emne:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {(() => {
                        const topics = analyticsLanguageFilter === 'all' 
                          ? analytics.totalTopics 
                          : analytics.topicsByLanguage[analyticsLanguageFilter];
                        const exercises = analyticsLanguageFilter === 'all' 
                          ? analytics.totalExercises 
                          : analytics.exercisesByLanguage[analyticsLanguageFilter];
                        return topics > 0 ? Math.round(exercises / topics) : 0;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">AI Genereret %:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {(() => {
                        const exercises = analyticsLanguageFilter === 'all' 
                          ? analytics.totalExercises 
                          : analytics.exercisesByLanguage[analyticsLanguageFilter];
                        return exercises > 0 ? Math.round((analytics.aiGeneratedCount / analytics.totalExercises) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                  {analyticsLanguageFilter === 'all' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm sm:text-base">Spansk Dækning:</span>
                        <span className={`font-semibold text-sm sm:text-base ${
                          analytics.topicsByLanguage.es > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analytics.topicsByLanguage.es > 0 ? '✓ Aktiv' : '✗ Mangler'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm sm:text-base">Portugisisk Dækning:</span>
                        <span className={`font-semibold text-sm sm:text-base ${
                          analytics.topicsByLanguage.pt > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analytics.topicsByLanguage.pt > 0 ? '✓ Aktiv' : '✗ Mangler'}
                        </span>
                      </div>
                    </>
                  )}
                  {analyticsLanguageFilter !== 'all' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Status:</span>
                      <span className={`font-semibold text-sm sm:text-base ${
                        analytics.topicsByLanguage[analyticsLanguageFilter] > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analytics.topicsByLanguage[analyticsLanguageFilter] > 0 ? '✓ Aktiv' : '✗ Mangler'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Bruger Aktivitet:</span>
                    <span className="font-semibold text-sm sm:text-base">
                      {(() => {
                        const users = analyticsLanguageFilter === 'all' 
                          ? analytics.totalUsers 
                          : analytics.usersByLanguage[analyticsLanguageFilter];
                        return users > 0 ? '✓ Aktiv' : '✗ Ingen';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'vocabulary' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  🗣️ Ordforråds Øvelse Generator
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Generer tilpassede ordforrådsøvelser for alle niveauer med AI-drevet indhold
                </p>
              </div>

              {/* Level Selection for Vocabulary Exercises */}
              <div className="grid grid-cols-1 gap-6">
                {(['A1', 'A2', 'B1'] as SpanishLevel[]).map(level => (
                  <div key={level} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Niveau {level}
                    </h4>
                    <VocabularyExerciseGenerator 
                      level={level}
                      onExerciseGenerated={(exercise) => {
                        console.log(`Generated ${level} vocabulary exercise:`, exercise);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
