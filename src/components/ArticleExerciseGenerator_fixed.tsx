'use client';

import { SpanishLevel } from '@/types/database';

interface ArticleExerciseGeneratorProps {
  level: SpanishLevel;
}

export default function ArticleExerciseGenerator({ level }: ArticleExerciseGeneratorProps) {
  // Exercise generation now restricted to administrators
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-yellow-800 mb-4">🔒 Exercise Generation Restricted</h2>
        <p className="text-yellow-700 mb-4">
          AI exercise generation is now restricted to administrators to ensure quality and prevent system overload.
        </p>
        <p className="text-yellow-600 text-sm">
          Please use the existing exercises available in each level. If you need additional exercises, 
          please contact your instructor or administrator.
        </p>
        <div className="mt-6">
          <p className="text-sm text-gray-600">
            <strong>Current Level:</strong> {level}
          </p>
        </div>
      </div>
    </div>
  );
}
