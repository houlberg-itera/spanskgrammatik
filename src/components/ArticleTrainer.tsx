'use client';

import { useState } from 'react';
import { SpanishLevel } from '@/types/database';

interface ArticleTrainerProps {
  level: SpanishLevel;
}

interface ArticleRule {
  type: 'definite' | 'indefinite';
  gender: 'masculine' | 'feminine';
  number: 'singular' | 'plural';
  spanish: string;
  danish: string;
  description: string;
  examples: Array<{
    spanish: string;
    danish: string;
    explanation: string;
  }>;
}

const articleRules: ArticleRule[] = [
  {
    type: 'definite',
    gender: 'masculine',
    number: 'singular',
    spanish: 'el',
    danish: '-en/-et (hankøn)',
    description: 'Bestemt artikel for hankøn ental',
    examples: [
      {
        spanish: 'el perro (hunden)',
        danish: 'hunden',
        explanation: 'Hankøn substantiv = el + substantiv. Eksempel: ___ perro (hunden)'
      },
      {
        spanish: 'el libro (bogen)',
        danish: 'bogen',
        explanation: 'Libro (bog) er hankøn, derfor el libro. Eksempel: ___ libro (bogen)'
      },
      {
        spanish: 'el problema (problemet)',
        danish: 'problemet',
        explanation: 'OBS: Problema ender på -a men er hankøn! Eksempel: ___ problema (problemet)'
      }
    ]
  },
  {
    type: 'definite',
    gender: 'feminine',
    number: 'singular',
    spanish: 'la',
    danish: '-en (hunkøn)',
    description: 'Bestemt artikel for hunkøn ental',
    examples: [
      {
        spanish: 'la manzana (æblet)',
        danish: 'æblet',
        explanation: 'Manzana (æble) er hunkøn, derfor la manzana. Eksempel: ___ manzana (æblet)'
      },
      {
        spanish: 'la mesa (bordet)',
        danish: 'bordet',
        explanation: 'Mesa (bord) er hunkøn, derfor la mesa. Eksempel: ___ mesa (bordet)'
      },
      {
        spanish: 'la mano (hånden)',
        danish: 'hånden',
        explanation: 'OBS: Mano ender på -o men er hunkøn! Eksempel: ___ mano (hånden)'
      }
    ]
  },
  {
    type: 'indefinite',
    gender: 'masculine',
    number: 'singular',
    spanish: 'un',
    danish: 'en/et (hankøn)',
    description: 'Ubestemt artikel for hankøn ental',
    examples: [
      {
        spanish: 'un perro (en hund)',
        danish: 'en hund',
        explanation: 'En hund = un perro (hankøn ubestemt). Eksempel: ___ perro (en hund)'
      },
      {
        spanish: 'un libro (en bog)',
        danish: 'en bog',
        explanation: 'En bog = un libro (hankøn ubestemt). Eksempel: ___ libro (en bog)'
      }
    ]
  },
  {
    type: 'indefinite',
    gender: 'feminine',
    number: 'singular',
    spanish: 'una',
    danish: 'en/et (hunkøn)',
    description: 'Ubestemt artikel for hunkøn ental',
    examples: [
      {
        spanish: 'una manzana (et æble)',
        danish: 'et æble',
        explanation: 'Et æble = una manzana (hunkøn ubestemt). Eksempel: ___ manzana (et æble)'
      },
      {
        spanish: 'una mesa (et bord)',
        danish: 'et bord',
        explanation: 'Et bord = una mesa (hunkøn ubestemt). Eksempel: ___ mesa (et bord)'
      }
    ]
  }
];

const practiceWords = [
  { spanish: 'manzana', gender: 'feminine', danish: 'æble' },
  { spanish: 'perro', gender: 'masculine', danish: 'hund' },
  { spanish: 'mesa', gender: 'feminine', danish: 'bord' },
  { spanish: 'libro', gender: 'masculine', danish: 'bog' },
  { spanish: 'casa', gender: 'feminine', danish: 'hus' },
  { spanish: 'gato', gender: 'masculine', danish: 'kat' },
  { spanish: 'silla', gender: 'feminine', danish: 'stol' },
  { spanish: 'problema', gender: 'masculine', danish: 'problem' },
  { spanish: 'mano', gender: 'feminine', danish: 'hånd' },
  { spanish: 'día', gender: 'masculine', danish: 'dag' },
];

