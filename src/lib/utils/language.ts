import { TargetLanguage } from '@/types/database';

export interface LanguageInfo {
  code: TargetLanguage;
  name: string;
  nativeName: string;
  flag: string;
  color: string; // Brand color for the language
}

export const SUPPORTED_LANGUAGES: Record<TargetLanguage, LanguageInfo> = {
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    color: '#FFC400' // Spanish yellow/gold
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    color: '#FF0000' // Portuguese red
  }
};

/**
 * Get language information by code
 */
export function getLanguageInfo(code: TargetLanguage): LanguageInfo {
  return SUPPORTED_LANGUAGES[code];
}

/**
 * Get localized proficiency level name
 */
export function getProficiencyLevelName(level: string, language: TargetLanguage): string {
  const levelNames = {
    es: {
      A1: 'Principiante',
      A2: 'Elemental',
      B1: 'Intermedio',
      B2: 'Intermedio Alto',
      C1: 'Avanzado',
      C2: 'Maestría'
    },
    pt: {
      A1: 'Iniciante',
      A2: 'Elementar',
      B1: 'Intermediário',
      B2: 'Intermediário Alto',
      C1: 'Avançado',
      C2: 'Proficiência'
    }
  };

  return levelNames[language]?.[level as keyof typeof levelNames.es] || level;
}
