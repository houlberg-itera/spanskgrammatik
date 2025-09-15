'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;  // Changed from 'user_id' to 'id'
  email: string;
  current_level: string;
  created_at: string;
}

interface ProficiencyData {
  analysis: {
    currentLevel: string;
    confidenceScore: number;
    strengthAreas: string[];
    weaknessAreas: string[];
    recommendedLevel: string;
    progressToNextLevel: number;
    exercisesNeeded: number;
  };
  recentProgress: Array<{
    topicName: string;
    score: number;
    completedAt: string;
  }>;
  recommendations: {
    suggestedExercises: Array<{
      topicId: string;
      topicName: string;
      priority: string;
      reason: string;
    }>;
    studyPlan: Array<{
      week: number;
      focus: string;
      topics: string[];
    }>;
  };
}

export default function ProficiencyAnalysis() {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [proficiencyData, setProficiencyData] = useState<ProficiencyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const supabase = createClient();

  // Check admin status and load users when component mounts
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/check-admin');
      const result = await response.json();
      
      console.log('Admin check result:', result);
      setIsAdmin(result.isAdmin);
      setCurrentUserEmail(result.userEmail || null);
      
      if (result.isAdmin) {
        loadAllUsers();
      } else {
        setAdminCheckError(`Adgang nægtet: ${result.message} (Email: ${result.userEmail || 'ikke fundet'})`);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminCheckError('Fejl ved kontrol af admin status');
      setIsAdmin(false);
    }
  };

  const loadAllUsers = async () => {
    setLoadingAllUsers(true);
    try {
      // First check if we can connect to Supabase
      const { data: authUser } = await supabase.auth.getUser();
      console.log('Current auth user:', authUser?.user?.email);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, current_level, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('Query result - Data:', data, 'Error:', error);

      if (error) {
        console.error('Error loading users:', error);
        alert(`Fejl ved indlæsning af brugere: ${error.message}`);
        return;
      }

      console.log('Users loaded from users table:', data?.length || 0, 'users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Fejl ved indlæsning af brugere');
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const searchUsers = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')  // Changed from 'user_profiles' to 'users'
        .select('id, email, current_level, created_at')  // Changed 'user_id' to 'id'
        .ilike('email', `%${searchEmail}%`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        alert('Fejl ved søgning efter brugere');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      alert('Fejl ved søgning efter brugere');
    } finally {
      setSearching(false);
    }
  };

  const analyzeUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoading(true);
    setProficiencyData(null);

    try {
      const response = await fetch(`/api/proficiency-analysis?userId=${user.id}&recommendations=true`);
      
      if (!response.ok) {
        throw new Error('Failed to analyze user');
      }

      const data = await response.json();
      setProficiencyData(data);
    } catch (error) {
      console.error('Error analyzing user:', error);
      alert('Fejl ved analyse af bruger');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📈 Bruger Proficiency Analyse ({users.length} brugere)
              </h1>
              <p className="text-gray-600 mt-1">
                Detaljeret analyse af individuelle brugers sprogfærdigheder
                {currentUserEmail && (
                  <span className="block text-sm text-blue-600 mt-1">
                    Logget ind som: {currentUserEmail}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={loadAllUsers}
              disabled={loadingAllUsers || !isAdmin}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {loadingAllUsers ? '🔄 Opdaterer...' : '🔄 Opdater'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Admin Access Check */}
          {isAdmin === null ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Kontrollerer admin adgang...</p>
            </div>
          ) : !isAdmin ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-md p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-2">🚫 Adgang Nægtet</h2>
                <p className="text-red-600 mb-4">{adminCheckError || 'Du har ikke admin rettigheder til denne side'}</p>
                <div className="text-sm text-gray-600 mb-4">
                  <p>For at få adgang til bruger proficiency analyse skal du:</p>
                  <ul className="list-disc list-inside mt-2 text-left max-w-md mx-auto">
                    <li>Logge ind med en admin email</li>
                    <li>Kontakte systemadministrator for at få din email tilføjet til admin listen</li>
                  </ul>
                </div>
                <button
                  onClick={checkAdminStatus}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Prøv igen
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* User Search */}
              <div className="mb-8">
            <div className="flex space-x-4 mb-4">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Søg efter specifik bruger (email)..."
                className="flex-1 border border-gray-300 rounded-md px-4 py-2"
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <button
                onClick={searchUsers}
                disabled={searching}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {searching ? '🔍 Søger...' : '🔍 Søg'}
              </button>
            </div>

            {loadingAllUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Indlæser brugere...</p>
              </div>
            ) : users.length > 0 ? (
              <div className="border border-gray-200 rounded-md">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">
                    {searchEmail ? `Søgeresultater (${users.length})` : `Alle brugere (${users.length})`}
                  </h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => analyzeUser(user)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            Niveau: {user.current_level} • Oprettet: {new Date(user.created_at).toLocaleDateString('da-DK')}
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Analyser →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Ingen brugere fundet</p>
              </div>
            )}
          </div>
            </>
          )}

          {/* Analysis Results */}
          {selectedUser && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Analyserer: {selectedUser.email}
                </h2>
                <div className="text-sm text-gray-600">
                  Bruger ID: {selectedUser.id} • Nuværende niveau: {selectedUser.current_level}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Analyserer bruger proficiency...</p>
                </div>
              ) : proficiencyData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Analysis Overview */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        📊 Proficiency Oversigt
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Nuværende niveau:</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                            {proficiencyData.analysis.currentLevel}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tillid score:</span>
                          <span className={`px-3 py-1 rounded-full font-medium ${getConfidenceColor(proficiencyData.analysis.confidenceScore)}`}>
                            {proficiencyData.analysis.confidenceScore.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Anbefalet niveau:</span>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                            {proficiencyData.analysis.recommendedLevel}
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Fremgang til næste niveau:</span>
                            <span className="font-medium">{proficiencyData.analysis.progressToNextLevel.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${proficiencyData.analysis.progressToNextLevel}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Øvelser behov:</span>
                          <span className="font-medium">{proficiencyData.analysis.exercisesNeeded}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        💪 Styrker & 🎯 Svagheder
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-green-700 mb-2">Styrker:</h4>
                          <div className="flex flex-wrap gap-2">
                            {proficiencyData.analysis.strengthAreas?.map(area => (
                              <span key={area} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                                {area}
                              </span>
                            )) || (
                              <span className="text-gray-500 text-sm">Ingen styrker identificeret endnu</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-red-700 mb-2">Svagheder:</h4>
                          <div className="flex flex-wrap gap-2">
                            {proficiencyData.analysis.weaknessAreas?.map(area => (
                              <span key={area} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                                {area}
                              </span>
                            )) || (
                              <span className="text-gray-500 text-sm">Ingen svagheder identificeret endnu</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        📚 Seneste Aktivitet
                      </h3>
                      <div className="space-y-3">
                        {proficiencyData.recentProgress && proficiencyData.recentProgress.length > 0 ? (
                          proficiencyData.recentProgress.slice(0, 5).map((progress, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                              <div>
                                <div className="font-medium text-gray-900">{progress.topicName}</div>
                                <div className="text-sm text-gray-500">
                                  {new Date(progress.completedAt).toLocaleDateString('da-DK')}
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-sm font-medium ${
                                progress.score >= 80 ? 'bg-green-100 text-green-700' :
                                progress.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {progress.score}%
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">Ingen seneste aktivitet</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🎯 Anbefalede Øvelser
                      </h3>
                      <div className="space-y-3">
                        {proficiencyData.recommendations?.suggestedExercises?.map((exercise, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">{exercise.topicName}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(exercise.priority)}`}>
                                {exercise.priority.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{exercise.reason}</p>
                          </div>
                        )) || (
                          <div className="text-center py-8 text-gray-500">
                            <p>🔄 Ingen anbefalede øvelser tilgængelige endnu</p>
                            <p className="text-sm mt-2">Systemet analyserer brugerens data for at generere personaliserede anbefalinger.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        📅 Studieplan
                      </h3>
                      <div className="space-y-4">
                        {proficiencyData.recommendations?.studyPlan?.map((week, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
                                Uge {week.week}
                              </span>
                              <h4 className="font-medium text-gray-900 ml-3">{week.focus}</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {week.topics?.map(topic => (
                                <span key={topic} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                  {topic}
                                </span>
                              )) || (
                                <span className="text-gray-500 text-sm">Ingen emner defineret</span>
                              )}
                            </div>
                          </div>
                        )) || (
                          <div className="text-center py-8 text-gray-500">
                            <p>📅 Ingen studieplan tilgængelig endnu</p>
                            <p className="text-sm mt-2">Systemet genererer en personaliseret studieplan baseret på brugerens fremskridt.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
