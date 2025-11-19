'use client';

import { useState, useEffect, useRef } from 'react';
import { generateSpeech } from '@/lib/mcp/tts-client';
import { transcribeAndAnalyze, generatePronunciationFeedback } from '@/lib/mcp/speech-client';

interface Dialogue {
  id: string;
  sequence_order: number;
  speaker_role: string;
  text: string;
  text_translation: string | null;
  audio_url: string | null;
  hints_da: string[] | null;
  is_user_turn: boolean;
  expected_response: string | null;
}

interface ConversationScenario {
  id: string;
  title_da: string;
  title: string;
  description_da: string | null;
  description: string | null;
  target_language: 'es' | 'pt';
  level: string;
  context_da: string | null;
  context: string | null;
}

interface ConversationPracticeProps {
  scenario: ConversationScenario;
  dialogues: Dialogue[];
  onComplete: (score: number) => void;
}

export default function ConversationPractice({
  scenario,
  dialogues,
  onComplete
}: ConversationPracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [userResponse, setUserResponse] = useState<{
    transcription: string;
    pronunciation_score: number;
    accuracy_score: number;
    feedback_da: string;
    feedback: string;
  } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentDialogue = dialogues[currentIndex];
  const isLastDialogue = currentIndex === dialogues.length - 1;

  // Initialize session
  useEffect(() => {
    initializeSession();
  }, []);

  // Removed auto-play to comply with browser autoplay policies
  // Users must click the play button to hear audio
  useEffect(() => {
    // Cleanup function to stop audio when dialogue changes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [currentIndex]);

  async function initializeSession() {
    try {
      const response = await fetch('/api/conversation/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenario.id })
      });

      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();
      setSessionId(data.session.id);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  async function playDialogueAudio() {
    if (!currentDialogue) return;

    setIsPlaying(true);

    try {
      // Stop and cleanup any existing audio first
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.oncanplaythrough = null;
        audioRef.current = null;
      }

      let audioUrl = currentDialogue.audio_url;

      // Generate audio if not cached
      if (!audioUrl) {
        const result = await generateSpeech({
          text: currentDialogue.text,
          language: scenario.target_language,
          provider: 'openai'
        });
        audioUrl = result.audioUrl;
      }

      // Create and setup new audio
      const audio = new Audio();
      let hasPlayed = false; // Flag to prevent multiple plays
      
      // Set up event handlers before setting src
      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = (e) => {
        setIsPlaying(false);
        console.error('Audio playback error:', e);
      };

      // Wait for audio to be ready before playing (only once)
      audio.oncanplaythrough = async () => {
        if (hasPlayed) return; // Prevent multiple plays
        hasPlayed = true;
        
        try {
          await audio.play();
        } catch (playError: any) {
          // Ignore AbortError which occurs when audio is interrupted
          if (playError.name !== 'AbortError') {
            console.error('Play error:', playError);
            setIsPlaying(false);
          }
        }
      };

      // Set the source after handlers are attached
      audioRef.current = audio;
      audio.src = audioUrl;
      audio.load(); // Explicitly load the audio
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processRecording(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setUserResponse(null);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Kunne ikke starte optagelse. Tjek mikrofon-tilladelser.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function processRecording(audioBlob: Blob) {
    if (!currentDialogue || !sessionId) return;

    setIsProcessing(true);

    try {
      // Transcribe and analyze
      const result = await transcribeAndAnalyze({
        audioBlob,
        language: scenario.target_language,
        expectedText: currentDialogue.expected_response || undefined,
        provider: 'whisper'
      });

      // Generate feedback
      const feedback = await generatePronunciationFeedback(
        result,
        scenario.target_language
      );

      // Save response
      await fetch('/api/conversation/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          dialogue_id: currentDialogue.id,
          transcribed_text: result.transcribedText,
          pronunciation_score: result.pronunciationScore,
          accuracy_score: result.accuracyScore,
          feedback_da: feedback.feedback_da,
          feedback: feedback.feedback
        })
      });

      // Update state
      setUserResponse({
        transcription: result.transcribedText,
        pronunciation_score: result.pronunciationScore || 0,
        accuracy_score: result.accuracyScore || 0,
        feedback_da: feedback.feedback_da,
        feedback: feedback.feedback
      });

      // Track scores
      const newScores = [...scores, result.pronunciationScore || 0];
      setScores(newScores);

      // Update session progress
      if (sessionId) {
        await fetch(`/api/conversation/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_dialogue_id: currentDialogue.id,
            pronunciation_score: Math.round(
              newScores.reduce((a, b) => a + b, 0) / newScores.length
            )
          })
        });
      }
    } catch (error) {
      console.error('Failed to process recording:', error);
      alert('Kunne ikke behandle optagelsen. Prøv igen.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleNext() {
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserResponse(null);
      setShowTranslation(false);
      setShowHints(false);
    } else {
      // Complete session
      completeSession();
    }
  }

  async function completeSession() {
    if (!sessionId) return;

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    try {
      await fetch(`/api/conversation/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          score: avgScore,
          pronunciation_score: avgScore
        })
      });

      onComplete(avgScore);
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  }

  if (!currentDialogue) {
    return <div>Indlæser samtale...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{scenario.title_da}</h1>
        {scenario.context_da && (
          <p className="text-gray-600 mb-4">{scenario.context_da}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Dialog {currentIndex + 1} af {dialogues.length}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {scenario.level}
          </span>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / dialogues.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Dialogue Card */}
      <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          {/* Speaker Icon */}
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl">
              {currentDialogue.is_user_turn ? '🎤' : '💬'}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-700">
                {currentDialogue.is_user_turn ? 'Din tur' : currentDialogue.speaker_role}
              </span>
              {!currentDialogue.is_user_turn && (
                <button
                  onClick={playDialogueAudio}
                  disabled={isPlaying}
                  className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  title="Afspil lyd"
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
              )}
            </div>

            {!currentDialogue.is_user_turn && (
              <>
                <p className="text-lg mb-2">{currentDialogue.text}</p>
                
                {currentDialogue.text_translation && (
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                  >
                    {showTranslation ? '🔼 Skjul' : '🔽 Vis'} oversættelse
                  </button>
                )}
                
                {showTranslation && currentDialogue.text_translation && (
                  <p className="text-sm text-gray-600 italic">
                    {currentDialogue.text_translation}
                  </p>
                )}
              </>
            )}

            {currentDialogue.is_user_turn && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Optag dit svar på {scenario.target_language === 'es' ? 'spansk' : 'portugisisk'}
                </p>

                {/* Hints */}
                {currentDialogue.hints_da && currentDialogue.hints_da.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowHints(!showHints)}
                      className="text-sm text-blue-600 hover:text-blue-700 mb-2"
                    >
                      💡 {showHints ? 'Skjul' : 'Vis'} hints
                    </button>
                    
                    {showHints && (
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        {currentDialogue.hints_da.map((hint, i) => (
                          <li key={i}>• {hint}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex gap-3 mb-4">
                  {!isRecording && !isProcessing && (
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      🎤 Start optagelse
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium animate-pulse"
                    >
                      ⏹️ Stop optagelse
                    </button>
                  )}

                  {isProcessing && (
                    <div className="px-6 py-3 bg-gray-100 rounded-lg text-gray-600">
                      Behandler optagelse...
                    </div>
                  )}
                </div>

                {/* User Response Feedback */}
                {userResponse && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Din respons:</h3>
                    <p className="text-sm mb-3 italic">&quot;{userResponse.transcription}&quot;</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-600">Udtale</div>
                        <div className="text-lg font-bold text-blue-600">
                          {userResponse.pronunciation_score}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Præcision</div>
                        <div className="text-lg font-bold text-blue-600">
                          {userResponse.accuracy_score}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700">
                      <strong>Feedback:</strong> {userResponse.feedback_da}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
              setUserResponse(null);
            }
          }}
          disabled={currentIndex === 0}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Forrige
        </button>

        <button
          onClick={handleNext}
          disabled={currentDialogue.is_user_turn && !userResponse}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastDialogue ? 'Afslut' : 'Næste'} →
        </button>
      </div>
    </div>
  );
}