export default function ArticleTrainer({ level }: ArticleTrainerProps) {
  const [currentSection, setCurrentSection] = useState<'rules' | 'practice'>('rules');
  const [practiceMode, setPracticeMode] = useState<'definite' | 'indefinite'>('definite');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [practiceSession, setPracticeSession] = useState<{
    wordsCompleted: Set<number>;
    sessionComplete: boolean;
    totalWords: number;
  }>({
    wordsCompleted: new Set(),
    sessionComplete: false,
    totalWords: practiceWords.length
  });

  const currentWord = practiceWords[currentWordIndex];
  const correctArticle = practiceMode === 'definite' 
    ? (currentWord.gender === 'masculine' ? 'el' : 'la')
    : (currentWord.gender === 'masculine' ? 'un' : 'una');

  const handleAnswer = () => {
    setShowAnswer(true);
    const isCorrect = userAnswer.toLowerCase().trim() === correctArticle;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
  };

  const nextWord = () => {
    // Mark current word as completed
    setPracticeSession(prev => {
      const newCompleted = new Set(prev.wordsCompleted);
      newCompleted.add(currentWordIndex);
      
      // Check if all words are completed
      const isSessionComplete = newCompleted.size >= practiceWords.length;
      
      return {
        ...prev,
        wordsCompleted: newCompleted,
        sessionComplete: isSessionComplete
      };
    });

    // Find next uncompleted word or complete the session
    if (practiceSession.wordsCompleted.size < practiceWords.length - 1) {
      let nextIndex = currentWordIndex;
      do {
        nextIndex = (nextIndex + 1) % practiceWords.length;
      } while (practiceSession.wordsCompleted.has(nextIndex));
      
      setCurrentWordIndex(nextIndex);
    }
    
    setUserAnswer('');
    setShowAnswer(false);
  };

  const resetPracticeSession = () => {
    setPracticeSession({
      wordsCompleted: new Set(),
      sessionComplete: false,
      totalWords: practiceWords.length
    });
    setCurrentWordIndex(0);
    setScore({ correct: 0, total: 0 });
    setUserAnswer('');
    setShowAnswer(false);
  };

  const switchPracticeMode = (newMode: 'definite' | 'indefinite') => {
    setPracticeMode(newMode);
    resetPracticeSession();
  };

  const getDanishExample = () => {
    const danishWord = currentWord.danish;
    if (practiceMode === 'definite') {
      return `${danishWord}et/en`; // Danish definite
    } else {
      return `en/et ${danishWord}`; // Danish indefinite
    }
  };

  const getContextExample = () => {
    const word = currentWord;
    if (practiceMode === 'definite') {
      return {
        danish: `${word.danish.charAt(0).toUpperCase() + word.danish.slice(1)}en er stor`,
        spanish: `___ ${word.spanish} es grande`,
        explanation: `(Den specifikke ${word.danish} - vi ved hvilken en)`
      };
    } else {
      return {
        danish: `Jeg ser en ${word.danish}`,
        spanish: `Veo ___ ${word.spanish}`,
        explanation: `(En hvilken som helst ${word.danish} - første gang nævnt)`
      };
    }
  };

  const getDanishContextForExercise = () => {
    const word = currentWord;
    if (practiceMode === 'definite') {
      // Show the definite form in Danish
      return `(${word.danish}en)`;
    } else {
      // Show the indefinite form in Danish
      return `(en ${word.danish})`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">📝 Spansk Artikel Træning</h2>
        <p className="text-gray-600">
          Lær forskellen mellem el/la, un/una med dansk sammenligning
        </p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setCurrentSection('rules')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentSection === 'rules'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📚 Regler & Eksempler
        </button>
        <button
          onClick={() => setCurrentSection('practice')}
          className={`px-4 py-2 rounded-md transition-colors ${
            currentSection === 'practice'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🎯 Øv Dig
        </button>
      </div>

      {currentSection === 'rules' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">🎯 Vigtig forskel!</h3>
            <p className="text-yellow-700">
              Dansk har kun <strong>en/et</strong> og <strong>-en/-et</strong>, men spansk har fire forskellige artikler:
            </p>
            <div className="mt-2 text-sm text-yellow-600">
              <strong>Bestemt:</strong> el (hankøn), la (hunkøn) | <strong>Ubestemt:</strong> un (hankøn), una (hunkøn)
            </div>
          </div>

          {/* Context Decision Guide */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🤔 Hvordan vælger jeg rigtigt?</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📝 PERRO (hund) - Kontekst Eksempler:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-l-4 border-green-400 pl-4">
                    <h5 className="font-medium text-green-800">🆕 UBESTEMT (første gang nævnt):</h5>
                    <div className="text-sm space-y-1 mt-2">
                      <p><strong>Dansk:</strong> &ldquo;Jeg ser <em>en hund</em>&rdquo;</p>
                      <p><strong>Spansk:</strong> &ldquo;Veo <em>___ perro (en hund)</em>&rdquo;</p>
                      <p><strong>Svar:</strong> &ldquo;Veo <em>un perro</em>&rdquo;</p>
                      <p className="text-green-700">→ Hvilken som helst hund, første gang nævnt</p>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h5 className="font-medium text-purple-800">🎯 BESTEMT (specifik/kendt):</h5>
                    <div className="text-sm space-y-1 mt-2">
                      <p><strong>Dansk:</strong> &ldquo;<em>Hunden</em> er stor&rdquo;</p>
                      <p><strong>Spansk:</strong> &ldquo;<em>___ perro (hunden)</em> es grande&rdquo;</p>
                      <p><strong>Svar:</strong> &ldquo;<em>El perro</em> es grande&rdquo;</p>
                      <p className="text-purple-700">→ Den specifikke hund vi taler om</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Beslutningsregler:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-green-800 mb-1">Brug UBESTEMT (un/una):</h5>
                    <ul className="text-green-700 space-y-1">
                      <li>• Første gang du nævner noget</li>
                      <li>• &ldquo;Der er <em>en</em> hund i haven&rdquo;</li>
                      <li>• &ldquo;Jeg vil have <em>et</em> æble&rdquo;</li>
                      <li>• Generelt: &ldquo;hvad som helst&rdquo;</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-purple-800 mb-1">Brug BESTEMT (el/la):</h5>
                    <ul className="text-purple-700 space-y-1">
                      <li>• Når du refererer til noget specifikt</li>
                      <li>• &ldquo;<em>Hunden</em> (som vi talte om) løber&rdquo;</li>
                      <li>• &ldquo;<em>Æblet</em> (på bordet) er rødt&rdquo;</li>
                      <li>• Når begge kender hvad der tales om</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>💭 Trick:</strong> Spørg dig selv: &ldquo;Taler jeg om EN HVILKEN SOM HELST hund/æble, eller taler jeg om DEN SPECIFIKKE hund/æble?&rdquo;
                </p>
              </div>
            </div>
          </div>

          {articleRules.map((rule, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  <span className="text-2xl font-bold text-blue-600">{rule.spanish}</span>
                  <span className="ml-2 text-gray-600">({rule.danish})</span>
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  rule.type === 'definite' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {rule.type === 'definite' ? 'Bestemt' : 'Ubestemt'}
                </span>
              </div>
              
              <p className="text-gray-700 mb-4">{rule.description}</p>
              
              <div className="space-y-3">
                {rule.examples.map((example, exampleIndex) => (
                  <div key={exampleIndex} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg">
                        <span className="font-semibold text-blue-600">{example.spanish}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-semibold text-green-600">{example.danish}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{example.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Pas på undtagelser!</h3>
            <ul className="text-red-700 space-y-1">
              <li><strong>problema, tema, sistema</strong> - ender på -a men er hankøn (el problema)</li>
              <li><strong>mano, foto, radio</strong> - ender på -o men er hunkøn (la mano)</li>
              <li><strong>día, mapa</strong> - ender på -a men er hankøn (el día)</li>
            </ul>
          </div>
        </div>
      )}

      {currentSection === 'practice' && (
        <div className="space-y-6">
          {/* Practice Mode Toggle */}
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => switchPracticeMode('definite')}
              className={`px-6 py-2 rounded-md transition-colors ${
                practiceMode === 'definite'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Bestemt (el/la)
            </button>
            <button
              onClick={() => switchPracticeMode('indefinite')}
              className={`px-6 py-2 rounded-md transition-colors ${
                practiceMode === 'indefinite'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Ubestemt (un/una)
            </button>
          </div>

          {/* Context Explanation for Current Mode */}
          <div className={`p-4 rounded-lg mb-6 ${
            practiceMode === 'definite' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <h4 className={`font-semibold mb-2 ${
              practiceMode === 'definite' ? 'text-green-800' : 'text-blue-800'
            }`}>
              {practiceMode === 'definite' ? '🎯 BESTEMT ARTIKEL Træning' : '🆕 UBESTEMT ARTIKEL Træning'}
            </h4>
            <p className={`text-sm ${
              practiceMode === 'definite' ? 'text-green-700' : 'text-blue-700'
            }`}>
              {practiceMode === 'definite' 
                ? 'Du øver dig i at bruge el/la når du taler om en SPECIFIK ting (på dansk: -en/-et endelse)'
                : 'Du øver dig i at bruge un/una når du introducerer noget NYT (på dansk: en/et foran)'
              }
            </p>
          </div>

          {/* Progress and Score */}
          <div className="text-center mb-6 space-y-3">
            <div className="text-lg">
              Score: <span className="font-bold text-green-600">{score.correct}</span> / {score.total}
              {score.total > 0 && (
                <span className="ml-2 text-gray-600">
                  ({Math.round((score.correct / score.total) * 100)}%)
                </span>
              )}
            </div>
            
            {/* Progress Indicator */}
            <div className="bg-gray-200 rounded-full h-3 w-full max-w-md mx-auto">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(practiceSession.wordsCompleted.size / practiceSession.totalWords) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              Fremgang: {practiceSession.wordsCompleted.size} af {practiceSession.totalWords} ord gennemgået
            </p>
          </div>

          {/* Session Complete State */}
          {practiceSession.sessionComplete ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <h3 className="text-2xl font-bold text-green-800 mb-4">🎉 Godt klaret!</h3>
              <p className="text-lg text-green-700 mb-4">
                Du har gennemgået alle {practiceWords.length} ord for {practiceMode === 'definite' ? 'bestemt artikel' : 'ubestemt artikel'}!
              </p>
              <div className="mb-6">
                <div className="text-xl">
                  Slutresultat: <span className="font-bold text-green-600">{score.correct}</span> / {score.total}
                  {score.total > 0 && (
                    <span className="ml-2 text-green-600">
                      ({Math.round((score.correct / score.total) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={resetPracticeSession}
                  className="block w-full sm:w-auto mx-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  🔄 Træn Igen ({practiceMode === 'definite' ? 'Bestemt' : 'Ubestemt'})
                </button>
                
                <button
                  onClick={() => switchPracticeMode(practiceMode === 'definite' ? 'indefinite' : 'definite')}
                  className="block w-full sm:w-auto mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➡️ Skift til {practiceMode === 'definite' ? 'Ubestemt (un/una)' : 'Bestemt (el/la)'}
                </button>
                
                <button
                  onClick={() => setCurrentSection('rules')}
                  className="block w-full sm:w-auto mx-auto px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  📚 Gennemgå Regler
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              {/* Practice Question */}
              <div className="mb-6">
                <h3 className="text-lg text-gray-700 mb-4">
                  {practiceMode === 'definite' ? 'Skriv den bestemte artikel:' : 'Skriv den ubestemte artikel:'}
                </h3>
              
                <div className="text-3xl font-bold text-gray-900 mb-6">
                  Skriv den {practiceMode === 'definite' ? 'bestemte' : 'ubestemte'} artikel af {currentWord.spanish}
                </div>
              </div>

              {!showAnswer ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="text-center text-xl p-3 border-2 border-blue-300 rounded-lg w-32"
                  placeholder="el/la/un/una"
                  onKeyPress={(e) => e.key === 'Enter' && handleAnswer()}
                />
                <div>
                  <button
                    onClick={handleAnswer}
                    disabled={!userAnswer.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Tjek Svar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`text-2xl font-bold ${
                  userAnswer.toLowerCase().trim() === correctArticle 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {userAnswer.toLowerCase().trim() === correctArticle ? '✅ Rigtigt!' : '❌ Forkert'}
                </div>
                
                <div className="text-xl">
                  Korrekt svar: <span className="font-bold text-blue-600">{correctArticle} {currentWord.spanish}</span>
                </div>

                <div className="text-sm text-gray-600 bg-white p-4 rounded-lg">
                  <div className="space-y-2">
                    <p>
                      <strong>Forklaring:</strong> {currentWord.spanish} er {currentWord.gender === 'masculine' ? 'hankøn' : 'hunkøn'}, 
                      derfor bruger vi <strong>{correctArticle}</strong> som {practiceMode === 'definite' ? 'bestemt' : 'ubestemt'} artikel.
                    </p>
                    <p>
                      <strong>Kontekst:</strong> {practiceMode === 'definite' 
                        ? 'Vi bruger bestemt artikel fordi vi taler om en SPECIFIK ' + currentWord.danish + ' som begge kender.'
                        : 'Vi bruger ubestemt artikel fordi vi introducerer eller taler om en HVILKEN SOM HELST ' + currentWord.danish + '.'
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={nextWord}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Næste Ord →
                </button>
              </div>
            )}
            </div>
          )}

          {/* Gender Pattern Hints */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">💡 Hjælperegler for køn:</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Hankøn (el/un):</strong> Ord på -o (perro, libro), -ma (problema), -a (día)</div>
              <div><strong>Hunkøn (la/una):</strong> Ord på -a (manzana, mesa), -ión (estación), -dad (ciudad)</div>
              <div><strong>Undtagelser:</strong> mano (hunkøn), foto (hunkøn), problema (hankøn)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}