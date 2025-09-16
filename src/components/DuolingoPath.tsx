'use client';

import { useEffect, useState } from 'react';
import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface DuolingoPathProps {
  level: SpanishLevel;
  topics: Topic[];
  exercises: Exercise[];
  userProgress: UserProgress[];
  onRefresh: () => void;
}

interface LessonNode {
  id: string;
  topicId: number;
  topicName: string;
  exercises: Exercise[];
  completed: boolean;
  unlocked: boolean;
  skillStrength: number;
  totalXP: number;
  position: { x: number; y: number };
  type: 'lesson' | 'checkpoint' | 'bonus';
}

export default function DuolingoPath({ level, topics, exercises, userProgress, onRefresh }: DuolingoPathProps) {
  const [nodes, setNodes] = useState<LessonNode[]>([]);
  const [userStats, setUserStats] = useState({
    streak: 0,
    totalXP: 0,
    lessonsCompleted: 0,
    perfectLessons: 0
  });

  const supabase = createClient();

  useEffect(() => {
    generateLearningPath();
    calculateUserStats();
  }, [topics, exercises, userProgress]);

  const generateLearningPath = () => {
    const pathNodes: LessonNode[] = [];
    let currentY = 0;
    const nodeSpacing = 120;
    const pathWidth = 400;

    topics.forEach((topic, topicIndex) => {
      const topicExercises = exercises.filter(ex => ex.topic_id === topic.id);
      
      if (topicExercises.length === 0) return;

      // Split exercises into lesson chunks (3-5 exercises per lesson)
      const lessonsPerTopic = Math.ceil(topicExercises.length / 4);
      
      for (let lessonIndex = 0; lessonIndex < lessonsPerTopic; lessonIndex++) {
        const startIdx = lessonIndex * 4;
        const endIdx = Math.min(startIdx + 4, topicExercises.length);
        const lessonExercises = topicExercises.slice(startIdx, endIdx);
        
        const completed = lessonExercises.every(ex => {
          const progress = userProgress.find(p => p.exercise_id === ex.id);
          return progress && progress.completed;
        });

        const unlocked = lessonIndex === 0 || pathNodes[pathNodes.length - 1]?.completed || false;
        
        const skillStrength = calculateSkillStrength(lessonExercises);
        const totalXP = calculateLessonXP(lessonExercises);

        // Create zigzag pattern like Duolingo
        const xOffset = (topicIndex + lessonIndex) % 2 === 0 ? -100 : 100;
        const x = pathWidth / 2 + xOffset;
        const y = currentY;

        pathNodes.push({
          id: `${topic.id}-${lessonIndex}`,
          topicId: topic.id,
          topicName: topic.name_da,
          exercises: lessonExercises,
          completed,
          unlocked,
          skillStrength,
          totalXP,
          position: { x, y },
          type: lessonIndex === lessonsPerTopic - 1 ? 'checkpoint' : 'lesson'
        });

        currentY += nodeSpacing;
      }

      // Add bonus lesson every few topics
      if ((topicIndex + 1) % 3 === 0) {
        pathNodes.push({
          id: `bonus-${topicIndex}`,
          topicId: topic.id,
          topicName: `${topic.name_da} - Bonus`,
          exercises: topicExercises.slice(0, 2), // Mini bonus lesson
          completed: false,
          unlocked: pathNodes[pathNodes.length - 1]?.completed || false,
          skillStrength: 100,
          totalXP: 50,
          position: { x: pathWidth / 2, y: currentY },
          type: 'bonus'
        });
        currentY += nodeSpacing;
      }
    });

    setNodes(pathNodes);
  };

  const calculateSkillStrength = (lessonExercises: Exercise[]): number => {
    const progressScores = lessonExercises.map(ex => {
      const progress = userProgress.find(p => p.exercise_id === ex.id);
      return progress?.score || 0;
    });

    if (progressScores.length === 0) return 0;
    return Math.round(progressScores.reduce((sum, score) => sum + score, 0) / progressScores.length);
  };

  const calculateLessonXP = (lessonExercises: Exercise[]): number => {
    return lessonExercises.reduce((total, ex) => {
      const progress = userProgress.find(p => p.exercise_id === ex.id);
      if (progress && progress.completed) {
        return total + Math.max(10, Math.round((progress.score || 0) / 5));
      }
      return total;
    }, 0);
  };

  const calculateUserStats = () => {
    const completedLessons = nodes.filter(node => node.completed).length;
    const perfectLessons = nodes.filter(node => node.skillStrength >= 95).length;
    const totalXP = nodes.reduce((sum, node) => sum + node.totalXP, 0);
    
    // Simple streak calculation (would be more sophisticated in real app)
    const streak = Math.min(completedLessons, 7); // Max 7 day streak for demo

    setUserStats({
      streak,
      totalXP,
      lessonsCompleted: completedLessons,
      perfectLessons
    });
  };

  const getNodeIcon = (node: LessonNode): string => {
    if (!node.unlocked) return '🔒';
    if (node.type === 'bonus') return '💎';
    if (node.type === 'checkpoint') return '👑';
    if (node.completed && node.skillStrength >= 95) return '⭐';
    if (node.completed) return '✅';
    return '📚';
  };

  const getNodeColor = (node: LessonNode): string => {
    if (!node.unlocked) return 'bg-gray-300 border-gray-400';
    if (node.type === 'bonus') return 'bg-purple-500 border-purple-600';
    if (node.type === 'checkpoint') return 'bg-yellow-500 border-yellow-600';
    if (node.completed && node.skillStrength >= 95) return 'bg-green-500 border-green-600';
    if (node.completed) return 'bg-blue-500 border-blue-600';
    return 'bg-white border-gray-300 hover:border-blue-400';
  };

  const handleNodeClick = (node: LessonNode) => {
    if (!node.unlocked) return;
    
    // For now, navigate to first exercise in the lesson
    if (node.exercises.length > 0) {
      window.location.href = `/exercise/${node.exercises[0].id}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      {/* Stats Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="text-sm text-gray-600">Streak</div>
                  <div className="font-bold text-orange-600">{userStats.streak} dage</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-2xl">💎</span>
                <div>
                  <div className="text-sm text-gray-600">XP</div>
                  <div className="font-bold text-blue-600">{userStats.totalXP}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="text-sm text-gray-600">Lektioner</div>
                  <div className="font-bold text-green-600">{userStats.lessonsCompleted}</div>
                </div>
              </div>
            </div>
            
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Niveau {level}</h1>
          <p className="text-gray-600">Din personlige læringssti</p>
        </div>

        {/* Path Container */}
        <div className="relative">
          {/* Path Line */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ height: `${nodes.length * 120 + 100}px` }}
          >
            {nodes.map((node, index) => {
              if (index === nodes.length - 1) return null;
              const nextNode = nodes[index + 1];
              return (
                <path
                  key={`path-${index}`}
                  d={`M ${node.position.x + 40} ${node.position.y + 40} Q ${(node.position.x + nextNode.position.x) / 2} ${(node.position.y + nextNode.position.y) / 2} ${nextNode.position.x + 40} ${nextNode.position.y + 40}`}
                  stroke={node.completed ? "#10B981" : "#D1D5DB"}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={node.completed ? "0" : "10,5"}
                />
              );
            })}
          </svg>

          {/* Lesson Nodes */}
          <div 
            className="relative"
            style={{ height: `${nodes.length * 120 + 100}px` }}
          >
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                }}
              >
                {/* Lesson Circle */}
                <button
                  onClick={() => handleNodeClick(node)}
                  disabled={!node.unlocked}
                  className={`
                    w-20 h-20 rounded-full border-4 ${getNodeColor(node)}
                    shadow-lg transition-all duration-300 transform
                    ${node.unlocked ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                    ${node.completed ? 'animate-pulse' : ''}
                    flex items-center justify-center text-2xl
                  `}
                >
                  {getNodeIcon(node)}
                </button>

                {/* Lesson Info */}
                <div className="mt-3 text-center">
                  <div className="text-sm font-medium text-gray-800 max-w-24 mx-auto leading-tight">
                    {node.topicName}
                  </div>
                  
                  {node.unlocked && (
                    <div className="text-xs text-gray-600 mt-1">
                      {node.exercises.length} øvelser
                    </div>
                  )}
                  
                  {node.completed && (
                    <div className="flex items-center justify-center mt-1">
                      <div className="text-xs text-green-600 font-medium">
                        +{node.totalXP} XP
                      </div>
                    </div>
                  )}
                  
                  {node.completed && node.skillStrength < 80 && (
                    <div className="mt-1">
                      <div className="text-xs text-orange-600">💪 Træn mere</div>
                    </div>
                  )}
                </div>

                {/* Skill Strength Bar */}
                {node.unlocked && node.skillStrength > 0 && (
                  <div className="mt-2 w-20">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all duration-500 ${
                          node.skillStrength >= 80 ? 'bg-green-500' : 
                          node.skillStrength >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${node.skillStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Goal Progress */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Dagens mål</h3>
            <span className="text-sm text-gray-600">🎯 15 min/dag</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (userStats.lessonsCompleted / 3) * 100)}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-gray-600 text-center">
            {userStats.lessonsCompleted >= 3 ? 
              "🎉 Dagens mål nået! Fantastisk arbejde!" : 
              `${3 - userStats.lessonsCompleted} lektioner tilbage til dagens mål`
            }
          </div>
        </div>

        {/* Quick Practice Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Hurtig øvelse</h3>
              <p className="text-purple-100">Styrk dine svageste færdigheder</p>
            </div>
            <button className="bg-white text-purple-600 px-6 py-3 rounded-full font-bold hover:bg-purple-50 transition-colors">
              Start øvelse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}