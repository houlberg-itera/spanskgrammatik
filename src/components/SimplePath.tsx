'use client';

import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';
import Link from 'next/link';

interface SimplePathProps {
  level: SpanishLevel;
  topics: Topic[];
  exercises: Exercise[];
  userProgress: UserProgress[];
  onRefresh: () => void;
}

export default function SimplePath({ level, topics, exercises, userProgress, onRefresh }: SimplePathProps) {
  const getTopicExercises = (topicId: number) => {
    return exercises.filter(ex => ex.topic_id === topicId);
  };

  const getExerciseProgress = (exerciseId: number) => {
    return userProgress.find(p => p.exercise_id === exerciseId);
  };

  const getTopicProgress = (topicId: number) => {
    const topicExercises = getTopicExercises(topicId);
    if (topicExercises.length === 0) return 0;
    
    const completedExercises = topicExercises.filter(ex => {
      const progress = getExerciseProgress(ex.id);
      return progress && progress.completed;
    });
    
    return Math.round((completedExercises.length / topicExercises.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      {/* Simple Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Niveau {level}</h1>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            >
              🔄 Opdater
            </button>
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {topics.map((topic, index) => {
            const topicExercises = getTopicExercises(topic.id);
            const progress = getTopicProgress(topic.id);
            const isUnlocked = index === 0 || getTopicProgress(topics[index - 1]?.id) >= 80;

            return (
              <div
                key={topic.id}
                className={`relative bg-white rounded-xl shadow-lg p-6 transition-all duration-300 ${
                  isUnlocked ? 'hover:shadow-xl' : 'opacity-60'
                }`}
              >
                {/* Topic Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                        isUnlocked
                          ? progress >= 80
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {!isUnlocked ? '🔒' : progress >= 80 ? '✅' : '📚'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{topic.name_da}</h3>
                      <p className="text-gray-600">{topic.description_da}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{progress}%</div>
                    <div className="text-sm text-gray-500">Gennemført</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progress >= 80 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Exercises Grid */}
                {isUnlocked && topicExercises.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topicExercises.slice(0, 6).map((exercise) => {
                      const exerciseProgress = getExerciseProgress(exercise.id);
                      const isCompleted = exerciseProgress && exerciseProgress.completed;

                      return (
                        <Link
                          key={exercise.id}
                          href={`/exercise/${exercise.id}`}
                          className="block p-3 border-2 rounded-lg hover:shadow-md transition-all duration-200 hover:border-blue-400"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {exercise.title_da}
                            </h4>
                            {isCompleted && (
                              <span className="text-green-500 text-lg">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {exercise.type}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Locked State */}
                {!isUnlocked && (
                  <div className="text-center py-4 text-gray-500">
                    <p>Gennemfør forrige emne for at låse dette op</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}