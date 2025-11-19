'use client';

import { TargetLanguage } from '@/types/database';
import { SUPPORTED_LANGUAGES, LanguageInfo } from '@/lib/utils/language';

interface LanguageSelectorProps {
  selectedLanguage: TargetLanguage;
  onLanguageChange: (language: TargetLanguage) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  variant = 'default',
  className = ''
}: LanguageSelectorProps) {
  const languages = Object.values(SUPPORTED_LANGUAGES);

  if (variant === 'compact') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedLanguage === lang.code
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1.5">{lang.flag}</span>
            {lang.nativeName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={`p-6 rounded-2xl border-2 transition-all text-left ${
            selectedLanguage === lang.code
              ? 'border-blue-600 bg-blue-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">{lang.flag}</span>
            {selectedLanguage === lang.code && (
              <span className="text-blue-600 text-2xl">✓</span>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {lang.nativeName}
          </h3>
          <p className="text-sm text-gray-600">{lang.name}</p>
        </button>
      ))}
    </div>
  );
}
