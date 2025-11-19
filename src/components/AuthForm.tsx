'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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
  const supabase = createClient();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Log ind på din konto' : 'Opret ny konto'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Eller ' : 'Eller '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? 'opret ny konto' : 'log ind her'}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Fulde navn
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Dit fulde navn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Din email adresse"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Adgangskode
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Din adgangskode"
                minLength={6}
              />
            </div>
          </div>

          {message && (
            <div className={`text-sm text-center ${message.includes('fejl') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Vent...' : isLogin ? 'Log ind' : 'Opret konto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
