'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { TargetLanguage } from '@/types/database';
import LanguageSelector from './LanguageSelector';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('es');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for URL message parameters
  useEffect(() => {
    const urlMessage = searchParams.get('message');
    if (urlMessage === 'session-expired') {
      setMessage('Din session er udløbet. Log venligst ind igen.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('email not confirmed')) {
            setMessage('Email ikke bekræftet. Deaktiver email bekræftelse i Supabase indstillinger eller kontakt support.');
          } else {
            setMessage(error.message);
          }
        } else {
          // Redirect to homepage instead of dashboard to let users choose their path
          router.push('/');
        }
      } else {
        // Use our custom signup API that handles email confirmation
        try {
          const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              fullName,
              targetLanguage, // Include selected language
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            setMessage(result.error || 'Der opstod en fejl');
            return;
          }

          if (result.success) {
            setMessage(result.message);
            
            if (!result.requiresManualConfirmation) {
              // If user was auto-confirmed, try to sign them in
              setTimeout(async () => {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                
                if (!signInError) {
                  // Redirect to homepage instead of dashboard to let users choose their path
                  router.push('/');
                } else {
                  setMessage('Konto oprettet! Du kan nu logge ind.');
                  setIsLogin(true);
                }
              }, 1000);
            } else {
              // Manual confirmation required
              setMessage('Konto oprettet! Du kan nu logge ind.');
              setIsLogin(true);
            }
          }
        } catch (fetchError) {
          setMessage('Netværksfejl. Prøv igen.');
        }
      }
    } catch (error) {
      setMessage('Der opstod en fejl. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-full p-4 shadow-lg mb-4">
            <span className="text-5xl">🦆</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            DuckLingo
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Velkommen tilbage!' : 'Start din sprogrejse i dag'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              {isLogin ? 'Log ind' : 'Opret konto'}
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Fulde navn
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    placeholder="Dit fulde navn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hvilket sprog vil du lære?
                  </label>
                  <LanguageSelector
                    selectedLanguage={targetLanguage}
                    onLanguageChange={setTargetLanguage}
                    variant="compact"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                placeholder="din@email.dk"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Adgangskode
                </label>
                {isLogin && (
                  <a
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Glemt?
                  </a>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                placeholder="Minimum 6 tegn"
                minLength={6}
              />
            </div>

            {message && (
              <div className={`text-sm text-center p-3 rounded-xl ${message.includes('fejl') || message.includes('ikke bekræftet') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Vent venligst...
                </span>
              ) : (
                isLogin ? 'Log ind' : 'Opret konto'
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? 'Har du ikke en konto?' : 'Har du allerede en konto?'}
              {' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setMessage('');
                }}
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {isLogin ? 'Opret en gratis konto' : 'Log ind her'}
              </button>
            </p>
          </div>
        </div>

        {/* Features badges */}
        {!isLogin && (
          <div className="mt-6 flex justify-center gap-4 flex-wrap px-4">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm text-gray-700">
              ✨ AI-baseret læring
            </div>
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm text-gray-700">
              🎯 Personlig fremgang
            </div>
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm text-gray-700">
              🆓 Gratis at starte
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
